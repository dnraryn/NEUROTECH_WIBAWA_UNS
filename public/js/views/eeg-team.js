// Monitoring EEG tim secara real-time (Supervisor, Ahli K3, Admin).
import { db } from "../core/firebase.js";
import { logInBatch } from "../core/audit.js";
import { html, mount, icon, toast, errorMessage, relTime, initials, confirmDialog } from "../core/ui.js";
import { recommend, STATUS_LEVEL, STATUS_LABEL } from "../eeg/eeg-engine.js";
import {
  statusPill, sourceBadge, isStale, sessionSeenAt, ALERT_TYPE, handleAlertModal,
  notifyPrefs, setNotifyPrefs, beep, desktopNotify,
} from "../eeg/eeg-ui.js";
import {
  collection, doc, query, where, orderBy, limit, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export default {
  async render(el, ctx) {
    const cid = ctx.company.id;
    const unsubs = [];
    let sessions = [], alerts = [], search = "", firstAlertSnap = true;
    const prefs = notifyPrefs();

    mount(el, html`
      <div class="page-head">
        <div><h1>Monitoring Tim</h1><div class="shift">Kondisi kognitif pekerja yang sedang menjalankan sesi, diperbarui real-time.</div></div>
        <div class="btn-row">
          <label class="check small"><input type="checkbox" id="snd" /> <span>Bunyi</span></label>
          <label class="check small"><input type="checkbox" id="dsk" /> <span>Notifikasi desktop</span></label>
          <span class="pill normal">${icon("svg-spinners:pulse-3")} Live</span>
        </div>
      </div>

      <div class="metrics" style="margin-bottom:1.2rem">
        <div class="metric"><div class="label">Dipantau</div><div class="val" id="k-live">0</div></div>
        <div class="metric"><div class="label">Normal</div><div class="val" style="color:var(--normal)" id="k-normal">0</div></div>
        <div class="metric"><div class="label">Waspada</div><div class="val" style="color:var(--waspada)" id="k-waspada">0</div></div>
        <div class="metric"><div class="label">Berisiko</div><div class="val" style="color:var(--berisiko)" id="k-berisiko">0</div></div>
        <div class="metric"><div class="label">Kritis</div><div class="val" style="color:var(--kritis)" id="k-kritis">0</div></div>
        <div class="metric"><div class="label">Terputus</div><div class="val" style="color:var(--muted)" id="k-stale">0</div></div>
      </div>

      <div class="grid team-layout">
        <div class="panel">
          <div class="row-between" style="margin-bottom:.8rem;flex-wrap:wrap">
            <h3 style="margin:0">Pekerja <span class="count" id="k-count">0</span></h3>
            <input class="search" id="search" type="search" placeholder="Cari nama / jabatan / area…" />
          </div>
          <div class="worker-grid" id="team"><div class="muted tiny">Memuat…</div></div>
        </div>
        <div class="panel">
          <h3>Peringatan aktif <span class="count" id="a-count">0</span>
            <a class="btn btn-ghost btn-sm" style="margin-left:auto" href="#/eeg/peringatan">Semua</a></h3>
          <div id="alerts"><div class="muted tiny">Memuat…</div></div>
        </div>
      </div>`);

    const $ = (id) => el.querySelector("#" + id);
    $("snd").checked = prefs.sound; $("dsk").checked = prefs.desktop;
    $("snd").addEventListener("change", (e) => { prefs.sound = e.target.checked; setNotifyPrefs(prefs); });
    $("dsk").addEventListener("change", async (e) => {
      if (e.target.checked && "Notification" in window && Notification.permission !== "granted") {
        const p = await Notification.requestPermission();
        if (p !== "granted") { e.target.checked = false; toast("Izin notifikasi ditolak browser.", "berisiko"); }
      }
      prefs.desktop = e.target.checked; setNotifyPrefs(prefs);
    });

    function card(s, stale) {
      const r = s.latest || {};
      const rec = recommend({ status: s.status, microsleep: false });
      const cls = stale ? "stale" : s.status === "kritis" ? "kritis" : s.status === "berisiko" ? "berisiko" : "";
      return html`<div class="worker-card ${cls}">
        <div class="wc-top">
          <div class="av">${initials(s.name)}</div>
          <div style="flex:1;min-width:0"><div class="nm">${s.name} ${sourceBadge(s.source)}</div>
            <div class="ps">${[s.position, s.department, s.shift].filter(Boolean).join(" · ") || "—"}</div></div>
          ${stale ? html`<span class="pill idle">Terputus</span>` : statusPill(s.status)}
        </div>
        <div class="mini">
          <div><b>${r.fi ?? "--"}</b><span>Fatigue</span></div>
          <div><b>${r.cli ?? "--"}</b><span>Cog.Load</span></div>
          <div><b>${r.ei ?? "--"}</b><span>Engage</span></div>
          <div><b>${r.stress ?? "--"}</b><span>Stres</span></div>
          <div><b>${r.hrv ?? "--"}</b><span>HRV</span></div>
          <div><b>${s.microsleepCount || 0}</b><span>Microsleep</span></div>
        </div>
        <div class="tiny muted" style="margin-top:.6rem">
          ${stale ? html`Data terakhir ${relTime(sessionSeenAt(s))}. Periksa headband/koneksi pekerja.` : html`${icon("mdi:stethoscope")} ${rec.sup}`}
        </div>
        <div class="btn-row" style="margin-top:.6rem">
          <a class="btn btn-ghost btn-sm" href="#/eeg/sesi/${s.id}">Detail</a>
          ${stale ? html`<button class="btn btn-ghost btn-sm" data-close="${s.id}">Tutup sesi</button>` : ""}
        </div>
      </div>`;
    }

    function paintTeam() {
      const now = Date.now();
      const rows = sessions.map((s) => ({ s, stale: isStale(s, now) }));
      const live = rows.filter((x) => !x.stale);
      const counts = { normal: 0, waspada: 0, berisiko: 0, kritis: 0 };
      live.forEach(({ s }) => { counts[s.status] = (counts[s.status] || 0) + 1; });
      $("k-live").textContent = live.length;
      Object.entries(counts).forEach(([k, v]) => { $("k-" + k).textContent = v; });
      $("k-stale").textContent = rows.length - live.length;

      const q = search.toLowerCase();
      const list = rows
        .filter(({ s }) => !q || [s.name, s.position, s.department].some((v) => (v || "").toLowerCase().includes(q)))
        .sort((a, b) => (a.stale - b.stale) || (STATUS_LEVEL[b.s.status] - STATUS_LEVEL[a.s.status]) || (a.s.name || "").localeCompare(b.s.name || ""));
      $("k-count").textContent = list.length;
      mount($("team"), list.length ? html`${list.map(({ s, stale }) => card(s, stale))}`
        : html`<div class="empty-inline">${icon("mdi:account-clock-outline")} Belum ada pekerja yang menjalankan sesi monitoring.</div>`);
    }

    function paintAlerts() {
      $("a-count").textContent = alerts.length;
      if (!alerts.length) return mount($("alerts"), html`<div class="muted tiny">Tidak ada peringatan aktif.</div>`);
      mount($("alerts"), html`${alerts.map((a) => html`<div class="alert-item">
        <span class="dot ${a.severity}"></span>
        <div class="txt"><b>${a.name}</b> · ${ALERT_TYPE[a.type] || a.type}
          <p>${a.message}</p>
          ${a.status === "ack" ? html`<p class="tiny">✔ ${a.handledByName}: ${a.note}</p>` : ""}
          <div class="btn-row" style="margin-top:.35rem">
            ${a.status === "open" ? html`<button class="btn btn-primary btn-sm" data-ack="${a.id}">Tangani</button>` : ""}
            <button class="btn btn-ghost btn-sm" data-closealert="${a.id}">Tutup</button>
          </div></div>
        <time>${relTime(a.createdAt)}</time></div>`)}`);
    }

    $("search").addEventListener("input", (e) => { search = e.target.value; paintTeam(); });

    const onClick = async (e) => {
      const t = e.target.closest("[data-ack],[data-closealert],[data-close]"); if (!t) return;
      try {
        if (t.dataset.ack || t.dataset.closealert) {
          const a = alerts.find((x) => x.id === (t.dataset.ack || t.dataset.closealert));
          if (a) await handleAlertModal(ctx, a, t.dataset.ack ? "ack" : "closed");
        } else if (t.dataset.close) {
          const s = sessions.find((x) => x.id === t.dataset.close); if (!s) return;
          if (!(await confirmDialog("Tutup sesi terputus?", `Sesi ${s.name} tidak mengirim data sejak ${relTime(sessionSeenAt(s))}. Sesi akan ditandai berakhir.`))) return;
          const batch = writeBatch(db);
          batch.update(doc(db, "companies", cid, "eegSessions", s.id), { active: false, endedAt: serverTimestamp(), closedBy: ctx.user.uid });
          logInBatch(batch, cid, { uid: ctx.user.uid, name: ctx.member.name }, { action: "eeg.session.close", entity: "eegSession", entityId: s.id, summary: `Sesi terputus milik ${s.name} ditutup` });
          await batch.commit();
          toast("Sesi ditutup.", "normal");
        }
      } catch (err) { console.error(err); toast(errorMessage(err), "kritis"); }
    };
    el.addEventListener("click", onClick);

    unsubs.push(onSnapshot(query(collection(db, "companies", cid, "eegSessions"), where("active", "==", true)), (snap) => {
      sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      paintTeam();
    }, (err) => mount($("team"), html`<div class="msg err">${errorMessage(err)}</div>`)));

    unsubs.push(onSnapshot(query(collection(db, "companies", cid, "eegAlerts"), where("status", "in", ["open", "ack"]), orderBy("createdAt", "desc"), limit(30)), (snap) => {
      if (!firstAlertSnap) {
        snap.docChanges().forEach((c) => {
          if (c.type !== "added" || c.doc.metadata.hasPendingWrites) return;
          const a = c.doc.data();
          const text = `${a.name}: ${ALERT_TYPE[a.type] || a.type} (${STATUS_LABEL[a.severity] || a.severity})`;
          toast(text, a.severity, 8000);
          if (prefs.sound) beep(a.severity);
          if (prefs.desktop) desktopNotify("Peringatan EEG — NeuroTech", `${text}. ${a.message}`);
        });
      }
      firstAlertSnap = false;
      alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      paintAlerts();
    }, (err) => mount($("alerts"), html`<div class="msg err">${errorMessage(err)}</div>`)));

    const t = setInterval(paintTeam, 5_000);
    return () => { unsubs.forEach((u) => u()); clearInterval(t); el.removeEventListener("click", onClick); };
  },
};
