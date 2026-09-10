// Firebase AI Logic (Gemini), modular ES module.
// Kept separate from the compat SDK (firebase-init.js) used by the rest of the
// app. Exposes window.ntGemini(history) so the Ask AI chat (ask-ai.jsx) can
// call Gemini without any API key in the page source.
//
// Setup required once in the Firebase Console:
//   Build → AI Logic → Get started → pilih "Gemini Developer API".
// That enables the API; no key needs to be pasted anywhere.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend }
  from "https://www.gstatic.com/firebasejs/12.0.0/firebase-ai.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5dOpEcjs5YJNOIZpYD_hNQ1vAcv2l3pk",
  authDomain: "neurotech-id.firebaseapp.com",
  projectId: "neurotech-id",
  storageBucket: "neurotech-id.firebasestorage.app",
  messagingSenderId: "253850697669",
  appId: "1:253850697669:web:85be4262d92cca81e995ac",
};

const SYSTEM_INSTRUCTION =
  "Kamu adalah asisten NeuroTech, sistem monitoring kelelahan mental (fatigue), " +
  "beban kognitif (cognitive load), dan keselamatan & kesehatan kerja (K3) berbasis " +
  "headband EEG Muse. Jawab dalam Bahasa Indonesia yang ringkas, jelas, dan ramah. " +
  "Bantu pengguna soal fatigue, microsleep, cognitive load, kesiapan kerja pra-shift, " +
  "penggunaan aplikasi NeuroTech, dan praktik K3. Jika ditanya hal di luar topik itu, " +
  "jawab singkat lalu arahkan kembali ke topik kesehatan dan keselamatan kerja.";

let model = null;
try {
  // A separate, named app instance so it never clashes with the compat default app.
  const app = initializeApp(firebaseConfig, "nt-ai");
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });
  console.info("[NeuroTech] Gemini siap.");
} catch (e) {
  console.error("[NeuroTech] Inisialisasi Gemini gagal:", e);
}

// Build a one-shot context snippet from the logged-in worker's current
// indices. Prepended as an initial user/model exchange so Gemini answers
// personally ("CLI kamu 88 sekarang, lebih tinggi dari biasanya — coba…").
function buildWorkerContext() {
  const w = window.CURRENT_WORKER;
  if (!w || !w.name) return null;
  const lines = ["Konteks pengguna saat ini (gunakan untuk menjawab personal, nada non-punitif):"];
  if (w.name)             lines.push("- Nama: " + w.name);
  if (w.role)             lines.push("- Posisi: " + w.role);
  if (w.shift)            lines.push("- Shift: " + w.shift);
  if (typeof w.fi === "number")        lines.push("- Fatigue Index (FI): " + w.fi + "/100");
  if (typeof w.cli === "number")       lines.push("- Cognitive Load (CLI): " + w.cli + "/100");
  if (typeof w.ei === "number")        lines.push("- Engagement Index (EI): " + w.ei + "/100");
  if (typeof w.hrv === "number")       lines.push("- HRV: " + w.hrv + " ms");
  if (typeof w.readiness === "number") lines.push("- Readiness pra-shift: " + w.readiness + "/100");
  if (typeof window.stressOf === "function") {
    const s = window.stressOf(w);
    if (typeof s === "number") lines.push("- Tingkat stres: " + s + "/100");
  }
  if (w.status)           lines.push("- Status saat ini: " + w.status);
  if (w.microsleep)       lines.push("- Microsleep terdeteksi pada shift berjalan.");
  return lines.join("\n");
}

// history: [{ role: "user" | "model", text: string }]  →  reply text
window.ntGemini = async (history) => {
  if (!model) throw new Error("Modul AI gagal dimuat. Periksa koneksi atau setup Firebase AI Logic.");
  const contents = [];
  const ctx = buildWorkerContext();
  if (ctx) {
    contents.push({ role: "user",  parts: [{ text: ctx }] });
    contents.push({ role: "model", parts: [{ text: "Catatan kondisi tercatat. Silakan tanyakan apa pun." }] });
  }
  (history || []).forEach((m) => {
    contents.push({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: String(m.text || "") }],
    });
  });
  const result = await model.generateContent({ contents });
  return result.response.text();
};

// One-shot weekly insight from the in-memory ring buffer (mock-data.jsx).
// Returns a single supportive Bahasa Indonesia sentence summarising the
// last ≤60 ticks for the logged-in worker. Used by WorkerStats.
window.ntInsightMingguan = async () => {
  if (!model) return null;
  const w = window.CURRENT_WORKER;
  const hist = (w && w.id && typeof window.ntHistory === "function") ? window.ntHistory(w.id) : [];
  if (!hist.length) return "Belum ada cukup data untuk diringkas. Pakai aplikasi sebentar lagi, ya.";
  const avg = (k) => Math.round(hist.reduce((s, h) => s + (h[k] || 0), 0) / hist.length);
  const ms  = hist.filter((h) => h.microsleep).length;
  const trendFi = hist.length >= 4
    ? (hist[hist.length - 1].fi - hist[0].fi) / (hist.length - 1)
    : 0;
  const summary = "Ringkas pola berikut menjadi SATU kalimat (max 28 kata) Bahasa Indonesia, " +
    "ramah dan non-punitif, fokus pada saran konkret untuk pekerja shift. " +
    "Pengguna: " + (w.name || "—") + ". " +
    "Selama " + hist.length + " titik terakhir: " +
    "FI rerata " + avg("fi") + ", CLI rerata " + avg("cli") + ", " +
    "HRV rerata " + avg("hrv") + ", EI rerata " + avg("ei") + ", " +
    "microsleep " + ms + " kali, " +
    "tren FI " + (trendFi > 0.2 ? "menanjak" : trendFi < -0.2 ? "menurun" : "stabil") + ".";
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: summary }] }],
  });
  return result.response.text();
};

window.dispatchEvent(new Event("nt-gemini-ready"));
