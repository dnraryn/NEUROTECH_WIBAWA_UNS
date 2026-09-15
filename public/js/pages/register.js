import { registerUser, loginWithGoogle, authErrorMessage, MIN_PASSWORD } from "../core/auth.js";
import { busy, unbusy } from "../core/ui.js";

const $ = (id) => document.getElementById(id);
const show = (text, kind = "err") => { $("msg").className = "msg " + kind; $("msg").textContent = text; };

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("msg").classList.add("hidden");
  const name = $("name").value.trim();
  const password = $("password").value;
  if (name.length < 2) return show("Nama lengkap wajib diisi.");
  if (password.length < MIN_PASSWORD) return show(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
  if (password !== $("password2").value) return show("Konfirmasi kata sandi tidak sama.");

  busy($("submit"), "Mendaftarkan…");
  try {
    await registerUser({ name, email: $("email").value.trim(), password });
    location.href = "/onboarding";
  } catch (err) { show(authErrorMessage(err)); unbusy($("submit")); }
});

$("googleBtn").addEventListener("click", async (e) => {
  const el = e.currentTarget;
  $("msg").classList.add("hidden"); busy(el, "Membuka Google…");
  try { await loginWithGoogle(); location.href = "/app"; }
  catch (err) { show(authErrorMessage(err)); unbusy(el); }
});
