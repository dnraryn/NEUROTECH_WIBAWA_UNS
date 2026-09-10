// Management / SMK3 desktop dashboard, aggregate analytics. 1280×800.
// Redesigned to follow a sidebar + main grid hierarchy (Dropify-style) with a
// fully monochromatic blue palette. ALL existing features preserved.

// Monochromatic blue risk tiers — used everywhere in this screen.
const FRM_BLUES = {
  low:      ["#DBEAFE", "#93C5FD"],  // 0–34
  medium:   ["#60A5FA", "#3B82F6"],  // 35–54
  high:     ["#2563EB", "#1D4ED8"],  // 55–69
  critical: ["#1E3A8A", "#172554"],  // 70+
};
const _frmTier = (v) =>
  v >= 70 ? "critical" :
  v >= 55 ? "high" :
  v >= 35 ? "medium" : "low";

// Smooth blue scale for heatmap cells (light blue → navy).
const _heatBlue = (v) => {
  const t = Math.max(0, Math.min(1, v / 100));
  const sat = 80 + t * 16;
  const lit = 92 - t * 70;
  return `hsl(217, ${sat}%, ${lit}%)`;
};

// Module-level memory of last active item (survives sidebar remounts so
// the magic indicator animates from the previous position).
let _mgmtLastActive = "overview";

// LiveSparkline is defined in primitives.jsx — used by KPI cards here AND
// by worker screens (Fatigue Trend). Both files share the same instance.

// ── Sidebar — minimal nav matching the reference layout ──────────────────
const ManagementSidebar = ({ active = "overview" }) => {
  const NAV = [
    { id: "overview", label: "Overview",        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg> },
    { id: "fatigue",  label: "Pola Fatigue",    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>, zoom: "fatigue" },
    { id: "lini",     label: "Indeks Lini",     icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>, zoom: "lini" },
    { id: "insight",  label: "Insight AI",      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.7.6 1.2V16h6v-1c0-.5.2-.9.6-1.2A6 6 0 0 0 12 3z"/></svg>, zoom: "insight" },
    { id: "report",   label: "Laporan SMK3",    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>, zoom: "report" },
    { id: "settings", label: "Setelan",         icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg> },
  ];

  // Owner identity — derived from the logged-in session. Falls back to a
  // generic placeholder so demo / offline mode still renders sensibly.
  const session = (typeof window !== "undefined" && window.ntSession) ? window.ntSession.get() : null;
  const ownerName = (session && session.memberName) || "Arman R.";
  const ownerDesc = (session && session.roleDesc) ||
    (session && session.role === "management" ? "Manajemen" : "HSE Manager");
  const initials = ownerName.split(/\s+/).filter(Boolean)
    .map((w) => (w[0] || "").toUpperCase()).slice(0, 2).join("") || "AR";

  const navIndex = (zoomKey) => NAV.findIndex((n) => n.zoom === zoomKey);

  // Magic-line indicator state — see SupervisorSidebar for the full pattern.
  const navRef = React.useRef(null);
  const btnRefs = React.useRef({});
  const [hl, setHl] = React.useState(_mgmtLastActive);
  const [pos, setPos] = React.useState({ top: 0, height: 0, ready: false });

  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      setHl(active);
      _mgmtLastActive = active;
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
    const t = setTimeout(measure, 360);
    return () => clearTimeout(t);
  }, [hl, collapsed]);

  const go = (it) => {
    // Slide the indicator to the clicked item right away — even modal-opener
    // items get the highlight so the user gets clear visual feedback.
    setHl(it.id);
    _mgmtLastActive = it.id;
    if (it.to) { navigate(it.to); return; }
    // Pola Fatigue / Indeks Lini / Insight AI / Laporan SMK3 → open zoom modal
    // inside this dashboard with a direction matching the sidebar item's
    // position relative to whatever is currently open (or Overview as origin).
    if (it.zoom && window._mgmtOpenZoom) {
      const cur = window._mgmtCurrentZoom;
      const prevIdx = cur ? navIndex(cur) : 0;
      const newIdx = navIndex(it.zoom);
      const dir = newIdx >= prevIdx ? "down" : "up";
      window._mgmtOpenZoom(it.zoom, dir);
      window.toast?.("Menampilkan: " + it.label, { kind: "info", duration: 1400 });
      return;
    }
    if (it.scrollTo) {
      const el = document.getElementById(it.scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.remove("frm-highlight");
        void el.offsetWidth;
        el.classList.add("frm-highlight");
        setTimeout(() => el.classList.remove("frm-highlight"), 1400);
      }
      window.toast?.("Menampilkan: " + it.label, { kind: "info", duration: 1400 });
      return;
    }
    if (it.id === "overview") {
      window.toast?.("Anda sudah di Overview.", { kind: "info", duration: 1400 });
      return;
    }
    window.toast?.("Setelan SMK3, segera hadir.", { kind: "info" });
  };

  return (
    <aside className="nt-sb-aside" style={{
      padding: "22px 12px 16px",
      background: "var(--nt-surface)",
      borderRight: "1px solid var(--nt-bg-deep)",
      display: "flex", flexDirection: "column", gap: 4,
      overflow: "hidden",
      transition: "padding .32s cubic-bezier(.16, 1, .3, 1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 4px 4px" }}>
        <div className="nt-sb-label" style={{ minWidth: 0 }}>
          <NeuroLogo size={22} />
        </div>
        <SidebarToggle />
      </div>

      <nav ref={navRef} className="nt-sb-nav" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 3, marginTop: 22 }}>
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

        {NAV.map((it) => {
          const on = hl === it.id;
          return (
            <button key={it.id} type="button" onClick={() => go(it)}
              ref={(el) => { btnRefs.current[it.id] = el; }}
              className="nt-sb-item"
              style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "10px 13px", borderRadius: 12, border: "none",
                background: "transparent",
                color: on ? "#fff" : "var(--nt-text-2)",
                cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                textAlign: "left",
                position: "relative", zIndex: 1,
                transition: "color .2s",
              }}>
              <span style={{ display: "inline-flex", color: on ? "#fff" : "var(--nt-text-3)", transition: "color .2s" }}>{it.icon}</span>
              <span className="nt-sb-label" style={{ flex: 1 }}>{it.label}</span>
              {on && <span className="nt-sb-label" style={{ fontSize: 16, lineHeight: 1, marginRight: -2 }}>›</span>}
            </button>
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
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800,
            flexShrink: 0,
          }}>{initials}</div>
          <div className="nt-sb-label" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--nt-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ownerName}</div>
            <div style={{ fontSize: 10, color: "var(--nt-text-3)" }}>{ownerDesc}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const _MGMT_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const _MGMT_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const ManagementDashboard = () => {
  const [period, setPeriod] = React.useState(1);
  const periods = ["7 hari", "30 hari", "Kuartal", "Tahun"];
  const [heatCell, setHeatCell] = React.useState(null);
  // Zoom modals for sidebar items — Pola Fatigue / Indeks Lini / Insight AI /
  // Laporan SMK3 open inside this dashboard instead of routing away. The
  // slide direction follows the sidebar item position: going to a lower
  // item slides DOWN (enters from top), going to a higher item slides UP.
  const [zoom, setZoom] = React.useState(null);
  const [zoomDir, setZoomDir] = React.useState("down");
  React.useEffect(() => {
    const fn = (k, dir) => { setZoomDir(dir || "down"); setZoom(k); };
    window._mgmtOpenZoom = fn;
    return () => { if (window._mgmtOpenZoom === fn) delete window._mgmtOpenZoom; };
  }, []);
  React.useEffect(() => { window._mgmtCurrentZoom = zoom; }, [zoom]);

  // Real-time header values — today's date + actual worker count.
  const _today = new Date();
  const dateLabel = _MGMT_DAYS[_today.getDay()] + ", " + _today.getDate() + " " +
    _MGMT_MONTHS[_today.getMonth()] + " " + _today.getFullYear();
  const workerCount = (typeof WORKERS !== "undefined" && WORKERS) ? WORKERS.length : 0;

  const heatRows = [
    { l: "Pagi",   h: [22, 18, 24, 35, 48, 52, 58, 46] },
    { l: "Sore",   h: [28, 32, 38, 52, 62, 71, 78, 64] },
    { l: "Malam",  h: [42, 48, 58, 72, 86, 92, 88, 76] },
    { l: "Lembur", h: [38, 44, 56, 68, 80, 86, 78, 70] },
  ];

  const lini = [
    { l: "Lab",       v: 32 },
    { l: "CCR",       v: 46 },
    { l: "Dispatch",  v: 58 },
    { l: "Transport", v: 71 },
    { l: "Security",  v: 64 },
  ];

  const insights = [
    { tier: "critical", icon: "⚠", t: "Shift malam jam +5/+6, fatigue puncak",     d: "Pertimbangkan istirahat wajib 15 menit pada +4j; rotasi tugas di +6j." },
    { tier: "high",     icon: "🚛", t: "Transport: sleep debt rata-rata 2.1 j",     d: "5 pekerja konsisten readiness < 60. Tinjau jadwal off-day." },
    { tier: "medium",   icon: "📐", t: "Pola fatigue konsisten ≥ 3 minggu",         d: "Cukup data untuk evaluasi formal desain shift di audit triwulan." },
    { tier: "low",      icon: "✓", t: "Lini Lab, risiko rendah berkelanjutan",     d: "Pola istirahat eksisting bisa jadi referensi internal." },
  ];

  return (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "204px 1fr", overflow: "hidden" }}>
    <ManagementSidebar active="overview" />

    <main style={{ padding: "22px 28px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", overflowX: "hidden" }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div className="nt-eyebrow" style={{ fontSize: 10 }}>{dateLabel} · {lini.length} lini · {workerCount} pekerja</div>
          <div style={{ fontSize: 25, fontWeight: 800, color: "var(--nt-text)", marginTop: 4, letterSpacing: "-0.02em" }}>
            Fatigue Risk Management
          </div>
          <div style={{ fontSize: 11.5, color: "var(--nt-text-3)", marginTop: 3 }}>
            Data agregat &amp; anonim · PP No. 50/2012 SMK3 — Pemantauan, Evaluasi, Tindak lanjut
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            display: "flex", gap: 3, padding: 3, borderRadius: 999,
            background: "var(--nt-bg-deep)",
          }}>
            {periods.map((b, i) => (
              <button key={i} type="button" onClick={() => setPeriod(i)}
                style={{
                  padding: "7px 14px", borderRadius: 999, border: "none",
                  background: i === period ? "var(--nt-surface)" : "transparent",
                  boxShadow: i === period ? "0 2px 6px rgba(15,23,42,0.08)" : "none",
                  fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                  color: i === period ? "#1D4ED8" : "var(--nt-text-2)",
                  cursor: "pointer",
                }}>{b}</button>
            ))}
          </div>
          <button type="button" onClick={() => window.toast?.("Export → CSV", { kind: "info" })}
            title="Export CSV"
            style={{
              width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "#1a1d24", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.20)",
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>
        </div>
      </div>

      {/* ── KPI row ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr 1fr 1fr", gap: 12 }}>
        <div className="neu-surface" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <NeuroGauge value={84} size={100} label="84" sublabel="K3 SCORE"
            gradient={["#3B82F6", "#93C5FD"]} thickness={11} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nt-eyebrow" style={{ fontSize: 9 }}>SMK3 INDEX</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--nt-text)", marginTop: 3, letterSpacing: "-0.02em" }}>Baik</div>
            <div style={{ fontSize: 11, color: "var(--nt-text-2)", marginTop: 4 }}>
              <span style={{
                display: "inline-block", padding: "2px 7px", borderRadius: 999,
                fontSize: 9.5, fontWeight: 800, background: "#DBEAFE", color: "#1D4ED8",
              }}>↑ 6 poin</span>&nbsp; vs Maret
            </div>
          </div>
        </div>

        {[
          { l: "KEPATUHAN",       v: "92%",   sub: "Headband terpasang",  trend: "+3%",  dir:  1 },
          { l: "INSIDEN FATIGUE", v: "11",    sub: "Microsleep · alert",  trend: "−24%", dir: -1 },
          { l: "SLEEP DEBT",      v: "1.2 j", sub: "Rerata / pekerja",    trend: "−0.3", dir: -1 },
          { l: "JAM PANTAU",      v: "11.4k", sub: "Total jam EEG",       trend: "+18%", dir:  1 },
        ].map((k, i) => (
          <div key={i} className="neu-surface" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="nt-eyebrow" style={{ fontSize: 9 }}>{k.l}</div>
              <div style={{
                fontSize: 9.5, fontWeight: 800,
                padding: "2px 7px", borderRadius: 999,
                background: "#DBEAFE", color: "#1D4ED8",
              }}>{k.trend}</div>
            </div>
            <div style={{ fontSize: 23, fontWeight: 800, color: "var(--nt-text)", lineHeight: 1, letterSpacing: "-0.02em" }}>{k.v}</div>
            <div style={{ fontSize: 10.5, color: "var(--nt-text-3)" }}>{k.sub}</div>
            <LiveSparkline index={i} trendDir={k.dir} />
          </div>
        ))}
      </div>

      {/* ── Body grid: heatmap + right column ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 14, flex: 1, minHeight: 0 }}>
        {/* Heatmap */}
        <div id="frm-fatigue" className="neu-surface" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>Pola Fatigue · Shift × Jam</div>
              <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>Rata-rata Fatigue Index dari {workerCount} pekerja</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "var(--nt-text-3)" }}>Rendah</span>
              <div style={{
                width: 110, height: 8, borderRadius: 999,
                background: "linear-gradient(90deg, #DBEAFE, #60A5FA, #1D4ED8, #172554)",
              }} />
              <span style={{ fontSize: 10, color: "var(--nt-text-3)" }}>Tinggi</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "center" }}>
            {heatRows.map((row, r) => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 54, fontSize: 11, color: "var(--nt-text-2)", fontWeight: 700 }}>{row.l}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 5, flex: 1 }}>
                  {row.h.map((v, c) => {
                    const bg = _heatBlue(v);
                    const t = v / 100;
                    return (
                      <button key={c} type="button"
                        onClick={() => setHeatCell({ shift: row.l, hour: "+" + (c + 1) + "j", fi: v })}
                        style={{
                          height: 38, borderRadius: 9, background: bg, border: "none",
                          fontSize: 11, fontWeight: 800, fontFamily: "inherit",
                          color: t > 0.5 ? "#fff" : "#1E3A8A",
                          cursor: "pointer", transition: "transform .12s, box-shadow .12s",
                          boxShadow: t > 0.6 ? "0 3px 10px " + bg + "aa" : "inset 0 0 0 1px rgba(15,23,42,0.06)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>{v}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "54px repeat(8, 1fr)", gap: 5, fontSize: 9.5, color: "var(--nt-text-3)", textAlign: "center" }}>
            <span />
            {["+1j", "+2j", "+3j", "+4j", "+5j", "+6j", "+7j", "+8j"].map((h, i) => <span key={i}>{h}</span>)}
          </div>
        </div>

        {/* Right column: lini bars + insight */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div id="frm-lini" className="neu-surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--nt-text)" }}>Indeks per Lini</div>
              <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Risk avg</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", paddingTop: 4 }}>
              {lini.map((b, i) => (
                <NeuroBar key={i} value={b.v} color={FRM_BLUES[_frmTier(b.v)]} label={b.l} sub={String(b.v)} height={92} width={26} />
              ))}
            </div>
          </div>

          <div id="frm-insight" className="neu-surface" style={{ padding: 16, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--nt-text)" }}>Insight &amp; Rekomendasi</div>
              <div style={{
                padding: "3px 10px", borderRadius: 999,
                background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
                color: "white", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em",
                boxShadow: "0 4px 10px rgba(58,130,246,0.32)",
              }}>AI</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7, overflowY: "auto", flex: 1, minHeight: 0 }}>
              {insights.map((r, i) => {
                const c = FRM_BLUES[r.tier];
                return (
                  <div key={i} style={{
                    display: "flex", gap: 10, padding: "9px 11px", borderRadius: 12,
                    background: "var(--nt-bg-2)", border: "1px solid rgba(15,23,42,0.06)",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                      background: "linear-gradient(135deg, " + c[0] + ", " + c[1] + ")",
                      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13,
                      boxShadow: "0 3px 8px " + c[1] + "55",
                    }}>{r.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--nt-text)" }}>{r.t}</div>
                      <div style={{ fontSize: 10.5, color: "var(--nt-text-2)", marginTop: 2, lineHeight: 1.4 }}>{r.d}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={() => setZoom("report")} style={{
              width: "100%", padding: "10px 14px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "white",
              fontSize: 12, fontWeight: 800, fontFamily: "inherit", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 6px 16px rgba(58,130,246,0.32)",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              Buka Laporan SMK3
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={!!heatCell}
        onClose={() => setHeatCell(null)}
        title={heatCell ? heatCell.shift + " · " + heatCell.hour + " setelah mulai" : ""}
        subtitle={heatCell ?
          "Rata-rata Fatigue Index pada slot ini: " + heatCell.fi + ". " +
          (heatCell.fi > 70 ? "Slot puncak fatigue, pertimbangkan istirahat wajib."
            : heatCell.fi > 50 ? "Slot fatigue meningkat, pantau lebih ketat."
            : "Slot relatif aman, pola istirahat eksisting cukup.")
          : ""}
        tone={heatCell?.fi > 70 ? "danger" : heatCell?.fi > 50 ? "warn" : "success"}
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setHeatCell(null)}>Tutup</NeuroBtn>
            <Link to="/s/schedule"><NeuroBtn tone="primary" onClick={() => setHeatCell(null)}>Tinjau jadwal</NeuroBtn></Link>
          </>
        }
      />

      {/* ── Pola Fatigue zoom modal — larger heatmap when opened from sidebar */}
      <Modal
        open={zoom === "fatigue"}
        onClose={() => setZoom(null)}
        title="Pola Fatigue · Shift × Jam"
        subtitle={"Rata-rata Fatigue Index dari " + workerCount + " pekerja · " + dateLabel}
        width={920}
        popDir={zoomDir}
        actions={<NeuroBtn tone="primary" onClick={() => setZoom(null)}>Tutup</NeuroBtn>}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "var(--nt-text-3)" }}>Rendah</span>
          <div style={{
            width: 160, height: 10, borderRadius: 999,
            background: "linear-gradient(90deg, #DBEAFE, #60A5FA, #1D4ED8, #172554)",
          }} />
          <span style={{ fontSize: 11, color: "var(--nt-text-3)" }}>Tinggi</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {heatRows.map((row, r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 80, fontSize: 13, color: "var(--nt-text-2)", fontWeight: 700 }}>{row.l}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8, flex: 1 }}>
                {row.h.map((v, c) => {
                  const bg = _heatBlue(v);
                  const t = v / 100;
                  return (
                    <button key={c} type="button"
                      onClick={() => { setZoom(null); setHeatCell({ shift: row.l, hour: "+" + (c + 1) + "j", fi: v }); }}
                      style={{
                        height: 58, borderRadius: 12, background: bg, border: "none",
                        fontSize: 15, fontWeight: 800, fontFamily: "inherit",
                        color: t > 0.5 ? "#fff" : "#1E3A8A",
                        cursor: "pointer", transition: "transform .12s, box-shadow .12s",
                        boxShadow: t > 0.6 ? "0 4px 14px " + bg + "aa" : "inset 0 0 0 1px rgba(15,23,42,0.06)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>{v}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "80px repeat(8, 1fr)", gap: 8, fontSize: 11, color: "var(--nt-text-3)", textAlign: "center", marginTop: 4 }}>
            <span />
            {["+1j", "+2j", "+3j", "+4j", "+5j", "+6j", "+7j", "+8j"].map((h, i) => <span key={i}>{h}</span>)}
          </div>
        </div>
      </Modal>

      {/* ── Indeks Lini zoom modal — larger bars when opened from sidebar ── */}
      <Modal
        open={zoom === "lini"}
        onClose={() => setZoom(null)}
        title="Indeks per Lini"
        subtitle={"Rata-rata risk per lini operasional · " + lini.length + " lini · " + dateLabel}
        width={720}
        popDir={zoomDir}
        actions={<NeuroBtn tone="primary" onClick={() => setZoom(null)}>Tutup</NeuroBtn>}
      >
        <div style={{
          display: "flex", justifyContent: "space-around", alignItems: "flex-end",
          padding: "20px 8px 12px",
          background: "var(--nt-bg-2)", borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.06)",
        }}>
          {lini.map((b, i) => (
            <NeuroBar key={i} value={b.v} color={FRM_BLUES[_frmTier(b.v)]} label={b.l} sub={String(b.v)} height={180} width={44} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(" + lini.length + ", 1fr)", gap: 10, marginTop: 16 }}>
          {lini.map((b, i) => {
            const c = FRM_BLUES[_frmTier(b.v)];
            return (
              <div key={i} style={{
                padding: "10px 12px", borderRadius: 12,
                background: "var(--nt-surface)", border: "1px solid rgba(15,23,42,0.06)",
              }}>
                <div style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>{b.l}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--nt-text)", marginTop: 2, letterSpacing: "-0.02em" }}>{b.v}</div>
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: 999,
                  fontSize: 9.5, fontWeight: 800, marginTop: 4,
                  background: c[0], color: c[1],
                }}>{_frmTier(b.v).toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* ── Insight AI zoom modal — larger version when opened from sidebar */}
      <Modal
        open={zoom === "insight"}
        onClose={() => setZoom(null)}
        title="Insight & Rekomendasi · AI"
        subtitle={"Rekomendasi berbasis pola data SMK3 · " + dateLabel}
        width={760}
        popDir={zoomDir}
        actions={<NeuroBtn tone="primary" onClick={() => setZoom(null)}>Tutup</NeuroBtn>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((r, i) => {
            const c = FRM_BLUES[r.tier];
            return (
              <div key={i} style={{
                display: "flex", gap: 14, padding: "14px 16px", borderRadius: 14,
                background: "var(--nt-surface)", border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg, " + c[0] + ", " + c[1] + ")",
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                  boxShadow: "0 4px 12px " + c[1] + "55",
                }}>{r.icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999,
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                      background: c[0], color: c[1], textTransform: "uppercase",
                    }}>{r.tier}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>{r.t}</div>
                  <div style={{ fontSize: 12, color: "var(--nt-text-2)", marginTop: 4, lineHeight: 1.5 }}>{r.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* ── Laporan SMK3 modal — pure report grid, no supervisor sidebar ── */}
      <Modal
        open={zoom === "report"}
        onClose={() => setZoom(null)}
        title="Laporan SMK3"
        subtitle="Ringkasan laporan periodik internal · PP No. 50/2012"
        width={900}
        popDir={zoomDir}
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => window.toast?.("Generate laporan baru, fitur akan datang", { kind: "info" })}>+ Generate Laporan</NeuroBtn>
            <NeuroBtn tone="primary" onClick={() => setZoom(null)}>Tutup</NeuroBtn>
          </>
        }
      >
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14,
          maxHeight: "62vh", overflowY: "auto", padding: 4, margin: -4,
        }}>
          {REPORTS.map((r) => {
            const isFinal = r.status === "Final";
            return (
              <div key={r.id} className="neu-surface frm-report-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="nt-eyebrow" style={{ fontSize: 9 }}>Periode</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--nt-text)", marginTop: 4, letterSpacing: "-0.01em" }}>{r.period}</div>
                    <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>Diterbitkan {r.date}</div>
                  </div>
                  <span style={{
                    padding: "4px 10px", borderRadius: 999,
                    background: isFinal
                      ? "linear-gradient(135deg, #7dd1a1, #a8e0c0)"
                      : "linear-gradient(135deg, #ffc56a, #ffd791)",
                    color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                    boxShadow: isFinal ? "0 3px 8px rgba(125,209,161,0.4)" : "0 3px 8px rgba(255,197,106,0.4)",
                  }}>{r.status}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 18 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.12em" }}>PEKERJA</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--nt-text)", marginTop: 4 }}>{r.workers}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.12em" }}>INSIDEN</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: r.incidents > 15 ? "#ff7a7a" : "var(--nt-text)", marginTop: 4 }}>{r.incidents}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.12em" }}>SCORE</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: r.score >= 80 ? "#7dd1a1" : r.score >= 70 ? "#ffc56a" : "#ff7a7a", marginTop: 4 }}>{r.score}</div>
                  </div>
                </div>

                <button type="button"
                  onClick={() => window.toast?.("Detail laporan " + r.period + " — buka modul Laporan untuk PDF lengkap", { kind: "info" })}
                  style={{
                    marginTop: 16, padding: 0, background: "transparent", border: "none",
                    fontSize: 11, color: "var(--nt-brand-mid)", fontWeight: 700,
                    letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
                    fontFamily: "inherit",
                  }}>Lihat laporan →</button>
              </div>
            );
          })}
        </div>
      </Modal>
    </main>
  </div>
  );
};

Object.assign(window, { ManagementDashboard, ManagementSidebar });
