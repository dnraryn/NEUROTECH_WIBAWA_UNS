// Konstanta & perhitungan bersama modul SMK3.
import { html } from "../core/ui.js";

export const NOT_WORKER = ["admin", "ahli_k3", "supervisor", "manajemen", "auditor"];
export const K3_ADMIN = ["admin", "ahli_k3"];

const toOpts = (obj) => Object.entries(obj).map(([k, v]) => [k, typeof v === "string" ? v : v.label]);
export const opts = toOpts;

/* ---------- insiden ---------- */
export const INCIDENT_TYPE = {
  kecelakaan: "Kecelakaan kerja", pak: "Penyakit akibat kerja (PAK)", near_miss: "Near miss (hampir celaka)",
  kondisi_tidak_aman: "Kondisi tidak aman", tindakan_tidak_aman: "Tindakan tidak aman",
};
export const INCIDENT_SEVERITY = {
  ringan: { label: "Ringan", cls: "normal" }, sedang: { label: "Sedang", cls: "waspada" },
  berat: { label: "Berat", cls: "berisiko" }, fatal: { label: "Fatal", cls: "kritis" },
};
export const INCIDENT_STATUS = {
  dilaporkan: { label: "Dilaporkan", cls: "waspada" }, investigasi: { label: "Investigasi", cls: "berisiko" }, selesai: { label: "Selesai", cls: "normal" },
};

/* ---------- CAPA ---------- */
export const CAPA_STATUS = {
  terbuka: { label: "Terbuka", cls: "waspada" }, dikerjakan: { label: "Dikerjakan", cls: "berisiko" },
  selesai: { label: "Menunggu verifikasi", cls: "info" }, terverifikasi: { label: "Terverifikasi", cls: "normal" },
  dibatalkan: { label: "Dibatalkan", cls: "idle" },
};
export const CAPA_PRIORITY = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" };
export const CAPA_TYPE = { korektif: "Korektif (perbaikan)", preventif: "Preventif (pencegahan)" };
export const CAPA_SOURCE = { insiden: "Insiden", inspeksi: "Inspeksi", audit: "Audit", risiko: "Register risiko", tinjauan: "Tinjauan manajemen", eeg: "Peringatan EEG", manual: "Manual" };
export const SOURCE_ROUTE = { insiden: "/smk3/insiden/", inspeksi: "/smk3/inspeksi/", audit: "/smk3/audit/", tinjauan: "/smk3/tinjauan/" };
export const isOverdue = (c, todayStr = new Date().toISOString().slice(0, 10)) =>
  ["terbuka", "dikerjakan"].includes(c.status) && c.dueDate && c.dueDate < todayStr;

/* ---------- risiko ---------- */
export const RISK_CATEGORY = {
  fisik: "Fisik (bising, panas, getaran, radiasi)", kimia: "Kimia", biologi: "Biologi", ergonomi: "Ergonomi",
  psikososial: "Psikososial", kognitif: "Kognitif (kelelahan mental, beban kerja)", mekanik: "Mekanik",
  listrik: "Listrik", kebakaran: "Kebakaran / ledakan", lainnya: "Lainnya",
};
export const LIKELIHOOD = { 1: "1 — Sangat jarang", 2: "2 — Jarang", 3: "3 — Mungkin", 4: "4 — Sering", 5: "5 — Hampir pasti" };
export const SEVERITY = { 1: "1 — Tidak signifikan", 2: "2 — Ringan", 3: "3 — Sedang", 4: "4 — Berat", 5: "5 — Fatal/bencana" };
export const HIERARCHY = { eliminasi: "Eliminasi", substitusi: "Substitusi", rekayasa: "Rekayasa teknik", administrasi: "Administratif", apd: "APD" };
export function riskLevel(score) {
  if (score >= 17) return { key: "ekstrem", label: "Ekstrem", cls: "kritis" };
  if (score >= 10) return { key: "tinggi", label: "Tinggi", cls: "berisiko" };
  if (score >= 5) return { key: "sedang", label: "Sedang", cls: "waspada" };
  return { key: "rendah", label: "Rendah", cls: "normal" };
}

/* ---------- inspeksi ---------- */
export const FREQUENCY = { harian: "Harian", mingguan: "Mingguan", bulanan: "Bulanan", triwulan: "Triwulan", tahunan: "Tahunan" };
export const FREQ_DAYS = { harian: 1, mingguan: 7, bulanan: 30, triwulan: 91, tahunan: 365 };
export const INSPECT_RESULT = { ok: "Sesuai", tidak: "Tidak sesuai", na: "N/A" };

/* ---------- audit ---------- */
export const AUDIT_RESULT = {
  "": { label: "Belum dinilai", cls: "idle" }, sesuai: { label: "Sesuai", cls: "normal" },
  minor: { label: "Temuan minor", cls: "waspada" }, mayor: { label: "Temuan mayor", cls: "berisiko" },
  kritikal: { label: "Temuan kritikal", cls: "kritis" },
};
export const AUDIT_STATUS = { rencana: { label: "Rencana", cls: "idle" }, berlangsung: { label: "Berlangsung", cls: "waspada" }, selesai: { label: "Selesai", cls: "normal" } };
export const critKey = (id) => id.replace(/\./g, "_");

/** Ketentuan penilaian Lampiran II PP 50/2012 bagian C. */
export function auditScore(criteria, results) {
  const s = { total: criteria.length, assessed: 0, sesuai: 0, minor: 0, mayor: 0, kritikal: 0 };
  for (const c of criteria) {
    const r = results?.[critKey(c.id)]?.r;
    if (!r) continue;
    s.assessed++; s[r]++;
  }
  s.percent = s.total ? Math.round((s.sesuai / s.total) * 1000) / 10 : 0;
  if (s.kritikal || s.mayor) s.rating = { label: "Belum berhasil menerapkan SMK3", cls: "kritis", note: "Terdapat temuan kritikal/mayor — tingkat penilaian tidak mengacu Tabel 2." };
  else if (s.percent >= 85) s.rating = { label: "Memuaskan", cls: "normal" };
  else if (s.percent >= 60) s.rating = { label: "Baik", cls: "waspada" };
  else s.rating = { label: "Kurang", cls: "berisiko" };
  return s;
}

/* ---------- kebijakan, pelatihan, dokumen ---------- */
export const POLICY_CATEGORY = { kebijakan_k3: "Kebijakan K3", kebijakan_khusus: "Kebijakan khusus" };
export const POLICY_STATUS = { draft: { label: "Draf", cls: "idle" }, disahkan: { label: "Disahkan", cls: "normal" }, dicabut: { label: "Dicabut", cls: "kritis-static" } };
export const P2K3_ROLE = { ketua: "Ketua", wakil: "Wakil ketua", sekretaris: "Sekretaris (Ahli K3)", anggota: "Anggota" };
export const TRAINING_CATEGORY = { k3_umum: "K3 umum", keahlian_khusus: "Keahlian/lisensi khusus", manajemen: "Manajemen & penyelia", induksi: "Induksi (pengunjung/kontraktor/karyawan baru)", tanggap_darurat: "Tanggap darurat & P3K" };
export const DOC_TYPE = { sop: "SOP / Prosedur", ik: "Instruksi kerja", formulir: "Formulir", manual: "Manual SMK3", tanggap_darurat: "Rencana tanggap darurat", lainnya: "Lainnya" };
export const DOC_STATUS = { draft: { label: "Draf", cls: "idle" }, review: { label: "Ditinjau", cls: "waspada" }, disetujui: { label: "Disetujui", cls: "normal" }, kedaluwarsa: { label: "Kedaluwarsa", cls: "kritis-static" } };

export function trainingStatus(rec, todayStr = new Date().toISOString().slice(0, 10)) {
  if (!rec) return { key: "belum", label: "Belum", cls: "kritis-static" };
  if (!rec.expiryDate) return { key: "valid", label: "Berlaku", cls: "normal" };
  if (rec.expiryDate < todayStr) return { key: "kedaluwarsa", label: "Kedaluwarsa", cls: "kritis-static" };
  const soon = new Date(todayStr); soon.setDate(soon.getDate() + 60);
  if (rec.expiryDate <= soon.toISOString().slice(0, 10)) return { key: "segera", label: "Segera habis", cls: "waspada" };
  return { key: "valid", label: "Berlaku", cls: "normal" };
}

/* ---------- KPI ---------- */
export const PER_MILLION = 1_000_000;
export const rate = (count, hours) => (hours > 0 ? Math.round(((count * PER_MILLION) / hours) * 100) / 100 : null);

/** Kunci kelompok jabatan untuk agregat EEG anonim. */
export const groupKey = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").slice(0, 40) || "tanpa_jabatan";

/* ---------- UI kecil ---------- */
export const badge = (map, key) => { const v = map[key] || { label: key, cls: "idle" }; return html`<span class="pill ${v.cls}">${v.label}</span>`; };
export const shortId = (id) => String(id || "").slice(0, 6).toUpperCase();
