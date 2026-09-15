// Utilitas tampilan bersama. SEMUA teks dari pengguna harus lewat html`` / esc()
// supaya tidak ada celah XSS.

/* ---------- escaping & templating ---------- */
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"'`]/g, (c) => ESC[c]);

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
/** Tandai string sebagai HTML tepercaya (JANGAN dipakai untuk input pengguna). */
export const raw = (s) => new Raw(String(s));

function renderVal(v) {
  if (v == null || v === false) return "";
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(renderVal).join("");
  return esc(v);
}
/** Tagged template: interpolasi di-escape otomatis; array & html`` bersarang didukung. */
export function html(strings, ...vals) {
  let out = "";
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += renderVal(vals[i]); });
  return new Raw(out);
}
export function mount(el, content) { el.innerHTML = content instanceof Raw ? content.s : esc(content); }

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- ikon ---------- */
export const icon = (name, cls = "") => raw(`<iconify-icon icon="${esc(name)}" class="${esc(cls)}"></iconify-icon>`);

/* ---------- toast ---------- */
export function toast(text, kind = "info", ms = 5000) {
  let host = document.getElementById("toasts");
  if (!host) { host = document.createElement("div"); host.id = "toasts"; host.className = "toast-host"; document.body.appendChild(host); }
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.setAttribute("role", "status");
  el.textContent = text;
  host.appendChild(el);
  while (host.children.length > 4) host.firstElementChild.remove();   // jangan menumpuk
  setTimeout(() => el.remove(), ms);
}

/* ---------- tombol sibuk ---------- */
export function busy(btn, label = "Memproses…") {
  if (!btn) return;
  btn.disabled = true; btn.dataset.t = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> ${esc(label)}`;
}
export function unbusy(btn) {
  if (!btn) return;
  btn.disabled = false; if (btn.dataset.t != null) btn.innerHTML = btn.dataset.t;
}

/* ---------- modal ---------- */
/**
 * modal({ title, body: html``, submitLabel, danger, onSubmit(form, dialog) })
 * onSubmit boleh async; lempar Error untuk menampilkan pesan & menahan modal.
 * Mengembalikan Promise<boolean> (true bila berhasil disubmit).
 */
export function modal({ title, body, submitLabel = "Simpan", cancelLabel = "Batal", danger = false, onSubmit }) {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = "modal";
    mount(dlg, html`
      <form method="dialog" class="modal-card" novalidate>
        <div class="modal-head"><h3>${title}</h3>
          <button type="button" class="icon-btn" data-close aria-label="Tutup">${icon("mdi:close")}</button></div>
        <div class="msg err hidden" data-msg></div>
        <div class="modal-body">${body || ""}</div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-close>${cancelLabel}</button>
          ${onSubmit ? html`<button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-submit>${submitLabel}</button>` : ""}
        </div>
      </form>`);
    document.body.appendChild(dlg);
    const form = dlg.querySelector("form");
    const msg = dlg.querySelector("[data-msg]");
    let done = false;
    const close = (ok) => { if (done) return; done = true; dlg.close(); dlg.remove(); resolve(ok); };
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(false); });
    $$("[data-close]", dlg).forEach((b) => b.addEventListener("click", () => close(false)));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!onSubmit) return close(true);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const btn = dlg.querySelector("[data-submit]");
      msg.classList.add("hidden"); busy(btn);
      try { await onSubmit(form, dlg); close(true); }
      catch (err) { console.warn(err); msg.textContent = errorMessage(err); msg.classList.remove("hidden"); unbusy(btn); }
    });
    dlg.showModal();
    const first = form.querySelector("input,select,textarea");
    if (first) first.focus();
  });
}

export const confirmDialog = (title, message, { danger = false, label = "Ya, lanjutkan" } = {}) =>
  modal({ title, body: html`<p>${message}</p>`, submitLabel: label, danger, onSubmit: () => {} });

/* ---------- format waktu ---------- */
export const toMillis = (t) => (t == null ? null : typeof t === "number" ? t : t.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : null);
const LOC = "id-ID";
export const fmtDate = (t) => { const m = toMillis(t); return m ? new Date(m).toLocaleDateString(LOC, { day: "2-digit", month: "short", year: "numeric" }) : "—"; };
export const fmtTime = (t) => { const m = toMillis(t); return m ? new Date(m).toLocaleTimeString(LOC, { hour: "2-digit", minute: "2-digit" }) : "—"; };
export const fmtDateTime = (t) => { const m = toMillis(t); return m ? new Date(m).toLocaleString(LOC, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; };
export function relTime(t) {
  const m = toMillis(t); if (!m) return "—";
  const s = Math.round((Date.now() - m) / 1000);
  if (s < 45) return "baru saja";
  if (s < 3600) return Math.round(s / 60) + " mnt lalu";
  if (s < 86400) return Math.round(s / 3600) + " jam lalu";
  return fmtDate(m);
}
export const initials = (n) => String(n || "?").trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();

/* ---------- pesan error ---------- */
export function errorMessage(err) {
  const code = err?.code || "";
  const map = {
    "permission-denied": "Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.",
    "unavailable": "Layanan tidak dapat dihubungi. Periksa koneksi internet.",
    "not-found": "Data tidak ditemukan.",
    "failed-precondition": "Operasi belum dapat dilakukan (indeks database mungkin sedang dibuat).",
    "resource-exhausted": "Kuota layanan terlampaui. Coba lagi nanti.",
  };
  if (map[code]) return map[code];
  if (err?.message && !code) return err.message;
  return "Terjadi kesalahan. Coba lagi.";
}

/* ---------- form ---------- */
export const formData = (form) => Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
export const options = (list, selected) =>
  list.map(([value, label]) => html`<option value="${value}" ${raw(value === selected ? "selected" : "")}>${label}</option>`);
