// Firebase init + helpers, compat build to fit the no-bundler script-tag setup.
// Web API keys are public by design; security lives in Firestore/Auth rules.

const firebaseConfig = {
  apiKey: "AIzaSyD5dOpEcjs5YJNOIZpYD_hNQ1vAcv2l3pk",
  authDomain: "neurotech-id.firebaseapp.com",
  projectId: "neurotech-id",
  storageBucket: "neurotech-id.firebasestorage.app",
  messagingSenderId: "253850697669",
  appId: "1:253850697669:web:85be4262d92cca81e995ac",
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

window.NT_FIREBASE = { app: firebase.app(), db, auth };

// ── Auth helpers, every method returns a Promise ─────────────────────────
// The Auth record only holds email/password. A user's profile (name, role)
// lives in Firestore at users/{uid}; sign-up writes both.
const ntAuth = {
  // Create the account, set the display name, then write the profile doc.
  async signUp({ name, email, password, role }) {
    const cred = await auth.createUserWithEmailAndPassword(email.trim(), password);
    await cred.user.updateProfile({ displayName: name });
    await db.collection("users").doc(cred.user.uid).set({
      name,
      email: email.trim(),
      role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return cred.user;
  },

  // Authenticate an existing account. The profile is fetched separately.
  signIn({ email, password }) {
    return auth.signInWithEmailAndPassword(email.trim(), password);
  },

  signOut() {
    return auth.signOut();
  },

  // Read the Firestore profile for a uid. Returns null when it is missing.
  async getProfile(uid) {
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists ? { uid, ...snap.data() } : null;
  },

  // Subscribe to login/logout. The callback receives the user (or null).
  // Returns the unsubscribe function.
  onChange(cb) {
    return auth.onAuthStateChanged(cb);
  },
};

// ── Firestore: workers collection ─────────────────────────────────────────
const ntWorkers = {
  // Live subscription. The callback receives an array of worker records.
  // Returns the unsubscribe function.
  subscribe(cb) {
    return db.collection("workers").onSnapshot(
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("[NeuroTech] workers subscribe failed:", err.message)
    );
  },

  // One-time bulk upload, used to seed the collection from mock data.
  async seed(list) {
    const batch = db.batch();
    list.forEach((w) => batch.set(db.collection("workers").doc(w.id), w));
    await batch.commit();
    return list.length;
  },
};

window.ntAuth = ntAuth;
window.ntWorkers = ntWorkers;

// ── Test company accounts, one per package tier ───────────────────────────
// Run window.ntSeedTestAccounts() ONCE in the browser console to create them.
// Each becomes a real Firebase Auth account plus a users/ and companies/ doc.
const NT_TEST_ACCOUNTS = [
  { code: "F-001", pkg: "free",     role: "worker",     name: "Pengguna Free Demo",     email: "neurotech.free@gmail.com",     password: "free123456" },
  { code: "B-001", pkg: "bronze",   role: "supervisor", name: "UMKM Bronze Demo",       email: "neurotech.bronze@gmail.com",   password: "bronze123456" },
  { code: "S-001", pkg: "silver",   role: "supervisor", name: "Industri Silver Demo",   email: "neurotech.silver@gmail.com",   password: "silver123456" },
  { code: "G-001", pkg: "gold",     role: "manager",    name: "Company Gold Demo",      email: "neurotech.gold@gmail.com",     password: "gold123456" },
  { code: "P-001", pkg: "platinum", role: "manager",    name: "Company Platinum Demo",  email: "neurotech.platinum@gmail.com", password: "platinum123456" },
];

window.ntSeedTestAccounts = async () => {
  let created = 0;
  for (const a of NT_TEST_ACCOUNTS) {
    try {
      const cred = await auth.createUserWithEmailAndPassword(a.email, a.password);
      await cred.user.updateProfile({ displayName: a.name });
      await db.collection("users").doc(cred.user.uid).set({
        name: a.name, email: a.email, role: a.role,
        companyCode: a.code, package: a.pkg, companyName: a.name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection("companies").doc(a.code).set({
        code: a.code, package: a.pkg, companyName: a.name, ownerEmail: a.email,
      });
      created += 1;
      console.info("[NeuroTech] akun test dibuat:", a.code, "·", a.email);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") console.warn("[NeuroTech] sudah ada:", a.email);
      else console.error("[NeuroTech] gagal membuat", a.email, ":", e.message);
    }
  }
  try { await auth.signOut(); } catch (e) { /* ignore */ }
  console.info(`[NeuroTech] selesai, ${created} akun test baru dibuat.`);
  return created;
};

// ── Anonymous sign-in ─────────────────────────────────────────────────────
// Lets the company-code flow read/write Firestore without anyone logging in
// with a Google/email account. Enable it once in Firebase Console:
//   Authentication → Sign-in method → Anonymous → Enable.
auth.signInAnonymously().catch((e) =>
  console.error("[NeuroTech] anonymous sign-in gagal:", e.message));

// ── Companies — created by the "Bergabung" flow, read by the login flow ────
const ntCompany = {
  // Sequential code per package, e.g. P-001, P-002 …
  async nextCode(pkg) {
    const prefix = ({ free: "F", bronze: "B", silver: "S", gold: "G", platinum: "P" })[pkg] || "X";
    let n = 1;
    try {
      const snap = await db.collection("companies").where("package", "==", pkg).get();
      n = snap.size + 1;
    } catch (e) { console.warn("[NeuroTech] nextCode fallback:", e.message); }
    return prefix + "-" + String(n).padStart(3, "0");
  },
  async create({ pkg, companyName, members }) {
    const code = await ntCompany.nextCode(pkg);
    await db.collection("companies").doc(code).set({
      code, package: pkg, companyName, members,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return code;
  },
  async getByCode(code) {
    const snap = await db.collection("companies").doc((code || "").trim().toUpperCase()).get();
    return snap.exists ? snap.data() : null;
  },
};

// ── Member session (company-code login, kept in sessionStorage) ────────────
const ntSession = {
  get() {
    try { return JSON.parse(sessionStorage.getItem("nt-session") || "null"); }
    catch (e) { return null; }
  },
  set(s) { sessionStorage.setItem("nt-session", JSON.stringify(s)); },
  clear() { sessionStorage.removeItem("nt-session"); },
};

window.ntCompany = ntCompany;
window.ntSession = ntSession;

// ── Demo companies — one per package, pre-filled with members ──────────────
// Run window.ntSeedCompanies() ONCE in the browser console to create them.
const M = (id, name, role, roleDesc) => ({ id, name, role, roleDesc, password: "123456" });
const NT_SEED_COMPANIES = [
  { code: "F-001", package: "free", companyName: "Akun Pribadi Budi", members: [
    M("m1", "Budi Santoso", "pekerja", "Pengguna Individu"),
  ]},
  { code: "B-001", package: "bronze", companyName: "UMKM Karya Mandiri", members: [
    M("m1", "Hendra Wijaya", "management", "Pemilik Usaha"),
    M("m2", "Sri Lestari", "supervisor", "Pengawas Lapangan"),
    M("m3", "Andre Pratama", "pekerja", "Driver Truk"),
    M("m4", "Dewi Anggraini", "pekerja", "Operator Gudang"),
    M("m5", "Rizal Maulana", "pekerja", "Driver Truk"),
    M("m6", "Putri Handayani", "pekerja", "Admin Logistik"),
    M("m7", "Joko Susilo", "pekerja", "Teknisi"),
  ]},
  { code: "S-001", package: "silver", companyName: "CV Sinar Industri", members: [
    M("m1", "Maria Gunawan", "management", "Direktur"),
    M("m2", "Bambang Riyanto", "supervisor", "Supervisor Produksi"),
    M("m3", "Lina Kusuma", "supervisor", "Supervisor K3"),
    M("m4", "Agus Salim", "pekerja", "Operator Mesin"),
    M("m5", "Nina Rahmawati", "pekerja", "Operator CCR"),
    M("m6", "Eko Prasetyo", "pekerja", "Driver Forklift"),
    M("m7", "Wati Suryani", "pekerja", "Lab Analyst"),
    M("m8", "Doni Hartono", "pekerja", "Teknisi"),
    M("m9", "Yusuf Hidayat", "pekerja", "Security CCTV"),
  ]},
  { code: "G-001", package: "gold", companyName: "PT Gold Manufaktur", members: [
    M("m1", "Surya Dharma", "management", "General Manager"),
    M("m2", "Ratna Dewi", "supervisor", "Supervisor Shift Pagi"),
    M("m3", "Hadi Purnomo", "supervisor", "Supervisor Shift Malam"),
    M("m4", "Indra Kurniawan", "pekerja", "Operator CCR"),
    M("m5", "Sari Melati", "pekerja", "Operator Mesin"),
    M("m6", "Fajar Nugroho", "pekerja", "Driver Truk"),
    M("m7", "Tuti Marlina", "pekerja", "Dispatcher"),
    M("m8", "Bayu Saputra", "pekerja", "Teknisi Listrik"),
    M("m9", "Reni Astuti", "pekerja", "Lab Analyst"),
    M("m10", "Gilang Ramadhan", "pekerja", "Driver Forklift"),
    M("m11", "Sinta Permata", "pekerja", "Admin K3"),
  ]},
  { code: "P-001", package: "platinum", companyName: "PT Platinum Energi", members: [
    M("m1", "Anton Wibowo", "management", "Direktur Operasional"),
    M("m2", "Citra Lestari", "supervisor", "Supervisor Lapangan A"),
    M("m3", "Dimas Aryo", "supervisor", "Supervisor Lapangan B"),
    M("m4", "Endah Kusumawati", "supervisor", "Supervisor K3"),
    M("m5", "Galih Pratama", "pekerja", "Operator CCR"),
    M("m6", "Hesti Rahayu", "pekerja", "Operator Mesin"),
    M("m7", "Irfan Maulana", "pekerja", "Driver Truk"),
    M("m8", "Kartika Sari", "pekerja", "Dispatcher"),
    M("m9", "Lukman Hakim", "pekerja", "Teknisi"),
    M("m10", "Mega Wulandari", "pekerja", "Lab Analyst"),
    M("m11", "Nanda Saputra", "pekerja", "Security CCTV"),
    M("m12", "Oki Setiawan", "pekerja", "Driver Forklift"),
    M("m13", "Pingkan Maharani", "pekerja", "Admin Logistik"),
  ]},
];

window.ntSeedCompanies = async () => {
  for (const c of NT_SEED_COMPANIES) {
    await db.collection("companies").doc(c.code).set({
      code: c.code, package: c.package, companyName: c.companyName, members: c.members,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.info("[NeuroTech] perusahaan demo dibuat:", c.code, "·", c.companyName);
  }
  console.info(`[NeuroTech] selesai, ${NT_SEED_COMPANIES.length} perusahaan demo dibuat.`);
  return NT_SEED_COMPANIES.length;
};

console.info("[NeuroTech] Firebase initialised · project:", firebaseConfig.projectId);
