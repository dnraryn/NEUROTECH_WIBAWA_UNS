// Session summaries only: raw EEG, passwords and authentication tokens are never archived.
(function () {
  "use strict";
  var database, opening, records = [], active = null, namespace = "preview", epoch = 0;
  var storage = "loading", error = "", syncing = false, ready = false, suppressedDevice = null;
  var lastResult = null, lastCloudSave = 0, lastUiEmit = 0, lastSyncedAt = null, cachedState = null, revisions = new Map(), savedRevisions = new Map();
  var localQueue = Promise.resolve(), cloudRows = [], reviews = {}, cloudError = "";
  var cloudUnsubscribers = [], cloudListening = false, syncRequested = false;
  var CLOUD_SAVE_MS = 60000;
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  var session = function () { return window.ntSession?.get?.() || null; };
  var now = function () { return Date.now(); };
  var cloudEnabled = function () {
    // Local previews never touch production session data. Emulator use is explicit.
    return !!window.NT_FIREBASE?.emulators ||
      ["neurotech-id.web.app", "neurotech-id.firebaseapp.com"].includes(window.location?.hostname);
  };
  function identity() { var s = session(); return s?.uid && s?.code ? s.code + ":" + s.uid : "preview"; }
  function emit() { cachedState = null; window.dispatchEvent(new CustomEvent("nt-archive")); }
  function id() { return "s-" + now().toString(36) + "-" + window.crypto.randomUUID().replace(/-/g, "").slice(0, 16); }
  function changed(record) { cachedState = null; revisions.set(record.id, (revisions.get(record.id) || 0) + 1); record.updatedAt = now(); }
  function validRecord(r) {
    var bounded = function (v, min, max) { return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max; };
    var count = function (v, max) { return Number.isInteger(v) && bounded(v, 0, max); };
    return r && r.schemaVersion === 1 && typeof r.id === "string" && /^s-[a-z0-9]+-[a-f0-9]{16}$/.test(r.id) &&
      ["muse", "demo"].includes(r.source) && ["recording", "completed", "interrupted"].includes(r.status) &&
      ["athena", "classic", "unknown", "demo"].includes(r.protocol) && ["Pagi", "Sore", "Malam", "Lembur"].includes(r.shift) &&
      typeof r.ownerUid === "string" && typeof r.companyCode === "string" && typeof r.memberId === "string" &&
      bounded(r.startedAt, 1, now() + 5000) && bounded(r.updatedAt, r.startedAt, now() + 5000) &&
      (r.endedAt === null || bounded(r.endedAt, r.startedAt, now() + 5000)) &&
      count(r.receivedSamples, 4 * 256 * 3600 * 13) && ["eeg-heuristic-v3", "eeg-heuristic-v4"].includes(r.algorithmVersion) &&
      Array.isArray(r.minutes) && r.minutes.length <= 721 && r.minutes.every(function (m) {
        return m && count(m.minute, 720) && count(m.n, 120) && count(m.partial, 120) && count(m.provisional, m.n) &&
          bounded(m.fi, 0, m.n * 100) && bounded(m.cli, 0, m.n * 100) && bounded(m.ei, 0, m.n * 100) &&
          bounded(m.fiMax, 0, 100) && count(m.incidents, m.n);
      }) && r.checkin && (r.checkin.sleptHours === null || bounded(r.checkin.sleptHours, 0, 24)) &&
      bounded(r.checkin.sleepTargetHours, 1, 16) && bounded(r.checkin.targetMinutes, 1, 1440) &&
      (r.checkin.sleepiness === null || (Number.isInteger(r.checkin.sleepiness) && bounded(r.checkin.sleepiness, 1, 5))) &&
      typeof r.checkin.note === "string" && r.checkin.note.length <= 500;
  }
  function openDatabase() {
    if (opening) return opening;
    opening = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("unavailable")); return; }
      var request = window.indexedDB.open("neurotech-session-archive-v1", 1);
      request.onupgradeneeded = function () {
        var store = request.result.createObjectStore("sessions", { keyPath: "key" });
        store.createIndex("namespace", "namespace");
      };
      request.onsuccess = function () { database = request.result; database.onversionchange = function () { database.close(); }; resolve(database); };
      request.onerror = function () { reject(request.error); };
      request.onblocked = function () { reject(new Error("blocked")); };
    });
    return opening;
  }
  async function readLocal(owner) {
    var db = await openDatabase();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("sessions", "readonly"), request = tx.objectStore("sessions").index("namespace").getAll(owner);
      tx.oncomplete = function () { resolve(request.result || []); };
      tx.onerror = tx.onabort = function () { reject(tx.error); };
    });
  }
  function writeLocal(owner, record, revision, syncedRevision) {
    var copy = clone(record);
    var work = localQueue.catch(function () {}).then(async function () {
      var db = await openDatabase();
      await new Promise(function (resolve, reject) {
        var tx = db.transaction("sessions", "readwrite");
        tx.objectStore("sessions").put({ key: owner + "/" + copy.id, namespace: owner, record: copy,
          revision: revision, syncedRevision: syncedRevision || 0 });
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = function () { reject(tx.error); };
      });
    });
    localQueue = work;
    return work;
  }
  async function persist(record) {
    if (!record) return false;
    var owner = namespace, generation = epoch, revision = revisions.get(record.id) || 1;
    try {
      await writeLocal(owner, record, revision, savedRevisions.get(record.id));
      if (generation === epoch) { storage = "device"; error = ""; emit(); }
      return true;
    } catch (ignore) {
      if (generation === epoch) { storage = "memory"; error = "Penyimpanan perangkat tidak tersedia. Ekspor CSV sebelum menutup halaman."; emit(); }
      return false;
    }
  }
  function summary(record) {
    var totals = { clean: 0, partial: 0, provisional: 0, fi: 0, cli: 0, ei: 0, fiMax: null, incidents: 0 };
    (record.minutes || []).forEach(function (m) {
      totals.clean += m.n; totals.partial += m.partial; totals.provisional += m.provisional;
      totals.fi += m.fi; totals.cli += m.cli; totals.ei += m.ei; totals.incidents += m.incidents;
      if (m.n) totals.fiMax = Math.max(totals.fiMax ?? 0, m.fiMax);
    });
    var n = totals.clean;
    return { clean: n, partial: totals.partial, provisional: totals.provisional,
      meanFI: n ? Math.round(totals.fi / n) : null, meanCLI: n ? Math.round(totals.cli / n) : null,
      meanEI: n ? Math.round(totals.ei / n) : null, maxFI: totals.fiMax, incidents: totals.incidents,
      cleanPercent: n + totals.partial ? Math.round(n / (n + totals.partial) * 100) : null,
      receivedMinutes: record.receivedSamples / (4 * 256 * 60),
      durationMinutes: Math.max(0, ((record.endedAt || record.updatedAt) - record.startedAt) / 60000),
      sleepDebt: record.checkin?.sleptHours == null ? null : Math.max(0, record.checkin.sleepTargetHours - record.checkin.sleptHours) };
  }
  function begin() {
    if (!ready) throw new Error("Arsip sedang dimuat. Coba lagi sebentar.");
    if (active) return clone(active);
    var device = window.ntMuse?.status?.() || {};
    if (!window.ntMuseConnected || !device.connected) throw new Error("Hubungkan Muse untuk memulai sesi nyata.");
    var s = session(), metrics = window.ntSessionMetrics?.get?.() || {};
    active = { schemaVersion: 1, id: id(), companyCode: s?.code || "", ownerUid: s?.uid || "", memberId: s?.memberId || "",
      shift: window.CURRENT_WORKER?.shift || "Pagi", source: "muse", startedAt: now(), endedAt: null, updatedAt: now(),
      status: "recording", protocol: device.protocol || "unknown", algorithmVersion: window.ntEEGAlgorithmVersion || "eeg-heuristic-v4", receivedSamples: 0,
      minutes: [], checkin: { sleptHours: metrics.sleptHours ?? null, sleepTargetHours: metrics.sleepTargetHours || 8,
        targetMinutes: metrics.targetMinutes || 60, sleepiness: null, note: "" } };
    lastResult = null; microsleepPrevious = false; suppressedDevice = null; lastUiEmit = 0; lastCloudSave = now();
    records.unshift(active); changed(active); persist(active); emit();
    if (cloudEnabled()) sync();
    return clone(active);
  }
  async function finish(reason) {
    if (!active) return null;
    var completed = active;
    active = null; lastResult = null;
    suppressedDevice = window.ntMuse?.status?.().connectedAt || true;
    completed.endedAt = now(); completed.status = reason === "interrupted" ? "interrupted" : "completed";
    changed(completed);
    await persist(completed);
    emit();
    if (cloudEnabled()) sync();
    return clone(completed);
  }
  function capture() {
    if (!ready || !window.ntMuseConnected) return;
    var device = window.ntMuse?.status?.() || {}, result = window.ntMuseDSP?.last;
    if (!device.connected) return;
    if (!active && suppressedDevice !== (device.connectedAt || true)) begin();
    if (!active || !result || result.ts === lastResult || result.ts < active.startedAt || result.ts > now() || now() - result.ts >= 3000) return;
    // Samples count during calibration, but session indices begin only after
    // a fresh baseline for this pairing is complete.
    if (window.ntMuseDSP?.baselineTarget && (!window.ntMuseDSP.baseline || result.ts < window.ntMuseDSP.baseline.ts)) return;
    if (!["ready", "limited", "calibrating"].includes(window.ntMuseDSP?.signalState)) return;
    if (now() - active.startedAt > 12 * 3600000) { finish().then(begin).catch(function () {}); return; }
    lastResult = result.ts;
    var minute = Math.floor((result.ts - active.startedAt) / 60000);
    var bucket = active.minutes.find(function (m) { return m.minute === minute; });
    if (!bucket) { bucket = { minute: minute, n: 0, partial: 0, provisional: 0, fi: 0, cli: 0, ei: 0, fiMax: 0, incidents: 0 }; active.minutes.push(bucket); }
    var clean = result.qualityLevel === "good" && result.outputScope === "full" &&
      [result.fi, result.cli, result.ei].every(function (v) { return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100; });
    if (clean) {
      bucket.n++; bucket.fi += result.fi; bucket.cli += result.cli; bucket.ei += result.ei;
      bucket.fiMax = Math.max(bucket.fiMax, result.fi);
      if (result.classificationProvisional) bucket.provisional++;
      if (result.microsleep && !microsleepPrevious && !result.classificationProvisional) bucket.incidents++;
    } else bucket.partial++;
    // Runtime edge state is kept outside persisted documents.
    microsleepPrevious = !!result.microsleep;
    changed(active);
    if (now() - lastUiEmit >= 2000) { lastUiEmit = now(); emit(); }
    if (now() - lastCloudSave >= CLOUD_SAVE_MS) { lastCloudSave = now(); sync(); }
  }
  var microsleepPrevious = false;
  function updateCheckin(input) {
    if (!active) throw new Error("Mulai sesi Muse sebelum mencatat kondisi.");
    if (input.sleepiness !== null && (!Number.isInteger(input.sleepiness) || input.sleepiness < 1 || input.sleepiness > 5)) throw new Error("Pilih tingkat kantuk 1–5.");
    if (typeof input.note !== "string" || input.note.length > 500) throw new Error("Catatan maksimal 500 karakter.");
    var metrics = window.ntSessionMetrics?.get?.() || {};
    active.checkin = { sleptHours: metrics.sleptHours ?? null, sleepTargetHours: metrics.sleepTargetHours || 8,
      targetMinutes: metrics.targetMinutes || 60, sleepiness: input.sleepiness, note: input.note.trim() };
    changed(active); return persist(active);
  }
  function demo() {
    if (session()) throw new Error("Contoh simulasi hanya tersedia dalam mode demo.");
    var previous = records.find(function (r) { return r.source === "demo"; });
    if (previous) return Promise.resolve(clone(previous));
    var start = now() - 30 * 60000;
    var record = { schemaVersion: 1, id: id(), companyCode: "", ownerUid: "", memberId: "", shift: "Pagi", source: "demo",
      startedAt: start, endedAt: start + 30 * 60000, updatedAt: now(), status: "completed", protocol: "demo", algorithmVersion: "eeg-heuristic-v3",
      receivedSamples: 30 * 60 * 4 * 256, checkin: { sleptHours: 6.5, sleepTargetHours: 8, targetMinutes: 60, sleepiness: 3, note: "Contoh simulasi untuk menilai tampilan laporan." },
      minutes: Array.from({ length: 30 }, function (_, i) { var fi = Math.round(32 + i * 1.1 + Math.sin(i / 3) * 8); return { minute: i, n: 55, partial: 5, provisional: 0, fi: fi * 55, cli: (42 + i % 6) * 55, ei: (68 - i % 9) * 55, fiMax: fi + 4, incidents: 0 }; }) };
    records.unshift(record); changed(record);
    return persist(record).then(function () { emit(); return clone(record); });
  }
  function localState() {
    if (cachedState) return cachedState;
    var combined = new Map();
    cloudRows.forEach(function (r) { combined.set(r.id, r); });
    records.forEach(function (r) { var remote = combined.get(r.id); if (!remote || r.updatedAt >= remote.updatedAt) combined.set(r.id, r); });
    cachedState = { ready: ready, storage: storage, error: error, cloudError: cloudError, syncing: syncing, cloudEnabled: cloudEnabled(), liveUpdates: cloudListening, lastSyncedAt: lastSyncedAt, cloudLimit: 60,
      activeId: active?.id || null, rows: Array.from(combined.values()).sort(function (a, b) { return b.startedAt - a.startedAt; }).map(function (r) {
        return Object.assign(clone(r), { summary: summary(r), review: clone(reviews[r.id] || null),
          synced: r.source !== "demo" && (r._remote === true || ((savedRevisions.get(r.id) || 0) >= (revisions.get(r.id) || 1))) });
      }) };
    return cachedState;
  }
  function cloudCollection(name, s) { return window.NT_FIREBASE.db.collection("companies").doc(s.code).collection(name); }
  function cloudPayload(record) { var copy = clone(record); delete copy._remote; return copy; }
  async function sync() {
    var s = session();
    if (!cloudEnabled() || !s?.uid || !ready) return;
    if (syncing) { syncRequested = true; return; }
    var generation = epoch;
    syncing = true; cloudError = ""; emit();
    try {
      var pending = records.filter(function (r) { return r.ownerUid === s.uid && r.source === "muse" && (savedRevisions.get(r.id) || 0) < (revisions.get(r.id) || 1); });
      for (var record of pending) {
        if (generation !== epoch) return;
        var revision = revisions.get(record.id) || 1, copy = cloudPayload(record);
        // A completed session is immutable. Retry acknowledgements lost in transit safely.
        var finalized = await window.NT_FIREBASE.db.runTransaction(async function (tx) {
          var ref = cloudCollection("sessions", s).doc(copy.id), existing = await tx.get(ref);
          if (existing.exists && existing.data().status !== "recording") return existing.data();
          tx.set(ref, Object.assign(copy, { savedAt: window.firebase.firestore.FieldValue.serverTimestamp() }));
          return null;
        });
        if (generation !== epoch) return;
        if (finalized) {
          delete finalized.savedAt;
          if (!validRecord(finalized)) throw new Error("invalid-session");
          Object.assign(record, finalized);
          if (active?.id === record.id) active = null;
          revision = revisions.get(record.id) || revision;
        }
        savedRevisions.set(record.id, revision);
        await writeLocal(namespace, record, revisions.get(record.id), revision);
      }
      await refreshCloud(s, generation);
    } catch (ignore) {
      if (generation === epoch) cloudError = "Belum tersinkron ke Firebase. Salinan perangkat tetap tersedia; periksa koneksi dan aturan akses lalu coba lagi.";
    } finally {
      if (generation === epoch) {
        syncing = false; emit();
        if (syncRequested) { syncRequested = false; sync(); }
      }
    }
  }
  function stopCloudListeners() {
    var previous = cloudUnsubscribers; cloudUnsubscribers = []; cloudListening = false;
    previous.forEach(function (unsubscribe) { unsubscribe(); });
  }
  function acceptSessions(result, generation) {
    if (generation !== epoch) return;
    cloudRows = result.docs.map(function (d) { var r = d.data(); delete r.savedAt; return Object.assign(r, { _remote: true }); }).filter(validRecord);
    cloudError = cloudRows.length !== result.docs.length ? "Sebagian arsip memiliki format tidak valid dan tidak ditampilkan." : "";
    if (result.metadata?.fromCache !== true) lastSyncedAt = now();
    emit();
  }
  function acceptReviews(result, generation) {
    if (generation !== epoch) return;
    var next = {};
    result.docs.forEach(function (d) { var r = d.data(); next[r.sessionId] = { status: r.status, note: r.note, reviewerUid: r.reviewerUid, reviewedAt: r.updatedAt?.toMillis?.() || null }; });
    reviews = next;
    emit();
  }
  async function refreshCloud(s, generation) {
    if (cloudListening || generation !== epoch) return;
    var query = cloudCollection("sessions", s);
    if (s.role === "pekerja") query = query.where("ownerUid", "==", s.uid);
    query = query.orderBy("startedAt", "desc").limit(60);
    var reviewQuery = cloudCollection("sessionReviews", s);
    if (s.role === "pekerja") reviewQuery = reviewQuery.where("ownerUid", "==", s.uid);
    reviewQuery = reviewQuery.orderBy("updatedAt", "desc").limit(60);
    if (typeof query.onSnapshot === "function" && typeof reviewQuery.onSnapshot === "function") {
      var failure = function () {
        if (generation !== epoch) return;
        stopCloudListeners();
        cloudError = "Pembaruan otomatis terputus. Periksa koneksi lalu tekan Sinkronkan untuk mencoba lagi.";
        emit();
      };
      cloudListening = true;
      try {
        cloudUnsubscribers.push(query.onSnapshot({ includeMetadataChanges: true }, function (result) { acceptSessions(result, generation); }, failure));
        cloudUnsubscribers.push(reviewQuery.onSnapshot({ includeMetadataChanges: true }, function (result) { acceptReviews(result, generation); }, failure));
      } catch (error) { stopCloudListeners(); throw error; }
      emit();
      return;
    }
    var results = await Promise.all([query.get(), reviewQuery.get()]);
    acceptSessions(results[0], generation); acceptReviews(results[1], generation);
  }
  async function review(id, note) {
    var s = session(), row = localState().rows.find(function (r) { return r.id === id; });
    if (!row || row.status === "recording") throw new Error("Selesaikan sesi sebelum meninjau laporan.");
    if (!note.trim() || note.length > 1000) throw new Error("Isi evaluasi dan tindak lanjut, maksimal 1.000 karakter.");
    if (row.source === "demo" && !s) {
      reviews[id] = { status: "reviewed", note: note.trim(), reviewedAt: now(), reviewerUid: "demo" };
      var local = records.find(function (r) { return r.id === id; }); local._demoReview = reviews[id]; changed(local); await persist(local); emit(); return;
    }
    if (!["management", "supervisor"].includes(s?.role)) throw new Error("Peninjauan dilakukan oleh supervisor atau manajemen.");
    if (!cloudEnabled() || !row.synced) throw new Error("Peninjauan resmi tersedia setelah sesi tersinkron ke Firebase. Pratinjau ini menyimpan sesi di perangkat.");
    await cloudCollection("sessionReviews", s).doc(id).set({ schemaVersion: 1, sessionId: id, ownerUid: row.ownerUid,
      reviewerUid: s.uid, status: "reviewed", note: note.trim(), updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() });
    await refreshCloud(s, epoch); emit();
  }
  async function loadIdentity() {
    var previous = active, previousNamespace = namespace;
    var previousRevision = previous ? (revisions.get(previous.id) || 1) + 1 : 0;
    var previousSynced = previous ? savedRevisions.get(previous.id) : 0;
    var generation = ++epoch;
    stopCloudListeners(); syncRequested = false;
    namespace = identity(); ready = false; records = []; active = null; cloudRows = []; reviews = {}; syncing = false;
    revisions = new Map(); savedRevisions = new Map(); error = ""; cloudError = ""; suppressedDevice = null; lastSyncedAt = null; emit();
    if (previous) {
      previous.endedAt = now(); previous.updatedAt = now(); previous.status = "interrupted";
      writeLocal(previousNamespace, previous, previousRevision, previousSynced).catch(function () {});
    }
    try {
      var loaded = await readLocal(namespace);
      if (generation !== epoch) return;
      records = loaded.filter(function (entry) { return validRecord(entry.record); }).map(function (entry) {
        var r = entry.record;
        if (r.source === "demo" && r._demoReview) reviews[r.id] = r._demoReview;
        revisions.set(r.id, entry.revision || 1); savedRevisions.set(r.id, entry.syncedRevision || 0);
        if (r.status === "recording") { r.status = "interrupted"; r.endedAt = r.updatedAt; changed(r); persist(r); }
        return r;
      });
      storage = "device";
    } catch (ignore) { if (generation !== epoch) return; storage = "memory"; error = "Penyimpanan perangkat tidak tersedia. Ekspor CSV sebelum menutup halaman."; }
    ready = true; emit();
    if (cloudEnabled()) sync();
  }
  function csv(record) {
    return window.ntReports.minutes(record, { excel: false });
  }
  window.ntSessionArchive = { state: localState, begin: begin, finish: finish, save: function () { return persist(active); },
    updateCheckin: updateCheckin, demo: demo, sync: sync, review: review, summary: summary, csv: csv, validRecord: validRecord };
  window.addEventListener("nt-data", capture);
  window.addEventListener("nt-muse-eeg", function (e) {
    if (!active || !window.ntMuseConnected || !["TP9", "AF7", "AF8", "TP10"].includes(e.detail?.channel)) return;
    active.receivedSamples += e.detail.samples?.length || 0; changed(active);
  });
  window.addEventListener("nt-muse", function (e) {
    if (e.detail?.connected) {
      suppressedDevice = null;
      // The shared device adapter updates its flags later in this same event.
      Promise.resolve().then(function () { if (ready && !active && window.ntMuseConnected && window.ntMuse?.status?.().connected) begin(); });
    } else finish("interrupted");
  });
  window.addEventListener("nt-muse-baseline", function (e) {
    if (e.detail?.baseline || !active) return;
    // A manual recalibration starts a separate report, so pre-reset indices
    // cannot be combined with a newly trained baseline.
    finish().then(function () {
      if (ready && window.ntMuseConnected && window.ntMuse?.status?.().connected) begin();
    }).catch(function () {});
  });
  window.addEventListener("nt-session", loadIdentity);
  window.addEventListener("online", function () { sync(); });
  window.addEventListener("pagehide", function () { if (active) { active.updatedAt = now(); persist(active); } });
  window.document?.addEventListener("visibilitychange", function () {
    if (active) { active.updatedAt = now(); persist(active); }
    // Best effort while backgrounding; closing a browser is never a save acknowledgement.
    sync();
  });
  setInterval(function () {
    if (!active) return;
    if (now() - active.startedAt >= 12 * 3600000) {
      finish().then(function () { if (window.ntMuseConnected) begin(); }).catch(function () {});
    } else {
      active.updatedAt = now(); persist(active);
      if (now() - lastCloudSave >= CLOUD_SAVE_MS) { lastCloudSave = now(); sync(); }
    }
  }, 10000);
  loadIdentity();
})();
