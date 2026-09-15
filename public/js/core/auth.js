// Autentikasi + dokumen users/{uid}.
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile,
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendEmailVerification,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const MIN_PASSWORD = 8;

export function waitForUser() {
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); });
  });
}

/** Pastikan users/{uid} ada (pengguna Google / akun lama). */
export async function ensureUserDoc(user, name) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  const data = {
    name: (name || user.displayName || (user.email || "Pengguna").split("@")[0]).slice(0, 120),
    email: user.email || "",
    companyId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return { id: user.uid, ...data };
}

export async function registerUser({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await ensureUserDoc(cred.user, name);
  try { await sendEmailVerification(cred.user, { url: location.origin + "/app" }); } catch (e) { console.warn(e); }
  return cred.user;
}

export async function loginUser({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email, { url: location.origin + "/login" });
export const resendVerification = () => sendEmailVerification(auth.currentUser, { url: location.origin + "/app" });

export async function logout() {
  await signOut(auth);
  location.href = "/login";
}

export function authErrorMessage(err) {
  const map = {
    "auth/email-already-in-use": "Email sudah terdaftar. Silakan masuk.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/weak-password": `Kata sandi terlalu lemah (minimal ${MIN_PASSWORD} karakter).`,
    "auth/password-does-not-meet-requirements": "Kata sandi belum memenuhi kebijakan keamanan.",
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Kata sandi salah.",
    "auth/user-disabled": "Akun ini dinonaktifkan.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
    "auth/network-request-failed": "Koneksi bermasalah. Periksa internet Anda.",
    "auth/popup-closed-by-user": "Jendela login ditutup sebelum selesai.",
    "auth/popup-blocked": "Popup diblokir browser. Izinkan popup lalu coba lagi.",
    "auth/cancelled-popup-request": "Permintaan login dibatalkan.",
    "auth/account-exists-with-different-credential": "Email sudah terdaftar dengan metode login lain.",
    "auth/operation-not-allowed": "Metode login ini belum diaktifkan di Firebase Console.",
    "auth/unauthorized-domain": "Domain ini belum diizinkan di Firebase Console (Authentication → Settings).",
  };
  return map[err?.code] || "Terjadi kesalahan. Coba lagi.";
}

export { onAuthStateChanged };
