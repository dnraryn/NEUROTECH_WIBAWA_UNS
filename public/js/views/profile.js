// Profil saya: nama, info peran, keamanan akun.
import { db } from "../core/firebase.js";
import { resetPassword, resendVerification, logout } from "../core/auth.js";
import { roleLabel, ROLES } from "../core/roles.js";
import { html, mount, icon, toast, busy, unbusy, errorMessage, fmtDate, initials } from "../core/ui.js";
import {
  doc, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export default {
  async render(el, ctx) {
    const { user, member, company } = ctx;
    const isPasswordAccount = user.providerData.some((p) => p.providerId === "password");

    mount(el, html`
      <div class="page-head"><div><h1>Profil Saya</h1><div class="shift">${user.email}</div></div></div>
      <div class="grid two-col">
        <form class="panel" id="nameForm">
          <h3>${icon("mdi:account-circle-outline")} Data diri</h3>
          <div class="person" style="margin-bottom:1rem"><span class="av lg">${initials(member.name)}</span>
            <div><b>${member.name}</b><div class="tiny muted">${roleLabel(member.role)} · ${company.name}</div></div></div>
          <div class="field"><label>Nama lengkap</label><input name="name" required minlength="2" maxlength="120" value="${member.name}" /></div>
          <button class="btn btn-primary" type="submit">Simpan nama</button>
        </form>

        <div class="stack">
          <div class="panel">
            <h3>${icon("mdi:badge-account-outline")} Keanggotaan</h3>
            <table class="tbl kv">
              <tr><th>Perusahaan</th><td>${company.name}</td></tr>
              <tr><th>Peran</th><td>${roleLabel(member.role)}<div class="tiny muted">${ROLES[member.role]?.desc || ""}</div></td></tr>
              <tr><th>Jabatan</th><td>${member.position || "—"}</td></tr>
              <tr><th>Departemen</th><td>${member.department || "—"}</td></tr>
              <tr><th>Shift</th><td>${member.shift || "—"}</td></tr>
              <tr><th>Bergabung</th><td>${fmtDate(member.joinedAt)}</td></tr>
            </table>
            <p class="tiny muted" style="margin-top:.8rem">Peran, jabatan, dan shift diatur oleh Admin Perusahaan.</p>
          </div>

          <div class="panel">
            <h3>${icon("mdi:shield-key-outline")} Keamanan akun</h3>
            <p class="tiny">Email: ${user.emailVerified ? html`<span class="pill normal">Terverifikasi</span>` : html`<span class="pill waspada">Belum terverifikasi</span>`}</p>
            <div class="btn-row">
              ${!user.emailVerified && isPasswordAccount ? html`<button class="btn btn-ghost btn-sm" id="verifyBtn" type="button">Kirim email verifikasi</button>` : ""}
              ${isPasswordAccount ? html`<button class="btn btn-ghost btn-sm" id="resetBtn" type="button">${icon("mdi:lock-reset")} Ubah kata sandi via email</button>` : html`<span class="tiny muted">Akun masuk dengan Google — kata sandi dikelola oleh Google.</span>`}
              <button class="btn btn-ghost btn-sm" id="logoutBtn2" type="button">${icon("mdi:logout")} Keluar</button>
            </div>
          </div>
        </div>
      </div>`);

    el.querySelector("#nameForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.submitter;
      const name = e.target.name.value.trim();
      if (name.length < 2) return;
      busy(btn, "Menyimpan…");
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, "users", user.uid), { name, updatedAt: serverTimestamp() });
        batch.update(doc(db, "companies", company.id, "members", user.uid), { name, updatedAt: serverTimestamp() });
        await batch.commit();
        await updateProfile(user, { displayName: name }).catch(() => {});
        member.name = name;
        const chip = document.querySelector(".user-chip .who b"); if (chip) chip.textContent = name;
        toast("Nama diperbarui.", "normal");
      } catch (err) { console.error(err); toast(errorMessage(err), "kritis"); }
      unbusy(btn);
    });

    el.querySelector("#verifyBtn")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget; busy(btn, "Mengirim…");
      try { await resendVerification(); toast("Email verifikasi dikirim.", "normal"); }
      catch { toast("Gagal mengirim. Coba beberapa saat lagi.", "kritis"); }
      unbusy(btn);
    });
    el.querySelector("#resetBtn")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget; busy(btn, "Mengirim…");
      try { await resetPassword(user.email); toast("Tautan ubah kata sandi dikirim ke email Anda.", "normal"); }
      catch { toast("Gagal mengirim. Coba beberapa saat lagi.", "kritis"); }
      unbusy(btn);
    });
    el.querySelector("#logoutBtn2").addEventListener("click", logout);
  },
};
