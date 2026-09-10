// Supervisor (K3) desktop dashboard, 1280x800. Neumorphism light.
// Uses shared mock data (WORKERS, ALERTS) so detail pages find the same records.

// ── Shared sidebar (reused by every Supervisor page) ──────────────────────
// Dropify-style: blue-gradient active item, monochrome SVG icons,
// avatar profile at the bottom. All routes & behaviours preserved.
const _SV_ICONS = {
  overview: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  workers:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1A4 4 0 0 1 16 11"/></svg>,
  alerts:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  schedule: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  reports:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>,
};

// Persists the last-active item across sidebar remounts so the magic
// indicator can animate FROM the previous position TO the new one after a
// route change (each navigation tears down and re-creates the sidebar).
let _svLastActive = "overview";

const SupervisorSidebar = ({ active = "overview" }) => {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const items = [
    { id: "overview", l: "Overview Tim",   to: "/s/overview" },
    { id: "workers",  l: "Pekerja",         to: "/s/workers" },
    { id: "alerts",   l: "Alert & Insiden", to: "/s/alerts", badge: 3 },
    { id: "schedule", l: "Jadwal Shift",    to: "/s/schedule" },
    { id: "reports",  l: "Laporan SMK3",    to: "/s/reports" },
  ];

  // Magic-line active indicator — a single absolutely-positioned pill that
  // slides between menu items. Initial value comes from the module-level
  // memory so a freshly-mounted sidebar starts where the old one left off.
  const navRef = React.useRef(null);
  const btnRefs = React.useRef({});
  const [hl, setHl] = React.useState(_svLastActive);
  const [pos, setPos] = React.useState({ top: 0, height: 0, ready: false });

  React.useEffect(() => {
    // Run AFTER paint so the indicator renders at the previous position
    // first, then transitions to the new active. useLayoutEffect would
    // collapse both updates into a single paint and skip the animation.
    const id = requestAnimationFrame(() => {
      setHl(active);
      _svLastActive = active;
    });
    return () => cancelAnimationFrame(id);
  }, [active]);

  const [collapsed] = useSidebarCollapsed();

  React.useLayoutEffect(() => {
    const measure = () => {
      const btn = btnRefs.current[hl];
      if (btn && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        setPos({
          top: btnRect.top - navRect.top,
          height: btnRect.height,
          ready: true,
        });
      }
    };
    measure();
    // After the collapse CSS transition (.32s) finishes, re-measure so the
    // indicator settles on the new button height/centering.
    const t = setTimeout(measure, 360);
    return () => clearTimeout(t);
  }, [hl, collapsed]);
  return (
    <aside className="nt-sb-aside" style={{
      padding: "22px 14px 16px",
      display: "flex", flexDirection: "column", gap: 16, minHeight: 800,
      background: "var(--nt-surface)",
      borderRight: "1px solid var(--nt-bg-deep)",
      transition: "padding .32s cubic-bezier(.16, 1, .3, 1)",
      overflow: "hidden",
    }}>
      {/* Brand + hamburger row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 4px" }}>
        <Link to="/s/overview" className="nt-sb-label" style={{ display: "flex", minWidth: 0 }}>
          <NeuroLogo size={22} />
        </Link>
        <SidebarToggle />
      </div>

      <button
        className="nt-sb-hide"
        onClick={() => setSearchOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 12,
          background: "var(--nt-bg-2)", border: "1px solid var(--nt-bg-deep)",
          width: "100%", cursor: "pointer", fontFamily: "inherit",
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--nt-text-3)" }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <span style={{ fontSize: 12, color: "var(--nt-text-3)" }}>Cari pekerja…</span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--nt-text-3)", border: "1px solid var(--nt-bg-deep)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--nt-font-mono)" }}>⌘K</span>
      </button>

      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Cari pekerja"
        subtitle="Klik nama untuk buka detail."
        width={420}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {WORKERS.map((w) => (
            <Link key={w.id} to={`/s/workers/${w.id}`} onClick={() => setSearchOpen(false)}>
              <div style={{
                padding: "10px 12px", borderRadius: 12,
                background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-out-sm)",
                display: "flex", alignItems: "center", gap: 12
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${w.img}, ${w.img}cc)`,
                  color: "white", fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>{w.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: "var(--nt-text-3)" }}>{w.role} · Shift {w.shift}</div>
                </div>
                <StatusPill status={w.status} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      </Modal>

      <nav ref={navRef} className="nt-sb-nav" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Magic-line indicator — single pill, slides between items */}
        <div className="nt-nav-indicator" style={{
          position: "absolute", left: 0, right: 0,
          top: pos.top + "px", height: pos.height + "px",
          opacity: pos.ready ? 1 : 0,
          borderRadius: 12,
          background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
          boxShadow: "0 6px 14px rgba(58,130,246,0.32), 0 0 18px rgba(58,130,246,0.20)",
          transition: "top .30s cubic-bezier(.16, 1, .3, 1), height .30s cubic-bezier(.16, 1, .3, 1), opacity .2s",
          pointerEvents: "none", zIndex: 0,
        }} />

        {items.map((item) => {
          const on = hl === item.id;
          return (
            <Link key={item.id} to={item.to}
              onClick={() => { setHl(item.id); _svLastActive = item.id; }}>
              <div
                ref={(el) => { btnRefs.current[item.id] = el; }}
                className="nt-sb-item"
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "10px 13px", borderRadius: 12,
                  background: "transparent",
                  color: on ? "#fff" : "var(--nt-text-2)",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  position: "relative", zIndex: 1,
                  transition: "color .2s",
                }}>
                <span style={{ display: "inline-flex", color: on ? "#fff" : "var(--nt-text-3)", transition: "color .2s" }}>
                  {_SV_ICONS[item.id]}
                </span>
                <span className="nt-sb-label" style={{ flex: 1 }}>{item.l}</span>
                {item.badge && (
                  <span className="nt-sb-label" style={{
                    background: on ? "rgba(255,255,255,0.22)" : "#1E3A8A",
                    color: "#fff",
                    fontSize: 10, fontWeight: 800,
                    padding: "2px 7px", borderRadius: 999,
                    transition: "background .2s",
                  }}>{item.badge}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "12px 6px 0" }}>
        <div className="nt-sb-hide"><AskAIButton variant="card" /></div>
        <div className="nt-sb-hide"><ThemeToggle /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6, #93C5FD)",
            color: "white", fontSize: 12, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>NF</div>
          <div className="nt-sb-label" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--nt-text)" }}>Nadya F.</div>
            <div style={{ fontSize: 10, color: "var(--nt-text-3)" }}>Supervisor K3</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

// ── Overview Tim (the main dashboard) ─────────────────────────────────────
const SupervisorDashboard = () => {
  const [rotateModal, setRotateModal] = React.useState(false);
  const [period, setPeriod] = React.useState("Hari ini");

  const pagiWorkers = WORKERS.filter((w) => w.shift === "Pagi");
  const criticalAlert = ALERTS[0]; // Microsleep · Rizky A.

  return (
  <div className="nt-screen" style={{ padding: "0", display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="overview" />

    {/* Main content */}
    <main style={{ padding: "22px 28px 22px 6px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="nt-eyebrow" style={{ fontSize: 10 }}>Kamis, 14 Mei 2026 · 11:42</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--nt-text)", letterSpacing: "-0.01em", marginTop: 4 }}>
            Overview Tim · Shift Pagi
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {["Hari ini", "Minggu", "Bulan"].map((b) => (
            <button key={b}
              onClick={() => { setPeriod(b); window.toast?.(`Periode diubah: ${b}`, { kind: "info" }); }}
              style={{
                padding: "9px 18px", borderRadius: 999,
                background: "var(--nt-surface)",
                boxShadow: period === b ? "var(--nt-shadow-in)" : "var(--nt-shadow-out-sm)",
                fontSize: 12, fontWeight: 600,
                color: period === b ? "var(--nt-brand-mid)" : "var(--nt-text-2)",
                border: "none", cursor: "pointer", fontFamily: "inherit"
              }}>{b}</button>
          ))}
          <NeuroIconBtn size={38} onClick={() => window.toast?.("Export overview → CSV (mock)", { kind: "info" })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v4l-6 6v6l-4-2v-4L4 8z"/></svg>
          </NeuroIconBtn>
        </div>
      </div>

      {/* KPIs row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", gap: 14 }}>
        <div className="neu-surface" style={{ padding: 18, display: "flex", alignItems: "center", gap: 18 }}>
          <NeuroGauge value={62} size={120} label="62" sublabel="risk idx" gradient={["#3B82F6", "#60A5FA"]} thickness={14} />
          <div style={{ flex: 1 }}>
            <div className="nt-eyebrow" style={{ fontSize: 9 }}>Indeks risiko tim</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--nt-text)", marginTop: 6, lineHeight: 1.1 }}>
              Sedang
            </div>
            <div style={{ fontSize: 11.5, color: "var(--nt-text-2)", marginTop: 6, lineHeight: 1.4 }}>
              2 pekerja butuh intervensi segera.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <StatusPill status="kritis" size="sm" />
              <StatusPill status="berisiko" size="sm" />
            </div>
          </div>
        </div>

        {[
          { l: "Pekerja aktif", v: "12 / 14", sub: "2 belum tersambung", c: "#3B82F6", icon: "👥", to: "/s/workers" },
          { l: "Alert hari ini", v: "7",       sub: "3 belum ditindak",    c: "#1D4ED8", icon: "🔔", to: "/s/alerts" },
          { l: "Microsleep",    v: "1",       sub: "Rizky A. · 11:42",    c: "#1E3A8A", icon: "💤", to: "/s/alerts/a-1142" },
        ].map((k, i) => (
          <Link key={i} to={k.to}>
            <div className="neu-surface nt-card-click" style={{ padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="nt-eyebrow" style={{ fontSize: 9 }}>{k.l}</div>
                <div style={{
                  width: 34, height: 34, borderRadius: 12,
                  background: `linear-gradient(135deg, ${k.c}, ${k.c}aa)`,
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                  boxShadow: `0 4px 10px ${k.c}55`
                }}>{k.icon}</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--nt-text)", lineHeight: 1, letterSpacing: "-0.01em" }}>{k.v}</div>
                <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 4 }}>{k.sub}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom: worker grid + alerts panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 18, minHeight: 0, flex: 1 }}>
        {/* Worker grid */}
        <div className="neu-surface" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)" }}>Status Pekerja Real-time</div>
              <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>Diperbarui tiap 5 detik · Muse S/2</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(STATUS_MAP).map(([k, s]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--nt-text-2)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, overflowY: "auto", flex: 1, paddingRight: 4 }}>
            {pagiWorkers.map((w) => {
              const s = STATUS_MAP[w.status];
              return (
                <Link key={w.id} to={`/s/workers/${w.id}`}>
                  <div className="nt-card-click" style={{
                    padding: 14,
                    borderRadius: 18,
                    background: "var(--nt-surface)",
                    boxShadow: w.status === "kritis" || w.status === "berisiko" ? "var(--nt-shadow-in)" : "var(--nt-shadow-out-sm)",
                    display: "flex", flexDirection: "column", gap: 10,
                    position: "relative", overflow: "hidden",
                    height: "100%"
                  }}>
                    {(w.status === "kritis") && (
                      <span style={{
                        position: "absolute", top: -1, right: -1,
                        width: 60, height: 60, borderRadius: "50%",
                        background: `radial-gradient(circle at 70% 30%, rgba(30,58,138,0.32), transparent 70%)`,
                        pointerEvents: "none"
                      }} />
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${w.img}, ${w.img}cc)`,
                        color: "white", fontSize: 12, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: `0 3px 8px ${w.img}55`,
                        position: "relative"
                      }}>
                        {w.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                        <span style={{
                          position: "absolute", bottom: -2, right: -2,
                          width: 12, height: 12, borderRadius: "50%",
                          background: s.color,
                          border: "2px solid var(--nt-surface)",
                          boxShadow: `0 0 6px ${s.color}`
                        }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--nt-text)" }}>{w.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--nt-text-3)" }}>{w.role}</div>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.08em" }}>›</span>
                    </div>
                    {/* Mini bars — monochromatic blue tier per metric */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[
                        { l: "FI",  v: w.fi,  c: ["#1E3A8A","#3B82F6"] },
                        { l: "CLI", v: w.cli, c: ["#2563EB","#60A5FA"] },
                        { l: "HRV", v: w.hrv, c: ["#93C5FD","#DBEAFE"] },
                      ].map((m, j) => (
                        <div key={j}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--nt-text-3)", marginBottom: 3, fontWeight: 600, letterSpacing: "0.08em" }}>
                            <span>{m.l}</span><span style={{ color: "var(--nt-text)" }}>{m.v}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 999, background: "var(--nt-bg-deep)", overflow: "hidden", boxShadow: "inset 1px 1px 2px rgba(140,156,180,0.3)" }}>
                            <div style={{ width: `${m.v}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${m.c[0]}, ${m.c[1]})` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                      <StatusPill status={w.status} size="sm" />
                      <span style={{ fontSize: 10, color: "var(--nt-text-3)" }}>upd {w.t}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column: alerts + recommendation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          {/* Critical alert hero */}
          <Link to={`/s/alerts/${criticalAlert.id}`}>
            <div className="neu-surface nt-card-click" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
              <span style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(80% 70% at 100% 0%, rgba(30,58,138,0.22), transparent 60%)",
                pointerEvents: "none"
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, position: "relative" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1E3A8A", boxShadow: "0 0 10px #1E3A8A", animation: "nt-pulse 1.4s ease-in-out infinite" }} />
                <div className="nt-eyebrow" style={{ fontSize: 9, color: "#1E3A8A" }}>ALERT KRITIS · 11:42</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--nt-text)", position: "relative" }}>
                {criticalAlert.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--nt-text-2)", marginTop: 4, position: "relative", lineHeight: 1.45 }}>
                <b>Rizky A.</b> · CCR Operator · {criticalAlert.detail}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, position: "relative" }} onClick={(e) => e.preventDefault()}>
                <button
                  onClick={(e) => { e.preventDefault(); setRotateModal(true); }}
                  style={{
                    flex: 1, padding: "10px 14px",
                    borderRadius: 14, border: "none",
                    background: "linear-gradient(135deg, #1E3A8A, #2563EB)",
                    color: "white", fontWeight: 700, fontSize: 12,
                    boxShadow: "0 8px 20px rgba(30,58,138,0.40), inset 0 1px 0 rgba(255,255,255,0.20)",
                    cursor: "pointer", fontFamily: "inherit"
                  }}>Rotasi Tugas</button>
                <button
                  onClick={(e) => { e.preventDefault(); window.toast?.("WhatsApp via Fonnte → Rizky A. (mock)", { kind: "success" }); }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14, border: "none",
                    background: "var(--nt-surface)",
                    boxShadow: "var(--nt-shadow-out-sm)",
                    color: "var(--nt-text-2)", fontWeight: 600, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>WhatsApp ↗</button>
              </div>
            </div>
          </Link>

          <Modal
            open={rotateModal}
            onClose={() => setRotateModal(false)}
            tone="danger"
            title="Rotasi tugas Rizky A.?"
            subtitle="Rizky A. (CCR Operator) akan dialihkan ke tugas non-safety-critical selama 30 menit. Supervisor zona harus mengambil over CCR sementara."
            actions={
              <>
                <NeuroBtn tone="ghost" onClick={() => setRotateModal(false)}>Batal</NeuroBtn>
                <NeuroBtn tone="danger" onClick={() => {
                  setRotateModal(false);
                  window.toast?.("Rotasi tugas terkirim ke supervisor zona", { kind: "success" });
                }}>Rotasikan</NeuroBtn>
              </>
            }
          />

          {/* Alert feed */}
          <div className="neu-surface" style={{ padding: 16, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Feed Alert</div>
              <Link to="/s/alerts">
                <span style={{ fontSize: 10.5, color: "var(--nt-brand-mid)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer" }}>Lihat semua →</span>
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
              {ALERTS.slice(0, 6).map((a) => {
                const s = STATUS_MAP[a.status];
                return (
                  <Link key={a.id} to={`/s/alerts/${a.id}`}>
                    <div className="nt-card-click" style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: "var(--nt-bg)",
                      boxShadow: "var(--nt-shadow-in)"
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                      <span style={{ fontSize: 11, color: "var(--nt-text-3)", fontVariantNumeric: "tabular-nums" }}>{a.t}</span>
                      <span style={{ fontSize: 12, color: "var(--nt-text)", fontWeight: 500, flex: 1 }}>{a.title} · {a.workerName}</span>
                      <span style={{ fontSize: 10, color: s.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
  );
};

Object.assign(window, { SupervisorDashboard, SupervisorSidebar });
