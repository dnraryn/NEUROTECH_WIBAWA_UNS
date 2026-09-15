// Pengendalian Dokumen — SOP, instruksi kerja, formulir, manual, rencana tanggap darurat;
// alur draf → tinjau → disetujui, versi & riwayat revisi, tanggal tinjau ulang. (Elemen 4)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { html, mount, icon, modal, toast, errorMessage, fmtDateTime } from "../core/ui.js";
import { fieldsHTML, readFields, today, addMonths, fmtDay } from "../core/form.js";
import { DOC_TYPE, DOC_STATUS, NOT_WORKER, K3_ADMIN, badge, opts } from "../smk3/common.js";
import {
  collection, doc, query, where, orderBy, onSnapshot, getDocs, writeBatch, serverTimestamp, deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const docFields = [
  { name: "code", label: "Kode dokumen", required: true, max: 40, half: true, placeholder: "cth. SOP-K3-001" },
  { name: "type", label: "Jenis", type: "select", options: opts(DOC_TYPE), required: true, half: true },
  { name: "title", label: "Judul", required: true, max: 160 },
  { name: "version", label: "Versi", required: true, max: 20, half: true },
  { name: "owner", label: "Pemilik proses / penyusun", max: 120, half: true },
  { name: "content", label: "Isi dokumen", type: "textarea", rows: 12, max: 50000, help: "Tulis isi dokumen di sini, atau cantumkan tautan ke berkas di bawah." },
  { name: "url", label: "Tautan berkas (opsional)", max: 500, placeholder: "https://…" },
  { name: "distribution", label: "Distribusi", max: 300, half: true, placeholder: "cth. Line Produksi A, Gudang" },
  { name: "reviewDate", label: "Tinjau ulang", type: "date", half: true },
];

export default {
  render(el, ctx) {
    const cid = ctx.company.id;
    const viewer = can(ctx, NOT_WORKER), admin = can(ctx, K3_ADMIN);
    const actor = { uid: ctx.user.uid, name: ctx.member.name };
    let rows = [], type = "", status = "", search = "";

    mount(el, html`
      <div class="page-head"><div><h1>Pengendalian Dokumen</h1>
        <div class="shift">Dokumen K3 yang disetujui, terkini, dan terdistribusi (Elemen 4 PP 50/2012).</div></div>
        ${admin ? html`<button class="btn btn-primary" id="newDoc">${icon("mdi:plus")} Dokumen baru</button>` : ""}</div>
      <div class="toolbar"><div class="btn-row">
        <select class="search" id="typeF" style="min-width:0"><option value="">Semua jenis</option>${opts(DOC_TYPE).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select>
        ${viewer ? html`<select class="search" id="stF" style="min-width:0"><option value="">Semua status</option>${opts(DOC_STATUS).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select>` : ""}
      </div><input class="search" id="search" type="search" placeholder="Cari kode, judul…" /></div>
      <div class="panel table-wrap"><table class="tbl">
        <thead><tr><th>Kode</th><th>Judul</th><th>Jenis</th><th>Versi</th><th>Tinjau ulang</th><th>Status</th></tr></thead>
        <tbody id="rows"><tr><td colspan="6" class="muted tiny">Memuat…</td></tr></tbody></table></div>`);
    const body = el.querySelector("#rows");

    function paint() {
      const q = search.toLowerCase(), td = today();
      const list = rows.filter((d) => (!type || d.type === type) && (!status || d.status === status) && (!q || [d.code, d.title, d.owner].some((v) => (v || "").toLowerCase().includes(q))));
      mount(body, list.length ? html`${list.map((d) => html`<tr class="click" data-id="${d.id}">
        <td class="nowrap"><b>${d.code}</b></td><td>${d.title}<div class="tiny muted">${d.owner || ""}</div></td>
        <td class="tiny">${DOC_TYPE[d.type]}</td><td>${d.version}</td>
        <td class="nowrap tiny">${fmtDay(d.reviewDate)}${d.status === "disetujui" && d.reviewDate && d.reviewDate < td ? html`<div class="tag warn">LEWAT</div>` : ""}</td>
        <td>${badge(DOC_STATUS, d.status)}</td></tr>`)}` : html`<tr><td colspan="6" class="muted tiny">Tidak ada dokumen.</td></tr>`);
    }

    async function save(ref, data, info, { create = false, revision = null } = {}) {
      const b = writeBatch(db);
      create ? b.set(ref, data) : b.update(ref, { ...data, updatedAt: serverTimestamp() });
      if (revision) b.set(doc(collection(ref, "revisions")), { ...revision, by: ctx.user.uid, byName: ctx.member.name, at: serverTimestamp() });
      logInBatch(b, cid, actor, { entity: "document", entityId: ref.id, ...info });
      await b.commit();
    }

    async function openDoc(d) {
      const ref = doc(db, "companies", cid, "documents", d.id);
      const revs = viewer ? (await getDocs(query(collection(ref, "revisions"), orderBy("at", "desc")))).docs.map((x) => x.data()) : [];
      const acts = [];
      if (admin) {
        if (d.status === "draft") acts.push(["edit", "Ubah"], ["review", "Ajukan tinjauan"], ["del", "Hapus draf"]);
        if (d.status === "review") acts.push(["edit", "Ubah"], ["approve", "Setujui"], ["back", "Kembalikan ke draf"]);
        if (d.status === "disetujui") acts.push(["revise", "Revisi (versi baru)"], ["expire", "Tandai kedaluwarsa"]);
      }
      modal({
        title: `${d.code} — ${d.title}`,
        body: html`<div class="btn-row" style="margin-bottom:.6rem">${badge(DOC_STATUS, d.status)}
          <span class="tiny muted">${DOC_TYPE[d.type]} · versi ${d.version}${d.approvedByName ? ` · disetujui ${d.approvedByName} (${fmtDay(d.approvedDate)})` : ""}</span></div>
          ${d.url ? html`<p><a href="${/^https?:\/\//.test(d.url) ? d.url : "#"}" target="_blank" rel="noopener noreferrer">${icon("mdi:open-in-new")} Buka berkas</a></p>` : ""}
          ${d.content ? html`<div class="doc-content">${d.content}</div>` : ""}
          <table class="tbl kv" style="margin-top:.8rem"><tbody><tr><th>Distribusi</th><td>${d.distribution || "—"}</td></tr><tr><th>Tinjau ulang</th><td>${fmtDay(d.reviewDate)}</td></tr></tbody></table>
          ${revs.length ? html`<h4 class="sub-h">Riwayat revisi</h4><table class="tbl"><tbody>${revs.map((r) => html`<tr><td>v${r.version}</td><td class="tiny">${r.note}</td><td class="tiny">${r.byName} · ${fmtDateTime(r.at)}</td></tr>`)}</tbody></table>` : ""}
          ${acts.length ? html`<div class="btn-row" style="margin-top:1rem">${acts.map(([k, v]) => html`<button type="button" class="btn ${k === "approve" ? "btn-primary" : "btn-ghost"} btn-sm" data-a="${k}">${v}</button>`)}</div>` : ""}`,
        cancelLabel: "Tutup",
      });
      document.querySelectorAll("dialog.modal [data-a]").forEach((b) => b.onclick = async () => {
        const close = () => b.closest("dialog").querySelector("[data-close]").click();
        const a = b.dataset.a;
        try {
          if (a === "edit") { close(); editModal(d); }
          if (a === "review") { await save(ref, { status: "review" }, { action: "document.review", summary: `${d.code} v${d.version} diajukan untuk ditinjau` }); close(); }
          if (a === "back") { await save(ref, { status: "draft" }, { action: "document.update", summary: `${d.code} dikembalikan ke draf` }); close(); }
          if (a === "approve") {
            await save(ref, { status: "disetujui", approvedBy: ctx.user.uid, approvedByName: ctx.member.name, approvedDate: today() },
              { action: "document.approve", summary: `${d.code} v${d.version} disetujui` }, { revision: { version: d.version, note: "Disetujui & diterbitkan" } });
            close(); toast("Dokumen disetujui dan terbit.", "normal");
          }
          if (a === "expire" && confirm("Tandai dokumen kedaluwarsa? Dokumen tidak lagi terlihat oleh pekerja.")) { await save(ref, { status: "kedaluwarsa" }, { action: "document.expire", summary: `${d.code} v${d.version} kedaluwarsa` }); close(); }
          if (a === "del" && confirm("Hapus draf ini?")) { await deleteDoc(ref); close(); }
          if (a === "revise") {
            close();
            const next = `${Math.floor(parseFloat(d.version) || 1) + 1}.0`;
            modal({ title: `Revisi ${d.code} → versi ${next}`,
              body: html`<div class="field"><label>Alasan / ringkasan perubahan <span class="req">*</span></label><textarea name="note" rows="3" required maxlength="500"></textarea></div>
                <p class="tiny muted">Dokumen kembali ke status draf dengan versi ${next} untuk diedit, ditinjau, dan disetujui ulang.</p>`,
              submitLabel: "Mulai revisi",
              onSubmit: (form) => save(ref, { version: next, status: "draft", approvedBy: null, approvedByName: null, approvedDate: null },
                { action: "document.revise", summary: `${d.code}: v${d.version} → v${next} — ${form.note.value.trim()}` }, { revision: { version: next, note: form.note.value.trim() } }) });
          }
        } catch (err) { toast(errorMessage(err), "kritis"); }
      });
    }

    function editModal(d) {
      return modal({
        title: d ? `Ubah ${d.code}` : "Dokumen baru (draf)",
        body: fieldsHTML(docFields, d || { type: "sop", version: "1.0", reviewDate: addMonths(today(), 12) }),
        onSubmit: async (form) => {
          const f = readFields(form, docFields);
          if (f.url && !/^https?:\/\//.test(f.url)) throw new Error("Tautan harus diawali http:// atau https://");
          if (d) return save(doc(db, "companies", cid, "documents", d.id), f, { action: "document.update", summary: `${f.code} v${f.version} diubah` });
          const ref = doc(collection(db, "companies", cid, "documents"));
          await save(ref, { ...f, status: "draft", createdBy: ctx.user.uid, createdByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
            { action: "document.create", summary: `${f.code} — ${f.title} (draf)` }, { create: true, revision: { version: f.version, note: "Dokumen dibuat" } });
          toast("Draf dokumen dibuat.", "normal");
        },
      });
    }

    el.querySelector("#newDoc")?.addEventListener("click", () => editModal(null));
    el.querySelector("#typeF").onchange = (e) => { type = e.target.value; paint(); };
    el.querySelector("#stF")?.addEventListener("change", (e) => { status = e.target.value; paint(); });
    el.querySelector("#search").oninput = (e) => { search = e.target.value; paint(); };
    body.onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) openDoc(rows.find((d) => d.id === tr.dataset.id)).catch((err) => toast(errorMessage(err), "kritis")); };

    const col = collection(db, "companies", cid, "documents");
    return onSnapshot(viewer ? col : query(col, where("status", "==", "disetujui")), (s) => {
      rows = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.code.localeCompare(b.code));
      paint();
    }, (err) => mount(body, html`<tr><td colspan="6" class="msg err">${errorMessage(err)}</td></tr>`));
  },
};
