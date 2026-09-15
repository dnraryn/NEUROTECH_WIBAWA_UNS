// Daftar peringatan EEG & tindak lanjutnya (bukti elemen 8 SMK3).
import { db } from "../core/firebase.js";
import { html, mount, toast, errorMessage, fmtDateTime } from "../core/ui.js";
import { STATUS_LABEL } from "../eeg/eeg-engine.js";
import { ALERT_TYPE, ALERT_STATUS, handleAlertModal } from "../eeg/eeg-ui.js";
import {
  collection, query, where, orderBy, limit, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export default {
  async render(el, ctx) {
    const cid = ctx.company.id;
    let tab = "open", rows = [], unsub = null;

    mount(el, html`
      <div class="page-head"><div><h1>Peringatan EEG</h1>
        <div class="shift">Setiap peringatan wajib ditindaklanjuti dan dicatat tindakannya.</div></div></div>
      <div class="toolbar"><div class="tabs" id="tabs">
        <button data-tab="open" class="active">Terbuka</button>
        <button data-tab="ack">Ditangani</button>
        <button data-tab="closed">Selesai</button>
      </div></div>
      <div class="panel table-wrap"><table class="tbl">
        <thead><tr><th>Waktu</th><th>Pekerja</th><th>Jenis</th><th>Tingkat</th><th>Keterangan</th><th>Tindak lanjut</th><th></th></tr></thead>
        <tbody id="rows"><tr><td colspan="7" class="muted tiny">Memuat…</td></tr></tbody>
      </table></div>`);

    const body = el.querySelector("#rows");

    function paint() {
      if (!rows.length) return mount(body, html`<tr><td colspan="7" class="muted tiny">Tidak ada peringatan ${ALERT_STATUS[tab].toLowerCase()}.</td></tr>`);
      mount(body, html`${rows.map((a) => html`<tr>
        <td class="tiny nowrap">${fmtDateTime(a.createdAt)}</td>
        <td>${a.name}<div class="tiny muted">${a.position || ""}</div></td>
        <td>${ALERT_TYPE[a.type] || a.type}</td>
        <td><span class="pill ${a.severity}">${STATUS_LABEL[a.severity] || a.severity}</span></td>
        <td class="tiny">${a.message}${a.sessionId ? html`<div><a href="#/eeg/sesi/${a.sessionId}">Lihat sesi →</a></div>` : ""}</td>
        <td class="tiny">${a.handledByName ? html`<b>${a.handledByName}</b> · ${fmtDateTime(a.handledAt)}<div>${a.note}</div>` : "—"}</td>
        <td class="actions">
          ${a.status === "open" ? html`<button class="btn btn-primary btn-sm" data-act="ack" data-id="${a.id}">Tangani</button>` : ""}
          ${a.status !== "closed" ? html`<button class="btn btn-ghost btn-sm" data-act="closed" data-id="${a.id}">Tutup</button>` : ""}
        </td></tr>`)}`);
    }

    function subscribe() {
      unsub?.();
      mount(body, html`<tr><td colspan="7" class="muted tiny">Memuat…</td></tr>`);
      unsub = onSnapshot(query(collection(db, "companies", cid, "eegAlerts"), where("status", "==", tab), orderBy("createdAt", "desc"), limit(100)),
        (snap) => { rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })); paint(); },
        (err) => mount(body, html`<tr><td colspan="7" class="msg err">${errorMessage(err)}</td></tr>`));
    }

    el.querySelector("#tabs").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      tab = b.dataset.tab;
      el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
      subscribe();
    });
    body.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = rows.find((x) => x.id === b.dataset.id); if (!a) return;
      try { await handleAlertModal(ctx, a, b.dataset.act); } catch (err) { toast(errorMessage(err), "kritis"); }
    });

    subscribe();
    return () => unsub?.();
  },
};
