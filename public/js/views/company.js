// Pengaturan perusahaan (admin): profil, kode undangan, pengaturan modul EEG.
import { db } from "../core/firebase.js";
import { SECTORS } from "../core/roles.js";
import { companySettings } from "../core/context.js";
import { logInBatch } from "../core/audit.js";
import { randomCode } from "../core/code.js";
import { html, mount, icon, toast, busy, unbusy, errorMessage, confirmDialog, options, formData } from "../core/ui.js";
import {
  doc, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export default {
  async render(el, ctx) {
    const c = ctx.company;
    const cid = c.id;
    const actor = { uid: ctx.user.uid, name: ctx.member.name };
    const inviteLink = () => `${location.origin}/onboarding?kode=${ctx.company.code}`;

    const paint = () => {
      const s = companySettings(ctx.company);
      mount(el, html`
        <div class="page-head"><div><h1>Pengaturan Perusahaan</h1>
          <div class="shift">Hanya Admin Perusahaan yang dapat mengubah pengaturan ini.</div></div></div>

        <div class="grid two-col">
          <form class="panel" id="profileForm">
            <h3>${icon("mdi:domain")} Profil perusahaan</h3>
            <div class="field"><label>Nama perusahaan</label><input name="name" required minlength="2" maxlength="160" value="${ctx.company.name}" /></div>
            <div class="field"><label>Sektor</label><select name="sector">${options(SECTORS, ctx.company.sector)}</select></div>
            <div class="field"><label>Alamat</label><input name="address" maxlength="300" value="${ctx.company.address || ""}" /></div>
            <button class="btn btn-primary" type="submit">Simpan profil</button>
          </form>

          <div class="stack">
            <div class="panel">
              <h3>${icon("mdi:key-variant")} Kode undangan</h3>
              <p class="tiny">Bagikan kode atau tautan ini kepada karyawan. Setiap permintaan bergabung tetap harus Anda setujui di menu Anggota.</p>
              <div class="code-row"><span class="badge-code big">${ctx.company.code}</span></div>
              <div class="btn-row">
                <button class="btn btn-ghost btn-sm" id="copyLink" type="button">${icon("mdi:link-variant")} Salin tautan undangan</button>
                <button class="btn btn-ghost btn-sm" id="regen" type="button">${icon("mdi:refresh")} Buat kode baru</button>
              </div>
              <p class="tiny muted" style="margin-top:.8rem">Buat kode baru bila kode lama tersebar ke pihak yang tidak berwenang. Kode lama langsung tidak berlaku.</p>
            </div>

            <form class="panel" id="eegForm">
              <h3>${icon("mdi:head-cog-outline")} Modul Ergonomi Kognitif (EEG)</h3>
              <div class="field"><label>Durasi kalibrasi baseline (headband Muse)</label>
                <select name="calibrationMin">${options([["1", "1 menit"], ["2", "2 menit"], ["3", "3 menit (disarankan)"], ["4", "4 menit"], ["5", "5 menit"]], String(s.calibrationMin))}</select></div>
              <label class="check"><input type="checkbox" name="allowSimulation" ${s.allowSimulation ? "checked" : ""} />
                <span>Izinkan <b>mode simulasi</b> (untuk pelatihan/uji coba tanpa headband). Sesi simulasi ditandai jelas dan dapat dipisahkan pada laporan.</span></label>
              <button class="btn btn-primary" type="submit" style="margin-top:1rem">Simpan pengaturan EEG</button>
            </form>
          </div>
        </div>`);
      bind();
    };

    async function saveCompany(patch, info, btn) {
      busy(btn, "Menyimpan…");
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, "companies", cid), { ...patch, updatedAt: serverTimestamp() });
        logInBatch(batch, cid, actor, info);
        await batch.commit();
        Object.assign(ctx.company, patch);
        toast("Tersimpan.", "normal");
        const nameEl = document.querySelector(".side-company span");
        if (nameEl) nameEl.textContent = ctx.company.name;
      } catch (err) { console.error(err); toast(errorMessage(err), "kritis"); }
      unbusy(btn);
    }

    function bind() {
      el.querySelector("#profileForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = formData(e.target);
        saveCompany({ name: f.name, sector: f.sector, address: f.address },
          { action: "company.update", entity: "company", entityId: cid, summary: `Profil perusahaan diperbarui` },
          e.submitter);
      });

      el.querySelector("#eegForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const form = e.target;
        const settings = {
          calibrationMin: Number(form.calibrationMin.value),
          allowSimulation: form.allowSimulation.checked,
        };
        saveCompany({ settings },
          { action: "company.update", entity: "company", entityId: cid,
            summary: `Pengaturan EEG: kalibrasi ${settings.calibrationMin} mnt, simulasi ${settings.allowSimulation ? "diizinkan" : "dinonaktifkan"}` },
          e.submitter);
      });

      el.querySelector("#copyLink").addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(inviteLink()); toast("Tautan undangan disalin.", "normal"); }
        catch { toast(inviteLink(), "info", 10000); }
      });

      el.querySelector("#regen").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        if (!(await confirmDialog("Buat kode undangan baru?", "Kode lama langsung tidak berlaku. Permintaan bergabung yang sudah masuk tidak terpengaruh.", { label: "Buat kode baru" }))) return;
        busy(btn, "Membuat…");
        const oldCode = ctx.company.code;
        let lastErr = null;
        for (let i = 0; i < 4; i++) {
          const code = randomCode();
          try {
            const batch = writeBatch(db);
            batch.update(doc(db, "companies", cid), { code, updatedAt: serverTimestamp() });
            batch.set(doc(db, "companyCodes", code), { companyId: cid, createdAt: serverTimestamp() });
            if (oldCode) batch.delete(doc(db, "companyCodes", oldCode));
            logInBatch(batch, cid, actor, { action: "company.code.regenerate", entity: "company", entityId: cid, summary: "Kode undangan dibuat ulang" });
            await batch.commit();
            ctx.company.code = code;
            toast("Kode undangan baru dibuat.", "normal");
            return paint();
          } catch (err) { lastErr = err; if (err.code !== "permission-denied") break; }
        }
        console.error(lastErr); toast(errorMessage(lastErr), "kritis"); unbusy(btn);
      });
    }

    paint();
  },
};
