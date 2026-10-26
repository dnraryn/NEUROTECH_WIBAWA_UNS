// Shared primitive components for NeuroTech screens

const NeuroLogo = ({ size = 28 }) => {
  // Mirrors the topbar (.app-brand) layout: small square icon + wordmark
  // + tagline next to it. Far simpler than trying to crop the big PNG;
  // text is real text so it scales crisply and follows the theme color.
  const iconSize = Math.round(size * 1.25);
  const wordSize = size * 0.68;
  const subSize  = size * 0.36;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <img
        src="assets/logo-topleft.png"
        alt="NeuroTech"
        style={{
          width: iconSize, height: iconSize,
          borderRadius: 8, objectFit: "contain",
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, minWidth: 0 }}>
        <span style={{
          fontSize: wordSize, fontWeight: 800, letterSpacing: "-0.01em",
          background: "var(--nt-brand-gradient)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
        }}>neurotech</span>
        <span style={{
          fontSize: subSize, fontWeight: 700, letterSpacing: "0.02em",
          color: "var(--nt-text)", marginTop: 2,
          whiteSpace: "nowrap",
        }}>better mind, better life</span>
      </div>
    </div>
  );
};

// Circular gauge, like the 73% donut from reference
const NeuroGauge = ({ value = 73, size = 180, label, sublabel, gradient, thickness = 18 }) => {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const id = React.useMemo(() => "ng-" + Math.random().toString(36).slice(2, 8), []);
  const g = gradient || ["#9c8bf0", "#6cb6f0"];
  return (
    <div style={{
      width: size, height: size, position: "relative",
      borderRadius: "50%",
      background: "var(--nt-surface)",
      boxShadow: "var(--nt-shadow-out-lg)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        position: "absolute", inset: thickness * 0.55,
        borderRadius: "50%",
        background: "var(--nt-surface)",
        boxShadow: "var(--nt-shadow-in)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 700, color: "var(--nt-text)", lineHeight: 1 }}>
          {label || `${value}%`}
        </div>
        {sublabel && (
          <div style={{ fontSize: size * 0.07, color: "var(--nt-text-3)", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 4 }}>
            {sublabel}
          </div>
        )}
      </div>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={g[0]} />
            <stop offset="100%" stopColor={g[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={thickness * 0.45}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          opacity={0.95}
          style={{ transition: "stroke-dasharray .55s cubic-bezier(.16, 1, .3, 1)" }}
        />
      </svg>
    </div>
  );
};

// Vertical pill bars, like Relax/Cardio/Strength/Stretch from reference
const NeuroBar = ({ value = 50, color = ["#6cb6f0", "#8cc6f5"], label, sub, height = 100, width = 26 }) => {
  const fillH = Math.max(8, (value / 100) * height);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{
        width, height,
        borderRadius: width,
        background: "var(--nt-surface)",
        boxShadow: "var(--nt-shadow-in)",
        position: "relative",
        overflow: "hidden",
        display: "flex", alignItems: "flex-end", justifyContent: "center"
      }}>
        <div style={{
          width: "100%",
          height: fillH,
          borderRadius: width,
          background: `linear-gradient(180deg, ${color[0]}, ${color[1]})`,
          boxShadow: `0 -2px 6px ${color[0]}55, inset 0 1px 2px rgba(255,255,255,0.6)`,
          transition: "height .5s cubic-bezier(.16, 1, .3, 1)",
        }} />
      </div>
      {label && (
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontSize: 11, color: "var(--nt-text-2)", fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)", marginTop: 2 }}>{sub}</div>
        </div>
      )}
    </div>
  );
};

// Linear pill (intensity / progress slider look)
const NeuroSlider = ({ value = 50, color = ["#ffc56a", "#ffaebb"], width = 90, height = 6 }) => (
  <div style={{
    width, height,
    borderRadius: 999,
    background: "var(--nt-surface)",
    boxShadow: "var(--nt-shadow-in)",
    overflow: "hidden",
    position: "relative",
  }}>
    <div style={{
      width: `${value}%`, height: "100%",
      borderRadius: 999,
      background: `linear-gradient(90deg, ${color[0]}, ${color[1]})`,
      boxShadow: `0 1px 3px ${color[0]}66`,
    }} />
  </div>
);

// Neuro icon button (square or circle)
const NeuroIconBtn = ({ children, size = 44, active, onClick, style, ariaLabel }) => (
  <button
    aria-label={ariaLabel}
    onClick={onClick}
    style={{
      width: size, height: size, border: "none", cursor: "pointer",
      borderRadius: 14, padding: 0,
      background: "var(--nt-surface)",
      boxShadow: active ? "var(--nt-shadow-in)" : "var(--nt-shadow-out-sm)",
      color: active ? "var(--nt-brand-mid)" : "var(--nt-text-2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "box-shadow .15s, color .15s",
      ...style
    }}>
    {children}
  </button>
);

// Status pill (Normal / Waspada / Berisiko / Kritis).
const WorkerBackLink = ({ to = "/w/readiness", label = "Kembali ke beranda" }) => (
  <Link to={to} className="worker-back" aria-label={label} title={label}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
  </Link>
);
const WorkerPageHeader = ({ title, eyebrow = "NEUROTECH", to = "/w/readiness", action = null, backLabel = "Kembali ke beranda" }) => (
  <header className="worker-page-header"><WorkerBackLink to={to} label={backLabel}/><div><span>{eyebrow}</span><h1>{title}</h1></div><div className="worker-page-action">{action}</div></header>
);
// Monochromatic blue severity scale — light blue (safe) → navy (critical).
// Replaces the previous green/yellow/orange/red palette per design refresh;
// hierarchy comes from the lightness ramp instead of hue.
const STATUS_MAP = {
  normal:    { label: "Normal",   color: "#93C5FD", soft: "#DBEAFE", emoji: "🔵" },
  waspada:   { label: "Waspada",  color: "#3B82F6", soft: "#60A5FA", emoji: "🟦" },
  berisiko:  { label: "Berisiko", color: "#1D4ED8", soft: "#2563EB", emoji: "🟦" },
  kritis:    { label: "Kritis",   color: "#1E3A8A", soft: "#172554", emoji: "⬛" },
  unavailable: { label: "Belum tersedia", color: "#64748B", soft: "#CBD5E1", emoji: "○" },
};

const StatusPill = ({ status = "normal", showDot = true, size = "md" }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.unavailable;
  const sz = size === "sm"
    ? { padX: 10, padY: 4, fs: 11, dot: 8 }
    : { padX: 14, padY: 7, fs: 13, dot: 10 };
  return (
    <div className="nt-status-pill" data-status={status} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: `${sz.padY}px ${sz.padX}px`,
      borderRadius: 999,
      background: "var(--nt-surface)",
      boxShadow: "var(--nt-shadow-out-sm)",
      fontSize: sz.fs, fontWeight: 600, color: "var(--nt-text-2)"
    }}>
      {showDot && (
        <span style={{
          width: sz.dot, height: sz.dot, borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${s.soft}, ${s.color})`,
          boxShadow: `0 0 8px ${s.color}99`
        }} />
      )}
      {s.label}
    </div>
  );
};

// EEG sparkline — flows in real time via requestAnimationFrame.
// Backward compatible: keeps the original (width, height, color, seed) props.
// New optional props:
//   live   – set false to draw a single static frame (default true)
//   status – "normal" | "waspada" | "berisiko" | "kritis"; controls amplitude
//            and (when no explicit `color` is given) the line colour, so the
//            wave gets "louder" under cognitive load and calmer when normal.
const _EEG_STATUS_COLOR = {
  normal:   "#7dd1a1",
  waspada:  "#ffc56a",
  berisiko: "#ff9d5c",
  kritis:   "#ff7a7a",
};
const _EEG_STATUS_AMP = { normal: 0.78, waspada: 1.05, berisiko: 1.30, kritis: 1.55 };

const EEGWave = ({ width = 180, height = 36, color, seed = 0, live = true, status = null }) => {
  const [phase, setPhase] = React.useState(seed * 1.7);
  // Mirror Muse pairing state — when disconnected the wave freezes on the
  // last frame instead of looping forever.
  const [ntLive, setNtLive] = React.useState(() =>
    typeof window !== "undefined" ? window.NT_LIVE !== false : true);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setNtLive(window.NT_LIVE !== false);
    window.addEventListener("nt-device", check);
    window.addEventListener("nt-data", check);
    return () => {
      window.removeEventListener("nt-device", check);
      window.removeEventListener("nt-data", check);
    };
  }, []);
  React.useEffect(() => {
    if (!live || !ntLive) return;
    let raf = 0, last = 0;
    const tick = (now) => {
      if (!last) last = now;
      // Advance ~0.06 phase per 16 ms frame (≈ 60 fps).
      setPhase((p) => p + ((now - last) || 16) * 0.0038);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, ntLive]);

  const c = color || _EEG_STATUS_COLOR[status] || "#9c8bf0";
  const amp = _EEG_STATUS_AMP[status] || 1;
  const ph = live ? phase : seed * 1.7;

  const pts = [];
  const n = 60;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = t * width;
    const y = height / 2 +
      Math.sin(t * 16 + ph)         * 6 * amp +
      Math.sin(t * 32 + ph * 2.3)   * 4 * amp +
      Math.sin(t * 7  + ph * 0.7)   * 8 * amp;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={pts.join(" ")}
        fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
};

// Phone-style status bar — sticky so battery/signal stays pinned while the
// screen body scrolls, mimicking real iOS/Android behaviour. The padding-top
// of 32px leaves room for the Dynamic Island notch drawn on .app-frame--mobile.
const NeuroStatusBar = ({ time = "07:24" }) => (
  <div className="nt-phone-status" aria-hidden="true" style={{
    position: "sticky", top: 0, zIndex: 8,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "30px 24px 10px", fontSize: 13, fontWeight: 600, color: "var(--nt-text)",
    background: "var(--nt-bg-2)",
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
  }}>
    <span>{time}</span>
    <span style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--nt-text-2)" }}>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M0 8h2v3H0zm4-2h2v5H4zm4-3h2v8H8zm4-3h2v11h-2z"/></svg>
      <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><path d="M7 1.5C4.5 1.5 2.3 2.5 0.5 4.2L7 10.5l6.5-6.3C11.7 2.5 9.5 1.5 7 1.5z"/></svg>
      <span style={{ marginLeft: 2 }}>87</span>
      <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="18" height="10" rx="2.5" fill="none" stroke="currentColor"/><rect x="2" y="2" width="13" height="7" rx="1.5" fill="currentColor"/><rect x="19.5" y="3.5" width="1.5" height="4" rx="0.5" fill="currentColor"/></svg>
    </span>
  </div>
);

// Floating fintech-style tab bar — glassmorphic pill, blue active circle.
const NeuroTabBar = ({ active = "home" }) => {
  let tabs = [
    { k: "home",  to: "/w/readiness", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg> },
    { k: "brain", to: "/w/live",      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v1a3 3 0 0 0 2 2.8V16a3 3 0 0 0 4 3 3 3 0 0 0 4-3v-2.2A3 3 0 0 0 18 11v-1a3 3 0 0 0-3-3v0a3 3 0 0 0-3-3z"/></svg> },
    { k: "pulse", to: "/w/wellness",  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
    { k: "audio", to: "/w/audio",     icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.6"/><rect x="17" y="14" width="4" height="7" rx="1.6"/></svg> },
    { k: "chart", to: "/w/stats",     icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg> },
  ];
  if (window.ntSession?.get()) {
    tabs = tabs.filter((tab) => tab.k !== "pulse");
    tabs.push({ k: "profile", to: "/w/profile", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg> });
  }
  const labels = { home: "Beranda", brain: "Live", pulse: "Kondisi", audio: "Audio", chart: "Riwayat", profile: "Profil" };
  const activeKey = window.location?.hash?.includes("/w/profile") ? "profile" : active;
  return (
    <nav className="nt-tabbar" aria-label="Navigasi pekerja" style={{
      position: "sticky", bottom: 18,
      margin: "auto 20px 18px",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "8px 10px",
      background: "rgba(15, 23, 42, 0.82)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(96, 165, 250, 0.15)",
      boxShadow: "0 14px 34px rgba(2, 6, 23, 0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
      borderRadius: 30,
      zIndex: 10, flexShrink: 0,
    }}>
      {tabs.map((t) => {
        const on = activeKey === t.k;
        return (
          <Link key={t.k} to={t.to} aria-label={labels[t.k]} aria-current={on ? "page" : undefined} className="nt-worker-tab">
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: on ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "transparent",
              color: on ? "#ffffff" : "#64748B",
              boxShadow: on ? "0 8px 18px rgba(59,130,246,0.45)" : "none",
              transition: "background .15s, color .15s, box-shadow .15s",
            }}>{t.icon}</div>
            <span>{labels[t.k]}</span>
          </Link>
        );
      })}
    </nav>
  );
};

// Segmented Light / Dark pill — rendered INSIDE app frames (sidebars on
// desktop, menu overlay on mobile). Persists choice + broadcasts "nt-theme"
// event so App can apply body.nt-light class.
const ThemeToggle = () => {
  const [light, setLight] = React.useState(() => {
    try {
      const saved = localStorage.getItem("nt-theme");
      if (saved === "light") return true;
      if (saved === "dark")  return false;
      return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
    } catch (e) { return false; }
  });
  React.useEffect(() => {
    try { localStorage.setItem("nt-theme", light ? "light" : "dark"); } catch (e) { /* ignore */ }
    window.dispatchEvent(new CustomEvent("nt-theme", { detail: { light } }));
  }, [light]);

  const half = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px",
    borderRadius: 999, border: "none", cursor: "pointer",
    fontFamily: "inherit", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
    background: on ? "#1a1d24" : "transparent",
    color: on ? "#ffffff" : "var(--nt-text-2)",
    boxShadow: on ? "0 4px 12px rgba(0,0,0,0.22)" : "none",
    transition: "background .18s, color .18s, box-shadow .18s",
  });
  const sun = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
  const moon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
  return (
    <div style={{
      display: "inline-flex", gap: 3, padding: 3, borderRadius: 999,
      background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-out-sm)",
    }}>
      <button type="button" onClick={() => setLight(true)}  style={half(light)}>{sun}Light</button>
      <button type="button" onClick={() => setLight(false)} style={half(!light)}>{moon}Dark</button>
    </div>
  );
};

// ── Animated sparkline — single shared component used by the management
// KPI cards AND worker Fatigue Trend. Each instance maintains a phase
// counter that drifts continuously left, with layered sines + a trend
// slope. Pauses cleanly when Muse is disconnected (window.NT_LIVE === false)
// — listens to BOTH the engine tick (`nt-data`) and the device pairing
// event (`nt-device`) so it stops the moment the user clicks "Disconnect"
// even though the engine has already stopped ticking.
const LiveSparkline = ({ index = 0, trendDir = 1, color = "#3B82F6", height = 26, viewH = 22, animate = true, values }) => {
  const POINTS = 10;
  const STEP = 100 / (POINTS - 2);
  const [phase, setPhase] = React.useState(0);
  const seed = React.useMemo(() => index * 4.7 + 1.3, [index]);

  React.useEffect(() => {
    let mounted = true;
    let interval = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(() => {
        if (mounted) setPhase((p) => p + 0.05);
      }, 75);
    };
    const stop = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };
    const check = () => {
      if (animate && window.NT_LIVE !== false) start(); else stop();
    };
    check();
    window.addEventListener("nt-data", check);
    window.addEventListener("nt-device", check);
    return () => {
      mounted = false; stop();
      window.removeEventListener("nt-data", check);
      window.removeEventListener("nt-device", check);
    };
  }, [animate]);

  const phaseInt = Math.floor(phase);
  const phaseFrac = phase - phaseInt;
  const mid = viewH / 2;
  const amp = viewH * 0.36;
  const pts = [];
  for (let i = 0; i < POINTS; i++) {
    const t = i + phaseInt;
    const x = (i - phaseFrac - 1) * STEP;
    const y = mid
      + Math.sin(t * 0.70 + seed) * amp
      + Math.sin(t * 1.50 + seed * 1.4) * (amp * 0.35)
      + Math.sin(t * 2.80 + seed * 0.6) * (amp * 0.18)
      + (POINTS / 2 - i) * trendDir * (viewH * 0.05);
    pts.push({ x, y: Math.max(viewH * 0.10, Math.min(viewH * 0.90, y)) });
  }
  const measured = Array.isArray(values) ? values.filter(Number.isFinite) : null;
  const lo = measured?.length ? Math.min(...measured) : 0;
  const hi = measured?.length ? Math.max(...measured) : 1;
  const plot = measured ? measured.map((value, i) => ({
    x: i / Math.max(1, measured.length - 1) * 100,
    y: hi === lo ? viewH / 2 : viewH * (0.9 - 0.8 * (value - lo) / (hi - lo)),
  })) : pts;
  const d = plot.map((p, i) =>
    (i === 0 ? "M" : "L") + p.x.toFixed(2) + "," + p.y.toFixed(2)
  ).join(" ");
  const id = "nt-spk-live-" + index + "-" + viewH;
  return (
    <svg width="100%" height={height} viewBox={"0 0 100 " + viewH} preserveAspectRatio="none"
      style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {plot.length > 1 ? <>
        <path d={d + " L100," + viewH + " L0," + viewH + " Z"} fill={"url(#" + id + ")"} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </> : <text x="0" y={viewH / 2 + 3} fontSize="9" fill="var(--nt-text-3)">Belum ada riwayat</text>}
    </svg>
  );
};

// ── Collapsible-sidebar state — shared across Supervisor + Management.
// Persisted in localStorage and synced across components via a custom
// "nt-sidebar-toggle" event so every sidebar/dashboard reacts at once.
const _NT_SIDEBAR_KEY = "nt-sidebar-collapsed";
const _ntSidebarGet = () => {
  try { return localStorage.getItem(_NT_SIDEBAR_KEY) === "1"; } catch (e) { return false; }
};
const _ntSidebarSet = (v) => {
  try { localStorage.setItem(_NT_SIDEBAR_KEY, v ? "1" : "0"); } catch (e) { /* ignore */ }
  window.dispatchEvent(new Event("nt-sidebar-toggle"));
};
const useSidebarCollapsed = () => {
  const [c, setC] = React.useState(_ntSidebarGet);
  React.useEffect(() => {
    const fn = () => setC(_ntSidebarGet());
    window.addEventListener("nt-sidebar-toggle", fn);
    return () => window.removeEventListener("nt-sidebar-toggle", fn);
  }, []);
  return [c, () => _ntSidebarSet(!_ntSidebarGet())];
};

// Hamburger button that toggles the sidebar. Used in both Supervisor and
// Management sidebars (at the top).
const SidebarToggle = ({ style }) => {
  const [, toggle] = useSidebarCollapsed();
  return (
    <button type="button" onClick={toggle} aria-label="Buka/tutup sidebar"
      style={{
        width: 36, height: 36, borderRadius: 10, border: "none",
        background: "var(--nt-bg-2)",
        color: "var(--nt-text-2)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontFamily: "inherit",
        transition: "background .18s, color .18s",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nt-bg-deep)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--nt-bg-2)"; }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    </button>
  );
};

Object.assign(window, {
  NeuroLogo, NeuroGauge, NeuroBar, NeuroSlider, NeuroIconBtn, WorkerBackLink, WorkerPageHeader,
  StatusPill, EEGWave, NeuroStatusBar, NeuroTabBar, STATUS_MAP, ThemeToggle,
  useSidebarCollapsed, SidebarToggle, LiveSparkline,
});
