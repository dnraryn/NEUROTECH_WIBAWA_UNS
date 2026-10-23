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
    var role = roles[session.role];
    if (!role || (session.package === "free" && role.area !== "w")) return [];
    return [role.area];
  }
  function login(role) { return roles[role] ? "/login/" + role : "/login"; }
  function staffPath(path) {
    return window.ntSession?.get?.()?.role === "management" ? path.replace(/^\/s(?=\/|$)/, "/m") : path;
  }
  window.ntPortal = { roles: roles, workerApp: workerApp, apps: apps, login: login, staffPath: staffPath,
    matches: function (session, role) { return !!session && (!role || session.role === role) && !!roles[session.role]; } };
})();
