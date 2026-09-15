// Memuat konteks sesi: user → users/{uid} → member → company.
import { db } from "./firebase.js";
import { ensureUserDoc } from "./auth.js";
import {
  doc, getDoc, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * @returns {Promise<{state:'no-company'|'pending'|'disabled'|'active', user, profile, member, company}>}
 */
export async function loadContext(user) {
  const profile = await ensureUserDoc(user);
  const ctx = { user, profile, member: null, company: null, state: "no-company" };
  if (!profile.companyId) return ctx;

  const mSnap = await getDoc(doc(db, "companies", profile.companyId, "members", user.uid));
  if (!mSnap.exists()) {
    // dikeluarkan / permintaan ditolak → kosongkan tautan perusahaan
    await updateDoc(doc(db, "users", user.uid), { companyId: null, updatedAt: serverTimestamp() }).catch(() => {});
    profile.companyId = null;
    return ctx;
  }
  ctx.member = { id: mSnap.id, ...mSnap.data() };
  const cSnap = await getDoc(doc(db, "companies", profile.companyId));
  ctx.company = cSnap.exists() ? { id: cSnap.id, ...cSnap.data() } : { id: profile.companyId, name: "Perusahaan" };
  ctx.state = ctx.member.status;
  return ctx;
}

/** Pengaturan perusahaan dengan nilai default. */
export function companySettings(company) {
  const s = company?.settings || {};
  return {
    calibrationMin: Number.isFinite(s.calibrationMin) ? s.calibrationMin : 3,
    allowSimulation: s.allowSimulation !== false,
  };
}
