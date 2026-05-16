// NeuroTech root — hash router dispatches to per-persona screens inside their
// native frame (mobile 360×780 or desktop 1280×800).
//
// Auth model: a member "session" (company code + member name + role) is kept
// in sessionStorage. Visitors join via /join or log in via /login. A no-auth
// "demo" bypass is kept for quick walkthroughs.

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
  "pricing":     { c: () => <PlanPricing />, frame: "landing", label: "Plan & Pricing" },
  "join":        { c: () => <JoinFlow />, frame: "landing", label: "Bergabung" },
  "login":       { c: () => <MemberLogin />, frame: "auth", label: "Masuk" },
};

const PERSONAS = [
  { id: "w", label: "Pekerja · Mobile",  home: "/w/readiness", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg> },
  { id: "s", label: "Supervisor K3",     home: "/s/overview",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></svg> },
  { id: "m", label: "Manajemen SMK3",    home: "/m/overview",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v4H3zM3 11h18v4H3zM3 19h18v2H3z"/></svg> },
];

// Role → home route, label, and which persona prefixes the role may open.
// Management may open both the supervisor and the management views.
const ROLE_HOME  = { pekerja: "/w/readiness", supervisor: "/s/overview", management: "/m/overview" };
const ROLE_LABEL = { pekerja: "Pekerja", supervisor: "Supervisor", management: "Manajemen" };
const ROLE_APPS  = { pekerja: ["w"], supervisor: ["s"], management: ["s", "m"] };

// Resolve a route — supports dynamic 3-segment routes and content pages.
const resolveRoute = (route) => {
  const direct = ROUTES[`${route.app}/${route.page}`];
  if (direct && !route.id) return direct;
  // Content/marketing pages — /p/<slug>
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

// Full-screen status message (redirect).
const Splash = ({ text }) => (
  <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
    <div style={{ color: "var(--nt-text-2)", fontSize: 14, fontWeight: 600 }}>{text}</div>
  </div>
);

const App = () => {
  const route = useHashRoute();
  const [, bump] = React.useReducer((n) => n + 1, 0);

  // Read fresh each render — sessionStorage is not reactive.
  const session = window.ntSession ? window.ntSession.get() : null;
  const demo = typeof sessionStorage !== "undefined" && sessionStorage.getItem("nt-demo") === "1";
  const authed = !!session || demo;
  const homeOf = (session && ROLE_HOME[session.role]) || "/w/readiness";

  // Start the live worker-data sync once anonymous auth is ready.
  React.useEffect(() => {
    const fb = window.NT_FIREBASE;
    if (!fb || !fb.auth) { window.ntStartWorkerSync?.(); return; }
    return fb.auth.onAuthStateChanged((u) => { if (u) window.ntStartWorkerSync?.(); });
  }, []);

  // Re-render when Firestore pushes fresh worker data.
  React.useEffect(() => {
    const onData = () => bump();
    window.addEventListener("nt-data", onData);
    return () => window.removeEventListener("nt-data", onData);
  }, []);

  // Jump to the top of the page on every route change.
  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const stage = document.querySelector(".app-stage");
    if (stage) stage.scrollTop = 0;
  }, [route.path]);

  // Routing guard.
  React.useEffect(() => {
    const publicPage = ["landing", "pricing", "login", "join"].includes(route.app);
    const contentPage = route.app === "p";
    if (!authed && !publicPage && !contentPage) { navigate("/landing"); return; }
    // A logged-in member never sits on the login/join screens.
    if (session && (route.app === "login" || route.app === "join")) {
      navigate(homeOf); return;
    }
    if (authed && !route.app) { navigate(session ? homeOf : "/w/readiness"); return; }
    // Role lock — a member may only open their own persona's screens.
    if (session && !demo && ["w", "s", "m"].includes(route.app)) {
      const allowed = ROLE_APPS[session.role] || [];
      if (!allowed.includes(route.app)) navigate(homeOf);
    }
  }, [route.path]);

  const onLogout = () => {
    window.ntSession?.clear();
    sessionStorage.removeItem("nt-demo");
    window.toast?.("Anda telah keluar.", { kind: "info" });
    navigate("/login");
  };

  const resolved = resolveRoute(route) || ROUTES["landing"];
  const chromeless = resolved.frame === "auth" || resolved.frame === "landing";

  // Block rendering another persona's screen for a locked-in member.
  if (session && !demo && ["w", "s", "m"].includes(route.app)) {
    const allowed = ROLE_APPS[session.role] || [];
    if (!allowed.includes(route.app)) return <Splash text="Mengalihkan ke area Anda…" />;
  }
  if (!authed && !chromeless && route.app !== "p") return <Splash text="Mengalihkan…" />;

  const ScreenComponent = resolved.c;
  const activePersona = PERSONAS.find((p) => p.id === route.app);
  // Members see only the persona tabs their role allows; demo sees all.
  const roleApps = session && !demo ? (ROLE_APPS[session.role] || []) : null;
  const visiblePersonas = roleApps ? PERSONAS.filter((p) => roleApps.includes(p.id)) : PERSONAS;

  return (
    <div className="app-shell">
      {!chromeless && (
        <>
          <header className="app-topbar">
            <Link to={homeOf} style={{ display: "flex" }}>
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
              {session ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--nt-text-2)" }}>
                    {session.memberName} · {ROLE_LABEL[session.role] || session.role} · {session.companyName}
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
