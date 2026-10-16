// Firebase AI Logic (Gemini), modular ES module.
// Kept separate from the compat SDK (firebase-init.js) used by the rest of the
// app. Exposes window.ntGemini(history) so the Ask AI chat (ask-ai.jsx) can
// call Gemini through the App Check protected Firebase AI gateway.
//
// Setup required once in the Firebase Console:
//   Build → AI Logic → Get started → pilih "Gemini Developer API".
// That enables the API; no key needs to be pasted anywhere.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken }
  from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js";
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
  "jawab singkat lalu arahkan kembali ke penggunaan NeuroTech. " +
  "Indeks EEG aplikasi adalah heuristik prototipe; hasil parsial atau sementara bukan diagnosis. " +
  "Jangan mengarang nilai, tren, durasi, kualitas sensor, atau menyatakan pengguna aman bekerja. " +
  "Jika metrik belum tersedia, jelaskan keterbatasannya. Sleep debt berasal dari laporan mandiri. " +
  "Jawab maksimal tiga paragraf pendek dan saran yang sesuai data.";

let model = null, appCheck = null;
try {
  // A separate, named app instance so it never clashes with the compat default app.
  const app = initializeApp(firebaseConfig, "nt-ai");
  if (!window.NT_APP_CHECK_SITE_KEY) throw new Error("App Check belum dikonfigurasi.");
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(window.NT_APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: { temperature: 0.35, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
  }, { timeout: 25000 });
  console.info("[NeuroTech] Gemini siap.");
} catch (e) {
  window.ntAIInitializationError = typeof e.code === "string" ? e.code : e.name || "Error";
  console.warn("[NeuroTech] Modul AI belum siap.");
}

// Build a one-shot context snippet from the logged-in worker's current
// indices. Prepended as an initial user/model exchange so Gemini answers
// personally ("CLI kamu 88 sekarang, lebih tinggi dari biasanya — coba…").
function buildWorkerContext() {
  const live = window.ntManagement?.snapshot({ now: Date.now(), device: window.ntMuse?.status?.() || {}, dsp: window.ntMuseDSP || {} });
  const latest = live?.latest;
  const context = { signal: live?.message || "Belum ada data Muse", indices: latest ? {
    fi: latest.fi, cli: latest.cli, ei: latest.ei, quality: latest.qualityLevel,
    outputScope: latest.outputScope, provisional: latest.classificationProvisional,
  } : null };
  const metrics = window.ntSessionMetrics?.get?.();
  if (metrics) context.personalRecord = { sleepHours: metrics.sleptHours, sleepTargetHours: metrics.sleepTargetHours,
    sleepDebtHours: metrics.sleepDebt, monitoringMinutes: Math.round(metrics.receivedMinutes * 10) / 10,
    monitoringTargetMinutes: metrics.targetMinutes, source: "Laporan tidur mandiri dan hitungan paket EEG di browser" };
  return "Data aplikasi saat ini (nilai null berarti belum tersedia; tanpa identitas pengguna): " + JSON.stringify(context);
}

function bounded(promise, milliseconds) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Permintaan AI melewati batas waktu. Coba lagi.")), milliseconds); })])
    .finally(() => clearTimeout(timer));
}

// history: [{ role: "user" | "model", text: string }]  →  reply text
window.ntGemini = async (history) => {
  if (window.NT_FIREBASE?.emulators) throw new Error("AI cloud dinonaktifkan selama pengujian emulator lokal.");
  if (!model) throw new Error("Modul AI gagal dimuat. Periksa koneksi atau setup Firebase AI Logic.");
  await bounded(getToken(appCheck, false), 15000);
  const contents = [];
  const ctx = buildWorkerContext();
  if (ctx) {
    contents.push({ role: "user",  parts: [{ text: ctx }] });
    contents.push({ role: "model", parts: [{ text: "Catatan kondisi tercatat. Silakan tanyakan apa pun." }] });
  }
  (history || []).filter((m) => !m.error && ["user", "model"].includes(m.role) && typeof m.text === "string" && m.text.trim()).slice(-20).forEach((m) => {
    const role = m.role, text = m.text.slice(0, 3000), previous = contents[contents.length - 1];
    if (previous?.role === role) previous.parts.push({ text });
    else contents.push({ role, parts: [{ text }] });
  });
  const result = await bounded(model.generateContent({ contents }), 30000);
  const text = result.response.text().trim();
  if (!text) throw new Error("AI belum menghasilkan jawaban. Coba pertanyaan yang lebih singkat.");
  return text;
};

// One-shot weekly insight from the in-memory ring buffer (mock-data.jsx).
// Returns a single supportive Bahasa Indonesia sentence summarising the
// last ≤60 ticks for the logged-in worker. Used by WorkerStats.
window.ntInsightMingguan = async () => {
  return window.ntGemini([{ role: "user", text: "Ringkas kondisi sesi saat ini dalam dua kalimat singkat. Jelaskan keterbatasan data dan satu langkah berikutnya. Jangan menyebut tren mingguan jika datanya tidak ada." }]);
};

window.dispatchEvent(new Event("nt-gemini-ready"));
