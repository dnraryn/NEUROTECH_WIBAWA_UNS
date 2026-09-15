// Daftar rute & menu aplikasi (dikelompokkan per tahap SMK3).
import { ALL_ROLES, EEG_STAFF, MEMBER_READERS, LOG_READERS } from "./roles.js";

const NOT_WORKER = ["admin", "ahli_k3", "supervisor", "manajemen", "auditor"];
const incidents = () => import("../views/smk3-incidents.js");
const capa = () => import("../views/smk3-capa.js");
const inspections = () => import("../views/smk3-inspections.js");
const audits = () => import("../views/smk3-audit.js");
const reviews = () => import("../views/smk3-reviews.js");

export const SMK3_STAGES = [
  "Penetapan Kebijakan K3",
  "Perencanaan K3",
  "Pelaksanaan Rencana K3",
  "Pemantauan & Evaluasi Kinerja K3",
  "Peninjauan & Peningkatan Kinerja SMK3",
];

export const ROUTES = [
  { path: "/", title: "Beranda", icon: "mdi:view-dashboard-outline", group: "Utama", roles: ALL_ROLES,
    load: () => import("../views/dashboard.js") },

  // ---- Tahap 1 & 2 ----
  { path: "/smk3/kebijakan", title: "Kebijakan K3 & P2K3", icon: "mdi:shield-check-outline", group: "Kebijakan & Perencanaan",
    roles: ALL_ROLES, stage: 1, elements: [1], load: () => import("../views/smk3-policies.js") },
  { path: "/smk3/risiko", title: "Register Risiko (HIRADC)", icon: "mdi:alert-rhombus-outline", group: "Kebijakan & Perencanaan",
    roles: ALL_ROLES, stage: 2, elements: [2], load: () => import("../views/smk3-risks.js") },

  // ---- Tahap 3 ----
  { path: "/smk3/dokumen", title: "Pengendalian Dokumen", icon: "mdi:folder-file-outline", group: "Pelaksanaan",
    roles: ALL_ROLES, stage: 3, elements: [4], load: () => import("../views/smk3-documents.js") },
  { path: "/smk3/pelatihan", title: "Pelatihan & Kompetensi", icon: "mdi:school-outline", group: "Pelaksanaan",
    roles: ALL_ROLES, stage: 3, elements: [12], load: () => import("../views/smk3-trainings.js") },
  { path: "/eeg/saya", title: "Monitoring EEG Saya", icon: "mdi:head-cog-outline", group: "Pelaksanaan",
    roles: ALL_ROLES, stage: 3, elements: [6], load: () => import("../views/eeg-self.js") },

  // ---- Tahap 4 ----
  { path: "/eeg/tim", title: "Monitoring EEG Tim", icon: "mdi:account-group-outline", group: "Pemantauan & Evaluasi",
    roles: EEG_STAFF, stage: 4, elements: [7], load: () => import("../views/eeg-team.js") },
  { path: "/eeg/peringatan", title: "Peringatan EEG", icon: "mdi:bell-alert-outline", group: "Pemantauan & Evaluasi",
    roles: EEG_STAFF, stage: 4, elements: [8], load: () => import("../views/eeg-alerts.js") },
  { path: "/smk3/insiden", title: "Insiden & Near Miss", icon: "mdi:clipboard-alert-outline", group: "Pemantauan & Evaluasi",
    roles: ALL_ROLES, stage: 4, elements: [8], load: incidents },
  { path: "/smk3/inspeksi", title: "Inspeksi K3", icon: "mdi:clipboard-check-outline", group: "Pemantauan & Evaluasi",
    roles: NOT_WORKER, stage: 4, elements: [7], load: inspections },
  { path: "/smk3/kpi", title: "KPI & Laporan", icon: "mdi:chart-box-outline", group: "Pemantauan & Evaluasi",
    roles: NOT_WORKER, stage: 4, elements: [10], load: () => import("../views/smk3-kpi.js") },

  // ---- Tahap 5 ----
  { path: "/smk3/capa", title: "Tindakan Perbaikan (CAPA)", icon: "mdi:progress-wrench", group: "Peninjauan & Peningkatan",
    roles: ALL_ROLES, stage: 5, elements: [8], load: capa },
  { path: "/smk3/audit", title: "Audit SMK3", icon: "mdi:file-certificate-outline", group: "Peninjauan & Peningkatan",
    roles: NOT_WORKER, stage: 5, elements: [11], load: audits },
  { path: "/smk3/tinjauan", title: "Tinjauan Manajemen", icon: "mdi:account-tie-outline", group: "Peninjauan & Peningkatan",
    roles: NOT_WORKER, stage: 5, elements: [1], load: reviews },

  // ---- rute detail (tidak tampil di menu) ----
  { path: "/eeg/sesi/:id", title: "Detail Sesi EEG", hidden: true, roles: ALL_ROLES, load: () => import("../views/eeg-session.js") },
  { path: "/smk3/insiden/:id", title: "Detail Insiden", hidden: true, roles: ALL_ROLES, load: incidents },
  { path: "/smk3/capa/:id", title: "Detail CAPA", hidden: true, roles: ALL_ROLES, load: capa },
  { path: "/smk3/inspeksi/:id", title: "Pelaksanaan Inspeksi", hidden: true, roles: NOT_WORKER, load: inspections },
  { path: "/smk3/audit/:id", title: "Pelaksanaan Audit", hidden: true, roles: NOT_WORKER, load: audits },
  { path: "/smk3/tinjauan/:id", title: "Rapat Tinjauan", hidden: true, roles: NOT_WORKER, load: reviews },

  // ---- Organisasi ----
  { path: "/anggota", title: "Anggota & Peran", icon: "mdi:account-multiple-outline", group: "Organisasi",
    roles: MEMBER_READERS, load: () => import("../views/members.js") },
  { path: "/log", title: "Log Aktivitas", icon: "mdi:history", group: "Organisasi",
    roles: LOG_READERS, load: () => import("../views/audit-log.js") },
  { path: "/perusahaan", title: "Pengaturan Perusahaan", icon: "mdi:domain", group: "Organisasi",
    roles: ["admin"], load: () => import("../views/company.js") },
  { path: "/profil", title: "Profil Saya", icon: "mdi:account-circle-outline", group: "Organisasi",
    roles: ALL_ROLES, load: () => import("../views/profile.js") },
];

/** Cocokkan path dengan pola "/a/:id". */
export function matchRoute(path) {
  for (const r of ROUTES) {
    const pa = r.path.split("/"), pb = path.split("/");
    if (pa.length !== pb.length) continue;
    const params = {};
    if (pa.every((seg, i) => (seg.startsWith(":") ? ((params[seg.slice(1)] = decodeURIComponent(pb[i])), pb[i] !== "") : seg === pb[i])))
      return { route: r, params };
  }
  return null;
}
