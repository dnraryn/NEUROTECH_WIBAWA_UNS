// Insiden & Near Miss — pelaporan, investigasi (5 Why), penutupan, tautan CAPA. (Elemen 8)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { html, mount, icon, modal, toast, errorMessage, fmtDateTime, relTime } from "../core/ui.js";
import { fieldsHTML, readFields, nowLocal } from "../core/form.js";
import {
  INCIDENT_TYPE, INCIDENT_SEVERITY, INCIDENT_STATUS, NOT_WORKER, CAPA_STATUS, badge, opts, shortId, isOverdue,
} from "../smk3/common.js";
import { openCapaModal } from "./smk3-capa.js";
import {
  collection, doc, query, where, orderBy, limit, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STAFF = ["admin", "ahli_k3", "supervisor"];

const reportFields = [
  { name: "type", label: "Jenis kejadian", type: "select", options: opts(INCIDENT_TYPE), required: true, half: true },
  { name: "severity", label: "Tingkat keparahan (aktual/potensi)", type: "select", options: opts(INCIDENT_SEVERITY), required: true, half: true },
  { name: "title", label: "Judul singkat", required: true, max: 160, placeholder: "cth. Operator tergores pisau mesin potong" },
  { name: "occurredAt", label: "Waktu kejadian", type: "datetime", required: true, half: true },
  { name: "location", label: "Lokasi / area", max: 160, half: true, placeholder: "cth. Line Produksi A" },
  { name: "involved", label: "Orang yang terlibat / korban", max: 300, placeholder: "Nama & jabatan (boleh dikosongkan untuk near miss)" },
  { name: "description", label: "Kronologi kejadian", type: "textarea", required: true, max: 4000, rows: 5 },
  { name: "immediateAction", label: "Tindakan segera yang sudah dilakukan", type: "textarea", max: 2000, rows: 3 },
  { name: "lostDays", label: "Hari kerja hilang (untuk kecelakaan/PAK)", type: "number", min: 0, step: 1, half: true, help: "Isi > 0 bila korban tidak dapat bekerja (Lost Time Injury)." },
];

export async function reportIncidentModal(ctx) {
  return modal({
    title: "Laporkan insiden / near miss",
    body: html`<p class="tiny muted">Pelaporan bersifat non-punitif. Semakin cepat dilaporkan, semakin cepat bahaya dikendalikan.</p>
      ${fieldsHTML(reportFields, { occurredAt: nowLocal(), type: "near_miss", severity: "sedang", lostDays: 0 })}`,
    submitLabel: "Kirim laporan",
    onSubmit: async (form) => {
      const f = readFields(form, reportFields);
      const ref = doc(collection(db, "companies", ctx.company.id, "incidents"));
      const b = writeBatch(db);
      b.set(ref, {
        ...f, lostDays: f.lostDays || 0, occurredDate: f.occurredAt.slice(0, 10),
        source: "manual", status: "dilaporkan",
        reportedBy: ctx.user.uid, reportedByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      logInBatch(b, ctx.company.id, { uid: ctx.user.uid, name: ctx.member.name },
        { action: "incident.report", entity: "incident", entityId: ref.id, summary: `${INCIDENT_TYPE[f.type]}: ${f.title}` });
      await b.commit();
      toast("Laporan terkirim. Terima kasih telah melapor.", "normal");
      ctx.navigate("/smk3/insiden/" + ref.id);
    },
  });
}

/* ================= daftar ================= */
async function renderList(el, ctx) {
  const cid = ctx.company.id;
  const staff = can(ctx, NOT_WORKER);
  let rows = [], tab = staff ? "aktif" : "saya", typeFilter = "", search = "";

  mount(el, html`
    <div class="page-head"><div><h1>Insiden &amp; Near Miss</h1>
      <div class="shift">Pelaporan bahaya, kecelakaan, dan near miss beserta investigasinya (Elemen 8 PP 50/2012).</div></div>
      <button class="btn btn-primary" id="reportBtn">${icon("mdi:plus")} Laporkan</button></div>
    ${staff ? html`<div class="metrics" style="margin-bottom:1.2rem">
      <div class="metric"><div class="label">Perlu ditindaklanjuti</div><div class="val" style="color:var(--waspada)" id="m-open">–</div></div>
      <div class="metric"><div class="label">Dalam investigasi</div><div class="val" style="color:var(--berisiko)" id="m-inv">–</div></div>
      <div class="metric"><div class="label">Near miss (30 hari)</div><div class="val" id="m-nm">–</div></div>
      <div class="metric"><div class="label">Kecelakaan (30 hari)</div><div class="val" style="color:var(--kritis)" id="m-acc">–</div></div>
    </div>` : ""}
    <div class="toolbar">
      <div class="tabs" id="tabs">${staff
        ? html`<button data-tab="aktif" class="active">Aktif</button><button data-tab="selesai">Selesai</button><button data-tab="semua">Semua</button>`
        : html`<button data-tab="saya" class="active">Laporan saya</button>`}</div>
      <div class="btn-row">
        <select class="search" id="typeF" style="min-width:0"><option value="">Semua jenis</option>${opts(INCIDENT_TYPE).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select>
        <input class="search" id="search" type="search" placeholder="Cari judul, lokasi…" />
      </div>
    </div>
    <div class="panel table-wrap"><table class="tbl">
      <thead><tr><th>Waktu</th><th>Kejadian</th><th>Jenis</th><th>Keparahan</th><th>Lokasi</th><th>Status</th></tr></thead>
      <tbody id="rows"><tr><td colspan="6" class="muted tiny">Memuat…</td></tr></tbody></table></div>`);

  const body = el.querySelector("#rows");
  function paint() {
    const q = search.toLowerCase();
    const list = rows
      .filter((r) => tab === "semua" || tab === "saya" || (tab === "aktif" ? r.status !== "selesai" : r.status === "selesai"))
      .filter((r) => !typeFilter || r.type === typeFilter)
      .filter((r) => !q || [r.title, r.location, r.involved].some((v) => (v || "").toLowerCase().includes(q)));
    if (staff) {
      const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      el.querySelector("#m-open").textContent = rows.filter((r) => r.status === "dilaporkan").length;
      el.querySelector("#m-inv").textContent = rows.filter((r) => r.status === "investigasi").length;
      el.querySelector("#m-nm").textContent = rows.filter((r) => r.type === "near_miss" && r.occurredDate >= since).length;
      el.querySelector("#m-acc").textContent = rows.filter((r) => (r.type === "kecelakaan" || r.type === "pak") && r.occurredDate >= since).length;
    }
    if (!list.length) return mount(body, html`<tr><td colspan="6" class="muted tiny">Belum ada laporan.</td></tr>`);
    mount(body, html`${list.map((r) => html`<tr class="click" data-id="${r.id}">
      <td class="tiny nowrap">${fmtDateTime(new Date(r.occurredAt))}</td>
      <td><b>${r.title}</b> ${r.source === "eeg" ? html`<span class="tag warn">EEG</span>` : ""}<div class="tiny muted">#${shortId(r.id)} · ${r.source === "eeg" ? "Sistem EEG" : r.reportedByName}</div></td>
      <td class="tiny">${INCIDENT_TYPE[r.type]}</td>
      <td>${badge(INCIDENT_SEVERITY, r.severity)}</td>
      <td class="tiny">${r.location || "—"}</td>
      <td>${badge(INCIDENT_STATUS, r.status)}</td></tr>`)}`);
  }

  el.querySelector("#reportBtn").onclick = () => reportIncidentModal(ctx).catch((e) => toast(errorMessage(e), "kritis"));
  el.querySelector("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.tab; el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b)); paint(); };
  el.querySelector("#typeF").onchange = (e) => { typeFilter = e.target.value; paint(); };
  el.querySelector("#search").oninput = (e) => { search = e.target.value; paint(); };
  body.onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) ctx.navigate("/smk3/insiden/" + tr.dataset.id); };

  const col = collection(db, "companies", cid, "incidents");
  const q = staff ? query(col, orderBy("occurredDate", "desc"), limit(500)) : query(col, where("reportedBy", "==", ctx.user.uid));
  return onSnapshot(q, (snap) => {
    rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""));
    paint();
  }, (err) => mount(body, html`<tr><td colspan="6" class="msg err">${errorMessage(err)}</td></tr>`));
}

/* ================= detail ================= */
const WHY = [1, 2, 3, 4, 5];

async function renderDetail(el, ctx, id) {
  const cid = ctx.company.id;
  const staff = can(ctx, STAFF);
  const viewer = can(ctx, NOT_WORKER);
  const ref = doc(db, "companies", cid, "incidents", id);
  const actor = { uid: ctx.user.uid, name: ctx.member.name };
  const unsubs = [];
  let inc = null, capas = [];

  async function save(patch, info, okMsg) {
    const b = writeBatch(db);
    b.update(ref, { ...patch, updatedAt: serverTimestamp() });
    logInBatch(b, cid, actor, { entity: "incident", entityId: id, ...info });
    await b.commit();
    if (okMsg) toast(okMsg, "normal");
  }

  function paint() {
    const r = inc;
    const inv = r.investigation || {};
    const locked = r.status === "selesai";
    mount(el, html`
      <div class="page-head"><div>
        <a class="tiny" href="#/smk3/insiden">← Semua insiden</a>
        <h1>${r.title}</h1>
        <div class="shift">#${shortId(r.id)} · ${INCIDENT_TYPE[r.type]} · dilaporkan ${relTime(r.createdAt)} oleh ${r.source === "eeg" ? "Sistem EEG" : r.reportedByName}</div></div>
        <div class="btn-row">${badge(INCIDENT_SEVERITY, r.severity)} ${badge(INCIDENT_STATUS, r.status)}</div></div>

      <div class="grid two-col">
        <div class="stack">
          <div class="panel">
            <h3>${icon("mdi:file-document-outline")} Laporan</h3>
            <table class="tbl kv">
              <tr><th>Waktu kejadian</th><td>${fmtDateTime(new Date(r.occurredAt))}</td></tr>
              <tr><th>Lokasi</th><td>${r.location || "—"}</td></tr>
              <tr><th>Terlibat / korban</th><td>${r.involved || "—"}</td></tr>
              <tr><th>Hari kerja hilang</th><td>${r.lostDays || 0}${r.lostDays > 0 ? html` <span class="tag warn">LTI</span>` : ""}</td></tr>
            </table>
            <h4 class="sub-h">Kronologi</h4><p class="prewrap">${r.description}</p>
            ${r.immediateAction ? html`<h4 class="sub-h">Tindakan segera</h4><p class="prewrap">${r.immediateAction}</p>` : ""}
            ${r.source === "eeg" ? html`<div class="msg ok" style="margin-top:1rem">${icon("mdi:head-cog-outline")} Dibuat otomatis dari peringatan EEG. Identitas pekerja hanya dapat dilihat Supervisor/Ahli K3/Admin di
              ${can(ctx, STAFF) ? html`<a href="#/eeg/peringatan">Peringatan EEG</a>` : "modul Peringatan EEG"}.</div>` : ""}
            ${staff && !locked ? html`<button class="btn btn-ghost btn-sm" id="editBtn" style="margin-top:.8rem">${icon("mdi:pencil-outline")} Ubah klasifikasi</button>` : ""}
          </div>

          <div class="panel">
            <h3>${icon("mdi:magnify-scan")} Investigasi &amp; analisis akar masalah</h3>
            ${staff && !locked ? html`
              <form id="invForm">
                ${WHY.map((n) => html`<div class="field"><label>Mengapa ${n}?</label><input name="why${n}" maxlength="300" value="${inv.why?.[n - 1] || ""}" /></div>`)}
                <div class="field"><label>Akar masalah <span class="req">*</span></label><textarea name="rootCause" rows="2" maxlength="1000">${inv.rootCause || ""}</textarea></div>
                <div class="field"><label>Faktor penyebab lain (manusia, peralatan, lingkungan, prosedur)</label><textarea name="factors" rows="2" maxlength="1500">${inv.factors || ""}</textarea></div>
                <div class="field"><label>Rekomendasi</label><textarea name="recommendation" rows="2" maxlength="1500">${inv.recommendation || ""}</textarea></div>
                <div class="btn-row">
                  <button class="btn btn-ghost" type="submit">${icon("mdi:content-save-outline")} Simpan investigasi</button>
                  ${r.status === "dilaporkan" ? html`<button class="btn btn-ghost" type="button" id="startInv">Mulai investigasi</button>` : ""}
                  <button class="btn btn-primary" type="button" id="closeBtn">${icon("mdi:check")} Tutup insiden</button>
                </div>
              </form>`
            : inv.rootCause ? html`
              ${(inv.why || []).filter(Boolean).length ? html`<ol class="why-list">${inv.why.filter(Boolean).map((w) => html`<li>${w}</li>`)}</ol>` : ""}
              <h4 class="sub-h">Akar masalah</h4><p class="prewrap">${inv.rootCause}</p>
              ${inv.factors ? html`<h4 class="sub-h">Faktor penyebab</h4><p class="prewrap">${inv.factors}</p>` : ""}
              ${inv.recommendation ? html`<h4 class="sub-h">Rekomendasi</h4><p class="prewrap">${inv.recommendation}</p>` : ""}
              ${r.closedByName ? html`<p class="tiny muted">Ditutup oleh ${r.closedByName} · ${fmtDateTime(r.closedAt)}</p>` : ""}`
            : html`<p class="muted tiny">Belum ada hasil investigasi.</p>`}
          </div>
        </div>

        <div class="panel">
          <h3>${icon("mdi:progress-wrench")} Tindakan perbaikan (CAPA) <span class="count">${capas.length}</span>
            ${can(ctx, NOT_WORKER) ? html`<button class="btn btn-primary btn-sm" style="margin-left:auto" id="capaBtn">${icon("mdi:plus")} Buat CAPA</button>` : ""}</h3>
          ${!viewer ? html`<p class="tiny muted">Tindak lanjut dikelola oleh Supervisor/Ahli K3.</p>`
            : capas.length ? html`<div class="list">${capas.map((c) => html`<a class="list-item" href="#/smk3/capa/${c.id}">
                <div><b>${c.title}</b><div class="tiny muted">${c.assigneeName} · tenggat ${c.dueDate}${isOverdue(c) ? html` <span class="tag warn">TERLAMBAT</span>` : ""}</div></div>
                ${badge(CAPA_STATUS, c.status)}</a>`)}</div>`
            : html`<p class="muted tiny">Belum ada CAPA. Setiap insiden sebaiknya memiliki minimal satu tindakan perbaikan atau pencegahan.</p>`}
        </div>
      </div>`);
    bind();
  }

  function invData(form) {
    return {
      why: WHY.map((n) => form["why" + n].value.trim()),
      rootCause: form.rootCause.value.trim(), factors: form.factors.value.trim(), recommendation: form.recommendation.value.trim(),
      investigator: ctx.user.uid, investigatorName: ctx.member.name,
    };
  }

  function bind() {
    const form = el.querySelector("#invForm");
    const run = (p) => p.catch((e) => { console.error(e); toast(errorMessage(e), "kritis"); });
    if (form) {
      form.onsubmit = (e) => { e.preventDefault(); run(save({ investigation: invData(form), status: inc.status === "dilaporkan" ? "investigasi" : inc.status },
        { action: "incident.investigate", summary: `Investigasi diperbarui: ${inc.title}` }, "Investigasi disimpan.")); };
      el.querySelector("#startInv")?.addEventListener("click", () => run(save({ status: "investigasi" }, { action: "incident.investigate", summary: `Investigasi dimulai: ${inc.title}` })));
      el.querySelector("#closeBtn").onclick = () => {
        const data = invData(form);
        if (!data.rootCause) return toast("Isi akar masalah sebelum menutup insiden.", "berisiko");
        if (!capas.length && inc.type !== "kondisi_tidak_aman" && !confirm("Belum ada CAPA untuk insiden ini. Tetap tutup?")) return;
        run(save({ investigation: data, status: "selesai", closedBy: ctx.user.uid, closedByName: ctx.member.name, closedAt: serverTimestamp() },
          { action: "incident.close", summary: `Insiden ditutup: ${inc.title}` }, "Insiden ditutup."));
      };
    }
    el.querySelector("#editBtn")?.addEventListener("click", () => {
      const fields = reportFields.filter((f) => ["type", "severity", "title", "location", "involved", "lostDays"].includes(f.name));
      modal({
        title: "Ubah klasifikasi", body: fieldsHTML(fields, inc),
        onSubmit: (fm) => { const f = readFields(fm, fields); return save({ ...f, lostDays: f.lostDays || 0 }, { action: "incident.update", summary: `Klasifikasi diubah: ${f.title}` }, "Tersimpan."); },
      });
    });
    el.querySelector("#capaBtn")?.addEventListener("click", () => openCapaModal(ctx, {
      sourceType: "insiden", sourceId: id, sourceLabel: `Insiden #${shortId(id)} — ${inc.title}`,
      title: inc.investigation?.recommendation ? inc.investigation.recommendation.slice(0, 150) : "",
      type: "korektif", priority: inc.severity === "berat" || inc.severity === "fatal" ? "tinggi" : "sedang",
    }).catch((e) => toast(errorMessage(e), "kritis")));
  }

  unsubs.push(onSnapshot(ref, (snap) => {
    if (!snap.exists()) return mount(el, html`<div class="empty-state">${icon("mdi:file-question-outline")}<h2>Laporan tidak ditemukan</h2><a class="btn btn-ghost" href="#/smk3/insiden">Kembali</a></div>`);
    inc = { id: snap.id, ...snap.data() };
    if (!el.querySelector("#invForm textarea:focus, #invForm input:focus")) paint();
  }, (err) => mount(el, html`<div class="empty-state">${icon("mdi:lock-outline")}<h2>Tidak dapat membuka laporan</h2><p>${errorMessage(err)}</p></div>`)));

  if (viewer) unsubs.push(onSnapshot(query(collection(db, "companies", cid, "capa"), where("sourceId", "==", id)), (snap) => {
    capas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (inc && !el.querySelector("#invForm textarea:focus, #invForm input:focus")) paint();
  }, (e) => console.warn(e)));

  return () => unsubs.forEach((u) => u());
}

export default {
  render(el, ctx, params) {
    return params?.id ? renderDetail(el, ctx, params.id) : renderList(el, ctx);
  },
};
