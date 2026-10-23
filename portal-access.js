// Navigation policy only. Firebase memberships and Firestore Rules remain the authority.
(function () {
  "use strict";
  var roles = {
    pekerja: { area: "w", label: "Pekerja", home: "/w/readiness", description: "Muse, hasil Live, dan riwayat pribadi", icon: "signal" },
    supervisor: { area: "s", label: "Supervisor", home: "/s/overview", description: "Pantau tim dan tindak lanjuti alert", icon: "team" },
    management: { area: "m", label: "Manajemen SMK3", home: "/m/overview", description: "Evaluasi K3, laporan, dan kelola anggota", icon: "chart" },
  };
  function workerApp() {
    return new URLSearchParams(window.location?.search || "").get("app") === "worker" || !!window.ntPWA?.state?.().standalone;
  }
  function apps(session) {
    if (!session) return ["w", "s", "m"];
    var role = Object.hasOwn(roles,session.role) ? roles[session.role] : null;
    if (!role || (session.package === "free" && role.area !== "w")) return [];
    return [role.area];
  }
  function login(role) { return Object.hasOwn(roles,role) ? "/login/" + role : "/login"; }
  function staffPath(path) {
    return window.ntSession?.get?.()?.role === "management" ? path.replace(/^\/s(?=\/|$)/, "/m") : path;
  }
  var prefixes = {pekerja:"P",supervisor:"S",management:"M"};
  function normalizeCode(value) { return typeof value === "string" ? value.trim().toUpperCase().replace(/[\s-]/g, "") : ""; }
  function codeRole(value) {
    var code = normalizeCode(value);
    if (!/^[PSM][ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code)) return null;
    return {P:"pekerja",S:"supervisor",M:"management"}[code[0]];
  }
  // A reproducible member identifier, not a password, invitation, or second factor.
  // No public identity lookup or additional database fields are needed.
  async function memberCode(companyCode, memberId, role) {
    if (!Object.hasOwn(prefixes,role) || typeof companyCode !== "string" || !companyCode.trim() || typeof memberId !== "string" || !memberId.trim())
      throw new Error("Keanggotaan belum tersedia untuk membuat kode.");
    var identity = ["nt-member-route-v1",companyCode.trim().toUpperCase(),memberId.trim().toLowerCase(),role].join("\n");
    var digest = new Uint8Array(await window.crypto.subtle.digest("SHA-256",new TextEncoder().encode(identity)));
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", part = Array.from(digest.slice(0,8),function (b) {return alphabet[b % 32];}).join("");
    return prefixes[role]+"-"+part.slice(0,4)+"-"+part.slice(4);
  }
  async function matchesCode(value, companyCode, memberId, role) {
    return codeRole(value) === role && normalizeCode(value) === normalizeCode(await memberCode(companyCode,memberId,role));
  }
  window.ntPortal = { roles: roles, workerApp: workerApp, apps: apps, login: login, staffPath: staffPath,
    memberCode:memberCode,codeRole:codeRole,normalizeCode:normalizeCode,matchesCode:matchesCode,
    matches: function (session, role) { return !!session && (!role || session.role === role) && Object.hasOwn(roles,session.role); } };
})();
