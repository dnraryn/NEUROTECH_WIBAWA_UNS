// CAPA — tindakan perbaikan & pencegahan: penugasan, progres, bukti, verifikasi efektivitas. (Elemen 8.4)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { activeMembers } from "../core/members.js";
import { html, mount, icon, modal, toast, errorMessage, fmtDateTime } from "../core/ui.js";
import { fieldsHTML, readFields, addDays, today, fmtDay } from "../core/form.js";
import {
  CAPA_STATUS, CAPA_PRIORITY, CAPA_TYPE, CAPA_SOURCE, SOURCE_ROUTE, NOT_WORKER, K3_ADMIN, badge, opts, isOverdue, shortId,
} from "../smk3/common.js";
import {
  collection, doc, query, where, orderBy, limit, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const capaFields = [
  { name: "title", label: "Tindakan", required: true, max: 160, placeholder: "cth. Pasang pelindung mata pisau pada mesin potong" },
  { name: "description", label: "Uraian & kriteria selesai", type: "textarea", max: 3000, rows: 3 },
  { name: "type", label: "Jenis", type: "select", options: opts(CAPA_TYPE), required: true, half: true },
  { name: "priority", label: "Prioritas", type: "select", options: opts(CAPA_PRIORITY), required: true, half: true },
  { name: "assigneeUid", label: "Penanggung jawab", type: "member", nameField: "assigneeName", required: true, half: true },
  { name: "dueDate", label: "Tenggat", type: "date", required: true, half: true },
];

/** Buka modal pembuatan CAPA. preset: { sourceType, sourceId, sourceLabel, title, type, priority } */
export async function openCapaModal(ctx, preset = {}) {
  const members = await activeMembers(ctx);
  return new Promise((resolve) => {
    let createdId = null;
    modal({
      title: "Buat tindakan perbaikan (CAPA)",
      body: html`${preset.sourceLabel ? html`<p class="tiny">Sumber: <b>${preset.sourceLabel}</b></p>` : ""}
        ${fieldsHTML(capaFields, { type: "korektif", priority: "sedang", dueDate: addDays(today(), 14), ...preset }, { members })}`,
      submitLabel: "Buat CAPA",
      onSubmit: async (form) => {
        const f = readFields(form, capaFields, { members });
        const ref = doc(collection(db, "companies", ctx.company.id, "capa"));
        const b = writeBatch(db);
        b.set(ref, {
          ...f, status: "terbuka",
          sourceType: preset.sourceType || "manual", sourceId: preset.sourceId || null, sourceLabel: preset.sourceLabel || "",
          createdBy: ctx.user.uid, createdByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        logInBatch(b, ctx.company.id, { uid: ctx.user.uid, name: ctx.member.name },
          { action: "capa.create", entity: "capa", entityId: ref.id, summary: `${f.title} → ${f.assigneeName} (tenggat ${f.dueDate})` });
        await b.commit();
        createdId = ref.id;
        toast("CAPA dibuat dan ditugaskan.", "normal");
      },
    }).then((ok) => resolve(ok ? createdId : null));
  });
}

/* ================= daftar ================= */
function renderList(el, ctx) {
  const cid = ctx.company.id;
  const viewer = can(ctx, NOT_WORKER);
  let all = [], mine = [], tab = viewer ? "aktif" : "saya", search = "";

  mount(el, html`
    <div class="page-head"><div><h1>Tindakan Perbaikan (CAPA)</h1>
      <div class="shift">Corrective &amp; Preventive Action — ditugaskan, dikerjakan, dibuktikan, lalu diverifikasi efektivitasnya.</div></div>
      ${viewer ? html`<button class="btn btn-primary" id="newBtn">${icon("mdi:plus")} CAPA baru</button>` : ""}</div>
    <div class="metrics" style="margin-bottom:1.2rem">
      <div class="metric"><div class="label">Tugas saya (aktif)</div><div class="val" id="m-mine">–</div></div>
      ${viewer ? html`
      <div class="metric"><div class="label">Terbuka / dikerjakan</div><div class="val" style="color:var(--waspada)" id="m-open">–</div></div>
      <div class="metric"><div class="label">Menunggu verifikasi</div><div class="val" style="color:var(--cyan)" id="m-ver">–</div></div>
      <div class="metric"><div class="label">Terlambat</div><div class="val" style="color:var(--kritis)" id="m-late">–</div></div>` : ""}
    </div>
    <div class="toolbar">
      <div class="tabs" id="tabs">
        <button data-tab="saya" class="${tab === "saya" ? "active" : ""}">Tugas saya</button>
        ${viewer ? html`<button data-tab="aktif" class="active">Semua aktif</button><button data-tab="verifikasi">Menunggu verifikasi</button><button data-tab="terlambat">Terlambat</button><button data-tab="semua">Semua</button>` : ""}
      </div>
      <input class="search" id="search" type="search" placeholder="Cari tindakan, penanggung jawab…" />
    </div>
    <div class="panel table-wrap"><table class="tbl">
      <thead><tr><th>Tindakan</th><th>Sumber</th><th>Penanggung jawab</th><th>Tenggat</th><th>Prioritas</th><th>Status</th></tr></thead>
      <tbody id="rows"><tr><td colspan="6" class="muted tiny">Memuat…</td></tr></tbody></table></div>`);

  const body = el.querySelector("#rows");
  function paint() {
    const active = (c) => ["terbuka", "dikerjakan"].includes(c.status);
    el.querySelector("#m-mine").textContent = mine.filter((c) => active(c) || c.status === "selesai").length;
    if (viewer) {
      el.querySelector("#m-open").textContent = all.filter(active).length;
      el.querySelector("#m-ver").textContent = all.filter((c) => c.status === "selesai").length;
      el.querySelector("#m-late").textContent = all.filter((c) => isOverdue(c)).length;
    }
    const base = tab === "saya" ? mine : all;
    const q = search.toLowerCase();
    const list = base
      .filter((c) => tab === "saya" || tab === "semua" || (tab === "aktif" && active(c)) || (tab === "verifikasi" && c.status === "selesai") || (tab === "terlambat" && isOverdue(c)))
      .filter((c) => !q || [c.title, c.assigneeName, c.sourceLabel].some((v) => (v || "").toLowerCase().includes(q)))
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    if (!list.length) return mount(body, html`<tr><td colspan="6" class="muted tiny">Tidak ada CAPA.</td></tr>`);
    mount(body, html`${list.map((c) => html`<tr class="click ${isOverdue(c) ? "row-late" : ""}" data-id="${c.id}">
      <td><b>${c.title}</b><div class="tiny muted">#${shortId(c.id)} · ${CAPA_TYPE[c.type]}</div></td>
      <td class="tiny">${CAPA_SOURCE[c.sourceType] || c.sourceType}</td>
      <td>${c.assigneeName}</td>
      <td class="nowrap">${fmtDay(c.dueDate)}${isOverdue(c) ? html`<div class="tag warn">TERLAMBAT</div>` : ""}</td>
      <td>${CAPA_PRIORITY[c.priority]}</td>
      <td>${badge(CAPA_STATUS, c.status)}</td></tr>`)}`);
  }

  el.querySelector("#newBtn")?.addEventListener("click", () => openCapaModal(ctx).then((id) => id && ctx.navigate("/smk3/capa/" + id)).catch((e) => toast(errorMessage(e), "kritis")));
  el.querySelector("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.tab; el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b)); paint(); };
  el.querySelector("#search").oninput = (e) => { search = e.target.value; paint(); };
  body.onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) ctx.navigate("/smk3/capa/" + tr.dataset.id); };

  const col = collection(db, "companies", cid, "capa");
  const unsubs = [onSnapshot(query(col, where("assigneeUid", "==", ctx.user.uid)), (s) => { mine = s.docs.map((d) => ({ id: d.id, ...d.data() })); paint(); },
    (err) => mount(body, html`<tr><td colspan="6" class="msg err">${errorMessage(err)}</td></tr>`))];
  if (viewer) unsubs.push(onSnapshot(query(col, orderBy("dueDate"), limit(1000)), (s) => { all = s.docs.map((d) => ({ id: d.id, ...d.data() })); paint(); },
    (err) => mount(body, html`<tr><td colspan="6" class="msg err">${errorMessage(err)}</td></tr>`)));
  return () => unsubs.forEach((u) => u());
}

/* ================= detail ================= */
function renderDetail(el, ctx, id) {
  const cid = ctx.company.id;
  const ref = doc(db, "companies", cid, "capa", id);
  const admin = can(ctx, K3_ADMIN);
  const actor = { uid: ctx.user.uid, name: ctx.member.name };
  let c = null;

  async function save(patch, info, okMsg) {
    const b = writeBatch(db);
    b.update(ref, { ...patch, updatedAt: serverTimestamp() });
    logInBatch(b, cid, actor, { entity: "capa", entityId: id, ...info });
    await b.commit();
    if (okMsg) toast(okMsg, "normal");
  }
  const run = (p) => Promise.resolve(p).catch((e) => { console.error(e); toast(errorMessage(e), "kritis"); });

  function paint() {
    const mineTask = c.assigneeUid === ctx.user.uid;
    const canProgress = mineTask && ["terbuka", "dikerjakan", "selesai"].includes(c.status);
    const srcRoute = SOURCE_ROUTE[c.sourceType];
    mount(el, html`
      <div class="page-head"><div>
        <a class="tiny" href="#/smk3/capa">← Semua CAPA</a>
        <h1>${c.title}</h1>
        <div class="shift">#${shortId(c.id)} · ${CAPA_TYPE[c.type]} · prioritas ${CAPA_PRIORITY[c.priority]}</div></div>
        <div class="btn-row">${isOverdue(c) ? html`<span class="pill kritis">Terlambat</span>` : ""} ${badge(CAPA_STATUS, c.status)}</div></div>

      <div class="grid two-col">
        <div class="stack">
          <div class="panel">
            <h3>${icon("mdi:clipboard-text-outline")} Rincian</h3>
            <table class="tbl kv">
              <tr><th>Sumber</th><td>${CAPA_SOURCE[c.sourceType]}${c.sourceLabel ? html` — ${srcRoute && c.sourceId ? html`<a href="#${srcRoute}${c.sourceId}">${c.sourceLabel}</a>` : c.sourceLabel}` : ""}</td></tr>
              <tr><th>Penanggung jawab</th><td>${c.assigneeName}</td></tr>
              <tr><th>Tenggat</th><td>${fmtDay(c.dueDate)}</td></tr>
              <tr><th>Dibuat</th><td>${c.createdByName} · ${fmtDateTime(c.createdAt)}</td></tr>
            </table>
            ${c.description ? html`<h4 class="sub-h">Uraian</h4><p class="prewrap">${c.description}</p>` : ""}
            ${admin && !["terverifikasi", "dibatalkan"].includes(c.status) ? html`<div class="btn-row" style="margin-top:.8rem">
              <button class="btn btn-ghost btn-sm" id="editBtn">${icon("mdi:pencil-outline")} Ubah / tugaskan ulang</button>
              <button class="btn btn-ghost btn-sm" id="cancelBtn">Batalkan CAPA</button></div>` : ""}
          </div>

          ${canProgress ? html`<form class="panel" id="progForm">
            <h3>${icon("mdi:progress-check")} Perbarui progres (tugas Anda)</h3>
            <div class="field"><label>Catatan progres</label><textarea name="progressNote" rows="3" maxlength="2000">${c.progressNote || ""}</textarea></div>
            <div class="field"><label>Bukti penyelesaian (uraian, nomor dokumen, atau tautan foto)</label><textarea name="evidence" rows="2" maxlength="2000">${c.evidence || ""}</textarea></div>
            <div class="btn-row">
              <button class="btn btn-ghost" type="submit" data-status="dikerjakan">Simpan — sedang dikerjakan</button>
              <button class="btn btn-primary" type="submit" data-status="selesai">${icon("mdi:check")} Tandai selesai</button>
            </div></form>` : ""}
        </div>

        <div class="stack">
          <div class="panel">
            <h3>${icon("mdi:timeline-check-outline")} Progres &amp; bukti</h3>
            ${c.progressNote ? html`<h4 class="sub-h">Catatan progres</h4><p class="prewrap">${c.progressNote}</p>` : html`<p class="tiny muted">Belum ada catatan progres.</p>`}
            ${c.evidence ? html`<h4 class="sub-h">Bukti</h4><p class="prewrap">${c.evidence}</p>` : ""}
            ${c.completedAt ? html`<p class="tiny muted">Ditandai selesai ${fmtDateTime(c.completedAt)}</p>` : ""}
          </div>
          <div class="panel">
            <h3>${icon("mdi:shield-check-outline")} Verifikasi efektivitas</h3>
            ${c.status === "terverifikasi" ? html`<p><b>${c.effective ? "Efektif" : "Tidak efektif"}</b> — ${c.verificationNote}</p>
              <p class="tiny muted">Diverifikasi oleh ${c.verifiedByName} · ${fmtDateTime(c.verifiedAt)}</p>`
            : admin && c.status === "selesai" ? html`<form id="verForm">
                <div class="field"><label>Hasil verifikasi <span class="req">*</span></label><textarea name="note" rows="3" required maxlength="1000" placeholder="Apa yang diperiksa dan bagaimana hasilnya?"></textarea></div>
                <label class="check"><input type="checkbox" name="effective" checked /> <span>Tindakan efektif mencegah terulangnya masalah</span></label>
                <div class="btn-row" style="margin-top:.8rem">
                  <button class="btn btn-primary" type="submit">Verifikasi &amp; tutup</button>
                  <button class="btn btn-ghost" type="button" id="reopenBtn">Kembalikan ke penanggung jawab</button></div></form>`
            : html`<p class="tiny muted">${c.status === "dibatalkan" ? "CAPA dibatalkan." : "Verifikasi dilakukan Ahli K3/Admin setelah penanggung jawab menandai selesai."}</p>`}
          </div>
        </div>
      </div>`);
    bind();
  }

  function bind() {
    const pf = el.querySelector("#progForm");
    if (pf) pf.onsubmit = (e) => {
      e.preventDefault();
      const status = e.submitter?.dataset.status || "dikerjakan";
      const progressNote = pf.progressNote.value.trim(), evidence = pf.evidence.value.trim();
      if (status === "selesai" && !evidence) return toast("Isi bukti penyelesaian sebelum menandai selesai.", "berisiko");
      const patch = { status, progressNote, evidence };
      if (status === "selesai") patch.completedAt = serverTimestamp();
      run(save(patch, { action: status === "selesai" ? "capa.done" : "capa.progress", summary: `${c.title}: ${status}` }, status === "selesai" ? "Ditandai selesai — menunggu verifikasi." : "Progres disimpan."));
    };
    const vf = el.querySelector("#verForm");
    if (vf) vf.onsubmit = (e) => {
      e.preventDefault();
      run(save({ status: "terverifikasi", effective: vf.effective.checked, verificationNote: vf.note.value.trim(), verifiedBy: ctx.user.uid, verifiedByName: ctx.member.name, verifiedAt: serverTimestamp() },
        { action: "capa.verify", summary: `${c.title}: ${vf.effective.checked ? "efektif" : "tidak efektif"}` }, "CAPA diverifikasi."));
    };
    el.querySelector("#reopenBtn")?.addEventListener("click", () => run(save({ status: "dikerjakan" }, { action: "capa.reopen", summary: `${c.title} dikembalikan ke penanggung jawab` }, "Dikembalikan.")));
    el.querySelector("#cancelBtn")?.addEventListener("click", () => { if (confirm("Batalkan CAPA ini?")) run(save({ status: "dibatalkan" }, { action: "capa.cancel", summary: `${c.title} dibatalkan` }, "CAPA dibatalkan.")); });
    el.querySelector("#editBtn")?.addEventListener("click", async () => {
      const members = await activeMembers(ctx);
      modal({
        title: "Ubah CAPA", body: fieldsHTML(capaFields, c, { members }),
        onSubmit: (form) => { const f = readFields(form, capaFields, { members }); return save(f, { action: "capa.update", summary: `${f.title} → ${f.assigneeName} (tenggat ${f.dueDate})` }, "Tersimpan."); },
      });
    });
  }

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return mount(el, html`<div class="empty-state">${icon("mdi:file-question-outline")}<h2>CAPA tidak ditemukan</h2><a class="btn btn-ghost" href="#/smk3/capa">Kembali</a></div>`);
    c = { id: snap.id, ...snap.data() };
    if (!el.querySelector("form textarea:focus, form input:focus")) paint();
  }, (err) => mount(el, html`<div class="empty-state">${icon("mdi:lock-outline")}<h2>Tidak dapat membuka CAPA</h2><p>${errorMessage(err)}</p></div>`));
}

export default {
  render(el, ctx, params) { return params?.id ? renderDetail(el, ctx, params.id) : renderList(el, ctx); },
};
