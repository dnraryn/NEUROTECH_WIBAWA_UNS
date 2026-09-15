// Kebijakan K3 & P2K3 — penyusunan, pengesahan pimpinan, sosialisasi (konfirmasi baca), versi; struktur P2K3. (Elemen 1)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { activeMembers } from "../core/members.js";
import { html, mount, icon, modal, toast, errorMessage, fmtDateTime } from "../core/ui.js";
import { fieldsHTML, readFields, today, addMonths, fmtDay } from "../core/form.js";
import { POLICY_CATEGORY, POLICY_STATUS, P2K3_ROLE, NOT_WORKER, K3_ADMIN, badge, opts } from "../smk3/common.js";
import {
  collection, doc, query, where, onSnapshot, getDoc, getDocs, writeBatch, serverTimestamp, setDoc, deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const EDITORS = ["admin", "ahli_k3", "manajemen"];
const APPROVERS = ["admin", "manajemen"];
const TEMPLATE = `KEBIJAKAN KESELAMATAN DAN KESEHATAN KERJA

[Nama perusahaan] berkomitmen untuk:
1. Mencegah kecelakaan kerja dan penyakit akibat kerja, termasuk risiko kelelahan mental dan beban kognitif.
2. Mematuhi peraturan perundang-undangan K3 yang berlaku, termasuk PP No. 50 Tahun 2012.
3. Melibatkan dan berkonsultasi dengan tenaga kerja dalam penerapan K3.
4. Menyediakan sumber daya yang memadai dan melakukan perbaikan berkelanjutan.

Tujuan dan sasaran K3 tahun berjalan:
- Nihil kecelakaan fatal.
- LTIFR di bawah … per 1.000.000 jam kerja.
- 100% CAPA diverifikasi tepat waktu.

Kebijakan ini ditinjau secara berkala dan dikomunikasikan kepada seluruh tenaga kerja, tamu, kontraktor, pelanggan, dan pemasok.`;

const policyFields = [
  { name: "title", label: "Judul", required: true, max: 160 },
  { name: "category", label: "Kategori", type: "select", options: opts(POLICY_CATEGORY), required: true, half: true },
  { name: "version", label: "Versi", required: true, max: 20, half: true },
  { name: "content", label: "Isi kebijakan", type: "textarea", rows: 14, required: true, max: 20000 },
  { name: "reviewDate", label: "Tanggal tinjau ulang", type: "date", half: true },
];

function renderPolicies(el, ctx, box) {
  const cid = ctx.company.id;
  const viewer = can(ctx, NOT_WORKER), editor = can(ctx, EDITORS), approver = can(ctx, APPROVERS);
  const actor = { uid: ctx.user.uid, name: ctx.member.name };
  let rows = [], myAcks = new Set();

  async function write(ref, data, info, { create = false } = {}) {
    const b = writeBatch(db);
    create ? b.set(ref, data) : b.update(ref, { ...data, updatedAt: serverTimestamp() });
    logInBatch(b, cid, actor, { entity: "policy", entityId: ref.id, ...info });
    await b.commit();
  }

  function paint() {
    const pending = rows.filter((p) => p.status === "disahkan" && !myAcks.has(p.id));
    mount(box, html`
      ${pending.length ? html`<div class="banner" style="margin:0 0 1rem">${icon("mdi:file-sign")} <span>Ada <b>${pending.length}</b> kebijakan yang perlu Anda baca dan konfirmasi.</span></div>` : ""}
      <div class="row-between" style="margin-bottom:.8rem"><span class="tiny muted">Kebijakan disahkan oleh pengusaha/pengurus dan wajib dikomunikasikan kepada seluruh tenaga kerja (kriteria 1.1.1–1.1.5).</span>
        ${editor ? html`<button class="btn btn-primary" id="newPol">${icon("mdi:plus")} Kebijakan baru</button>` : ""}</div>
      <div class="panel table-wrap"><table class="tbl">
        <thead><tr><th>Kebijakan</th><th>Versi</th><th>Disahkan</th><th>Tinjau ulang</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.length ? rows.map((p) => html`<tr class="click" data-id="${p.id}">
          <td><b>${p.title}</b><div class="tiny muted">${POLICY_CATEGORY[p.category]}</div></td><td>${p.version}</td>
          <td class="tiny">${p.approvedByName ? html`${p.approvedByName}<br />${fmtDay(p.effectiveDate)}` : "—"}</td>
          <td class="tiny">${fmtDay(p.reviewDate)}</td><td>${badge(POLICY_STATUS, p.status)}</td>
          <td>${p.status === "disahkan" ? (myAcks.has(p.id) ? html`<span class="tiny" style="color:var(--normal)">✔ sudah dibaca</span>` : html`<span class="tag warn">PERLU DIBACA</span>`) : ""}</td></tr>`)
          : html`<tr><td colspan="6" class="muted tiny">Belum ada kebijakan${viewer ? "" : " yang disahkan"}.</td></tr>`}</tbody></table></div>`);

    box.querySelector("#newPol")?.addEventListener("click", () => modal({
      title: "Kebijakan baru (draf)", body: fieldsHTML(policyFields, { category: "kebijakan_k3", version: "1.0", content: TEMPLATE.replace("[Nama perusahaan]", ctx.company.name), reviewDate: addMonths(today(), 12) }),
      submitLabel: "Simpan draf",
      onSubmit: async (form) => {
        const f = readFields(form, policyFields);
        const ref = doc(collection(db, "companies", cid, "policies"));
        await write(ref, { ...f, status: "draft", createdBy: ctx.user.uid, createdByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
          { action: "policy.create", summary: `${f.title} v${f.version} (draf)` }, { create: true });
        toast("Draf kebijakan disimpan.", "normal");
      },
    }));
  }

  async function openPolicy(p) {
    const ref = doc(db, "companies", cid, "policies", p.id);
    let acks = [], members = [];
    if (viewer && p.status === "disahkan") {
      [acks, members] = await Promise.all([
        getDocs(collection(ref, "acks")).then((s) => s.docs.map((d) => d.data())),
        activeMembers(ctx),
      ]);
    }
    const ackSet = new Set(acks.map((a) => a.uid));
    const notYet = members.filter((m) => !ackSet.has(m.uid));
    const pct = members.length ? Math.round((members.filter((m) => ackSet.has(m.uid)).length / members.length) * 100) : 0;
    const actions = [];
    if (p.status === "draft" && editor) actions.push(html`<button type="button" class="btn btn-ghost btn-sm" data-a="edit">Ubah draf</button>`, html`<button type="button" class="btn btn-ghost btn-sm" data-a="del">Hapus draf</button>`);
    if (p.status === "draft" && approver) actions.push(html`<button type="button" class="btn btn-primary btn-sm" data-a="approve">${icon("mdi:stamp")} Sahkan</button>`);
    if (p.status === "disahkan" && editor) actions.push(html`<button type="button" class="btn btn-ghost btn-sm" data-a="newver">Buat versi baru</button>`, html`<button type="button" class="btn btn-ghost btn-sm" data-a="revoke">Cabut</button>`);

    modal({
      title: `${p.title} (v${p.version})`,
      body: html`<div class="btn-row" style="margin-bottom:.6rem">${badge(POLICY_STATUS, p.status)} <span class="tiny muted">${POLICY_CATEGORY[p.category]}${p.approvedByName ? ` · disahkan ${p.approvedByName}, ${fmtDay(p.effectiveDate)}` : ""}</span></div>
        <div class="doc-content">${p.content}</div>
        ${viewer && p.status === "disahkan" ? html`<h4 class="sub-h">Sosialisasi: ${pct}% pekerja sudah membaca</h4>
          <div class="progress thin"><i style="width:${pct}%"></i></div>
          ${notYet.length ? html`<p class="tiny muted">Belum membaca (${notYet.length}): ${notYet.slice(0, 30).map((m) => m.name).join(", ")}${notYet.length > 30 ? "…" : ""}</p>` : ""}` : ""}
        ${actions.length ? html`<div class="btn-row" style="margin-top:1rem">${actions}</div>` : ""}`,
      submitLabel: "Saya telah membaca & memahami",
      cancelLabel: "Tutup",
      onSubmit: p.status === "disahkan" && !myAcks.has(p.id) ? async () => {
        await setDoc(doc(ref, "acks", ctx.user.uid), { uid: ctx.user.uid, name: ctx.member.name, version: p.version, at: serverTimestamp() });
        myAcks.add(p.id); paint();
        toast("Terima kasih, konfirmasi tercatat.", "normal");
      } : null,
    });

    document.querySelectorAll("dialog.modal [data-a]").forEach((b) => b.onclick = async () => {
      const close = () => b.closest("dialog").querySelector("[data-close]").click();
      try {
        if (b.dataset.a === "edit") { close(); modal({ title: "Ubah draf kebijakan", body: fieldsHTML(policyFields, p),
          onSubmit: (form) => { const f = readFields(form, policyFields); return write(ref, f, { action: "policy.update", summary: `${f.title} v${f.version}` }); } }); }
        if (b.dataset.a === "del" && confirm("Hapus draf ini?")) { await deleteDoc(ref); close(); }
        if (b.dataset.a === "approve" && confirm(`Sahkan "${p.title}" v${p.version}? Isi tidak dapat diubah setelah disahkan.`)) {
          await write(ref, { status: "disahkan", approvedBy: ctx.user.uid, approvedByName: ctx.member.name, approvedAt: serverTimestamp(), effectiveDate: today() },
            { action: "policy.approve", summary: `${p.title} v${p.version} disahkan` });
          close(); toast("Kebijakan disahkan. Seluruh anggota diminta membaca.", "normal");
        }
        if (b.dataset.a === "revoke" && confirm("Cabut kebijakan ini?")) { await write(ref, { status: "dicabut" }, { action: "policy.revoke", summary: `${p.title} v${p.version} dicabut` }); close(); }
        if (b.dataset.a === "newver") {
          close();
          const next = `${Math.floor(parseFloat(p.version) || 1) + 1}.0`;
          const nref = doc(collection(db, "companies", cid, "policies"));
          await write(nref, { title: p.title, category: p.category, version: next, content: p.content, reviewDate: addMonths(today(), 12), status: "draft", previousId: p.id,
            createdBy: ctx.user.uid, createdByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
            { action: "policy.create", summary: `${p.title} v${next} (revisi dari v${p.version})` }, { create: true });
          toast(`Draf versi ${next} dibuat.`, "normal");
        }
      } catch (err) { toast(errorMessage(err), "kritis"); }
    });
  }

  box.onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) openPolicy(rows.find((p) => p.id === tr.dataset.id)).catch((err) => toast(errorMessage(err), "kritis")); };

  const col = collection(db, "companies", cid, "policies");
  const unsubs = [onSnapshot(viewer ? col : query(col, where("status", "==", "disahkan")), async (s) => {
    rows = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.status === "disahkan" ? 0 : 1) - (b.status === "disahkan" ? 0 : 1) || a.title.localeCompare(b.title));
    const approved = rows.filter((p) => p.status === "disahkan");
    const res = await Promise.all(approved.map((p) => getDoc(doc(col, p.id, "acks", ctx.user.uid)).then((x) => (x.exists() ? p.id : null)).catch(() => null)));
    myAcks = new Set(res.filter(Boolean));
    paint();
  }, (err) => mount(box, html`<div class="msg err">${errorMessage(err)}</div>`))];
  return () => unsubs.forEach((u) => u());
}

/* ---------- P2K3 ---------- */
function renderP2k3(el, ctx, box) {
  const cid = ctx.company.id;
  const admin = can(ctx, K3_ADMIN);
  const ref = doc(db, "companies", cid, "p2k3", "structure");
  let data = null;

  function paint() {
    const d = data || { members: [] };
    mount(box, html`<div class="grid two-col">
      <div class="panel"><h3>${icon("mdi:account-group-outline")} Struktur P2K3</h3>
        <table class="tbl kv"><tbody>
          <tr><th>Nomor SK pengesahan</th><td>${d.skNumber || "—"}</td></tr><tr><th>Tanggal SK</th><td>${fmtDay(d.skDate)}</td></tr>
          <tr><th>Jadwal rapat rutin</th><td>${d.meetingSchedule || "—"}</td></tr></tbody></table>
        <table class="tbl" style="margin-top:.8rem"><thead><tr><th>Nama</th><th>Kedudukan</th><th>Jabatan di perusahaan</th></tr></thead>
          <tbody>${d.members.length ? d.members.map((m) => html`<tr><td>${m.name}</td><td>${P2K3_ROLE[m.role] || m.role}</td><td>${m.position || "—"}</td></tr>`) : html`<tr><td colspan="3" class="muted tiny">Struktur belum diisi.</td></tr>`}</tbody></table>
        ${admin ? html`<button class="btn btn-primary" id="editP2k3" style="margin-top:1rem">${icon("mdi:pencil-outline")} Ubah struktur</button>` : ""}
        ${d.updatedAt ? html`<p class="tiny muted">Diperbarui ${fmtDateTime(d.updatedAt)}</p>` : ""}</div>
      <div class="panel"><h3>${icon("mdi:information-outline")} Tentang P2K3</h3>
        <p class="tiny">Panitia Pembina Keselamatan dan Kesehatan Kerja (P2K3) adalah wadah kerja sama pengusaha dan pekerja untuk mengembangkan penerapan K3.
          Sekretaris P2K3 adalah Ahli K3. Struktur, penunjukan penanggung jawab K3, serta keterlibatan &amp; konsultasi tenaga kerja dinilai pada kriteria audit 1.2 dan 1.4.</p></div></div>`);

    box.querySelector("#editP2k3")?.addEventListener("click", async () => {
      const members = await activeMembers(ctx);
      const rowsHTML = (list) => list.map((m, i) => html`<div class="form-grid p2k3-row" data-i="${i}">
        <div class="field"><label>Nama</label><input name="name_${i}" list="memberNames" value="${m.name || ""}" maxlength="120" /></div>
        <div class="field"><label>Kedudukan</label><select name="role_${i}">${opts(P2K3_ROLE).map(([k, v]) => html`<option value="${k}" ${m.role === k ? "selected" : ""}>${v}</option>`)}</select></div>
        <div class="field"><label>Jabatan</label><input name="pos_${i}" value="${m.position || ""}" maxlength="80" /></div></div>`);
      const list = d.members.length ? d.members : [{ role: "ketua" }, { role: "sekretaris" }, { role: "anggota" }];
      modal({
        title: "Struktur P2K3",
        body: html`<datalist id="memberNames">${members.map((m) => html`<option value="${m.name}"></option>`)}</datalist>
          <div class="form-grid"><div class="field"><label>Nomor SK</label><input name="skNumber" value="${d.skNumber || ""}" maxlength="80" /></div>
          <div class="field"><label>Tanggal SK</label><input type="date" name="skDate" value="${d.skDate || ""}" /></div></div>
          <div class="field"><label>Jadwal rapat rutin</label><input name="meetingSchedule" value="${d.meetingSchedule || ""}" maxlength="160" placeholder="cth. Setiap Senin minggu pertama, 09.00" /></div>
          <div id="p2rows">${rowsHTML([...list, {}, {}])}</div>
          <p class="tiny muted">Baris dengan nama kosong diabaikan.</p>`,
        onSubmit: async (form) => {
          const rows = [...form.querySelectorAll(".p2k3-row")].map((r) => { const i = r.dataset.i; return { name: form[`name_${i}`].value.trim(), role: form[`role_${i}`].value, position: form[`pos_${i}`].value.trim() }; }).filter((r) => r.name);
          const b = writeBatch(db);
          b.set(ref, { skNumber: form.skNumber.value.trim(), skDate: form.skDate.value, meetingSchedule: form.meetingSchedule.value.trim(), members: rows, updatedBy: ctx.user.uid, updatedAt: serverTimestamp() });
          logInBatch(b, cid, { uid: ctx.user.uid, name: ctx.member.name }, { action: "p2k3.update", entity: "policy", entityId: "p2k3", summary: `Struktur P2K3 diperbarui (${rows.length} anggota)` });
          await b.commit();
          toast("Struktur P2K3 disimpan.", "normal");
        },
      });
    });
  }
  return onSnapshot(ref, (s) => { data = s.exists() ? s.data() : null; paint(); }, (err) => mount(box, html`<div class="msg err">${errorMessage(err)}</div>`));
}

export default {
  render(el, ctx) {
    let tab = "kebijakan", cleanup = null;
    mount(el, html`<div class="page-head"><div><h1>Kebijakan K3 &amp; P2K3</h1>
      <div class="shift">Pembangunan dan pemeliharaan komitmen (Elemen 1 PP 50/2012).</div></div></div>
      <div class="toolbar"><div class="tabs" id="tabs"><button data-tab="kebijakan" class="active">Kebijakan</button><button data-tab="p2k3">P2K3</button></div></div>
      <div id="box"></div>`);
    const box = el.querySelector("#box");
    const show = () => { cleanup?.(); box.onclick = null; cleanup = tab === "kebijakan" ? renderPolicies(el, ctx, box) : renderP2k3(el, ctx, box); };
    el.querySelector("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.tab; el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b)); show(); };
    show();
    return () => cleanup?.();
  },
};
