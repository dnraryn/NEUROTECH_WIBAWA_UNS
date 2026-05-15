// Firebase init — compat build to fit the no-bundler script-tag setup.
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

console.info("[NeuroTech] Firebase initialised · project:", firebaseConfig.projectId);
