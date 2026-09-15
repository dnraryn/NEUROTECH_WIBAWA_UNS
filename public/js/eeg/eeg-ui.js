// Komponen tampilan & notifikasi bersama untuk modul EEG.
import { db } from "../core/firebase.js";
import { logInBatch } from "../core/audit.js";
import { html, raw, esc, toMillis, modal, toast } from "../core/ui.js";
import { STATUS_LABEL } from "./eeg-engine.js";
import {
  doc, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const STALE_MS = 60_000;
export const ALERT_TYPE = { microsleep: "Microsleep", fatigue: "Kelelahan", cognitive: "Beban kognitif", stress: "Stres" };
export const ALERT_STATUS = { open: "Terbuka", ack: "Ditangani", closed: "Selesai" };

export const sessionSeenAt = (s) => toMillis(s.lastSeenAt) || s.latest?.ts || toMillis(s.startedAt) || 0;
export const isStale = (s, now = Date.now()) => now - sessionSeenAt(s) > STALE_MS;

export const statusPill = (status) => html`<span class="pill ${status}">${STATUS_LABEL[status] || status}</span>`;
export const sourceBadge = (source) =>
  source === "sim" ? html`<span class="tag warn" title="Data dari mode simulasi, bukan headband">SIMULASI</span>`
                   : html`<span class="tag" title="Data dari headband Muse">MUSE</span>`;

/* ---------- notifikasi ---------- */
const PREF_KEY = "nt_eeg_notify";
export function notifyPrefs() {
  try { return { sound: true, desktop: false, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; }
  catch { return { sound: true, desktop: false }; }
}
export function setNotifyPrefs(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {} }

let audioCtx = null;
export function beep(kind = "kritis") {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const pattern = kind === "kritis" ? [880, 660, 880] : [660];
    pattern.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = f; o.type = "square";
      g.gain.setValueAtTime(0.08, audioCtx.currentTime + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + i * 0.22 + 0.2);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + i * 0.22); o.stop(audioCtx.currentTime + i * 0.22 + 0.2);
    });
  } catch {}
}
export function desktopNotify(title, body) {
  try {
    if ("Notification" in window && Notification.permission === "granted")
      new Notification(title, { body, icon: "/assets/favicon.png", tag: "neurotech-eeg" });
  } catch {}
}

/* ---------- tindak lanjut peringatan ---------- */
export function handleAlertModal(ctx, a, next) {
  const title = next === "ack" ? "Tangani peringatan" : "Tutup peringatan";
  return modal({
    title,
    body: html`
      <div class="alert-item" style="border:none;padding-top:0"><span class="dot ${a.severity}"></span>
        <div class="txt"><b>${a.name}</b> · ${ALERT_TYPE[a.type] || a.type}<p>${a.message}</p></div></div>
      <div class="field"><label>${next === "ack" ? "Tindakan yang dilakukan" : "Catatan penutupan"}</label>
        <textarea name="note" rows="3" maxlength="500" required
          placeholder="${next === "ack" ? "cth. Pekerja diistirahatkan 15 menit, tugas dirotasi ke operator lain." : "cth. Kondisi pekerja kembali normal setelah istirahat."}">${a.note || ""}</textarea></div>
      <p class="tiny muted">Catatan tersimpan permanen sebagai bukti tindak lanjut (elemen 8 SMK3).</p>`,
    submitLabel: next === "ack" ? "Tandai ditangani" : "Tutup peringatan",
    onSubmit: async (form) => {
      const note = form.note.value.trim();
      const batch = writeBatch(db);
      batch.update(doc(db, "companies", ctx.company.id, "eegAlerts", a.id), {
        status: next, note, handledBy: ctx.user.uid, handledByName: ctx.member.name, handledAt: serverTimestamp(),
      });
      logInBatch(batch, ctx.company.id, { uid: ctx.user.uid, name: ctx.member.name }, {
        action: next === "ack" ? "eeg.alert.ack" : "eeg.alert.close", entity: "eegAlert", entityId: a.id,
        summary: `${ALERT_TYPE[a.type] || a.type} — ${a.name}: ${note}`,
      });
      await batch.commit();
      toast(next === "ack" ? "Peringatan ditandai ditangani." : "Peringatan ditutup.", "normal");
    },
  });
}

/* ---------- grafik garis sederhana (canvas) ---------- */
export function drawLineChart(canvas, series, { max = 100, labels = [] } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext("2d");
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);
  const padL = 30, padB = 20, padT = 8, padR = 8;
  const cw = w - padL - padR, ch = h - padT - padB;
  g.font = "11px system-ui"; g.fillStyle = "#6b7aa3"; g.strokeStyle = "rgba(120,150,230,.14)"; g.lineWidth = 1;
  for (let v = 0; v <= max; v += max / 4) {
    const y = padT + ch - (v / max) * ch;
    g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke();
    g.fillText(String(v), 4, y + 4);
  }
  const n = Math.max(...series.map((s) => s.data.length), 0);
  if (n === 0) { g.fillText("Belum ada data per menit.", padL + 10, padT + ch / 2); return; }
  const step = Math.max(1, Math.ceil(n / 8));
  labels.forEach((lb, i) => {
    if (i % step !== 0 && i !== n - 1) return;
    const x = padL + (n === 1 ? cw / 2 : (i / (n - 1)) * cw);
    const tw = g.measureText(lb).width;
    g.fillText(lb, Math.max(padL, Math.min(w - padR - tw, x - tw / 2)), h - 4);
  });
  series.forEach((s) => {
    g.beginPath(); g.strokeStyle = s.color; g.lineWidth = 2;
    s.data.forEach((v, i) => {
      const x = padL + (n === 1 ? cw / 2 : (i / (n - 1)) * cw);
      const y = padT + ch - (Math.max(0, Math.min(max, v)) / max) * ch;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
  });
}

export const legend = (series) => raw(`<div class="legend">${series.map((s) => `<span><i style="background:${esc(s.color)}"></i>${esc(s.label)}</span>`).join("")}</div>`);
