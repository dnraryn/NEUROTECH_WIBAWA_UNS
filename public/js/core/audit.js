// Log aktivitas append-only: companies/{cid}/auditLogs.
import { db } from "./firebase.js";
import {
  collection, doc, addDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function entry(actor, { action, entity, entityId = null, summary = "" }) {
  return {
    actorUid: actor.uid,
    actorName: (actor.name || "").slice(0, 120),
    action, entity,
    entityId: entityId ? String(entityId).slice(0, 128) : null,
    summary: String(summary).slice(0, 500),
    at: serverTimestamp(),
  };
}

/** Tulis log mandiri. Kegagalan log tidak menggagalkan aksi utama. */
export async function logAction(ctx, info) {
  try {
    await addDoc(collection(db, "companies", ctx.company.id, "auditLogs"),
      entry({ uid: ctx.user.uid, name: ctx.member?.name }, info));
  } catch (e) { console.warn("audit log gagal:", e); }
}

/** Tambahkan log ke dalam writeBatch (atomik dengan aksinya). */
export function logInBatch(batch, companyId, actor, info) {
  batch.set(doc(collection(db, "companies", companyId, "auditLogs")), entry(actor, info));
}

export const ACTION_LABEL = {
  "company.create": "Membuat perusahaan",
  "company.update": "Mengubah data perusahaan",
  "company.code.regenerate": "Membuat ulang kode undangan",
  "member.request": "Mengajukan bergabung",
  "member.cancel": "Membatalkan permintaan bergabung",
  "member.approve": "Menyetujui anggota",
  "member.reject": "Menolak permintaan",
  "member.role": "Mengubah peran",
  "member.disable": "Menonaktifkan anggota",
  "member.enable": "Mengaktifkan anggota",
  "member.remove": "Mengeluarkan anggota",
  "member.update": "Mengubah data anggota",
  "eeg.alert.ack": "Menangani peringatan EEG",
  "eeg.alert.close": "Menutup peringatan EEG",
  "eeg.session.close": "Menutup sesi EEG terputus",
  "incident.report": "Melaporkan insiden",
  "incident.update": "Mengubah klasifikasi insiden",
  "incident.investigate": "Investigasi insiden",
  "incident.close": "Menutup insiden",
  "capa.create": "Membuat CAPA",
  "capa.update": "Mengubah CAPA",
  "capa.progress": "Memperbarui progres CAPA",
  "capa.done": "Menyelesaikan CAPA",
  "capa.verify": "Memverifikasi CAPA",
  "capa.reopen": "Mengembalikan CAPA",
  "capa.cancel": "Membatalkan CAPA",
  "risk.create": "Menambah risiko",
  "risk.update": "Mengubah risiko",
  "risk.delete": "Menghapus risiko",
  "risk.eeg": "Menerapkan data EEG ke risiko",
  "inspection.template.create": "Membuat template inspeksi",
  "inspection.template.update": "Mengubah template inspeksi",
  "inspection.start": "Memulai inspeksi",
  "inspection.finish": "Menyelesaikan inspeksi",
  "kpi.manhours": "Mengisi jam kerja",
  "audit.create": "Membuat audit",
  "audit.start": "Memulai audit",
  "audit.finish": "Menyelesaikan audit",
  "review.create": "Membuat tinjauan manajemen",
  "review.inputs": "Memperbarui data tinjauan",
  "review.decision": "Menambah keputusan tinjauan",
  "review.final": "Memfinalkan tinjauan",
  "policy.create": "Membuat draf kebijakan",
  "policy.update": "Mengubah draf kebijakan",
  "policy.approve": "Mengesahkan kebijakan",
  "policy.revoke": "Mencabut kebijakan",
  "p2k3.update": "Memperbarui struktur P2K3",
  "training.create": "Menambah jenis pelatihan",
  "training.update": "Mengubah jenis pelatihan",
  "training.record": "Mencatat pelatihan",
  "training.record.delete": "Menghapus catatan pelatihan",
  "document.create": "Membuat dokumen",
  "document.update": "Mengubah dokumen",
  "document.review": "Mengajukan tinjauan dokumen",
  "document.approve": "Menyetujui dokumen",
  "document.revise": "Merevisi dokumen",
  "document.expire": "Menandai dokumen kedaluwarsa",
};
