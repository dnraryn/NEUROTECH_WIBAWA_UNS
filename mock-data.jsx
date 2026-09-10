// Shared mock data, used by both list and detail pages so drill-downs find
// the record they navigated to. Keyed by URL-safe slug.

// Trailing .replace strips leading/trailing dashes so "Rizky A." → "rizky-a"
// (not "rizky-a-"), keeping ids stable and lookups (CURRENT_WORKER) reliable.
const slugify = (s) => s.toLowerCase().replace(/[.\s]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");

const WORKERS_RAW = [
  { name: "Rizky A.",   role: "CCR Operator",  status: "kritis",   fi: 78, cli: 88, hrv: 42, ei: 32, sleep: 5.4, readiness: 48, t: "11:42", microsleep: true,  shift: "Pagi", img: "#9c8bf0" },
  { name: "Bagas S.",   role: "Driver Truk",   status: "berisiko", fi: 64, cli: 71, hrv: 51, ei: 44, sleep: 6.2, readiness: 58, t: "11:38", microsleep: false, shift: "Pagi", img: "#6cb6f0" },
  { name: "Indah P.",   role: "Dispatcher",    status: "waspada",  fi: 48, cli: 62, hrv: 58, ei: 56, sleep: 6.8, readiness: 68, t: "11:42", microsleep: false, shift: "Pagi", img: "#ff8aa1" },
  { name: "Yusuf H.",   role: "CCR Operator",  status: "normal",   fi: 28, cli: 44, hrv: 64, ei: 71, sleep: 7.4, readiness: 82, t: "11:41", microsleep: false, shift: "Pagi", img: "#7dd1a1" },
  { name: "Lestari N.", role: "Lab Analyst",   status: "normal",   fi: 22, cli: 38, hrv: 71, ei: 78, sleep: 7.8, readiness: 88, t: "11:42", microsleep: false, shift: "Pagi", img: "#ffc56a" },
  { name: "Doni R.",    role: "Security CCTV", status: "waspada",  fi: 52, cli: 58, hrv: 55, ei: 51, sleep: 6.4, readiness: 64, t: "11:40", microsleep: false, shift: "Pagi", img: "#b9adf5" },
  // Sore shift
  { name: "Anggi W.",   role: "CCR Operator",  status: "normal",   fi: 30, cli: 41, hrv: 67, ei: 72, sleep: 7.2, readiness: 80, t: "15:01", microsleep: false, shift: "Sore", img: "#8cc6f5" },
  { name: "Pram E.",    role: "Driver Truk",   status: "waspada",  fi: 55, cli: 60, hrv: 53, ei: 49, sleep: 6.1, readiness: 60, t: "15:00", microsleep: false, shift: "Sore", img: "#cfc4f8" },
  // Malam shift
  { name: "Mira K.",    role: "Dispatcher",    status: "berisiko", fi: 71, cli: 74, hrv: 47, ei: 38, sleep: 5.0, readiness: 44, t: "23:42", microsleep: false, shift: "Malam", img: "#ffaebb" },
  { name: "Tomi L.",    role: "Security CCTV", status: "kritis",   fi: 82, cli: 79, hrv: 39, ei: 26, sleep: 4.6, readiness: 38, t: "23:40", microsleep: true,  shift: "Malam", img: "#ff9c9c" },
];

const WORKERS = WORKERS_RAW.map((w) => ({ ...w, id: slugify(w.name) }));

const WORKERS_BY_ID = Object.fromEntries(WORKERS.map((w) => [w.id, w]));

// Recent alerts, used by Supervisor live feed AND Alert list/detail pages.
const ALERTS = [
  { id: "a-1142", t: "11:42", date: "14 Mei 2026", title: "Microsleep terdeteksi",      worker: "rizky-a",   workerName: "Rizky A.",   detail: "Theta-burst 2.3 s + EI drop 41% selama 8 detik.", status: "kritis",   action: null },
  { id: "a-1128", t: "11:28", date: "14 Mei 2026", title: "CLI tinggi 18 menit",         worker: "bagas-s",   workerName: "Bagas S.",   detail: "Cognitive Load Index di atas ambang berisiko selama 18 menit.", status: "berisiko", action: null },
  { id: "a-1054", t: "10:54", date: "14 Mei 2026", title: "Fatigue naik konsisten",      worker: "doni-r",    workerName: "Doni R.",    detail: "FI naik 24 poin sejak awal shift. Tren menanjak tanpa istirahat.", status: "waspada",  action: null },
  { id: "a-1031", t: "10:31", date: "14 Mei 2026", title: "BLE disconnect",              worker: "indah-p",   workerName: "Indah P.",   detail: "Headband Muse S putus koneksi selama 4 menit. Sudah reconnect.", status: "waspada",  action: "Resolved" },
  { id: "a-0948", t: "09:48", date: "14 Mei 2026", title: "Readiness rendah",            worker: "yusuf-h",   workerName: "Yusuf H.",   detail: "Skor readiness pra-shift 58 (di bawah ambang 65). Tidur 5.8 jam.", status: "waspada",  action: null },
  { id: "a-0812", t: "08:12", date: "14 Mei 2026", title: "Kalibrasi selesai",           worker: null,         workerName: "12 pekerja", detail: "Baseline kalibrasi pagi selesai untuk 12 pekerja shift pagi.", status: "normal",   action: "Logged" },
];

const ALERTS_BY_ID = Object.fromEntries(ALERTS.map((a) => [a.id, a]));

// Shift schedule, week grid
const SCHEDULE = {
  weekLabel: "Minggu, 11–17 Mei 2026",
  days: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  shifts: [
    { id: "pagi",   label: "Pagi · 07:00–15:00", workers: ["rizky-a", "bagas-s", "indah-p", "yusuf-h", "lestari-n", "doni-r"] },
    { id: "sore",   label: "Sore · 15:00–23:00", workers: ["anggi-w", "pram-e"] },
    { id: "malam",  label: "Malam · 23:00–07:00", workers: ["mira-k", "tomi-l"] },
  ],
};

// SMK3 reports, list with downloadable PDFs (mock)
const REPORTS = [
  { id: "rpt-2026-04", period: "April 2026",   workers: 142, incidents: 11, score: 84, status: "Final",  date: "01 Mei 2026" },
  { id: "rpt-2026-03", period: "Maret 2026",   workers: 138, incidents: 18, score: 78, status: "Final",  date: "01 Apr 2026" },
  { id: "rpt-2026-02", period: "Februari 2026",workers: 134, incidents: 22, score: 74, status: "Final",  date: "01 Mar 2026" },
  { id: "rpt-2026-q1", period: "Q1 2026",      workers: 142, incidents: 51, score: 79, status: "Final",  date: "01 Apr 2026" },
  { id: "rpt-2026-05", period: "Mei 2026 (running)", workers: 142, incidents: 7, score: 86, status: "Draft", date: "14 Mei 2026" },
];

const REPORTS_BY_ID = Object.fromEntries(REPORTS.map((r) => [r.id, r]));

// Mock current logged-in worker (used by mobile screens that show "Rizky A.").
// Fallback to WORKERS[0] so CURRENT_WORKER is never undefined.
const CURRENT_WORKER = WORKERS_BY_ID["rizky-a"] || WORKERS[0];

Object.assign(window, {
  slugify,
  WORKERS, WORKERS_BY_ID,
  ALERTS,  ALERTS_BY_ID,
  SCHEDULE,
  REPORTS, REPORTS_BY_ID,
  CURRENT_WORKER,
});

// ── Worker identity — derived from the logged-in company's members ────────
// The mock rows above are the offline/demo fallback. Once a member logs in,
// every worker shown in the app is built from that company's member list
// (companies/{code}.members). Monitoring numbers are generated deterministically
// from the member id so they stay stable between renders and reloads.
const SHIFTS = ["Pagi", "Sore", "Malam"];
const SHIFT_HOURS = { Pagi: "07:00–15:00", Sore: "15:00–23:00", Malam: "23:00–07:00" };
const ROLE_LABEL_ID = { pekerja: "Pekerja", supervisor: "Supervisor", management: "Manajemen" };
const NT_IMG = ["#9c8bf0", "#6cb6f0", "#7dd1a1", "#ffc56a", "#ff8aa1", "#b9adf5", "#8cc6f5", "#cfc4f8", "#a8e0c0", "#ffaebb"];

const _seedOf = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const _rngOf = (seed) => {
  let x = seed || 123456789;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
};

// Build one monitored-worker record from a company member.
const workerFromMember = (m, idx) => {
  const r = _rngOf(_seedOf((m.id || "m") + "|" + (m.name || "")));
  const fi  = Math.round(22 + r() * 60);
  const cli = Math.round(34 + r() * 52);
  const hrv = Math.round(40 + r() * 34);
  const ei  = Math.round(30 + r() * 48);
  const sleep = +(4.6 + r() * 3.3).toFixed(1);
  const readiness = Math.round(40 + r() * 52);
  const microsleep = r() < 0.16;
  const status =
    (microsleep || fi >= 76 || cli >= 82) ? "kritis" :
    (fi >= 60 || cli >= 70)               ? "berisiko" :
    (fi >= 44 || cli >= 56)               ? "waspada" : "normal";
  const shift = SHIFTS.includes(m.shift) ? m.shift : SHIFTS[Math.floor(r() * 3)];
  const hourBase = { Pagi: 8, Sore: 16, Malam: 0 }[shift];
  const t = String(hourBase + Math.floor(r() * 6)).padStart(2, "0") + ":" +
            String(Math.floor(r() * 60)).padStart(2, "0");
  return {
    id: m.id, name: m.name,
    role: m.roleDesc || ROLE_LABEL_ID[m.role] || "Pekerja",
    systemRole: m.role || "pekerja",
    shift, fi, cli, hrv, ei, sleep, readiness, status, microsleep, t,
    img: NT_IMG[idx % NT_IMG.length],
  };
};

// Replace WORKERS / WORKERS_BY_ID / CURRENT_WORKER from a members array.
const ntApplyCompanyMembers = (members, currentId) => {
  if (!members || !members.length) return false;
  const rows = members.map((m, i) => workerFromMember(m, i));
  WORKERS.splice(0, WORKERS.length, ...rows);
  Object.keys(WORKERS_BY_ID).forEach((k) => delete WORKERS_BY_ID[k]);
  rows.forEach((w) => { WORKERS_BY_ID[w.id] = w; });
  const cur = (currentId && WORKERS_BY_ID[currentId]) || rows[0];
  if (cur) {
    Object.keys(CURRENT_WORKER).forEach((k) => delete CURRENT_WORKER[k]);
    Object.assign(CURRENT_WORKER, cur);
  }
  window.dispatchEvent(new CustomEvent("nt-data"));
  return true;
};

// Called by App on mount — rebuilds worker data from the saved session.
const ntStartWorkerSync = () => {
  const s = window.ntSession && window.ntSession.get();
  if (s && s.members && s.members.length) ntApplyCompanyMembers(s.members, s.memberId);
};

// Shift groups for the schedule grid, derived live from WORKERS.
const ntShiftGroups = () => SHIFTS.map((sh) => ({
  id: sh.toLowerCase(),
  label: sh + " · " + SHIFT_HOURS[sh],
  workers: WORKERS.filter((w) => w.shift === sh).map((w) => w.id),
}));

// Persist the current company's members array (best-effort).
const _persistMembers = () => {
  const s = window.ntSession && window.ntSession.get();
  if (s && s.code && s.members && window.ntCompany && window.ntCompany.setMembers) {
    window.ntCompany.setMembers(s.code, s.members).catch((e) =>
      console.warn("[NeuroTech] gagal simpan anggota:", e.message));
  }
};

// Change one worker's shift (supervisor schedule).
const ntSetWorkerShift = (id, shift) => {
  const w = WORKERS_BY_ID[id];
  if (!w || !SHIFTS.includes(shift)) return false;
  w.shift = shift;
  if (CURRENT_WORKER.id === id) CURRENT_WORKER.shift = shift;
  const s = window.ntSession && window.ntSession.get();
  if (s && s.members) {
    const m = s.members.find((x) => x.id === id);
    if (m) { m.shift = shift; window.ntSession.set(s); _persistMembers(); }
  }
  window.dispatchEvent(new CustomEvent("nt-data"));
  return true;
};

// Add a worker — creates a company member, then rebuilds the worker list.
// role     = system role: "pekerja" | "supervisor" | "management"
// roleDesc = job description shown in tables (e.g. "Operator CCR")
const ntAddWorker = ({ name, role, roleDesc, shift }) => {
  const nm = (name || "").trim();
  if (!nm) return false;
  const sysRole = ["pekerja", "supervisor", "management"].includes(role) ? role : "pekerja";
  const member = {
    id: "w" + Date.now().toString(36),
    name: nm,
    role: sysRole,
    roleDesc: (roleDesc || "").trim() || ROLE_LABEL_ID[sysRole],
    password: "123456",
    shift: SHIFTS.includes(shift) ? shift : "Pagi",
  };
  const s = window.ntSession && window.ntSession.get();
  if (s) {
    s.members = (s.members || []).concat([member]);
    window.ntSession.set(s);
    _persistMembers();
    ntApplyCompanyMembers(s.members, s.memberId);
  } else {
    const w = workerFromMember(member, WORKERS.length);
    WORKERS.push(w); WORKERS_BY_ID[w.id] = w;
    window.dispatchEvent(new CustomEvent("nt-data"));
  }
  return true;
};

// Remove a worker.
const ntRemoveWorker = (id) => {
  const s = window.ntSession && window.ntSession.get();
  if (s && s.members) {
    const next = s.members.filter((m) => m.id !== id);
    if (next.length === s.members.length) return false;
    s.members = next;
    window.ntSession.set(s);
    _persistMembers();
    ntApplyCompanyMembers(s.members, s.memberId);
    return true;
  }
  const i = WORKERS.findIndex((w) => w.id === id);
  if (i < 0) return false;
  WORKERS.splice(i, 1); delete WORKERS_BY_ID[id];
  window.dispatchEvent(new CustomEvent("nt-data"));
  return true;
};

// ── Live data engine — random-walk drift + ring buffer ───────────────────
// Each tick (~1.5 s) nudges every worker's FI/CLI/HRV/EI/readiness with a
// bounded random walk plus a slow upward fatigue bias (~0.06 per tick on
// FI/CLI, slow downward on HRV/EI/readiness), recomputes `status` using the
// existing thresholds, and stores the last 60 ticks per worker in
// WORKER_HISTORY. Each tick dispatches "nt-data" so consumers (EEGWave,
// WorkerLive prediction card, BrainTimeline, supervisor cards) re-render.
//
// Engine on/off is controlled by `window.NT_LIVE` (default ON). The device
// pairing button in app.jsx is wired to ntLiveStart/Stop via ntDeviceConnect.
const NT_LIVE_INTERVAL_MS = 1500;
const NT_HISTORY_CAP = 60;
const WORKER_HISTORY = {};

const _clip = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const _statusOf = (w) =>
  (w.microsleep || w.fi >= 76 || w.cli >= 82) ? "kritis" :
  (w.fi >= 60 || w.cli >= 70)                 ? "berisiko" :
  (w.fi >= 44 || w.cli >= 56)                 ? "waspada" : "normal";

// Helper that ble-muse-dsp.js calls to write real DSP samples into the same
// ring buffer the rest of the app reads from. Exposed via window below.
const ntPushHistory = (id, entry) => {
  if (!id) return;
  const b = WORKER_HISTORY[id] || (WORKER_HISTORY[id] = []);
  b.push(entry);
  if (b.length > NT_HISTORY_CAP) b.shift();
};

const _liveTick = () => {
  if (!window.NT_LIVE || !WORKERS.length) return;
  // When a real Muse is paired (ble-muse-dsp.js drives the values from real
  // EEG), skip the random drift here — otherwise the mock numbers would
  // fight the DSP output every tick. The DSP module writes CURRENT_WORKER +
  // ring buffer directly and dispatches its own `nt-data` event.
  if (window.ntMuseConnected) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  WORKERS.forEach((w) => {
    w.fi        = Math.round(_clip(w.fi        + 0.06 + (Math.random() - 0.45) * 3.2, 0, 100));
    w.cli       = Math.round(_clip(w.cli       + 0.05 + (Math.random() - 0.45) * 3.2, 0, 100));
    w.hrv       = Math.round(_clip(w.hrv       - 0.04 + (Math.random() - 0.5)  * 2.4, 30, 95));
    w.ei        = Math.round(_clip(w.ei        - 0.03 + (Math.random() - 0.5)  * 3.0, 0, 100));
    w.readiness = Math.round(_clip(w.readiness - 0.04 + (Math.random() - 0.5)  * 1.4, 20, 100));
    w.status    = _statusOf(w);
    w.t         = hh + ":" + mm;
    const buf = WORKER_HISTORY[w.id] || (WORKER_HISTORY[w.id] = []);
    buf.push({
      ts: Date.now(), fi: w.fi, cli: w.cli, hrv: w.hrv, ei: w.ei,
      readiness: w.readiness, status: w.status, microsleep: !!w.microsleep,
    });
    if (buf.length > NT_HISTORY_CAP) buf.shift();
  });
  if (CURRENT_WORKER && CURRENT_WORKER.id) {
    const me = WORKERS_BY_ID[CURRENT_WORKER.id];
    if (me) Object.assign(CURRENT_WORKER, me);
  }
  window.dispatchEvent(new CustomEvent("nt-data"));
};

let _liveTimer = null;
const ntLiveStart = () => {
  window.NT_LIVE = true;
  if (_liveTimer) clearInterval(_liveTimer);
  _liveTimer = setInterval(_liveTick, NT_LIVE_INTERVAL_MS);
};
const ntLiveStop = () => {
  window.NT_LIVE = false;
  if (_liveTimer) { clearInterval(_liveTimer); _liveTimer = null; }
};
const ntHistory = (id) => WORKER_HISTORY[id] || [];

// Engine starts ON by default. Override with `window.NT_LIVE = false` before
// this script runs to keep numbers frozen (useful for screenshots).
if (window.NT_LIVE === undefined) window.NT_LIVE = true;
if (window.NT_LIVE) ntLiveStart();

// ── Device connect — tries real Muse via Web Bluetooth first, falls back
// to simulation when BLE isn't available / the user cancels. Either path
// flips NT_LIVE so every UI consumer keeps working unchanged.
//
// `mode`:
//   undefined / "auto" — try BLE first; if user cancels OR BLE missing,
//                        reject so the caller can decide. (We don't
//                        silently fall back to fake data on cancel.)
//   "real"             — force BLE; reject on cancel / no support.
//   "demo"             — skip BLE entirely (use simulation).
const ntDeviceConnect = (mode) => new Promise(async (resolve, reject) => {
  if (window.NT_LIVE) { resolve({ real: !!window.ntMuseConnected }); return; }
  const tryReal = mode !== "demo" && window.ntMuse && window.ntMuse.supported();
  if (tryReal) {
    try {
      const info = await window.ntMuse.connect();
      window.ntMuseConnected = true;
      ntLiveStart();
      window.dispatchEvent(new CustomEvent("nt-device", {
        detail: { connected: true, real: true, name: info.name, battery: info.battery },
      }));
      resolve({ real: true, name: info.name });
      return;
    } catch (e) {
      if (mode === "real") { reject(e); return; }
      // Auto mode: pairing cancelled → reject (so the UI can suggest demo
      // mode). Hard failure (no BLE service) → fall through to simulation.
      if (e && /cancel|notfound/i.test((e.message || "") + (e.name || ""))) {
        reject(e); return;
      }
      console.warn("[NeuroTech] BLE pairing gagal, lanjut ke simulasi:", e && e.message);
    }
  }
  if (mode === "real") { reject(new Error("Web Bluetooth tidak tersedia di browser ini.")); return; }
  // Simulation path.
  setTimeout(() => {
    window.ntMuseConnected = false;
    ntLiveStart();
    window.dispatchEvent(new CustomEvent("nt-device", { detail: { connected: true, real: false } }));
    resolve({ real: false });
  }, 1200);
});
const ntDeviceDisconnect = () => {
  if (window.ntMuse && window.ntMuseConnected) {
    try { window.ntMuse.disconnect(); } catch (e) { /* ignore */ }
  }
  window.ntMuseConnected = false;
  ntLiveStop();
  window.dispatchEvent(new CustomEvent("nt-device", { detail: { connected: false } }));
};
const ntDeviceStatus = () => {
  const s = (window.ntMuse && window.ntMuse.status && window.ntMuse.status()) || {};
  return {
    connected: !!window.NT_LIVE,
    real: !!window.ntMuseConnected,
    battery: s.battery || null,
    name: s.name || null,
  };
};

Object.assign(window, {
  SHIFTS, SHIFT_HOURS, workerFromMember, ntApplyCompanyMembers,
  ntStartWorkerSync, ntShiftGroups, ntSetWorkerShift, ntAddWorker, ntRemoveWorker,
  ntDeviceConnect, ntDeviceDisconnect, ntDeviceStatus,
  ntLiveStart, ntLiveStop, ntHistory, ntPushHistory,
  NT_HISTORY_CAP, NT_LIVE_INTERVAL_MS,
});
