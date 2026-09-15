// Beranda berbasis peran + peta penerapan SMK3.
import { db } from "../core/firebase.js";
import { ROUTES, SMK3_STAGES } from "../core/nav.js";
import { can, EEG_STAFF, MEMBER_READERS, roleLabel } from "../core/roles.js";
import { html, mount, icon, relTime, toast } from "../core/ui.js";
import { STATUS_LABEL } from "../eeg/eeg-engine.js";
import { STALE_MS, sessionSeenAt } from "../eeg/eeg-ui.js";
import { NOT_WORKER, isOverdue } from "../smk3/common.js";
import {
  collection, query, where, orderBy, limit, onSnapshot, getDoc, getDocs, doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


function smk3Map(role) {
  return html`<div class="panel">
    <h3>${icon("mdi:sitemap-outline")} Peta Penerapan SMK3 <span class="count">PP 50/2012</span></h3>
    <div class="stage-list">
      ${SMK3_STAGES.map((name, i) => {
        const mods = ROUTES.filter((r) => r.stage === i + 1 && !r.hidden);
        return html`<div class="stage">
          <div class="stage-no">${i + 1}</div>
          <div class="stage-body"><b>${name}</b>
            <div class="chips">${mods.map((m) => {
              const allowed = m.roles.includes(role);
              const cls = m.soon ? "chip soon" : "chip live";
              const label = html`${icon(m.icon)} ${m.title}${m.soon ? html` <small>Fase ${m.soon}</small>` : ""}`;
              return allowed ? html`<a class="${cls}" href="#${m.path}">${label}</a>` : html`<span class="${cls} dim">${label}</span>`;
            })}</div>
          </div></div>`;
      })}
    </div></div>`;
}

export default {
  async render(el, ctx) {
    const { member, company } = ctx;
    const first = (member.name || "").split(" ")[0];
    const isStaff = can(ctx, EEG_STAFF);
    const isReader = can(ctx, MEMBER_READERS);
    const isAdmin = member.role === "admin";
    const unsubs = [];

    mount(el, html`
      <div class="page-head">
        <div><h1>Halo, ${first}</h1>
          <div class="shift">${company.name} · ${roleLabel(member.role)}</div></div>
      </div>

      ${isAdmin ? html`<div class="metrics" style="margin-bottom:1.2rem">
        <a class="metric link" href="#/anggota"><div class="label">Permintaan bergabung</div><div class="val" id="d-pending">–</div></a>
        <div class="metric"><div class="label">Anggota aktif</div><div class="val" id="d-active">–</div></div>
        <div class="metric"><div class="label">Kode undangan</div>
          <div class="val code-val"><span class="badge-code">${company.code}</span>
          <button class="icon-btn" id="copyCode" title="Salin tautan undangan">${icon("mdi:content-copy")}</button></div></div>
      </div>` : isReader ? html`<div class="metrics" style="margin-bottom:1.2rem">
        <div class="metric"><div class="label">Anggota aktif</div><div class="val" id="d-active">–</div></div>
      </div>` : ""}

      ${isStaff ? html`<div class="panel" style="margin-bottom:1.2rem">
        <h3>${icon("mdi:head-cog-outline")} Ergonomi Kognitif — Saat Ini
          <a class="btn btn-ghost btn-sm" style="margin-left:auto" href="#/eeg/tim">Buka monitoring tim</a></h3>
        <div class="metrics">
          <div class="metric"><div class="label">Pekerja dipantau</div><div class="val" id="d-live">–</div></div>
          <div class="metric"><div class="label">Berisiko / Kritis</div><div class="val" style="color:var(--berisiko)" id="d-risk">–</div></div>
          <div class="metric"><div class="label">Sesi terputus</div><div class="val" style="color:var(--muted)" id="d-stale">–</div></div>
          <a class="metric link" href="#/eeg/peringatan"><div class="label">Peringatan terbuka</div><div class="val" style="color:var(--kritis)" id="d-alerts">–</div></a>
        </div></div>` : ""}

      <div class="panel" style="margin-bottom:1.2rem">
        <h3>${icon("mdi:clipboard-list-outline")} Perlu perhatian</h3>
        <div class="metrics" id="todo">
          <a class="metric link" href="#/smk3/capa"><div class="label">Tugas CAPA saya</div><div class="val" id="t-mycapa">–</div></a>
          <a class="metric link" href="#/smk3/kebijakan"><div class="label">Kebijakan belum dibaca</div><div class="val" id="t-policy">–</div></a>
          <a class="metric link" href="#/smk3/insiden"><div class="label">${can(ctx, NOT_WORKER) ? "Insiden baru dilaporkan" : "Laporan insiden saya"}</div><div class="val" id="t-inc">–</div></a>
          ${can(ctx, NOT_WORKER) ? html`<a class="metric link" href="#/smk3/capa"><div class="label">CAPA terlambat</div><div class="val" style="color:var(--kritis)" id="t-late">–</div></a>` : ""}
        </div>
        <div class="btn-row" style="margin-top:1rem">
          <a class="btn btn-ghost btn-sm" href="#/smk3/insiden">${icon("mdi:plus")} Laporkan insiden / near miss</a>
          <a class="btn btn-ghost btn-sm" href="#/smk3/pelatihan">${icon("mdi:school-outline")} Pelatihan saya</a>
        </div>
      </div>

      <div class="grid dash-grid">
        <div class="panel">
          <h3>${icon("mdi:head-cog-outline")} Monitoring EEG Saya</h3>
          <div id="d-mysession" class="muted tiny">Memuat…</div>
          <a class="btn btn-primary" style="margin-top:1rem" href="#/eeg/saya">${icon("mdi:play")} Buka Monitoring Saya</a>
        </div>
        ${smk3Map(member.role)}
      </div>`);

    // ---- anggota ----
    if (isReader) {
      unsubs.push(onSnapshot(collection(db, "companies", company.id, "members"), (snap) => {
        const all = snap.docs.map((d) => d.data());
        const set = (id, v) => { const x = el.querySelector("#" + id); if (x) x.textContent = v; };
        set("d-active", all.filter((m) => m.status === "active").length);
        set("d-pending", all.filter((m) => m.status === "pending").length);
      }, (e) => console.warn(e)));
    }
    el.querySelector("#copyCode")?.addEventListener("click", async () => {
      const link = `${location.origin}/onboarding?kode=${company.code}`;
      try { await navigator.clipboard.writeText(link); toast("Tautan undangan disalin.", "normal"); }
      catch { toast(link, "info", 10000); }
    });

    // ---- EEG staf ----
    if (isStaff) {
      let sessions = [];
      const paint = () => {
        const now = Date.now();
        const live = sessions.filter((s) => now - sessionSeenAt(s) <= STALE_MS);
        const set = (id, v) => { const x = el.querySelector("#" + id); if (x) x.textContent = v; };
        set("d-live", live.length);
        set("d-risk", live.filter((s) => s.status === "berisiko" || s.status === "kritis").length);
        set("d-stale", sessions.length - live.length);
      };
      unsubs.push(onSnapshot(query(collection(db, "companies", company.id, "eegSessions"), where("active", "==", true)),
        (snap) => { sessions = snap.docs.map((d) => d.data()); paint(); }, (e) => console.warn(e)));
      unsubs.push(onSnapshot(query(collection(db, "companies", company.id, "eegAlerts"), where("status", "==", "open")),
        (snap) => { const x = el.querySelector("#d-alerts"); if (x) x.textContent = snap.size; }, (e) => console.warn(e)));
      const t = setInterval(paint, 10_000);
      unsubs.push(() => clearInterval(t));
    }

    // ---- perlu perhatian (SMK3) ----
    const setT = (id, v) => { const x = el.querySelector("#" + id); if (x) x.textContent = v; };
    const cref = (n) => collection(db, "companies", company.id, n);
    unsubs.push(onSnapshot(query(cref("capa"), where("assigneeUid", "==", ctx.user.uid)),
      (s) => setT("t-mycapa", s.docs.filter((d) => ["terbuka", "dikerjakan"].includes(d.data().status)).length), () => setT("t-mycapa", "—")));
    unsubs.push(onSnapshot(can(ctx, NOT_WORKER) ? query(cref("incidents"), where("status", "==", "dilaporkan")) : query(cref("incidents"), where("reportedBy", "==", ctx.user.uid)),
      (s) => setT("t-inc", s.size), () => setT("t-inc", "—")));
    if (can(ctx, NOT_WORKER)) unsubs.push(onSnapshot(query(cref("capa"), where("dueDate", "<", new Date().toISOString().slice(0, 10))),
      (s) => setT("t-late", s.docs.filter((d) => isOverdue(d.data())).length), () => setT("t-late", "—")));
    getDocs(query(cref("policies"), where("status", "==", "disahkan"))).then(async (s) => {
      const acked = await Promise.all(s.docs.map((d) => getDoc(doc(d.ref, "acks", ctx.user.uid)).then((x) => x.exists()).catch(() => true)));
      setT("t-policy", acked.filter((x) => !x).length);
    }).catch(() => setT("t-policy", "—"));

    // ---- sesi saya ----
    unsubs.push(onSnapshot(query(collection(db, "companies", company.id, "eegSessions"),
      where("uid", "==", ctx.user.uid), orderBy("startedAt", "desc"), limit(1)), (snap) => {
      const box = el.querySelector("#d-mysession"); if (!box) return;
      if (snap.empty) return mount(box, html`Belum ada sesi. Mulai sesi pada awal shift untuk kalibrasi baseline personal.`);
      const s = { id: snap.docs[0].id, ...snap.docs[0].data() };
      const sum = s.summary;
      mount(box, html`<div class="row-between"><span>${s.active ? "Sesi berjalan" : "Sesi terakhir"} · ${relTime(s.startedAt)}</span>
        <span class="pill ${s.status}">${STATUS_LABEL[s.status] || s.status}</span></div>
        ${sum ? html`<div class="mini" style="margin-top:.6rem">
          <div><b>${sum.durationMin}</b><span>menit</span></div>
          <div><b>${sum.avgFi}</b><span>rerata FI</span></div>
          <div><b>${s.microsleepCount || 0}</b><span>microsleep</span></div></div>` : ""}
        <a class="tiny" href="#/eeg/sesi/${s.id}">Lihat detail sesi →</a>`);
    }, (e) => { console.warn(e); const box = el.querySelector("#d-mysession"); if (box) box.textContent = "Riwayat belum dapat dimuat."; }));

    return () => unsubs.forEach((u) => u());
  },
};
