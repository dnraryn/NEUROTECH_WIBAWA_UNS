// Definisi peran & status keanggotaan. Harus konsisten dengan firestore.rules.

export const ROLES = {
  admin:      { label: "Admin Perusahaan", desc: "Mengelola anggota, peran, dan pengaturan perusahaan." },
  ahli_k3:    { label: "Ahli K3 / P2K3",   desc: "Mengelola seluruh modul SMK3 dan memantau EEG tim." },
  supervisor: { label: "Supervisor",       desc: "Memantau EEG tim, menindaklanjuti peringatan, melapor insiden." },
  manajemen:  { label: "Manajemen",        desc: "Melihat dashboard & laporan agregat, tinjauan manajemen." },
  auditor:    { label: "Auditor Internal", desc: "Hanya-baca modul SMK3 dan log aktivitas." },
  pekerja:    { label: "Pekerja",          desc: "Monitoring EEG diri sendiri dan pelaporan insiden." },
};
export const ROLE_KEYS = Object.keys(ROLES);
export const ALL_ROLES = ROLE_KEYS;
export const roleLabel = (r) => ROLES[r]?.label || r;

// Kelompok hak akses (cermin helper di rules)
export const EEG_STAFF = ["admin", "ahli_k3", "supervisor"];
export const MEMBER_READERS = ["admin", "ahli_k3", "supervisor", "manajemen", "auditor"];
export const LOG_READERS = ["admin", "ahli_k3", "manajemen", "auditor"];

export const MEMBER_STATUS = {
  pending: { label: "Menunggu", cls: "waspada" },
  active: { label: "Aktif", cls: "normal" },
  disabled: { label: "Nonaktif", cls: "kritis-static" },
};

export const SECTORS = [
  ["Manufaktur", "Manufaktur / Industri"],
  ["Pertambangan", "Pertambangan"],
  ["Energi", "Energi & Utilitas"],
  ["Konstruksi", "Konstruksi"],
  ["Transportasi", "Transportasi & Logistik"],
  ["Migas", "Minyak & Gas"],
  ["Kesehatan", "Layanan Kesehatan"],
  ["Lainnya", "Lainnya"],
];

export const SHIFTS = [
  ["", "— Tidak ditentukan —"],
  ["Shift Pagi", "Shift Pagi"],
  ["Shift Siang", "Shift Siang"],
  ["Shift Malam", "Shift Malam"],
  ["Non-shift", "Non-shift"],
];

export const can = (ctx, roles) => !!ctx?.member && ctx.member.status === "active" && roles.includes(ctx.member.role);
