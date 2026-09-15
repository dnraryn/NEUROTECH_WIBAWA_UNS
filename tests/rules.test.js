// Uji Firestore Security Rules NeuroTech SMK3.
// Jalankan:  cd tests && npm install && npm test   (butuh Java + Firebase CLI)
import { readFileSync } from "node:fs";
import { test, after, beforeEach, describe } from "node:test";
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  query, where, writeBatch, serverTimestamp,
} from "firebase/firestore";

let env;
const A = "compA", B = "compB", CODE_A = "AAAA2222", CODE_B = "BBBB3333";

async function getEnv() {
  env ??= await initializeTestEnvironment({
    projectId: "demo-neurotech",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 },
  });
  return env;
}
after(async () => { await env?.cleanup(); });

const member = (uid, role, status = "active", extra = {}) =>
  ({ uid, name: uid, email: `${uid}@x.id`, role, status, position: "", department: "", shift: "", ...extra });

beforeEach(async () => {
  await getEnv();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    const company = (id, owner, code) => ({ name: "PT " + id, sector: "Manufaktur", address: "", code, ownerUid: owner, settings: { calibrationMin: 3, allowSimulation: true }, createdAt: new Date(), updatedAt: new Date() });
    await setDoc(doc(db, "companies", A), company(A, "owner", CODE_A));
    await setDoc(doc(db, "companyCodes", CODE_A), { companyId: A, createdAt: new Date() });
    await setDoc(doc(db, "companies", B), company(B, "ownerB", CODE_B));
    await setDoc(doc(db, "companyCodes", CODE_B), { companyId: B, createdAt: new Date() });

    const mA = [member("owner", "admin"), member("admin2", "admin"), member("sup", "supervisor"), member("k3", "ahli_k3"),
      member("worker", "pekerja"), member("worker2", "pekerja"), member("mgr", "manajemen"), member("aud", "auditor"),
      member("pend", "pekerja", "pending", { joinCode: CODE_A }), member("dis", "pekerja", "disabled")];
    for (const m of mA) await setDoc(doc(db, "companies", A, "members", m.uid), m);
    await setDoc(doc(db, "companies", B, "members", "ownerB"), member("ownerB", "admin"));
    await setDoc(doc(db, "companies", B, "members", "workerB"), member("workerB", "pekerja"));
    for (const u of ["owner", "worker", "newbie", "founder"]) await setDoc(doc(db, "users", u), { name: u, email: "", companyId: null });

    await setDoc(doc(db, "companies", A, "eegSessions", "s1"), { uid: "worker", name: "worker", active: true, status: "normal", source: "sim" });
    await setDoc(doc(db, "companies", A, "eegSessions", "s2"), { uid: "worker2", name: "worker2", active: true, status: "normal", source: "sim" });
    await setDoc(doc(db, "companies", A, "eegAlerts", "a1"), { uid: "worker", name: "worker", type: "fatigue", severity: "berisiko", message: "x", status: "open" });
    await setDoc(doc(db, "companies", A, "auditLogs", "l1"), { actorUid: "owner", action: "x", entity: "company", at: new Date() });
  });
});

const as = (uid) => env.authenticatedContext(uid, { email: `${uid}@x.id` }).firestore();
const log = (uid, extra = {}) => ({ actorUid: uid, actorName: uid, action: "test", entity: "member", entityId: null, summary: "", at: serverTimestamp(), ...extra });

/* ------------------------------------------------------------------ */
describe("onboarding", () => {
  test("pendiri membuat perusahaan + kode + member admin dalam satu batch", async () => {
    const db = as("founder"), cid = "compNew", code = "NEWC2345";
    const b = writeBatch(db);
    b.set(doc(db, "companies", cid), { name: "PT Baru", sector: "Energi", address: "", code, ownerUid: "founder", settings: { calibrationMin: 3, allowSimulation: true }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    b.set(doc(db, "companyCodes", code), { companyId: cid, createdAt: serverTimestamp() });
    b.set(doc(db, "companies", cid, "members", "founder"), { ...member("founder", "admin"), approvedBy: "founder", joinedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    b.update(doc(db, "users", "founder"), { companyId: cid, updatedAt: serverTimestamp() });
    b.set(doc(collection(db, "companies", cid, "auditLogs")), log("founder"));
    await assertSucceeds(b.commit());
  });

  test("kode yang sudah dipakai perusahaan lain ditolak", async () => {
    const db = as("founder"), cid = "compNew";
    const b = writeBatch(db);
    b.set(doc(db, "companies", cid), { name: "PT Baru", code: CODE_A, ownerUid: "founder", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    b.set(doc(db, "companyCodes", CODE_A), { companyId: cid, createdAt: serverTimestamp() });
    b.set(doc(db, "companies", cid, "members", "founder"), member("founder", "admin"));
    await assertFails(b.commit());
  });

  test("tidak bisa menyisipkan diri sebagai admin perusahaan yang sudah ada", async () => {
    await assertFails(setDoc(doc(as("newbie"), "companies", A, "members", "newbie"), member("newbie", "admin")));
  });

  test("gabung dengan kode valid → pending pekerja", async () => {
    await assertSucceeds(setDoc(doc(as("newbie"), "companies", A, "members", "newbie"), member("newbie", "pekerja", "pending", { joinCode: CODE_A })));
  });

  test("gabung: kode salah / kode perusahaan lain / langsung aktif / peran lain ditolak", async () => {
    const db = as("newbie"), ref = doc(db, "companies", A, "members", "newbie");
    await assertFails(setDoc(ref, member("newbie", "pekerja", "pending", { joinCode: "ZZZZ9999" })));
    await assertFails(setDoc(ref, member("newbie", "pekerja", "pending", { joinCode: CODE_B })));
    await assertFails(setDoc(ref, member("newbie", "pekerja", "active", { joinCode: CODE_A })));
    await assertFails(setDoc(ref, member("newbie", "supervisor", "pending", { joinCode: CODE_A })));
  });

  test("tidak bisa membuat member atas nama orang lain", async () => {
    await assertFails(setDoc(doc(as("newbie"), "companies", A, "members", "someone"), member("someone", "pekerja", "pending", { joinCode: CODE_A })));
  });

  test("daftar kode undangan tidak bisa di-list", async () => {
    await assertFails(getDocs(collection(as("newbie"), "companyCodes")));
    await assertSucceeds(getDoc(doc(as("newbie"), "companyCodes", CODE_A)));
  });

  test("pending: boleh baca perusahaan & dirinya, tidak boleh baca data lain", async () => {
    const db = as("pend");
    await assertSucceeds(getDoc(doc(db, "companies", A)));
    await assertSucceeds(getDoc(doc(db, "companies", A, "members", "pend")));
    await assertFails(getDocs(collection(db, "companies", A, "members")));
    await assertFails(getDoc(doc(db, "companies", A, "eegSessions", "s1")));
  });

  test("pending boleh membatalkan permintaannya sendiri", async () => {
    await assertSucceeds(deleteDoc(doc(as("pend"), "companies", A, "members", "pend")));
  });

  test("batch gabung seperti di aplikasi (member + users + log)", async () => {
    const db = as("newbie"), b = writeBatch(db);
    b.set(doc(db, "companies", A, "members", "newbie"), { ...member("newbie", "pekerja", "pending", { joinCode: CODE_A }), joinedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    b.update(doc(db, "users", "newbie"), { name: "newbie", companyId: A, updatedAt: serverTimestamp() });
    b.set(doc(collection(db, "companies", A, "auditLogs")), log("newbie", { action: "member.request", entityId: "newbie" }));
    await assertSucceeds(b.commit());
  });

  test("batch batal seperti di aplikasi (log + hapus member + users)", async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "users", "pend"), { name: "pend", email: "", companyId: A }));
    const db = as("pend"), b = writeBatch(db);
    b.set(doc(collection(db, "companies", A, "auditLogs")), log("pend", { action: "member.cancel" }));
    b.delete(doc(db, "companies", A, "members", "pend"));
    b.update(doc(db, "users", "pend"), { companyId: null, updatedAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  });
});

/* ------------------------------------------------------------------ */
describe("anggota & peran", () => {
  test("pekerja tidak bisa menaikkan perannya sendiri", async () => {
    await assertFails(updateDoc(doc(as("worker"), "companies", A, "members", "worker"), { role: "admin" }));
    await assertFails(updateDoc(doc(as("worker"), "companies", A, "members", "worker"), { status: "active", role: "supervisor" }));
  });

  test("pekerja boleh mengubah namanya sendiri saja", async () => {
    await assertSucceeds(updateDoc(doc(as("worker"), "companies", A, "members", "worker"), { name: "Nama Baru" }));
    await assertFails(updateDoc(doc(as("worker"), "companies", A, "members", "worker"), { position: "Manajer" }));
  });

  test("pekerja tidak bisa melihat daftar anggota", async () => {
    await assertFails(getDocs(collection(as("worker"), "companies", A, "members")));
  });

  test("admin menyetujui permintaan & menetapkan peran", async () => {
    await assertSucceeds(updateDoc(doc(as("owner"), "companies", A, "members", "pend"), { role: "supervisor", status: "active", approvedBy: "owner" }));
  });

  test("admin tidak bisa mengubah peran/status pemilik atau dirinya sendiri", async () => {
    await assertFails(updateDoc(doc(as("admin2"), "companies", A, "members", "owner"), { role: "pekerja" }));
    await assertFails(updateDoc(doc(as("admin2"), "companies", A, "members", "owner"), { status: "disabled" }));
    await assertFails(updateDoc(doc(as("admin2"), "companies", A, "members", "admin2"), { role: "pekerja" }));
    await assertFails(deleteDoc(doc(as("admin2"), "companies", A, "members", "owner")));
  });

  test("admin boleh mengubah jabatan pemilik", async () => {
    await assertSucceeds(updateDoc(doc(as("admin2"), "companies", A, "members", "owner"), { position: "Direktur" }));
  });

  test("peran tidak valid ditolak", async () => {
    await assertFails(updateDoc(doc(as("owner"), "companies", A, "members", "worker"), { role: "superadmin" }));
  });

  test("supervisor / ahli K3 tidak bisa mengubah peran", async () => {
    await assertFails(updateDoc(doc(as("sup"), "companies", A, "members", "worker"), { role: "supervisor" }));
    await assertFails(updateDoc(doc(as("k3"), "companies", A, "members", "worker"), { status: "disabled" }));
  });

  test("anggota nonaktif kehilangan akses baca", async () => {
    await assertFails(getDoc(doc(as("dis"), "companies", A, "eegSessions", "s1")));
  });
});

/* ------------------------------------------------------------------ */
describe("isolasi antar-perusahaan", () => {
  test("anggota perusahaan B tidak bisa membaca data perusahaan A", async () => {
    const db = as("ownerB");
    await assertFails(getDoc(doc(db, "companies", A)));
    await assertFails(getDocs(collection(db, "companies", A, "members")));
    await assertFails(getDocs(query(collection(db, "companies", A, "eegSessions"), where("active", "==", true))));
    await assertFails(getDocs(collection(db, "companies", A, "auditLogs")));
  });

  test("admin perusahaan B tidak bisa mengubah anggota perusahaan A", async () => {
    await assertFails(updateDoc(doc(as("ownerB"), "companies", A, "members", "worker"), { role: "admin" }));
  });

  test("pengguna tidak bisa membaca profil pengguna lain", async () => {
    await assertFails(getDoc(doc(as("worker"), "users", "owner")));
    await assertSucceeds(getDoc(doc(as("worker"), "users", "worker")));
  });
});

/* ------------------------------------------------------------------ */
describe("privasi EEG", () => {
  test("pekerja membaca sesinya sendiri, bukan milik rekan", async () => {
    const db = as("worker");
    await assertSucceeds(getDoc(doc(db, "companies", A, "eegSessions", "s1")));
    await assertFails(getDoc(doc(db, "companies", A, "eegSessions", "s2")));
    await assertSucceeds(getDocs(query(collection(db, "companies", A, "eegSessions"), where("uid", "==", "worker"))));
    await assertFails(getDocs(query(collection(db, "companies", A, "eegSessions"), where("active", "==", true))));
  });

  test("supervisor, ahli K3, admin melihat semua sesi", async () => {
    for (const u of ["sup", "k3", "owner"])
      await assertSucceeds(getDocs(query(collection(as(u), "companies", A, "eegSessions"), where("active", "==", true))));
  });

  test("manajemen & auditor TIDAK melihat data EEG individu", async () => {
    for (const u of ["mgr", "aud"]) {
      await assertFails(getDoc(doc(as(u), "companies", A, "eegSessions", "s1")));
      await assertFails(getDoc(doc(as(u), "companies", A, "eegAlerts", "a1")));
    }
  });

  test("pekerja membuat sesi miliknya sendiri saja", async () => {
    const db = as("worker"), col = collection(db, "companies", A, "eegSessions");
    const base = { name: "w", position: "", department: "", shift: "", source: "muse", active: true, baseline: { fi: 30, cli: 30, ei: 60 }, latest: null, status: "normal", microsleepCount: 0, startedAt: serverTimestamp(), lastSeenAt: serverTimestamp() };
    await assertSucceeds(addDoc(col, { uid: "worker", ...base }));
    await assertFails(addDoc(col, { uid: "worker2", ...base }));
    await assertFails(addDoc(col, { uid: "worker", ...base, source: "fake" }));
    await assertFails(addDoc(collection(as("dis"), "companies", A, "eegSessions"), { uid: "dis", ...base }));
  });

  test("heartbeat hanya oleh pemilik sesi", async () => {
    const patch = { latest: { fi: 50, ts: 1 }, status: "waspada", lastSeenAt: serverTimestamp() };
    await assertSucceeds(updateDoc(doc(as("worker"), "companies", A, "eegSessions", "s1"), patch));
    await assertFails(updateDoc(doc(as("worker2"), "companies", A, "eegSessions", "s1"), patch));
    await assertFails(updateDoc(doc(as("worker"), "companies", A, "eegSessions", "s1"), { uid: "worker2" }));
  });

  test("supervisor boleh menutup sesi terputus, tetapi tidak mengubah datanya", async () => {
    await assertSucceeds(updateDoc(doc(as("sup"), "companies", A, "eegSessions", "s1"), { active: false, endedAt: serverTimestamp(), closedBy: "sup" }));
    await assertFails(updateDoc(doc(as("sup"), "companies", A, "eegSessions", "s2"), { status: "normal", latest: { fi: 1 } }));
  });

  test("riwayat per menit hanya ditulis pemilik sesi", async () => {
    await assertSucceeds(setDoc(doc(as("worker"), "companies", A, "eegSessions", "s1", "minutes", "m0001"), { uid: "worker", m: 1, fi: 40 }));
    await assertFails(setDoc(doc(as("worker2"), "companies", A, "eegSessions", "s1", "minutes", "m0002"), { uid: "worker2", m: 2, fi: 40 }));
    await assertFails(getDocs(collection(as("worker2"), "companies", A, "eegSessions", "s1", "minutes")));
    await assertSucceeds(getDocs(collection(as("sup"), "companies", A, "eegSessions", "s1", "minutes")));
  });

  test("peringatan: dibuat pemilik, ditangani staf dengan catatan, tidak bisa dihapus", async () => {
    const a = { name: "w", position: "", sessionId: "s1", type: "microsleep", severity: "kritis", message: "m", status: "open", createdAt: serverTimestamp() };
    await assertSucceeds(addDoc(collection(as("worker"), "companies", A, "eegAlerts"), { uid: "worker", ...a }));
    await assertFails(addDoc(collection(as("worker"), "companies", A, "eegAlerts"), { uid: "worker2", ...a }));
    await assertFails(addDoc(collection(as("worker"), "companies", A, "eegAlerts"), { uid: "worker", ...a, status: "closed" }));

    const ack = { status: "ack", note: "Diistirahatkan", handledBy: "sup", handledByName: "sup", handledAt: serverTimestamp() };
    await assertSucceeds(updateDoc(doc(as("sup"), "companies", A, "eegAlerts", "a1"), ack));
    await assertFails(updateDoc(doc(as("worker"), "companies", A, "eegAlerts", "a1"), { ...ack, handledBy: "worker" }));
    await assertFails(updateDoc(doc(as("k3"), "companies", A, "eegAlerts", "a1"), { ...ack, handledBy: "sup" }));
    await assertFails(deleteDoc(doc(as("owner"), "companies", A, "eegAlerts", "a1")));
  });
});

/* ------------------------------------------------------------------ */
describe("log aktivitas & pengaturan", () => {
  test("log append-only dengan pelaku = pengguna sendiri", async () => {
    const col = collection(as("worker"), "companies", A, "auditLogs");
    await assertSucceeds(addDoc(col, log("worker")));
    await assertFails(addDoc(col, log("owner")));
    await assertFails(addDoc(collection(as("ownerB"), "companies", A, "auditLogs"), log("ownerB")));
    await assertFails(updateDoc(doc(as("owner"), "companies", A, "auditLogs", "l1"), { summary: "diubah" }));
    await assertFails(deleteDoc(doc(as("owner"), "companies", A, "auditLogs", "l1")));
  });

  test("log dibaca admin/ahli K3/manajemen/auditor, bukan pekerja/supervisor", async () => {
    for (const u of ["owner", "k3", "mgr", "aud"]) await assertSucceeds(getDocs(collection(as(u), "companies", A, "auditLogs")));
    for (const u of ["worker", "sup"]) await assertFails(getDocs(collection(as(u), "companies", A, "auditLogs")));
  });

  test("admin membuat ulang kode undangan; non-admin ditolak", async () => {
    const regen = (uid, code) => {
      const db = as(uid), b = writeBatch(db);
      b.update(doc(db, "companies", A), { code, updatedAt: serverTimestamp() });
      b.set(doc(db, "companyCodes", code), { companyId: A, createdAt: serverTimestamp() });
      b.delete(doc(db, "companyCodes", CODE_A));
      return b.commit();
    };
    await assertFails(regen("sup", "SUPR2345"));
    await assertSucceeds(regen("admin2", "NEWA2345"));
  });

  test("admin tidak bisa mengarahkan kode ke kode milik perusahaan lain", async () => {
    await assertFails(updateDoc(doc(as("owner"), "companies", A), { code: CODE_B }));
  });

  test("pengaturan EEG divalidasi", async () => {
    const ref = doc(as("owner"), "companies", A);
    await assertSucceeds(updateDoc(ref, { settings: { calibrationMin: 5, allowSimulation: false } }));
    await assertFails(updateDoc(ref, { settings: { calibrationMin: 10, allowSimulation: false } }));
    await assertFails(updateDoc(ref, { settings: { calibrationMin: 3, allowSimulation: "ya" } }));
    await assertFails(updateDoc(ref, { ownerUid: "admin2" }));
    await assertFails(updateDoc(doc(as("sup"), "companies", A), { name: "PT Diambil" }));
  });
});

/* ================================================================== */
describe("modul SMK3", () => {
  const ts = () => serverTimestamp();
  const incident = (uid, extra = {}) => ({ type: "near_miss", severity: "sedang", title: "Hampir tertabrak forklift", description: "x", location: "Gudang",
    involved: "", immediateAction: "", occurredAt: "2026-09-01T08:00", occurredDate: "2026-09-01", lostDays: 0, source: "manual", status: "dilaporkan",
    reportedBy: uid, reportedByName: uid, createdAt: ts(), updatedAt: ts(), ...extra });
  const capa = (uid, extra = {}) => ({ title: "Pasang cermin tikungan", description: "", type: "korektif", priority: "sedang", assigneeUid: "worker", assigneeName: "worker",
    dueDate: "2026-10-01", status: "terbuka", sourceType: "manual", sourceId: null, sourceLabel: "", createdBy: uid, createdByName: uid, createdAt: ts(), updatedAt: ts(), ...extra });
  const seed = (path, data) => env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), path), data));
  const fixTs = (o) => ({ ...o, createdAt: new Date(), updatedAt: new Date() });

  test("insiden: semua anggota aktif melapor; pekerja hanya melihat laporannya", async () => {
    await assertSucceeds(addDoc(collection(as("worker"), "companies", A, "incidents"), incident("worker")));
    await assertFails(addDoc(collection(as("worker"), "companies", A, "incidents"), incident("worker2")));
    await assertFails(addDoc(collection(as("worker"), "companies", A, "incidents"), incident("worker", { status: "selesai" })));
    await assertFails(addDoc(collection(as("dis"), "companies", A, "incidents"), incident("dis")));
    await assertFails(addDoc(collection(as("ownerB"), "companies", A, "incidents"), incident("ownerB")));
    await seed(`companies/${A}/incidents/i1`, fixTs(incident("worker2")));
    await assertFails(getDoc(doc(as("worker"), "companies", A, "incidents", "i1")));
    await assertSucceeds(getDoc(doc(as("worker2"), "companies", A, "incidents", "i1")));
    await assertSucceeds(getDoc(doc(as("mgr"), "companies", A, "incidents", "i1")));
  });

  test("insiden: investigasi hanya staf; pelapor tidak dapat mengubah", async () => {
    await seed(`companies/${A}/incidents/i1`, fixTs(incident("worker")));
    await assertSucceeds(updateDoc(doc(as("sup"), "companies", A, "incidents", "i1"), { status: "investigasi", investigation: { rootCause: "x" } }));
    await assertFails(updateDoc(doc(as("worker"), "companies", A, "incidents", "i1"), { status: "selesai" }));
    await assertFails(updateDoc(doc(as("mgr"), "companies", A, "incidents", "i1"), { status: "selesai" }));
    await assertFails(updateDoc(doc(as("k3"), "companies", A, "incidents", "i1"), { reportedBy: "k3" }));
  });

  test("CAPA: dibuat staf, penanggung jawab memperbarui progres, verifikasi hanya Ahli K3/Admin", async () => {
    await assertSucceeds(addDoc(collection(as("sup"), "companies", A, "capa"), capa("sup")));
    await assertFails(addDoc(collection(as("worker"), "companies", A, "capa"), capa("worker")));
    await seed(`companies/${A}/capa/c1`, fixTs(capa("k3")));
    await assertSucceeds(getDoc(doc(as("worker"), "companies", A, "capa", "c1")));
    await assertFails(getDoc(doc(as("worker2"), "companies", A, "capa", "c1")));
    await assertSucceeds(updateDoc(doc(as("worker"), "companies", A, "capa", "c1"), { status: "selesai", evidence: "Foto terlampir", completedAt: ts() }));
    await assertFails(updateDoc(doc(as("worker"), "companies", A, "capa", "c1"), { status: "terverifikasi" }));
    await assertFails(updateDoc(doc(as("worker"), "companies", A, "capa", "c1"), { dueDate: "2030-01-01" }));
    await assertFails(updateDoc(doc(as("sup"), "companies", A, "capa", "c1"), { status: "terverifikasi" }));
    await assertSucceeds(updateDoc(doc(as("k3"), "companies", A, "capa", "c1"), { status: "terverifikasi", effective: true, verifiedBy: "k3" }));
  });

  test("register risiko: dibaca semua, ditulis Ahli K3/Admin, nilai L×S divalidasi", async () => {
    const risk = (uid, extra = {}) => ({ area: "Gudang", hazard: "Kelelahan", risk: "Microsleep", category: "kognitif", status: "aktif",
      likelihood: 3, severity: 4, residualL: 2, residualS: 4, reviewDate: "2027-01-01", createdBy: uid, createdAt: ts(), updatedAt: ts(), ...extra });
    await assertSucceeds(addDoc(collection(as("k3"), "companies", A, "risks"), risk("k3")));
    await assertFails(addDoc(collection(as("sup"), "companies", A, "risks"), risk("sup")));
    await assertFails(addDoc(collection(as("k3"), "companies", A, "risks"), risk("k3", { likelihood: 9 })));
    await assertFails(addDoc(collection(as("k3"), "companies", A, "risks"), risk("k3", { category: "sihir" })));
    await seed(`companies/${A}/risks/r1`, fixTs(risk("k3")));
    await assertSucceeds(getDoc(doc(as("worker"), "companies", A, "risks", "r1")));
  });

  test("inspeksi: supervisor melaksanakan, terkunci setelah selesai; pekerja tidak dapat membaca", async () => {
    const ins = (uid) => ({ templateId: "t1", templateName: "APAR", area: "", date: "2026-09-01", items: [{ id: "a", text: "APAR ok", result: "", note: "" }],
      status: "draft", inspectorUid: uid, inspectorName: uid, createdBy: uid, createdAt: ts(), updatedAt: ts() });
    const ref = doc(as("sup"), "companies", A, "inspections", "n1");
    await assertSucceeds(setDoc(ref, ins("sup")));
    await assertSucceeds(updateDoc(ref, { status: "selesai", items: [{ id: "a", text: "APAR ok", result: "ok", note: "" }] }));
    await assertFails(updateDoc(ref, { notes: "ubah setelah selesai" }));
    await assertSucceeds(updateDoc(doc(as("k3"), "companies", A, "inspections", "n1"), { notes: "koreksi Ahli K3" }));
    await assertFails(getDoc(doc(as("worker"), "companies", A, "inspections", "n1")));
    await assertFails(setDoc(doc(as("worker"), "companies", A, "inspections", "n2"), ins("worker")));
  });

  test("jam kerja & statistik EEG: jam kerja oleh Ahli K3; statistik hanya bertambah", async () => {
    await assertSucceeds(setDoc(doc(as("k3"), "companies", A, "manhours", "2026-09"), { month: "2026-09", hours: 17600, workers: 100, updatedBy: "k3", updatedAt: ts() }));
    await assertFails(setDoc(doc(as("sup"), "companies", A, "manhours", "2026-09"), { month: "2026-09", hours: 1, workers: 1, updatedBy: "sup", updatedAt: ts() }));
    await assertFails(setDoc(doc(as("k3"), "companies", A, "manhours", "salah"), { month: "salah", hours: 1, workers: 1, updatedBy: "k3", updatedAt: ts() }));
    const st = doc(as("worker"), "companies", A, "eegStats", "2026-09");
    await assertSucceeds(setDoc(st, { sessions: 1, minutes: 60, microsleep: 0 }, { merge: true }));
    await assertSucceeds(setDoc(st, { sessions: 2, minutes: 120 }, { merge: true }));
    await assertFails(setDoc(st, { minutes: 10 }, { merge: true }));
    await assertFails(getDoc(doc(as("worker"), "companies", A, "eegStats", "2026-09")));
    await assertSucceeds(getDoc(doc(as("mgr"), "companies", A, "eegStats", "2026-09")));
  });

  test("audit: auditor menilai, terkunci setelah selesai, pekerja/supervisor tidak menulis", async () => {
    const aud = (uid) => ({ title: "Audit I", level: "awal", auditDate: "2026-09-10", status: "rencana", results: {}, createdBy: uid, createdAt: ts(), updatedAt: ts() });
    await assertSucceeds(setDoc(doc(as("aud"), "companies", A, "audits", "a1"), aud("aud")));
    await assertFails(setDoc(doc(as("sup"), "companies", A, "audits", "a2"), aud("sup")));
    await assertSucceeds(updateDoc(doc(as("aud"), "companies", A, "audits", "a1"), { "results.1_1_1": { r: "sesuai" }, status: "berlangsung" }));
    await assertSucceeds(updateDoc(doc(as("aud"), "companies", A, "audits", "a1"), { status: "selesai" }));
    await assertFails(updateDoc(doc(as("aud"), "companies", A, "audits", "a1"), { "results.1_1_3": { r: "sesuai" } }));
    await assertFails(getDoc(doc(as("worker"), "companies", A, "audits", "a1")));
  });

  test("kebijakan: pengesahan hanya admin/manajemen, isi terkunci, konfirmasi baca oleh pekerja", async () => {
    const pol = (uid) => ({ title: "Kebijakan K3", category: "kebijakan_k3", version: "1.0", content: "isi", reviewDate: "2027-01-01", status: "draft", createdBy: uid, createdAt: ts(), updatedAt: ts() });
    await assertSucceeds(setDoc(doc(as("k3"), "companies", A, "policies", "p1"), pol("k3")));
    await assertFails(getDoc(doc(as("worker"), "companies", A, "policies", "p1")));
    await assertFails(updateDoc(doc(as("k3"), "companies", A, "policies", "p1"), { status: "disahkan", approvedBy: "k3" }));
    await assertFails(setDoc(doc(as("worker"), "companies", A, "policies", "p1", "acks", "worker"), { uid: "worker", name: "w", version: "1.0", at: ts() }));
    await assertSucceeds(updateDoc(doc(as("mgr"), "companies", A, "policies", "p1"), { status: "disahkan", approvedBy: "mgr" }));
    await assertFails(updateDoc(doc(as("owner"), "companies", A, "policies", "p1"), { content: "isi diubah diam-diam" }));
    await assertSucceeds(getDoc(doc(as("worker"), "companies", A, "policies", "p1")));
    await assertSucceeds(setDoc(doc(as("worker"), "companies", A, "policies", "p1", "acks", "worker"), { uid: "worker", name: "w", version: "1.0", at: ts() }));
    await assertFails(setDoc(doc(as("worker"), "companies", A, "policies", "p1", "acks", "worker2"), { uid: "worker2", name: "w", version: "1.0", at: ts() }));
  });

  test("pelatihan & dokumen: ditulis Ahli K3/Admin; pekerja membaca catatan sendiri & dokumen disetujui", async () => {
    const rec = (uid) => ({ uid: "worker", name: "worker", trainingId: "t1", trainingName: "Forklift", date: "2026-01-10", expiryDate: "2027-01-10", certificateNo: "", provider: "", createdBy: uid, createdAt: ts() });
    await assertSucceeds(setDoc(doc(as("k3"), "companies", A, "trainingRecords", "tr1"), rec("k3")));
    await assertFails(setDoc(doc(as("sup"), "companies", A, "trainingRecords", "tr2"), rec("sup")));
    await assertSucceeds(getDoc(doc(as("worker"), "companies", A, "trainingRecords", "tr1")));
    await assertFails(getDoc(doc(as("worker2"), "companies", A, "trainingRecords", "tr1")));
    const d = (uid, status) => ({ code: "SOP-01", title: "SOP APAR", type: "sop", version: "1.0", status, content: "isi", url: "", reviewDate: "", createdBy: uid, createdAt: ts(), updatedAt: ts() });
    await assertSucceeds(setDoc(doc(as("k3"), "companies", A, "documents", "d1"), d("k3", "draft")));
    await assertFails(getDoc(doc(as("worker"), "companies", A, "documents", "d1")));
    await assertFails(updateDoc(doc(as("k3"), "companies", A, "documents", "d1"), { status: "disetujui" }));
    await assertSucceeds(updateDoc(doc(as("k3"), "companies", A, "documents", "d1"), { status: "disetujui", approvedBy: "k3" }));
    await assertSucceeds(getDoc(doc(as("worker"), "companies", A, "documents", "d1")));
    await assertFails(setDoc(doc(as("worker"), "companies", A, "documents", "d2"), d("worker", "draft")));
  });

  test("peringatan EEG + near miss otomatis dalam satu batch oleh pekerja", async () => {
    const db2 = as("worker"), b = writeBatch(db2);
    const aRef = doc(collection(db2, "companies", A, "eegAlerts")), iRef = doc(collection(db2, "companies", A, "incidents"));
    b.set(iRef, incident("worker", { source: "eeg", eegAlertId: aRef.id, severity: "berat", reportedByName: "Sistem EEG" }));
    b.set(aRef, { uid: "worker", name: "w", position: "", sessionId: "s1", incidentId: iRef.id, type: "microsleep", severity: "kritis", message: "m", status: "open", createdAt: ts() });
    await assertSucceeds(b.commit());
  });
});
