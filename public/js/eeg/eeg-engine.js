/* ============================================================
   eeg-engine.js — NeuroTech cognitive monitoring engine
   ------------------------------------------------------------
   Logika indeks K3 ada di SATU tempat (scoreBands / classify /
   microsleep) dan dipakai oleh DUA sumber data:
     1) BrainSimulator  — simulasi (demo / fallback)
     2) Analyzer        — dipakai stream EEG NYATA dari Muse S
                          (lihat muse.js)
   band power (delta..gamma) → 6 indeks K3 (0–100)
   → klasifikasi status → deteksi microsleep.
   ============================================================ */

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const mapScore = (raw, inLo, inHi, outLo = 0, outHi = 100) =>
  clamp(outLo + ((raw - inLo) / (inHi - inLo)) * (outHi - outLo));

export const STATUS = ["normal", "waspada", "berisiko", "kritis"];
export const STATUS_LABEL = {
  normal: "Normal", waspada: "Waspada", berisiko: "Berisiko", kritis: "Kritis",
};

/* Normalisasi band power → fraksi relatif (scale-invariant). */
export function relativeBands(b) {
  const sum = (b.delta + b.theta + b.alpha + b.beta + b.gamma) || 1;
  return {
    delta: b.delta / sum, theta: b.theta / sum, alpha: b.alpha / sum,
    beta: b.beta / sum, gamma: b.gamma / sum,
  };
}

/* Tiga indeks berbasis EEG dari band relatif (rumus proposal). */
export function scoreBands(rb) {
  const beta = Math.max(rb.beta, 1e-4);
  const fiRaw = (rb.theta + rb.alpha) / beta;          // Fatigue Index
  const cliRaw = rb.theta;                             // Cognitive Load (theta frontal)
  const eiRaw = beta / (rb.alpha + rb.theta + 1e-4);   // Engagement Index
  return {
    fi: Math.round(mapScore(fiRaw, 0.9, 5.0)),
    cli: Math.round(mapScore(cliRaw, 0.16, 0.42)),
    ei: Math.round(mapScore(eiRaw, 0.18, 0.95)),
  };
}

export const computeStress = (cli, hrv) => Math.round(clamp(0.6 * cli + 0.4 * (100 - hrv)));

/* Deteksi microsleep: pola EEG kantuk + (penurunan tajam EI ATAU anggukan kepala).
   Satu episode dihitung sekali: setelah terdeteksi ada masa refrakter, agar kantuk
   berkepanjangan tidak tercatat sebagai puluhan microsleep per menit. */
export const MICROSLEEP_REFRACTORY_MS = 15_000;
export function detectMicrosleep(state, idx, { nod = 0, now = Date.now() } = {}) {
  const drowsyEEG = idx.fi > 70 && idx.ei < 30;
  const eiDrop = state.eiPrev - idx.ei > 22;
  state.eiPrev = idx.ei;
  if (!(drowsyEEG && (eiDrop || nod > 0.6))) return false;
  if (state.lastMicrosleepAt && now - state.lastMicrosleepAt < MICROSLEEP_REFRACTORY_MS) return false;
  state.lastMicrosleepAt = now;
  return true;
}

/* Klasifikasi status terhadap baseline personal. */
export function classifyStatus(idx, baseline, microsleep) {
  if (microsleep) return "kritis";
  const baseFi = baseline ? baseline.fi : 30;
  const over = idx.fi - baseFi;
  let lvl = 0;
  if (over >= 12 || idx.ei < 45 || idx.stress >= 65) lvl = 1;
  if (over >= 26 || idx.ei < 32 || idx.stress >= 78) lvl = 2;
  if (over >= 40 || idx.stress >= 90) lvl = 3;
  return STATUS[lvl];
}

/* ------------------------------------------------------------
   Analyzer — menerima band power (nyata/simulasi) → reading.
   Menyimpan state lunak: HRV, readiness, EI sebelumnya, baseline.
   ------------------------------------------------------------ */
export class Analyzer {
  constructor({ readiness = 80 } = {}) {
    this.hrv = 70; this.readiness = readiness; this.eiPrev = 70; this.baseline = null;
  }

  _idx(rb, hrvReal) {
    const s = scoreBands(rb);
    if (hrvReal != null && !Number.isNaN(hrvReal)) this.hrv = hrvReal;
    else this.hrv = clamp(this.hrv + rnd(-1.2, 1.0), 28, 92);
    const hrv = Math.round(this.hrv);
    const stress = computeStress(s.cli, hrv);
    this.readiness = clamp(this.readiness - rnd(0, 0.18), 20, 100);
    return { ...s, hrv, stress, readiness: Math.round(this.readiness) };
  }

  /* bands = band power absolut/relatif; opts: {nod 0..1, hrvReal} */
  process(bands, { nod = 0, hrvReal = null } = {}) {
    const rb = relativeBands(bands);
    const idx = this._idx(rb, hrvReal);
    const microsleep = detectMicrosleep(this, idx, { nod });
    const status = classifyStatus(idx, this.baseline, microsleep);
    return { ...idx, bands: rb, microsleep, status, ts: Date.now() };
  }

  /* Kalibrasi dari kumpulan band power tenang → baseline personal. */
  calibrateFrom(listOfBands) {
    const valid = listOfBands.filter(Boolean);
    if (!valid.length) { this.baseline = { fi: 30, cli: 30, ei: 60 }; return this.baseline; }
    const acc = { fi: 0, cli: 0, ei: 0 };
    valid.forEach((b) => { const s = scoreBands(relativeBands(b)); acc.fi += s.fi; acc.cli += s.cli; acc.ei += s.ei; });
    this.baseline = {
      fi: Math.round(acc.fi / valid.length),
      cli: Math.round(acc.cli / valid.length),
      ei: Math.round(acc.ei / valid.length),
    };
    return this.baseline;
  }
}

/* ------------------------------------------------------------
   BrainSimulator — generator band power (demo/fallback).
   Public API dipertahankan: readiness, fatigue, pushFatigue,
   calibrate, tick, baseline.
   ------------------------------------------------------------ */
export class BrainSimulator {
  constructor(opts = {}) {
    this.fatigue = 0.06;
    this.an = new Analyzer({ readiness: opts.readiness ?? Math.round(rnd(62, 94)) });
  }
  get readiness() { return Math.round(this.an.readiness); }
  set readiness(v) { this.an.readiness = v; }
  get baseline() { return this.an.baseline; }

  pushFatigue(amount = 0.25) { this.fatigue = Math.min(1, this.fatigue + amount); }
  reset() { this.fatigue = 0.06; }

  _bands() {
    const a = 1 - this.fatigue;
    let beta = 0.12 + 0.20 * a + rnd(-0.02, 0.02);
    let gamma = 0.05 + 0.05 * a + rnd(-0.01, 0.01);
    let theta = 0.16 + 0.20 * this.fatigue + rnd(-0.02, 0.02);
    let alpha = 0.15 + 0.13 * this.fatigue + rnd(-0.02, 0.02);
    let delta = 0.18 + 0.10 * this.fatigue + rnd(-0.02, 0.02);
    return { delta, theta, alpha, beta, gamma };
  }

  tick({ drift = true } = {}) {
    if (drift) this.fatigue = clamp(this.fatigue + rnd(0.001, 0.006), 0, 1);
    const bands = this._bands();
    const nod = clamp(this.fatigue * this.fatigue * rnd(0, 1.4), 0, 1.2) / 1.2; // proxy anggukan
    return this.an.process(bands, { nod });
  }

  calibrate(samples = 12) {
    const saved = this.fatigue; this.fatigue = 0.06;
    const list = [];
    for (let i = 0; i < samples; i++) list.push(this._bands());
    this.fatigue = saved;
    return this.an.calibrateFrom(list);
  }
}

/* Rekomendasi tindakan berdasarkan reading. */
export function recommend(reading) {
  if (reading.microsleep)
    return { who: "Microsleep terdeteksi — hentikan aktivitas, istirahat & jauhi mesin segera.", sup: "Rotasi tugas SEGERA, jadwalkan istirahat." };
  switch (reading.status) {
    case "kritis":
      return { who: "Hentikan pekerjaan berisiko & ambil istirahat sekarang. Beri tahu supervisor.", sup: "Hentikan pekerjaan berisiko, rotasi tugas segera, evaluasi beban kerja." };
    case "berisiko":
      return { who: "Lakukan micro-break 5 menit, atur napas.", sup: "Pertimbangkan rotasi tugas atau jeda." };
    case "waspada":
      return { who: "Turunkan tempo, fokus pada satu tugas.", sup: "Pantau lebih ketat." };
    default:
      return { who: "Kondisi baik. Pertahankan ritme kerja.", sup: "Aman." };
  }
}

export const STATUS_LEVEL = { normal: 0, waspada: 1, berisiko: 2, kritis: 3 };
