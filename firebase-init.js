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

console.info("[NeuroTech] Firebase initialised · project:", firebaseConfig.projectId);
