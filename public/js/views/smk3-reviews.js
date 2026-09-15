// Tinjauan Manajemen — Pasal 15 PP 50/2012: peninjauan kebijakan, perencanaan, pelaksanaan, pemantauan & evaluasi;
// masukan data otomatis; keputusan → CAPA; notulen cetak. (Elemen 1.3)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { activeMembers } from "../core/members.js";
import { html, mount, icon, modal, toast, errorMessage, fmtDateTime } from "../core/ui.js";
import { fieldsHTML, readFields, today, addDays, fmtDay } from "../core/form.js";
import { CAPA_STATUS, badge, shortId } from "../smk3/common.js";
import { loadKpi } from "./smk3-kpi.js";
import {
  collection, doc, query, orderBy, onSnapshot, writeBatch, serverTimestamp, where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const EDITORS = ["admin", "ahli_k3", "manajemen"];
const STATUS = { draft: { label: "Draf", cls: "waspada" }, final: { label: "Final", cls: "normal" } };

export const REVIEW_AREAS = [
  ["kebijakan", "Kebijakan K3", "Apakah kebijakan K3 masih sesuai dengan kondisi perusahaan dan peraturan?"],
  ["perencanaan", "Perencanaan K3", "Apakah sasaran, program, dan register risiko masih relevan dan tercapai?"],
  ["pelaksanaan", "Pelaksanaan rencana K3", "Kecukupan SDM, kompetensi, prosedur, dan sumber daya."],
  ["pemantauan", "Pemantauan & evaluasi kinerja", "Hasil KPI, inspeksi, insiden, audit, dan data ergonomi kognitif."],
  ["peningkatan", "Perbaikan & peningkatan", "Status CAPA dan peluang peningkatan kinerja SMK3."],
];
export const TRIGGERS = [
  ["a", "Perubahan peraturan perundang-undangan"], ["b", "Tuntutan pihak terkait dan pasar"], ["c", "Perubahan produk dan kegiatan perusahaan"],
  ["d", "Perubahan struktur organisasi"], ["e", "Perkembangan IPTEK, termasuk epidemiologi"], ["f", "Hasil kajian kecelakaan di tempat kerja"],
  ["g", "Adanya pelaporan"], ["h", "Masukan dari pekerja/buruh"],
];

const newFields = [
  { name: "title", label: "Judul rapat", required: true, max: 160, placeholder: "cth. Tinjauan Manajemen SMK3 Semester I 2026" },
  { name: "date", label: "Tanggal", type: "date", required: true, half: true },
  { name: "chair", label: "Pimpinan rapat", max: 120, half: true },
  { name: "participants", label: "Peserta", type: "textarea", rows: 2, max: 1000 },
];

function renderList(el, ctx) {
  const cid = ctx.company.id;
  const editor = can(ctx, EDITORS);
  let rows = [];
  mount(el, html`
    <div class="page-head"><div><h1>Tinjauan Manajemen</h1>
      <div class="shift">Peninjauan kesesuaian &amp; efektivitas penerapan SMK3 oleh pengusaha (Pasal 15 PP 50/2012).</div></div>
      ${editor ? html`<button class="btn btn-primary" id="newBtn">${icon("mdi:plus")} Tinjauan baru</button>` : ""}</div>
    <div class="panel table-wrap"><table class="tbl">
      <thead><tr><th>Rapat</th><th>Tanggal</th><th>Pimpinan</th><th>Keputusan</th><th>Status</th></tr></thead>
      <tbody id="rows"><tr><td colspan="5" class="muted tiny">Memuat…</td></tr></tbody></table></div>`);
  const body = el.querySelector("#rows");
  el.querySelector("#newBtn")?.addEventListener("click", () => modal({
    title: "Tinjauan manajemen baru", body: fieldsHTML(newFields, { date: today(), chair: "" }),
    onSubmit: async (form) => {
      const f = readFields(form, newFields);
      const ref = doc(collection(db, "companies", cid, "reviews"));
      const b = writeBatch(db);
      b.set(ref, { ...f, status: "draft", areas: {}, triggers: [], decisions: [], inputs: null,
        createdBy: ctx.user.uid, createdByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      logInBatch(b, cid, { uid: ctx.user.uid, name: ctx.member.name }, { action: "review.create", entity: "review", entityId: ref.id, summary: f.title });
      await b.commit();
      ctx.navigate("/smk3/tinjauan/" + ref.id);
    },
  }));
  body.onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) ctx.navigate("/smk3/tinjauan/" + tr.dataset.id); };
  return onSnapshot(query(collection(db, "companies", cid, "reviews"), orderBy("date", "desc")), (s) => {
    rows = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    mount(body, rows.length ? html`${rows.map((r) => html`<tr class="click" data-id="${r.id}"><td><b>${r.title}</b></td><td>${fmtDay(r.date)}</td>
      <td>${r.chair || "—"}</td><td>${(r.decisions || []).length}</td><td>${badge(STATUS, r.status)}</td></tr>`)}`
      : html`<tr><td colspan="5" class="muted tiny">Belum ada tinjauan manajemen.</td></tr>`);
  }, (err) => mount(body, html`<tr><td colspan="5" class="msg err">${errorMessage(err)}</td></tr>`));
}

function renderDetail(el, ctx, id) {
  const cid = ctx.company.id;
  const ref = doc(db, "companies", cid, "reviews", id);
  const actor = { uid: ctx.user.uid, name: ctx.member.name };
  let r = null, capas = [], dirty = false;

  function inputsHTML(i) {
    if (!i) return html`<p class="tiny muted">Belum ada data masukan. Klik "Ambil data terbaru".</p>`;
    return html`<table class="tbl rep"><tbody>
      <tr><th>Periode data</th><td>${i.year}</td><th>Diambil</th><td>${fmtDateTime(i.at)}</td></tr>
      <tr><th>Jam kerja</th><td>${i.totalHours.toLocaleString("id-ID")}</td><th>LTIFR / Severity rate</th><td>${i.ltifr ?? "—"} / ${i.sr ?? "—"}</td></tr>
      <tr><th>Kecelakaan / near miss</th><td>${i.accidents} / ${i.nearMiss}</td><th>Hari kerja hilang</th><td>${i.lostDays}</td></tr>
      <tr><th>CAPA terverifikasi</th><td>${i.capaClosed}/${i.capaTotal} (${i.capaClosure ?? "—"}%)</td><th>CAPA terlambat</th><td>${i.capaOverdue}</td></tr>
      <tr><th>Inspeksi</th><td>${i.inspections} (kepatuhan ${i.inspCompliance ?? "—"}%)</td><th>Audit terakhir</th><td>${i.audit || "—"}</td></tr>
      <tr><th>EEG: jam dipantau</th><td>${i.eegHours}</td><th>EEG: % waktu berisiko+ / microsleep per 100 jam</th><td>${i.eegRiskPct ?? "—"}% / ${i.eegMs ?? "—"}</td></tr>
    </tbody></table>`;
  }

  function paint() {
    const ed = can(ctx, EDITORS) && r.status === "draft";
    mount(el, html`
      <div class="page-head no-print"><div><a class="tiny" href="#/smk3/tinjauan">← Tinjauan manajemen</a>
        <h1>${r.title}</h1><div class="shift">${fmtDay(r.date)} · pimpinan ${r.chair || "—"}</div></div>
        <div class="btn-row">${badge(STATUS, r.status)}
          ${ed ? html`<button class="btn btn-primary" id="finalBtn">${icon("mdi:check")} Finalkan</button>` : ""}
          <button class="btn btn-ghost" id="printBtn">${icon("mdi:printer-outline")} Cetak notulen</button></div></div>

      <form id="rvForm" class="stack no-print">
        <div class="panel"><h3>${icon("mdi:database-outline")} Masukan data kinerja
          ${ed ? html`<button type="button" class="btn btn-ghost btn-sm" id="pullBtn" style="margin-left:auto">${icon("mdi:refresh")} Ambil data terbaru</button>` : ""}</h3>
          ${inputsHTML(r.inputs)}
          <p class="tiny muted">Peserta: ${r.participants || "—"}</p></div>

        <div class="panel"><h3>${icon("mdi:alert-decagram-outline")} Pemicu perbaikan (Pasal 15 ayat 4)</h3>
          <div class="check-grid">${TRIGGERS.map(([k, v]) => html`<label class="check"><input type="checkbox" name="t_${k}" ${(r.triggers || []).includes(k) ? "checked" : ""} ${ed ? "" : "disabled"} /> <span>${k}. ${v}</span></label>`)}</div></div>

        <div class="panel"><h3>${icon("mdi:clipboard-text-search-outline")} Hasil peninjauan (Pasal 15 ayat 2)</h3>
          ${REVIEW_AREAS.map(([k, label, hint]) => html`<div class="field"><label>${label}</label>
            ${ed ? html`<textarea name="a_${k}" rows="3" maxlength="3000" placeholder="${hint}">${r.areas?.[k] || ""}</textarea>` : html`<p class="prewrap">${r.areas?.[k] || "—"}</p>`}</div>`)}
          ${ed ? html`<button class="btn btn-ghost" type="submit">${icon("mdi:content-save-outline")} Simpan</button>` : ""}</div>

        <div class="panel"><h3>${icon("mdi:gavel")} Keputusan &amp; tindak lanjut <span class="count">${(r.decisions || []).length}</span>
          ${ed ? html`<button type="button" class="btn btn-primary btn-sm" id="decBtn" style="margin-left:auto">${icon("mdi:plus")} Keputusan</button>` : ""}</h3>
          ${(r.decisions || []).length ? html`<table class="tbl"><thead><tr><th>Keputusan</th><th>PIC</th><th>Tenggat</th><th>CAPA</th></tr></thead><tbody>
            ${r.decisions.map((d, n) => { const c = capas.find((x) => x.id === d.capaId);
              return html`<tr><td>${d.text}</td><td>${d.picName || "—"}</td><td class="nowrap">${fmtDay(d.dueDate)}</td>
                <td>${c ? html`<a href="#/smk3/capa/${c.id}">#${shortId(c.id)}</a> ${badge(CAPA_STATUS, c.status)}` : ed ? html`<button type="button" class="btn btn-ghost btn-sm" data-capa="${n}">+ CAPA</button>` : "—"}</td></tr>`; })}
          </tbody></table>` : html`<p class="tiny muted">Belum ada keputusan.</p>`}
        </div>
      </form>

      <div class="report print-only">
        <div class="report-head"><img src="/assets/logo-mark.png" alt="" /><div><h2>Notulen Tinjauan Manajemen SMK3</h2>
          <div>${ctx.company.name}</div><div class="tiny">${r.title} · ${fmtDay(r.date)}</div></div></div>
        <table class="tbl rep"><tbody><tr><th>Pimpinan rapat</th><td>${r.chair || "—"}</td></tr><tr><th>Peserta</th><td>${r.participants || "—"}</td></tr></tbody></table>
        <h3>1. Masukan data kinerja</h3>${inputsHTML(r.inputs)}
        <h3>2. Pemicu perbaikan</h3><p>${(r.triggers || []).length ? TRIGGERS.filter(([k]) => r.triggers.includes(k)).map(([k, v]) => `${k}. ${v}`).join("; ") : "Tidak ada."}</p>
        <h3>3. Hasil peninjauan</h3>${REVIEW_AREAS.map(([k, label]) => html`<h4 class="sub-h">${label}</h4><p class="prewrap">${r.areas?.[k] || "—"}</p>`)}
        <h3>4. Keputusan</h3>
        ${(r.decisions || []).length ? html`<table class="tbl rep"><thead><tr><th>No</th><th>Keputusan</th><th>PIC</th><th>Tenggat</th></tr></thead><tbody>
          ${r.decisions.map((d, n) => html`<tr><td>${n + 1}</td><td>${d.text}</td><td>${d.picName || "—"}</td><td>${fmtDay(d.dueDate)}</td></tr>`)}</tbody></table>` : html`<p>—</p>`}
        <div class="sign"><div>Notulis,<br /><br /><br /><b>${r.createdByName}</b></div><div>Pimpinan rapat,<br /><br /><br /><b>${r.chair || "__________________"}</b></div></div>
      </div>`);
    bind(ed);
  }

  const collect = (form) => ({
    areas: Object.fromEntries(REVIEW_AREAS.map(([k]) => [k, form[`a_${k}`]?.value.trim() || ""])),
    triggers: TRIGGERS.map(([k]) => k).filter((k) => form[`t_${k}`]?.checked),
  });

  async function save(patch, info, msg) {
    const b = writeBatch(db);
    b.update(ref, { ...patch, updatedAt: serverTimestamp() });
    if (info) logInBatch(b, cid, actor, { entity: "review", entityId: id, ...info });
    await b.commit(); dirty = false;
    if (msg) toast(msg, "normal");
  }
  const run = (p) => p.catch((e) => { console.error(e); toast(errorMessage(e), "kritis"); });

  function bind(ed) {
    el.querySelector("#printBtn").onclick = () => window.print();
    if (!ed) return;
    const form = el.querySelector("#rvForm");
    form.oninput = () => { dirty = true; };
    form.onsubmit = (e) => { e.preventDefault(); run(save(collect(form), null, "Tersimpan.")); };
    el.querySelector("#pullBtn").onclick = async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      try {
        const year = r.date.slice(0, 4);
        const k = await loadKpi(ctx, year);
        const inputs = {
          year, at: Date.now(), totalHours: k.totalHours, ltifr: k.ltifr, sr: k.sr, accidents: k.accidents, nearMiss: k.nearMiss, lostDays: k.lostDays,
          capaTotal: k.capa.total, capaClosed: k.capa.closed, capaClosure: k.capa.closure, capaOverdue: k.capa.overdue,
          inspections: k.inspections.count, inspCompliance: k.inspections.compliance,
          audit: k.lastAudit ? `${k.lastAudit.title}: ${k.lastAudit.score?.percent ?? "—"}% (${k.lastAudit.score?.rating?.label || "—"})` : null,
          eegHours: k.eeg.hours || 0, eegRiskPct: k.eeg.riskPct, eegMs: k.eeg.msPer100h,
        };
        await save({ ...collect(form), inputs }, { action: "review.inputs", summary: `Data masukan diperbarui (${year})` }, "Data masukan diperbarui.");
      } catch (err) { toast(errorMessage(err), "kritis"); btn.disabled = false; }
    };
    el.querySelector("#decBtn").onclick = async () => {
      const members = await activeMembers(ctx);
      const fields = [
        { name: "text", label: "Keputusan / tindak lanjut", type: "textarea", rows: 3, required: true, max: 1000 },
        { name: "pic", label: "PIC", type: "member", nameField: "picName", half: true, required: true },
        { name: "dueDate", label: "Tenggat", type: "date", half: true, required: true },
      ];
      modal({ title: "Tambah keputusan", body: fieldsHTML(fields, { dueDate: addDays(today(), 30) }, { members }),
        onSubmit: (mf) => { const f = readFields(mf, fields, { members });
          return save({ ...collect(form), decisions: [...(r.decisions || []), f] }, { action: "review.decision", summary: f.text.slice(0, 200) }, "Keputusan ditambahkan."); } });
    };
    el.querySelectorAll("[data-capa]").forEach((b) => b.onclick = async () => {
      const n = +b.dataset.capa, d = r.decisions[n];
      const capaId = await openCapaModal(ctx, { sourceType: "tinjauan", sourceId: id, sourceLabel: r.title, title: d.text.slice(0, 160), type: "preventif", priority: "sedang" });
      if (capaId) run(save({ decisions: r.decisions.map((x, i) => (i === n ? { ...x, capaId } : x)) }));
    });
    el.querySelector("#finalBtn").onclick = () => {
      if (!r.inputs) return toast("Ambil data masukan terlebih dahulu.", "berisiko");
      if (!confirm("Finalkan tinjauan? Notulen akan dikunci.")) return;
      run(save({ ...collect(form), status: "final", finalizedAt: serverTimestamp() }, { action: "review.final", summary: `${r.title} difinalkan (${(r.decisions || []).length} keputusan)` }, "Tinjauan difinalkan."));
    };
  }

  ctx.setLeaveGuard(() => (dirty ? "Perubahan tinjauan belum disimpan. Tinggalkan halaman?" : null));
  const unsubs = [
    onSnapshot(ref, (snap) => {
      if (!snap.exists()) return mount(el, html`<div class="empty-state"><h2>Tinjauan tidak ditemukan</h2></div>`);
      r = { id: snap.id, ...snap.data() };
      if (!dirty) paint();
    }, (err) => mount(el, html`<div class="empty-state"><h2>Tidak dapat membuka tinjauan</h2><p>${errorMessage(err)}</p></div>`)),
    onSnapshot(query(collection(db, "companies", cid, "capa"), where("sourceId", "==", id)), (s) => { capas = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (r && !dirty) paint(); }, () => {}),
  ];
  return () => unsubs.forEach((u) => u());
}

// modal CAPA dimuat terpisah untuk menghindari impor melingkar
async function openCapaModal(ctx, preset) { return (await import("./smk3-capa.js")).openCapaModal(ctx, preset); }

export default {
  render(el, ctx, params) { return params?.id ? renderDetail(el, ctx, params.id) : renderList(el, ctx); },
};
