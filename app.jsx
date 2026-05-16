// NeuroTech root, hash router dispatches to per-persona screens inside their
// native frame (mobile 360×780 or desktop 1280×800). Persona switcher in the
// header is a glorified shortcut to the persona's home route.
//
// Auth: App tracks the Firebase session. Unauthenticated visitors are sent to
// /login; a no-auth "demo" bypass (sessionStorage) is kept for walkthroughs.

const ROUTES = {
  // Worker mobile (app prefix: w)
  "w/readiness": { c: () => <WorkerReadiness />, frame: "mobile", label: "Readiness" },
  "w/live":      { c: () => <WorkerLive />,      frame: "mobile", label: "Live" },
  "w/sleep":     { c: () => <WorkerSleep />,     frame: "mobile", label: "Sleep" },
  "w/stats":     { c: () => <WorkerStats />,     frame: "mobile", label: "Statistik" },
  "w/profile":   { c: () => <WorkerProfile />,   frame: "mobile", label: "Profil" },

  // Supervisor K3 desktop (app prefix: s)
  "s/overview":  { c: () => <SupervisorDashboard />,  frame: "desktop", label: "Overview Tim" },
  "s/workers":   { c: () => <SupervisorWorkersList />, frame: "desktop", label: "Pekerja" },
  "s/alerts":    { c: () => <SupervisorAlertsList />,  frame: "desktop", label: "Alert" },
  "s/schedule":  { c: () => <SupervisorSchedule />,    frame: "desktop", label: "Jadwal" },
  "s/reports":   { c: () => <SupervisorReports />,     frame: "desktop", label: "Laporan" },

  // Management SMK3 desktop (app prefix: m)
  "m/overview":  { c: () => <ManagementDashboard />, frame: "desktop", label: "Analitik" },

  // Public, no auth required
  "landing":     { c: () => <LandingPage />, frame: "landing", label: "Beranda" },
  "login":       { c: () => <AuthLogin />, frame: "auth", label: "Masuk" },
};

const PERSONAS = [
  { id: "w", label: "Pekerja · Mobile",  home: "/w/readiness", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg> },
  { id: "s", label: "Supervisor K3",     home: "/s/overview",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></svg> },
  { id: "m", label: "Manajemen SMK3",    home: "/m/overview",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v4H3zM3 11h18v4H3zM3 19h18v2H3z"/></svg> },
];

// Where each role lands after signing in, and how its role reads in the UI.
const ROLE_HOME  = { worker: "/w/readiness", supervisor: "/s/overview", manager: "/m/overview" };
const ROLE_LABEL = { worker: "Pekerja", supervisor: "Supervisor K3", manager: "Manajemen SMK3" };
// Which route prefix (persona) each role is allowed to enter.
const ROLE_APP   = { worker: "w", supervisor: "s", manager: "m" };

// Resolve a route, supports dynamic 3-segment routes (s/workers/:id, s/alerts/:id).
// Always returns objects with the same shape as ROUTES entries (c, frame, label).
const resolveRoute = (route) => {
  const direct = ROUTES[`${route.app}/${route.page}`];
  if (direct && !route.id) return direct;
  // Content/marketing pages, /p/<slug>
  if (route.app === "p" && route.page) {
    return { c: () => <ContentPage slug={route.page} />, frame: "landing", label: "Halaman" };
  }
  // Dynamic detail routes
  if (route.app === "s" && route.page === "workers" && route.id) {
    return { c: () => <SupervisorWorkerDetail id={route.id} />, frame: "desktop", label: "Detail Pekerja" };
  }
  if (route.app === "s" && route.page === "alerts" && route.id) {
    return { c: () => <SupervisorAlertDetail id={route.id} />, frame: "desktop", label: "Detail Alert" };
  }
  if (route.app === "s" && route.page === "reports" && route.id) {
    return { c: () => <SupervisorReportDetail id={route.id} />, frame: "desktop", label: "Detail Laporan" };
  }
  // Plain top-level (e.g. /login)
  if (route.app && !route.page) {
    const top = ROUTES[route.app];
    if (top) return top;
  }
  return null;
};

// Full-screen status message (session check / redirect).
const Splash = ({ text }) => (
  <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
    <div style={{ color: "var(--nt-text-2)", fontSize: 14, fontWeight: 600 }}>{text}</div>
  </div>
);

const App = () => {
  const route = useHashRoute();
  const [authUser, setAuthUser] = React.useState(undefined); // undefined = still checking
  const [profile, setProfile] = React.useState(null);
  const [, bump] = React.useReducer((n) => n + 1, 0);
  const demo = typeof sessionStorage !== "undefined" && sessionStorage.getItem("nt-demo") === "1";

  // Track the Firebase session: load the profile, start/stop the data sync.
  React.useEffect(() => {
    if (!window.ntAuth) { setAuthUser(null); return; }
    return window.ntAuth.onChange(async (user) => {
      if (user) {
        sessionStorage.removeItem("nt-demo");        // a real login exits demo mode
        let p = null;
        try { p = await window.ntAuth.getProfile(user.uid); }
        catch (err) { console.error("[NeuroTech] profil gagal dimuat:", err.message); }
        setProfile(p);
        window.NT_PROFILE = p;
        window.ntStartWorkerSync?.();
      } else {
        setProfile(null);
        window.NT_PROFILE = null;
        window.ntStopWorkerSync?.();
      }
      setAuthUser(user || null);
    });
  }, []);

  // Re-render when Firestore pushes fresh worker data.
  React.useEffect(() => {
    const onData = () => bump();
    window.addEventListener("nt-data", onData);
    return () => window.removeEventListener("nt-data", onData);
  }, []);

  // Jump to the top of the page on every route change (so clicking a link
  // never leaves the visitor scrolled down where they were).
  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const stage = document.querySelector(".app-stage");
    if (stage) stage.scrollTop = 0;
  }, [route.path]);

  // Default landing + auth guard, runs once the session state is known.
  React.useEffect(() => {
    if (authUser === undefined) return;            // still checking the session
    const publicPage = route.app === "login" || route.app === "landing";
    const contentPage = route.app === "p";   // /p/<slug>, open to everyone
    const authed = !!authUser || demo;
    if (!authed && !publicPage && !contentPage) { navigate("/landing"); return; }
    if (authed && publicPage) {
      if (authUser && !profile) return;            // wait until the role is known
      navigate(ROLE_HOME[profile && profile.role] || "/w/readiness");
      return;
    }
    if (authed && !route.app) {
      navigate(ROLE_HOME[profile && profile.role] || "/w/readiness");
      return;
    }
    // Role lock, a signed-in user may only enter their own persona's screens.
    // Demo mode stays unrestricted (can browse every persona).
    if (authUser && !demo && profile && ["w", "s", "m"].includes(route.app)) {
      const allowed = ROLE_APP[profile.role];
      if (allowed && route.app !== allowed) navigate(ROLE_HOME[profile.role]);
    }
  }, [authUser, profile, route.app, route.page, demo]);

  const onLogout = async () => {
    try { await window.ntAuth?.signOut(); } catch (e) { /* ignore */ }
    sessionStorage.removeItem("nt-demo");
    window.toast?.("Anda telah keluar.", { kind: "info" });
    navigate("/login");
  };

  if (authUser === undefined) return <Splash text="Memeriksa sesi…" />;

  const authed = !!authUser || demo;
  if (!authed && route.app !== "login" && route.app !== "landing" && route.app !== "p")
    return <Splash text="Memuat…" />;

  // A signed-in user is locked to one persona; demo users see all three.
  const roleApp = authUser && !demo && profile ? ROLE_APP[profile.role] : null;
  if (roleApp && ["w", "s", "m"].includes(route.app) && route.app !== roleApp) {
    return <Splash text="Mengalihkan ke area Anda…" />;
  }

  const resolved = resolveRoute(route) || ROUTES["w/readiness"];
  const ScreenComponent = resolved.c;
  const chromeless = resolved.frame === "auth" || resolved.frame === "landing";
  const activePersona = PERSONAS.find((p) => p.id === route.app);
  const homeHref = ROLE_HOME[profile && profile.role] || "/w/readiness";
  // Only show persona tabs the current user may open.
  const visiblePersonas = roleApp ? PERSONAS.filter((p) => p.id === roleApp) : PERSONAS;

  return (
    <div className="app-shell">
      {!chromeless && (
        <>
          <header className="app-topbar">
            <Link to={homeHref} style={{ display: "flex" }}>
              <div className="app-brand">
                <img src="assets/neurotech-logo.png" alt="NeuroTech" width="40" height="40" style={{ borderRadius: 10 }} />
                <div className="app-brand-name">
                  <strong>neurotech</strong>
                  <span>Technology of the Mind</span>
                </div>
              </div>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="app-meta">
                <span className="app-meta-dot" />
                <span>Monitoring Fatigue · Cognitive Load · K3</span>
              </div>
              {profile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--nt-text-2)" }}>
                    {profile.name} · {ROLE_LABEL[profile.role] || profile.role}
                  </span>
                  <NeuroBtn tone="default" size="sm" onClick={onLogout}>Keluar</NeuroBtn>
                </div>
              ) : demo ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--nt-text-3)" }}>Mode demo</span>
                  <NeuroBtn tone="default" size="sm" onClick={onLogout}>Keluar demo</NeuroBtn>
                </div>
              ) : (
                <Link to="/login">
                  <NeuroBtn tone="default" size="sm">Masuk</NeuroBtn>
                </Link>
              )}
            </div>
          </header>

          <nav className="app-tabs" role="tablist" aria-label="Pilih persona">
            {visiblePersonas.map((p) => (
              <div className="app-tab-group" key={p.id}>
                <span className="app-tab-group-label">{p.icon}&nbsp;{p.label}</span>
                <Link to={p.home}>
                  <button
                    role="tab"
                    aria-selected={activePersona?.id === p.id}
                    className={"app-tab" + (activePersona?.id === p.id ? " is-active" : "")}>
                    {p.id === "w" ? "Buka App" : p.id === "s" ? "Buka Dashboard" : "Buka Analitik"}
                  </button>
                </Link>
              </div>
            ))}
          </nav>
        </>
      )}

      <main className="app-stage" style={chromeless ? { padding: 0 } : undefined}>
        <div className={"app-frame app-frame--" + resolved.frame}>
          {!chromeless && (
            <span className="app-frame-caption">
              {resolved.frame === "mobile" ? "360 × 780" : "1280 × 800"} · {resolved.label}
              {route.id ? ` · ${route.id}` : ""}
            </span>
          )}
          <ScreenComponent />
        </div>
      </main>

      <ToastProvider />
      <AskAI />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
