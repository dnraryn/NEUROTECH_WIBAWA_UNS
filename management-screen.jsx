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
  if (session) {
    NAV[0].to = "/m/overview";
    NAV.find(n=>n.id === "report").to = "/m/reports";
    NAV.splice(1,0,
      {id:"workers",label:"Anggota",to:"/m/workers",icon:<VisualIcon name="team" size={16}/>},
      {id:"alerts",label:"Alert pekerja",to:"/m/alerts",icon:<VisualIcon name="message" size={16}/>},
      {id:"schedule",label:"Jadwal shift",to:"/m/schedule",icon:<VisualIcon name="history" size={16}/>});
  }

  const navIndex = (zoomKey) => NAV.findIndex((n) => n.zoom === zoomKey);

  // Magic-line indicator state — see SupervisorSidebar for the full pattern.
  const navRef = React.useRef(null);
  const btnRefs = React.useRef({});
  const [hl, setHl] = React.useState(_mgmtLastActive);
  const [pos, setPos] = React.useState({ top: 0, height: 0, ready: false });
  React.useEffect(() => {
    const sync = () => { const current = window._mgmtCurrentZoom || "overview"; setHl(current); _mgmtLastActive = current; };
    window.addEventListener("nt-management-zoom", sync);
    return () => window.removeEventListener("nt-management-zoom", sync);
  }, []);

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
    if ((it.zoom || it.id === "settings") && !window._mgmtOpenZoom) {
      window._mgmtPendingZoom = it.zoom || "settings"; navigate("/m/overview"); return;
    }
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
      window._mgmtOpenZoom?.(null, "up");
      window.toast?.("Anda sudah di Overview.", { kind: "info", duration: 1400 });
      return;
    }
    if (it.id === "settings") window._mgmtOpenZoom?.("settings", "down");
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
          {session ? <div className="workspace-sidebar-heading"><span>NEUROTECH</span><strong>Manajemen K3</strong></div> : <NeuroLogo size={22}/>}
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
            <button key={it.id} type="button" onClick={() => go(it)} aria-label={it.id === "lini" && session ? "Indeks Shift" : it.label} aria-pressed={on}
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
              <span className="nt-sb-label" style={{ flex: 1 }}>{it.id === "lini" && session ? "Indeks Shift" : it.label}</span>
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
  const session = window.ntSession?.get();
  const archive = useSessionArchive();
  const companyView = !!session;
  const [now, setNow] = React.useState(Date.now());
  const [signalDetails, setSignalDetails] = React.useState(false);
  const [diagnosticsBusy, setDiagnosticsBusy] = React.useState(false);
  const [archiveInitialId, setArchiveInitialId] = React.useState(null);
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [metricsDraft, setMetricsDraft] = React.useState(null);
  const [metricsError, setMetricsError] = React.useState("");
  const [chartMetric, setChartMetric] = React.useState(null);
  React.useEffect(() => {
    if (companyView) return;
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    window.addEventListener("nt-device", update);
    window.addEventListener("nt-data", update);
    return () => { clearInterval(timer); window.removeEventListener("nt-device", update); window.removeEventListener("nt-data", update); };
  }, [companyView]);
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
    if (window._mgmtPendingZoom) { fn(window._mgmtPendingZoom); delete window._mgmtPendingZoom; }
    return () => { if (window._mgmtOpenZoom === fn) delete window._mgmtOpenZoom; };
  }, []);
  React.useEffect(() => { window._mgmtCurrentZoom = zoom; window.dispatchEvent(new Event("nt-management-zoom")); }, [zoom]);

  // Real-time header values — today's date + actual worker count.
  const _today = new Date();
  const dateLabel = _MGMT_DAYS[_today.getDay()] + ", " + _today.getDate() + " " +
    _MGMT_MONTHS[_today.getMonth()] + " " + _today.getFullYear();
  const workerCount = (typeof WORKERS !== "undefined" && WORKERS) ? WORKERS.length : 0;

  const demo = !window.ntSession?.get() && !window.ntMuseConnected && window.NT_LIVE !== false;
  const device = window.ntMuse?.status?.() || {};
  const dsp = window.ntMuseDSP || {};
  const personalMetrics = window.ntSessionMetrics.get();
  const openMetrics = () => {
    setMetricsDraft({ targetMinutes: String(personalMetrics.targetMinutes), sleepTargetHours: String(personalMetrics.sleepTargetHours),
      sleptHours: personalMetrics.sleptHours === null ? "" : String(personalMetrics.sleptHours) });
    setMetricsError(""); setMetricsOpen(true);
  };
  const saveMetrics = (event) => {
    event.preventDefault();
    try {
      const saved = window.ntSessionMetrics.update({ targetMinutes: Number(metricsDraft.targetMinutes),
        sleepTargetHours: Number(metricsDraft.sleepTargetHours), sleptHours: metricsDraft.sleptHours.trim() === "" ? null : Number(metricsDraft.sleptHours) });
      setMetricsOpen(false); setNow(Date.now());
      window.toast?.(!saved.personal ? "Data tersedia selama sesi demo ini." : saved.persisted ? "Data sesi disimpan di browser ini." : "Data tersedia untuk sesi ini; penyimpanan browser tidak diizinkan.", { kind: "info" });
    } catch (error) { setMetricsError(error.message); }
  };
  const diagnostics = window.ntMuseDiagnostics?.status?.() || {};
  const toggleDiagnostics = async () => {
    if (diagnosticsBusy) return;
    setDiagnosticsBusy(true);
    try {
      if (diagnostics.active) await window.ntMuseDiagnostics.stop();
      else await window.ntMuseDiagnostics.start();
    } finally { setDiagnosticsBusy(false); setNow(Date.now()); }
  };
  const live = window.ntManagement.snapshot({ now, device, dsp, period, demo,
    history: window.ntHistory?.(window.CURRENT_WORKER?.id) || [] });
  const company = React.useMemo(() => window.ntSessionInsights.aggregate(archive, { days: [7, 30, 90, 365][period] }), [archive, period]);
  const exportRows = () => {
    if (companyView) {
      if (!company.rows.length) { window.toast?.("Belum ada sesi tersimpan pada periode ini.", { kind: "info" }); return; }
      archiveSummaryDownload(company.rows);
      return;
    }
    if (!live.history.length) { window.toast?.("Belum ada hasil EEG bersih untuk diekspor.", { kind: "info" }); return; }
    window.ntReports.download(window.ntReports.live(live.history), window.ntReports.filename(demo ? "SIMULASI-Live" : "Live-Perangkat"));
  };
  const heatRows = demo ? [
    { l: "Pagi",   h: [22, 18, 24, 35, 48, 52, 58, 46] },
    { l: "Sore",   h: [28, 32, 38, 52, 62, 71, 78, 64] },
    { l: "Malam",  h: [42, 48, 58, 72, 86, 92, 88, 76] },
    { l: "Lembur", h: [38, 44, 56, 68, 80, 86, 78, 70] },
  ] : companyView ? company.heatRows : live.heatRows;

  const lini = demo ? [
    { l: "Lab",       v: 32 },
    { l: "CCR",       v: 46 },
    { l: "Dispatch",  v: 58 },
    { l: "Transport", v: 71 },
    { l: "Security",  v: 64 },
  ] : companyView ? company.shiftIndices : live.lini;

  const insights = demo ? [
    { tier: "critical", icon: "⚠", t: "Shift malam jam +5/+6, fatigue puncak",     d: "Pertimbangkan istirahat wajib 15 menit pada +4j; rotasi tugas di +6j." },
    { tier: "high",     icon: "🚛", t: "Transport: sleep debt rata-rata 2.1 j",     d: "5 pekerja konsisten readiness < 60. Tinjau jadwal off-day." },
    { tier: "medium",   icon: "📐", t: "Pola fatigue konsisten ≥ 3 minggu",         d: "Cukup data untuk evaluasi formal desain shift di audit triwulan." },
    { tier: "low",      icon: "✓", t: "Lini Lab, risiko rendah berkelanjutan",     d: "Pola istirahat eksisting bisa jadi referensi internal." },
  ] : companyView ? [{ tier: "medium", icon: "•", t: company.clean ? `Rerata FI ${company.meanFI}/100 dari ${company.sessions} sesi tersimpan.` : "Belum ada hasil EEG bersih pada periode ini.", d: `${company.members} anggota dengan sesi; ${company.partial} hasil terbatas tidak masuk rerata. Tinjau kualitas sinyal dan evaluasi petugas pada laporan K3.` }] : [live.insight];
  const kpis = demo ? [
    { l: "KEPATUHAN", v: "92%", sub: "Headband terpasang", trend: "+3%", dir: 1 },
    { l: "INSIDEN FATIGUE", v: "11", sub: "Microsleep · alert", trend: "−24%", dir: -1 },
    { l: "SLEEP DEBT", v: "1.2 j", sub: "Rerata / pekerja", trend: "−0.3", dir: -1 },
    { l: "JAM PANTAU", v: "11.4k", sub: "Total jam EEG", trend: "+18%", dir: 1 },
  ] : companyView ? [
    { l: "CAKUPAN TARGET PANTAU", v: company.compliance === null ? "—" : archiveNumber(company.compliance, 1) + "%", sub: `${company.complianceDays} catatan anggota/hari · rerata terhadap target yang dilaporkan`, trend: "Arsip perusahaan", progress: company.compliance },
    { l: "INDIKASI MICROSLEEP", v: company.sessions ? String(company.incidents) : "—", sub: "Kejadian dari hasil EEG bersih tersimpan", trend: `${company.sessions} sesi` },
    { l: "KEKURANGAN TIDUR", v: company.sleepDebt === null ? "Belum diisi" : archiveNumber(company.sleepDebt, 1) + " j", sub: `Laporan tidur terakhir dari ${company.sleepReportedMembers} anggota pada periode ini`, trend: "Laporan mandiri" },
    { l: "JAM PANTAU", v: archiveNumber(company.receivedMinutes / 60, 2) + " j", sub: "Total EEG diterima pada sesi dalam periode", trend: `${company.members} anggota` },
  ] : [
    { l: "KEPATUHAN", v: personalMetrics.compliance.toFixed(1) + "%", sub: `${personalMetrics.receivedMinutes.toFixed(1)} / ${personalMetrics.targetMinutes} menit target hari ini`, trend: "Target pantau", action: "Ubah target", progress: personalMetrics.compliance },
    { l: "INSIDEN FATIGUE", v: live.history.length ? String(live.incidents) : "—", sub: live.history.length ? "Indikasi microsleep · EEG bersih" : "Menunggu pengukuran EEG bersih", trend: "Sesi ini" },
    { l: "SLEEP DEBT", v: personalMetrics.sleepDebt === null ? "Isi tidur" : personalMetrics.sleepDebt.toFixed(1) + " j", sub: personalMetrics.sleptHours === null ? "Catat tidur terakhir untuk menghitung" : `Tidur ${personalMetrics.sleptHours} j · target ${personalMetrics.sleepTargetHours} j`, trend: "Laporan mandiri", action: "Catat tidur" },
    { l: "JAM PANTAU", v: personalMetrics.receivedMinutes < 60 ? personalMetrics.receivedMinutes.toFixed(1) + " m" : (personalMetrics.receivedMinutes / 60).toFixed(2) + " j", sub: "Total EEG diterima hari ini · browser ini", trend: "Hari ini" },
  ];
  const resultMetrics = [
    { key: "fi", label: "Fatigue Index", color: "#7c3aed", meaning: "Indeks pola kelelahan relatif." },
    { key: "cli", label: "Cognitive Load", color: "#2563eb", meaning: "Indeks beban kognitif relatif." },
    { key: "ei", label: "Engagement", color: "#15803d", meaning: "Indeks keterlibatan, bukan persentase fokus." },
  ];
  const classLabels = { normal: "Normal", waspada: "Waspada", berisiko: "Berisiko", kritis: "Kritis" };
  const classColors = { normal: "#15803d", waspada: "#a16207", berisiko: "#c2410c", kritis: "#b91c1c" };
  const currentClass = live.latest?.instantStatus || live.latest?.status;

  return (
  <div className="nt-screen frm-dashboard" style={{ padding: 0, display: "grid", gridTemplateColumns: "204px 1fr", overflow: "hidden" }}>
    <ManagementSidebar active="overview" />

    <main style={{ padding: "22px 28px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", overflowX: "hidden" }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="frm-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div className="nt-eyebrow" style={{ fontSize: 10 }}>{dateLabel}</div>
          <div style={{ fontSize: 25, fontWeight: 800, color: "var(--nt-text)", marginTop: 4, letterSpacing: "-0.02em" }}>
            Fatigue Risk Management
          </div>
          <div style={{ fontSize: 11.5, color: "var(--nt-text-3)", marginTop: 3 }}>
            {demo ? "Demo" : companyView ? (window.ntSession?.get()?.companyName || "Arsip perusahaan") : "Sesi Muse"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!demo && !companyView && <button type="button" className="frm-button" onClick={openMetrics}>Data sesi</button>}
          <div className="workspace-period-control" style={{
            display: "flex", gap: 3, padding: 3, borderRadius: 999,
            background: "var(--nt-bg-deep)",
          }}>
            {periods.map((b, i) => (
              <button key={i} type="button" aria-pressed={i===period} onClick={() => setPeriod(i)}
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
          <button type="button" onClick={exportRows}
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

      <div className="frm-kpis">
        {kpis.map((k, i) => (
          <div key={i} className="neu-surface" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="nt-eyebrow" style={{ fontSize: 9 }}>{k.l}</div>
              <div style={{
                fontSize: 9.5, fontWeight: 800,
                padding: "2px 7px", borderRadius: 999,
                background: "#DBEAFE", color: "#1D4ED8",
              }}>{k.trend}</div>
            </div>
            <output aria-label={k.l} style={{ fontSize: 25, fontWeight: 800, color: "var(--nt-text)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>{k.v}</output>
            <div style={{ fontSize: 10.5, color: "var(--nt-text-3)" }}>{k.sub}</div>
            {Number.isFinite(k.progress) && <div role="progressbar" aria-label="Kemajuan target pantau" aria-valuemin={0} aria-valuemax={100} aria-valuenow={k.progress} style={{ height: 5, borderRadius: 5, background: "var(--nt-bg-deep)", overflow: "hidden", margin: "3px 0" }}><div style={{ width: `${k.progress}%`, height: "100%", borderRadius: 5, background: "#2563eb" }} /></div>}
            {!demo && k.action ? <button type="button" className="frm-link" onClick={openMetrics}>{k.action}</button> : demo ? <LiveSparkline index={i} trendDir={k.dir} animate /> : null}
          </div>
        ))}
      </div>


      {companyView ? <CompanyArchiveOverview state={archive} data={company} /> : <SessionControl onOpen={(id) => { setArchiveInitialId(id); setZoom("report"); }} />}
      {/* ── KPI row ────────────────────────────────────────────── */}
      {!demo && !companyView && <div className="frm-live-status" role="status" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 14px", padding: "10px 14px", borderRadius: 12, background: "var(--nt-surface)", fontSize: 11 }}>
        <span style={{ flex: "1 1 320px", color: "var(--nt-text-2)" }}>{live.message}</span>
        <span>EEG: <output aria-label="Sampel EEG diterima">{device.samples || 0}</output> sampel</span>
        <button type="button" onClick={() => setSignalDetails(true)} style={{ border: "none", background: "transparent", color: "#2563EB", cursor: "pointer", font: "inherit" }}>Detail sinyal</button>
      </div>}
      {!demo && !companyView && <section aria-label="Ringkasan hasil EEG" className="neu-surface frm-results" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Hasil olahan EEG · sesi saat ini</div>
          <span style={{ fontSize: 11, color: "var(--nt-text-3)" }}>{live.latest ? `Diperbarui ${Math.max(0, Math.floor((now - live.latest.ts) / 1000))} detik lalu` : "Menunggu hasil EEG yang layak"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {resultMetrics.map((metric) => <div key={metric.key} style={{ borderRadius: 12, padding: "12px 14px", background: "var(--nt-bg-2)", border: "1px solid var(--nt-bg-deep)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--nt-text-2)" }}>{metric.label}</div>
            <div style={{ margin: "5px 0", color: metric.color }}><output aria-label={metric.label} style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 800 }}>{live.latest?.[metric.key] ?? "—"}</output><span style={{ fontSize: 12, color: "var(--nt-text-3)", marginLeft: 5 }}>/100</span></div>
            <details className="visual-method"><summary title={`Info ${metric.label}`} aria-label={`Info ${metric.label}`}><VisualIcon name="info" size={17}/></summary><p>{live.latest && !Number.isFinite(live.latest[metric.key])
              ? metric.key === "cli" ? "Belum tersedia: membutuhkan kanal frontal dan posterior yang dapat dipakai." : "Belum tersedia: membutuhkan kanal frontal AF7 atau AF8 yang dapat dipakai."
              : metric.meaning}</p></details>
          </div>)}
          <div style={{ borderRadius: 12, padding: "12px 14px", background: "var(--nt-bg-2)", border: "1px solid var(--nt-bg-deep)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--nt-text-2)" }}>{live.latest?.outputScope === "frontal-only" ? "Estimasi fatigue · parsial" : "Estimasi klasifikasi"}</div>
            <output aria-label="Klasifikasi EEG" style={{ display: "block", fontSize: 27, lineHeight: 1.2, fontWeight: 800, margin: "8px 0", color: classColors[currentClass] || "var(--nt-text-3)" }}>{live.latest ? classLabels[currentClass] || "—" : "—"}</output>
            {live.latest && currentClass && <div style={{ fontSize: 11, marginBottom: 6 }}>Kategori tren: {classLabels[live.latest.status] || "—"}</div>}
            {live.latest?.outputScope === "frontal-only" && <div style={{ fontSize: 11, marginBottom: 6 }}>Hanya dari Fatigue Index kanal frontal; Cognitive Load belum tersedia.</div>}
            <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--nt-text-2)" }}>{live.latest && currentClass ? live.latest.classificationProvisional ? "Sementara: kualitas sensor terbatas. Periksa sinyal sebelum mengambil keputusan." : "Pola sesaat dari aturan indeks. Kategori tren diratakan dari beberapa jendela pengukuran." : "Belum dapat diklasifikasikan. Periksa status sinyal di atas."}</div>
          </div>
        </div>
        <div className="frm-conclusion" role="region" aria-label="Kesimpulan sesi EEG" style={{ borderRadius: 12, padding: "12px 14px", borderLeft: `4px solid ${live.latest ? classColors[currentClass] || "#2563eb" : "#94a3b8"}`, background: "var(--nt-bg-2)" }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>Kesimpulan sesi</div>
          <output aria-label="Kesimpulan EEG" style={{ display: "block", fontWeight: 800, fontSize: 17, marginTop: 5 }}>{live.conclusion.title}</output>
          <details className="visual-method"><summary><VisualIcon name="info" size={16}/>Interpretasi</summary><p>{live.conclusion.summary}</p><p>{live.conclusion.note}</p></details>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}><strong>Tindak lanjut: </strong>{live.conclusion.action}</div>
          {!!live.conclusion.problemChannels.length && <details className="frm-note"><summary>Sensor perlu diperiksa ({live.conclusion.problemChannels.length})</summary>{live.conclusion.problemChannels.join("; ")}.</details>}

        </div>
        <details className="visual-method"><summary><VisualIcon name="signal" size={16}/>Sensor &amp; metode</summary><p>
          Sensor yang dipakai: {dsp.quality?.usedChannels?.join(", ") || "—"}. {dsp.quality?.excludedChannels?.length ? `Sensor yang dikecualikan: ${dsp.quality.excludedChannels.join(", ")}. ` : ""}
          Kalibrasi: {dsp.baseline ? "baseline siap" : `${dsp.baselineCount || 0}/${dsp.baselineTarget || 40} jendela bersih`}. Skala indeks 0–100; hasil bersifat estimasi.
        </p></details>
        <div aria-label="Grafik indeks sesi" style={{ paddingTop: 10, borderTop: "1px solid var(--nt-bg-deep)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <strong style={{ fontSize: 12 }}>Tren indeks · 60 detik terakhir</strong>
            <span style={{ fontSize: 11, color: live.valid ? "#15803d" : "var(--nt-text-3)" }}>{live.valid ? "● Hasil EEG diperbarui" : live.receiving ? "● EEG diterima · menunggu hasil layak" : "Menunggu aliran EEG"}</span>
          </div>
          <div className="frm-chart-keys"><button type="button" aria-pressed={!chartMetric} onClick={() => setChartMetric(null)}>Semua indeks</button>{resultMetrics.map((m) => <button key={m.key} type="button" aria-pressed={chartMetric === m.key} onClick={() => setChartMetric(chartMetric === m.key ? null : m.key)} style={{ color: m.color }}>{m.label}</button>)}</div>
          {live.preview.length ? <svg role="img" aria-label="Tren FI CLI dan Engagement dari EEG" width="100%" height="185" viewBox="-25 -5 635 120" preserveAspectRatio="none" style={{ marginTop: 6 }}>
            {[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1="0" y1={100 - v} x2="600" y2={100 - v} stroke="var(--nt-bg-deep)" strokeDasharray="3 4" /><text x="-5" y={103 - v} textAnchor="end" fontSize="9" fill="var(--nt-text-3)">{v}</text></g>)}
            {resultMetrics.filter((m) => !chartMetric || m.key === chartMetric).map((m) => {
              const paths = window.ntManagement.trend(live.preview, m.key, now);
              return <g key={m.key}><path d={paths.solid} fill="none" stroke={m.color} strokeWidth="1.8" /><path d={paths.limited} fill="none" stroke={m.color} strokeWidth="1.8" strokeDasharray="5 4" />{paths.latest && <circle cx={paths.latest.x} cy={paths.latest.y} r="2.4" fill={m.color} />}</g>;
            })}
          </svg> : <div style={{ padding: "20px 0", fontSize: 12, color: "var(--nt-text-3)" }}>{live.latest?.outputScope === "bands-only" ? "Band power tersedia di bawah. Tren indeks menunggu sensor frontal yang dapat dipakai." : "Tren muncul setelah ada hasil pengukuran EEG. " + (live.receiving ? "Paket masuk; lihat alasan kualitas pada kesimpulan atau buka Detail sinyal." : "Hubungkan dan pasang Muse untuk memulai.")}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--nt-text-3)" }}><span>−60 detik</span><span>−30 detik</span><span>Sekarang</span></div>
          <div className="frm-note">Garis utuh: kualitas baik. Putus-putus: hasil sementara. Jeda dan indeks yang belum tersedia tidak dihubungkan.</div>
        </div>
        <details aria-label="Daya pita EEG" style={{ paddingTop: 10, borderTop: "1px solid var(--nt-bg-deep)" }}>
          <summary style={{ fontSize: 12, fontWeight: 700, cursor: "pointer" }}>EEG Band Power · jendela 2 detik</summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginTop: 8 }}>
            {[{ key: "delta", label: "Delta", color: "#38bdf8" }, { key: "theta", label: "Theta", color: "#8b5cf6" }, { key: "alpha", label: "Alpha", color: "#ec4899" }, { key: "beta", label: "Beta", color: "#f59e0b" }, { key: "gamma", label: "Gamma", color: "#10b981" }].map((band) => {
              const value = live.latest?.bands?.[band.key];
              const available = Number.isFinite(value) && value >= 0 && value <= 100;
              return <div key={band.key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, gap: 4 }}><span>{band.label}</span><output aria-label={`Daya ${band.label}`}>{available ? `${value}%` : "—"}</output></div>
                <div role="meter" aria-label={`Pita ${band.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={available ? value : undefined} aria-valuetext={available ? `${value}%` : "Belum tersedia"} style={{ height: 8, background: "var(--nt-bg-deep)", borderRadius: 8, overflow: "hidden", marginTop: 6 }}><div style={{ height: "100%", width: `${available ? value : 0}%`, background: band.color, transition: "width 0.4s ease" }} /></div>
              </div>;
            })}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--nt-text-3)", marginTop: 7 }}>Daya relatif dari sensor yang dipakai; hasil dihaluskan antarjendela. Saat sinyal tidak layak, angka pita menunggu hasil baru.</div>
        </details>
      </section>}
      {/* ── Body grid: heatmap + right column ─────────────────── */}
      <details className="frm-advanced"><summary>Analisis lanjutan · pola shift, indeks lini, dan laporan</summary>
      <div className="frm-analysis-layout" style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 14, minHeight: 360, marginTop: 12 }}>
        {/* Heatmap */}
        <div id="frm-fatigue" className="neu-surface" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>Pola Fatigue · Shift × Jam</div>
              <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>{demo ? `Rata-rata Fatigue Index dari ${workerCount} pekerja` : companyView ? "Hasil bersih arsip perusahaan; slot kosong belum memiliki data" : "Hasil EEG bersih sesi ini; slot kosong belum memiliki data"}</div>
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
                    const bg = v === null ? "var(--nt-bg-deep)" : _heatBlue(v);
                    const t = v / 100;
                    return (
                      <button key={c} type="button"
                        disabled={v === null}
                        aria-label={`${row.l} +${c + 1}j: ${v === null ? "belum ada data" : v}`}
                        onClick={() => setHeatCell({ shift: row.l, hour: "+" + (c + 1) + "j", fi: v })}
                        style={{
                          height: 38, borderRadius: 9, background: bg, border: "none",
                          fontSize: 11, fontWeight: 800, fontFamily: "inherit",
                          color: t > 0.5 ? "#fff" : "#1E3A8A",
                          cursor: "pointer", transition: "transform .12s, box-shadow .12s",
                          boxShadow: t > 0.6 ? "0 3px 10px " + bg + "aa" : "inset 0 0 0 1px rgba(15,23,42,0.06)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>{v ?? "—"}</button>
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
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--nt-text)" }}>{companyView ? "Indeks per Shift" : "Indeks per Lini"}</div>
              <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Risk avg</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", paddingTop: 4 }}>
              {lini.map((b, i) => (
                <NeuroBar key={i} value={b.v ?? 0} color={FRM_BLUES[_frmTier(b.v)]} label={b.l} sub={b.v === null ? "—" : String(b.v)} height={92} width={26} />
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
              }}>{demo ? "AI · Demo" : "Sesi EEG"}</div>
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
              Buka Arsip & Laporan K3
            </button>
          </div>
        </div>
      </div>

      </details>
      <Modal open={signalDetails} onClose={() => setSignalDetails(false)} title="Detail sinyal Muse"
        subtitle={live.message} width={650}
        actions={<NeuroBtn tone="primary" onClick={() => setSignalDetails(false)}>Tutup</NeuroBtn>}>
        <p>EEG diterima: {device.samples || 0} sampel. {device.lastEEGAt ? `Data terakhir ${Math.max(0, Math.floor((now - device.lastEEGAt) / 1000))} detik lalu.` : "Belum ada paket EEG."}</p>
        <table style={{ width: "100%", textAlign: "left", fontSize: 12, borderSpacing: "0 8px" }}>
          <thead><tr><th>Sensor</th><th>Sampel</th><th>Puncak-ke-puncak</th><th>Setelah detrend</th><th>Kualitas</th></tr></thead>
          <tbody>{["TP9", "AF7", "AF8", "TP10"].map((ch) => {
            const q = dsp.quality?.channels?.[ch];
            return <tr key={ch}><td>{ch}</td><td>{device.channelSamples?.[ch] || 0}</td>
              <td>{q ? q.peakToPeak.toFixed(1) + " µV" : "Belum dinilai"}</td>
              <td>{q ? q.processedPeakToPeak.toFixed(1) + " µV" : "—"}</td>
              <td title={q?.reasons?.join(", ")}>{q ? ({ good: "Layak", limited: "Terbatas", bad: "Tidak dipakai" }[q.state]) : "Menunggu jendela EEG"}</td></tr>;
          })}</tbody>
        </table>
        {signalDetails && <div aria-label="Gelombang EEG diterima" style={{ margin: "12px 0" }}>
          <strong style={{ fontSize: 12 }}>Sinyal EEG diterima · 1 detik terakhir</strong>
          {live.receiving ? ["TP9", "AF7", "AF8", "TP10"].map((ch) => {
            const wave = window.ntManagement.waveform(window.ntMuse?.readEEG?.(ch));
            return <div key={ch} style={{ marginTop: 8 }}><div style={{ fontSize: 10.5 }}>{ch} · {wave.peakToPeak === null ? "menunggu sampel" : `${wave.peakToPeak.toFixed(1)} µV puncak-ke-puncak`}</div>
              <svg role="img" aria-label={`Gelombang ${ch}`} viewBox="0 0 600 40" width="100%" height="40" preserveAspectRatio="none"><line x1="0" y1="20" x2="600" y2="20" stroke="var(--nt-bg-deep)" /><path d={wave.path} fill="none" stroke="#8b5cf6" strokeWidth="1.3" /></svg>
            </div>;
          }) : <p style={{ fontSize: 12 }}>Belum ada paket EEG baru. Grafik tidak bergerak saat aliran berhenti.</p>}
          <p style={{ fontSize: 10.5, color: "var(--nt-text-3)" }}>Tampilan dikurangi rata-rata kanal dan dibatasi ±200 µV. Gerakan grafik menunjukkan paket masuk; kualitas untuk menghitung indeks diperiksa terpisah.</p>
        </div>}
        <p style={{ fontSize: 12 }}>Pasang keempat sensor rapat pada kulit, rapikan rambut di area sensor, dan duduk tenang. Gerakan, kedipan, atau kontak kurang baik dapat membuat jendela sinyal ditolak.</p>
        <p style={{ fontSize: 11, color: "var(--nt-text-3)" }}>Tren tegangan dibersihkan sebelum pemeriksaan kualitas. Batas awal per sensor setelah detrend: layak hingga 200 µV puncak-ke-puncak/70 µV deviasi; kualitas terbatas hingga 400 µV/120 µV. Gamma 25–45% diberi peringatan. Sinyal datar, terpotong, atau melewati batas berat dikeluarkan. FI/Engagement dapat dihitung sementara dari kanal frontal yang tersisa; Cognitive Load memerlukan kanal frontal dan posterior. Jika hanya kanal posterior yang tersisa, hanya band power ditampilkan. Ini kemampuan perhitungan prototipe yang masih memerlukan validasi alat fisik.</p>
        <p style={{ fontSize: 11, color: "var(--nt-text-3)" }}>Sensor dipakai: {dsp.quality?.usedChannels?.join(", ") || "—"}. Gamma gabungan: {typeof dsp.quality?.gamma === "number" ? dsp.quality.gamma.toFixed(1) + "%" : "—"}. Hasil berkualitas terbatas tidak melatih baseline atau memicu indikasi microsleep.</p>
        <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 16, paddingTop: 16 }}>
          <strong>Diagnostik sesi Muse</strong>
          <p style={{ fontSize: 12 }}>Simpan neurotech-diagnostics.json ke folder proyek. File diperbarui tiap 2 detik dengan jumlah sampel, kualitas sensor, alasan penolakan, dan indeks; tanpa akun, token, atau sampel EEG mentah.</p>
          <button type="button" onClick={toggleDiagnostics} disabled={diagnosticsBusy || diagnostics.pending}
            style={{ padding: "9px 13px", border: 0, borderRadius: 8, background: "#2563EB", color: "white", fontWeight: 700, cursor: "pointer" }}>
            {diagnosticsBusy || diagnostics.pending ? "Menyiapkan file…" : diagnostics.active ? "Hentikan diagnostik" : "Mulai diagnostik ke file"}
          </button>
          <p style={{ fontSize: 12, marginTop: 8 }}>{diagnostics.active ? `Merekam ${diagnostics.frames} catatan terakhir. Terakhir disimpan: ${diagnostics.lastSavedAt ? new Date(diagnostics.lastSavedAt).toLocaleTimeString("id-ID") : "menunggu"}.` : diagnostics.error || "Perekaman belum dimulai."}</p>
        </div>
      </Modal>

      <Modal open={metricsOpen} onClose={() => setMetricsOpen(false)} title="Data sesi & tidur" width={460}>
        {metricsDraft && <form className="frm-data-form" onSubmit={saveMetrics}>
          <p>Catatan pribadi untuk {personalMetrics.date}. Nilai awal dapat diubah sesuai targetmu.</p>
          <label>Target pantau hari ini (menit)<input type="number" min="1" max="1440" step="1" required value={metricsDraft.targetMinutes} onChange={(e) => setMetricsDraft({ ...metricsDraft, targetMinutes: e.target.value })} /></label>
          <label>Target tidur pribadi (jam)<input type="number" min="1" max="16" step="0.5" required value={metricsDraft.sleepTargetHours} onChange={(e) => setMetricsDraft({ ...metricsDraft, sleepTargetHours: e.target.value })} /></label>
          <label>Durasi tidur terakhir (jam)<input type="number" min="0" max="24" step="0.5" placeholder="Contoh: 6.5" value={metricsDraft.sleptHours} onChange={(e) => setMetricsDraft({ ...metricsDraft, sleptHours: e.target.value })} /></label>
          <p className="frm-note">Kepatuhan = durasi EEG diterima ÷ target pantau, maksimal 100%. Sleep debt = selisih positif target dan tidur terakhir yang kamu laporkan. Ini ringkasan pribadi, bukan skor audit SMK3 atau hasil pengukuran tidur dari Muse. {personalMetrics.personal ? "Tersimpan per akun di browser ini." : "Pada mode demo, catatan hanya tersedia selama halaman terbuka."}</p>
          {metricsError && <p role="alert">{metricsError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" className="frm-button" onClick={() => setMetricsOpen(false)}>Batal</button><button type="submit" className="frm-button frm-button-primary">Simpan data sesi</button></div>
        </form>}
      </Modal>
      <Modal open={zoom === "settings"} onClose={() => setZoom(null)} title="Setelan monitoring"
        actions={<NeuroBtn tone="primary" onClick={() => setZoom(null)}>Tutup</NeuroBtn>}>
        <p>Kalibrasi mengumpulkan sekitar dua menit jendela EEG bersih. Gangguan sinyal perlu diperbaiki sebelum kalibrasi dapat bertambah.</p>
        <ThemeToggle />
        <div style={{ marginTop: 16 }}><NeuroBtn onClick={openMetrics}>Data sesi & tidur</NeuroBtn></div>
        <div style={{ marginTop: 18 }}><NeuroBtn tone="default" onClick={() => { window.ntMuseClearBaseline?.(); window.toast?.("Baseline direset. Kalibrasi dimulai saat EEG bersih diterima.", { kind: "info" }); }}>Kalibrasi ulang</NeuroBtn></div>
      </Modal>

      <Modal
        open={!!heatCell}
        onClose={() => setHeatCell(null)}
        title={heatCell ? heatCell.shift + " · " + heatCell.hour + " setelah mulai" : ""}
        subtitle={heatCell ? "Rata-rata Fatigue Index pada slot ini: " + heatCell.fi + ". Hasil adalah estimasi prototipe; evaluasi bersama kondisi pekerja dan kualitas pengukuran." : ""}
        tone={heatCell?.fi > 70 ? "danger" : heatCell?.fi > 50 ? "warn" : "success"}
        actions={<><NeuroBtn tone="ghost" onClick={() => setHeatCell(null)}>Tutup</NeuroBtn><Link to={staffPath("/s/schedule")}><NeuroBtn tone="primary" onClick={() => setHeatCell(null)}>Tinjau jadwal</NeuroBtn></Link></>}
      />

      {/* ── Pola Fatigue zoom modal — larger heatmap when opened from sidebar */}
      <Modal
        open={zoom === "fatigue"}
        onClose={() => setZoom(null)}
        title="Pola Fatigue · Shift × Jam"
        subtitle={demo ? "Rata-rata Fatigue Index dari " + workerCount + " pekerja · " + dateLabel : companyView ? "Hasil EEG bersih pada arsip perusahaan dalam periode terpilih" : "Hasil EEG bersih yang tersedia di sesi browser ini"}
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
                  const bg = v === null ? "var(--nt-bg-deep)" : _heatBlue(v);
                  const t = v / 100;
                  return (
                    <button key={c} type="button"
                      disabled={v === null}
                      onClick={() => { setZoom(null); setHeatCell({ shift: row.l, hour: "+" + (c + 1) + "j", fi: v }); }}
                      style={{
                        height: 58, borderRadius: 12, background: bg, border: "none",
                        fontSize: 15, fontWeight: 800, fontFamily: "inherit",
                        color: t > 0.5 ? "#fff" : "#1E3A8A",
                        cursor: "pointer", transition: "transform .12s, box-shadow .12s",
                        boxShadow: t > 0.6 ? "0 4px 14px " + bg + "aa" : "inset 0 0 0 1px rgba(15,23,42,0.06)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>{v ?? "—"}</button>
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
        title={companyView ? "Indeks per Shift" : "Indeks per Lini"}
        subtitle={companyView ? "Rerata fatigue dari sesi per shift · " + dateLabel : "Rata-rata risk per lini operasional · " + lini.length + " lini · " + dateLabel}
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
            <NeuroBar key={i} value={b.v ?? 0} color={FRM_BLUES[_frmTier(b.v)]} label={b.l} sub={b.v === null ? "—" : String(b.v)} height={180} width={44} />
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
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--nt-text)", marginTop: 2, letterSpacing: "-0.02em" }}>{b.v ?? "—"}</div>
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: 999,
                  fontSize: 9.5, fontWeight: 800, marginTop: 4,
                  background: c[0], color: c[1],
                }}>{b.v === null ? "BELUM ADA DATA" : _frmTier(b.v).toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* ── Insight AI zoom modal — larger version when opened from sidebar */}
      <Modal
        open={zoom === "insight"}
        onClose={() => setZoom(null)}
        title={demo ? "Insight & Rekomendasi · AI Demo" : "Insight & Rekomendasi · Sesi EEG"}
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

      <Modal open={zoom === "report"} onClose={() => { setZoom(null); setArchiveInitialId(null); }}
        title="Arsip & laporan K3" subtitle="Hasil pengukuran, kualitas sinyal, dan tindak lanjut" width={1020} popDir={zoomDir}
        actions={<NeuroBtn tone="primary" onClick={() => { setZoom(null); setArchiveInitialId(null); }}>Tutup</NeuroBtn>}>
        <button type="button" className="archive-back" onClick={() => { setZoom(null); setArchiveInitialId(null); }}>← Kembali ke dashboard</button>
        <SessionArchiveHub key={zoom === "report" ? "open" : "closed"} initialId={archiveInitialId} />
      </Modal>

    </main>
  </div>
  );
};

Object.assign(window, { ManagementDashboard, ManagementSidebar });
