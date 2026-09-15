// Onboarding: gabung perusahaan dengan kode (pending) atau daftarkan perusahaan (admin).
import { db } from "../core/firebase.js";
import { waitForUser, logout } from "../core/auth.js";
import { loadContext } from "../core/context.js";
import { logInBatch } from "../core/audit.js";
import { SECTORS } from "../core/roles.js";
import { randomCode, normalizeCode } from "../core/code.js";
import { busy, unbusy, errorMessage, mount, options, html } from "../core/ui.js";
import {
  doc, collection, getDoc, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const show = (text, kind = "err") => { $("msg").className = "msg " + kind; $("msg").textContent = text; };

let mode = "join", user = null;

mount($("sector"), html`${options(SECTORS, "Manufaktur")}`);
$("logoutLink").addEventListener("click", (e) => { e.preventDefault(); logout(); });

$("seg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  mode = b.dataset.mode;
  $("seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
  $("joinFields").classList.toggle("hidden", mode !== "join");
  $("createFields").classList.toggle("hidden", mode !== "create");
  $("submit").textContent = mode === "join" ? "Kirim permintaan bergabung" : "Daftarkan perusahaan";
  $("msg").classList.add("hidden");
});

(async function init() {
  user = await waitForUser();
  if (!user) { location.href = "/login"; return; }
  try {
    const ctx = await loadContext(user);
    if (ctx.state !== "no-company") { location.href = "/app"; return; }
    $("fullname").value = ctx.profile.name || user.displayName || "";
    $("hello").textContent = `Masuk sebagai ${user.email}. Hubungkan akun Anda dengan perusahaan.`;
    const code = new URLSearchParams(location.search).get("kode");
    if (code) $("code").value = normalizeCode(code);
    $("form").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    $("hello").textContent = "";
    show(errorMessage(err));
  }
})();

async function joinCompany({ name, position }) {
  const code = normalizeCode($("code").value);
  if (code.length !== 8) throw new Error("Kode undangan terdiri dari 8 karakter.");
  const codeSnap = await getDoc(doc(db, "companyCodes", code));
  if (!codeSnap.exists()) throw new Error("Kode undangan tidak valid atau sudah diganti. Minta kode terbaru ke admin.");
  const companyId = codeSnap.data().companyId;

  const batch = writeBatch(db);
  batch.set(doc(db, "companies", companyId, "members", user.uid), {
    uid: user.uid, name, email: user.email || "", role: "pekerja", status: "pending",
    position, department: "", shift: "", joinCode: code,
    joinedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", user.uid), { name, companyId, updatedAt: serverTimestamp() });
  logInBatch(batch, companyId, { uid: user.uid, name }, {
    action: "member.request", entity: "member", entityId: user.uid, summary: `${name} mengajukan bergabung`,
  });
  await batch.commit();
}

async function createCompany({ name, position }) {
  const companyName = $("company").value.trim();
  if (companyName.length < 2) throw new Error("Nama perusahaan wajib diisi.");
  const companyId = doc(collection(db, "companies")).id;

  // Tabrakan kode ditolak rules (companyCodes hanya bisa di-create) → coba kode lain.
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = randomCode();
    const batch = writeBatch(db);
    batch.set(doc(db, "companies", companyId), {
      name: companyName, sector: $("sector").value, address: $("address").value.trim(),
      code, ownerUid: user.uid,
      settings: { calibrationMin: 3, allowSimulation: true },
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "companyCodes", code), { companyId, createdAt: serverTimestamp() });
    batch.set(doc(db, "companies", companyId, "members", user.uid), {
      uid: user.uid, name, email: user.email || "", role: "admin", status: "active",
      position, department: "", shift: "", joinedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      approvedBy: user.uid,
    });
    batch.update(doc(db, "users", user.uid), { name, companyId, updatedAt: serverTimestamp() });
    logInBatch(batch, companyId, { uid: user.uid, name }, {
      action: "company.create", entity: "company", entityId: companyId, summary: `Perusahaan "${companyName}" didaftarkan`,
    });
    try { await batch.commit(); return; }
    catch (err) { lastErr = err; if (err.code !== "permission-denied") throw err; }
  }
  throw lastErr;
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("msg").classList.add("hidden");
  const name = $("fullname").value.trim();
  const position = $("position").value.trim();
  if (name.length < 2) return show("Nama lengkap wajib diisi.");

  busy($("submit"));
  try {
    if (mode === "join") await joinCompany({ name, position });
    else await createCompany({ name, position });
    location.href = "/app";
  } catch (err) {
    console.error(err);
    show(err.code ? errorMessage(err) : err.message);
    unbusy($("submit"));
  }
});
