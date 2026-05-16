// Shared mock data, used by both list and detail pages so drill-downs find
// the record they navigated to. Keyed by URL-safe slug.

const slugify = (s) => s.toLowerCase().replace(/[.\s]+/g, "-").replace(/[^a-z0-9-]/g, "");

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
  { id: "a-1142", t: "11:42", date: "14 Mei 2026", title: "Microsleep terdeteksi",      worker: "rizky-a",   workerName: "Rizky A.",   detail: "Anggukan kepala 2.3 s + EI drop 41% selama 8 detik.", status: "kritis",   action: null },
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

// Mock current logged-in worker (used by mobile screens that show "Rizky A.")
const CURRENT_WORKER = WORKERS_BY_ID["rizky-a"];

Object.assign(window, {
  slugify,
  WORKERS, WORKERS_BY_ID,
  ALERTS,  ALERTS_BY_ID,
  SCHEDULE,
  REPORTS, REPORTS_BY_ID,
  CURRENT_WORKER,
});

// ── Live worker data from Firestore ───────────────────────────────────────
// The rows above are the offline fallback. Once a user is signed in, App.jsx
// calls ntStartWorkerSync(): we subscribe to the `workers` collection and
// replace the rows IN PLACE (same array/object identities) so every screen
// picks them up on its next render, no per-screen rewrite needed.
let _workerUnsub = null;

const applyWorkerRows = (rows) => {
  WORKERS.splice(0, WORKERS.length, ...rows);
  Object.keys(WORKERS_BY_ID).forEach((k) => delete WORKERS_BY_ID[k]);
  rows.forEach((w) => { WORKERS_BY_ID[w.id] = w; });
  const cur = WORKERS_BY_ID["rizky-a"] || rows[0];
  if (cur) Object.assign(CURRENT_WORKER, cur);
  window.dispatchEvent(new CustomEvent("nt-data"));
};

const ntStartWorkerSync = () => {
  if (_workerUnsub || !window.ntWorkers) return;
  _workerUnsub = window.ntWorkers.subscribe((rows) => {
    if (rows.length) applyWorkerRows(rows);   // empty collection → keep the mock rows
  });
};

const ntStopWorkerSync = () => {
  if (_workerUnsub) { _workerUnsub(); _workerUnsub = null; }
};

// One-time seed helper, run once from the browser console while signed in:
//   await ntSeedWorkers()
const ntSeedWorkers = async () => {
  if (!window.ntWorkers) throw new Error("Firebase belum siap.");
  const rows = WORKERS_RAW.map((w) => ({ ...w, id: slugify(w.name) }));
  const n = await window.ntWorkers.seed(rows);
  console.info(`[NeuroTech] ${n} pekerja ter-upload ke Firestore.`);
  return n;
};

Object.assign(window, { ntStartWorkerSync, ntStopWorkerSync, ntSeedWorkers });
