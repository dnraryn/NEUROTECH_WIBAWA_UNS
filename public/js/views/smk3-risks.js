// Register Risiko (HIRADC) — identifikasi bahaya, penilaian L×S, hierarki pengendalian, risiko sisa.
// Integrasi EEG: saran nilai kemungkinan untuk bahaya kognitif dari agregat EEG anonim 3 bulan terakhir.
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { html, mount, icon, modal, toast, errorMessage } from "../core/ui.js";
import { fieldsHTML, readFields, addMonths, today, fmtDay } from "../core/form.js";
import {
  RISK_CATEGORY, LIKELIHOOD, SEVERITY, HIERARCHY, K3_ADMIN, NOT_WORKER, riskLevel, opts, groupKey,
} from "../smk3/common.js";
import { openCapaModal } from "./smk3-capa.js";
import {
  collection, doc, query, orderBy, onSnapshot, getDocs, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STATUS = { aktif: "Aktif", ditinjau: "Perlu ditinjau", ditutup: "Ditutup" };
const CONDITION = { rutin: "Rutin", non_rutin: "Non-rutin", darurat: "Darurat" };
const num = (o) => Object.entries(o).map(([k, v]) => [k, v]);

const riskFields = [
  { name: "area", label: "Area / aktivitas", required: true, max: 160, half: true, placeholder: "cth. Pengoperasian forklift" },
  { name: "condition", label: "Kondisi", type: "select", options: opts(CONDITION), half: true },
  { name: "hazard", label: "Bahaya (sumber)", required: true, max: 300, placeholder: "cth. Kelelahan mental operator shift malam" },
  { name: "risk", label: "Risiko (akibat)", required: true, max: 500, placeholder: "cth. Microsleep → tabrakan forklift" },
  { name: "category", label: "Kategori bahaya", type: "select", options: opts(RISK_CATEGORY), required: true, half: true },
  { name: "position", label: "Jabatan terkait (untuk data EEG)", max: 80, half: true, placeholder: "cth. Operator Forklift" },
  { name: "existingControls", label: "Pengendalian yang ada", type: "textarea", rows: 2, max: 1500 },
  { name: "likelihood", label: "Kemungkinan (awal)", type: "select", options: num(LIKELIHOOD), required: true, half: true },
  { name: "severity", label: "Keparahan (awal)", type: "select", options: num(SEVERITY), required: true, half: true },
  { name: "hierarchy", label: "Hierarki pengendalian tambahan", type: "select", options: opts(HIERARCHY), placeholder: "— Pilih —" },
  { name: "additionalControls", label: "Pengendalian tambahan", type: "textarea", rows: 2, max: 1500 },
  { name: "residualL", label: "Kemungkinan (sisa)", type: "select", options: num(LIKELIHOOD), required: true, half: true },
  { name: "residualS", label: "Keparahan (sisa)", type: "select", options: num(SEVERITY), required: true, half: true },
  { name: "owner", label: "Penanggung jawab", max: 120, half: true },
  { name: "reviewDate", label: "Tanggal tinjau berikutnya", type: "date", half: true },
  { name: "status", label: "Status", type: "select", options: opts(STATUS), required: true },
];

/** Saran kemungkinan dari agregat EEG (persentase waktu berisiko/kritis & microsleep per 100 jam). */
export function eegSuggestion(stat) {
  if (!stat || !stat.minutes) return null;
  const riskPct = ((stat.berisikoMin || 0) + (stat.kritisMin || 0)) / stat.minutes * 100;
  const msPer100h = (stat.microsleep || 0) / (stat.minutes / 60) * 100;
  let l = riskPct < 2 ? 1 : riskPct < 5 ? 2 : riskPct < 10 ? 3 : riskPct < 20 ? 4 : 5;
  if (msPer100h >= 1) l = Math.min(5, l + 1);
  return { likelihood: l, riskPct: Math.round(riskPct * 10) / 10, msPer100h: Math.round(msPer100h * 10) / 10, hours: Math.round(stat.minutes / 60) };
}

async function eegAggregate(ctx) {
  if (!can(ctx, NOT_WORKER)) return null;
  const months = [0, 1, 2].map((i) => { const d = new Date(); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); });
  const snap = await getDocs(collection(db, "companies", ctx.company.id, "eegStats"));
  const total = { minutes: 0, berisikoMin: 0, kritisMin: 0, microsleep: 0 }, groups = {};
  snap.docs.filter((d) => months.includes(d.id)).forEach((d) => {
    const s = d.data();
    for (const k of Object.keys(total)) total[k] += s[k] || 0;
    for (const [g, v] of Object.entries(s.groups || {})) {
      const t = (groups[g] ||= { minutes: 0, berisikoMin: 0, kritisMin: 0, microsleep: 0, label: v.label });
      for (const k of ["minutes", "berisikoMin", "kritisMin", "microsleep"]) t[k] += v[k] || 0;
    }
  });
  return { total, groups };
}

export default {
  async render(el, ctx) {
    const cid = ctx.company.id;
    const admin = can(ctx, K3_ADMIN);
    const actor = { uid: ctx.user.uid, name: ctx.member.name };
    let rows = [], cat = "", lvl = "", search = "", matrixMode = "awal", eeg = null;

    mount(el, html`
      <div class="page-head"><div><h1>Register Risiko (HIRADC)</h1>
        <div class="shift">Identifikasi bahaya, penilaian &amp; pengendalian risiko (Elemen 2, Lampiran I PP 50/2012).</div></div>
        ${admin ? html`<button class="btn btn-primary" id="newBtn">${icon("mdi:plus")} Tambah risiko</button>` : ""}</div>

      <div class="grid two-col" style="margin-bottom:1.2rem">
        <div class="panel">
          <h3>${icon("mdi:grid")} Matriks risiko
            <div class="tabs small" id="mTabs" style="margin-left:auto"><button data-m="awal" class="active">Awal</button><button data-m="sisa">Sisa</button></div></h3>
          <div id="matrix"></div>
        </div>
        <div class="panel" id="eegPanel">
          <h3>${icon("mdi:head-cog-outline")} Masukan dari data EEG (3 bulan)</h3>
          <div id="eegBody" class="tiny muted">${can(ctx, NOT_WORKER) ? "Memuat…" : "Data agregat EEG hanya tersedia untuk staf K3."}</div>
        </div>
      </div>

      <div class="toolbar">
        <div class="btn-row">
          <select class="search" id="catF" style="min-width:0"><option value="">Semua kategori</option>${opts(RISK_CATEGORY).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select>
          <select class="search" id="lvlF" style="min-width:0"><option value="">Semua tingkat</option><option value="ekstrem">Ekstrem</option><option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option></select>
        </div>
        <input class="search" id="search" type="search" placeholder="Cari area, bahaya…" />
      </div>
      <div class="panel table-wrap"><table class="tbl">
        <thead><tr><th>Area / bahaya</th><th>Kategori</th><th>Awal</th><th>Pengendalian</th><th>Sisa</th><th>Tinjau</th><th>Status</th></tr></thead>
        <tbody id="rows"><tr><td colspan="7" class="muted tiny">Memuat…</td></tr></tbody></table></div>`);

    const $ = (s) => el.querySelector(s);
    const scoreOf = (r, mode) => mode === "sisa" ? r.residualL * r.residualS : r.likelihood * r.severity;

    function paintMatrix() {
      const counts = {};
      rows.filter((r) => r.status !== "ditutup").forEach((r) => {
        const l = matrixMode === "sisa" ? r.residualL : r.likelihood, s = matrixMode === "sisa" ? r.residualS : r.severity;
        counts[`${l}-${s}`] = (counts[`${l}-${s}`] || 0) + 1;
      });
      mount($("#matrix"), html`<div class="rmatrix">
        <div class="rm-ylabel">Kemungkinan →</div>
        ${[5, 4, 3, 2, 1].map((l) => html`<div class="rm-row"><div class="rm-axis">${l}</div>
          ${[1, 2, 3, 4, 5].map((s) => { const lv = riskLevel(l * s); const n = counts[`${l}-${s}`]; return html`<div class="rm-cell ${lv.cls}" title="${lv.label} (${l}×${s})">${n || ""}</div>`; })}</div>`)}
        <div class="rm-row"><div class="rm-axis"></div>${[1, 2, 3, 4, 5].map((s) => html`<div class="rm-axis">${s}</div>`)}</div>
        <div class="tiny muted center">Keparahan →</div></div>`);
    }

    function paintEeg() {
      const box = $("#eegBody"); if (!box || !eeg) return;
      const sug = eegSuggestion(eeg.total);
      if (!sug) return mount(box, html`Belum ada data sesi EEG (headband Muse) dalam 3 bulan terakhir. Sesi simulasi tidak dihitung.`);
      const cogn = rows.filter((r) => r.category === "kognitif" && r.status !== "ditutup");
      mount(box, html`
        <div class="mini"><div><b>${sug.hours}</b><span>jam dipantau</span></div><div><b>${sug.riskPct}%</b><span>waktu berisiko+</span></div><div><b>${sug.msPer100h}</b><span>microsleep /100 jam</span></div></div>
        <p style="margin-top:.8rem">Saran nilai <b>kemungkinan</b> bahaya kognitif perusahaan: <b>${LIKELIHOOD[sug.likelihood]}</b>.</p>
        ${cogn.length ? html`<table class="tbl" style="margin-top:.4rem"><tbody>${cogn.map((r) => {
          const g = r.position && eeg.groups[groupKey(r.position)];
          const s2 = eegSuggestion(g) || sug;
          return html`<tr><td>${r.hazard}<div class="tiny muted">${r.position ? `Jabatan: ${r.position}${g ? "" : " (tanpa data khusus, pakai data perusahaan)"}` : "Data perusahaan"}</div></td>
            <td class="nowrap">saat ini ${r.likelihood} → saran <b>${s2.likelihood}</b></td>
            <td>${admin && s2.likelihood !== r.likelihood ? html`<button class="btn btn-ghost btn-sm" data-apply="${r.id}" data-l="${s2.likelihood}">Terapkan</button>` : ""}</td></tr>`;
        })}</tbody></table>` : html`<p class="tiny muted">Belum ada risiko berkategori "Kognitif". Tambahkan bahaya kelelahan mental agar data EEG dapat diterapkan.</p>`}`);
    }

    function paint() {
      paintMatrix(); paintEeg();
      const q = search.toLowerCase();
      const list = rows
        .filter((r) => !cat || r.category === cat)
        .filter((r) => !lvl || riskLevel(scoreOf(r, "awal")).key === lvl)
        .filter((r) => !q || [r.area, r.hazard, r.risk, r.owner].some((v) => (v || "").toLowerCase().includes(q)))
        .sort((a, b) => scoreOf(b, "sisa") - scoreOf(a, "sisa") || scoreOf(b, "awal") - scoreOf(a, "awal"));
      if (!list.length) return mount($("#rows"), html`<tr><td colspan="7" class="muted tiny">Belum ada risiko terdaftar.</td></tr>`);
      const td = today();
      mount($("#rows"), html`${list.map((r) => {
        const a = riskLevel(scoreOf(r, "awal")), s = riskLevel(scoreOf(r, "sisa"));
        return html`<tr class="click" data-id="${r.id}">
          <td><b>${r.area}</b><div>${r.hazard}</div><div class="tiny muted">${r.risk}</div></td>
          <td class="tiny">${RISK_CATEGORY[r.category]?.split(" (")[0]}</td>
          <td><span class="pill ${a.cls}">${a.label} ${scoreOf(r, "awal")}</span></td>
          <td class="tiny">${r.hierarchy ? html`<b>${HIERARCHY[r.hierarchy]}:</b> ` : ""}${r.additionalControls || r.existingControls || "—"}</td>
          <td><span class="pill ${s.cls}">${s.label} ${scoreOf(r, "sisa")}</span></td>
          <td class="tiny nowrap">${fmtDay(r.reviewDate)}${r.reviewDate && r.reviewDate < td ? html`<div class="tag warn">LEWAT</div>` : ""}</td>
          <td class="tiny">${STATUS[r.status]}</td></tr>`;
      })}`);
    }

    const toInt = (f) => ({ ...f, likelihood: +f.likelihood, severity: +f.severity, residualL: +f.residualL, residualS: +f.residualS });

    function openRisk(r) {
      const editing = !!r;
      if (!admin) {
        const a = riskLevel(r.likelihood * r.severity), s = riskLevel(r.residualL * r.residualS);
        return modal({ title: r.area, body: html`<table class="tbl kv">
          <tr><th>Bahaya</th><td>${r.hazard}</td></tr><tr><th>Risiko</th><td>${r.risk}</td></tr>
          <tr><th>Kategori</th><td>${RISK_CATEGORY[r.category]}</td></tr>
          <tr><th>Tingkat awal</th><td><span class="pill ${a.cls}">${a.label}</span> (${r.likelihood}×${r.severity})</td></tr>
          <tr><th>Pengendalian ada</th><td class="prewrap">${r.existingControls || "—"}</td></tr>
          <tr><th>Pengendalian tambahan</th><td class="prewrap">${r.hierarchy ? HIERARCHY[r.hierarchy] + ": " : ""}${r.additionalControls || "—"}</td></tr>
          <tr><th>Tingkat sisa</th><td><span class="pill ${s.cls}">${s.label}</span> (${r.residualL}×${r.residualS})</td></tr>
          <tr><th>Penanggung jawab</th><td>${r.owner || "—"}</td></tr></table>` });
      }
      const init = r || { condition: "rutin", likelihood: 3, severity: 3, residualL: 2, residualS: 3, status: "aktif", category: "fisik", reviewDate: addMonths(today(), 12) };
      return modal({
        title: editing ? "Ubah risiko" : "Tambah risiko",
        body: html`${fieldsHTML(riskFields, { ...init, likelihood: String(init.likelihood), severity: String(init.severity), residualL: String(init.residualL), residualS: String(init.residualS) })}
          <input type="hidden" name="_rid" value="${r?.id || ""}" />
          <div class="tiny muted" id="scoreHint"></div>
          ${editing ? html`<div class="btn-row" style="margin-top:.8rem"><button type="button" class="btn btn-ghost btn-sm" id="riskCapa">${icon("mdi:progress-wrench")} Buat CAPA untuk pengendalian</button>
            <button type="button" class="btn btn-ghost btn-sm" id="riskDel">${icon("mdi:delete-outline")} Hapus</button></div>` : ""}`,
        submitLabel: editing ? "Simpan" : "Tambahkan",
        onSubmit: async (form) => {
          const f = toInt(readFields(form, riskFields));
          const ref = editing ? doc(db, "companies", cid, "risks", r.id) : doc(collection(db, "companies", cid, "risks"));
          const b = writeBatch(db);
          if (editing) b.update(ref, { ...f, updatedBy: ctx.user.uid, updatedAt: serverTimestamp() });
          else b.set(ref, { ...f, createdBy: ctx.user.uid, createdByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          logInBatch(b, cid, actor, { action: editing ? "risk.update" : "risk.create", entity: "risk", entityId: ref.id,
            summary: `${f.area} — ${f.hazard} (awal ${f.likelihood * f.severity}, sisa ${f.residualL * f.residualS})` });
          await b.commit();
          toast("Register risiko diperbarui.", "normal");
        },
      });
    }

    // interaksi dalam modal risiko (skor langsung, CAPA, hapus)
    const onModal = async (e) => {
      const form = e.target.closest?.("dialog.modal form"); if (!form || !form.elements.likelihood) return;
      if (e.type === "change") {
        const a = riskLevel(form.likelihood.value * form.severity.value), s = riskLevel(form.residualL.value * form.residualS.value);
        const hint = form.querySelector("#scoreHint"); if (hint) hint.textContent = `Skor awal ${form.likelihood.value * form.severity.value} (${a.label}) → sisa ${form.residualL.value * form.residualS.value} (${s.label})`;
      }
      if (e.type === "click" && e.target.closest("#riskCapa")) {
        const r = rows.find((x) => x.id === form._rid.value);
        form.closest("dialog").querySelector("[data-close]").click();
        openCapaModal(ctx, { sourceType: "risiko", sourceId: r?.id, sourceLabel: `Risiko: ${form.area.value} — ${form.hazard.value}`, title: form.additionalControls.value.slice(0, 150), type: "preventif" });
      }
      if (e.type === "click" && e.target.closest("#riskDel")) {
        const r = rows.find((x) => x.id === form._rid.value); if (!r) return;
        if (!confirm("Hapus risiko ini dari register? Pertimbangkan status \"Ditutup\" agar jejak tetap ada.")) return;
        const b = writeBatch(db);
        b.delete(doc(db, "companies", cid, "risks", r.id));
        logInBatch(b, cid, actor, { action: "risk.delete", entity: "risk", entityId: r.id, summary: `${r.area} — ${r.hazard} dihapus` });
        try { await b.commit(); form.closest("dialog").querySelector("[data-close]").click(); toast("Risiko dihapus.", "normal"); } catch (err) { toast(errorMessage(err), "kritis"); }
      }
    };
    document.addEventListener("change", onModal);
    document.addEventListener("click", onModal);

    $("#newBtn")?.addEventListener("click", () => openRisk(null));
    $("#rows").onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) openRisk(rows.find((r) => r.id === tr.dataset.id)); };
    $("#catF").onchange = (e) => { cat = e.target.value; paint(); };
    $("#lvlF").onchange = (e) => { lvl = e.target.value; paint(); };
    $("#search").oninput = (e) => { search = e.target.value; paint(); };
    $("#mTabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; matrixMode = b.dataset.m; el.querySelectorAll("#mTabs button").forEach((x) => x.classList.toggle("active", x === b)); paintMatrix(); };
    $("#eegPanel").onclick = async (e) => {
      const b = e.target.closest("[data-apply]"); if (!b) return;
      const r = rows.find((x) => x.id === b.dataset.apply); const l = +b.dataset.l;
      const batch = writeBatch(db);
      batch.update(doc(db, "companies", cid, "risks", r.id), { likelihood: l, updatedBy: ctx.user.uid, updatedAt: serverTimestamp() });
      logInBatch(batch, cid, actor, { action: "risk.eeg", entity: "risk", entityId: r.id, summary: `Kemungkinan "${r.hazard}" ${r.likelihood} → ${l} berdasarkan data EEG` });
      try { await batch.commit(); toast("Nilai kemungkinan diperbarui dari data EEG.", "normal"); } catch (err) { toast(errorMessage(err), "kritis"); }
    };

    eegAggregate(ctx).then((d) => { eeg = d; paintEeg(); }).catch((e) => { console.warn(e); const b = $("#eegBody"); if (b) b.textContent = "Data EEG tidak dapat dimuat."; });
    const unsub = onSnapshot(query(collection(db, "companies", cid, "risks"), orderBy("area")), (snap) => {
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      paint();
    }, (err) => mount($("#rows"), html`<tr><td colspan="7" class="msg err">${errorMessage(err)}</td></tr>`));
    return () => { unsub(); document.removeEventListener("change", onModal); document.removeEventListener("click", onModal); };
  },
};
