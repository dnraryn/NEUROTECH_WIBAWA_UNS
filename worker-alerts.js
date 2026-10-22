// Company-scoped in-app messages. No background push or simulated delivery.
(function () {
  "use strict";
  var rows = [], error = "", ready = false, unsubscribe = null, generation = 0, key = "";
  function session() { return window.ntSession?.get?.(); }
  function emit() { window.dispatchEvent(new CustomEvent("nt-worker-alerts")); }
  function enabled() { return !!window.NT_FIREBASE?.emulators || ["neurotech-id.web.app", "neurotech-id.firebaseapp.com"].includes(window.location?.hostname); }
  function collection(s) { return window.NT_FIREBASE.db.collection("companies").doc(s.code).collection("workerAlerts"); }
  function state() { return { rows: rows.slice(), ready: ready, error: error, enabled: enabled() }; }
  function timestamp(value) { return typeof value?.toMillis === "function" ? value.toMillis() : null; }
  function start(force) {
    var s = session(), next = s?.uid && s?.code ? [s.code,s.uid,s.role].join(":") : "";
    if (!force && next === key && (unsubscribe || ready)) return;
    key = next; var token = ++generation;
    if (unsubscribe) unsubscribe(); unsubscribe = null;
    rows = []; error = ""; ready = false; emit();
    if (!next || !enabled() || !window.NT_FIREBASE?.db) { ready = true; emit(); return; }
    var query = collection(s);
    if (s.role === "pekerja") query = query.where("recipientUid", "==", s.uid);
    query = query.orderBy("createdAt", "desc").limit(100);
    try { unsubscribe = query.onSnapshot(function (snapshot) {
      if (token !== generation) return;
      rows = snapshot.docs.map(function (doc) { var r = doc.data(); return {
        id: doc.id, recipientUid:r.recipientUid, memberId:r.memberId, senderUid:r.senderUid,
        title:r.title, message:r.message, severity:r.severity,
        createdAt:timestamp(r.createdAt), acknowledgedAt:timestamp(r.acknowledgedAt), resolvedAt:timestamp(r.resolvedAt),
        pending:doc.metadata ? doc.metadata.hasPendingWrites === true : snapshot.metadata?.hasPendingWrites === true,
      }; }).filter(function (r) { return r.recipientUid && (s.role !== "pekerja" || r.recipientUid === s.uid); });
      ready = true; error = ""; emit();
    }, function () { if (token !== generation) return; rows = []; error = "Pesan belum tersinkron. Periksa koneksi lalu coba lagi."; ready = true; emit(); });
    } catch (ignore) { ready = true; error = "Pesan belum dapat dimuat."; emit(); }
  }
  async function send(input) {
    var s = session();
    if (!s || !["supervisor", "management"].includes(s.role)) throw new Error("Hanya petugas perusahaan yang dapat mengirim alert.");
    if (!enabled() || !window.NT_FIREBASE?.db) throw new Error("Pengiriman tersedia pada aplikasi online atau emulator.");
    var member = s.members?.find(function (m) { return m.id === input.memberId && m.role === "pekerja" && m.uid; });
    if (!member) throw new Error("Pilih pekerja yang sudah mengaktifkan akun.");
    var title = typeof input.title === "string" ? input.title.trim() : "";
    var message = typeof input.message === "string" ? input.message.trim() : "";
    if (!title || title.length > 100 || !message || message.length > 1000 || !["info","attention","urgent"].includes(input.severity)) throw new Error("Lengkapi judul, pesan, dan prioritas alert.");
    try { await collection(s).add({schemaVersion:1,recipientUid:member.uid,memberId:member.id,senderUid:s.uid,
      title:title,message:message,severity:input.severity,createdAt:window.firebase.firestore.FieldValue.serverTimestamp(),
      acknowledgedAt:null,resolvedAt:null,resolvedBy:null}); }
    catch (ignore) { throw new Error("Alert belum berhasil dikirim. Periksa koneksi dan akses akun."); }
  }
  async function update(id, resolve) {
    var s = session(), row = rows.find(function (r) { return r.id === id; });
    if (!s || !row || row.resolvedAt || !enabled()) throw new Error("Alert tidak tersedia untuk tindakan ini.");
    if (resolve ? !["supervisor","management"].includes(s.role) : row.recipientUid !== s.uid) throw new Error("Tindakan tidak diizinkan untuk akun ini.");
    var time = window.firebase.firestore.FieldValue.serverTimestamp();
    try { await collection(s).doc(id).update(resolve ? {resolvedAt:time,resolvedBy:s.uid} : {acknowledgedAt:time}); }
    catch (ignore) { throw new Error("Perubahan belum tersimpan. Periksa koneksi lalu coba lagi."); }
  }
  window.ntWorkerAlerts = { state:state, send:send, acknowledge:function(id){return update(id,false);}, resolve:function(id){return update(id,true);}, retry:function(){start(true);} };
  window.addEventListener("nt-session", function(){start(false);});
  window.addEventListener("nt-auth", function(){start(false);});
  window.addEventListener("online", function(){start(true);});
  start(false);
})();
