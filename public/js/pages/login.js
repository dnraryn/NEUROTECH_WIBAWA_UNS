import { auth } from "../core/firebase.js";
import { loginUser, loginWithGoogle, resetPassword, authErrorMessage, onAuthStateChanged } from "../core/auth.js";
import { busy, unbusy } from "../core/ui.js";

const $ = (id) => document.getElementById(id);
const show = (el, text, kind = "err") => { el.className = "msg " + kind; el.textContent = text; };
const next = () => { location.href = "/app"; };

// sudah masuk → langsung ke aplikasi
const off = onAuthStateChanged(auth, (u) => { off(); if (u) next(); });

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("msg").classList.add("hidden");
  busy($("submit"), "Masuk…");
  try {
    await loginUser({ email: $("email").value.trim(), password: $("password").value });
    next();
  } catch (err) { show($("msg"), authErrorMessage(err)); unbusy($("submit")); }
});

$("googleBtn").addEventListener("click", async (e) => {
  const el = e.currentTarget;
  $("msg").classList.add("hidden"); busy(el, "Membuka Google…");
  try { await loginWithGoogle(); next(); }
  catch (err) { show($("msg"), authErrorMessage(err)); unbusy(el); }
});

const panel = (reset) => {
  $("loginPanel").classList.toggle("hidden", reset);
  $("resetPanel").classList.toggle("hidden", !reset);
  if (reset) { $("resetEmail").value = $("email").value; $("resetEmail").focus(); }
};
$("forgotLink").addEventListener("click", (e) => { e.preventDefault(); panel(true); });
$("backLink").addEventListener("click", (e) => { e.preventDefault(); panel(false); });

$("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  busy($("resetSubmit"), "Mengirim…");
  try {
    await resetPassword($("resetEmail").value.trim());
    // pesan netral agar tidak membocorkan email mana yang terdaftar
    show($("resetMsg"), "Jika email tersebut terdaftar, tautan pengaturan ulang telah dikirim. Periksa kotak masuk & folder spam.", "ok");
  } catch (err) {
    if (err.code === "auth/user-not-found") show($("resetMsg"), "Jika email tersebut terdaftar, tautan pengaturan ulang telah dikirim.", "ok");
    else show($("resetMsg"), authErrorMessage(err));
  }
  unbusy($("resetSubmit"));
});
