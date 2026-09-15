// Anggota & peran: persetujuan, ubah peran, nonaktifkan, keluarkan.
import { db } from "../core/firebase.js";
import { ROLES, ROLE_KEYS, roleLabel, MEMBER_STATUS, SHIFTS } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { html, mount, icon, modal, confirmDialog, toast, errorMessage, fmtDate, initials, options, formData } from "../core/ui.js";
import {
  collection, doc, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const roleOptions = (sel) => options(ROLE_KEYS.map((k) => [k, ROLES[k].label]), sel);

function memberFields(m, { withRole = true } = {}) {
  return html`
    ${withRole ? html`<div class="field"><label>Peran</label><select name="role" required>${roleOptions(m.role)}</select>
      <div class="tiny muted" data-role-desc style="margin-top:.3rem">${ROLES[m.role]?.desc || ""}</div></div>` : ""}
    <div class="form-grid">
      <div class="field"><label>Jabatan</label><input name="position" maxlength="80" value="${m.position || ""}" /></div>
      <div class="field"><label>Departemen / Area</label><input name="department" maxlength="80" value="${m.department || ""}" /></div>
    </div>
    <div class="field"><label>Shift</label><select name="shift">${options(SHIFTS, m.shift || "")}</select></div>`;
}

export default {
  async render(el, ctx) {
    const cid = ctx.company.id;
    const isAdmin = ctx.member.role === "admin";
    const ownerUid = ctx.company.ownerUid;
    const actor = { uid: ctx.user.uid, name: ctx.member.name };
    let members = [], tab = "active", search = "";

    mount(el, html`
      <div class="page-head">
        <div><h1>Anggota &amp; Peran</h1>
          <div class="shift">${isAdmin ? "Setujui permintaan bergabung dan tetapkan peran setiap anggota." : "Daftar anggota perusahaan (hanya-baca)."}</div></div>
        ${isAdmin ? html`<a class="btn btn-ghost" href="#/perusahaan">${icon("mdi:key-variant")} Kode undangan</a>` : ""}
      </div>
      <div class="toolbar">
        <div class="tabs" id="tabs">
          <button data-tab="pending">Menunggu <span class="count" id="c-pending">0</span></button>
          <button data-tab="active" class="active">Aktif <span class="count" id="c-active">0</span></button>
          <button data-tab="disabled">Nonaktif <span class="count" id="c-disabled">0</span></button>
        </div>
        <input class="search" id="search" type="search" placeholder="Cari nama, email, jabatan…" />
      </div>
      <div class="panel table-wrap"><table class="tbl">
        <thead><tr><th>Nama</th><th>Peran</th><th>Jabatan / Departemen</th><th>Shift</th><th>Bergabung</th>${isAdmin ? html`<th></th>` : ""}</tr></thead>
        <tbody id="rows"><tr><td colspan="6" class="muted tiny">Memuat…</td></tr></tbody>
      </table></div>
      <p class="tiny muted" style="margin-top:.8rem">${icon("mdi:shield-lock-outline")} Pemilik perusahaan tidak dapat diturunkan perannya atau dinonaktifkan. Setiap perubahan tercatat di Log Aktivitas.</p>`);

    const rowsEl = el.querySelector("#rows");

    function paint() {
      ["pending", "active", "disabled"].forEach((s) => { el.querySelector("#c-" + s).textContent = members.filter((m) => m.status === s).length; });
      const q = search.toLowerCase();
      const list = members
        .filter((m) => m.status === tab)
        .filter((m) => !q || [m.name, m.email, m.position, m.department].some((v) => (v || "").toLowerCase().includes(q)))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"));
      if (!list.length) return mount(rowsEl, html`<tr><td colspan="6" class="muted tiny">Tidak ada anggota pada daftar ini.</td></tr>`);
      mount(rowsEl, html`${list.map((m) => {
        const owner = m.uid === ownerUid, self = m.uid === ctx.user.uid;
        return html`<tr>
          <td><div class="person"><span class="av">${initials(m.name)}</span><div><b>${m.name}</b>
            ${owner ? html`<span class="tag">Pemilik</span>` : ""}${self ? html`<span class="tag">Anda</span>` : ""}
            <div class="tiny muted">${m.email}</div></div></div></td>
          <td>${m.status === "pending" ? html`<span class="pill waspada">${MEMBER_STATUS.pending.label}</span>` : roleLabel(m.role)}</td>
          <td>${m.position || "—"}<div class="tiny muted">${m.department || ""}</div></td>
          <td>${m.shift || "—"}</td>
          <td class="tiny">${fmtDate(m.joinedAt)}</td>
          ${isAdmin ? html`<td class="actions">${actionsFor(m, owner, self)}</td>` : ""}
        </tr>`;
      })}`);
    }

    function actionsFor(m, owner, self) {
      if (m.status === "pending") return html`
        <button class="btn btn-primary btn-sm" data-act="approve" data-uid="${m.uid}">Setujui</button>
        <button class="btn btn-ghost btn-sm" data-act="reject" data-uid="${m.uid}">Tolak</button>`;
      const btns = [html`<button class="icon-btn" title="Ubah" data-act="edit" data-uid="${m.uid}">${icon("mdi:pencil-outline")}</button>`];
      if (!owner && !self) {
        btns.push(m.status === "active"
          ? html`<button class="icon-btn" title="Nonaktifkan" data-act="disable" data-uid="${m.uid}">${icon("mdi:account-cancel-outline")}</button>`
          : html`<button class="icon-btn" title="Aktifkan" data-act="enable" data-uid="${m.uid}">${icon("mdi:account-check-outline")}</button>`);
        btns.push(html`<button class="icon-btn danger" title="Keluarkan" data-act="remove" data-uid="${m.uid}">${icon("mdi:account-remove-outline")}</button>`);
      }
      return btns;
    }

    const ref = (uid) => doc(db, "companies", cid, "members", uid);
    async function commit(fn, okMsg) {
      const batch = writeBatch(db);
      fn(batch);
      await batch.commit();
      if (okMsg) toast(okMsg, "normal");
    }

    const actions = {
      approve: (m) => modal({
        title: `Setujui ${m.name}`,
        body: html`<p class="tiny">${m.email} · kode ${m.joinCode || "—"}</p>${memberFields({ ...m, role: "pekerja" })}`,
        submitLabel: "Setujui & aktifkan",
        onSubmit: (form) => {
          const f = formData(form);
          return commit((b) => {
            b.update(ref(m.uid), { role: f.role, status: "active", position: f.position, department: f.department,
              shift: f.shift, approvedBy: ctx.user.uid, updatedAt: serverTimestamp() });
            logInBatch(b, cid, actor, { action: "member.approve", entity: "member", entityId: m.uid, summary: `${m.name} disetujui sebagai ${roleLabel(f.role)}` });
          }, `${m.name} kini aktif sebagai ${roleLabel(f.role)}.`);
        },
      }),

      reject: async (m) => {
        if (!(await confirmDialog("Tolak permintaan?", `${m.name} (${m.email}) tidak akan bergabung. Ia dapat mengajukan lagi dengan kode undangan.`, { danger: true, label: "Tolak" }))) return;
        await commit((b) => {
          b.delete(ref(m.uid));
          logInBatch(b, cid, actor, { action: "member.reject", entity: "member", entityId: m.uid, summary: `Permintaan ${m.name} ditolak` });
        }, "Permintaan ditolak.");
      },

      edit: (m) => {
        const owner = m.uid === ownerUid, self = m.uid === ctx.user.uid;
        const lockRole = owner || self;
        return modal({
          title: `Ubah ${m.name}`,
          body: html`${lockRole ? html`<p class="tiny muted">Peran ${owner ? "pemilik perusahaan" : "Anda sendiri"} tidak dapat diubah di sini (${roleLabel(m.role)}).</p>` : ""}
            ${memberFields(m, { withRole: !lockRole })}`,
          onSubmit: (form) => {
            const f = formData(form);
            const patch = { position: f.position, department: f.department, shift: f.shift, updatedAt: serverTimestamp() };
            const roleChanged = !lockRole && f.role && f.role !== m.role;
            if (roleChanged) patch.role = f.role;
            return commit((b) => {
              b.update(ref(m.uid), patch);
              logInBatch(b, cid, actor, roleChanged
                ? { action: "member.role", entity: "member", entityId: m.uid, summary: `Peran ${m.name}: ${roleLabel(m.role)} → ${roleLabel(f.role)}` }
                : { action: "member.update", entity: "member", entityId: m.uid, summary: `Data jabatan ${m.name} diperbarui` });
            }, "Perubahan disimpan.");
          },
        });
      },

      disable: async (m) => {
        if (!(await confirmDialog("Nonaktifkan anggota?", `${m.name} tidak dapat mengakses aplikasi sampai diaktifkan kembali. Data historisnya tetap tersimpan.`, { danger: true, label: "Nonaktifkan" }))) return;
        await commit((b) => {
          b.update(ref(m.uid), { status: "disabled", updatedAt: serverTimestamp() });
          logInBatch(b, cid, actor, { action: "member.disable", entity: "member", entityId: m.uid, summary: `${m.name} dinonaktifkan` });
        }, `${m.name} dinonaktifkan.`);
      },

      enable: async (m) => {
        await commit((b) => {
          b.update(ref(m.uid), { status: "active", updatedAt: serverTimestamp() });
          logInBatch(b, cid, actor, { action: "member.enable", entity: "member", entityId: m.uid, summary: `${m.name} diaktifkan kembali` });
        }, `${m.name} diaktifkan.`);
      },

      remove: async (m) => {
        if (!(await confirmDialog("Keluarkan anggota?", `${m.name} akan dikeluarkan dari perusahaan. Data sesi & laporan yang pernah dibuatnya tetap tersimpan untuk keperluan audit.`, { danger: true, label: "Keluarkan" }))) return;
        await commit((b) => {
          b.delete(ref(m.uid));
          logInBatch(b, cid, actor, { action: "member.remove", entity: "member", entityId: m.uid, summary: `${m.name} dikeluarkan` });
        }, `${m.name} dikeluarkan.`);
      },
    };

    el.querySelector("#tabs").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      tab = b.dataset.tab;
      el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
      paint();
    });
    el.querySelector("#search").addEventListener("input", (e) => { search = e.target.value; paint(); });

    rowsEl.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const m = members.find((x) => x.uid === b.dataset.uid); if (!m) return;
      try { await actions[b.dataset.act](m); }
      catch (err) { console.error(err); toast(errorMessage(err), "kritis"); }
    });

    // deskripsi peran di modal
    const onChange = (e) => {
      if (e.target.name !== "role") return;
      const d = e.target.closest("form")?.querySelector("[data-role-desc]");
      if (d) d.textContent = ROLES[e.target.value]?.desc || "";
    };
    document.addEventListener("change", onChange);

    const unsub = onSnapshot(collection(db, "companies", cid, "members"), (snap) => {
      members = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      if (isAdmin && tab === "active" && members.some((m) => m.status === "pending") && !el.dataset.autoTab) {
        el.dataset.autoTab = "1"; tab = "pending";
        el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x.dataset.tab === "pending"));
      }
      paint();
    }, (err) => mount(rowsEl, html`<tr><td colspan="6" class="msg err">${errorMessage(err)}</td></tr>`));

    return () => { unsub(); document.removeEventListener("change", onChange); };
  },
};
