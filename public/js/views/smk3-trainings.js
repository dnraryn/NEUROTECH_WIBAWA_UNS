// Pelatihan & Kompetensi — katalog, catatan pelatihan/sertifikat, matriks kompetensi per jabatan. (Elemen 12)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { activeMembers } from "../core/members.js";
import { html, mount, icon, modal, toast, errorMessage } from "../core/ui.js";
import { fieldsHTML, readFields, today, addMonths, fmtDay } from "../core/form.js";
import { TRAINING_CATEGORY, NOT_WORKER, K3_ADMIN, trainingStatus, opts } from "../smk3/common.js";
import {
  collection, doc, query, where, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const trainingFields = [
  { name: "name", label: "Nama pelatihan", required: true, max: 160, placeholder: "cth. Operator Forklift (SIO)" },
  { name: "category", label: "Kategori", type: "select", options: opts(TRAINING_CATEGORY), required: true, half: true },
  { name: "validityMonths", label: "Masa berlaku (bulan, 0 = tanpa batas)", type: "number", min: 0, max: 240, step: 1, required: true, half: true },
  { name: "requiredForText", label: "Wajib untuk jabatan (pisahkan koma, * = semua pekerja)", max: 500, placeholder: "cth. Operator Forklift, Supervisor Gudang" },
  { name: "description", label: "Keterangan / dasar hukum", type: "textarea", rows: 2, max: 1000 },
];
const recordFields = [
  { name: "uid", label: "Peserta", type: "member", nameField: "name", required: true },
  { name: "trainingId", label: "Pelatihan", type: "select", required: true, options: [] },
  { name: "date", label: "Tanggal pelaksanaan", type: "date", required: true, half: true },
  { name: "provider", label: "Penyelenggara", max: 160, half: true },
  { name: "certificateNo", label: "Nomor sertifikat / lisensi", max: 80, half: true },
  { name: "expiryDate", label: "Berlaku sampai (kosongkan = hitung otomatis)", type: "date", half: true },
];

const norm = (s) => String(s || "").trim().toLowerCase();
export const isRequired = (t, position) => (t.requiredFor || []).some((r) => r === "*" || (position && norm(r) === norm(position)));
const latestRecord = (records, uid, tid) => records.filter((r) => r.uid === uid && r.trainingId === tid).sort((a, b) => b.date.localeCompare(a.date))[0];

export default {
  async render(el, ctx) {
    const cid = ctx.company.id;
    const viewer = can(ctx, NOT_WORKER), admin = can(ctx, K3_ADMIN);
    const actor = { uid: ctx.user.uid, name: ctx.member.name };
    let trainings = [], records = [], members = [], tab = viewer ? "matriks" : "saya";

    mount(el, html`
      <div class="page-head"><div><h1>Pelatihan &amp; Kompetensi</h1>
        <div class="shift">Pengembangan keterampilan dan kemampuan K3 (Elemen 12 PP 50/2012).</div></div>
        <div class="btn-row">
          ${admin ? html`<button class="btn btn-ghost" id="newTr">${icon("mdi:plus")} Jenis pelatihan</button>
          <button class="btn btn-primary" id="newRec">${icon("mdi:certificate-outline")} Catat pelatihan</button>` : ""}</div></div>
      ${viewer ? html`<div class="metrics" style="margin-bottom:1.2rem">
        <div class="metric"><div class="label">Kepatuhan kompetensi</div><div class="val" id="m-comp">–</div></div>
        <div class="metric"><div class="label">Kedaluwarsa / belum</div><div class="val" style="color:var(--kritis)" id="m-gap">–</div></div>
        <div class="metric"><div class="label">Habis ≤ 60 hari</div><div class="val" style="color:var(--waspada)" id="m-soon">–</div></div>
      </div>` : ""}
      <div class="toolbar"><div class="tabs" id="tabs">
        ${viewer ? html`<button data-tab="matriks" class="active">Matriks kompetensi</button><button data-tab="catatan">Catatan pelatihan</button>` : ""}
        <button data-tab="saya" class="${viewer ? "" : "active"}">Pelatihan saya</button>
        <button data-tab="katalog">Katalog</button></div></div>
      <div id="body"><div class="loading-view"><span class="spinner"></span></div></div>`);
    const body = el.querySelector("#body");

    function stats() {
      let need = 0, ok = 0, gap = 0, soon = 0;
      for (const m of members) for (const t of trainings) {
        if (!isRequired(t, m.position)) continue;
        need++;
        const st = trainingStatus(latestRecord(records, m.uid, t.id));
        if (st.key === "valid") ok++; else if (st.key === "segera") { ok++; soon++; } else gap++;
      }
      return { pct: need ? Math.round((ok / need) * 100) : null, gap, soon };
    }

    function paint() {
      if (viewer) { const s = stats(); el.querySelector("#m-comp").textContent = s.pct == null ? "—" : s.pct + "%"; el.querySelector("#m-gap").textContent = s.gap; el.querySelector("#m-soon").textContent = s.soon; }
      if (tab === "matriks") {
        const reqT = trainings.filter((t) => (t.requiredFor || []).length);
        mount(body, reqT.length && members.length ? html`<div class="panel table-wrap"><table class="tbl matrix">
          <thead><tr><th>Pekerja</th>${reqT.map((t) => html`<th title="${t.name}">${t.name}</th>`)}</tr></thead>
          <tbody>${members.map((m) => html`<tr><td><b>${m.name}</b><div class="tiny muted">${m.position || "—"}</div></td>
            ${reqT.map((t) => { if (!isRequired(t, m.position)) return html`<td class="na">—</td>`;
              const r = latestRecord(records, m.uid, t.id), st = trainingStatus(r);
              return html`<td><span class="pill ${st.cls}">${st.label}</span>${r?.expiryDate ? html`<div class="tiny muted">s.d. ${fmtDay(r.expiryDate)}</div>` : ""}</td>`; })}</tr>`)}
          </tbody></table></div>`
          : html`<div class="panel tiny muted">Tambahkan jenis pelatihan beserta jabatan yang wajib mengikutinya untuk melihat matriks kompetensi.</div>`);
      } else if (tab === "catatan" || tab === "saya") {
        const list = (tab === "saya" ? records.filter((r) => r.uid === ctx.user.uid) : records).slice().sort((a, b) => b.date.localeCompare(a.date));
        const mineReq = tab === "saya" ? trainings.filter((t) => isRequired(t, ctx.member.position)) : [];
        mount(body, html`
          ${tab === "saya" ? html`<div class="panel" style="margin-bottom:1rem"><h3>${icon("mdi:clipboard-check-outline")} Wajib untuk jabatan Anda (${ctx.member.position || "—"})</h3>
            ${mineReq.length ? html`<table class="tbl"><tbody>${mineReq.map((t) => { const st = trainingStatus(latestRecord(records, ctx.user.uid, t.id));
              return html`<tr><td>${t.name}</td><td><span class="pill ${st.cls}">${st.label}</span></td></tr>`; })}</tbody></table>` : html`<p class="tiny muted">Tidak ada pelatihan wajib yang terdaftar untuk jabatan Anda.</p>`}</div>` : ""}
          <div class="panel table-wrap"><table class="tbl">
            <thead><tr>${tab === "catatan" ? html`<th>Peserta</th>` : ""}<th>Pelatihan</th><th>Tanggal</th><th>Sertifikat</th><th>Berlaku s.d.</th><th>Status</th>${admin && tab === "catatan" ? html`<th></th>` : ""}</tr></thead>
            <tbody>${list.length ? list.map((r) => { const st = trainingStatus(r); return html`<tr>
              ${tab === "catatan" ? html`<td>${r.name}</td>` : ""}<td>${r.trainingName}<div class="tiny muted">${r.provider || ""}</div></td>
              <td class="nowrap">${fmtDay(r.date)}</td><td class="tiny">${r.certificateNo || "—"}</td><td class="nowrap">${r.expiryDate ? fmtDay(r.expiryDate) : "Tanpa batas"}</td>
              <td><span class="pill ${st.cls}">${st.label}</span></td>
              ${admin && tab === "catatan" ? html`<td class="actions"><button class="icon-btn danger" title="Hapus" data-del="${r.id}">${icon("mdi:delete-outline")}</button></td>` : ""}</tr>`; })
              : html`<tr><td colspan="7" class="muted tiny">Belum ada catatan pelatihan.</td></tr>`}</tbody></table></div>`);
      } else {
        mount(body, html`<div class="panel table-wrap"><table class="tbl">
          <thead><tr><th>Pelatihan</th><th>Kategori</th><th>Masa berlaku</th><th>Wajib untuk</th>${admin ? html`<th></th>` : ""}</tr></thead>
          <tbody>${trainings.length ? trainings.map((t) => html`<tr><td><b>${t.name}</b><div class="tiny muted">${t.description || ""}</div></td>
            <td class="tiny">${TRAINING_CATEGORY[t.category]}</td><td>${t.validityMonths ? `${t.validityMonths} bulan` : "Tanpa batas"}</td>
            <td class="tiny">${(t.requiredFor || []).map((r) => (r === "*" ? "Semua pekerja" : r)).join(", ") || "—"}</td>
            ${admin ? html`<td class="actions"><button class="icon-btn" title="Ubah" data-edit="${t.id}">${icon("mdi:pencil-outline")}</button></td>` : ""}</tr>`)
            : html`<tr><td colspan="5" class="muted tiny">Katalog pelatihan masih kosong.</td></tr>`}</tbody></table></div>`);
      }
    }

    function trainingModal(t) {
      return modal({
        title: t ? "Ubah jenis pelatihan" : "Jenis pelatihan baru",
        body: fieldsHTML(trainingFields, t ? { ...t, requiredForText: (t.requiredFor || []).join(", ") } : { category: "k3_umum", validityMonths: 12 }),
        onSubmit: async (form) => {
          const f = readFields(form, trainingFields);
          const data = { name: f.name, category: f.category, validityMonths: Math.round(f.validityMonths || 0), description: f.description,
            requiredFor: f.requiredForText.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 50), updatedAt: serverTimestamp() };
          const ref = t ? doc(db, "companies", cid, "trainings", t.id) : doc(collection(db, "companies", cid, "trainings"));
          const b = writeBatch(db);
          t ? b.update(ref, data) : b.set(ref, { ...data, createdBy: ctx.user.uid, createdAt: serverTimestamp() });
          logInBatch(b, cid, actor, { action: t ? "training.update" : "training.create", entity: "training", entityId: ref.id, summary: data.name });
          await b.commit();
          toast("Katalog pelatihan disimpan.", "normal");
        },
      });
    }

    async function recordModal() {
      const mem = await activeMembers(ctx);
      const fields = recordFields.map((f) => (f.name === "trainingId" ? { ...f, options: trainings.map((t) => [t.id, t.name]) } : f));
      if (!trainings.length) return toast("Tambahkan jenis pelatihan terlebih dahulu.", "berisiko");
      return modal({
        title: "Catat pelatihan", body: fieldsHTML(fields, { date: today() }, { members: mem }),
        onSubmit: async (form) => {
          const f = readFields(form, fields, { members: mem });
          const t = trainings.find((x) => x.id === f.trainingId);
          const expiryDate = f.expiryDate || (t.validityMonths ? addMonths(f.date, t.validityMonths) : "");
          const ref = doc(collection(db, "companies", cid, "trainingRecords"));
          const b = writeBatch(db);
          b.set(ref, { ...f, expiryDate, trainingName: t.name, createdBy: ctx.user.uid, createdAt: serverTimestamp() });
          logInBatch(b, cid, actor, { action: "training.record", entity: "training", entityId: ref.id, summary: `${f.name}: ${t.name} (${f.date})` });
          await b.commit();
          toast("Catatan pelatihan disimpan.", "normal");
        },
      });
    }

    el.querySelector("#newTr")?.addEventListener("click", () => trainingModal(null));
    el.querySelector("#newRec")?.addEventListener("click", () => recordModal().catch((e) => toast(errorMessage(e), "kritis")));
    el.querySelector("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.tab; el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b)); paint(); };
    body.onclick = async (e) => {
      const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
      if (ed) trainingModal(trainings.find((t) => t.id === ed.dataset.edit));
      if (del && confirm("Hapus catatan pelatihan ini?")) {
        const r = records.find((x) => x.id === del.dataset.del);
        const b = writeBatch(db);
        b.delete(doc(db, "companies", cid, "trainingRecords", r.id));
        logInBatch(b, cid, actor, { action: "training.record.delete", entity: "training", entityId: r.id, summary: `${r.name}: ${r.trainingName} dihapus` });
        try { await b.commit(); } catch (err) { toast(errorMessage(err), "kritis"); }
      }
    };

    if (viewer) members = await activeMembers(ctx).catch(() => []);
    const recQ = viewer ? collection(db, "companies", cid, "trainingRecords") : query(collection(db, "companies", cid, "trainingRecords"), where("uid", "==", ctx.user.uid));
    const unsubs = [
      onSnapshot(collection(db, "companies", cid, "trainings"), (s) => { trainings = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)); paint(); },
        (err) => mount(body, html`<div class="msg err">${errorMessage(err)}</div>`)),
      onSnapshot(recQ, (s) => { records = s.docs.map((d) => ({ id: d.id, ...d.data() })); paint(); }, (err) => console.warn(err)),
    ];
    return () => unsubs.forEach((u) => u());
  },
};
