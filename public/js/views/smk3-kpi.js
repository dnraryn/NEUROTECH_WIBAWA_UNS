// KPI & Laporan K3 — jam kerja, LTIFR, severity rate, near miss, CAPA, inspeksi, agregat EEG anonim.
// Laporan tahunan dapat dicetak / disimpan sebagai PDF lewat dialog cetak browser. (Elemen 10)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { html, mount, icon, toast, errorMessage } from "../core/ui.js";
import { INCIDENT_TYPE, K3_ADMIN, rate, isOverdue } from "../smk3/common.js";
import {
  collection, doc, query, where, getDocs, writeBatch, serverTimestamp, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmt = (n, d = 0) => (n == null || Number.isNaN(n) ? "—" : Number(n).toLocaleString("id-ID", { maximumFractionDigits: d, minimumFractionDigits: 0 }));

export async function loadKpi(ctx, year) {
  const cid = ctx.company.id, from = `${year}-01-01`, to = `${year}-12-31`;
  const col = (n) => collection(db, "companies", cid, n);
  const [inc, capa, insp, mh, eeg, audits] = await Promise.all([
    getDocs(query(col("incidents"), where("occurredDate", ">=", from), where("occurredDate", "<=", to))),
    getDocs(query(col("capa"), limit(2000))),
    getDocs(query(col("inspections"), where("date", ">=", from), where("date", "<=", to))),
    getDocs(col("manhours")),
    getDocs(col("eegStats")),
    getDocs(query(col("audits"), orderBy("auditDate", "desc"), limit(5))),
  ]);
  const incidents = inc.docs.map((d) => ({ id: d.id, ...d.data() }));
  const capas = capa.docs.map((d) => ({ id: d.id, ...d.data() }));
  const inspections = insp.docs.map((d) => d.data()).filter((i) => i.status === "selesai");
  const hours = {}; mh.docs.filter((d) => d.id.startsWith(year)).forEach((d) => { hours[d.id] = d.data(); });
  const eegMonths = eeg.docs.filter((d) => d.id.startsWith(year)).map((d) => ({ month: d.id, ...d.data() }));

  const monthly = MONTHS.map((_, i) => {
    const m = `${year}-${String(i + 1).padStart(2, "0")}`;
    const list = incidents.filter((x) => x.occurredDate.startsWith(m));
    const lti = list.filter((x) => (x.type === "kecelakaan" || x.type === "pak") && x.lostDays > 0);
    return { m, hours: hours[m]?.hours || 0, workers: hours[m]?.workers || 0, incidents: list.length, nearMiss: list.filter((x) => x.type === "near_miss").length,
      accidents: list.filter((x) => x.type === "kecelakaan").length, lti: lti.length, lostDays: lti.reduce((s, x) => s + (x.lostDays || 0), 0) };
  });
  const sum = (k) => monthly.reduce((s, m) => s + m[k], 0);
  const totalHours = sum("hours");
  const byType = Object.keys(INCIDENT_TYPE).map((k) => [k, incidents.filter((x) => x.type === k).length]);
  const locations = {};
  incidents.forEach((x) => { const l = x.location || "Tidak disebutkan"; locations[l] = (locations[l] || 0) + 1; });

  const yearCapa = capas.filter((c) => c.status !== "dibatalkan");
  const closed = yearCapa.filter((c) => c.status === "terverifikasi");
  const eegT = eegMonths.reduce((t, m) => { for (const k of ["sessions", "minutes", "microsleep", "normalMin", "waspadaMin", "berisikoMin", "kritisMin", "sumFiMin"]) t[k] = (t[k] || 0) + (m[k] || 0); return t; }, {});
  const groups = {};
  eegMonths.forEach((m) => Object.entries(m.groups || {}).forEach(([g, v]) => {
    const t = (groups[g] ||= { label: v.label, minutes: 0, berisikoMin: 0, kritisMin: 0, microsleep: 0, sessions: 0 });
    for (const k of ["minutes", "berisikoMin", "kritisMin", "microsleep", "sessions"]) t[k] += v[k] || 0;
  }));
  const inspItems = inspections.reduce((s, i) => { s.ok += i.summary?.ok || 0; s.tidak += i.summary?.tidak || 0; return s; }, { ok: 0, tidak: 0 });

  return {
    year, monthly, totalHours, incidents, byType, locations: Object.entries(locations).sort((a, b) => b[1] - a[1]).slice(0, 6),
    lti: sum("lti"), lostDays: sum("lostDays"), nearMiss: sum("nearMiss"), accidents: sum("accidents"),
    ltifr: rate(sum("lti"), totalHours), sr: rate(sum("lostDays"), totalHours),
    avgWorkers: Math.round(monthly.filter((m) => m.workers).reduce((s, m) => s + m.workers, 0) / (monthly.filter((m) => m.workers).length || 1)),
    capa: { total: yearCapa.length, closed: closed.length, open: yearCapa.filter((c) => ["terbuka", "dikerjakan", "selesai"].includes(c.status)).length,
      overdue: yearCapa.filter((c) => isOverdue(c)).length, closure: yearCapa.length ? Math.round((closed.length / yearCapa.length) * 100) : null,
      effective: closed.length ? Math.round((closed.filter((c) => c.effective).length / closed.length) * 100) : null },
    inspections: { count: inspections.length, ...inspItems, compliance: inspItems.ok + inspItems.tidak ? Math.round((inspItems.ok / (inspItems.ok + inspItems.tidak)) * 100) : null },
    eeg: { ...eegT, hours: Math.round((eegT.minutes || 0) / 60), riskPct: eegT.minutes ? Math.round((((eegT.berisikoMin || 0) + (eegT.kritisMin || 0)) / eegT.minutes) * 1000) / 10 : null,
      msPer100h: eegT.minutes ? Math.round(((eegT.microsleep || 0) / (eegT.minutes / 60)) * 1000) / 10 : null,
      avgFi: eegT.minutes ? Math.round((eegT.sumFiMin || 0) / eegT.minutes) : null, groups: Object.values(groups).sort((a, b) => b.minutes - a.minutes), months: eegMonths },
    lastAudit: audits.docs.map((d) => ({ id: d.id, ...d.data() })).find((a) => a.status === "selesai") || null,
  };
}

export default {
  async render(el, ctx) {
    const cid = ctx.company.id;
    const admin = can(ctx, K3_ADMIN);
    const thisYear = new Date().getFullYear();
    let year = String(thisYear), tab = "ringkasan", k = null;

    mount(el, html`
      <div class="page-head no-print"><div><h1>KPI &amp; Laporan K3</h1>
        <div class="shift">Pengumpulan dan penggunaan data K3 (Elemen 10). Rate dihitung per 1.000.000 jam kerja.</div></div>
        <div class="btn-row">
          <select class="search" id="year" style="min-width:0">${[0, 1, 2, 3].map((i) => html`<option>${thisYear - i}</option>`)}</select>
          <button class="btn btn-primary" id="printBtn">${icon("mdi:printer-outline")} Cetak / PDF</button>
        </div></div>
      <div class="toolbar no-print"><div class="tabs" id="tabs">
        <button data-tab="ringkasan" class="active">Ringkasan</button><button data-tab="jam">Jam kerja</button><button data-tab="laporan">Pratinjau laporan</button>
      </div></div>
      <div id="body"><div class="loading-view"><span class="spinner"></span></div></div>`);

    const body = el.querySelector("#body");

    const kpiCards = () => html`<div class="metrics kpi">
      <div class="metric"><div class="label">Total jam kerja</div><div class="val">${fmt(k.totalHours)}</div><div class="tiny muted">rerata ${fmt(k.avgWorkers)} pekerja/bulan</div></div>
      <div class="metric"><div class="label">LTIFR</div><div class="val">${k.ltifr == null ? "—" : fmt(k.ltifr, 2)}</div><div class="tiny muted">${k.lti} LTI × 1 jt / jam kerja</div></div>
      <div class="metric"><div class="label">Severity rate</div><div class="val">${k.sr == null ? "—" : fmt(k.sr, 2)}</div><div class="tiny muted">${k.lostDays} hari hilang</div></div>
      <div class="metric"><div class="label">Kecelakaan / near miss</div><div class="val"><span style="color:var(--kritis)">${k.accidents}</span><small> / ${k.nearMiss}</small></div><div class="tiny muted">rasio ${k.accidents ? fmt(k.nearMiss / k.accidents, 1) : "—"} near miss per kecelakaan</div></div>
      <div class="metric"><div class="label">Penutupan CAPA</div><div class="val">${k.capa.closure == null ? "—" : k.capa.closure + "%"}</div><div class="tiny muted">${k.capa.closed}/${k.capa.total} terverifikasi · <span style="color:var(--kritis)">${k.capa.overdue} terlambat</span></div></div>
      <div class="metric"><div class="label">Kepatuhan inspeksi</div><div class="val">${k.inspections.compliance == null ? "—" : k.inspections.compliance + "%"}</div><div class="tiny muted">${k.inspections.count} inspeksi · ${k.inspections.tidak} temuan</div></div>
    </div>`;

    const monthlyChart = () => {
      const max = Math.max(1, ...k.monthly.map((m) => m.incidents));
      return html`<div class="bars">${k.monthly.map((m, i) => html`<div class="bar-col" title="${MONTHS[i]}: ${m.incidents} kejadian">
        <div class="bar-stack" style="height:${(m.incidents / max) * 100}%">
          <i style="flex:${m.accidents};background:var(--kritis)"></i><i style="flex:${m.nearMiss};background:var(--waspada)"></i><i style="flex:${m.incidents - m.accidents - m.nearMiss};background:var(--cyan)"></i>
        </div><span>${MONTHS[i]}</span></div>`)}</div>
        <div class="legend"><span><i style="background:var(--kritis)"></i>Kecelakaan</span><span><i style="background:var(--waspada)"></i>Near miss</span><span><i style="background:var(--cyan)"></i>Lainnya</span></div>`;
    };

    const eegBlock = () => k.eeg.minutes ? html`
      <div class="mini" style="grid-template-columns:repeat(4,1fr)">
        <div><b>${fmt(k.eeg.hours)}</b><span>jam dipantau</span></div><div><b>${k.eeg.riskPct}%</b><span>waktu berisiko+</span></div>
        <div><b>${k.eeg.msPer100h}</b><span>microsleep /100 jam</span></div><div><b>${k.eeg.avgFi}</b><span>rerata fatigue</span></div></div>
      <h4 class="sub-h">Fatigue risk per kelompok jabatan (anonim)</h4>
      <table class="tbl"><thead><tr><th>Jabatan</th><th>Jam</th><th>% berisiko+</th><th>Microsleep</th></tr></thead><tbody>
        ${k.eeg.groups.map((g) => { const p = g.minutes ? ((g.berisikoMin + g.kritisMin) / g.minutes) * 100 : 0;
          return html`<tr><td>${g.label}</td><td>${fmt(g.minutes / 60, 1)}</td><td><span class="pill ${p >= 20 ? "kritis-static" : p >= 10 ? "berisiko" : p >= 5 ? "waspada" : "normal"}">${fmt(p, 1)}%</span></td><td>${g.microsleep}</td></tr>`; })}
      </tbody></table>`
      : html`<p class="tiny muted">Belum ada sesi EEG headband pada ${year}. Sesi simulasi tidak dihitung.</p>`;

    function paintSummary() {
      mount(body, html`${kpiCards()}
        <div class="grid two-col" style="margin-top:1.2rem">
          <div class="panel"><h3>${icon("mdi:chart-bar")} Kejadian per bulan ${year}</h3>${monthlyChart()}</div>
          <div class="panel"><h3>${icon("mdi:format-list-bulleted")} Berdasarkan jenis &amp; lokasi</h3>
            <table class="tbl"><tbody>${k.byType.map(([t, n]) => html`<tr><td>${INCIDENT_TYPE[t]}</td><td style="text-align:right"><b>${n}</b></td></tr>`)}</tbody></table>
            <h4 class="sub-h">Lokasi terbanyak</h4>
            ${k.locations.length ? html`<table class="tbl"><tbody>${k.locations.map(([l, n]) => html`<tr><td>${l}</td><td style="text-align:right">${n}</td></tr>`)}</tbody></table>` : html`<p class="tiny muted">—</p>`}
          </div>
        </div>
        <div class="grid two-col" style="margin-top:1.2rem">
          <div class="panel"><h3>${icon("mdi:head-cog-outline")} Ergonomi kognitif (agregat EEG anonim)</h3>${eegBlock()}</div>
          <div class="panel"><h3>${icon("mdi:file-certificate-outline")} Audit SMK3 terakhir</h3>
            ${k.lastAudit ? html`<p><a href="#/smk3/audit/${k.lastAudit.id}"><b>${k.lastAudit.title}</b></a></p>
              <p>Tingkat ${k.lastAudit.level} · pencapaian <b>${k.lastAudit.score?.percent ?? "—"}%</b> · ${k.lastAudit.score?.rating?.label || "—"}</p>` : html`<p class="tiny muted">Belum ada audit selesai.</p>`}
          </div>
        </div>`);
    }

    function paintHours() {
      mount(body, html`<div class="panel table-wrap">
        <h3>${icon("mdi:clock-outline")} Jam kerja ${year} ${admin ? "" : html`<span class="count">hanya-baca</span>`}</h3>
        <p class="tiny muted">Isi total jam kerja seluruh pekerja (termasuk lembur) dan jumlah pekerja setiap bulan. Data ini menjadi pembagi LTIFR &amp; severity rate.</p>
        <table class="tbl"><thead><tr><th>Bulan</th><th>Jumlah pekerja</th><th>Total jam kerja</th><th>LTI</th><th>Hari hilang</th><th>LTIFR</th><th></th></tr></thead>
        <tbody>${k.monthly.map((m, i) => html`<tr data-m="${m.m}">
          <td>${MONTHS[i]}</td>
          <td>${admin ? html`<input class="cell-input" type="number" min="0" step="1" name="workers" value="${m.workers || ""}" />` : fmt(m.workers)}</td>
          <td>${admin ? html`<input class="cell-input" type="number" min="0" step="1" name="hours" value="${m.hours || ""}" />` : fmt(m.hours)}</td>
          <td>${m.lti}</td><td>${m.lostDays}</td><td>${m.hours ? fmt(rate(m.lti, m.hours), 2) : "—"}</td>
          <td>${admin ? html`<button class="btn btn-ghost btn-sm" data-save="${m.m}">Simpan</button>` : ""}</td></tr>`)}</tbody></table></div>`);
    }

    function paintReport() {
      const now = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
      mount(body, html`<div class="report">
        <div class="report-head"><img src="/assets/logo-mark.png" alt="" /><div><h2>Laporan Kinerja K3 Tahun ${year}</h2>
          <div>${ctx.company.name} · ${ctx.company.sector || ""}</div><div class="tiny">Dicetak ${now} oleh ${ctx.member.name}</div></div></div>
        <h3>1. Indikator kinerja utama</h3>
        <table class="tbl rep"><tbody>
          <tr><th>Total jam kerja</th><td>${fmt(k.totalHours)}</td><th>Rerata pekerja</th><td>${fmt(k.avgWorkers)}</td></tr>
          <tr><th>Lost Time Injury (LTI)</th><td>${k.lti}</td><th>Hari kerja hilang</th><td>${k.lostDays}</td></tr>
          <tr><th>LTIFR (per 1 jt jam)</th><td>${k.ltifr == null ? "—" : fmt(k.ltifr, 2)}</td><th>Severity rate</th><td>${k.sr == null ? "—" : fmt(k.sr, 2)}</td></tr>
          <tr><th>Kecelakaan kerja</th><td>${k.accidents}</td><th>Near miss</th><td>${k.nearMiss}</td></tr>
          <tr><th>CAPA terverifikasi</th><td>${k.capa.closed} / ${k.capa.total} (${k.capa.closure ?? "—"}%)</td><th>CAPA terlambat</th><td>${k.capa.overdue}</td></tr>
          <tr><th>Inspeksi selesai</th><td>${k.inspections.count}</td><th>Kepatuhan butir inspeksi</th><td>${k.inspections.compliance ?? "—"}%</td></tr>
        </tbody></table>
        <h3>2. Rekap bulanan</h3>
        <table class="tbl rep"><thead><tr><th>Bulan</th><th>Jam kerja</th><th>Kejadian</th><th>Kecelakaan</th><th>Near miss</th><th>LTI</th><th>Hari hilang</th></tr></thead>
          <tbody>${k.monthly.map((m, i) => html`<tr><td>${MONTHS[i]}</td><td>${fmt(m.hours)}</td><td>${m.incidents}</td><td>${m.accidents}</td><td>${m.nearMiss}</td><td>${m.lti}</td><td>${m.lostDays}</td></tr>`)}</tbody></table>
        <h3>3. Kejadian berdasarkan jenis</h3>
        <table class="tbl rep"><tbody>${k.byType.map(([t, n]) => html`<tr><th>${INCIDENT_TYPE[t]}</th><td>${n}</td></tr>`)}</tbody></table>
        <h3>4. Ergonomi kognitif (EEG, agregat anonim)</h3>
        ${k.eeg.minutes ? html`<table class="tbl rep"><tbody>
          <tr><th>Jam dipantau</th><td>${fmt(k.eeg.hours)}</td><th>Sesi</th><td>${fmt(k.eeg.sessions)}</td></tr>
          <tr><th>% waktu berisiko/kritis</th><td>${k.eeg.riskPct}%</td><th>Microsleep per 100 jam</th><td>${k.eeg.msPer100h}</td></tr></tbody></table>`
          : html`<p>Tidak ada data sesi EEG headband pada periode ini.</p>`}
        <h3>5. Audit SMK3</h3>
        <p>${k.lastAudit ? `${k.lastAudit.title} — tingkat ${k.lastAudit.level}, pencapaian ${k.lastAudit.score?.percent ?? "—"}% (${k.lastAudit.score?.rating?.label || "—"}).` : "Belum ada audit internal yang diselesaikan."}</p>
        <p class="tiny">Definisi: LTIFR = jumlah LTI × 1.000.000 / total jam kerja; Severity rate = hari kerja hilang × 1.000.000 / total jam kerja. Data EEG disajikan agregat tanpa identitas individu.</p>
        <div class="sign"><div>Disiapkan oleh,<br /><br /><br /><b>${ctx.member.name}</b><br />Ahli K3 / P2K3</div><div>Mengetahui,<br /><br /><br /><b>__________________</b><br />Pimpinan Perusahaan</div></div>
      </div>`);
    }

    const paint = () => (tab === "ringkasan" ? paintSummary() : tab === "jam" ? paintHours() : paintReport());

    async function load() {
      mount(body, html`<div class="loading-view"><span class="spinner"></span></div>`);
      try { k = await loadKpi(ctx, year); paint(); }
      catch (err) { console.error(err); mount(body, html`<div class="msg err">${errorMessage(err)}</div>`); }
    }

    el.querySelector("#year").onchange = (e) => { year = e.target.value; load(); };
    el.querySelector("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.tab; el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b)); if (k) paint(); };
    el.querySelector("#printBtn").onclick = () => {
      tab = "laporan"; el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x.dataset.tab === "laporan"));
      if (k) { paintReport(); setTimeout(() => window.print(), 300); }
    };
    body.onclick = async (e) => {
      const b = e.target.closest("[data-save]"); if (!b) return;
      const tr = b.closest("tr"), month = b.dataset.save;
      const hours = Number(tr.querySelector('[name="hours"]').value || 0), workers = Number(tr.querySelector('[name="workers"]').value || 0);
      const batch = writeBatch(db);
      batch.set(doc(db, "companies", cid, "manhours", month), { month, hours, workers, updatedBy: ctx.user.uid, updatedAt: serverTimestamp() });
      logInBatch(batch, cid, { uid: ctx.user.uid, name: ctx.member.name }, { action: "kpi.manhours", entity: "kpi", entityId: month, summary: `Jam kerja ${month}: ${hours} jam, ${workers} pekerja` });
      try {
        await batch.commit();
        toast(`Jam kerja ${month} disimpan.`, "normal");
        // muat ulang data tanpa menggambar ulang tabel agar isian bulan lain yang belum disimpan tidak hilang
        k = await loadKpi(ctx, year);
        const m = k.monthly.find((x) => x.m === month);
        const cell = body.querySelector(`tr[data-m="${month}"] td:nth-child(6)`);
        if (m && cell) cell.textContent = m.hours ? fmt(rate(m.lti, m.hours), 2) : "—";
      }
      catch (err) { toast(errorMessage(err), "kritis"); }
    };
    load();
  },
};
