// Monitoring EEG diri sendiri: koneksi Muse / simulasi → kalibrasi → monitoring →
// ringkasan sesi. Menulis sesi (heartbeat ≤ 5 dtk), riwayat per menit, dan peringatan.
import { db } from "../core/firebase.js";
import { companySettings } from "../core/context.js";
import { html, mount, icon, toast, errorMessage, relTime, fmtDateTime } from "../core/ui.js";
import { BrainSimulator, recommend, STATUS_LABEL, STATUS_LEVEL } from "../eeg/eeg-engine.js";
import { MuseStream, museSupported } from "../eeg/muse.js";
import { statusPill, sourceBadge, ALERT_TYPE, ALERT_STATUS, beep } from "../eeg/eeg-ui.js";
import { groupKey } from "../smk3/common.js";
import {
  collection, doc, query, where, orderBy, limit, onSnapshot, getDocs, writeBatch, increment,
  addDoc, setDoc, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const RING = 534;                 // 2πr, r = 85
const WRITE_MS = 5_000;           // heartbeat sesi
const MINUTE_MS = 60_000;         // riwayat per menit
const SIM_TICK_MS = 1_000;
const SIM_CALIB_S = 15;
const ALERT_COOLDOWN_MS = 5 * 60_000;
const MICROSLEEP_COOLDOWN_MS = 30_000;

// Koneksi Muse dipertahankan saat berpindah halaman agar tidak perlu pairing ulang.
let museShared = null;

export default {
  async render(el, ctx) {
    const cid = ctx.company.id;
    const settings = companySettings(ctx.company);
    const unsubs = [];

    const S = {
      phase: "idle",              // idle | calibrating | monitoring | ending
      source: null,               // sim | muse
      sim: null, sessionRef: null, startedAt: 0,
      timers: [], lastWrite: 0, lastWrittenLevel: 0,
      minute: null, minuteIdx: 0, totals: null,
      microsleepCount: 0, lastAlertLevel: 0, lastAlertAt: {},
      wakeLock: null, cancelCalib: false, lastReading: null,
    };

    mount(el, html`
      <div class="page-head">
        <div><h1>Monitoring Saya</h1>
          <div class="shift">${ctx.member.position || "—"}${ctx.member.shift ? ` · ${ctx.member.shift}` : ""} · data EEG pribadi Anda hanya terlihat oleh Anda, Supervisor, Ahli K3, dan Admin.</div></div>
      </div>
      <div class="grid eeg-self">
        <div class="phone">
          <div class="gauge-wrap"><div class="gauge">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9c8bf0" /><stop offset="1" stop-color="#6cb6f0" /></linearGradient></defs>
              <circle class="ring-bg" cx="100" cy="100" r="85" fill="none" stroke-width="14" />
              <circle id="ring" class="ring-fg" cx="100" cy="100" r="85" fill="none" stroke-width="14" stroke-dasharray="${RING}" stroke-dashoffset="${RING}" />
            </svg>
            <div class="center"><b id="ready">--</b><span>Readiness</span></div>
          </div></div>
          <div class="center" style="margin:-.4rem 0 1rem"><span id="pill" class="pill normal">Belum ada sesi</span></div>

          <div class="panel device">
            <div class="row-between">
              <div><b>Headband Muse</b><div class="tiny muted" id="museStatus">Belum terhubung.</div></div>
              <button id="connectBtn" class="btn btn-ghost btn-sm" type="button">Hubungkan</button>
            </div>
            <canvas id="eegCanvas" class="eeg-canvas hidden" width="320" height="46"></canvas>
          </div>

          <div class="mini six">
            <div><b id="m-fi">--</b><span>Fatigue</span></div>
            <div><b id="m-cli">--</b><span>Cog. Load</span></div>
            <div><b id="m-ei">--</b><span>Engagement</span></div>
            <div><b id="m-hrv">--</b><span>HRV</span></div>
            <div><b id="m-stress">--</b><span>Stres</span></div>
            <div><b id="m-ms">0</b><span>Microsleep</span></div>
          </div>

          <div class="panel reco"><div class="tiny muted up">Rekomendasi</div>
            <div id="reco">Mulai sesi di awal shift untuk merekam baseline personal Anda.</div></div>

          <div class="progress hidden" id="calibBar"><i id="calibFill"></i></div>

          <div class="stack" style="margin-top:1rem">
            <button id="startMuse" class="btn btn-primary btn-block" type="button" disabled>${icon("mdi:play")} Mulai sesi (Muse)</button>
            ${settings.allowSimulation ? html`<button id="startSim" class="btn btn-ghost btn-block" type="button">${icon("mdi:test-tube")} Mulai sesi simulasi (pelatihan)</button>` : ""}
            <button id="fatigueBtn" class="btn btn-ghost btn-block hidden" type="button">😴 Simulasikan kelelahan</button>
            <button id="endBtn" class="btn btn-danger btn-block hidden" type="button">${icon("mdi:stop")} Akhiri sesi</button>
          </div>
          <div class="tiny muted center" id="note" style="margin-top:.8rem">Status: tidak ada sesi berjalan.</div>
        </div>

        <div class="stack">
          <div class="panel">
            <h3>${icon("mdi:history")} Riwayat sesi saya</h3>
            <div id="history" class="muted tiny">Memuat…</div>
          </div>
          <div class="panel">
            <h3>${icon("mdi:bell-outline")} Peringatan saya</h3>
            <div id="myAlerts" class="muted tiny">Memuat…</div>
          </div>
          <div class="panel tiny muted">
            <b>Catatan penggunaan.</b> Web Bluetooth hanya tersedia di Chrome/Edge (desktop & Android) melalui HTTPS.
            Pastikan sensor dahi & belakang telinga menempel. Jaga layar tetap menyala selama sesi.
            Indeks bersifat <b>pendukung keputusan</b> — bukan diagnosis medis.
          </div>
        </div>
      </div>`);

    const $ = (id) => el.querySelector("#" + id);
    const setText = (id, v) => { const x = $(id); if (x) x.textContent = v; };

    /* ---------- tampilan ---------- */
    const setGauge = (v) => { setText("ready", Math.round(v)); $("ring").setAttribute("stroke-dashoffset", RING * (1 - v / 100)); };
    const setPill = (s, label) => { const p = $("pill"); p.className = "pill " + s; p.textContent = label || STATUS_LABEL[s]; };
    function paint(r) {
      setGauge(r.readiness);
      setText("m-fi", r.fi); setText("m-cli", r.cli); setText("m-ei", r.ei);
      setText("m-hrv", r.hrv); setText("m-stress", r.stress); setText("m-ms", S.microsleepCount);
      setPill(r.status);
      setText("reco", recommend(r).who);
    }
    function setControls() {
      const idle = S.phase === "idle";
      const museOk = !!museShared?.connected;
      $("startMuse").disabled = !idle || !museOk;
      $("startMuse").classList.toggle("hidden", !idle);
      $("startSim")?.classList.toggle("hidden", !idle);
      $("endBtn").classList.toggle("hidden", idle || S.phase === "ending");
      $("fatigueBtn").classList.toggle("hidden", !(S.phase === "monitoring" && S.source === "sim"));
      $("connectBtn").disabled = S.phase === "calibrating";
      $("calibBar").classList.toggle("hidden", S.phase !== "calibrating");
    }

    ctx.setLeaveGuard(() => (S.phase === "calibrating" || S.phase === "monitoring")
      ? "Sesi monitoring sedang berjalan. Meninggalkan halaman akan mengakhiri sesi. Lanjutkan?" : null);

    /* ---------- Muse ---------- */
    function museUI() {
      const m = museShared;
      if (!museSupported()) { setText("museStatus", "Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome/Edge."); $("connectBtn").disabled = true; return; }
      if (m?.connected) {
        setText("museStatus", `Terhubung${m.hasPpg ? " · PPG aktif" : ""}.`);
        $("connectBtn").textContent = "Terhubung ✓";
        $("eegCanvas").classList.remove("hidden");
      } else if (m?.device) {
        setText("museStatus", "Terputus.");
        $("connectBtn").textContent = "Sambungkan ulang";
      } else {
        $("connectBtn").textContent = "Hubungkan";
      }
      setControls();
    }

    function wireMuse(m) {
      m.onStatus = (msg) => setText("museStatus", msg);
      m.onDisconnect = () => {
        museUI();
        if (S.phase === "monitoring" && S.source === "muse") {
          toast("Headband Muse terputus. Sambungkan ulang untuk melanjutkan sesi.", "kritis", 8000);
          beep("kritis");
          setText("note", "⚠ Muse terputus — data tidak direkam sampai tersambung kembali.");
        }
      };
    }

    $("connectBtn").addEventListener("click", async () => {
      const btn = $("connectBtn");
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
      try {
        if (museShared?.device && !museShared.connected) await museShared.reconnect();
        else if (!museShared?.connected) {
          const m = new MuseStream({ readiness: 80 });
          wireMuse(m);
          await m.connect();
          museShared = m;
        }
        if (S.phase === "monitoring" && S.source === "muse") setText("note", "Tersambung kembali — monitoring dilanjutkan.");
      } catch (e) {
        console.warn(e);
        if (e.name !== "NotFoundError") toast("Gagal menghubungkan Muse. Pastikan perangkat menyala & dekat.", "kritis");
      }
      btn.disabled = false;
      museUI();
    });
    if (museShared) wireMuse(museShared);

    let rawTimer = setInterval(() => {
      const c = $("eegCanvas"); if (!c || !museShared?.connected || document.hidden) return;
      const data = museShared.rawAF7(256), g = c.getContext("2d");
      g.clearRect(0, 0, c.width, c.height);
      if (data.length < 4) return;
      let mn = Infinity, mx = -Infinity; for (const v of data) { if (v < mn) mn = v; if (v > mx) mx = v; }
      const range = (mx - mn) || 1;
      g.beginPath(); g.strokeStyle = "#2fd4ee"; g.lineWidth = 1.4;
      data.forEach((v, i) => { const x = (i / (data.length - 1)) * c.width, y = c.height - ((v - mn) / range) * (c.height - 6) - 3; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
    }, 150);

    /* ---------- Firestore ---------- */
    const sessionsCol = collection(db, "companies", cid, "eegSessions");

    // Peringatan EEG. Microsleep & status kritis juga dicatat sebagai near miss (anonim) di modul Insiden.
    async function createAlert(type, severity, message) {
      try {
        const alertRef = doc(collection(db, "companies", cid, "eegAlerts"));
        const b = writeBatch(db);
        let incidentId = null;
        if (severity === "kritis") {
          const incRef = doc(collection(db, "companies", cid, "incidents"));
          incidentId = incRef.id;
          const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          const at = now.toISOString().slice(0, 16);
          const what = type === "microsleep" ? "Microsleep terdeteksi" : "Status kognitif KRITIS terdeteksi";
          b.set(incRef, {
            type: "near_miss", severity: type === "microsleep" ? "berat" : "sedang",
            title: `${what} (sistem EEG)`,
            description: `${what} oleh sistem monitoring EEG pada pekerja dengan jabatan ${ctx.member.position || "tidak disebutkan"}${ctx.member.shift ? `, ${ctx.member.shift}` : ""}. `
              + "Identitas pekerja tidak dicantumkan (prinsip non-punitif); Supervisor/Ahli K3 dapat melihatnya pada modul Peringatan EEG.",
            location: ctx.member.department || "", involved: "", immediateAction: "Pekerja menerima peringatan di perangkat untuk menghentikan aktivitas berisiko dan beristirahat.",
            occurredAt: at, occurredDate: at.slice(0, 10), lostDays: 0,
            source: "eeg", eegAlertId: alertRef.id, status: "dilaporkan",
            reportedBy: ctx.user.uid, reportedByName: "Sistem EEG", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          });
        }
        b.set(alertRef, {
          uid: ctx.user.uid, name: ctx.member.name, position: ctx.member.position || "",
          sessionId: S.sessionRef?.id || null, incidentId, type, severity, message, status: "open", createdAt: serverTimestamp(),
        });
        await b.commit();
      } catch (e) { console.warn("alert gagal:", e); }
    }

    // Agregat EEG anonim bulanan (hanya sesi headband, bukan simulasi) untuk KPI & register risiko.
    function statsWrite(summary) {
      if (S.source !== "muse" || !summary.readings) return null;
      const sm = summary.statusMinutes;
      const fields = {
        sessions: increment(1), minutes: increment(summary.durationMin), microsleep: increment(summary.microsleepCount),
        normalMin: increment(sm.normal || 0), waspadaMin: increment(sm.waspada || 0), berisikoMin: increment(sm.berisiko || 0),
        kritisMin: increment(sm.kritis || 0), sumFiMin: increment(summary.avgFi * summary.durationMin),
      };
      const g = groupKey(ctx.member.position);
      return {
        ref: doc(db, "companies", cid, "eegStats", new Date().toISOString().slice(0, 7)),
        data: {
          ...fields, updatedAt: serverTimestamp(),
          groups: { [g]: { label: ctx.member.position || "Tanpa jabatan", sessions: increment(1), minutes: increment(summary.durationMin),
            microsleep: increment(summary.microsleepCount), berisikoMin: increment(sm.berisiko || 0), kritisMin: increment(sm.kritis || 0) } },
        },
      };
    }

    const emptyAcc = () => ({ n: 0, fi: 0, cli: 0, ei: 0, hrv: 0, stress: 0, worst: 0, microsleep: 0 });

    function flushMinute() {
      const a = S.minute;
      if (!S.sessionRef || !a || a.n === 0) return;
      const idx = ++S.minuteIdx;
      const avg = (k) => Math.round(a[k] / a.n);
      setDoc(doc(S.sessionRef, "minutes", "m" + String(idx).padStart(4, "0")), {
        uid: ctx.user.uid, m: idx, at: serverTimestamp(),
        fi: avg("fi"), cli: avg("cli"), ei: avg("ei"), hrv: avg("hrv"), stress: avg("stress"),
        worst: ["normal", "waspada", "berisiko", "kritis"][a.worst], microsleep: a.microsleep,
      }).catch((e) => console.warn("riwayat menit gagal:", e));
      S.minute = emptyAcc(); S.minuteStart = Date.now();
    }

    /* ---------- inti: proses 1 pembacaan ---------- */
    function processReading(r) {
      if (S.phase !== "monitoring") return;
      const now = Date.now();
      const lvl = STATUS_LEVEL[r.status];
      S.lastReading = r;

      // akumulasi
      const m = S.minute, t = S.totals;
      m.n++; m.fi += r.fi; m.cli += r.cli; m.ei += r.ei; m.hrv += r.hrv; m.stress += r.stress; m.worst = Math.max(m.worst, lvl);
      t.n++; t.fi += r.fi; t.cli += r.cli; t.ei += r.ei; t.stress += r.stress; t.maxFi = Math.max(t.maxFi, r.fi); t.ticks[r.status]++;

      // peringatan
      if (r.microsleep) {
        S.microsleepCount++; m.microsleep++;
        toast("⚠ Microsleep terdeteksi! Hentikan aktivitas berisiko.", "kritis", 8000);
        beep("kritis"); navigator.vibrate?.([400, 150, 400]);
        if (now - (S.lastAlertAt.microsleep || 0) > MICROSLEEP_COOLDOWN_MS) {
          S.lastAlertAt.microsleep = now;
          createAlert("microsleep", "kritis", `Microsleep terdeteksi pada ${ctx.member.name} (FI ${r.fi}, EI ${r.ei}).`);
        }
      } else if (lvl >= 2 && lvl > S.lastAlertLevel && now - (S.lastAlertAt[r.status] || 0) > ALERT_COOLDOWN_MS) {
        S.lastAlertAt[r.status] = now;
        const type = r.stress >= 78 ? "stress" : r.cli >= 70 ? "cognitive" : "fatigue";
        createAlert(type, r.status, `${ctx.member.name} berstatus ${STATUS_LABEL[r.status]} (FI ${r.fi}, CLI ${r.cli}, Stres ${r.stress}).`);
        if (r.status === "kritis") { toast("Status KRITIS — ambil istirahat sekarang.", "kritis", 8000); beep("kritis"); navigator.vibrate?.([300, 100, 300]); }
      }
      S.lastAlertLevel = r.microsleep ? 3 : lvl;

      if (S.source === "muse" && r.signal != null && r.signal < 0.5) setText("museStatus", "⚠ Sinyal lemah — rapikan posisi headband.");
      paint(r);

      // heartbeat (lebih cepat bila status memburuk)
      if (S.sessionRef && (now - S.lastWrite >= WRITE_MS || lvl > S.lastWrittenLevel || r.microsleep)) {
        S.lastWrite = now; S.lastWrittenLevel = lvl;
        updateDoc(S.sessionRef, {
          latest: { fi: r.fi, cli: r.cli, ei: r.ei, hrv: r.hrv, readiness: r.readiness, stress: r.stress, signal: r.signal ?? null, ts: now },
          status: r.microsleep ? "kritis" : r.status, microsleepCount: S.microsleepCount, lastSeenAt: serverTimestamp(),
        }).catch((e) => console.warn("heartbeat gagal:", e));
      }
      if (now - S.minuteStart >= MINUTE_MS) flushMinute();
    }

    /* ---------- wake lock ---------- */
    async function lockScreen() {
      try { if ("wakeLock" in navigator && !S.wakeLock) { S.wakeLock = await navigator.wakeLock.request("screen"); S.wakeLock.addEventListener("release", () => { S.wakeLock = null; }); } } catch {}
    }
    const onVisible = () => { if (!document.hidden && S.phase === "monitoring") lockScreen(); };
    document.addEventListener("visibilitychange", onVisible);

    /* ---------- sesi ---------- */
    async function start(source) {
      if (S.phase !== "idle") return;
      S.source = source; S.phase = "calibrating"; S.cancelCalib = false;
      S.microsleepCount = 0; S.lastAlertLevel = 0; S.lastAlertAt = {};
      setControls(); lockScreen();
      setText("reco", "Merekam baseline personal. Duduk tenang, mata terbuka, rileks.");
      setPill("normal", "Kalibrasi");

      let baseline;
      try {
        if (source === "muse") {
          const secs = settings.calibrationMin * 60;
          baseline = await museShared.calibrate(secs, (p, valid) => {
            $("calibFill").style.width = p + "%";
            setText("note", `Kalibrasi baseline (Muse)… ${p}% · sampel valid ${valid}`);
          }, () => S.cancelCalib);
        } else {
          S.sim = new BrainSimulator();
          for (let i = 1; i <= SIM_CALIB_S; i++) {
            await new Promise((res) => setTimeout(res, 1000));
            if (S.cancelCalib) throw new Error("calibration-cancelled");
            const r = S.sim.tick({ drift: false });
            setGauge(r.readiness); setText("m-fi", r.fi); setText("m-cli", r.cli); setText("m-ei", r.ei);
            $("calibFill").style.width = Math.round((i / SIM_CALIB_S) * 100) + "%";
            setText("note", `Kalibrasi baseline (simulasi)… ${Math.round((i / SIM_CALIB_S) * 100)}%`);
          }
          baseline = S.sim.calibrate();
        }
      } catch (e) {
        S.phase = "idle"; setControls(); releaseLock();
        if (e.message === "calibration-cancelled") { setText("note", "Kalibrasi dibatalkan."); return; }
        if (e.message === "calibration-poor-signal") { toast("Kalibrasi gagal: sinyal buruk. Rapikan headband lalu ulangi.", "kritis", 8000); setText("note", "Kalibrasi gagal — sinyal kurang baik."); return; }
        throw e;
      }

      // tutup sesi aktif lama milik saya (tab crash / perangkat lain)
      try {
        const old = await getDocs(query(sessionsCol, where("uid", "==", ctx.user.uid), where("active", "==", true)));
        await Promise.all(old.docs.map((d) => updateDoc(d.ref, { active: false, endedAt: serverTimestamp() })));
      } catch (e) { console.warn("menutup sesi lama gagal:", e); }

      S.sessionRef = await addDoc(sessionsCol, {
        uid: ctx.user.uid, name: ctx.member.name, position: ctx.member.position || "", department: ctx.member.department || "",
        shift: ctx.member.shift || "", source, active: true, baseline, latest: null, status: "normal",
        microsleepCount: 0, startedAt: serverTimestamp(), lastSeenAt: serverTimestamp(),
      });
      S.startedAt = Date.now(); S.minuteStart = Date.now(); S.minuteIdx = 0; S.lastWrite = 0; S.lastWrittenLevel = 0;
      S.minute = emptyAcc();
      S.totals = { n: 0, fi: 0, cli: 0, ei: 0, stress: 0, maxFi: 0, ticks: { normal: 0, waspada: 0, berisiko: 0, kritis: 0 } };
      S.phase = "monitoring"; setControls();

      if (source === "muse") {
        setText("note", "Monitoring aktif — sinyal otak dipantau dari headband Muse.");
        museShared.start(processReading, () => {
          if (S.phase === "monitoring" && museShared.connected) setText("note", "Menunggu data dari headband…");
        });
      } else {
        setText("note", "Monitoring aktif (SIMULASI) — data ini bukan dari headband.");
        const tick = () => {
          S.sim.fatigue = Math.min(1, S.sim.fatigue + 0.0004 + Math.random() * 0.0008);
          processReading(S.sim.tick({ drift: false }));
        };
        tick();
        S.timers.push(setInterval(tick, SIM_TICK_MS));
      }
    }

    function releaseLock() { try { S.wakeLock?.release(); } catch {} S.wakeLock = null; }

    async function end({ silent = false } = {}) {
      if (S.phase === "calibrating") { S.cancelCalib = true; return; }
      if (S.phase !== "monitoring") return;
      S.phase = "ending"; setControls();
      S.timers.forEach(clearInterval); S.timers = [];
      if (S.source === "muse") museShared?.stop();
      flushMinute();

      const t = S.totals, n = t.n || 1;
      const tickMin = 1 / 60; // 1 pembacaan per detik
      const summary = {
        durationMin: Math.max(0, Math.round((Date.now() - S.startedAt) / 60_000)),
        readings: t.n,
        avgFi: Math.round(t.fi / n), maxFi: t.maxFi, avgCli: Math.round(t.cli / n),
        avgEi: Math.round(t.ei / n), avgStress: Math.round(t.stress / n),
        statusMinutes: Object.fromEntries(Object.entries(t.ticks).map(([k, v]) => [k, Math.round(v * tickMin * 10) / 10])),
        microsleepCount: S.microsleepCount,
      };
      const worst = ["kritis", "berisiko", "waspada", "normal"].find((k) => t.ticks[k] > 0) || "normal";
      const ref = S.sessionRef; S.sessionRef = null;
      try {
        await updateDoc(ref, { active: false, endedAt: serverTimestamp(), summary, status: S.microsleepCount ? "kritis" : worst, microsleepCount: S.microsleepCount });
      } catch (e) { console.warn("menutup sesi gagal:", e); if (!silent) toast(errorMessage(e), "kritis"); }
      const st = statsWrite(summary);
      if (st) setDoc(st.ref, st.data, { merge: true }).catch((e) => console.warn("statistik EEG gagal:", e));

      releaseLock();
      S.phase = "idle"; setControls();
      if (!silent) {
        setPill(worst, "Sesi selesai");
        setText("note", `Sesi selesai · ${summary.durationMin} menit · rerata FI ${summary.avgFi}.`);
        setText("reco", "Terima kasih. Tetap sehat & aman.");
        toast("Sesi disimpan.", "normal");
      }
    }

    $("startMuse").addEventListener("click", () => start("muse").catch((e) => { console.error(e); toast(errorMessage(e), "kritis"); S.phase = "idle"; setControls(); }));
    $("startSim")?.addEventListener("click", () => start("sim").catch((e) => { console.error(e); toast(errorMessage(e), "kritis"); S.phase = "idle"; setControls(); }));
    $("endBtn").addEventListener("click", () => end());
    $("fatigueBtn").addEventListener("click", () => { S.sim?.pushFatigue(0.25); toast("Kelelahan disimulasikan ↑", "berisiko"); });

    museUI();
    setControls();

    /* ---------- riwayat & peringatan saya ---------- */
    unsubs.push(onSnapshot(query(sessionsCol, where("uid", "==", ctx.user.uid), orderBy("startedAt", "desc"), limit(10)), (snap) => {
      const box = $("history"); if (!box) return;
      if (snap.empty) return mount(box, html`Belum ada sesi.`);
      mount(box, html`<div class="list">${snap.docs.map((d) => {
        const s = d.data(), sum = s.summary;
        return html`<a class="list-item" href="#/eeg/sesi/${d.id}">
          <div><b>${fmtDateTime(s.startedAt)}</b> ${sourceBadge(s.source)}
            <div class="tiny muted">${s.active ? "Sedang berjalan" : sum ? `${sum.durationMin} mnt · rerata FI ${sum.avgFi} · ${s.microsleepCount || 0} microsleep` : "Sesi tidak ditutup normal"}</div></div>
          ${statusPill(s.status)}</a>`;
      })}</div>`);
    }, (e) => { console.warn(e); setText("history", errorMessage(e)); }));

    unsubs.push(onSnapshot(query(collection(db, "companies", cid, "eegAlerts"), where("uid", "==", ctx.user.uid), orderBy("createdAt", "desc"), limit(10)), (snap) => {
      const box = $("myAlerts"); if (!box) return;
      if (snap.empty) return mount(box, html`Belum ada peringatan.`);
      mount(box, html`${snap.docs.map((d) => {
        const a = d.data();
        return html`<div class="alert-item"><span class="dot ${a.severity}"></span>
          <div class="txt"><b>${ALERT_TYPE[a.type] || a.type}</b> · <span class="tiny">${ALERT_STATUS[a.status]}</span>
            <p>${a.note ? `Tindak lanjut: ${a.note}` : a.message}</p></div><time>${relTime(a.createdAt)}</time></div>`;
      })}`);
    }, (e) => { console.warn(e); setText("myAlerts", errorMessage(e)); }));

    return () => {
      unsubs.forEach((u) => u());
      clearInterval(rawTimer);
      document.removeEventListener("visibilitychange", onVisible);
      end({ silent: true });
    };
  },
};
