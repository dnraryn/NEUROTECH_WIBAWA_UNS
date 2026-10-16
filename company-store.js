// Firestore transactions for Spark. Security Rules authorize every document;
// these UI checks provide feedback and are never the authorization boundary.
function ntCreateCompanyStore({ db, auth, stamp, randomCode, randomToken, increment }) {
  const tiers = { free: ["F", 1], bronze: ["B", 10], silver: ["S", 25], gold: ["G", 50], platinum: ["P", 100] };
  const roles = ["pekerja", "supervisor", "management"];
  const text = (value, label, max = 120) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(label + " tidak valid.");
    return value.trim();
  };
  const emailOf = (value) => {
    const email = text(value, "Email", 254).toLowerCase();
    if (!/^[^/\s@]+@[^/\s@]+\.[^/\s@]+$/.test(email)) throw new Error("Email tidak valid.");
    return email;
  };
  const input = (data) => {
    if (!data || Object.keys(data).some((key) => !["name", "email", "role", "roleDesc", "shift"].includes(key))) throw new Error("Data anggota tidak valid.");
    const role = data.role || "pekerja", shift = data.shift || "Pagi";
    if (!roles.includes(role) || !["Pagi", "Sore", "Malam"].includes(shift)) throw new Error("Role atau shift tidak valid.");
    return { name: text(data.name, "Nama"), email: emailOf(data.email), role,
      roleDesc: text(data.roleDesc || role, "Deskripsi peran"), shift };
  };
  const user = () => {
    const actor = auth.currentUser;
    if (!actor || actor.isAnonymous || !actor.emailVerified) throw new Error("Masuk dan verifikasi email terlebih dahulu.");
    return { uid: actor.uid, email: emailOf(actor.email) };
  };
  const profileRef = (uid) => db.collection("users").doc(uid);
  const companyRef = (code) => db.collection("companies").doc(text(code, "Kode perusahaan").toUpperCase());
  const memberRef = (ref, id) => ref.collection("members").doc(emailOf(id));
  const tokenOf = (token) => {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new Error("Tautan undangan tidak valid.");
    return token;
  };
  const profile = (code, member, uid) => ({ schemaVersion: 2, companyCode: code, memberId: member.id,
    role: member.role, status: "active" });
  async function context(tx, actor, code) {
    const p = (await tx.get(profileRef(actor.uid))).data();
    if (p?.schemaVersion !== 2 || p.status !== "active" || (code && p.companyCode !== code)) throw new Error("Keanggotaan tidak aktif.");
    const ref = companyRef(p.companyCode), company = (await tx.get(ref)).data();
    return { p, ref, company };
  }
  const staff = (p) => {
    if (!["supervisor", "management"].includes(p.role)) throw new Error("Akses pengelola diperlukan.");
  };
  const manage = (ctx, actor, role) => {
    staff(ctx.p);
    if (ctx.p.role === "supervisor" && role !== "pekerja") throw new Error("Supervisor hanya dapat mengelola pekerja.");
    if (role === "management" && ctx.company.ownerUid !== actor.uid) throw new Error("Hanya pemilik dapat mengelola akses manajemen.");
  };
  const count = (role) => Number(role === "pekerja");
  // Firestore can evaluate Rules against a newer counter before checking the
  // transaction precondition. Retry only a proven counter conflict, never a
  // generic permission failure. The next attempt re-reads membership and role.
  const transaction = async (callback) => {
    for (let attempt = 0; ; attempt++) {
      let observed = null;
      try {
        return await db.runTransaction((tx) => callback({
          async get(ref) {
            const snap = await tx.get(ref);
            if (/^companies\/[^/]+$/.test(ref.path) && snap.exists && Number.isInteger(snap.data().revision)) {
              observed = { ref, revision: snap.data().revision, uid: auth.currentUser?.uid };
            }
            return snap;
          },
          set: (ref, data) => tx.set(ref, data), update: (ref, data) => tx.update(ref, data), delete: (ref) => tx.delete(ref),
        }));
      } catch (error) {
        if (error.code !== "permission-denied" || !observed || attempt >= 3 || auth.currentUser?.uid !== observed.uid) throw error;
        let latest;
        try { latest = await observed.ref.get({ source: "server" }); } catch (_) { throw error; }
        if (!latest.exists || latest.data().revision === observed.revision) throw error;
      }
    }
  };
  const counter = (ctx, id, verb, members, workers) => {
    if (members < 1 || members > (ctx.company.package === "free" ? 1 : 150) || workers > tiers[ctx.company.package][1]) {
      throw new Error("Jumlah anggota melebihi paket.");
    }
    return { memberCount: members, workerCount: workers, lastMemberId: id, lastMemberAction: verb, revision: ctx.company.revision + 1 };
  };
  const api = {
    async create(data) {
      const actor = user(), pkg = data.pkg;
      if (!Object.hasOwn(tiers, pkg)) throw new Error("Paket tidak valid.");
      const companyName = text(data.companyName, "Nama perusahaan");
      if (!Array.isArray(data.members) || data.members.length > 149) throw new Error("Daftar anggota tidak valid.");
      const invites = data.members.map(input);
      if (new Set([actor.email, ...invites.map((m) => m.email)]).size !== invites.length + 1) throw new Error("Email anggota harus berbeda.");
      if ((pkg === "free" && invites.length) || invites.filter((m) => m.role === "pekerja").length > tiers[pkg][1]) throw new Error("Jumlah pekerja melebihi paket.");
      const owner = { id: actor.email, uid: actor.uid, email: actor.email, name: text(data.ownerName, "Nama pemilik"),
        role: pkg === "free" ? "pekerja" : "management", roleDesc: text(data.ownerDesc || "Pemilik", "Deskripsi peran"), shift: "Pagi", status: "active" };
      let reserved;
      for (let collision = 0; collision < 5; collision++) {
        const code = tiers[pkg][0] + "-" + randomCode();
        try {
          reserved = await transaction(async (tx) => {
            const old = (await tx.get(profileRef(actor.uid))).data();
            if (old?.schemaVersion === 2 && old.status === "active") {
              // Resume an interrupted initial roster without a second company.
              const existing = (await tx.get(companyRef(old.companyCode))).data();
              if (existing.ownerUid !== actor.uid || existing.companyName !== companyName || existing.package !== pkg) throw new Error("Akun sudah terdaftar di perusahaan.");
              return old.companyCode;
            }
            const ref = companyRef(code);
            if ((await tx.get(ref)).exists) throw Object.assign(new Error("Kode sedang digunakan. Silakan ulangi."), { code: "company-code-collision" });
            tx.set(ref, { schemaVersion: 2, code, companyName, package: pkg, ownerUid: actor.uid, createdAt: stamp(),
              memberCount: 1, workerCount: count(owner.role), lastMemberId: owner.id, lastMemberAction: "create", revision: 0 });
            tx.set(memberRef(ref, owner.id), owner);
            tx.set(profileRef(actor.uid), profile(code, owner, actor.uid));
            return code;
          });
          break;
        } catch (error) {
          // A foreign company's existing document intentionally denies reads.
          // Retry a fresh ID, never overwrite it or relax its access rules.
          if (!["company-code-collision", "permission-denied"].includes(error.code) || collision === 4) throw error;
        }
      }
      for (const member of invites) await api.addMember(member, reserved, true);
      return reserved;
    },
    async acceptInvitation(code) {
      const actor = user(), ref = companyRef(code);
      return transaction(async (tx) => {
        const old = (await tx.get(profileRef(actor.uid))).data();
        if (old?.schemaVersion === 2 && old.status === "active") {
          if (old.companyCode === ref.id) return;
          throw new Error("Akun sudah terdaftar di perusahaan lain.");
        }
        const invitation = memberRef(ref, actor.email), member = (await tx.get(invitation)).data();
        if (!member || member.status !== "invited") throw new Error("Undangan tidak ditemukan untuk email ini.");
        tx.update(invitation, { uid: actor.uid, status: "active" });
        tx.set(profileRef(actor.uid), profile(ref.id, member, actor.uid));
      });
    },
    async createJoinLink(code) {
      const actor = user(), token = tokenOf(randomToken());
      return transaction(async (tx) => {
        const ctx = await context(tx, actor, code); staff(ctx.p);
        if (ctx.company.package === "free" || ctx.company.workerCount >= tiers[ctx.company.package][1]) throw new Error("Kapasitas pekerja paket sudah penuh.");
        const ref = ctx.ref.collection("joinLinks").doc(token);
        const data = { schemaVersion: 1, companyName: ctx.company.companyName, role: "pekerja", createdByUid: actor.uid,
          createdAt: stamp(), expiresAt: new Date(Date.now() + 7 * 86400000), enabled: true, uses: 0, lastJoinedUid: null };
        tx.set(ref, data);
        return { token, companyCode: ctx.ref.id, expiresAt: data.expiresAt.getTime(), enabled: true, uses: 0 };
      });
    },
    async revokeJoinLink(code, token) {
      const actor = user();
      await transaction(async (tx) => {
        const ctx = await context(tx, actor, code); staff(ctx.p);
        tx.update(ctx.ref.collection("joinLinks").doc(tokenOf(token)), { enabled: false });
      });
    },
    async joinWithLink(code, token, name) {
      const actor = user(), ref = companyRef(code), key = tokenOf(token), memberName = text(name, "Nama pekerja");
      return transaction(async (tx) => {
        const old = (await tx.get(profileRef(actor.uid))).data();
        if (old?.schemaVersion === 2 && old.status === "active") {
          if (old.companyCode === ref.id) return;
          throw new Error("Akun sudah terdaftar di perusahaan lain.");
        }
        const linkRef = ref.collection("joinLinks").doc(key), link = (await tx.get(linkRef)).data();
        if (!link || !link.enabled || link.expiresAt.toMillis() <= Date.now()) throw new Error("Undangan kedaluwarsa atau sudah dicabut. Minta tautan baru kepada pengelola.");
        const member = { id: actor.email, email: actor.email, uid: actor.uid, name: memberName,
          role: "pekerja", roleDesc: "Pekerja", shift: "Pagi", status: "active" };
        // The private claim ties all four writes together in Rules. It cannot be
        // read by clients, so bearer tokens never appear in the member roster.
        tx.set(ref.collection("joinClaims").doc(actor.uid), { uid: actor.uid, email: actor.email, token: key, createdAt: stamp() });
        tx.set(memberRef(ref, actor.email), member);
        tx.set(profileRef(actor.uid), profile(ref.id, member, actor.uid));
        tx.update(ref, { memberCount: increment(1), workerCount: increment(1), revision: increment(1), lastMemberId: actor.email, lastMemberAction: "join" });
        tx.update(linkRef, { uses: increment(1), lastJoinedUid: actor.uid });
      });
    },
    async addMember(data, code, resume = false) {
      const actor = user(), member = input(data);
      return transaction(async (tx) => {
        const ctx = await context(tx, actor, code); manage(ctx, actor, member.role);
        const ref = memberRef(ctx.ref, member.email), existing = (await tx.get(ref)).data();
        if (existing) {
          if (resume && existing.name === member.name && existing.role === member.role) return;
          throw new Error("Email sudah terdaftar di perusahaan ini.");
        }
        const changes = counter(ctx, member.email, "add", ctx.company.memberCount + 1, ctx.company.workerCount + count(member.role));
        tx.set(ref, { ...member, id: member.email, uid: null, status: "invited" });
        tx.update(ctx.ref, changes);
      });
    },
    async removeMember(id) {
      const actor = user();
      return transaction(async (tx) => {
        const ctx = await context(tx, actor), ref = memberRef(ctx.ref, id), member = (await tx.get(ref)).data();
        if (!member) throw new Error("Anggota tidak ditemukan.");
        manage(ctx, actor, member.role);
        if (member.uid === actor.uid || member.uid === ctx.company.ownerUid) throw new Error("Pemilik atau akun yang sedang digunakan tidak dapat dihapus.");
        const changes = counter(ctx, member.id, "remove", ctx.company.memberCount - 1, ctx.company.workerCount - count(member.role));
        tx.delete(ref); tx.update(ctx.ref, changes);
        if (member.uid) tx.update(profileRef(member.uid), { status: "revoked" });
      });
    },
    async setShift(id, shift) {
      const actor = user();
      if (!["Pagi", "Sore", "Malam"].includes(shift)) throw new Error("Shift tidak valid.");
      return transaction(async (tx) => {
        const ctx = await context(tx, actor); staff(ctx.p);
        const ref = memberRef(ctx.ref, id);
        if (!(await tx.get(ref)).exists) throw new Error("Anggota tidak ditemukan.");
        tx.update(ref, { shift });
      });
    },
    async changeRole(id, role) {
      const actor = user();
      if (!roles.includes(role)) throw new Error("Role tidak valid.");
      return transaction(async (tx) => {
        const ctx = await context(tx, actor);
        if (ctx.company.ownerUid !== actor.uid) throw new Error("Hanya pemilik perusahaan dapat mengubah role.");
        const ref = memberRef(ctx.ref, id), member = (await tx.get(ref)).data();
        if (!member) throw new Error("Anggota tidak ditemukan.");
        if (member.uid === actor.uid) throw new Error("Role pemilik tidak dapat diubah.");
        const changes = counter(ctx, member.id, "role", ctx.company.memberCount,
          ctx.company.workerCount - count(member.role) + count(role));
        tx.update(ref, { role }); tx.update(ctx.ref, changes);
        if (member.uid) tx.update(profileRef(member.uid), { role });
      });
    },
  };
  return api;
}
if (typeof window !== "undefined") window.ntCreateCompanyStore = ntCreateCompanyStore;
if (typeof module !== "undefined") module.exports = { ntCreateCompanyStore };
