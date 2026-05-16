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

// history: [{ role: "user" | "model", text: string }]  →  reply text
window.ntGemini = async (history) => {
  if (!model) throw new Error("Modul AI gagal dimuat. Periksa koneksi atau setup Firebase AI Logic.");
  const contents = (history || []).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: String(m.text || "") }],
  }));
  const result = await model.generateContent({ contents });
  return result.response.text();
};

window.dispatchEvent(new Event("nt-gemini-ready"));
