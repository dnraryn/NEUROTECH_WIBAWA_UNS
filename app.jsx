// NeuroTech root — hash router dispatches to per-persona screens inside their
// native frame (mobile 360×780 or desktop 1280×800). Persona switcher in the
// header is a glorified shortcut to the persona's home route.

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

  // Auth
  "login":       { c: () => <AuthLogin />, frame: "auth", label: "Masuk" },
};

const PERSONAS = [
  { id: "w", label: "Pekerja · Mobile",  home: "/w/readiness", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg> },
  { id: "s", label: "Supervisor K3",     home: "/s/overview",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></svg> },
  { id: "m", label: "Manajemen SMK3",    home: "/m/overview",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v4H3zM3 11h18v4H3zM3 19h18v2H3z"/></svg> },
];

// Resolve a route — supports dynamic 3-segment routes (s/workers/:id, s/alerts/:id).
// Always returns objects with the same shape as ROUTES entries (c, frame, label).
const resolveRoute = (route) => {
  const direct = ROUTES[`${route.app}/${route.page}`];
  if (direct && !route.id) return direct;
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

const App = () => {
  const route = useHashRoute();

  // Default landing: redirect empty hash to worker readiness
  React.useEffect(() => {
    if (!route.app) navigate("/w/readiness");
  }, [route.app]);

  const resolved = resolveRoute(route) || ROUTES["w/readiness"];
  const ScreenComponent = resolved.c;
  const isAuth = resolved.frame === "auth";
  const activePersona = PERSONAS.find((p) => p.id === route.app);

  return (
    <div className="app-shell">
      {!isAuth && (
        <>
          <header className="app-topbar">
            <Link to="/w/readiness" style={{ display: "flex" }}>
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
              <Link to="/login">
                <NeuroBtn tone="default" size="sm">Masuk</NeuroBtn>
              </Link>
            </div>
          </header>

          <nav className="app-tabs" role="tablist" aria-label="Pilih persona">
            {PERSONAS.map((p) => (
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

      <main className="app-stage" style={isAuth ? { padding: 0 } : undefined}>
        <div className={"app-frame app-frame--" + resolved.frame}>
          {!isAuth && (
            <span className="app-frame-caption">
              {resolved.frame === "mobile" ? "360 × 780" : "1280 × 800"} · {resolved.label}
              {route.id ? ` · ${route.id}` : ""}
            </span>
          )}
          <ScreenComponent />
        </div>
      </main>

      <ToastProvider />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
