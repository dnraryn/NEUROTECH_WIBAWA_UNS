// Audit internal SMK3 — 166 kriteria Lampiran II PP 50/2012, penilaian per tingkat, skor & kategori temuan,
// temuan → CAPA, laporan cetak. (Elemen 11)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { html, mount, icon, modal, toast, errorMessage } from "../core/ui.js";
import { fieldsHTML, readFields, today, fmtDay } from "../core/form.js";
import { AUDIT_ELEMENTS, LEVELS, criteriaForLevel } from "../smk3/criteria.js";
import { AUDIT_RESULT, AUDIT_STATUS, badge, critKey, auditScore, shortId, CAPA_STATUS } from "../smk3/common.js";
import { openCapaModal } from "./smk3-capa.js";
import {
  collection, doc, query, orderBy, onSnapshot, writeBatch, updateDoc, serverTimestamp, where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const AUDITORS = ["admin", "ahli_k3", "auditor"];
const levelLabel = (k) => LEVELS.find((l) => l.key === k)?.label || k;

const auditFields = [
  { name: "title", label: "Judul audit", required: true, max: 160, placeholder: "cth. Audit Internal SMK3 Semester I 2026" },
  { name: "level", label: "Tingkat penilaian", type: "select", required: true, half: true,
    options: LEVELS.map((l) => [l.key, `${l.label} (${l.count} kriteria)`]) },
  { name: "auditDate", label: "Tanggal audit", type: "date", required: true, half: true },
  { name: "auditors", label: "Tim auditor", max: 300, placeholder: "Nama auditor internal" },
  { name: "scope", label: "Ruang lingkup", type: "textarea", rows: 2, max: 1000, placeholder: "Lokasi, departemen, dan periode yang diaudit" },
];

function renderList(el, ctx) {
  const cid = ctx.company.id;
  const canAudit = can(ctx, AUDITORS);
  let rows = [];

  mount(el, html`
    <div class="page-head"><div><h1>Audit SMK3</h1>
      <div class="shift">Audit internal berdasarkan 12 elemen &amp; 166 kriteria Lampiran II PP No. 50 Tahun 2012.</div></div>
      ${canAudit ? html`<button class="btn btn-primary" id="newBtn">${icon("mdi:plus")} Audit baru</button>` : ""}</div>
    <div class="grid two-col" style="margin-bottom:1.2rem">
      <div class="panel"><h3>${icon("mdi:stairs")} Tingkat penerapan</h3>
        <table class="tbl"><thead><tr><th>Tingkat</th><th>Kriteria</th><th>Keterangan</th></tr></thead><tbody>
          <tr><td>Awal</td><td>64</td><td class="tiny">Kolom 3 Tabel 1</td></tr>
          <tr><td>Transisi</td><td>122</td><td class="tiny">Seluruh kriteria awal + transisi</td></tr>
          <tr><td>Lanjutan</td><td>166</td><td class="tiny">Seluruh kriteria</td></tr></tbody></table></div>
      <div class="panel"><h3>${icon("mdi:scale-balance")} Ketentuan penilaian</h3>
        <p class="tiny">Pencapaian 0–59% <b>kurang</b> · 60–84% <b>baik</b> · 85–100% <b>memuaskan</b>.
        Temuan <b>kritikal</b> (mengakibatkan fatality) atau <b>mayor</b> (tidak memenuhi peraturan, tidak melaksanakan prinsip SMK3, atau minor berulang di beberapa lokasi)
        berarti perusahaan dinilai <b>belum berhasil menerapkan SMK3</b>. Temuan <b>minor</b>: ketidakkonsistenan pemenuhan persyaratan.</p></div>
    </div>
    <div class="panel table-wrap"><table class="tbl">
      <thead><tr><th>Audit</th><th>Tanggal</th><th>Tingkat</th><th>Progres</th><th>Pencapaian</th><th>Status</th></tr></thead>
      <tbody id="rows"><tr><td colspan="6" class="muted tiny">Memuat…</td></tr></tbody></table></div>`);

  const body = el.querySelector("#rows");
  function paint() {
    if (!rows.length) return mount(body, html`<tr><td colspan="6" class="muted tiny">Belum ada audit.</td></tr>`);
    mount(body, html`${rows.map((a) => {
      const s = auditScore(criteriaForLevel(a.level), a.results);
      return html`<tr class="click" data-id="${a.id}">
        <td><b>${a.title}</b><div class="tiny muted">${a.auditors || ""}</div></td>
        <td class="nowrap">${fmtDay(a.auditDate)}</td><td>${levelLabel(a.level)}</td>
        <td><div class="progress thin"><i style="width:${(s.assessed / s.total) * 100}%"></i></div><span class="tiny">${s.assessed}/${s.total}</span></td>
        <td><b>${s.percent}%</b> <span class="pill ${s.rating.cls}">${s.rating.label}</span></td>
        <td>${badge(AUDIT_STATUS, a.status)}</td></tr>`;
    })}`);
  }
  el.querySelector("#newBtn")?.addEventListener("click", () => modal({
    title: "Audit baru", body: fieldsHTML(auditFields, { level: "awal", auditDate: today() }),
    onSubmit: async (form) => {
      const f = readFields(form, auditFields);
      const ref = doc(collection(db, "companies", cid, "audits"));
      const b = writeBatch(db);
      b.set(ref, { ...f, status: "rencana", results: {}, createdBy: ctx.user.uid, createdByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      logInBatch(b, cid, { uid: ctx.user.uid, name: ctx.member.name }, { action: "audit.create", entity: "audit", entityId: ref.id, summary: `${f.title} (${levelLabel(f.level)})` });
      await b.commit();
      ctx.navigate("/smk3/audit/" + ref.id);
    },
  }));
  body.onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) ctx.navigate("/smk3/audit/" + tr.dataset.id); };
  return onSnapshot(query(collection(db, "companies", cid, "audits"), orderBy("auditDate", "desc")), (s) => { rows = s.docs.map((d) => ({ id: d.id, ...d.data() })); paint(); },
    (err) => mount(body, html`<tr><td colspan="6" class="msg err">${errorMessage(err)}</td></tr>`));
}

/* ================= pelaksanaan audit ================= */
function renderDetail(el, ctx, id) {
  const cid = ctx.company.id;
  const ref = doc(db, "companies", cid, "audits", id);
  const actor = { uid: ctx.user.uid, name: ctx.member.name };
  let a = null, capas = [], filter = "semua", openEl = new Set([1]), firstPaint = true, printing = false;

  const editable = () => can(ctx, AUDITORS) && a.status !== "selesai";

  function paint() {
    const crit = criteriaForLevel(a.level);
    const inLevel = new Set(crit.map((c) => c.id));
    const s = auditScore(crit, a.results);
    const ed = editable();
    const findings = crit.filter((c) => ["minor", "mayor", "kritikal"].includes(a.results?.[critKey(c.id)]?.r));
    const scrollY = window.scrollY;

    mount(el, html`
      <div class="page-head no-print"><div><a class="tiny" href="#/smk3/audit">← Semua audit</a>
        <h1>${a.title}</h1>
        <div class="shift">${levelLabel(a.level)} · ${fmtDay(a.auditDate)}${a.auditors ? ` · ${a.auditors}` : ""}</div></div>
        <div class="btn-row">${badge(AUDIT_STATUS, a.status)}
          ${ed && a.status === "rencana" ? html`<button class="btn btn-ghost" id="startBtn">Mulai audit</button>` : ""}
          ${ed ? html`<button class="btn btn-primary" id="finishBtn">${icon("mdi:check")} Selesaikan</button>` : ""}
          <button class="btn btn-ghost" id="printBtn">${icon("mdi:printer-outline")} Cetak / PDF</button></div></div>

      <div class="metrics no-print" style="margin-bottom:1.2rem">
        <div class="metric"><div class="label">Pencapaian</div><div class="val">${s.percent}<small>%</small></div><div class="bar"><i style="width:${s.percent}%"></i></div></div>
        <div class="metric"><div class="label">Penilaian</div><div class="val" style="font-size:1.1rem"><span class="pill ${s.rating.cls}">${s.rating.label}</span></div>${s.rating.note ? html`<div class="tiny muted">${s.rating.note}</div>` : ""}</div>
        <div class="metric"><div class="label">Dinilai</div><div class="val">${s.assessed}<small>/${s.total}</small></div></div>
        <div class="metric"><div class="label">Sesuai</div><div class="val" style="color:var(--normal)">${s.sesuai}</div></div>
        <div class="metric"><div class="label">Minor / mayor / kritikal</div><div class="val"><span style="color:var(--waspada)">${s.minor}</span><small> / </small><span style="color:var(--berisiko)">${s.mayor}</span><small> / </small><span style="color:var(--kritis)">${s.kritikal}</span></div></div>
      </div>

      <div class="toolbar no-print"><div class="tabs" id="filter">
        ${[["semua", "Semua"], ["belum", "Belum dinilai"], ["temuan", "Temuan"], ["sesuai", "Sesuai"]].map(([k, v]) => html`<button data-f="${k}" class="${filter === k ? "active" : ""}">${v}</button>`)}
      </div><span class="tiny muted">${ed ? "Penilaian tersimpan otomatis." : "Hanya-baca."}</span></div>

      <div class="no-print">${AUDIT_ELEMENTS.map((e) => {
        const ec = e.subs.flatMap((sb) => sb.criteria).filter((c) => inLevel.has(c.id));
        if (!ec.length) return "";
        const es = auditScore(ec, a.results);
        return html`<details class="panel element" data-el="${e.no}" ${openEl.has(e.no) ? "open" : ""}>
          <summary><span class="stage-no">${e.no}</span><b>${e.title}</b>
            <span class="tiny muted" style="margin-left:auto">${es.assessed}/${es.total} dinilai · ${es.sesuai} sesuai${es.minor + es.mayor + es.kritikal ? ` · ${es.minor + es.mayor + es.kritikal} temuan` : ""}</span></summary>
          ${e.subs.map((sb) => {
            const sc = sb.criteria.filter((c) => inLevel.has(c.id)).filter((c) => {
              const r = a.results?.[critKey(c.id)]?.r || "";
              return filter === "semua" || (filter === "belum" && !r) || (filter === "sesuai" && r === "sesuai") || (filter === "temuan" && ["minor", "mayor", "kritikal"].includes(r));
            });
            if (!sc.length) return "";
            return html`<div class="sub-el"><h4 class="sub-h">${sb.id} ${sb.title}</h4>
              ${sc.map((c) => {
                const res = a.results?.[critKey(c.id)] || {};
                const capa = capas.find((x) => x.id === res.capaId);
                return html`<div class="crit ${res.r || ""}" data-c="${c.id}">
                  <div class="crit-text"><b>${c.id}</b> <span class="tag">${c.level}</span> ${c.text}</div>
                  ${ed ? html`<div class="crit-inputs">
                      <select data-field="r">${Object.entries(AUDIT_RESULT).map(([k2, v]) => html`<option value="${k2}" ${res.r === k2 || (!res.r && !k2) ? "selected" : ""}>${v.label}</option>`)}</select>
                      <input data-field="note" maxlength="500" placeholder="Bukti / catatan auditor" value="${res.note || ""}" />
                      ${["minor", "mayor", "kritikal"].includes(res.r) ? (capa ? html`<a class="tiny" href="#/smk3/capa/${capa.id}">CAPA #${shortId(capa.id)}</a>` : html`<button class="btn btn-ghost btn-sm" data-capa="${c.id}">+ CAPA</button>`) : ""}
                    </div>`
                  : html`<div class="crit-inputs"><span class="pill ${AUDIT_RESULT[res.r || ""].cls}">${AUDIT_RESULT[res.r || ""].label}</span>
                      ${res.note ? html`<span class="tiny">${res.note}</span>` : ""}
                      ${capa ? html`<a class="tiny" href="#/smk3/capa/${capa.id}">CAPA #${shortId(capa.id)} · ${CAPA_STATUS[capa.status]?.label}</a>` : ""}</div>`}
                </div>`;
              })}</div>`;
          })}</details>`;
      })}</div>

      ${reportHTML(s, findings, crit)}`);
    if (!firstPaint) window.scrollTo(0, scrollY);
    firstPaint = false;
    bind();
  }

  function reportHTML(s, findings, crit) {
    return html`<div class="report print-only">
      <div class="report-head"><img src="/assets/logo-mark.png" alt="" /><div><h2>Laporan Audit Internal SMK3</h2>
        <div>${ctx.company.name}</div><div class="tiny">${a.title} · ${fmtDay(a.auditDate)}</div></div></div>
      <table class="tbl rep"><tbody>
        <tr><th>Tingkat</th><td>${levelLabel(a.level)} (${crit.length} kriteria)</td><th>Status</th><td>${AUDIT_STATUS[a.status].label}</td></tr>
        <tr><th>Tim auditor</th><td>${a.auditors || "—"}</td><th>Ruang lingkup</th><td>${a.scope || "—"}</td></tr>
        <tr><th>Tingkat pencapaian</th><td><b>${s.percent}%</b></td><th>Penilaian</th><td><b>${s.rating.label}</b></td></tr>
        <tr><th>Sesuai</th><td>${s.sesuai}</td><th>Minor / Mayor / Kritikal</th><td>${s.minor} / ${s.mayor} / ${s.kritikal}</td></tr>
      </tbody></table>
      <h3>Rekap per elemen</h3>
      <table class="tbl rep"><thead><tr><th>Elemen</th><th>Kriteria</th><th>Sesuai</th><th>Temuan</th><th>%</th></tr></thead><tbody>
        ${AUDIT_ELEMENTS.map((e) => { const ec = e.subs.flatMap((sb) => sb.criteria).filter((c) => crit.some((x) => x.id === c.id)); if (!ec.length) return "";
          const es = auditScore(ec, a.results); return html`<tr><td>${e.no}. ${e.title}</td><td>${es.total}</td><td>${es.sesuai}</td><td>${es.minor + es.mayor + es.kritikal}</td><td>${es.percent}%</td></tr>`; })}
      </tbody></table>
      <h3>Daftar temuan</h3>
      ${findings.length ? html`<table class="tbl rep"><thead><tr><th>Kriteria</th><th>Kategori</th><th>Catatan</th><th>CAPA</th></tr></thead><tbody>
        ${findings.map((c) => { const r = a.results[critKey(c.id)]; const capa = capas.find((x) => x.id === r.capaId);
          return html`<tr><td><b>${c.id}</b> ${c.text}</td><td>${AUDIT_RESULT[r.r].label}</td><td>${r.note || ""}</td><td>${capa ? `${capa.title} (${CAPA_STATUS[capa.status]?.label})` : "—"}</td></tr>`; })}
      </tbody></table>` : html`<p>Tidak ada temuan.</p>`}
      <p class="tiny">Acuan: Lampiran II PP No. 50 Tahun 2012 — Pedoman Penilaian Penerapan SMK3. Kriteria yang belum dinilai dihitung sebagai tidak terpenuhi.</p>
      <div class="sign"><div>Auditor,<br /><br /><br /><b>${a.auditors || "__________________"}</b></div><div>Mengetahui,<br /><br /><br /><b>__________________</b><br />Pimpinan Perusahaan</div></div>
    </div>`;
  }

  const pending = new Map(); let timer = null;
  function queueSave(cidKey, patch) {
    pending.set(cidKey, { ...(pending.get(cidKey) || {}), ...patch });
    clearTimeout(timer);
    timer = setTimeout(flush, 600);
  }
  async function flush() {
    if (!pending.size) return;
    const upd = { updatedAt: serverTimestamp() };
    for (const [k, p] of pending) {
      const cur = { ...(a.results?.[k] || {}), ...p, by: ctx.user.uid };
      upd[`results.${k}`] = cur;
      a.results = { ...(a.results || {}), [k]: cur };
    }
    if (a.status === "rencana") upd.status = "berlangsung";
    pending.clear();
    try { await updateDoc(ref, upd); } catch (e) { toast(errorMessage(e), "kritis"); }
  }

  function bind() {
    const q = (s) => el.querySelector(s);
    q("#filter").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; filter = b.dataset.f; paint(); };
    el.querySelectorAll("details.element").forEach((d) => d.addEventListener("toggle", () => { const n = +d.dataset.el; d.open ? openEl.add(n) : openEl.delete(n); }));
    el.querySelectorAll(".crit [data-field]").forEach((inp) => {
      const handler = () => {
        const cidKey = critKey(inp.closest(".crit").dataset.c);
        queueSave(cidKey, { [inp.dataset.field]: inp.value.trim() });
        if (inp.dataset.field === "r") { inp.closest(".crit").className = "crit " + inp.value; setTimeout(() => flush().then(paint), 0); }
      };
      inp.addEventListener(inp.tagName === "SELECT" ? "change" : "input", handler);
    });
    el.querySelectorAll("[data-capa]").forEach((b) => b.onclick = async () => {
      const c = criteriaForLevel(a.level).find((x) => x.id === b.dataset.capa);
      const res = a.results[critKey(c.id)];
      await flush();
      const capaId = await openCapaModal(ctx, { sourceType: "audit", sourceId: id, sourceLabel: `${a.title} — kriteria ${c.id}`,
        title: `Penuhi kriteria ${c.id}`, type: "korektif", priority: res.r === "minor" ? "sedang" : "tinggi" });
      if (capaId) queueSave(critKey(c.id), { capaId });
      await flush();
    });
    q("#startBtn")?.addEventListener("click", () => setStatus("berlangsung"));
    q("#finishBtn")?.addEventListener("click", async () => {
      await flush();
      const crit = criteriaForLevel(a.level), s = auditScore(crit, a.results);
      const msg = s.assessed < s.total ? `${s.total - s.assessed} kriteria belum dinilai dan akan dihitung tidak terpenuhi. ` : "";
      if (!confirm(`${msg}Selesaikan audit dengan pencapaian ${s.percent}% (${s.rating.label})? Audit akan dikunci.`)) return;
      setStatus("selesai", { score: { percent: s.percent, rating: { label: s.rating.label }, sesuai: s.sesuai, minor: s.minor, mayor: s.mayor, kritikal: s.kritikal, total: s.total }, completedAt: serverTimestamp() });
    });
    q("#printBtn").onclick = async () => { await flush(); printing = true; window.print(); printing = false; };
  }

  async function setStatus(status, extra = {}) {
    const b = writeBatch(db);
    b.update(ref, { status, ...extra, updatedAt: serverTimestamp() });
    logInBatch(b, cid, actor, { action: status === "selesai" ? "audit.finish" : "audit.start", entity: "audit", entityId: id,
      summary: `${a.title}: ${status}${extra.score ? ` — ${extra.score.percent}% (${extra.score.rating.label})` : ""}` });
    try { await b.commit(); toast(status === "selesai" ? "Audit diselesaikan." : "Audit dimulai.", "normal"); } catch (e) { toast(errorMessage(e), "kritis"); }
  }

  ctx.setLeaveGuard(() => { if (pending.size) flush(); return null; });
  const unsubs = [
    onSnapshot(ref, (snap) => {
      if (!snap.exists()) return mount(el, html`<div class="empty-state"><h2>Audit tidak ditemukan</h2><a class="btn btn-ghost" href="#/smk3/audit">Kembali</a></div>`);
      const incoming = { id: snap.id, ...snap.data() };
      const typing = el.querySelector(".crit input:focus");
      a = incoming;
      if (!typing && !pending.size && !printing) paint();
    }, (err) => mount(el, html`<div class="empty-state"><h2>Tidak dapat membuka audit</h2><p>${errorMessage(err)}</p></div>`)),
    onSnapshot(query(collection(db, "companies", cid, "capa"), where("sourceId", "==", id)), (s) => { capas = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (a && !el.querySelector(".crit input:focus")) paint(); }, () => {}),
  ];
  return () => { unsubs.forEach((u) => u()); flush(); };
}

export default {
  render(el, ctx, params) { return params?.id ? renderDetail(el, ctx, params.id) : renderList(el, ctx); },
};
