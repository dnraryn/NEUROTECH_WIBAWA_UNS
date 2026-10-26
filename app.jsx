// NeuroTech root — hash router dispatches to per-persona screens inside their
// native frame (mobile 360×780 or desktop 1280×800).
//
// Firebase Auth + server-managed memberships determine the current session.
// Demo renders local sample data; it grants no Firebase access.

const ROUTES = {
  // Worker mobile (app prefix: w)
  "w/readiness": { c: () => window.ntSession?.get() ? <RealWorkerHome /> : <WorkerReadiness />, frame: "mobile", label: "Readiness" },
  "w/live":      { c: () => <WorkerLive />,      frame: "mobile", label: "Live" },
  "w/wellness":  { c: () => window.ntSession?.get() ? <RealWorkerHome /> : <WorkerWellness />,  frame: "mobile", label: "Kondisi" },
  "w/audio":     { c: () => <WorkerAudio />,     frame: "mobile", label: "Neurofeedback" },
  "w/stats":     { c: () => window.ntSession?.get() ? <RealWorkerHistory /> : <WorkerStats />, frame: "mobile", label: "Statistik" },
  "w/profile":   { c: () => <WorkerProfile />,   frame: "mobile", label: "Profil" },

  // Supervisor K3 desktop (app prefix: s)
  "s/overview":  { c: () => window.ntSession?.get() ? <RealSupervisorDashboard /> : <SupervisorDashboard />,  frame: "desktop", label: "Overview Tim" },
  "s/workers":   { c: () => <SupervisorWorkersList />, frame: "desktop", label: "Pekerja" },
  "s/alerts":    { c: () => window.ntSession?.get() ? <RealSupervisorAlerts /> : <SupervisorAlertsList />,  frame: "desktop", label: "Alert" },
  "s/schedule":  { c: () => window.ntSession?.get() ? <RealSupervisorSchedule /> : <SupervisorSchedule />, frame: "desktop", label: "Jadwal" },
  "s/reports":   { c: () => <SupervisorReports />,     frame: "desktop", label: "Laporan" },

  // Management SMK3 desktop (app prefix: m)
  "m/overview":  { c: () => <ManagementDashboard />, frame: "desktop", label: "Analitik" },

  // Public, no auth required
  "landing":     { c: () => <LandingPage />, frame: "landing", label: "Beranda" },
  "pricing":     { c: () => <PlanPricing />, frame: "landing", label: "Plan & Pricing" },
  "join":        { c: () => <JoinFlow />, frame: "landing", label: "Bergabung" },
  "login":       { c: () => <MemberLogin />, frame: "auth", label: "Masuk" },
  "app":         { c: () => <WorkerAppInstall />, frame: "auth", label: "Aplikasi pekerja" },
};

const PERSONAS = [
  { id: "w", label: "Pekerja · Mobile",  home: "/w/readiness", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg> },
  { id: "s", label: "Supervisor K3",     home: "/s/overview",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></svg> },
  { id: "m", label: "Manajemen SMK3",    home: "/m/overview",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v4H3zM3 11h18v4H3zM3 19h18v2H3z"/></svg> },
];

// Role → home route, label, and which persona prefixes the role may open.
// Each authenticated role has its own workspace. Demo alone can switch personas.
const ROLE_HOME  = { pekerja: "/w/readiness", supervisor: "/s/overview", management: "/m/overview" };
const ROLE_LABEL = { pekerja: "Pekerja", supervisor: "Supervisor", management: "Manajemen" };
// Areas a member may open = their role's areas ∩ their package's areas.
const allowedApps = (session) => window.ntPortal.apps(session);
const homeFor = (session) => {
  if (!session) return "/w/readiness";
  const allow = allowedApps(session);
  const roleHome = ROLE_HOME[session.role] || "/w/readiness";
  return allow.includes(roleHome.split("/")[1]) ? roleHome : "/login";
};

// Resolve a route — supports dynamic 3-segment routes and content pages.
const resolveRoute = (route) => {
  if(route.app==="join" && route.page==="recover")return {c:JoinFlow,props:{recover:true},frame:"landing",label:"Pemulihan kode pemilik"};
  if (route.app === "login" && window.ntPortal.roles[route.page] && !route.id)
    return { c: MemberLogin, props: { portalRole: route.page }, frame: "auth", label: "Masuk " + window.ntPortal.roles[route.page].label };
  if (route.app === "m" && route.page !== "overview" && window.ntSession?.get()?.role === "management")
    return resolveRoute({ ...route, app: "s" });
  const direct = ROUTES[`${route.app}/${route.page}`];
  if (direct && !route.id) return direct;
  if (route.app === "invite") {
    return { c: MemberLogin, props: { inviteCode: route.page || "", inviteToken: route.id || "" }, frame: "auth", label: "Undangan pekerja" };
  }
  // Content/marketing pages — /p/<slug>
  if (route.app === "p" && route.page) {
    return { c: ContentPage, props: { slug: route.page }, frame: "landing", label: "Halaman" };
  }
  // Dynamic detail routes
  if (route.app === "s" && route.page === "workers" && route.id) {
    return { c: typeof window !== "undefined" && window.ntSession?.get() ? RealSupervisorWorkerDetail : SupervisorWorkerDetail, props: { id: route.id }, frame: "desktop", label: "Detail Pekerja" };
  }
  if (route.app === "s" && route.page === "alerts" && route.id) {
    return { c: typeof window !== "undefined" && window.ntSession?.get() ? RealSupervisorAlertDetail : SupervisorAlertDetail, props: { id: route.id }, frame: "desktop", label: "Detail Alert" };
  }
  if (route.app === "s" && route.page === "reports" && route.id) {
    return { c: SupervisorReportDetail, props: { id: route.id }, frame: "desktop", label: "Detail Laporan" };
  }
  // Plain top-level (e.g. /login)
  if (route.app && !route.page) {
    const top = ROUTES[route.app];
    if (top) return top;
  }
  return null;
};

// Full-screen status message (redirect).
const Splash = ({ text }) => (
  <div className="app-shell nt-opening" role="status">
    <div className="nt-opening-content">
      <img src="assets/worker-app-192.png" width="76" height="76" alt="" />
      <strong>neurotech</strong>
      <span>{text}</span>
    </div>
  </div>
);

// Error boundary — one failing screen must never blank the whole app. The
// chrome (topbar, persona tabs, back button) stays usable so navigation works.
class ScreenBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error("[NeuroTech] layar gagal dirender:", err); }
  componentDidUpdate(prev) {
    if (prev.routeKey !== this.props.routeKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) {
      return (
        <div style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--nt-text)" }}>Layar ini gagal dimuat</div>
          <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 8, lineHeight: 1.5 }}>
            Muat ulang halaman dengan Ctrl+Shift+R, atau buka layar lain lewat menu.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Back button — kembali ke halaman sebelumnya; nonaktif saat di landing page.
const BackButton = ({ disabled, floating }) => (
  <button
    onClick={() => { if (!disabled) window.history.back(); }}
    disabled={disabled}
    aria-label="Kembali"
    title={disabled ? "Sudah di halaman utama" : "Kembali ke halaman sebelumnya"}
    style={{
      width: 40, height: 40, borderRadius: 12, border: "none", padding: 0,
      background: "var(--nt-surface)",
      boxShadow: disabled ? "var(--nt-shadow-in)" : "var(--nt-shadow-out-sm)",
      color: disabled ? "var(--nt-text-3)" : "var(--nt-text-2)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      ...(floating ? { position: "fixed", top: 16, left: 16, zIndex: 90 } : {}),
    }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
  </button>
);

// ── Light/Dark theme toggle ──────────────────────────────────────────────
// Persists the choice in localStorage and toggles a body class.
// ── Device connect button — real Muse via Web Bluetooth, or demo mode ────
// "Hubungkan Muse" opens the pairing dialog on a supported browser.
// The options button explicitly offers demo mode, which skips BLE
// entirely. Once paired, battery % from telemetry is shown live.
const DeviceButton = ({ embedded = false }) => {
  const allowDemo = !window.ntSession?.get();
  const init = (window.ntDeviceStatus && window.ntDeviceStatus()) || {};
  const [connected, setConnected] = React.useState(!!init.connected);
  const [real,      setReal]      = React.useState(!!init.real);
  const [battery,   setBattery]   = React.useState(init.battery ?? null);
  const [name,      setName]      = React.useState(init.name || null);
  const [busy,      setBusy]      = React.useState(false);
  const [menuOpen,  setMenuOpen]  = React.useState(false);
  const [phase, setPhase] = React.useState("chooser");
  const [slow, setSlow] = React.useState(false);
  const pairing = React.useRef(0);
  React.useEffect(() => {
    const onPhase = (event) => setPhase(event.detail.phase);
    window.addEventListener("nt-muse-phase", onPhase);
    return () => window.removeEventListener("nt-muse-phase", onPhase);
  }, []);
  React.useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(timer);
  }, [busy]);

  React.useEffect(() => {
    const onDev = (e) => {
      const d = (e && e.detail) || {};
      setConnected(!!d.connected);
      setReal(!!d.real);
      if (d.name) setName(d.name);
      if (typeof d.battery === "number") setBattery(d.battery);
      if (!d.connected) { setBattery(null); setName(null); }
      if (d.reason === "gatt") window.toast?.("Koneksi Muse terputus. Hubungkan kembali untuk melanjutkan.", { kind: "warn" });
    };
    const onTel = (e) => { if (e && e.detail && typeof e.detail.battery === "number") setBattery(e.detail.battery); };
    window.addEventListener("nt-device", onDev);
    window.addEventListener("nt-muse-telemetry", onTel);
    return () => {
      window.removeEventListener("nt-device", onDev);
      window.removeEventListener("nt-muse-telemetry", onTel);
    };
  }, []);

  const pair = async (mode) => {
    if (mode === "demo" && !allowDemo) return;
    setMenuOpen(false);
    if (busy) return;
    if (connected && !mode) {
      await window.ntDeviceDisconnect();
      window.toast && window.toast("Muse terputus.", { kind: "info" });
      return;
    }
    const ticket = ++pairing.current;
    setPhase("chooser"); setSlow(false);
    setBusy(true);
    window.toast && window.toast(
      mode === "demo" ? "Memuat data demo…" : "Membuka dialog pairing Muse…",
      { kind: "info" });
    try {
      const info = await window.ntDeviceConnect(mode);
      if (ticket !== pairing.current) return;
      window.toast && window.toast(
        info && info.real
          ? "Muse tersambung · " + (info.name || "Muse S")
          : "Mode demo aktif — data simulasi.",
        { kind: "success" });
      if (embedded && info?.real) navigate("/w/live");
    } catch (e) {
      if (ticket !== pairing.current) return;
      const msg = (e && e.message) || "Pairing dibatalkan";
      window.toast && window.toast(msg, { kind: "warn" });
    } finally {
      if (ticket === pairing.current) setBusy(false);
    }
  };

  const supportsBle = !!(window.ntMuse && window.ntMuse.supported());
  const dotColor = connected ? "rgba(255,255,255,0.95)" : busy ? "#ffc56a" : "#ff7a7a";
  const label = busy
    ? "Menghubungkan…"
    : connected
      ? (real ? "Muse" + (typeof battery === "number" ? " · " + Math.round(battery) + "%" : "") : "Mode Demo")
      : "Hubungkan Muse";

  return (
    <div className={"nt-device-control" + (embedded ? " nt-device-control--embedded" : "")} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => {
          if (connected && real) return embedded ? navigate("/w/live") : pair();
          if (connected && !supportsBle) return pair();
          if (supportsBle) pair("real"); else setMenuOpen((o) => !o);
        }}
        onContextMenu={(e) => { e.preventDefault(); if (!busy && (allowDemo || !supportsBle)) setMenuOpen((o) => !o); }}
        disabled={busy}
        title={supportsBle ? embedded ? "Hubungkan Muse yang sudah menyala dan mulai pemantauan" : "Hubungkan atau putuskan Muse" : "Buka petunjuk browser Bluetooth"}
        style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "8px 14px", borderRadius: 999, border: "none",
          cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
          background: connected ? "linear-gradient(135deg,#7dd1a1,#a8e0c0)" : "var(--nt-surface)",
          boxShadow: connected ? "0 6px 14px rgba(125,209,161,0.32)" : "var(--nt-shadow-out-sm)",
          color: connected ? "white" : "var(--nt-text-2)",
          fontSize: 12, fontWeight: 700,
        }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: dotColor,
          boxShadow: connected ? "0 0 8px rgba(255,255,255,0.6)" : "0 0 6px " + dotColor,
          animation: busy ? "ntPulseDot 1s ease-in-out infinite" : "none",
        }} />
        {!supportsBle && !connected ? "Panduan koneksi Muse" : embedded && connected && real ? "Buka Live" : label}
      </button>

      {busy && <div className="nt-pairing-status" role="status">
        <strong>{({ chooser: "Menunggu pilihan perangkat", gatt: "Menghubungkan Bluetooth", services: "Membaca layanan Muse", notifications: "Mengaktifkan sensor", streaming: "Memulai aliran EEG", ready: "Muse tersambung" })[phase] || "Menyiapkan koneksi"}</strong>
        <button type="button" onClick={() => {
          pairing.current++; setBusy(false); setSlow(false);
          Promise.resolve(window.ntDeviceDisconnect()).catch(() => {});
        }}>Batalkan koneksi</button>
        {slow && <p>{phase === "chooser" ? "Dialog perangkat belum muncul? Batalkan, buka website ini langsung di Chrome Android, lalu tekan Hubungkan Muse lagi." : "Koneksi tertahan? Batalkan, tutup aplikasi Muse lain, lalu nyalakan ulang headband dan coba kembali."}
          {" "}Pastikan Bluetooth aktif dan izinkan Perangkat di sekitar untuk browser jika tersedia di pengaturan HP.</p>}
      </div>}

      {/* Demo options belong only to the public demo experience. */}
      {allowDemo && !busy && (
        <button
          type="button"
          className="nt-device-options-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Opsi koneksi"
          aria-expanded={menuOpen}
          style={{
            marginLeft: 4, padding: "8px 8px", borderRadius: 999, border: "none",
            background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-out-sm)",
            cursor: "pointer", color: "var(--nt-text-2)", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}

      {menuOpen && (
        <div className="nt-device-menu" style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--nt-surface)",
          border: "var(--nt-hairline)",
          borderRadius: 12,
          boxShadow: "var(--nt-shadow-out-lg)",
          padding: 4, zIndex: 50, minWidth: 200,
        }}>
          {!supportsBle && <p className="nt-device-help">{!window.isSecureContext ? "Buka website melalui HTTPS atau localhost untuk mengakses Bluetooth." : "Gunakan Chrome di Android untuk menghubungkan Muse. Chrome di iPhone/iPad belum mendukung Bluetooth website."}</p>}
          {[
            { k: "real", l: "Hubungkan Muse (BLE)", d: supportsBle ? "Buka dialog pairing OS" : "Tidak didukung browser ini", disabled: !supportsBle },
            { k: "demo", l: "Mode Demo",            d: "Pakai data simulasi" },
          ].filter((it) => allowDemo || it.k !== "demo").map((it) => (
            <button key={it.k} type="button" disabled={it.disabled}
              onClick={(e) => { e.stopPropagation(); pair(it.k); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", borderRadius: 8, border: "none",
                background: "transparent", cursor: it.disabled ? "not-allowed" : "pointer",
                color: it.disabled ? "var(--nt-text-3)" : "var(--nt-text)",
                fontFamily: "inherit", fontSize: 12, fontWeight: 700,
              }}>
              {it.l}
              <div style={{ fontSize: 10.5, fontWeight: 500, color: "var(--nt-text-3)", marginTop: 2 }}>{it.d}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const route = useHashRoute();
  const legacyAppEntry = React.useRef(window.ntPortal.workerApp() && route.app === "w" && route.page === "readiness");
  const [, bump] = React.useReducer((n) => n + 1, 0);
  const [opening, setOpening] = React.useState(() => !!window.ntPWA?.state?.().installed);
  React.useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => setOpening(false), 1200);
    return () => clearTimeout(timer);
  }, [opening]);

  // Firebase session is in memory and refreshed from protected documents.
  const session = window.ntSession ? window.ntSession.get() : null;
  const demo = !session && typeof sessionStorage !== "undefined" && sessionStorage.getItem("nt-demo") === "1";
  const authLoading = !!window.ntAuth?.loading;
  const authed = !!session || demo;
  const homeOf = homeFor(session);
  const workerApp = window.ntPortal.workerApp();
  const workerPublic = !route.app || ["landing","pricing","p","join","invite","app"].includes(route.app);
  const wrongWorkerAccount = workerApp && session && session.role !== "pekerja" && !workerPublic;
  const linkedAccount=route.app==="login" ? window.ntPortal.linkAccount() : null;
  const wrongLinkedAccount=session && linkedAccount && linkedAccount.loginCode!==session.loginCode;
  React.useEffect(() => { if (!authed) window.ntLiveStop?.(); }, [authed]);

  // React to login, role changes and membership revocation, including idle pages.
  React.useEffect(() => {
    const onAuth = () => { window.ntStartWorkerSync?.(); bump(); };
    onAuth();
    window.addEventListener("nt-auth", onAuth);
    const onPwa = () => bump();
    window.addEventListener("nt-pwa", onPwa);
    return () => {window.removeEventListener("nt-auth", onAuth);window.removeEventListener("nt-pwa",onPwa);};
  }, []);

  // Re-render when the live engine / Firestore pushes fresh worker data.
  // Gated on the current route — re-rendering the whole tree every 1.5 s on
  // landing/auth/about would cause visible jank for zero benefit (no consumer
  // of fi/cli there). The engine itself keeps running so the ring-buffer is
  // already warm when the user navigates into the app.
  const _routeRef = React.useRef(route);
  _routeRef.current = route;
  React.useEffect(() => {
    const onData = () => {
      const r = _routeRef.current;
      if (r && (r.app === "w" || (r.app === "s" && !window.ntSession?.get()))) bump();
    };
    window.addEventListener("nt-data", onData);
    return () => window.removeEventListener("nt-data", onData);
  }, []);

  // On route change: reset the inner stage scroll so each screen starts at
  // its own top. We deliberately DO NOT call window.scrollTo or animate the
  // .nt-screen — page-level slides looked like a refresh. The smooth
  // movement is handled by the sidebar's active-indicator instead.
  React.useLayoutEffect(() => {
    const stage = document.querySelector(".app-stage");
    if (stage) stage.scrollTop = 0;
    document.querySelector(".app-frame .nt-screen")?.scrollTo(0, 0);
  }, [route.path]);

  // Sync body class with the sidebar collapsed flag so CSS can shrink the
  // grid template (228px → 64px) for every screen at once.
  React.useEffect(() => {
    const apply = () => {
      try {
        const c = localStorage.getItem("nt-sidebar-collapsed") === "1";
        document.body.classList.toggle("nt-sidebar-collapsed", c);
      } catch (e) { /* ignore */ }
    };
    apply();
    window.addEventListener("nt-sidebar-toggle", apply);
    return () => window.removeEventListener("nt-sidebar-toggle", apply);
  }, []);

  // Routing guard.
  React.useEffect(() => {
    if (authLoading) return;
    if(legacyAppEntry.current){legacyAppEntry.current=false;navigate("/landing");return;}
    if (!route.app) {navigate("/landing");return;}
    if (wrongWorkerAccount || wrongLinkedAccount || (session && !allowedApps(session).length)) return;
    if (workerApp && !workerPublic && route.app !== "w" && !(route.app === "login" && route.page === "pekerja")) {
      navigate(session || demo ? "/w/readiness" : "/login/pekerja"+(route.query ? "?"+route.query : "")); return;
    }
    const publicPage = ["landing", "pricing", "login", "join", "invite", "app"].includes(route.app);
    const contentPage = route.app === "p";
    if (!authed && !publicPage && !contentPage) {
      navigate(window.ntPortal.login(({w:"pekerja",s:"supervisor",m:"management"})[route.app] || (workerApp?"pekerja":null))); return;
    }
    // A logged-in member never sits on the login/join screens.
    if (session && route.app === "login") {
      navigate(homeOf); return;
    }
    if (authed && !route.app) { navigate(session ? homeOf : "/w/readiness"); return; }
    // Role lock — a member may only open their own persona's screens.
    if (session && !demo && ["w", "s", "m"].includes(route.app)) {
      const allowed = allowedApps(session);
      if (!allowed.includes(route.app)) navigate(homeOf);
    }
  }, [route.path, route.query, authLoading, session?.uid, session?.role, session?.package, demo, workerApp]);

  // Theme is scoped to the in-app pages (w/s/m). Landing, About, Pricing,
  // Login, Join, and content pages always render in their brand-dark theme.
  React.useEffect(() => {
    const apply = () => {
      const isInApp = ["w", "s", "m"].includes(route.app) && !wrongWorkerAccount && !(session && !allowedApps(session).length);
      let wantLight = false;
      try {
        const saved = localStorage.getItem("nt-theme");
        if (saved === "light") wantLight = true;
        else if (!saved && window.matchMedia)
          wantLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      } catch (e) { /* ignore */ }
      document.body.classList.toggle("nt-light", isInApp && wantLight);
    };
    apply();
    window.addEventListener("nt-theme", apply);
    return () => window.removeEventListener("nt-theme", apply);
  }, [route.path, wrongWorkerAccount, session?.role, session?.package]);

  const onLogout = async () => {
    await window.ntLogout();
    window.toast?.("Anda telah keluar.", { kind: "info" });
    navigate(window.ntPortal.login(workerApp ? "pekerja" : session?.role));
  };

  const resolved = resolveRoute(route) || ROUTES["landing"];
  const chromeless = resolved.frame === "auth" || resolved.frame === "landing";
  if (opening) return <Splash text="Memulai aplikasi…" />;
  if(legacyAppEntry.current) return <Splash text="Membuka beranda…"/>;
  if (!authLoading && (wrongWorkerAccount || wrongLinkedAccount || (session && !allowedApps(session).length)))
    return <><PortalSessionGate session={session} workerOnly={workerApp} linkedAccount={wrongLinkedAccount}/><ToastProvider/></>;
  if (!authLoading && workerApp && !workerPublic && route.app !== "w" && !(route.app === "login" && route.page === "pekerja")) return <Splash text="Membuka aplikasi pekerja…"/>;
  if (authLoading && !demo && !chromeless) return <Splash text="Memeriksa sesi…" />;

  // Block rendering another persona's screen for a locked-in member.
  if (session && !demo && ["w", "s", "m"].includes(route.app)) {
    if (!allowedApps(session).includes(route.app)) return <Splash text="Mengalihkan ke area Anda…" />;
  }
  if (!authed && !chromeless && route.app !== "p") return <Splash text="Mengalihkan…" />;

  const ScreenComponent = resolved.c;
  const activePersona = PERSONAS.find((p) => p.id === route.app);
  // Members see only the persona tabs their role allows; demo sees all.
  const roleApps = session && !demo ? allowedApps(session) : null;
  const visiblePersonas = roleApps ? PERSONAS.filter((p) => roleApps.includes(p.id)) : PERSONAS;

  return (
    <div className={"app-shell" + (!chromeless ? " app-shell--workspace" : "") + (resolved.frame === "mobile" ? " app-shell--worker" : "")}>
      {!chromeless && (
        <>
          <header className="app-topbar">
            <div className="app-topbar-brand" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BackButton disabled={false} />
              <Link to={homeOf} style={{ display: "flex" }}>
                <div className="app-brand">
                  <img src="assets/logo-topleft.png" alt="NeuroTech" width="40" height="40" style={{ borderRadius: 10, objectFit: "contain" }} />
                  <div className="app-brand-name">
                    <strong>neurotech</strong>
                    <span>better mind, better life</span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="app-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {!session && <DeviceButton />}
              {session && route.app !== "w" && <span className="portal-workspace-label">{ROLE_LABEL[session.role]}</span>}
              {session && route.app !== "w" && <details className="portal-own-code"><summary>Kode saya</summary><div className="portal-account-popover"><MemberAccessCode companyCode={session.code} memberId={session.memberId} role={session.role}/><AccountPasswordForm/></div></details>}
              {session ? (
                <div className="app-account" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="app-account-label" style={{ fontSize: 12, color: "var(--nt-text-2)" }}>
                    {session.memberName} · {ROLE_LABEL[session.role] || session.role} · {session.companyName}
                  </span>
                  <NeuroBtn tone="default" size="sm" onClick={onLogout}>Keluar</NeuroBtn>
                </div>
              ) : demo ? (
                <div className="app-account" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="app-account-label" style={{ fontSize: 12, color: "var(--nt-text-3)" }}>Mode demo</span>
                  <NeuroBtn tone="default" size="sm" onClick={onLogout}>Keluar demo</NeuroBtn>
                </div>
              ) : (
                <Link to="/login">
                  <NeuroBtn tone="default" size="sm">Masuk</NeuroBtn>
                </Link>
              )}
            </div>
          </header>

          {!session && !workerApp && <nav className="app-tabs" role="tablist" aria-label="Pilih persona demo">
            {visiblePersonas.map((p) => {
              const on = activePersona?.id === p.id;
              return (
                <Link key={p.id} to={p.home}>
                  <button
                    role="tab"
                    aria-selected={on}
                    className={"app-tab-pill" + (on ? " is-active" : "")}>
                    <span className="app-tab-pill-icon">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>}
        </>
      )}

      {chromeless && <BackButton floating disabled={route.app === "landing"} />}

      <main className="app-stage" style={chromeless ? { padding: 0 } : undefined}>
        <div className={"app-frame app-frame--" + resolved.frame}>
          {!chromeless && (
            <span className="app-frame-caption">
              {resolved.frame === "mobile" ? "360 × 780" : "1280 × 800"} · {resolved.label}
              {route.id ? ` · ${route.id}` : ""}
            </span>
          )}
          <ScreenBoundary routeKey={route.path}>
            <ScreenComponent key={route.path} {...resolved.props} />
            {session?.role === "pekerja" && resolved.frame === "mobile" && route.page !== "readiness" && <WorkerAlertNotice />}
          </ScreenBoundary>
        </div>
      </main>

      {/* ThemeToggle sekarang dirender INSIDE app-frame:
          - Sidebar supervisor & manajemen (bottom)
          - Menu overlay pekerja mobile (hamburger)
          Tidak ada floating fixed toggle di luar frame. */}

      <ToastProvider />
      <AskAI route={route.app} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
