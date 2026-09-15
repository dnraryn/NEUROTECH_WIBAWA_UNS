/* ============================================================
   muse.js — Streaming EEG NYATA dari headband Muse S / Muse 2
   lewat Web Bluetooth (tanpa aplikasi native).
   ------------------------------------------------------------
   • Membaca 4 kanal EEG (TP9, AF7, AF8, TP10) @256 Hz
   • Akselerometer (deteksi anggukan kepala / head-nod)
   • PPG (Muse S/2) untuk estimasi HR/HRV
   • FFT 256-titik → band power (delta..gamma)
   • Memberi makan Analyzer (eeg-engine.js) → reading K3
   Protokol BLE mengikuti implementasi muse-js yang sudah teruji.
   Catatan: Web Bluetooth hanya di Chrome/Edge (desktop & Android),
   pada konteks aman (https atau localhost).
   ============================================================ */
import { Analyzer } from "./eeg-engine.js";

const SERVICE = "0000fe8d-0000-1000-8000-00805f9b34fb";
const CHAR = {
  control: "273e0001-4c4d-454d-96be-f03bcb15c4f8",
  gyro:    "273e0009-4c4d-454d-96be-f03bcb15c4f8",
  accel:   "273e000a-4c4d-454d-96be-f03bcb15c4f8",
  tp9:     "273e0003-4c4d-454d-96be-f03bcb15c4f8",
  af7:     "273e0004-4c4d-454d-96be-f03bcb15c4f8",
  af8:     "273e0005-4c4d-454d-96be-f03bcb15c4f8",
  tp10:    "273e0006-4c4d-454d-96be-f03bcb15c4f8",
  ppg1:    "273e000f-4c4d-454d-96be-f03bcb15c4f8", // ambient
  ppg2:    "273e0010-4c4d-454d-96be-f03bcb15c4f8", // infrared (untuk HR)
  ppg3:    "273e0011-4c4d-454d-96be-f03bcb15c4f8", // red
};

const EEG_SR = 256, FFT_N = 256, ACC_SCALE = 0.0000610352, PPG_SR = 64;

export const museSupported = () => typeof navigator !== "undefined" && !!navigator.bluetooth;

/* ---------- util DSP ---------- */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi;
        re[a] += vr; im[a] += vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

// band power dari satu buffer EEG (>=256 sampel µV)
function bandPower(buf) {
  if (buf.length < FFT_N) return null;
  const seg = buf.slice(buf.length - FFT_N);
  let mean = 0; for (const v of seg) mean += v; mean /= FFT_N;
  const re = new Float64Array(FFT_N), im = new Float64Array(FFT_N);
  for (let i = 0; i < FFT_N; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_N - 1)); // Hann
    re[i] = (seg[i] - mean) * w;
  }
  fft(re, im);
  const psd = new Float64Array(FFT_N / 2 + 1);
  for (let k = 0; k <= FFT_N / 2; k++) psd[k] = re[k] * re[k] + im[k] * im[k];
  const sum = (lo, hi) => { let s = 0; for (let k = lo; k <= hi; k++) s += psd[k]; return s; };
  // resolusi 1 Hz/bin (256 Hz / 256)
  return { delta: sum(1, 3), theta: sum(4, 7), alpha: sum(8, 12), beta: sum(13, 29), gamma: sum(30, 44) };
}

const avgBands = (a, b) => {
  if (!a && !b) return null; if (!a) return b; if (!b) return a;
  return { delta: (a.delta + b.delta) / 2, theta: (a.theta + b.theta) / 2,
    alpha: (a.alpha + b.alpha) / 2, beta: (a.beta + b.beta) / 2, gamma: (a.gamma + b.gamma) / 2 };
};

export class MuseStream {
  constructor({ readiness = 80 } = {}) {
    this.analyzer = new Analyzer({ readiness });
    this.device = null; this.server = null; this.control = null;
    this.connected = false; this.hasPpg = false;
    this.buf = { tp9: [], af7: [], af8: [], tp10: [] };
    this.accMag = [];          // magnitudo akselerometer terbaru
    this.ppg = [];             // kanal IR untuk HR
    this.onStatus = () => {};
    this.onDisconnect = () => {};
    this.onReading = null; this.loop = null;
    this.lastEegAt = 0;
  }

  /* ---------- koneksi ---------- */
  async connect() {
    if (!museSupported()) throw new Error("no-bluetooth");
    this.onStatus("Memindai perangkat Muse…");
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "Muse" }],
      optionalServices: [SERVICE],
    });
    this.device.addEventListener("gattserverdisconnected", () => {
      this.connected = false;
      this._clearBuffers();          // jangan proses data basi setelah terputus
      this.onStatus("Muse terputus.");
      this.onDisconnect();
    });
    return this._setup();
  }

  /* sambung ulang ke perangkat yang sama (tanpa dialog pemilihan) */
  async reconnect() {
    if (!this.device) throw new Error("no-device");
    return this._setup();
  }

  _clearBuffers() {
    this.buf = { tp9: [], af7: [], af8: [], tp10: [] };
    this.accMag = []; this.ppg = []; this.lastEegAt = 0;
  }

  async _setup() {
    this._clearBuffers();
    this.onStatus("Menghubungkan…");
    this.server = await this.device.gatt.connect();
    const svc = await this.server.getPrimaryService(SERVICE);
    this.control = await svc.getCharacteristic(CHAR.control);

    // EEG
    await this._sub(svc, CHAR.tp9, (d) => this._eeg("tp9", d));
    await this._sub(svc, CHAR.af7, (d) => this._eeg("af7", d));
    await this._sub(svc, CHAR.af8, (d) => this._eeg("af8", d));
    await this._sub(svc, CHAR.tp10, (d) => this._eeg("tp10", d));
    // Akselerometer
    try { await this._sub(svc, CHAR.accel, (d) => this._accel(d)); } catch (e) { /* opsional */ }
    // PPG (Muse S/2)
    try {
      await this._sub(svc, CHAR.ppg2, (d) => this._ppgSample(d));
      this.hasPpg = true;
    } catch (e) { this.hasPpg = false; }

    // urutan perintah start
    await this._send("h");                       // halt
    await this._send(this.hasPpg ? "p50" : "p21"); // preset (p50 = + PPG)
    await this._send("s");                       // status
    await this._send("d");                       // start streaming
    this.connected = true;
    this.onStatus(`Terhubung${this.hasPpg ? " · PPG aktif" : ""}. Menstabilkan sinyal…`);
    return { name: this.device.name || "Muse", hasPpg: this.hasPpg };
  }

  async _sub(svc, uuid, cb) {
    const ch = await svc.getCharacteristic(uuid);
    await ch.startNotifications();
    ch.addEventListener("characteristicvaluechanged", (e) => cb(e.target.value));
    return ch;
  }

  _send(cmd) {
    const enc = new TextEncoder().encode(`X${cmd}\n`);
    enc[0] = enc.length - 1; // panjang payload
    return this.control.writeValue(enc).catch(() =>
      this.control.writeValueWithoutResponse && this.control.writeValueWithoutResponse(enc));
  }

  /* ---------- decode ---------- */
  _eeg(ch, dv) {
    // 2 byte index + 12 sampel 12-bit (18 byte)
    const out = [];
    let bitBuf = 0, bits = 0, idx = 2;
    for (let i = 0; i < 12; i++) {
      while (bits < 12) { bitBuf = (bitBuf << 8) | dv.getUint8(idx++); bits += 8; }
      bits -= 12;
      const raw = (bitBuf >> bits) & 0xfff;
      out.push((raw - 0x800) * 0.48828125); // µV
    }
    const b = this.buf[ch];
    b.push(...out);
    this.lastEegAt = Date.now();
    if (b.length > EEG_SR * 3) b.splice(0, b.length - EEG_SR * 3);
  }

  _accel(dv) {
    // index + 3 sampel × 3 sumbu int16 (big-endian)
    for (let s = 0; s < 3; s++) {
      const o = 2 + s * 6;
      const x = ACC_SCALE * dv.getInt16(o), y = ACC_SCALE * dv.getInt16(o + 2), z = ACC_SCALE * dv.getInt16(o + 4);
      this.accMag.push(Math.sqrt(x * x + y * y + z * z));
    }
    if (this.accMag.length > 64) this.accMag.splice(0, this.accMag.length - 64);
  }

  _ppgSample(dv) {
    for (let i = 0; i < 6; i++) {
      const o = 2 + i * 3;
      this.ppg.push((dv.getUint8(o) << 16) | (dv.getUint8(o + 1) << 8) | dv.getUint8(o + 2));
    }
    if (this.ppg.length > PPG_SR * 12) this.ppg.splice(0, this.ppg.length - PPG_SR * 12);
  }

  /* ---------- fitur turunan ---------- */
  // band power frontal (AF7+AF8) — relevan utk fatigue & cognitive load
  _frontalBands() {
    return avgBands(bandPower(this.buf.af7), bandPower(this.buf.af8));
  }

  // skor anggukan kepala 0..1 (jerk akselerometer)
  _nod() {
    if (this.accMag.length < 8) return 0;
    const w = this.accMag.slice(-16);
    const jerk = Math.max(...w) - Math.min(...w);
    return Math.min(1, jerk / 0.45);
  }

  // kualitas sinyal kasar 0..1 dari amplitudo AF7/AF8
  signalQuality() {
    const q = (b) => {
      if (b.length < 64) return 0;
      const w = b.slice(-128); let mean = 0; for (const v of w) mean += v; mean /= w.length;
      let varr = 0; for (const v of w) varr += (v - mean) ** 2; varr /= w.length;
      const sd = Math.sqrt(varr);
      // sinyal baik: SD wajar (≈ 5–60 µV). Flat (≈0) atau gergaji besar = buruk.
      if (sd < 1.5 || sd > 180) return 0.2;
      return 1;
    };
    return Math.min(q(this.buf.af7), q(this.buf.af8));
  }

  // HR/HRV dari PPG IR (estimasi best-effort; null jika sinyal kurang)
  _hrv() {
    if (!this.hasPpg || this.ppg.length < PPG_SR * 6) return null;
    const sig = this.ppg.slice(-PPG_SR * 8);
    // detrend dgn moving average ~0.75s
    const win = Math.round(PPG_SR * 0.75);
    const det = sig.map((v, i) => {
      let s = 0, c = 0;
      for (let k = Math.max(0, i - win); k <= Math.min(sig.length - 1, i + win); k++) { s += sig[k]; c++; }
      return v - s / c;
    });
    // deteksi puncak (jarak min 0.4s)
    const minDist = Math.round(PPG_SR * 0.4);
    const sd = Math.sqrt(det.reduce((a, v) => a + v * v, 0) / det.length);
    const thr = sd * 0.6;
    const peaks = [];
    for (let i = 1; i < det.length - 1; i++) {
      if (det[i] > thr && det[i] > det[i - 1] && det[i] >= det[i + 1]) {
        if (!peaks.length || i - peaks[peaks.length - 1] >= minDist) peaks.push(i);
      }
    }
    if (peaks.length < 4) return null;
    const ibis = [];
    for (let i = 1; i < peaks.length; i++) {
      const ms = (peaks[i] - peaks[i - 1]) * (1000 / PPG_SR);
      if (ms > 300 && ms < 1500) ibis.push(ms);
    }
    if (ibis.length < 3) return null;
    let sq = 0; for (let i = 1; i < ibis.length; i++) sq += (ibis[i] - ibis[i - 1]) ** 2;
    const rmssd = Math.sqrt(sq / (ibis.length - 1));
    // map RMSSD (8–70 ms) → skor HRV (25–95)
    return Math.max(25, Math.min(95, 25 + ((rmssd - 8) / (70 - 8)) * 70));
  }

  /* ---------- kalibrasi & monitoring ---------- */
  // data dianggap segar bila paket EEG terakhir < 2 detik
  isFresh() { return this.connected && Date.now() - this.lastEegAt < 2000; }

  // kumpulkan band power tenang selama `seconds` → baseline personal.
  // Sampel dengan sinyal buruk dilewati; gagal bila < 50% sampel valid.
  async calibrate(seconds = 180, onProgress = () => {}, isCancelled = () => false) {
    const list = [];
    for (let i = 0; i < seconds; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (isCancelled()) throw new Error("calibration-cancelled");
      if (this.isFresh() && this.signalQuality() >= 0.5) {
        const b = this._frontalBands();
        if (b) list.push(b);
      }
      onProgress(Math.round(((i + 1) / seconds) * 100), list.length);
    }
    if (list.length < seconds * 0.5) throw new Error("calibration-poor-signal");
    return this.analyzer.calibrateFrom(list);
  }

  // mulai memproduksi reading tiap detik; onStale dipanggil bila data tidak segar
  start(onReading, onStale = () => {}) {
    this.onReading = onReading;
    if (this.loop) clearInterval(this.loop);
    this.loop = setInterval(() => {
      if (!this.isFresh()) { onStale(); return; }
      const bands = this._frontalBands();
      if (!bands) return; // buffer belum penuh
      const reading = this.analyzer.process(bands, { nod: this._nod(), hrvReal: this._hrv() });
      reading.signal = this.signalQuality();
      onReading(reading);
    }, 1000);
  }

  stop() { if (this.loop) clearInterval(this.loop); this.loop = null; }

  // sampel AF7 terbaru utk grafik (sparkline)
  rawAF7(n = FFT_N) { return this.buf.af7.slice(-n); }

  disconnect() {
    this.stop();
    try { if (this.device?.gatt?.connected) this.device.gatt.disconnect(); } catch (e) {}
    this.connected = false;
  }
}
