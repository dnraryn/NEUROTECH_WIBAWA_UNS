"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."), testing = process.argv[2] === "test";
if (!testing) require("./build-hosting");
const env = { ...process.env, DEBUG: "", FIREBASE_CLI_DISABLE_USAGE_REPORTING: "1" };
// Prefer the task-local Java runtime if present; never change system settings.
const portable = path.join(root, ".tools", "java21");
if (fs.existsSync(portable)) {
  const java = fs.readdirSync(portable).map((dir) => path.join(portable, dir, "bin"))
    .find((bin) => fs.existsSync(path.join(bin, process.platform === "win32" ? "java.exe" : "java")));
  if (java) env.PATH = java + path.delimiter + env.PATH;
}
const candidates = [path.join(root, "node_modules", "firebase-tools", "lib", "bin", "firebase.js")];
for (const dir of (env.PATH || "").split(path.delimiter)) {
  candidates.push(path.join(dir, "node_modules", "firebase-tools", "lib", "bin", "firebase.js"));
  candidates.push(path.resolve(dir, "../lib/node_modules/firebase-tools/lib/bin/firebase.js"));
}
if (env.APPDATA) candidates.push(path.join(env.APPDATA, "npm", "node_modules", "firebase-tools", "lib", "bin", "firebase.js"));
const cli = candidates.find((file) => fs.existsSync(file));
if (!cli) {
  console.error("Firebase CLI belum ditemukan. Pasang dengan npm.cmd install -g firebase-tools.");
  process.exit(1);
}
const args = testing
  ? ["emulators:exec", "--project", "demo-neurotech", "--only", "auth,firestore", "node --test tests/security/*.test.js"]
  : ["emulators:start", "--project", "demo-neurotech", "--only", "auth,firestore,hosting"];
const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, env, stdio: "inherit", windowsHide: true });
if (result.error) console.error("Tidak dapat menjalankan emulator. Periksa Firebase CLI dan Java 21 di PATH.");
process.exitCode = result.status ?? 1;
