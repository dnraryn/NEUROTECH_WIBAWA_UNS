// Daftar anggota aktif (untuk memilih penanggung jawab, peserta pelatihan, dll.).
import { db } from "./firebase.js";
import { can, MEMBER_READERS } from "./roles.js";
import {
  collection, query, where, getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let cache = null, cacheAt = 0, cacheCid = null;

export async function activeMembers(ctx, { fresh = false } = {}) {
  if (!can(ctx, MEMBER_READERS)) return [{ uid: ctx.user.uid, name: ctx.member.name, position: ctx.member.position, role: ctx.member.role }];
  if (!fresh && cache && cacheCid === ctx.company.id && Date.now() - cacheAt < 60_000) return cache;
  const snap = await getDocs(query(collection(db, "companies", ctx.company.id, "members"), where("status", "==", "active")));
  cache = snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"));
  cacheAt = Date.now(); cacheCid = ctx.company.id;
  return cache;
}
