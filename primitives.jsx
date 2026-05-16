// Shared primitive components for NeuroTech screens

const NeuroLogo = ({ size = 28, withText = true, color }) => {
  const c1 = color || "#1a2b4a";
  const c2 = "#4ec3e0";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size * 0.85} viewBox="0 0 64 56" fill="none" aria-hidden>
        <defs>
          <linearGradient id="ntLogoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        {/* Left brain */}
        <path
          d="M28 6 C20 4 12 10 12 18 C6 20 4 28 9 33 C4 38 9 48 18 48 C22 52 28 50 28 44 Z"
          stroke="url(#ntLogoGrad)" strokeWidth="2.2" fill="none" strokeLinejoin="round"
        />
        {/* Right brain */}
        <path
          d="M36 6 C44 4 52 10 52 18 C58 20 60 28 55 33 C60 38 55 48 46 48 C42 52 36 50 36 44 Z"
          stroke="url(#ntLogoGrad)" strokeWidth="2.2" fill="none" strokeLinejoin="round"
        />
        {/* Synapse dots */}
        <circle cx="18" cy="20" r="2" fill={c2} />
        <circle cx="22" cy="32" r="2" fill={c1} />
        <circle cx="46" cy="20" r="2" fill={c2} />
        <circle cx="42" cy="32" r="2" fill={c1} />
        <line x1="18" y1="20" x2="22" y2="32" stroke={c2} strokeWidth="1" />
        <line x1="46" y1="20" x2="42" y2="32" stroke={c2} strokeWidth="1" />
      </svg>
      {withText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: size * 0.7, fontWeight: 700, color: "#1a2b4a", letterSpacing: "-0.01em" }}>
            neurotech
          </span>
          <span style={{ fontSize: size * 0.22, letterSpacing: "0.32em", color: "#8a9aae", marginTop: 2 }}>
            TECHNOLOGY OF THE MIND
          </span>
        </div>
      )}
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
          boxShadow: `0 -2px 6px ${color[0]}55, inset 0 1px 2px rgba(255,255,255,0.6)`
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
const NeuroIconBtn = ({ children, size = 44, active, onClick, style }) => (
  <button
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

// Status pill (Normal / Waspada / Berisiko / Kritis)
const STATUS_MAP = {
  normal:    { label: "Normal",   color: "#7dd1a1", soft: "#a8e0c0", emoji: "🟢" },
  waspada:   { label: "Waspada",  color: "#ffc56a", soft: "#ffd791", emoji: "🟡" },
  berisiko:  { label: "Berisiko", color: "#ff9d5c", soft: "#ffbf8c", emoji: "🟠" },
  kritis:    { label: "Kritis",   color: "#ff7a7a", soft: "#ff9c9c", emoji: "🔴" },
};

const StatusPill = ({ status = "normal", showDot = true, size = "md" }) => {
  const s = STATUS_MAP[status];
  const sz = size === "sm"
    ? { padX: 10, padY: 4, fs: 11, dot: 8 }
    : { padX: 14, padY: 7, fs: 13, dot: 10 };
  return (
    <div style={{
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

// Tiny EEG sparkline
const EEGWave = ({ width = 180, height = 36, color = "#9c8bf0", seed = 0 }) => {
  const pts = [];
  const n = 60;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = t * width;
    const phase = seed * 1.7;
    const y = height / 2 +
      Math.sin(t * 16 + phase) * 6 +
      Math.sin(t * 32 + phase * 2.3) * 4 +
      Math.sin(t * 7 + phase * 0.7) * 8;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={pts.join(" ")}
        fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
};

// Phone-style status bar
const NeuroStatusBar = ({ time = "07:24" }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 24px 6px", fontSize: 13, fontWeight: 600, color: "var(--nt-text)"
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

// Tab bar at bottom of phone screens, each icon navigates to its route.
const NeuroTabBar = ({ active = "home" }) => {
  const tabs = [
    { k: "home",  to: "/w/readiness", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg> },
    { k: "brain", to: "/w/live",      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v1a3 3 0 0 0 2 2.8V16a3 3 0 0 0 4 3 3 3 0 0 0 4-3v-2.2A3 3 0 0 0 18 11v-1a3 3 0 0 0-3-3v0a3 3 0 0 0-3-3z"/></svg> },
    { k: "moon",  to: "/w/sleep",     icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg> },
    { k: "chart", to: "/w/stats",     icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg> },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 18, left: 24, right: 24,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 18px",
      background: "var(--nt-surface)",
      boxShadow: "var(--nt-shadow-out)",
      borderRadius: 28,
    }}>
      {tabs.map(t => (
        <Link key={t.k} to={t.to}>
          <NeuroIconBtn size={42} active={active === t.k}>{t.icon}</NeuroIconBtn>
        </Link>
      ))}
    </div>
  );
};

Object.assign(window, {
  NeuroLogo, NeuroGauge, NeuroBar, NeuroSlider, NeuroIconBtn,
  StatusPill, EEGWave, NeuroStatusBar, NeuroTabBar, STATUS_MAP
});
