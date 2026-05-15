// Worker app — mobile screens (360x780). Neumorphism style matching reference.

// ── SCREEN 1: PRA-SHIFT / READINESS ─────────────────────────────────────────
const WorkerReadiness = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
  <div className="nt-screen" style={{ paddingBottom: 100 }}>
    <NeuroStatusBar time="06:48" />

    {/* Top app bar */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 24px 0" }}>
      <NeuroIconBtn size={40} onClick={() => setMenuOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </NeuroIconBtn>
      <div style={{ fontSize: 12, letterSpacing: "0.42em", color: "var(--nt-text-2)", fontWeight: 600 }}>
        N E U R O T E C H
      </div>
      <Link to="/w/profile">
        <NeuroIconBtn size={40}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
        </NeuroIconBtn>
      </Link>
    </div>

    <Modal
      open={menuOpen}
      onClose={() => setMenuOpen(false)}
      title="Menu Pekerja"
      subtitle="Pilih halaman yang ingin dibuka.">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { to: "/w/readiness", l: "Readiness · Pra-shift" },
          { to: "/w/live",      l: "Live · Monitoring shift" },
          { to: "/w/sleep",     l: "Tidur · Sleep stages" },
          { to: "/w/stats",     l: "Statistik · Ringkasan minggu" },
          { to: "/w/profile",   l: "Profil & pengaturan" },
        ].map((m, i) => (
          <Link key={i} to={m.to} onClick={() => setMenuOpen(false)}>
            <div style={{
              padding: "12px 14px", borderRadius: 12,
              background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-out-sm)",
              fontSize: 13, fontWeight: 600, color: "var(--nt-text)",
            }}>{m.l}</div>
          </Link>
        ))}
      </div>
    </Modal>

    {/* Greeting */}
    <div style={{ padding: "18px 28px 0" }}>
      <div className="nt-eyebrow" style={{ marginBottom: 6 }}>Selamat pagi</div>
      <div className="nt-title-lg">Rizky A.</div>
      <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 4 }}>
        Shift Pagi · 07:00–15:00 · Operator CCR
      </div>
    </div>

    {/* Readiness gauge */}
    <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
      <NeuroGauge
        value={82}
        size={210}
        label="82"
        sublabel="readiness"
        gradient={["#6cb6f0", "#9c8bf0"]}
      />
    </div>

    <div style={{ textAlign: "center", marginTop: 14, padding: "0 32px" }}>
      <StatusPill status="normal" />
      <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 10, lineHeight: 1.45 }}>
        Tidur cukup, sleep debt rendah. Anda siap menjalani shift hari ini.
      </div>
    </div>

    {/* 3 mini metric cards (sleep / debt / hrv) */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "20px 24px 0" }}>
      {[
        { label: "Tidur", value: "7j 12m", color: ["#9c8bf0", "#b9adf5"], icon: "🌙" },
        { label: "Sleep debt", value: "0.4 j",  color: ["#6cb6f0", "#8cc6f5"], icon: "⏳" },
        { label: "HRV",   value: "62 ms", color: ["#7dd1a1", "#a8e0c0"], icon: "♡" },
      ].map((m, i) => (
        <div key={i} className="neu-surface-sm" style={{ padding: "12px 10px", textAlign: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 10, margin: "0 auto 6px",
            background: `linear-gradient(135deg, ${m.color[0]}, ${m.color[1]})`,
            boxShadow: `0 4px 10px ${m.color[0]}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 13
          }}>{m.icon}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--nt-text)" }}>{m.value}</div>
          <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>{m.label}</div>
        </div>
      ))}
    </div>

    {/* Pre-shift checklist card */}
    <div className="neu-surface" style={{ margin: "18px 24px 0", padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--nt-text)" }}>Persiapan Shift</div>
        <div style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>2 / 3</div>
      </div>
      {[
        { label: "Muse S — tidur tersinkron", done: true },
        { label: "Kalibrasi baseline tersimpan", done: true },
        { label: "Pasang headband sebelum 07:00", done: false },
      ].map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
          <div style={{
            width: 22, height: 22, borderRadius: 8,
            background: "var(--nt-surface)",
            boxShadow: c.done ? "var(--nt-shadow-in)" : "var(--nt-shadow-out-sm)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: c.done ? "#7dd1a1" : "var(--nt-text-3)"
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

  return (
  <div className="nt-screen" style={{ paddingBottom: 100 }}>
    <NeuroStatusBar time="11:42" />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}>
      <Link to="/w/readiness">
        <NeuroIconBtn size={40}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </NeuroIconBtn>
      </Link>
      <div style={{ fontSize: 12, letterSpacing: "0.42em", color: "var(--nt-text-2)", fontWeight: 600 }}>
        L I V E &nbsp; M O N I T O R
      </div>
      <NeuroIconBtn size={40} active onClick={() => window.toast?.("Status alert: AKTIF — supervisor menerima notifikasi", { kind: "warn" })}>
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
          4 j 42 m
        </div>
        <div style={{ fontSize: 12, color: "var(--nt-text-2)", marginTop: 4 }}>
          Muse S · TP9 · AF7 · AF8 · TP10
        </div>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 999,
        background: "var(--nt-surface)",
        boxShadow: "var(--nt-shadow-in)",
        fontSize: 11, color: "var(--nt-text-2)", fontWeight: 600
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7dd1a1", boxShadow: "0 0 6px #7dd1a1" }} />
        BLE 64%
      </div>
    </div>

    {/* MAIN: Cognitive Load gauge + side fatigue gauge */}
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 18 }}>
      <NeuroGauge
        value={64}
        size={180}
        label="64"
        sublabel="cog. load"
        gradient={["#9c8bf0", "#6cb6f0"]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <NeuroGauge
          value={38}
          size={92}
          label="38"
          sublabel="fatigue"
          gradient={["#7dd1a1", "#a8e0c0"]}
          thickness={12}
        />
        <NeuroGauge
          value={71}
          size={92}
          label="71"
          sublabel="engage"
          gradient={["#ffc56a", "#ff8aa1"]}
          thickness={12}
        />
      </div>
    </div>

    {/* Current status text */}
    <div style={{ textAlign: "center", marginTop: 14 }}>
      <StatusPill status="waspada" />
      <div style={{ fontSize: 12.5, color: "var(--nt-text-2)", marginTop: 8, padding: "0 36px", lineHeight: 1.45 }}>
        Beban kognitif naik 14 menit terakhir. Disarankan istirahat mikro 3 menit.
      </div>
    </div>

    {/* EEG band power bars (live) — like Relax/Cardio/Strength/Stretch */}
    <div className="neu-surface" style={{ margin: "16px 24px 0", padding: "16px 14px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>EEG Band Power</div>
        <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>10 s window</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", justifyItems: "center", marginTop: 6 }}>
        <NeuroBar value={42} color={["#6cb6f0", "#8cc6f5"]} label="Delta" sub="42%" height={86} />
        <NeuroBar value={71} color={["#9c8bf0", "#b9adf5"]} label="Theta" sub="71%" height={86} />
        <NeuroBar value={28} color={["#ff8aa1", "#ffaebb"]} label="Alpha" sub="28%" height={86} />
        <NeuroBar value={54} color={["#ffc56a", "#ffd791"]} label="Beta"  sub="54%" height={86} />
        <NeuroBar value={18} color={["#7dd1a1", "#a8e0c0"]} label="Gamma" sub="18%" height={86} />
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
            : "linear-gradient(135deg, #9c8bf0, #6cb6f0)",
          color: "white",
          fontWeight: 700, fontSize: 13.5,
          letterSpacing: "0.04em",
          boxShadow: "0 10px 24px rgba(108,182,240,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
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

    <NeuroTabBar active="brain" />
  </div>
  );
};

// ── SCREEN 3: SLEEP DETAIL ────────────────────────────────────────────────
const WorkerSleep = () => {
  const [infoOpen, setInfoOpen] = React.useState(false);
  return (
  <div className="nt-screen" style={{ paddingBottom: 100 }}>
    <NeuroStatusBar time="06:40" />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}>
      <Link to="/w/readiness">
        <NeuroIconBtn size={40}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </NeuroIconBtn>
      </Link>
      <div style={{ fontSize: 12, letterSpacing: "0.42em", color: "var(--nt-text-2)", fontWeight: 600 }}>S L E E P</div>
      <NeuroIconBtn size={40} onClick={() => setInfoOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
      </NeuroIconBtn>
    </div>

    <Modal
      open={infoOpen}
      onClose={() => setInfoOpen(false)}
      title="Tentang Sleep Stages"
      subtitle="Tahap tidur dideteksi via Muse S — kombinasi EEG, gerakan, dan HRV. Skor tidur (Sleep Score) menggabungkan durasi, efisiensi, dan komposisi REM/Deep. Data hanya bisa dilihat oleh Anda sendiri."
      actions={<NeuroBtn tone="primary" onClick={() => setInfoOpen(false)}>Mengerti</NeuroBtn>}
    />

    <div style={{ padding: "16px 28px 0" }}>
      <div className="nt-eyebrow">Tidur · 13 Mei 22:48 → 06:00</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
        <div className="nt-title-lg">7j 12m</div>
        <div style={{ fontSize: 13, color: "var(--nt-text-2)" }}>· efisiensi 89%</div>
      </div>
    </div>

    {/* Sleep stages bar */}
    <div className="neu-surface" style={{ margin: "18px 24px 0", padding: "16px 16px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Sleep Stages</div>
        <div style={{ fontSize: 11, color: "var(--nt-text-3)" }}>22:48 — 06:00</div>
      </div>
      {/* hypnogram-ish stacked bars */}
      <div style={{ display: "flex", height: 78, gap: 2, borderRadius: 12, overflow: "hidden", boxShadow: "var(--nt-shadow-in)" }}>
        {[
          ["#b9adf5", 8, "Awake"],
          ["#6cb6f0", 18, "Light"],
          ["#9c8bf0", 14, "Deep"],
          ["#6cb6f0", 12, "Light"],
          ["#ff8aa1", 16, "REM"],
          ["#9c8bf0", 8, "Deep"],
          ["#6cb6f0", 14, "Light"],
          ["#ff8aa1", 10, "REM"],
        ].map(([c, w], i) => (
          <div key={i} style={{
            flex: w, height: "100%",
            background: `linear-gradient(180deg, ${c}, ${c}cc)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3)`
          }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 14 }}>
        {[
          { c: "#b9adf5", l: "Awake", v: "0:36" },
          { c: "#6cb6f0", l: "Light", v: "3:28" },
          { c: "#9c8bf0", l: "Deep",  v: "1:42" },
          { c: "#ff8aa1", l: "REM",   v: "1:26" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.c }} />
              <span style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.l}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)" }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Score + sleep debt */}
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14, padding: "16px 24px 0" }}>
      <div className="neu-surface" style={{ padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div className="nt-eyebrow">Sleep score</div>
        <NeuroGauge value={84} size={120} label="84" sublabel="of 100" gradient={["#9c8bf0", "#b9adf5"]} thickness={14} />
      </div>
      <div className="neu-surface" style={{ padding: "16px 14px" }}>
        <div className="nt-eyebrow">Sleep debt</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "var(--nt-text)", marginTop: 8 }}>0.4<span style={{ fontSize: 14, color: "var(--nt-text-3)", marginLeft: 4 }}>jam</span></div>
        <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>Akumulasi 7 hari terakhir</div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 38, marginTop: 12 }}>
          {[60, 75, 45, 80, 88, 70, 84].map((h, i) => (
            <div key={i} style={{
              flex: 1, height: `${h}%`,
              borderRadius: 4,
              background: i === 6 ? "linear-gradient(180deg,#9c8bf0,#6cb6f0)" : "var(--nt-bg-deep)",
              boxShadow: i === 6 ? "0 2px 6px rgba(156,139,240,0.4)" : "none"
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "var(--nt-text-3)" }}>
          <span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span>M</span>
        </div>
      </div>
    </div>

    {/* HRV mini */}
    <div className="neu-surface-sm" style={{ margin: "14px 24px 0", padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: "linear-gradient(135deg,#7dd1a1,#a8e0c0)",
        boxShadow: "0 4px 10px rgba(125,209,161,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white"
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-5 3 10 2-5h7"/></svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>HRV semalam · RMSSD</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--nt-text)", marginTop: 2 }}>62 ms <span style={{ fontSize: 12, color: "#7dd1a1" }}>↑ 8%</span></div>
      </div>
      <EEGWave width={70} height={28} color="#7dd1a1" seed={3} />
    </div>

    <NeuroTabBar active="moon" />
  </div>
  );
};

// ── SCREEN 4: STATISTICS ──────────────────────────────────────────────────
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
      <div style={{ fontSize: 12, letterSpacing: "0.42em", color: "var(--nt-text-2)", fontWeight: 600 }}>S T A T I S T I K</div>
      <NeuroIconBtn size={40} onClick={() => window.toast?.("Pencarian belum tersedia — fitur akan datang", { kind: "info" })}>
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

    {/* 4 vertical bars: Fatigue / Load / Sleep / HRV — Relax/Cardio/Strength/Stretch analog */}
    <div className="neu-surface" style={{ margin: "20px 24px 0", padding: "18px 14px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Rerata Indeks</div>
        <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>vs baseline</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", justifyItems: "center", marginTop: 10 }}>
        <NeuroBar value={72} color={["#6cb6f0", "#8cc6f5"]} label="Kewaspadaan" sub="72%" height={100} />
        <NeuroBar value={28} color={["#b9adf5", "#cfc4f8"]} label="Fatigue" sub="28%" height={100} />
        <NeuroBar value={64} color={["#ffc56a", "#ffd791"]} label="Cog. Load" sub="64%" height={100} />
        <NeuroBar value={84} color={["#ff8aa1", "#ffaebb"]} label="Sleep" sub="84%" height={100} />
      </div>
    </div>

    {/* Weekly trend card */}
    <div className="neu-surface-sm" style={{ margin: "14px 24px 0", padding: "14px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Fatigue trend</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--nt-text)", marginTop: 2 }}>Stabil <span style={{ fontSize: 12, color: "#7dd1a1" }}>↓ 6%</span></div>
        </div>
        <div style={{ fontSize: 11, color: "var(--nt-text-3)" }}>5 hari</div>
      </div>
      {/* Mini area chart */}
      <svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none" style={{ marginTop: 8 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9c8bf0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9c8bf0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,30 L40,24 L80,32 L120,18 L160,26 L200,14 L240,22 L300,12 L300,60 L0,60 Z" fill="url(#trendFill)" />
        <path d="M0,30 L40,24 L80,32 L120,18 L160,26 L200,14 L240,22 L300,12" fill="none" stroke="#9c8bf0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {[0, 40, 80, 120, 160, 200, 240, 300].map((x, i) => (
          <circle key={i} cx={x} cy={[30,24,32,18,26,14,22,12][i]} r="2" fill="white" stroke="#9c8bf0" strokeWidth="1.5" />
        ))}
      </svg>
    </div>

    <NeuroTabBar active="chart" />
  </div>
  );
};

Object.assign(window, { WorkerReadiness, WorkerLive, WorkerSleep, WorkerStats });
