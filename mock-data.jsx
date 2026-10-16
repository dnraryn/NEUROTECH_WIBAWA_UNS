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
const DEMO_DAY = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });

// Recent alerts, used by Supervisor live feed AND Alert list/detail pages.
const ALERTS = [
  { id: "a-1142", t: "11:42", date: DEMO_DAY, title: "Microsleep terdeteksi",      worker: "rizky-a",   workerName: "Rizky A.",   detail: "Theta-burst 2.3 s + EI drop 41% selama 8 detik.", status: "kritis",   action: null },
  { id: "a-1128", t: "11:28", date: DEMO_DAY, title: "CLI tinggi 18 menit",         worker: "bagas-s",   workerName: "Bagas S.",   detail: "Cognitive Load Index di atas ambang berisiko selama 18 menit.", status: "berisiko", action: null },
  { id: "a-1054", t: "10:54", date: DEMO_DAY, title: "Fatigue naik konsisten",      worker: "doni-r",    workerName: "Doni R.",    detail: "FI naik 24 poin sejak awal shift. Tren menanjak tanpa istirahat.", status: "waspada",  action: null },
  { id: "a-1031", t: "10:31", date: DEMO_DAY, title: "BLE disconnect",              worker: "indah-p",   workerName: "Indah P.",   detail: "Headband Muse S putus koneksi selama 4 menit. Sudah reconnect.", status: "waspada",  action: "Resolved" },
  { id: "a-0948", t: "09:48", date: DEMO_DAY, title: "Readiness rendah",            worker: "yusuf-h",   workerName: "Yusuf H.",   detail: "Skor readiness pra-shift 58 (di bawah ambang 65). Tidur 5.8 jam.", status: "waspada",  action: null },
  { id: "a-0812", t: "08:12", date: DEMO_DAY, title: "Kalibrasi selesai",           worker: null,         workerName: "12 pekerja", detail: "Baseline kalibrasi pagi selesai untuk 12 pekerja shift pagi.", status: "normal",   action: "Logged" },
];

const ALERTS_BY_ID = Object.fromEntries(ALERTS.map((a) => [a.id, a]));

// Shift schedule, week grid
const SCHEDULE = {
  weekLabel: "Jadwal simulasi · " + DEMO_DAY,
  days: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  shifts: [
    { id: "pagi",   label: "Pagi · 07:00–15:00", workers: ["rizky-a", "bagas-s", "indah-p", "yusuf-h", "lestari-n", "doni-r"] },
    { id: "sore",   label: "Sore · 15:00–23:00", workers: ["anggi-w", "pram-e"] },
    { id: "malam",  label: "Malam · 23:00–07:00", workers: ["mira-k", "tomi-l"] },
  ],
};

// Mock current logged-in worker (used by mobile screens that show "Rizky A.").
// Fallback to WORKERS[0] so CURRENT_WORKER is never undefined.
const CURRENT_WORKER = { ...(WORKERS_BY_ID["rizky-a"] || WORKERS[0]) };

Object.assign(window, {
  slugify,
  WORKERS, WORKERS_BY_ID,
  ALERTS,  ALERTS_BY_ID,
  SCHEDULE,
  DEMO_DAY,
  CURRENT_WORKER,
});

// ── Worker identity — derived from the logged-in company's members ────────
// The mock rows above are the offline/demo fallback. Once a member logs in,
// every worker shown in the app is built from that company's member list
// (companies/{code}/members). Real member profiles start with unavailable
// measurements. Only an explicit demo device may run simulated measurements.
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
const workerFromMember = (m, idx, authenticated = false) => {
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
  const shift = SHIFTS.includes(m.shift) ? m.shift : authenticated ? "Belum diatur" : SHIFTS[Math.floor(r() * 3)];
  const hourBase = { Pagi: 8, Sore: 16, Malam: 0 }[shift];
  const t = String(hourBase + Math.floor(r() * 6)).padStart(2, "0") + ":" +
            String(Math.floor(r() * 60)).padStart(2, "0");
  return {
    id: m.id, name: m.name,
    role: m.roleDesc || ROLE_LABEL_ID[m.role] || "Pekerja",
    systemRole: m.role || "pekerja",
    shift, fi: authenticated ? null : fi, cli: authenticated ? null : cli,
    hrv: authenticated ? null : hrv, ei: authenticated ? null : ei,
    sleep: authenticated ? null : sleep, readiness: authenticated ? null : readiness,
    status: authenticated ? null : status, microsleep: authenticated ? null : microsleep,
    t: authenticated ? null : t,
    img: NT_IMG[idx % NT_IMG.length],
  };
};

// Replace WORKERS / WORKERS_BY_ID / CURRENT_WORKER from a members array.
let _workerCompany = null;
const ntApplyCompanyMembers = (members, currentId) => {
  if (!members) return false;
  const company = window.ntSession?.get()?.code || null;
  const sameCompany = company === _workerCompany;
  if (!sameCompany || (currentId && CURRENT_WORKER.id !== currentId)) {
    window.ntDeviceDisconnect?.();
    Object.keys(WORKER_HISTORY).forEach((id) => delete WORKER_HISTORY[id]);
  }
  _workerCompany = company;
  const rows = members.map((m, i) => {
    const previous = sameCompany && WORKERS_BY_ID[m.id];
    return previous ? { ...previous, name: m.name, role: m.roleDesc || ROLE_LABEL_ID[m.role],
      systemRole: m.role, shift: SHIFTS.includes(m.shift) ? m.shift : previous.shift } : workerFromMember(m, i, true);
  });
  WORKERS.splice(0, WORKERS.length, ...rows);
  Object.keys(WORKERS_BY_ID).forEach((k) => delete WORKERS_BY_ID[k]);
  rows.forEach((w) => { WORKERS_BY_ID[w.id] = w; });
  const cur = (currentId && WORKERS_BY_ID[currentId]) || rows[0];
  Object.keys(CURRENT_WORKER).forEach((k) => delete CURRENT_WORKER[k]);
  if (cur) Object.assign(CURRENT_WORKER, cur);
  window.dispatchEvent(new CustomEvent("nt-data"));
  return true;
};

// Called by App on mount — rebuilds worker data from the saved session.
const ntStartWorkerSync = () => {
  const s = window.ntSession && window.ntSession.get();
  if (s && s.members && s.members.length) {
    ntApplyCompanyMembers(s.members, s.memberId);
    if (!window.ntMuseConnected && !window.NT_DEMO_DEVICE) ntLiveStop();
  }
};

// Shift groups for the schedule grid, derived live from WORKERS.
const ntShiftGroups = () => SHIFTS.map((sh) => ({
  id: sh.toLowerCase(),
  label: sh + " · " + SHIFT_HOURS[sh],
  workers: WORKERS.filter((w) => w.shift === sh).map((w) => w.id),
}));

// Serialize remote operations; Firestore Rules validate every protected write.
let _memberWriteQueue = Promise.resolve();
const _persistMembers = (operation) => {
  const identity = window.ntSession?.get();
  const work = async () => {
    const current = window.ntSession?.get();
    if (!identity || !current || identity.uid !== current.uid || identity.code !== current.code || identity.memberId !== current.memberId) {
      throw new Error("Sesi berubah. Masuk kembali sebelum menyimpan.");
    }
    await operation();
    const latest = window.ntSession.get();
    if (!latest || latest.uid !== identity.uid || latest.code !== identity.code || latest.memberId !== identity.memberId) {
      throw new Error("Sesi berubah saat menyimpan.");
    }
    ntApplyCompanyMembers(latest.members, latest.memberId);
    return true;
  };
  const pending = _memberWriteQueue.then(work, work);
  _memberWriteQueue = pending.catch(() => {});
  return pending;
};

const ntSetWorkerShift = async (id, shift) => {
  if (!WORKERS_BY_ID[id] || !SHIFTS.includes(shift)) return false;
  if (window.ntSession?.get()) return _persistMembers(() => window.ntCompany.setShift(id, shift));
  WORKERS_BY_ID[id].shift = shift;
  if (CURRENT_WORKER.id === id) CURRENT_WORKER.shift = shift;
  window.dispatchEvent(new CustomEvent("nt-data"));
  return true;
};

const ntAddWorker = async ({ name, email, role, roleDesc, shift }) => {
  const nm = (name || "").trim();
  if (!nm) return false;
  const sysRole = ["pekerja", "supervisor", "management"].includes(role) ? role : "pekerja";
  const details = { name: nm, email: (email || "").trim(), role: sysRole,
    roleDesc: (roleDesc || "").trim() || ROLE_LABEL_ID[sysRole],
    shift: SHIFTS.includes(shift) ? shift : "Pagi" };
  if (window.ntSession?.get()) {
    return _persistMembers(() => window.ntCompany.addMember(details));
  }
  const member = { ...details, id: "demo-" + Date.now().toString(36) + Math.random().toString(36).slice(2) };
  const worker = workerFromMember(member, WORKERS.length);
  WORKERS.push(worker); WORKERS_BY_ID[worker.id] = worker;
  window.dispatchEvent(new CustomEvent("nt-data"));
  return true;
};

const ntRemoveWorker = async (id) => {
  const session = window.ntSession?.get();
  if (session) {
    if (id === session.memberId) throw new Error("Akun yang sedang digunakan tidak dapat dihapus.");
    return _persistMembers(() => window.ntCompany.removeMember(id));
  }
  const index = WORKERS.findIndex((w) => w.id === id);
  if (index < 0) return false;
  WORKERS.splice(index, 1); delete WORKERS_BY_ID[id];
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
  const cap = window.ntMuseConnected ? 3600 : NT_HISTORY_CAP;
  if (b.length > cap) b.splice(0, b.length - cap);
};

const _liveTick = () => {
  if (!window.NT_LIVE || !WORKERS.length) return;
  // When a real Muse is paired (ble-muse-dsp.js drives the values from real
  // EEG), skip the random drift here — otherwise the mock numbers would
  // fight the DSP output every tick. The DSP module writes CURRENT_WORKER +
  // ring buffer directly and dispatches its own `nt-data` event.
  if (window.ntMuseConnected || (window.ntSession?.get() && !window.NT_DEMO_DEVICE)) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  WORKERS.forEach((w) => {
    if (window.ntSession?.get() && w.id !== CURRENT_WORKER.id) return;
    w.fi        = Math.round(_clip(w.fi        + 0.06 + (Math.random() - 0.45) * 3.2, 0, 100));
    w.cli       = Math.round(_clip(w.cli       + 0.05 + (Math.random() - 0.45) * 3.2, 0, 100));
    w.hrv       = Math.round(_clip(w.hrv       - 0.04 + (Math.random() - 0.5)  * 2.4, 30, 95));
    w.ei        = Math.round(_clip(w.ei        - 0.03 + (Math.random() - 0.5)  * 3.0, 0, 100));
    w.readiness = Math.round(_clip(w.readiness - 0.04 + (Math.random() - 0.5)  * 1.4, 20, 100));
    w.status    = _statusOf(w);
    w.t         = hh + ":" + mm;
    const buf = WORKER_HISTORY[w.id] || (WORKER_HISTORY[w.id] = []);
    buf.push({
      source: "demo",
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

// Explicit real/demo modes. Real pairing failures never resume simulation.
let _deviceEpoch = 0, _devicePairing = null;
const ntDeviceStatus = () => {
  const s = window.ntMuse?.status?.() || {};
  return { connected: !!window.NT_LIVE, real: !!window.ntMuseConnected,
    battery: s.battery ?? null, name: s.name ?? null };
};
const _publishDevice = (reason) => window.dispatchEvent(new CustomEvent("nt-device", {
  detail: { ...ntDeviceStatus(), reason },
}));
window.addEventListener("nt-muse", (e) => {
  const d = e.detail || {};
  if (d.connected) {
    if (CURRENT_WORKER.id) delete WORKER_HISTORY[CURRENT_WORKER.id];
    window.ntMuseConnected = true;
    ntLiveStart();
  } else if (window.ntMuseConnected) {
    window.ntMuseConnected = false;
    ntLiveStop();
  }
  _publishDevice(d.reason);
});
const ntDeviceConnect = async (mode = "auto") => {
  if (_devicePairing !== null) throw new Error("Pairing Muse masih berlangsung.");
  if (mode !== "demo" && window.ntMuseConnected) return { ...ntDeviceStatus(), real: true };
  if (mode === "demo") {
    const disconnected = ntDeviceDisconnect();
    const token = _deviceEpoch;
    await disconnected;
    if (token !== _deviceEpoch) throw new Error("Koneksi demo dibatalkan.");
    Object.keys(WORKER_HISTORY).forEach((id) => delete WORKER_HISTORY[id]);
    window.NT_DEMO_DEVICE = true;
    ntLiveStart();
    _publishDevice();
    return { real: false };
  }
  if (!window.ntMuse?.supported()) throw new Error("Web Bluetooth tidak tersedia. Pilih Mode Demo untuk simulasi.");
  const token = ++_deviceEpoch;
  _devicePairing = token;
  window.NT_DEMO_DEVICE = false;
  ntLiveStop();
  _publishDevice();
  try {
    const info = await window.ntMuse.connect();
    if (token !== _deviceEpoch) throw new Error("Pairing Muse dibatalkan.");
    window.ntMuseConnected = true;
    ntLiveStart();
    _publishDevice();
    return { real: true, ...info };
  } catch (error) {
    if (token === _deviceEpoch) {
      window.ntMuseConnected = false;
      ntLiveStop();
      _publishDevice();
    }
    throw error;
  } finally {
    if (_devicePairing === token) _devicePairing = null;
  }
};
const ntDeviceDisconnect = () => {
  _deviceEpoch++;
  _devicePairing = null;
  window.NT_DEMO_DEVICE = false;
  window.ntMuseConnected = false;
  ntLiveStop();
  _publishDevice();
  return Promise.resolve(window.ntMuse?.disconnect()).catch((error) =>
    console.warn("[NeuroTech] disconnect:", error.message));
};
const ntResetDemoWorkers = () => {
  Object.keys(WORKER_HISTORY).forEach((id) => delete WORKER_HISTORY[id]);
  const rows = WORKERS_RAW.map((w) => ({ ...w, id: slugify(w.name) }));
  WORKERS.splice(0, WORKERS.length, ...rows);
  Object.keys(WORKERS_BY_ID).forEach((id) => delete WORKERS_BY_ID[id]);
  rows.forEach((w) => { WORKERS_BY_ID[w.id] = w; });
  Object.keys(CURRENT_WORKER).forEach((k) => delete CURRENT_WORKER[k]);
  Object.assign(CURRENT_WORKER, rows[0]);
  _workerCompany = null;
  window.dispatchEvent(new CustomEvent("nt-ai-close"));
  window.dispatchEvent(new CustomEvent("nt-data"));
};
window.addEventListener("nt-session", () => {
  ntDeviceDisconnect();
  Object.keys(WORKER_HISTORY).forEach((id) => delete WORKER_HISTORY[id]);
  if (!window.ntSession?.get()) ntResetDemoWorkers();
});
const ntLogout = async () => {
  const disconnected = ntDeviceDisconnect();
  window.ntSession?.clear();
  sessionStorage.removeItem("nt-demo");
  ntResetDemoWorkers();
  await disconnected;
  await window.ntAuth?.signOut();
};

Object.assign(window, {
  SHIFTS, SHIFT_HOURS, workerFromMember, ntApplyCompanyMembers,
  ntStartWorkerSync, ntShiftGroups, ntSetWorkerShift, ntAddWorker, ntRemoveWorker,
  ntDeviceConnect, ntDeviceDisconnect, ntDeviceStatus, ntLogout,
  ntLiveStart, ntLiveStop, ntHistory, ntPushHistory,
  NT_HISTORY_CAP, NT_LIVE_INTERVAL_MS,
});
