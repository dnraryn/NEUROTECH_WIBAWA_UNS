// Inspeksi K3 — template checklist, jadwal berdasarkan frekuensi, pelaksanaan, temuan → CAPA. (Elemen 7)
import { db } from "../core/firebase.js";
import { can } from "../core/roles.js";
import { logInBatch } from "../core/audit.js";
import { activeMembers } from "../core/members.js";
import { html, mount, icon, modal, toast, errorMessage, fmtDateTime } from "../core/ui.js";
import { fieldsHTML, readFields, today, addDays, fmtDay } from "../core/form.js";
import { FREQUENCY, FREQ_DAYS, INSPECT_RESULT, K3_ADMIN, CAPA_STATUS, badge, opts, shortId } from "../smk3/common.js";
import {
  collection, doc, query, orderBy, limit, where, onSnapshot, writeBatch, serverTimestamp, deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const INSPECTORS = ["admin", "ahli_k3", "supervisor"];
const tplFields = [
  { name: "name", label: "Nama checklist", required: true, max: 160, placeholder: "cth. Inspeksi APAR & jalur evakuasi" },
  { name: "area", label: "Area", max: 160, half: true, placeholder: "cth. Gudang bahan baku" },
  { name: "frequency", label: "Frekuensi", type: "select", options: opts(FREQUENCY), required: true, half: true },
  { name: "itemsText", label: "Butir pemeriksaan (satu per baris)", type: "textarea", rows: 8, max: 8000, required: true,
    placeholder: "APAR tersedia dan tidak kedaluwarsa\nJalur evakuasi bebas hambatan\nRambu keluar darurat menyala" },
];

const STATUS = { draft: { label: "Draf", cls: "waspada" }, selesai: { label: "Selesai", cls: "normal" } };

function renderList(el, ctx) {
  const cid = ctx.company.id;
  const admin = can(ctx, K3_ADMIN), inspector = can(ctx, INSPECTORS);
  const actor = { uid: ctx.user.uid, name: ctx.member.name };
  let templates = [], inspections = [], tab = "jadwal";

  mount(el, html`
    <div class="page-head"><div><h1>Inspeksi K3</h1>
      <div class="shift">Pemeriksaan bahaya terjadwal dan temuan yang ditindaklanjuti (Elemen 7 PP 50/2012).</div></div>
      ${admin ? html`<button class="btn btn-ghost" id="newTpl">${icon("mdi:plus")} Template checklist</button>` : ""}</div>
    <div class="metrics" style="margin-bottom:1.2rem">
      <div class="metric"><div class="label">Jatuh tempo / terlewat</div><div class="val" style="color:var(--kritis)" id="m-due">–</div></div>
      <div class="metric"><div class="label">Inspeksi 30 hari</div><div class="val" id="m-30">–</div></div>
      <div class="metric"><div class="label">Temuan tidak sesuai (30 hari)</div><div class="val" style="color:var(--berisiko)" id="m-nc">–</div></div>
    </div>
    <div class="toolbar"><div class="tabs" id="tabs">
      <button data-tab="jadwal" class="active">Jadwal</button><button data-tab="riwayat">Riwayat</button>
    </div></div>
    <div id="body"></div>`);

  const body = el.querySelector("#body");
  const lastOf = (tplId) => inspections.filter((i) => i.templateId === tplId && i.status === "selesai").sort((a, b) => b.date.localeCompare(a.date))[0];

  function paint() {
    const td = today(), since = addDays(td, -30);
    const sched = templates.filter((t) => t.active !== false).map((t) => {
      const last = lastOf(t.id);
      const next = last ? addDays(last.date, FREQ_DAYS[t.frequency]) : td;
      return { t, last, next, due: next <= td, draft: inspections.find((i) => i.templateId === t.id && i.status === "draft") };
    }).sort((a, b) => a.next.localeCompare(b.next));
    el.querySelector("#m-due").textContent = sched.filter((s) => s.due).length;
    const recent = inspections.filter((i) => i.status === "selesai" && i.date >= since);
    el.querySelector("#m-30").textContent = recent.length;
    el.querySelector("#m-nc").textContent = recent.reduce((n, i) => n + (i.summary?.tidak || 0), 0);

    if (tab === "jadwal") {
      mount(body, html`<div class="panel table-wrap"><table class="tbl">
        <thead><tr><th>Checklist</th><th>Area</th><th>Frekuensi</th><th>Terakhir</th><th>Berikutnya</th><th></th></tr></thead>
        <tbody>${sched.length ? sched.map(({ t, last, next, due, draft }) => html`<tr>
          <td><b>${t.name}</b><div class="tiny muted">${t.items.length} butir</div></td>
          <td class="tiny">${t.area || "—"}</td><td class="tiny">${FREQUENCY[t.frequency]}</td>
          <td class="tiny">${last ? fmtDay(last.date) : "Belum pernah"}</td>
          <td class="nowrap">${fmtDay(next)}${due ? html` <span class="tag warn">JATUH TEMPO</span>` : ""}</td>
          <td class="actions">
            ${draft ? html`<a class="btn btn-ghost btn-sm" href="#/smk3/inspeksi/${draft.id}">Lanjutkan draf</a>`
              : inspector ? html`<button class="btn btn-primary btn-sm" data-start="${t.id}">Mulai inspeksi</button>` : ""}
            ${admin ? html`<button class="icon-btn" title="Ubah template" data-edit="${t.id}">${icon("mdi:pencil-outline")}</button>` : ""}
          </td></tr>`) : html`<tr><td colspan="6" class="muted tiny">${admin ? "Buat template checklist terlebih dahulu." : "Belum ada template checklist."}</td></tr>`}</tbody></table></div>`);
    } else {
      mount(body, html`<div class="panel table-wrap"><table class="tbl">
        <thead><tr><th>Tanggal</th><th>Checklist</th><th>Inspektor</th><th>Hasil</th><th>Status</th></tr></thead>
        <tbody>${inspections.length ? inspections.map((i) => html`<tr class="click" data-id="${i.id}">
          <td class="nowrap">${fmtDay(i.date)}</td><td><b>${i.templateName}</b><div class="tiny muted">${i.area || ""}</div></td>
          <td>${i.inspectorName}</td>
          <td class="tiny">${i.summary ? html`<span style="color:var(--normal)">${i.summary.ok} sesuai</span> · <span style="color:var(--berisiko)">${i.summary.tidak} tidak sesuai</span> · ${i.summary.na} N/A` : "—"}</td>
          <td>${badge(STATUS, i.status)}</td></tr>`) : html`<tr><td colspan="5" class="muted tiny">Belum ada inspeksi.</td></tr>`}</tbody></table></div>`);
    }
  }

  function tplModal(t) {
    return modal({
      title: t ? "Ubah template checklist" : "Template checklist baru",
      body: html`${fieldsHTML(tplFields, t ? { ...t, itemsText: t.items.map((i) => i.text).join("\n") } : { frequency: "bulanan" })}
        ${t ? html`<label class="check"><input type="checkbox" name="active" ${t.active === false ? "" : "checked"} /> <span>Aktif (tampil di jadwal)</span></label>` : ""}`,
      onSubmit: async (form) => {
        const f = readFields(form, tplFields);
        const lines = f.itemsText.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 100);
        if (!lines.length) throw new Error("Isi minimal satu butir pemeriksaan.");
        const prev = new Map((t?.items || []).map((i) => [i.text, i.id]));
        const items = lines.map((text, n) => ({ id: prev.get(text) || `i${Date.now().toString(36)}${n}`, text }));
        const ref = t ? doc(db, "companies", cid, "inspectionTemplates", t.id) : doc(collection(db, "companies", cid, "inspectionTemplates"));
        const data = { name: f.name, area: f.area, frequency: f.frequency, items, active: t ? form.active.checked : true, updatedAt: serverTimestamp() };
        const b = writeBatch(db);
        if (t) b.update(ref, data); else b.set(ref, { ...data, createdBy: ctx.user.uid, createdAt: serverTimestamp() });
        logInBatch(b, cid, actor, { action: t ? "inspection.template.update" : "inspection.template.create", entity: "inspection", entityId: ref.id, summary: `${f.name} (${items.length} butir, ${FREQUENCY[f.frequency]})` });
        await b.commit();
        toast("Template disimpan.", "normal");
      },
    });
  }

  async function start(t) {
    const ref = doc(collection(db, "companies", cid, "inspections"));
    const b = writeBatch(db);
    b.set(ref, {
      templateId: t.id, templateName: t.name, area: t.area || "", date: today(),
      items: t.items.map((i) => ({ id: i.id, text: i.text, result: "", note: "" })),
      status: "draft", inspectorUid: ctx.user.uid, inspectorName: ctx.member.name, notes: "",
      createdBy: ctx.user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    logInBatch(b, cid, actor, { action: "inspection.start", entity: "inspection", entityId: ref.id, summary: `Inspeksi dimulai: ${t.name}` });
    await b.commit();
    ctx.navigate("/smk3/inspeksi/" + ref.id);
  }

  el.querySelector("#newTpl")?.addEventListener("click", () => tplModal(null));
  el.querySelector("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.tab; el.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b)); paint(); };
  body.onclick = (e) => {
    const s = e.target.closest("[data-start]"), ed = e.target.closest("[data-edit]"), tr = e.target.closest("tr[data-id]");
    if (s) start(templates.find((t) => t.id === s.dataset.start)).catch((err) => toast(errorMessage(err), "kritis"));
    else if (ed) tplModal(templates.find((t) => t.id === ed.dataset.edit));
    else if (tr) ctx.navigate("/smk3/inspeksi/" + tr.dataset.id);
  };

  const unsubs = [
    onSnapshot(collection(db, "companies", cid, "inspectionTemplates"), (s) => { templates = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)); paint(); },
      (err) => mount(body, html`<div class="msg err">${errorMessage(err)}</div>`)),
    onSnapshot(query(collection(db, "companies", cid, "inspections"), orderBy("date", "desc"), limit(300)), (s) => { inspections = s.docs.map((d) => ({ id: d.id, ...d.data() })); paint(); },
      (err) => console.warn(err)),
  ];
  return () => unsubs.forEach((u) => u());
}

/* ================= pelaksanaan inspeksi ================= */
function renderDetail(el, ctx, id) {
  const cid = ctx.company.id;
  const ref = doc(db, "companies", cid, "inspections", id);
  const actor = { uid: ctx.user.uid, name: ctx.member.name };
  let ins = null, capas = [], dirty = false;

  function paint() {
    const editable = ins.status === "draft" && (ins.inspectorUid === ctx.user.uid || can(ctx, K3_ADMIN));
    const sum = summarize(ins.items);
    mount(el, html`
      <div class="page-head"><div><a class="tiny" href="#/smk3/inspeksi">← Inspeksi</a>
        <h1>${ins.templateName}</h1>
        <div class="shift">${ins.area || "—"} · inspektor ${ins.inspectorName} · ${fmtDay(ins.date)}</div></div>
        <div class="btn-row">${badge(STATUS, ins.status)}</div></div>
      <div class="metrics" style="margin-bottom:1.2rem">
        <div class="metric"><div class="label">Sesuai</div><div class="val" style="color:var(--normal)" id="s-ok">${sum.ok}</div></div>
        <div class="metric"><div class="label">Tidak sesuai</div><div class="val" style="color:var(--berisiko)" id="s-tidak">${sum.tidak}</div></div>
        <div class="metric"><div class="label">N/A</div><div class="val" id="s-na">${sum.na}</div></div>
        <div class="metric"><div class="label">Belum diisi</div><div class="val" style="color:var(--muted)" id="s-empty">${sum.empty}</div></div>
      </div>
      <form class="panel" id="insForm">
        ${editable ? html`<div class="field" style="max-width:220px"><label>Tanggal inspeksi</label><input type="date" name="date" value="${ins.date}" required /></div>` : ""}
        <div class="checklist">${ins.items.map((it, n) => {
          const capa = capas.find((c) => c.id === it.capaId);
          return html`<div class="ck-item ${it.result === "tidak" ? "nc" : ""}">
            <div class="ck-text"><b>${n + 1}.</b> ${it.text}</div>
            ${editable ? html`<div class="ck-res">${Object.entries(INSPECT_RESULT).map(([k, v]) => html`
              <label class="radio ${k}"><input type="radio" name="r_${it.id}" value="${k}" ${it.result === k ? "checked" : ""} /> <span>${v}</span></label>`)}</div>
              <input class="ck-note" name="n_${it.id}" maxlength="500" placeholder="Catatan / lokasi temuan" value="${it.note || ""}" />`
            : html`<div class="ck-res"><span class="pill ${it.result === "ok" ? "normal" : it.result === "tidak" ? "berisiko" : "idle"}">${INSPECT_RESULT[it.result] || "—"}</span>
                ${it.note ? html`<span class="tiny">${it.note}</span>` : ""}
                ${capa ? html`<a class="tiny" href="#/smk3/capa/${capa.id}">CAPA #${shortId(capa.id)} · ${CAPA_STATUS[capa.status]?.label}</a>` : ""}</div>`}
          </div>`;
        })}</div>
        ${editable ? html`<div class="field" style="margin-top:1rem"><label>Catatan umum</label><textarea name="notes" rows="2" maxlength="2000">${ins.notes || ""}</textarea></div>
          <div class="btn-row">
            <button class="btn btn-ghost" type="submit" data-act="save">${icon("mdi:content-save-outline")} Simpan draf</button>
            <button class="btn btn-primary" type="submit" data-act="finish">${icon("mdi:check")} Selesaikan inspeksi</button>
            <button class="btn btn-ghost" type="button" id="delBtn">Hapus draf</button>
          </div>` : ins.notes ? html`<h4 class="sub-h">Catatan umum</h4><p class="prewrap">${ins.notes}</p>` : ""}
        ${ins.completedAt ? html`<p class="tiny muted">Diselesaikan ${fmtDateTime(ins.completedAt)}</p>` : ""}
      </form>`);
    bind(editable);
  }

  const summarize = (items) => items.reduce((s, i) => { s[i.result || "empty"]++; return s; }, { ok: 0, tidak: 0, na: 0, empty: 0 });
  const readItems = (form) => ins.items.map((it) => ({ ...it, result: form.querySelector(`[name="r_${it.id}"]:checked`)?.value || "", note: form[`n_${it.id}`]?.value.trim() || "" }));

  function bind(editable) {
    const form = el.querySelector("#insForm");
    if (!editable) return;
    form.oninput = () => { dirty = true; };
    form.onchange = () => {
      const s = summarize(readItems(form));
      for (const key of ["ok", "tidak", "na", "empty"]) { const x = el.querySelector("#s-" + key); if (x) x.textContent = s[key]; }
      form.querySelectorAll(".ck-item").forEach((row, i) => row.classList.toggle("nc", form.querySelector(`[name="r_${ins.items[i].id}"]:checked`)?.value === "tidak"));
    };
    el.querySelector("#delBtn").onclick = async () => {
      if (!confirm("Hapus draf inspeksi ini?")) return;
      try { await deleteDoc(ref); ctx.navigate("/smk3/inspeksi"); } catch (e) { toast(errorMessage(e), "kritis"); }
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const act = e.submitter?.dataset.act;
      const items = readItems(form);
      const summary = summarize(items); delete summary.empty;
      const base = { items, notes: form.notes.value.trim(), date: form.date.value, summary, updatedAt: serverTimestamp() };
      try {
        if (act === "save") {
          const b = writeBatch(db); b.update(ref, base); await b.commit(); dirty = false; toast("Draf disimpan.", "normal"); return;
        }
        if (items.some((i) => !i.result)) return toast("Semua butir harus diisi sebelum menyelesaikan inspeksi.", "berisiko");
        const ncs = items.filter((i) => i.result === "tidak");
        const members = ncs.length ? await activeMembers(ctx) : [];
        const ok = await modal({
          title: "Selesaikan inspeksi",
          body: ncs.length ? html`<p>Terdapat <b>${ncs.length}</b> temuan tidak sesuai. Pilih temuan yang dibuatkan CAPA:</p>
            ${ncs.map((i) => html`<div class="panel" style="padding:.7rem;margin-bottom:.5rem">
              <label class="check"><input type="checkbox" name="c_${i.id}" checked /> <span><b>${i.text}</b>${i.note ? ` — ${i.note}` : ""}</span></label>
              <div class="form-grid" style="margin-top:.5rem">
                <div class="field"><label>Penanggung jawab</label><select name="a_${i.id}">${members.map((m) => html`<option value="${m.uid}" ${m.uid === ctx.user.uid ? "selected" : ""}>${m.name}</option>`)}</select></div>
                <div class="field"><label>Tenggat</label><input type="date" name="d_${i.id}" value="${addDays(today(), 7)}" /></div>
              </div></div>`)}` : html`<p>Semua butir sesuai atau N/A. Inspeksi akan dikunci setelah diselesaikan.</p>`,
          submitLabel: "Selesaikan",
          onSubmit: async (mf) => {
            const b = writeBatch(db);
            const finalItems = items.map((i) => ({ ...i }));
            for (const i of finalItems.filter((x) => x.result === "tidak")) {
              if (!mf[`c_${i.id}`]?.checked) continue;
              const cref = doc(collection(db, "companies", cid, "capa"));
              const m = members.find((x) => x.uid === mf[`a_${i.id}`].value);
              b.set(cref, {
                title: `Perbaiki: ${i.text}`.slice(0, 160), description: i.note || "", type: "korektif", priority: "sedang",
                assigneeUid: m.uid, assigneeName: m.name, dueDate: mf[`d_${i.id}`].value || addDays(today(), 7), status: "terbuka",
                sourceType: "inspeksi", sourceId: id, sourceLabel: `Inspeksi ${ins.templateName} (${fmtDay(base.date)})`,
                createdBy: ctx.user.uid, createdByName: ctx.member.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
              });
              i.capaId = cref.id;
            }
            b.update(ref, { ...base, items: finalItems, status: "selesai", completedAt: serverTimestamp() });
            logInBatch(b, cid, actor, { action: "inspection.finish", entity: "inspection", entityId: id, summary: `${ins.templateName}: ${summary.ok} sesuai, ${summary.tidak} tidak sesuai` });
            await b.commit();
          },
        });
        if (ok) { dirty = false; toast("Inspeksi diselesaikan.", "normal"); }
      } catch (err) { console.error(err); toast(errorMessage(err), "kritis"); }
    };
  }

  ctx.setLeaveGuard(() => (dirty ? "Perubahan inspeksi belum disimpan. Tinggalkan halaman?" : null));
  const unsubs = [
    onSnapshot(ref, (snap) => {
      if (!snap.exists()) return mount(el, html`<div class="empty-state"><h2>Inspeksi tidak ditemukan</h2><a class="btn btn-ghost" href="#/smk3/inspeksi">Kembali</a></div>`);
      ins = { id: snap.id, ...snap.data() };
      if (!dirty) paint();
    }, (err) => mount(el, html`<div class="empty-state"><h2>Tidak dapat membuka inspeksi</h2><p>${errorMessage(err)}</p></div>`)),
    onSnapshot(query(collection(db, "companies", cid, "capa"), where("sourceId", "==", id)), (s) => { capas = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (ins && !dirty) paint(); }, () => {}),
  ];
  return () => unsubs.forEach((u) => u());
}

export default {
  render(el, ctx, params) { return params?.id ? renderDetail(el, ctx, params.id) : renderList(el, ctx); },
};
