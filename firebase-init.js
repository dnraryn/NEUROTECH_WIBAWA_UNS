// Firebase compat client. Firestore Rules enforce membership and role access.
const firebaseConfig = {
  apiKey: "AIzaSyD5dOpEcjs5YJNOIZpYD_hNQ1vAcv2l3pk",
  authDomain: "neurotech-id.firebaseapp.com",
  projectId: "neurotech-id",
  storageBucket: "neurotech-id.firebasestorage.app",
  messagingSenderId: "253850697669",
  appId: "1:253850697669:web:85be4262d92cca81e995ac",
};


// Firebase Auth identifies each person; protected memberships grant access.
const ntUseEmulators = ["localhost", "127.0.0.1"].includes(window.location?.hostname)
  && new URLSearchParams(window.location.search).get("emulators") === "1";
firebase.initializeApp(ntUseEmulators ? { ...firebaseConfig, projectId: "demo-neurotech" } : firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
if (ntUseEmulators) {
  auth.useEmulator("http://127.0.0.1:9099");
  db.useEmulator("127.0.0.1", 8080);
}
window.NT_FIREBASE = { app: firebase.app(), db, auth, emulators: ntUseEmulators };
// Delete the obsolete cache: it could contain plaintext member passwords.
sessionStorage.removeItem("nt-session");
let ntCurrentSession = null;
let ntAuthLoading = true;
let ntAllowAutomaticRestore = true;
let ntSessionEpoch = 0;
let ntSessionLoad = 0;
let ntSubscriptions = [];
const ntEmitSession = (identityChanged) => {
  if (identityChanged) window.dispatchEvent(new CustomEvent("nt-session"));
  window.dispatchEvent(new CustomEvent("nt-auth"));
};
const ntStopSubscriptions = () => {
  ntSubscriptions.forEach((stop) => stop());
  ntSubscriptions = [];
};
const ntSession = {
  get() { return ntCurrentSession ? JSON.parse(JSON.stringify(ntCurrentSession)) : null; },
  // Compatibility with the local worker store. Identity/role cannot be changed here.
  set(value) {
    if (!ntCurrentSession || value.uid !== ntCurrentSession.uid || value.code !== ntCurrentSession.code
        || value.memberId !== ntCurrentSession.memberId || value.role !== ntCurrentSession.role) {
      throw new Error("Sesi hanya dapat dibuat dari keanggotaan Firebase.");
    }
    ntCurrentSession = { ...ntCurrentSession, members: value.members };
    ntEmitSession(false);
  },
  clear() {
    ntSessionEpoch++;
    ntSessionLoad++;
    ntStopSubscriptions();
    const changed = !!ntCurrentSession;
    ntCurrentSession = null;
    ntEmitSession(changed);
  },
};
async function ntLoadSession(expectedCode) {
  const load = ++ntSessionLoad, epoch = ntSessionEpoch, user = auth.currentUser;
  if (!user || user.isAnonymous || !user.emailVerified) { ntSession.clear(); return null; }
  const profile = (await db.collection("users").doc(user.uid).get()).data();
  if (epoch !== ntSessionEpoch || load !== ntSessionLoad || auth.currentUser?.uid !== user.uid) return null;
  if (!profile || profile.schemaVersion !== 2 || profile.status !== "active") { ntSession.clear(); return null; }
  if (expectedCode && profile.companyCode !== expectedCode.trim().toUpperCase()) {
    throw new Error("Akun ini tidak terdaftar di perusahaan tersebut.");
  }
  const ref = db.collection("companies").doc(profile.companyCode);
  const ownRef = ref.collection("members").doc(profile.memberId);
  const [companySnap, ownSnap] = await Promise.all([ref.get(), ownRef.get()]);
  const company = companySnap.data(), own = ownSnap.data();
  if (company?.schemaVersion !== 2 || own?.status !== "active" || own.uid !== user.uid || own.role !== profile.role) {
    throw new Error("Keanggotaan tidak aktif atau perusahaan belum dimigrasikan.");
  }
  const query = ref.collection("members");
  const members = ["supervisor", "management"].includes(profile.role)
    ? (await query.get()).docs.map((d) => d.data()) : [own];
  if (epoch !== ntSessionEpoch || load !== ntSessionLoad || auth.currentUser?.uid !== user.uid) return null;
  const changed = !ntCurrentSession || ntCurrentSession.uid !== user.uid || ntCurrentSession.code !== company.code;
  ntCurrentSession = { uid: user.uid, code: company.code, companyName: company.companyName, package: company.package,
    ownerUid: company.ownerUid, memberName: own.name, memberId: own.id, role: own.role, roleDesc: own.roleDesc, members };
  sessionStorage.removeItem("nt-demo");
  window.ntApplyCompanyMembers?.(members, own.id);
  ntStopSubscriptions();
  // A role change/removal immediately reloads or revokes the local session.
  ntSubscriptions.push(db.collection("users").doc(user.uid).onSnapshot((snap) => {
    if (epoch !== ntSessionEpoch || load !== ntSessionLoad) return;
    const latest = snap.data();
    if (latest?.schemaVersion !== 2 || latest.status !== "active") { ntSession.clear(); return; }
    if (latest.role !== profile.role || latest.memberId !== profile.memberId || latest.companyCode !== profile.companyCode) {
      ntLoadSession().catch(() => ntSession.clear());
    }
  }, () => ntSession.clear()));
  const visible = ["supervisor", "management"].includes(own.role) ? query : query.where("uid", "==", user.uid);
  ntSubscriptions.push(visible.onSnapshot((snap) => {
    if (epoch !== ntSessionEpoch || load !== ntSessionLoad || !ntCurrentSession) return;
    const list = snap.docs.map((d) => d.data());
    const current = list.find((m) => m.id === own.id && m.status === "active");
    if (!current || current.role !== ntCurrentSession.role) {
      ntSession.clear(); return;
    }
    ntCurrentSession = { ...ntCurrentSession, members: list };
    window.ntApplyCompanyMembers?.(list, own.id);
    ntEmitSession(false);
  }, () => ntSession.clear()));
  ntEmitSession(changed);
  return ntSession.get();
}
const ntAuth = {
  get loading() { return ntAuthLoading; },
  async signUp({ name, email, password }) {
    await ntPersistence;
    ntAllowAutomaticRestore = false;
    const credential = await auth.createUserWithEmailAndPassword(email.trim(), password);
    await credential.user.updateProfile({ displayName: name.trim() });
    await credential.user.sendEmailVerification();
    return credential.user;
  },
  async signIn({ email, password }) {
    await ntPersistence;
    ntAllowAutomaticRestore = false;
    ntSession.clear();
    return (await auth.signInWithEmailAndPassword(email.trim(), password)).user;
  },
  async verify() {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) throw new Error("Masuk kembali terlebih dahulu.");
    await user.reload();
    await user.getIdToken(true);
    if (!user.emailVerified) throw new Error("Email belum terverifikasi. Buka tautan yang dikirim ke email Anda.");
    return user;
  },
  resendVerification() {
    if (!auth.currentUser) throw new Error("Masuk terlebih dahulu.");
    return auth.currentUser.sendEmailVerification();
  },
  resetPassword(email) { return auth.sendPasswordResetEmail(email.trim()); },
  async refresh(code) {
    try {
      const result = await ntLoadSession(code);
      ntAllowAutomaticRestore = true;
      return result;
    } catch (error) { ntSession.clear(); throw error; }
    finally { ntAuthLoading = false; ntEmitSession(false); }
  },
  async signOut() { ntSession.clear(); await auth.signOut(); },
  onChange(cb) { return auth.onAuthStateChanged(cb); },
};
const ntCompanyStore = window.ntCreateCompanyStore({
  db, auth, stamp: () => firebase.firestore.FieldValue.serverTimestamp(),
  randomCode: () => Array.from(window.crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join(""),
  randomToken: () => Array.from(window.crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join(""),
  increment: (n) => firebase.firestore.FieldValue.increment(n),
});
const ntCompany = {
  create(data) { return ntCompanyStore.create(data); },
  async acceptInvitation(code) { await ntCompanyStore.acceptInvitation(code); return ntAuth.refresh(code); },
  createJoinLink(code) { return ntCompanyStore.createJoinLink(code); },
  revokeJoinLink(code, token) { return ntCompanyStore.revokeJoinLink(code, token); },
  async joinWithLink(code, token, name) { await ntCompanyStore.joinWithLink(code, token, name); return ntAuth.refresh(code); },
  async listJoinLinks(code) {
    const snap = await db.collection("companies").doc(code).collection("joinLinks").get();
    return snap.docs.map((doc) => ({ token: doc.id, companyCode: code, enabled: doc.data().enabled,
      uses: doc.data().uses, expiresAt: doc.data().expiresAt.toMillis() }));
  },
  async addMember(member) { await ntCompanyStore.addMember(member); return ntAuth.refresh(); },
  async removeMember(id) { await ntCompanyStore.removeMember(id); return ntAuth.refresh(); },
  async setShift(id, shift) { await ntCompanyStore.setShift(id, shift); return ntAuth.refresh(); },
  async changeRole(id, role) { await ntCompanyStore.changeRole(id, role); return ntAuth.refresh(); },
};
window.ntAuth = ntAuth;
window.ntCompany = ntCompany;
window.ntSession = ntSession;
const ntPersistence = auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
ntPersistence.then(() => auth.onAuthStateChanged(async (user) => {
  ntSession.clear();
  ntAuthLoading = true;
  ntEmitSession(false);
  try {
    if (user && !user.isAnonymous && user.emailVerified && ntAllowAutomaticRestore) await ntLoadSession();
    else if (user?.isAnonymous) await auth.signOut();
  } catch (error) { ntSession.clear(); }
  finally { ntAuthLoading = false; ntEmitSession(false); }
})).catch(() => { ntAuthLoading = false; ntSession.clear(); });
