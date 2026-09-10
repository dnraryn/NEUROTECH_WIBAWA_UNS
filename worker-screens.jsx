// Worker app, mobile screens (360x780). Premium fintech-navy aesthetic —
// blue monochromatic system, glassmorphic cards, glowing readiness gauge.

// ── SCREEN 1: PRA-SHIFT / READINESS ─────────────────────────────────────────
const WorkerReadiness = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const w = CURRENT_WORKER;
  const greet = w.shift === "Sore" ? "Selamat sore" : w.shift === "Malam" ? "Selamat malam" : "Selamat pagi";
  const readyText = {
    normal:   "Indeks Anda dalam rentang baseline. Anda siap menjalani shift.",
    waspada:  "Indeks mendekati ambang waspada. Jaga ritme kerja dan ambil jeda.",
    berisiko: "Indeks di atas ambang berisiko. Pertimbangkan istirahat lebih awal.",
    kritis:   "Kondisi kritis. Hentikan tugas safety-critical dan lapor supervisor.",
  }[w.status] || "Pantau kondisi Anda sepanjang shift.";
  const slH = Math.floor(w.sleep || 0);
  const slM = Math.round(((w.sleep || 0) - slH) * 60);
  const debt = Math.max(0, +(7.5 - (w.sleep || 0)).toFixed(1));

  // Top circular buttons — class adapts (white shadow in light, white-on-navy in dark).
  const topBtnStyle = {
    width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
    background: "var(--nt-surface)", color: "var(--nt-text)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "var(--nt-shadow-out-sm)",
    flexShrink: 0,
  };
  // Premium metric card — pure surface + hairline, soft drop shadow.
  // Works for both dark fintech navy (--nt-surface = deep navy) and light
  // Dropify cream (--nt-surface = #ffffff).
  const metricCardStyle = {
    padding: "14px 12px", borderRadius: 18,
    background: "var(--nt-surface)",
    border: "var(--nt-hairline)",
    boxShadow: "var(--nt-shadow-out-sm)",
    display: "flex", flexDirection: "column", gap: 8,
  };
  const metricIconWrap = (svg) => (
    <div style={{
      width: 38, height: 38, borderRadius: 12,
      background: "linear-gradient(135deg, rgba(96,165,250,0.26), rgba(37,99,235,0.10))",
      border: "1px solid rgba(96,165,250,0.22)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#3B82F6", marginBottom: 4,
    }}>{svg}</div>
  );

  return (
  <div className="nt-screen" style={{ paddingBottom: 110 }}>
    <NeuroStatusBar time="06:48" />

    {/* Top app bar — adaptive circular buttons + glowing brand label */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 22px 0" }}>
      <button onClick={() => setMenuOpen(true)} style={topBtnStyle} aria-label="Menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <div style={{ fontSize: 10.5, letterSpacing: "0.36em", color: "#3B82F6", fontWeight: 700 }}>
        N E U R O T E C H
      </div>
      <Link to="/w/profile" aria-label="Profil">
        <div style={topBtnStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
        </div>
      </Link>
    </div>

    {/* Ask AI launcher — top-right inside the phone frame, below the profile row */}
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 22px 0" }}>
      <AskAIButton variant="plus" />
    </div>

    {/* Menu overlay — rendered INSIDE the phone frame (portal to .app-frame--mobile)
        instead of a viewport-level Modal. Feels like a real app drawer. */}
    {menuOpen && (() => {
      const frameEl = typeof document !== "undefined" && document.querySelector(".app-frame--mobile");
      if (!frameEl) return null;
      return ReactDOM.createPortal(
        <div onClick={() => setMenuOpen(false)} style={{
          position: "absolute", inset: 0, zIndex: 40,
          background: "rgba(2, 6, 23, 0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 18, animation: "nt-fade .15s ease",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "100%", maxWidth: 300,
            background: "var(--nt-surface)",
            border: "var(--nt-hairline)",
            borderRadius: 22, padding: 20,
            boxShadow: "var(--nt-shadow-out-lg)",
            animation: "nt-pop .18s cubic-bezier(.2,.7,.3,1)",
          }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>Menu Pekerja</div>
            <div style={{ fontSize: 12, color: "var(--nt-text-3)", marginTop: 4 }}>Pilih halaman yang ingin dibuka.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
              {[
                { to: "/w/readiness", l: "Readiness · Pra-shift" },
                { to: "/w/live",      l: "Live · Monitoring shift" },
                { to: "/w/wellness",  l: "Kondisi · Stres & microsleep" },
                { to: "/w/audio",     l: "Neurofeedback · Audio fokus" },
                { to: "/w/stats",     l: "Statistik · Ringkasan minggu" },
                { to: "/w/profile",   l: "Profil & pengaturan" },
              ].map((m, i) => (
                <Link key={i} to={m.to} onClick={() => setMenuOpen(false)}>
                  <div style={{
                    padding: "10px 13px", borderRadius: 11,
                    background: "var(--nt-bg-2)", border: "1px solid rgba(96,165,250,0.18)",
                    fontSize: 12.5, fontWeight: 600, color: "var(--nt-text)",
                  }}>{m.l}</div>
                </Link>
              ))}
            </div>
            <div style={{
              marginTop: 14, paddingTop: 12,
              borderTop: "1px solid var(--nt-bg-deep)",
              display: "flex", justifyContent: "center",
            }}>
              <ThemeToggle />
            </div>
          </div>
        </div>,
        frameEl
      );
    })()}

    {/* Greeting — uppercase eyebrow + big bold name */}
    <div style={{ padding: "22px 26px 0" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.32em", textTransform: "uppercase", color: "#3B82F6", fontWeight: 700 }}>
        {greet}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--nt-text)", marginTop: 8, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
        {w.name}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--nt-text-3)", marginTop: 6 }}>
        Shift {w.shift} · {SHIFT_HOURS[w.shift] || ""} · {w.role}
      </div>
    </div>

    {/* Premium readiness gauge — blue ring + radial glow halo */}
    <div style={{ position: "relative", display: "flex", justifyContent: "center", marginTop: 28 }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.30) 0%, rgba(37,99,235,0.16) 35%, transparent 68%)",
        filter: "blur(12px)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <NeuroGauge
          value={w.readiness}
          size={222}
          label={String(w.readiness)}
          sublabel="readiness"
          gradient={["#60A5FA", "#3B82F6"]}
          thickness={22}
        />
      </div>
    </div>

    {/* Status + advice */}
    <div style={{ textAlign: "center", marginTop: 18, padding: "0 32px" }}>
      <StatusPill status={w.status} />
      <div style={{ fontSize: 12.5, color: "var(--nt-text-3)", marginTop: 12, lineHeight: 1.5 }}>
        {readyText}
      </div>
    </div>

    {/* Three premium metric cards: Tidur · Sleep Debt · HRV */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "22px 22px 0" }}>
      <div style={metricCardStyle}>
        {metricIconWrap(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>)}
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--nt-text)", letterSpacing: "-0.01em", lineHeight: 1 }}>{slH}j {slM}m</div>
        <div style={{ fontSize: 9.5, color: "#3B82F6", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>Tidur</div>
      </div>
      <div style={metricCardStyle}>
        {metricIconWrap(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>)}
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--nt-text)", letterSpacing: "-0.01em", lineHeight: 1 }}>{debt} j</div>
        <div style={{ fontSize: 9.5, color: "#3B82F6", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>Sleep Debt</div>
      </div>
      <div style={metricCardStyle}>
        {metricIconWrap(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>)}
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--nt-text)", letterSpacing: "-0.01em", lineHeight: 1 }}>{w.hrv} ms</div>
        <div style={{ fontSize: 9.5, color: "#3B82F6", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>HRV</div>
      </div>
    </div>

    {/* Persiapan Shift — surface card with blue accent checkboxes */}
    <div style={{
      margin: "20px 22px 0",
      padding: "16px 18px", borderRadius: 20,
      background: "var(--nt-surface)",
      border: "var(--nt-hairline)",
      boxShadow: "var(--nt-shadow-out-sm)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>Persiapan Shift</div>
        <div style={{
          fontSize: 10, fontWeight: 800, color: "#1D4ED8",
          padding: "3px 9px", borderRadius: 999,
          background: "#DBEAFE",
          letterSpacing: "0.1em",
        }}>2 / 3</div>
      </div>
      {[
        { label: "Muse S, tidur tersinkron", done: true },
        { label: "Kalibrasi baseline tersimpan", done: true },
        { label: "Pasang headband sebelum 07:00", done: false },
      ].map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
          <div style={{
            width: 22, height: 22, borderRadius: 8,
            background: c.done ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "transparent",
            border: c.done ? "none" : "1px solid var(--nt-text-4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: c.done ? "#ffffff" : "transparent",
            boxShadow: c.done ? "0 4px 10px rgba(59,130,246,0.40)" : "none",
            flexShrink: 0,
          }}>
            {c.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-12"/></svg>}
          </div>
          <div style={{ fontSize: 13, color: c.done ? "var(--nt-text-3)" : "var(--nt-text)", textDecoration: c.done ? "line-through" : "none" }}>
            {c.label}
          </div>
        </div>
      ))}
    </div>

    <NeuroTabBar active="home" />
  </div>
  );
};

// ── SCREEN 2: LIVE MONITORING ─────────────────────────────────────────────
const WorkerLive = () => {
  const [breakModal, setBreakModal] = React.useState(false);
  const [breakTimer, setBreakTimer] = React.useState(null);

  // Real-device telemetry — when a Muse is actually paired over BLE we
  // surface its battery % and name. Falls back to a small simulated drift
  // for demo / no-device sessions.
  const initDev = (window.ntDeviceStatus && window.ntDeviceStatus()) || {};
  const [muse, setMuse] = React.useState({
    real: !!initDev.real,
    name: initDev.name || null,
    battery: initDev.battery,
  });
  React.useEffect(() => {
    const onDev = (e) => {
      const d = (e && e.detail) || {};
      setMuse({ real: !!d.real, name: d.name || null, battery: d.battery });
    };
    const onTel = (e) => {
      if (e && e.detail && typeof e.detail.battery === "number") {
        setMuse((m) => ({ ...m, battery: e.detail.battery }));
      }
    };
    window.addEventListener("nt-device", onDev);
    window.addEventListener("nt-muse-telemetry", onTel);
    return () => {
      window.removeEventListener("nt-device", onDev);
      window.removeEventListener("nt-muse-telemetry", onTel);
    };
  }, []);

  React.useEffect(() => {
    if (breakTimer === null) return;
    if (breakTimer <= 0) {
      setBreakTimer(null);
      window.toast?.("Istirahat mikro selesai. Lanjutkan tugas perlahan.", { kind: "success" });
      return;
    }
    const t = setTimeout(() => setBreakTimer((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [breakTimer]);

  const startBreak = () => {
    setBreakModal(false);
    setBreakTimer(180); // 3 min
    window.toast?.("Istirahat mikro dimulai · 3 menit", { kind: "info" });
  };

  // Live values — pulled from CURRENT_WORKER which the engine mutates each
  // tick. App re-renders this component on `nt-data` so we always read the
  // freshest numbers. EEG band powers are derived from those vitals with a
  // small per-tick sine so the bars never look identical.
  const w = CURRENT_WORKER || {};
  const cli = typeof w.cli === "number" ? w.cli : 64;
  const fi  = typeof w.fi  === "number" ? w.fi  : 38;
  const ei  = typeof w.ei  === "number" ? w.ei  : 71;
  const stat = w.status || "waspada";
  const _clip = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
  // Time-based phase so bands gently drift between engine ticks (purely
  // visual). When Muse disconnects, NT_LIVE turns false → we freeze the
  // phase at a fixed value so the bars stop moving.
  const tickPhase = window.NT_LIVE !== false ? (Date.now() / 1700) : 0;
  // Prefer the REAL band powers computed by ble-muse-dsp.js whenever a Muse
  // is paired. Falls back to a sine-driven derivation for demo mode so the
  // bars still feel alive.
  const realBands = (muse.real && window.ntMuseDSP && window.ntMuseDSP.bands) || null;
  const eegBands = [
    { l: "Delta", c: ["#6cb6f0", "#8cc6f5"], v: realBands ? realBands.delta : _clip(38 + (fi  - 50) * 0.55 + Math.sin(tickPhase + 0.1) * 5, 8, 95) },
    { l: "Theta", c: ["#9c8bf0", "#b9adf5"], v: realBands ? realBands.theta : _clip(48 + (fi  - 50) * 0.70 + Math.sin(tickPhase + 1.4) * 6, 10, 95) },
    { l: "Alpha", c: ["#ff8aa1", "#ffaebb"], v: realBands ? realBands.alpha : _clip(40 - (cli - 50) * 0.35 + Math.sin(tickPhase + 2.7) * 5, 8, 90) },
    { l: "Beta",  c: ["#ffc56a", "#ffd791"], v: realBands ? realBands.beta  : _clip(38 + (cli - 50) * 0.55 + Math.sin(tickPhase + 4.0) * 5, 8, 95) },
    { l: "Gamma", c: ["#7dd1a1", "#a8e0c0"], v: realBands ? realBands.gamma : _clip(22 + (ei  - 50) * 0.40 + Math.sin(tickPhase + 5.3) * 4, 5, 80) },
  ];
  // Shift "time elapsed" — tracks how long the worker has been on this shift
  // (relative to a fixed start). Updates each tick.
  const shiftStartMin = 8 * 60;  // 8:00 baseline
  const nowMin = (new Date()).getHours() * 60 + (new Date()).getMinutes();
  const elapsedMin = Math.max(0, nowMin - shiftStartMin);
  const elapsedLabel = Math.floor(elapsedMin / 60) + " j " + (elapsedMin % 60) + " m";
  // Battery: real % from the headband when paired (rounded), otherwise a
  // gentle simulated number so the pill still feels alive in demo mode.
  const ble = (muse.real && typeof muse.battery === "number")
    ? Math.round(muse.battery)
    : _clip(60 + Math.sin(tickPhase * 0.3) * 6, 40, 88);
  const deviceLabel = (muse.real && muse.name)
    ? muse.name + " · TP9 · AF7 · AF8 · TP10"
    : "Muse S · TP9 · AF7 · AF8 · TP10";
  const stCopy = {
    normal:   "Status normal. Pertahankan ritme kerja dan ambil jeda singkat tiap jam.",
    waspada:  "Beban kognitif naik 14 menit terakhir. Disarankan istirahat mikro 3 menit.",
    berisiko: "Beban kognitif tinggi. Istirahat mikro disarankan segera.",
    kritis:   "Kondisi kritis. Hentikan tugas safety-critical dan lapor supervisor.",
  }[stat] || "Pantau kondisi Anda sepanjang shift.";

  return (
  <div className="nt-screen" style={{ paddingBottom: 100 }}>
    <NeuroStatusBar time="11:42" />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}>
      <Link to="/w/readiness">
        <NeuroIconBtn size={40}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </NeuroIconBtn>
      </Link>
      <div style={{ fontSize: 10, letterSpacing: "0.24em", color: "var(--nt-text-2)", fontWeight: 600, whiteSpace: "nowrap" }}>
        LIVE MONITOR
      </div>
      <NeuroIconBtn size={40} active onClick={() => window.toast?.("Status alert: AKTIF, supervisor menerima notifikasi", { kind: "warn" })}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#ff7a7a",
          boxShadow: "0 0 8px #ff7a7a"
        }} />
      </NeuroIconBtn>
    </div>

    {/* Worker + connection */}
    <div style={{ padding: "12px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div className="nt-eyebrow">Shift berjalan</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: "var(--nt-text)", lineHeight: 1 }}>
          {elapsedLabel}
        </div>
        <div style={{ fontSize: 12, color: "var(--nt-text-2)", marginTop: 4 }}>
          {deviceLabel}
        </div>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 999,
        background: "var(--nt-surface)",
        boxShadow: "var(--nt-shadow-in)",
        fontSize: 11, color: "var(--nt-text-2)", fontWeight: 600
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%",
          background: window.NT_LIVE !== false ? "#7dd1a1" : "#94A3B8",
          boxShadow: window.NT_LIVE !== false ? "0 0 6px #7dd1a1" : "none" }} />
        BLE {ble}%
      </div>
    </div>

    {/* MAIN: Cognitive Load gauge + side fatigue gauge — live values */}
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 18 }}>
      <NeuroGauge
        value={cli}
        size={180}
        label={String(cli)}
        sublabel="cog. load"
        gradient={["#9c8bf0", "#6cb6f0"]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <NeuroGauge
          value={fi}
          size={92}
          label={String(fi)}
          sublabel="fatigue"
          gradient={["#7dd1a1", "#a8e0c0"]}
          thickness={12}
        />
        <NeuroGauge
          value={ei}
          size={92}
          label={String(ei)}
          sublabel="engage"
          gradient={["#ffc56a", "#ff8aa1"]}
          thickness={12}
        />
      </div>
    </div>

    {/* Current status text — drives off w.status (live) */}
    <div style={{ textAlign: "center", marginTop: 14 }}>
      <StatusPill status={stat} />
      <div style={{ fontSize: 12.5, color: "var(--nt-text-2)", marginTop: 8, padding: "0 36px", lineHeight: 1.45 }}>
        {stCopy}
      </div>
    </div>

    {/* EEG band power bars — live derivation from CLI/FI/EI */}
    <div className="neu-surface" style={{ margin: "16px 24px 0", padding: "16px 14px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>EEG Band Power</div>
        <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>10 s window</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", justifyItems: "center", marginTop: 6 }}>
        {eegBands.map((b) => (
          <NeuroBar key={b.l} value={b.v} color={b.c} label={b.l} sub={b.v + "%"} height={86} />
        ))}
      </div>
    </div>

    {/* Action: take micro break */}
    <div style={{ padding: "14px 24px 0", display: "flex", gap: 10 }}>
      <button
        onClick={() => setBreakModal(true)}
        style={{
          flex: 1,
          padding: "14px 16px",
          borderRadius: 18,
          border: "none",
          background: breakTimer !== null
            ? "linear-gradient(135deg, #7dd1a1, #a8e0c0)"
            : "linear-gradient(135deg, #3B82F6, #2563EB)",
          color: "white",
          fontWeight: 700, fontSize: 13.5,
          letterSpacing: "0.04em",
          boxShadow: "0 10px 24px rgba(58,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.32)",
          cursor: "pointer"
        }}>
        {breakTimer !== null
          ? `Istirahat Mikro · ${Math.floor(breakTimer / 60)}:${String(breakTimer % 60).padStart(2, "0")}`
          : "Mulai Istirahat Mikro · 3:00"}
      </button>
      <Link to="/w/stats">
        <NeuroIconBtn size={48}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </NeuroIconBtn>
      </Link>
    </div>

    <Modal
      open={breakModal}
      onClose={() => setBreakModal(false)}
      title="Mulai istirahat mikro?"
      subtitle="Tutup mata 3 menit, jauhkan dari layar. Supervisor akan diberi tahu Anda sedang istirahat mikro."
      tone="default"
      actions={
        <>
          <NeuroBtn tone="ghost" onClick={() => setBreakModal(false)}>Nanti saja</NeuroBtn>
          <NeuroBtn tone="primary" onClick={startBreak}>Mulai 3 menit</NeuroBtn>
        </>
      }
    />

    {/* Prediksi Kelelahan — tren FI dari ring-buffer (real DSP if paired) */}
    {(() => {
      const w = CURRENT_WORKER;
      const hist = (window.ntHistory && w && w.id ? window.ntHistory(w.id) : []) || [];
      const recent = hist.slice(-20);
      if (recent.length < 4) {
        return (
          <div className="neu-surface" style={{ margin: "14px 24px 0", padding: "14px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)", marginBottom: 4 }}>Prediksi Kelelahan</div>
            <div style={{ fontSize: 11.5, color: "var(--nt-text-3)" }}>Mengumpulkan data live… kembali lagi sebentar.</div>
          </div>
        );
      }
      const fi = recent.map((h) => h.fi);
      // Compute slope per minute using REAL time deltas between samples, so
      // it works for both the mock engine (1.5 s/tick) and the DSP (1 s/tick).
      const tSpanMs = Math.max(1, (recent[recent.length - 1].ts || 0) - (recent[0].ts || 0));
      const fiDelta = fi[fi.length - 1] - fi[0];
      const fiPerMin = (fiDelta / tSpanMs) * 60000;
      const slope = fiDelta / (fi.length - 1);
      // Prefer the DSP's own slope/ETA when a Muse is paired (more accurate
      // because it uses the actual EEG-derived FI not the smoothed history).
      const dspPred = (muse.real && window.ntMuseDSP && window.ntMuseDSP.predict) || null;
      const rising = dspPred ? dspPred.trend === "naik" : fiPerMin > 0.2;
      const eta = dspPred && rising
        ? Math.max(1, Math.round((dspPred.etaSec || 0) / 60))
        : (rising ? Math.max(1, Math.round((60 - (w.fi || 0)) / fiPerMin)) : null);
      const W = 280, H = 64, projN = 8;
      const all = [...fi];
      for (let i = 1; i <= projN; i++) all.push(Math.max(0, Math.min(100, fi[fi.length - 1] + slope * i)));
      const mn = Math.min(...all), mx = Math.max(...all);
      const span = Math.max(8, mx - mn);
      const xs = (i) => (i / (all.length - 1)) * W;
      const ys = (v) => H - ((v - mn) / span) * H * 0.82 - H * 0.09;
      const pts = all.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
      const splitX = xs(fi.length - 1);
      const ty = ys(60);
      return (
        <div className="neu-surface" style={{ margin: "14px 24px 0", padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Prediksi Kelelahan</div>
            <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, color: rising ? "#ff9d5c" : "#7dd1a1" }}>
              {rising ? "Tren naik" : "Tren stabil"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--nt-text-2)", lineHeight: 1.45, marginBottom: 8 }}>
            {rising && eta
              ? `Dengan tren ini, kamu diperkirakan masuk zona Berisiko dalam ~${eta} menit. Sempatkan istirahat mikro.`
              : "Tren membaik atau stabil. Ritme kamu sudah pas — lanjutkan dengan jeda berkala."}
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", maxWidth: W }}>
            <line x1="0" y1={ty} x2={W} y2={ty} stroke="rgba(255,157,92,0.45)" strokeDasharray="3 3" />
            <polyline points={pts} fill="none" stroke={rising ? "#ff9d5c" : "#7dd1a1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1={splitX} y1="0" x2={splitX} y2={H} stroke="var(--nt-text-3)" strokeOpacity="0.3" strokeDasharray="2 2" />
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--nt-text-3)", marginTop: 4 }}>
            <span>20 tick lalu</span><span>sekarang</span><span>+8 proyeksi</span>
          </div>
        </div>
      );
    })()}

    <NeuroTabBar active="brain" />
  </div>
  );
};

// Small card that asks Gemini (via ai-gemini.js → ntInsightMingguan) to
// summarise the ring-buffer into a single supportive sentence (R5).
const InsightAICard = () => {
  const [insight, setInsight] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const ask = async () => {
    if (typeof window.ntInsightMingguan !== "function") return;
    setBusy(true);
    try { setInsight(await window.ntInsightMingguan()); }
    catch (e) { setInsight("Gagal memuat insight. Coba lagi sebentar."); }
    finally { setBusy(false); }
  };
  return (
    <div className="neu-surface" style={{ margin: "14px 24px 0", padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Insight AI</div>
        <button onClick={ask} disabled={busy}
          style={{
            padding: "6px 12px", borderRadius: 999, border: "none", cursor: busy ? "wait" : "pointer",
            background: "linear-gradient(135deg, #3B82F6, #2563EB)",
            color: "white", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
            boxShadow: "0 4px 10px rgba(58,130,246,0.32)",
          }}>
          {busy ? "Memuat…" : insight ? "Refresh" : "Minta insight"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: insight ? "var(--nt-text)" : "var(--nt-text-3)", lineHeight: 1.5 }}>
        {insight || "Tekan tombol untuk meminta ringkasan pola Anda dari NeuroTech-AI."}
      </div>
    </div>
  );
};

// ── SCREEN 3: STATISTICS ──────────────────────────────────────────────────
const WorkerStats = () => {
  const [period, setPeriod] = React.useState("Minggu");
  const [periodOpen, setPeriodOpen] = React.useState(false);
  return (
  <div className="nt-screen" style={{ paddingBottom: 100 }}>
    <NeuroStatusBar time="15:08" />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}>
      <Link to="/w/readiness">
        <NeuroIconBtn size={40}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </NeuroIconBtn>
      </Link>
      <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--nt-text-2)", fontWeight: 600, whiteSpace: "nowrap" }}>STATISTIK</div>
      <NeuroIconBtn size={40} onClick={() => window.toast?.("Pencarian belum tersedia, fitur akan datang", { kind: "info" })}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      </NeuroIconBtn>
    </div>

    <div style={{ padding: "12px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div className="nt-eyebrow">Ringkasan minggu ini</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "var(--nt-text)", marginTop: 4, letterSpacing: "-0.01em" }}>5 Shift</div>
        <div style={{ fontSize: 12, color: "var(--nt-text-2)" }}>4 mei – 10 mei 2026</div>
      </div>
      <button
        onClick={() => setPeriodOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 999,
          background: "var(--nt-surface)",
          boxShadow: "var(--nt-shadow-out-sm)",
          fontSize: 11, color: "var(--nt-text-2)", fontWeight: 600,
          border: "none", cursor: "pointer", fontFamily: "inherit"
        }}>
        {period} ▾
      </button>
    </div>

    <Modal
      open={periodOpen}
      onClose={() => setPeriodOpen(false)}
      title="Pilih Periode"
      width={320}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {["Hari ini", "Minggu", "Bulan", "Kuartal"].map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setPeriodOpen(false); window.toast?.(`Periode: ${p}`, { kind: "info" }); }}
            style={{
              padding: "12px 14px", borderRadius: 12, border: "none",
              background: p === period ? "linear-gradient(135deg, #9c8bf0, #6cb6f0)" : "var(--nt-surface)",
              boxShadow: p === period ? "0 6px 14px rgba(108,182,240,0.32)" : "var(--nt-shadow-out-sm)",
              color: p === period ? "white" : "var(--nt-text)",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", textAlign: "left",
            }}>{p}</button>
        ))}
      </div>
    </Modal>

    {/* Main score donut + breakdown grid */}
    <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
      <NeuroGauge value={78} size={180} label="78" sublabel="K3 score" gradient={["#9c8bf0", "#6cb6f0"]} thickness={20} />
    </div>

    {/* 4 vertical bars: Fatigue / Load / Sleep / HRV, Relax/Cardio/Strength/Stretch analog */}
    <div className="neu-surface" style={{ margin: "20px 24px 0", padding: "18px 14px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Rerata Indeks</div>
        <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>vs baseline</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", justifyItems: "center", marginTop: 10 }}>
        <NeuroBar value={72} color={["#6cb6f0", "#8cc6f5"]} label="Kewaspadaan" sub="72%" height={100} />
        <NeuroBar value={28} color={["#b9adf5", "#cfc4f8"]} label="Fatigue" sub="28%" height={100} />
        <NeuroBar value={64} color={["#ffc56a", "#ffd791"]} label="Cog. Load" sub="64%" height={100} />
        <NeuroBar value={84} color={["#ff8aa1", "#ffaebb"]} label="Pemulihan" sub="84%" height={100} />
      </div>
    </div>

    {/* Weekly trend card — live animated when Muse is connected */}
    <div className="neu-surface-sm" style={{ margin: "14px 24px 0", padding: "14px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Fatigue trend</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--nt-text)", marginTop: 2 }}>Stabil <span style={{ fontSize: 12, color: "#7dd1a1" }}>↓ 6%</span></div>
        </div>
        <div style={{ fontSize: 11, color: "var(--nt-text-3)" }}>5 hari</div>
      </div>
      <div style={{ marginTop: 10 }}>
        <LiveSparkline index={42} trendDir={-1} color="#9c8bf0" height={60} viewH={28} />
      </div>
    </div>

    <InsightAICard />

    {/* Brain Timeline — severity-as-height bars + status distribution.
        Height communicates risk at a glance (so the timeline isn't a flat
        wall of color); microsleep events surface above with a soft glow;
        the chip row underneath shows how the shift breaks down by class. */}
    {(() => {
      const w = CURRENT_WORKER;
      const hist = (window.ntHistory && w && w.id ? window.ntHistory(w.id) : []) || [];
      const COLOR = { normal: "#7dd1a1", waspada: "#ffc56a", berisiko: "#ff9d5c", kritis: "#ff7a7a" };
      const SEV   = { normal: 0.22,      waspada: 0.50,      berisiko: 0.78,      kritis: 1.00 };
      const fmtHM = (ts) => {
        const d = new Date(ts);
        return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      };
      const fmtAgo = (ms) => {
        const m = Math.floor(ms / 60000);
        if (m < 1) return "baru saja";
        if (m < 60) return m + " menit lalu";
        return Math.floor(m / 60) + " jam lalu";
      };

      const counts = { normal: 0, waspada: 0, berisiko: 0, kritis: 0 };
      // Count microsleep EVENTS (rising edges) so a single 3-second
      // episode shows as 1, not 3. Prefer the DSP's session-cumulative
      // counter when paired — that one is monotonic across ring-buffer
      // rollover so users never see the count regress.
      let microsleepCount = 0;
      {
        let prevMs = false;
        hist.forEach((h) => {
          counts[h.status] = (counts[h.status] || 0) + 1;
          if (h.microsleep && !prevMs) microsleepCount++;
          prevMs = !!h.microsleep;
        });
      }
      const dspMs = window.ntMuseDSP && window.ntMuseDSP.microsleepEvents;
      if (typeof dspMs === "number") microsleepCount = dspMs;
      const total = hist.length || 1;
      const pct = (k) => Math.round((counts[k] || 0) / total * 100);

      const W = 312, BARS_H = 56, MS_H = 14;
      const barW = hist.length ? (W / hist.length) : 0;
      const tStart = hist.length ? hist[0].ts : Date.now();
      const tEnd   = hist.length ? hist[hist.length - 1].ts : Date.now();
      const ago = fmtAgo(Date.now() - tStart);

      return (
        <div className="neu-surface" style={{ margin: "14px 24px 0", padding: "14px 18px" }}>
          {/* Header — title + summary of microsleep / ticks */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Brain Timeline</div>
              <div style={{ fontSize: 10.5, color: "var(--nt-text-3)", marginTop: 3 }}>
                {microsleepCount > 0 && (
                  <span style={{ color: "#ff7a7a", fontWeight: 700 }}>
                    {microsleepCount} microsleep · </span>
                )}
                <span>{hist.length} titik · {ago}</span>
              </div>
            </div>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.18em",
              color: COLOR[w.status] || COLOR.normal, textTransform: "uppercase",
              padding: "3px 8px", borderRadius: 999,
              background: (COLOR[w.status] || COLOR.normal) + "22",
              border: "1px solid " + (COLOR[w.status] || COLOR.normal) + "55",
            }}>
              ● {w.status || "normal"}
            </div>
          </div>

          {hist.length < 2 ? (
            <div style={{ fontSize: 11.5, color: "var(--nt-text-3)", padding: "20px 0", textAlign: "center" }}>
              Menunggu data live…
            </div>
          ) : (
            <>
              {/* Severity bars + microsleep markers */}
              <svg width={W} height={BARS_H + MS_H + 4} viewBox={"0 0 " + W + " " + (BARS_H + MS_H + 4)}
                preserveAspectRatio="none" style={{ display: "block", width: "100%" }}>
                <defs>
                  {Object.keys(COLOR).map((k) => (
                    <linearGradient key={k} id={"bt-g-" + k} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={COLOR[k]} stopOpacity="0.95" />
                      <stop offset="100%" stopColor={COLOR[k]} stopOpacity="0.45" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Baseline */}
                <line x1="0" y1={MS_H + BARS_H + 1} x2={W} y2={MS_H + BARS_H + 1}
                  stroke="var(--nt-bg-deep)" strokeWidth="1" opacity="0.5" />

                {/* Severity bars — height encodes risk class so a calm
                    timeline looks visibly shorter than a critical one. */}
                {hist.map((h, i) => {
                  const sev = SEV[h.status] || 0.22;
                  const barH = sev * BARS_H;
                  return (
                    <rect key={i}
                      x={i * barW} y={MS_H + BARS_H - barH}
                      width={Math.max(1.4, barW - 0.6)} height={barH}
                      fill={"url(#bt-g-" + (h.status || "normal") + ")"}
                      rx="1.2" />
                  );
                })}

                {/* Most-recent indicator — soft pulse on the newest bar */}
                {(() => {
                  const last = hist[hist.length - 1];
                  const sev = SEV[last.status] || 0.22;
                  const cx = (hist.length - 0.5) * barW;
                  return (
                    <circle cx={cx} cy={MS_H + BARS_H - sev * BARS_H}
                      r="3.5" fill="none"
                      stroke={COLOR[last.status] || COLOR.normal}
                      strokeWidth="1.4" opacity="0.85">
                      <animate attributeName="r" values="3;6;3" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.85;0.2;0.85" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  );
                })()}

                {/* Microsleep markers — a dot with soft halo above the affected bar */}
                {hist.map((h, i) => h.microsleep ? (
                  <g key={"ms" + i} transform={"translate(" + (i * barW + barW / 2) + ", 6)"}>
                    <circle cx="0" cy="0" r="4" fill="#ff7a7a" opacity="0.25" />
                    <circle cx="0" cy="0" r="2"   fill="#ff7a7a" />
                  </g>
                ) : null)}
              </svg>

              {/* Time axis */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--nt-text-3)", marginTop: 4 }}>
                <span>{fmtHM(tStart)}</span>
                <span style={{ fontWeight: 700, color: "var(--nt-text-2)" }}>sekarang · {fmtHM(tEnd)}</span>
              </div>

              {/* Distribution chips — % of time in each class */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12 }}>
                {[
                  { k: "normal",   l: "Normal" },
                  { k: "waspada",  l: "Waspada" },
                  { k: "berisiko", l: "Berisiko" },
                  { k: "kritis",   l: "Kritis" },
                ].map((it) => {
                  const p = pct(it.k);
                  return (
                    <div key={it.k} style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      padding: "8px 4px", borderRadius: 10,
                      background: "var(--nt-bg-2)",
                      border: "1px solid " + COLOR[it.k] + (p > 0 ? "44" : "1a"),
                      opacity: p > 0 ? 1 : 0.55,
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 13, fontWeight: 800, color: "var(--nt-text)",
                        letterSpacing: "-0.01em",
                      }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: COLOR[it.k],
                          boxShadow: p > 0 ? "0 0 6px " + COLOR[it.k] + "66" : "none",
                        }} />
                        {p}%
                      </div>
                      <div style={{ fontSize: 9, color: "var(--nt-text-3)", marginTop: 2, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
                        {it.l}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    })()}

    <NeuroTabBar active="chart" />
  </div>
  );
};

Object.assign(window, { WorkerReadiness, WorkerLive, WorkerStats });


// Worker app, mobile screens — Kondisi (stres / microsleep / readiness) and
// Neurofeedback Audio. NeuroTech monitors workers DURING the shift, so the old
// "Sleep stages" screen is replaced by during-work wellbeing monitoring.

// ── Stress helper ──────────────────────────────────────────────────────────
// Stress rises with cognitive load and falls with heart-rate variability (HRV).
const stressOf = (w) => {
  const cli = w && typeof w.cli === "number" ? w.cli : 50;
  const hrv = w && typeof w.hrv === "number" ? w.hrv : 60;
  return Math.max(0, Math.min(100, Math.round(cli * 0.65 + (100 - hrv) * 0.35)));
};
const stressLevel = (v) =>
  v >= 75 ? "kritis" : v >= 58 ? "berisiko" : v >= 40 ? "waspada" : "normal";
const STRESS_GRAD = {
  normal:   ["#7dd1a1", "#a8e0c0"],
  waspada:  ["#ffc56a", "#ffd791"],
  berisiko: ["#ff9d5c", "#ffbf8c"],
  kritis:   ["#ff7a7a", "#ff9c9c"],
};

// ── SCREEN: KONDISI — stress level / microsleep / readiness ────────────────
const WorkerWellness = () => {
  const w = CURRENT_WORKER;
  const [infoOpen, setInfoOpen] = React.useState(false);

  const stress = stressOf(w);
  const lvl = stressLevel(stress);
  const grad = STRESS_GRAD[lvl];
  const microsleepCount = w.microsleep ? 2 : 0;

  const advice = {
    normal:   "Tingkat stres terkendali. Pertahankan ritme kerja dan ambil jeda singkat tiap jam.",
    waspada:  "Stres mulai naik. Coba sesi neurofeedback audio 5 menit untuk menenangkan pikiran.",
    berisiko: "Stres tinggi. Disarankan istirahat mikro dan audio relaksasi sebelum melanjutkan tugas.",
    kritis:   "Stres sangat tinggi dan ada microsleep. Hentikan tugas safety-critical, lapor supervisor.",
  }[lvl];

  // Stress over the last 8 hours — a plausible climb toward the current value.
  const trend = [26, 32, 30, 41, 47, 53, Math.max(38, stress - 9), stress];
  const microsleepEvents = w.microsleep
    ? [{ t: w.t, dur: "2.3 detik" }, { t: "10:54", dur: "1.6 detik" }]
    : [];

  return (
  <div className="nt-screen" style={{ paddingBottom: 100 }}>
    <NeuroStatusBar time="11:42" />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}>
      <Link to="/w/readiness">
        <NeuroIconBtn size={40}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </NeuroIconBtn>
      </Link>
      <div style={{ fontSize: 10, letterSpacing: "0.36em", color: "var(--nt-text-2)", fontWeight: 600, whiteSpace: "nowrap" }}>KONDISI</div>
      <NeuroIconBtn size={40} onClick={() => setInfoOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
      </NeuroIconBtn>
    </div>

    <Modal
      open={infoOpen}
      onClose={() => setInfoOpen(false)}
      title="Tentang Pemantauan Kondisi"
      subtitle="NeuroTech membaca tingkat stres dari rasio beban kognitif EEG dan variabilitas detak jantung (HRV) secara real-time selama shift. Microsleep terdeteksi dari pola gelombang theta dominan dan penurunan engagement mendadak. Skor readiness menilai kesiapan Anda. Data mentah tetap privat, hanya milik Anda."
      actions={<NeuroBtn tone="primary" onClick={() => setInfoOpen(false)}>Mengerti</NeuroBtn>}
    />

    <div style={{ padding: "16px 28px 0" }}>
      <div className="nt-eyebrow">Pemantauan saat shift</div>
      <div className="nt-title-lg">Tingkat Stres</div>
      <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 4 }}>{w.name} · {w.role}</div>
    </div>

    {/* Stress gauge */}
    <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
      <NeuroGauge value={stress} size={196} label={`${stress}`} sublabel="stres" gradient={grad} />
    </div>

    <div style={{ textAlign: "center", marginTop: 12, padding: "0 32px" }}>
      <StatusPill status={lvl} />
      <div style={{ fontSize: 12.5, color: "var(--nt-text-2)", marginTop: 10, lineHeight: 1.45 }}>{advice}</div>
    </div>

    {/* 3 metric cards: microsleep / readiness / recovery — unified blue
        icon boxes (matches Readiness palette). Values stay as is. */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "18px 24px 0" }}>
      {[
        { label: "Microsleep", value: microsleepCount, sub: w.microsleep ? `terakhir ${w.t}` : "shift ini",
          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg> },
        { label: "Readiness",  value: w.readiness,     sub: "skor pra-shift",
          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg> },
        { label: "Pemulihan",  value: w.hrv,           sub: "HRV · ms",
          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
      ].map((m, i) => (
        <div key={i} className="neu-surface-sm" style={{ padding: "12px 10px", textAlign: "center" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, margin: "0 auto 6px",
            background: "linear-gradient(135deg, rgba(96,165,250,0.26), rgba(37,99,235,0.10))",
            border: "1px solid rgba(96,165,250,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#3B82F6",
          }}>{m.icon}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--nt-text)" }}>{m.value}</div>
          <div style={{ fontSize: 9.5, color: "#3B82F6", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 3, fontWeight: 700 }}>{m.label}</div>
          <div style={{ fontSize: 9.5, color: "var(--nt-text-3)", marginTop: 2 }}>{m.sub}</div>
        </div>
      ))}
    </div>

    {/* Microsleep detail */}
    <div className="neu-surface" style={{ margin: "16px 24px 0", padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)" }}>Microsleep Detected</div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          color: w.microsleep ? "#ff7a7a" : "#7dd1a1",
        }}>{w.microsleep ? "Perlu Tindakan" : "Aman"}</span>
      </div>
      {microsleepEvents.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--nt-text-2)", lineHeight: 1.5 }}>
          Tidak ada episode microsleep terdeteksi pada shift ini. Kewaspadaan stabil.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {microsleepEvents.map((e, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 12,
              background: "var(--nt-bg)", boxShadow: "var(--nt-shadow-in)"
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff7a7a", boxShadow: "0 0 6px #ff7a7a" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--nt-text)", fontVariantNumeric: "tabular-nums" }}>{e.t}</span>
              <span style={{ fontSize: 12, color: "var(--nt-text-2)", flex: 1 }}>Theta-burst · durasi {e.dur}</span>
              <span style={{ fontSize: 10, color: "#ff7a7a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Microsleep</span>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Stress trend, last 8 hours */}
    <div className="neu-surface" style={{ margin: "14px 24px 0", padding: "16px 16px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Tren Stres</div>
        <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.16em", textTransform: "uppercase" }}>8 jam terakhir</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "stretch", height: 110, marginTop: 8 }}>
        {trend.map((v, i) => {
          const g = STRESS_GRAD[stressLevel(v)];
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: Math.max(8, v) + "%",
                  borderRadius: 8,
                  background: "linear-gradient(180deg, " + g[0] + ", " + g[1] + ")",
                  boxShadow: i === trend.length - 1 ? "0 4px 10px " + g[0] + "66" : "none",
                  transition: "height .4s cubic-bezier(.16,1,.3,1)",
                }} />
              </div>
              <div style={{ fontSize: 9, color: "var(--nt-text-3)", fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{v}</div>
            </div>
          );
        })}
      </div>
    </div>

    {/* CTA → neurofeedback audio — unified blue gradient (minimalist) */}
    <Link to="/w/audio">
      <div style={{
        margin: "14px 24px 0", padding: "16px 18px", borderRadius: 18,
        background: "linear-gradient(135deg, #3B82F6, #2563EB)",
        boxShadow: "0 10px 24px rgba(58,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.32)",
        display: "flex", alignItems: "center", gap: 14, cursor: "pointer"
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0,
          background: "rgba(255,255,255,0.20)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.6"/><rect x="17" y="14" width="4" height="7" rx="1.6"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Neurofeedback Audio</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
            Putar suara relaksasi untuk menurunkan stres &amp; fokus
          </div>
        </div>
        <span style={{ fontSize: 20, color: "white" }}>›</span>
      </div>
    </Link>

    <NeuroTabBar active="pulse" />
  </div>
  );
};

// ── Procedural audio engine (Web Audio API, no asset files) ────────────────
// Builds rain / ocean / wind / relaxation-music entirely from filtered noise
// and oscillators so it works offline with zero downloads.
const createNeuroAudio = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, live = [], curOut = null, vol = 0.7;

  const ensure = () => {
    if (!ctx && AC) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = vol;
      master.connect(ctx.destination);
    }
    return ctx;
  };
  const noise = () => {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    return s;
  };
  const stopNodes = (arr) => arr.forEach((n) => {
    try { n.stop && n.stop(); } catch (e) { /* already stopped */ }
    try { n.disconnect && n.disconnect(); } catch (e) { /* already gone */ }
  });

  const builders = {
    rain(out) {
      const s = noise();
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1100;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass";  lp.frequency.value = 8200;
      const g = ctx.createGain(); g.gain.value = 0.55;
      s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
      const lg = ctx.createGain(); lg.gain.value = 0.12;
      lfo.connect(lg); lg.connect(g.gain);
      s.start(); lfo.start();
      live.push(s, hp, lp, g, lfo, lg);
    },
    ocean(out) {
      const s = noise();
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520; lp.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = 0.5;
      s.connect(lp); lp.connect(g); g.connect(out);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
      const lg = ctx.createGain(); lg.gain.value = 0.42;
      lfo.connect(lg); lg.connect(g.gain);
      s.start(); lfo.start();
      live.push(s, lp, g, lfo, lg);
    },
    wind(out) {
      const s = noise();
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 480; bp.Q.value = 1.4;
      const g = ctx.createGain(); g.gain.value = 0.5;
      s.connect(bp); bp.connect(g); g.connect(out);
      const sweep = ctx.createOscillator(); sweep.frequency.value = 0.06;
      const sg = ctx.createGain(); sg.gain.value = 260;
      sweep.connect(sg); sg.connect(bp.frequency);
      const gust = ctx.createOscillator(); gust.frequency.value = 0.13;
      const gg = ctx.createGain(); gg.gain.value = 0.28;
      gust.connect(gg); gg.connect(g.gain);
      s.start(); sweep.start(); gust.start();
      live.push(s, bp, g, sweep, sg, gust, gg);
    },
    music(out) {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1150;
      const chord = ctx.createGain(); chord.gain.value = 0.24;
      lp.connect(chord); chord.connect(out);
      [220, 277.18, 329.63, 440].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
        o.detune.value = (i - 1.5) * 5;
        const og = ctx.createGain(); og.gain.value = 0.16;
        o.connect(og); og.connect(lp);
        o.start(); live.push(o, og);
      });
      const trem = ctx.createOscillator(); trem.frequency.value = 0.16;
      const tg = ctx.createGain(); tg.gain.value = 0.07;
      trem.connect(tg); tg.connect(chord.gain);
      trem.start();
      live.push(lp, chord, trem, tg);
    },
  };

  const play = (type) => {
    if (!ensure()) return false;
    if (ctx.state === "suspended") ctx.resume();
    stopNodes(live); live = [];
    const out = ctx.createGain();
    const t = ctx.currentTime;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(1, t + 1.1);
    out.connect(master);
    curOut = out;
    (builders[type] || builders.rain)(out);
    live.push(out);
    return true;
  };
  const stop = () => {
    if (ctx && curOut) {
      const t = ctx.currentTime;
      try {
        curOut.gain.cancelScheduledValues(t);
        curOut.gain.setValueAtTime(Math.max(0.0001, curOut.gain.value), t);
        curOut.gain.linearRampToValueAtTime(0.0001, t + 0.4);
      } catch (e) { /* ignore */ }
    }
    const old = live; live = []; curOut = null;
    setTimeout(() => stopNodes(old), 480);
  };
  const pause  = () => { if (ctx) ctx.suspend(); };
  const resume = () => { if (ctx) ctx.resume(); };
  const setVolume = (v) => { vol = v; if (master) master.gain.value = v; };
  const dispose = () => {
    stop();
    setTimeout(() => { try { ctx && ctx.close(); } catch (e) { /* ignore */ } ctx = null; }, 540);
  };
  return { play, stop, pause, resume, setVolume, dispose };
};

// ── SCREEN: NEUROFEEDBACK AUDIO ────────────────────────────────────────────
const NF_SOUNDS = [
  { id: "rain",  label: "Hujan",           desc: "Rintik hujan menenangkan", emoji: "🌧️", grad: ["#6cb6f0", "#8cc6f5"] },
  { id: "ocean", label: "Ombak Laut",      desc: "Deburan ombak perlahan",   emoji: "🌊", grad: ["#6cb6f0", "#7dd1a1"] },
  { id: "wind",  label: "Angin",           desc: "Hembusan angin lembut",    emoji: "🍃", grad: ["#7dd1a1", "#a8e0c0"] },
  { id: "music", label: "Musik Relaksasi", desc: "Nada ambient untuk fokus", emoji: "🎶", grad: ["#9c8bf0", "#b9adf5"] },
];
const NF_DURATIONS = [5, 10, 15, null];

const WorkerAudio = () => {
  const engineRef = React.useRef(null);
  const [current, setCurrent] = React.useState(null);
  const [paused, setPaused] = React.useState(false);
  const [volume, setVolume] = React.useState(0.7);
  const [elapsed, setElapsed] = React.useState(0);
  const [limit, setLimit] = React.useState(null); // session length in minutes
  const [inhale, setInhale] = React.useState(true);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const engine = () => {
    if (!engineRef.current) engineRef.current = createNeuroAudio();
    return engineRef.current;
  };
  const active = !!current && !paused;

  const pick = (id) => {
    const ok = engine().play(id);
    if (!ok) { window.toast?.("Browser tidak mendukung Web Audio.", { kind: "warn" }); return; }
    engine().setVolume(volume);
    if (!current) setElapsed(0);
    setCurrent(id); setPaused(false);
  };
  const togglePause = () => {
    if (!current) return;
    if (paused) { engine().resume(); setPaused(false); }
    else { engine().pause(); setPaused(true); }
  };
  const doStop = () => {
    engine().stop();
    setCurrent(null); setPaused(false); setElapsed(0);
  };
  const changeVol = (v) => { setVolume(v); engine().setVolume(v); };

  // Release the audio context when leaving the screen.
  React.useEffect(() => () => { engineRef.current && engineRef.current.dispose(); }, []);

  // Session timer.
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  // Auto-stop when the chosen duration is reached.
  React.useEffect(() => {
    if (current && limit && elapsed >= limit * 60) {
      doStop();
      window.toast?.("Sesi neurofeedback selesai. Semoga lebih tenang & fokus.", { kind: "success" });
    }
  }, [elapsed, limit, current]);

  // Breathing guide, paced ~4.6 s in / 4.6 s out.
  React.useEffect(() => {
    if (!active) { setInhale(true); return; }
    const t = setInterval(() => setInhale((x) => !x), 4600);
    return () => clearInterval(t);
  }, [active]);

  const sound = NF_SOUNDS.find((s) => s.id === current);
  const remain = limit ? Math.max(0, limit * 60 - elapsed) : elapsed;
  const timeText = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;

  return (
  <div className="nt-screen" style={{ paddingBottom: 100 }}>
    <style>{"@keyframes ntRing{0%{transform:scale(.55);opacity:.5}100%{transform:scale(1.9);opacity:0}}"}</style>
    <NeuroStatusBar time="11:50" />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}>
      <Link to="/w/wellness">
        <NeuroIconBtn size={40}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </NeuroIconBtn>
      </Link>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--nt-text-2)", fontWeight: 600, whiteSpace: "nowrap" }}>NEUROFEEDBACK</div>
      <NeuroIconBtn size={40} onClick={() => setInfoOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
      </NeuroIconBtn>
    </div>

    <Modal
      open={infoOpen}
      onClose={() => setInfoOpen(false)}
      title="Tentang Neurofeedback Audio"
      subtitle="Suara ambient menenangkan sistem saraf: ritme yang stabil membantu otak menurunkan beban kognitif dan stres, lalu meningkatkan fokus. Pakai saat istirahat mikro atau ketika kondisi menunjukkan stres tinggi. Lingkaran napas memandu pernapasan 4,6 detik tarik dan hembus."
      actions={<NeuroBtn tone="primary" onClick={() => setInfoOpen(false)}>Mengerti</NeuroBtn>}
    />

    <div style={{ padding: "16px 28px 0" }}>
      <div className="nt-eyebrow">Meditasi &amp; fokus</div>
      <div className="nt-title-lg">Audio Relaksasi</div>
      <div style={{ fontSize: 12.5, color: "var(--nt-text-2)", marginTop: 4, lineHeight: 1.45 }}>
        Pilih suara untuk membantu menurunkan stres dan menjaga fokus selama shift.
      </div>
    </div>

    {/* Now-playing visual with breathing guide */}
    <div className="neu-surface" style={{ margin: "16px 24px 0", padding: "20px 16px 18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 176, height: 176, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {active && sound && [0, 1, 2].map((i) => (
          <span key={i} style={{
            position: "absolute", width: 128, height: 128, borderRadius: "50%",
            border: `2px solid ${sound.grad[0]}`,
            animation: `ntRing 4.2s ease-out ${i * 1.4}s infinite`,
          }} />
        ))}
        <div style={{
          width: 128, height: 128, borderRadius: "50%",
          background: sound ? `linear-gradient(135deg, ${sound.grad[0]}, ${sound.grad[1]})` : "var(--nt-surface)",
          boxShadow: sound ? `0 12px 30px ${sound.grad[0]}66, inset 0 2px 6px rgba(255,255,255,0.35)` : "var(--nt-shadow-out)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 46,
          transform: `scale(${active ? (inhale ? 1 : 0.78) : 0.92})`,
          transition: "transform 4.5s ease-in-out, background .4s, box-shadow .4s",
        }}>{sound ? sound.emoji : "🎧"}</div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--nt-text)", marginTop: 14 }}>
        {sound ? sound.label : "Belum ada suara"}
      </div>
      <div style={{ fontSize: 12, color: "var(--nt-text-2)", marginTop: 4, minHeight: 17 }}>
        {!current
          ? "Pilih suara di bawah untuk memulai"
          : paused
            ? "Sesi dijeda"
            : inhale ? "Tarik napas perlahan…" : "Hembuskan perlahan…"}
      </div>
      {current && (
        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--nt-text)", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
          {timeText}
        </div>
      )}
      {current && (
        <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {limit ? "sisa waktu sesi" : "waktu berjalan"}
        </div>
      )}

      {/* Transport controls */}
      {current && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <NeuroBtn tone={paused ? "primary" : "default"} size="sm" onClick={togglePause}>
            {paused ? "▶  Lanjutkan" : "❚❚  Jeda"}
          </NeuroBtn>
          <NeuroBtn tone="danger" size="sm" onClick={doStop}>■  Berhenti</NeuroBtn>
        </div>
      )}
    </div>

    {/* Volume */}
    <div className="neu-surface-sm" style={{ margin: "14px 24px 0", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 16 }}>🔉</span>
      <input
        type="range" min="0" max="1" step="0.01" value={volume}
        onChange={(e) => changeVol(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "#9c8bf0", cursor: "pointer" }}
        aria-label="Volume"
      />
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--nt-text-2)", width: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {Math.round(volume * 100)}%
      </span>
    </div>

    {/* Session duration */}
    <div style={{ padding: "14px 24px 0" }}>
      <div className="nt-eyebrow" style={{ marginBottom: 8 }}>Durasi sesi</div>
      <div style={{ display: "flex", gap: 8 }}>
        {NF_DURATIONS.map((d) => {
          const on = limit === d;
          return (
            <button key={String(d)} onClick={() => setLimit(d)} style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
              background: on ? "linear-gradient(135deg, #9c8bf0, #6cb6f0)" : "var(--nt-surface)",
              boxShadow: on ? "0 6px 14px rgba(108,182,240,0.32)" : "var(--nt-shadow-out-sm)",
              color: on ? "white" : "var(--nt-text-2)",
              fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer"
            }}>{d ? `${d} mnt` : "Bebas"}</button>
          );
        })}
      </div>
    </div>

    {/* Sound picker */}
    <div style={{ padding: "16px 24px 0" }}>
      <div className="nt-eyebrow" style={{ marginBottom: 8 }}>Pilih suara</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {NF_SOUNDS.map((s) => {
          const on = current === s.id;
          return (
            <button key={s.id} onClick={() => pick(s.id)} style={{
              textAlign: "left", border: "none", cursor: "pointer", fontFamily: "inherit",
              padding: "14px 14px", borderRadius: 16,
              background: "var(--nt-surface)",
              boxShadow: on ? "var(--nt-shadow-in)" : "var(--nt-shadow-out-sm)",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})`,
                boxShadow: `0 5px 12px ${s.grad[0]}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, marginBottom: 10
              }}>{s.emoji}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: on ? "var(--nt-brand-mid)" : "var(--nt-text)" }}>
                {s.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2, lineHeight: 1.35 }}>{s.desc}</div>
              {on && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--nt-brand-mid)", marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {paused ? "Dijeda" : "● Diputar"}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>

    <NeuroTabBar active="audio" />
  </div>
  );
};

Object.assign(window, { WorkerWellness, WorkerAudio, stressOf, stressLevel });
