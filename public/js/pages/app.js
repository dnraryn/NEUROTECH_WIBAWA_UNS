// App shell: autentikasi → konteks → (pending | disabled | aplikasi berbasis peran).
import { db, USING_EMULATOR } from "../core/firebase.js";
import { waitForUser, logout, resendVerification } from "../core/auth.js";
import { loadContext } from "../core/context.js";
import { ROUTES } from "../core/nav.js";
import { startRouter } from "../core/router.js";
import { roleLabel } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { html, mount, icon, toast, busy, unbusy, errorMessage, initials, confirmDialog } from "../core/ui.js";
import {
  doc, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const root = document.getElementById("root");

(async function boot() {
  const user = await waitForUser();
  if (!user) { location.href = "/login"; return; }

  let ctx;
  try { ctx = await loadContext(user); }
  catch (err) {
    console.error(err);
    return mount(root, html`<div class="auth-wrap"><div class="card auth-card center">
      <h2>Tidak dapat memuat akun</h2><p>${errorMessage(err)}</p>
      <button class="btn btn-primary" onclick="location.reload()">Coba lagi</button></div></div>`);
  }

  if (ctx.state === "no-company") { location.href = "/onboarding"; return; }
  if (ctx.state === "pending") return renderPending(ctx);
  if (ctx.state === "disabled") return renderDisabled(ctx);
  renderShell(ctx);
})();

/* ---------- menunggu persetujuan ---------- */
function renderPending(ctx) {
  mount(root, html`<div class="auth-wrap"><div class="card auth-card center">
    <a class="brand" href="/"><img src="/assets/logo-mark.png" alt="" /><span class="brand-word">neurotech</span></a>
    <div class="big-icon">${icon("mdi:account-clock-outline")}</div>
    <h2>Menunggu persetujuan</h2>
    <p>Permintaan Anda untuk bergabung dengan <b>${ctx.company.name}</b> sedang ditinjau oleh admin.
      Halaman ini akan terbuka otomatis setelah disetujui.</p>
    <div class="stack">
      <button class="btn btn-ghost btn-block" id="cancelReq">Batalkan permintaan</button>
      <button class="btn btn-ghost btn-block" id="logoutBtn">Keluar</button>
    </div></div></div>`);

  onSnapshot(doc(db, "companies", ctx.company.id, "members", ctx.user.uid),
    (snap) => { if (!snap.exists() || snap.data().status !== "pending") location.reload(); },
    () => {});

  document.getElementById("logoutBtn").onclick = logout;
  document.getElementById("cancelReq").onclick = async (e) => {
    const btn = e.currentTarget;
    if (!(await confirmDialog("Batalkan permintaan?", "Anda dapat bergabung lagi dengan kode undangan.", { danger: true }))) return;
    busy(btn);
    try {
      const batch = writeBatch(db);
      logInBatch(batch, ctx.company.id, { uid: ctx.user.uid, name: ctx.member.name },
        { action: "member.cancel", entity: "member", entityId: ctx.user.uid, summary: `${ctx.member.name} membatalkan permintaan bergabung` });
      batch.delete(doc(db, "companies", ctx.company.id, "members", ctx.user.uid));
      batch.update(doc(db, "users", ctx.user.uid), { companyId: null, updatedAt: serverTimestamp() });
      await batch.commit();
      location.href = "/onboarding";
    } catch (err) { toast(errorMessage(err), "kritis"); unbusy(btn); }
  };
}

function renderDisabled(ctx) {
  mount(root, html`<div class="auth-wrap"><div class="card auth-card center">
    <a class="brand" href="/"><img src="/assets/logo-mark.png" alt="" /><span class="brand-word">neurotech</span></a>
    <div class="big-icon">${icon("mdi:account-lock-outline")}</div>
    <h2>Akses dinonaktifkan</h2>
    <p>Akun Anda di <b>${ctx.company.name}</b> dinonaktifkan oleh admin. Hubungi admin perusahaan untuk informasi lebih lanjut.</p>
    <button class="btn btn-ghost btn-block" id="logoutBtn">Keluar</button></div></div>`);
  document.getElementById("logoutBtn").onclick = logout;
}

/* ---------- aplikasi ---------- */
function navHTML(role) {
  const groups = [];
  for (const r of ROUTES) {
    if (r.hidden || !r.roles.includes(role)) continue;
    let g = groups.find((x) => x.name === r.group);
    if (!g) groups.push((g = { name: r.group, items: [] }));
    g.items.push(r);
  }
  return groups.map((g) => html`
    <div class="nav-group">
      <div class="nav-group-title">${g.name}</div>
      ${g.items.map((r) => html`
        <a class="nav-item" href="#${r.path}" data-path="${r.path}">
          ${icon(r.icon)}<span>${r.title}</span>${r.soon ? html`<em class="soon">Segera</em>` : ""}
        </a>`)}
    </div>`);
}

function renderShell(ctx) {
  const { member, company, user } = ctx;
  mount(root, html`
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="side-head">
          <a class="brand" href="#/"><img src="/assets/logo-mark.png" alt="" /><span class="brand-word">neurotech</span></a>
          <div class="side-company" title="${company.name}">${icon("mdi:domain")} <span>${company.name}</span></div>
        </div>
        <nav class="side-nav">${navHTML(member.role)}</nav>
        <div class="side-foot tiny muted"><a href="/docs/Panduan-Penggunaan-NeuroTech-SMK3.pdf" target="_blank" rel="noopener">${icon("mdi:book-open-variant")} Panduan (PDF)</a><br />SMK3 · PP No. 50/2012${USING_EMULATOR ? html` · <b style="color:var(--waspada)">EMULATOR</b>` : ""}</div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div class="main-col">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu">${icon("mdi:menu")}</button>
          <div class="top-title" id="topTitle"></div>
          <div class="spacer"></div>
          <a class="user-chip" href="#/profil" title="Profil">
            <span class="av">${initials(member.name)}</span>
            <span class="who"><b>${member.name}</b><span>${roleLabel(member.role)}</span></span>
          </a>
          <button id="logoutBtn" class="icon-btn" aria-label="Keluar" title="Keluar">${icon("mdi:logout")}</button>
        </header>
        <div id="banner"></div>
        <main id="outlet" class="app-main" tabindex="-1"></main>
      </div>
    </div>`);

  const $ = (id) => document.getElementById(id);
  $("logoutBtn").onclick = async () => {
    const m = ctx.leaveMessage?.();
    if (m && !confirm(m)) return;
    logout();
  };
  const toggleMenu = (open) => document.body.classList.toggle("menu-open", open);
  $("menuBtn").onclick = () => toggleMenu(!document.body.classList.contains("menu-open"));
  $("scrim").onclick = () => toggleMenu(false);

  // banner verifikasi email (akun email/password)
  const needsVerify = !user.emailVerified && user.providerData.some((p) => p.providerId === "password");
  if (needsVerify) {
    mount($("banner"), html`<div class="banner">${icon("mdi:email-alert-outline")}
      <span>Email Anda belum diverifikasi. Periksa kotak masuk untuk tautan verifikasi.</span>
      <button class="btn btn-ghost btn-sm" id="resendBtn">Kirim ulang</button></div>`);
    $("resendBtn").onclick = async (e) => {
      const btn = e.currentTarget;
      busy(btn, "Mengirim…");
      try { await resendVerification(); toast("Email verifikasi dikirim.", "normal"); }
      catch (err) { toast("Gagal mengirim email verifikasi. Coba beberapa saat lagi.", "kritis"); }
      unbusy(btn);
    };
  }

  // perubahan peran/status oleh admin → muat ulang agar hak akses sesuai
  onSnapshot(doc(db, "companies", company.id, "members", user.uid), (snap) => {
    if (!snap.exists()) { toast("Anda telah dikeluarkan dari perusahaan.", "kritis"); setTimeout(() => location.reload(), 1500); return; }
    const d = snap.data();
    if (d.role !== member.role || d.status !== member.status) {
      toast("Peran atau status akun Anda berubah. Memuat ulang…", "berisiko");
      setTimeout(() => location.reload(), 1500);
    }
  }, (err) => console.warn("member watch:", err));

  const outlet = $("outlet");
  startRouter({
    outlet, ctx,
    onRoute: (route) => {
      toggleMenu(false);
      $("topTitle").textContent = route?.title || "";
      const path = route?.path || "";
      document.querySelectorAll(".nav-item").forEach((a) => {
        const p = a.dataset.path;
        a.classList.toggle("active", p === path || (p !== "/" && path.startsWith(p + "/")));
      });
    },
  });
}
