// Inisialisasi Firebase (modular SDK via CDN) — dipakai semua halaman.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7x4cyldJerkQ3kMdA7A0iZXk4vG4KbCI",
  authDomain: "neuro-tech.firebaseapp.com",
  projectId: "neuro-tech",
  storageBucket: "neuro-tech.firebasestorage.app",
  messagingSenderId: "349074445082",
  appId: "1:349074445082:web:caf53e4c60ceb9049112a3",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Pengembangan lokal dengan Firebase Emulator Suite:
// buka http://127.0.0.1:5000/?emulator=1 sekali (tersimpan), ?emulator=0 untuk mematikan.
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
if (LOCAL) {
  const q = new URLSearchParams(location.search).get("emulator");
  if (q === "1") localStorage.setItem("nt_emulator", "1");
  if (q === "0") localStorage.removeItem("nt_emulator");
}
export const USING_EMULATOR = LOCAL && localStorage.getItem("nt_emulator") === "1";
if (USING_EMULATOR) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
