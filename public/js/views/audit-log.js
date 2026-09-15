// Log aktivitas (append-only) — jejak audit untuk SMK3.
import { db } from "../core/firebase.js";
import { ACTION_LABEL } from "../core/audit.js";
import { html, mount, icon, errorMessage, fmtDateTime } from "../core/ui.js";
import {
  collection, query, orderBy, limit, startAfter, getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const PAGE = 50;
const ENTITY = { company: "Perusahaan", member: "Anggota", eegAlert: "Peringatan EEG", eegSession: "Sesi EEG", incident: "Insiden", capa: "CAPA", risk: "Register risiko", inspection: "Inspeksi", kpi: "KPI", audit: "Audit SMK3", review: "Tinjauan manajemen", policy: "Kebijakan/P2K3", training: "Pelatihan", document: "Dokumen" };

export default {
  async render(el, ctx) {
    let last = null, rows = [], alive = true;

    mount(el, html`
      <div class="page-head"><div><h1>Log Aktivitas</h1>
        <div class="shift">Catatan permanen setiap perubahan penting. Tidak dapat diubah atau dihapus.</div></div>
        <button class="btn btn-ghost" id="exportBtn">${icon("mdi:download")} Unduh CSV (yang dimuat)</button></div>
      <div class="panel table-wrap"><table class="tbl">
        <thead><tr><th>Waktu</th><th>Pelaku</th><th>Aktivitas</th><th>Keterangan</th></tr></thead>
        <tbody id="rows"><tr><td colspan="4" class="muted tiny">Memuat…</td></tr></tbody>
      </table>
      <div class="center" style="margin-top:1rem"><button class="btn btn-ghost btn-sm hidden" id="moreBtn">Muat lebih banyak</button></div></div>`);

    const body = el.querySelector("#rows"), more = el.querySelector("#moreBtn");

    function paint() {
      if (!rows.length) return mount(body, html`<tr><td colspan="4" class="muted tiny">Belum ada aktivitas.</td></tr>`);
      mount(body, html`${rows.map((r) => html`<tr>
        <td class="tiny nowrap">${fmtDateTime(r.at)}</td>
        <td>${r.actorName || r.actorUid}</td>
        <td>${ACTION_LABEL[r.action] || r.action}<div class="tiny muted">${ENTITY[r.entity] || r.entity}</div></td>
        <td class="tiny">${r.summary}</td></tr>`)}`);
    }

    async function load() {
      more.disabled = true;
      try {
        const base = [collection(db, "companies", ctx.company.id, "auditLogs"), orderBy("at", "desc")];
        const q = last ? query(...base, startAfter(last), limit(PAGE)) : query(...base, limit(PAGE));
        const snap = await getDocs(q);
        if (!alive) return;
        rows = rows.concat(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        last = snap.docs[snap.docs.length - 1] || last;
        more.classList.toggle("hidden", snap.size < PAGE);
        paint();
      } catch (err) { console.error(err); mount(body, html`<tr><td colspan="4" class="msg err">${errorMessage(err)}</td></tr>`); }
      more.disabled = false;
    }

    more.addEventListener("click", load);
    el.querySelector("#exportBtn").addEventListener("click", () => {
      const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = [["Waktu", "Pelaku", "Aksi", "Entitas", "ID Entitas", "Keterangan"].map(cell).join(",")]
        .concat(rows.map((r) => [fmtDateTime(r.at), r.actorName, ACTION_LABEL[r.action] || r.action, ENTITY[r.entity] || r.entity, r.entityId, r.summary].map(cell).join(",")));
      const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `log-aktivitas-${ctx.company.code}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });

    await load();
    return () => { alive = false; };
  },
};
