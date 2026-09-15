// Form generik berbasis skema — dipakai modul SMK3.
//   field: { name, label, type: text|textarea|select|date|datetime|number|checkbox|member|hidden,
//            options: [[value,label]], required, max, min, step, rows, placeholder, help, half, value }
import { html, raw, options as optionTags } from "./ui.js";

export function fieldsHTML(fields, values = {}, ctx = {}) {
  const rows = [];
  let halfBuf = [];
  const flushHalf = () => { if (halfBuf.length) { rows.push(html`<div class="form-grid">${halfBuf}</div>`); halfBuf = []; } };
  for (const f of fields) {
    const el = fieldHTML(f, values[f.name] ?? f.value, ctx);
    if (f.half) { halfBuf.push(el); if (halfBuf.length === 2) flushHalf(); }
    else { flushHalf(); rows.push(el); }
  }
  flushHalf();
  return html`${rows}`;
}

function fieldHTML(f, v, ctx) {
  const req = raw(f.required ? "required" : "");
  const common = (extra = "") => raw(`name="${f.name}" id="f-${f.name}" ${f.required ? "required" : ""} ${extra}`);
  let input;
  switch (f.type) {
    case "hidden":
      return html`<input type="hidden" name="${f.name}" value="${v ?? ""}" />`;
    case "textarea":
      input = html`<textarea ${common(`rows="${f.rows || 4}" maxlength="${f.max || 4000}"`)} placeholder="${f.placeholder || ""}">${v ?? ""}</textarea>`;
      break;
    case "select":
      input = html`<select ${common()}>${f.placeholder ? html`<option value="">${f.placeholder}</option>` : ""}${optionTags(f.options, v ?? "")}</select>`;
      break;
    case "member": {
      const list = (ctx.members || []).map((m) => [m.uid, `${m.name}${m.position ? " — " + m.position : ""}`]);
      input = html`<select ${common()}><option value="">— Pilih anggota —</option>${optionTags(list, v ?? "")}</select>`;
      break;
    }
    case "checkbox":
      return html`<label class="check field"><input type="checkbox" name="${f.name}" ${raw(v ? "checked" : "")} /><span>${f.label}</span></label>`;
    case "number":
      input = html`<input type="number" ${common(`${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} step="${f.step || "any"}"`)} value="${v ?? ""}" placeholder="${f.placeholder || ""}" />`;
      break;
    case "date":
      input = html`<input type="date" ${common()} value="${v ?? ""}" />`;
      break;
    case "datetime":
      input = html`<input type="datetime-local" ${common()} value="${v ?? ""}" />`;
      break;
    default:
      input = html`<input type="text" ${common(`maxlength="${f.max || 160}"`)} value="${v ?? ""}" placeholder="${f.placeholder || ""}" />`;
  }
  void req;
  return html`<div class="field"><label for="f-${f.name}">${f.label}${f.required ? html` <span class="req">*</span>` : ""}</label>${input}
    ${f.help ? html`<div class="tiny muted" style="margin-top:.3rem">${f.help}</div>` : ""}</div>`;
}

/** Baca nilai form sesuai tipe field. */
export function readFields(form, fields, ctx = {}) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;
    if (f.type === "checkbox") out[f.name] = el.checked;
    else if (f.type === "number") out[f.name] = el.value === "" ? null : Number(el.value);
    else if (f.type === "member") {
      out[f.name] = el.value;
      const m = (ctx.members || []).find((x) => x.uid === el.value);
      if (f.nameField) out[f.nameField] = m?.name || "";
    } else out[f.name] = typeof el.value === "string" ? el.value.trim() : el.value;
  }
  return out;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
export const addDays = (dateStr, n) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const addMonths = (dateStr, n) => { const d = new Date(dateStr + "T00:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
export const fmtDay = (s) => (s ? new Date(s + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—");
