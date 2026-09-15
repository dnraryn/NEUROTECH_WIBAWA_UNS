// Detail satu sesi EEG: ringkasan, grafik per menit, distribusi status, peringatan.
import { db } from "../core/firebase.js";
import { can, EEG_STAFF } from "../core/roles.js";
import { html, mount, icon, errorMessage, fmtDateTime, fmtTime, toMillis } from "../core/ui.js";
import { STATUS_LABEL } from "../eeg/eeg-engine.js";
import { statusPill, sourceBadge, drawLineChart, legend, ALERT_TYPE, ALERT_STATUS, isStale } from "../eeg/eeg-ui.js";
import {
  collection, doc, query, where, orderBy, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const SERIES = [
  { key: "fi", label: "Fatigue Index", color: "#f97316" },
  { key: "cli", label: "Cognitive Load", color: "#2fd4ee" },
  { key: "ei", label: "Engagement", color: "#22c55e" },
  { key: "stress", label: "Stres", color: "#ef4444" },
];

export default {
  async render(el, ctx, params) {
    const cid = ctx.company.id, sid = params.id;
    const staff = can(ctx, EEG_STAFF);
    const unsubs = [];
    let session = null, minutes = [];

    mount(el, html`<div class="page-head"><div>
        <a class="tiny" href="${staff ? "#/eeg/tim" : "#/eeg/saya"}">← Kembali</a>
        <h1 id="title">Detail Sesi</h1><div class="shift" id="sub">Memuat…</div></div>
        <div id="badge"></div></div>
      <div class="metrics" id="metrics" style="margin-bottom:1.2rem"></div>
      <div class="grid two-col">
        <div class="panel"><h3>${icon("mdi:chart-line")} Tren per menit</h3>
          <canvas id="chart" class="chart"></canvas>${legend(SERIES)}</div>
        <div class="stack">
          <div class="panel"><h3>${icon("mdi:chart-donut")} Waktu per status</h3><div id="dist" class="muted tiny">—</div></div>
          <div class="panel"><h3>${icon("mdi:bell-outline")} Peringatan sesi ini</h3><div id="alerts" class="muted tiny">Memuat…</div></div>
        </div>
      </div>`);

    const $ = (id) => el.querySelector("#" + id);

    function paintSession() {
      if (!$("title")) return;
      const s = session;
      $("title").textContent = s.name;
      $("sub").textContent = `${[s.position, s.department, s.shift].filter(Boolean).join(" · ") || "—"} · mulai ${fmtDateTime(s.startedAt)}${s.endedAt ? ` · selesai ${fmtTime(s.endedAt)}` : ""}`;
      const live = s.active && !isStale(s);
      mount($("badge"), html`${sourceBadge(s.source)} ${s.active ? (live ? html`<span class="pill normal">Berjalan</span>` : html`<span class="pill idle">Terputus</span>`) : statusPill(s.status)}`);

      const sum = s.summary;
      const durMin = sum?.durationMin ?? Math.round(((toMillis(s.endedAt) || Date.now()) - (toMillis(s.startedAt) || Date.now())) / 60000);
      const avg = (k) => minutes.length ? Math.round(minutes.reduce((a, m) => a + m[k], 0) / minutes.length) : "--";
      mount($("metrics"), html`
        <div class="metric"><div class="label">Durasi</div><div class="val">${durMin}<small> mnt</small></div></div>
        <div class="metric"><div class="label">Rerata Fatigue</div><div class="val">${sum?.avgFi ?? avg("fi")}</div></div>
        <div class="metric"><div class="label">Puncak Fatigue</div><div class="val">${sum?.maxFi ?? (minutes.length ? Math.max(...minutes.map((m) => m.fi)) : "--")}</div></div>
        <div class="metric"><div class="label">Rerata Cog. Load</div><div class="val">${sum?.avgCli ?? avg("cli")}</div></div>
        <div class="metric"><div class="label">Rerata Stres</div><div class="val">${sum?.avgStress ?? avg("stress")}</div></div>
        <div class="metric"><div class="label">Microsleep</div><div class="val" style="color:var(--kritis)">${s.microsleepCount || 0}</div></div>
        <div class="metric"><div class="label">Baseline FI / EI</div><div class="val">${s.baseline?.fi ?? "--"}<small> / ${s.baseline?.ei ?? "--"}</small></div></div>`);

      // distribusi status: ringkasan resmi bila ada, jika tidak dari status terburuk per menit
      let dist = sum?.statusMinutes;
      if (!dist) { dist = { normal: 0, waspada: 0, berisiko: 0, kritis: 0 }; minutes.forEach((m) => { dist[m.worst] = (dist[m.worst] || 0) + 1; }); }
      const total = Object.values(dist).reduce((a, b) => a + b, 0);
      mount($("dist"), total ? html`<div class="stackbar">${["normal", "waspada", "berisiko", "kritis"].map((k) =>
          dist[k] ? html`<i style="width:${(dist[k] / total) * 100}%;background:var(--${k})" title="${STATUS_LABEL[k]}"></i>` : "")}</div>
        <div class="legend">${["normal", "waspada", "berisiko", "kritis"].map((k) => html`<span><i style="background:var(--${k})"></i>${STATUS_LABEL[k]} — <b>${Math.round((dist[k] || 0) * 10) / 10}</b> mnt</span>`)}</div>
        ${sum ? "" : html`<p class="tiny muted">Perkiraan dari status terburuk tiap menit.</p>`}` : html`Belum ada data.`);
    }

    const paintChart = () => $("chart") && drawLineChart($("chart"), SERIES.map((s) => ({ ...s, data: minutes.map((m) => m[s.key]) })),
      { labels: minutes.map((m) => fmtTime(m.at)) });

    unsubs.push(onSnapshot(doc(db, "companies", cid, "eegSessions", sid), (snap) => {
      if (!snap.exists()) return mount(el, html`<div class="empty-state">${icon("mdi:file-question-outline")}<h2>Sesi tidak ditemukan</h2><a class="btn btn-ghost" href="#/">Beranda</a></div>`);
      session = { id: snap.id, ...snap.data() };
      paintSession();
    }, (err) => mount(el, html`<div class="empty-state">${icon("mdi:lock-outline")}<h2>Tidak dapat membuka sesi</h2><p>${errorMessage(err)}</p><a class="btn btn-ghost" href="#/">Beranda</a></div>`)));

    unsubs.push(onSnapshot(query(collection(db, "companies", cid, "eegSessions", sid, "minutes"), orderBy("m")), (snap) => {
      minutes = snap.docs.map((d) => d.data());
      paintChart();
      if (session) paintSession();
    }, (err) => console.warn(err)));

    const aq = staff
      ? query(collection(db, "companies", cid, "eegAlerts"), where("sessionId", "==", sid))
      : query(collection(db, "companies", cid, "eegAlerts"), where("uid", "==", ctx.user.uid), where("sessionId", "==", sid));
    unsubs.push(onSnapshot(aq, (snap) => {
      const box = $("alerts"); if (!box) return;
      const list = snap.docs.map((d) => d.data()).sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0));
      if (!list.length) return mount(box, html`Tidak ada peringatan pada sesi ini.`);
      mount(box, html`${list.map((a) => html`<div class="alert-item"><span class="dot ${a.severity}"></span>
        <div class="txt"><b>${ALERT_TYPE[a.type] || a.type}</b> · <span class="tiny">${ALERT_STATUS[a.status]}</span><p>${a.message}</p>
          ${a.note ? html`<p class="tiny">✔ ${a.handledByName}: ${a.note}</p>` : ""}</div>
        <time>${fmtTime(a.createdAt)}</time></div>`)}`);
    }, (err) => { const box = $("alerts"); if (box) box.textContent = errorMessage(err); }));

    const onResize = () => paintChart();
    window.addEventListener("resize", onResize);
    return () => { unsubs.forEach((u) => u()); window.removeEventListener("resize", onResize); };
  },
};
