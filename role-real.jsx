// Authenticated role screens use company membership and archived Muse sessions.
// The older supervisor/worker mock screens remain available only in Mode Demo.
const realMembers = () => (window.ntSession?.get()?.members || []).filter((m) => m.role === "pekerja");
const realName = (memberId) => window.ntSession?.get()?.members?.find((m) => m.id === memberId)?.name || "Anggota tidak dikenal";
const realSessions = (state) => window.ntSessionInsights.rows(state, { source: "muse" });
const realCard = { padding: 20, borderRadius: 18, background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-out-sm)" };
const realDate = (value) => value ? archiveDate(value) : "—";
const realWorkerSummaries = (state) => {
  const rows = realSessions(state);
  return (window.ntSession?.get()?.members || []).map((member, i) => {
    const latest = rows.find((r) => r.memberId === member.id);
    const summary = latest?.summary;
    const fi = summary?.meanFI ?? null, cli = summary?.meanCLI ?? null;
    const assessment = window.ntSessionInsights.assess(latest);
    const status = assessment.status;
    return { id: member.id, name: member.name, systemRole: member.role,
      role: member.roleDesc || ROLE_LABEL_ID[member.role] || "Anggota", shift: member.shift || "Belum diatur",
      fi, cli, ei: summary?.meanEI ?? null, hrv: null, readiness: null, status,
      connection: window.ntSessionInsights.connection(latest,{confirmed:state.serverConfirmed && state.online !== false}),
      assessment, recordedAt: latest?.startedAt || null, img: NT_IMG[i % NT_IMG.length] };
  });
};
const realMetric = (label,value,detail) => <section className="visual-kpi"><div className="visual-kpi-top"><span className="visual-kpi-icon"><VisualIcon name={label.includes("Pekerja")||label.includes("Anggota")?"team":label.includes("microsleep")?"signal":"chart"}/></span><span>{label}</span><details className="visual-info"><summary title={detail} aria-label={`Info ${label}`}><VisualIcon name="info" size={17}/></summary><p>{detail}</p></details></div><strong>{value}</strong></section>;

// Visual summaries only; all values retain the existing archive calculations.
const ArchiveMetricRing = ({ label, value, color }) => {
  const measured = Number.isFinite(value) && value >= 0 && value <= 100;
  return <div className="archive-metric-ring" style={{ "--score-color": color }}>
    <svg viewBox="0 0 76 76" role="img" aria-label={`${label}: ${measured ? archiveNumber(value) + ' dari 100' : 'belum tersedia'}`}>
      <circle cx="38" cy="38" r="30" fill="none" stroke="var(--nt-bg-deep)" strokeWidth="5" />
      {measured && <circle cx="38" cy="38" r="30" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" pathLength="100" strokeDasharray={`${value} 100`} transform="rotate(-90 38 38)" />}
      <text x="38" y="44" textAnchor="middle" fill="var(--nt-text)" fontSize="23" fontWeight="750">{archiveNumber(value)}</text>
    </svg><small>{label}</small>
  </div>;
};

const PersonalSessionTrace = ({ record }) => {
  const points = (record?.minutes || []).filter((m) => m.n > 0).map((m) => ({ minute: m.minute, fi: m.fi / m.n }));
  if (!points.length) return <div className="personal-trace-empty"><span aria-hidden="true">↗</span><small>Grafik muncul dari sesi tersimpan.</small></div>;
  const first = points[0].minute, end = points[points.length - 1].minute;
  let previous = null;
  const plotted = points.map((p) => {
    const x = 8 + (p.minute - first) / Math.max(1, end - first) * 264, y = 76 - p.fi * .62;
    const segment = `${previous && p.minute === previous.minute + 1 ? 'L' : 'M'}${x},${y}`;
    previous = p; return { ...p, x, y, segment };
  });
  return <div className="personal-session-trace"><svg viewBox="0 0 280 90" role="img" aria-label="Tren fatigue sesi pribadi terakhir">
    {[25,50,75].map(v => <line key={v} x1="8" x2="272" y1={76-v*.62} y2={76-v*.62} stroke="var(--nt-bg-deep)" strokeDasharray="3 4" />)}
    <path d={plotted.map(p=>p.segment).join('')} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
    {plotted.map(p=><circle key={p.minute} cx={p.x} cy={p.y} r="3" fill="#3b82f6"><title>Menit {p.minute+1}: FI {archiveNumber(p.fi)}</title></circle>)}
  </svg><div><span>FI sepanjang sesi</span><span>Menit {first+1}–{end+1}</span></div></div>;
};

const ArchiveReviewSummary = ({ rows, onOpen }) => {
  const finished = rows.filter(r=>r.status !== "recording");
  const reviewed = finished.filter(r=>r.review).length, pending = finished.length - reviewed;
  return <section className="archive-review-summary" aria-label="Ringkasan tindak lanjut laporan">
    <div className="review-summary-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><rect x="11" y="7" width="26" height="34" rx="6" stroke="currentColor" strokeWidth="2"/><path d="M19 7V5h10v2M18 20h12M18 26h8M26 34l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
    <div><span className="supervisor-kicker">TINDAK LANJUT</span><h2>{pending} laporan belum ditinjau</h2><p>{reviewed} ditinjau dari {finished.length} sesi selesai</p>
      <div className="review-summary-track" role="img" aria-label={`${reviewed} dari ${finished.length} laporan selesai sudah ditinjau`}><span style={{width:`${finished.length ? reviewed/finished.length*100 : 0}%`}} /></div>
    </div><button type="button" className="archive-primary" onClick={onOpen || (()=>navigate(staffPath('/s/reports')))}>Buka laporan <span aria-hidden="true">↗</span></button>
  </section>;
};

const TeamDistribution = ({ categories }) => {
  const total = categories.reduce((n,c)=>n+c.count,0); let offset=0;
  return <div className="team-distribution"><svg viewBox="0 0 144 144" role="img" aria-label={categories.map(c=>`${c.label}: ${c.count}`).join(', ')}>
    <circle cx="72" cy="72" r="54" fill="none" stroke="var(--nt-bg-deep)" strokeWidth="15" />
    {total > 0 && categories.filter(c=>c.count).map(c=>{
      const length=c.count/total*100, start=offset; offset+=length;
      return <circle key={c.key} cx="72" cy="72" r="54" fill="none" stroke={c.color} strokeWidth="15" pathLength="100" strokeDasharray={`${length} ${100-length}`} strokeDashoffset={-start} transform="rotate(-90 72 72)" />;
    })}<text x="72" y="72" textAnchor="middle" fill="var(--nt-text)" fontSize="29" fontWeight="750">{total}</text><text x="72" y="91" textAnchor="middle" fill="var(--nt-text-2)" fontSize="10">pekerja</text>
  </svg></div>;
};

const RealSupervisorFrame = ({ active, title, subtitle, children, actions }) => <div className="nt-screen supervisor-workspace" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
  <SupervisorSidebar active={active} />
  <main style={{ padding: "22px 28px 28px 8px", minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
    <div className="supervisor-page-heading" style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div><div className="supervisor-company">{window.ntSession?.get()?.companyName || "Perusahaan"}</div><h1 style={{ fontSize: 25, margin: "6px 0", color: "var(--nt-text)" }}>{title}</h1><div style={{ fontSize: 12, color: "var(--nt-text-2)" }}>{subtitle}</div></div>
      {actions}
    </div>
    {children}
  </main>
</div>;

const RealArchiveStatus = ({ state }) => <div className="supervisor-archive-status">
  <span role="status"><span className={`archive-dot ${state.serverConfirmed && state.online !== false && !state.cloudError ? "is-active" : ""}`} />{!state.ready ? "Memuat arsip…" : state.online === false ? "Laptop offline" : state.error || state.cloudError ? "Sinkronisasi perlu diperiksa" : !state.cloudEnabled ? "Pratinjau lokal" : state.syncing ? "Menyinkronkan…" : state.serverConfirmed ? "Terhubung ke Firebase" : "Memeriksa koneksi Firebase"}{state.lastSyncedAt && <small> · {new Date(state.lastSyncedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</small>}</span>
  <details><summary>Info data</summary><p>{state.error || state.cloudError || "Ringkasan sesi, bukan status keselamatan saat ini. Hasil terbatas dikecualikan dari rerata; kalibrasi diperiksa terpisah untuk kesimpulan."}{state.cloudEnabled ? ` Hingga ${state.cloudLimit || 60} sesi cloud terbaru.` : " Data berasal dari browser ini."}</p></details>
  {state.cloudEnabled && <button type="button" className="archive-back" disabled={state.syncing} onClick={() => window.ntSessionArchive.sync()}>{state.syncing ? "Memuat…" : "Sinkronkan"}</button>}
</div>;

const TeamSessionConnections = ({ state, memberId = null }) => {
  const [,tick] = React.useReducer(n=>n+1,0);
  React.useEffect(()=>{const id=setInterval(tick,10000);return()=>clearInterval(id);},[]);
  const rows=realSessions(state), members=realMembers().filter(m=>!memberId || m.id===memberId);
  const account=window.ntSession?.get(), sync=state.teamLive || window.ntTeamLive?.state?.() || {};
  const entries=members.map(member=>({member,view:window.ntTeamLive?.view?.(member) || {label:"Belum ada sesi Live",trace:[]},record:rows.find(r=>r.ownerUid===member.uid && r.memberId===member.id)}));
  const active=entries.filter(e=>e.view.fresh && ["live","preparing","waiting"].includes(e.view.row?.status)).length;
  const labels={normal:"Indeks rendah",waspada:"Waspada",berisiko:"Berisiko",kritis:"Indeks tinggi",unavailable:"Belum dinilai"};
  return <section className="team-connections team-live-panel" aria-label="Live pekerja"><div className="team-connections-heading"><strong><VisualIcon name="signal" size={19}/>Live pekerja <span className="team-live-count">{active} mengirim</span></strong><small>{account?.code} · sekitar 10 detik</small></div>
    {sync.error && <div className="team-live-error" role="alert">{sync.error}<button type="button" className="archive-back" onClick={()=>window.ntTeamLive.retry()}>Coba lagi</button></div>}
    <div className="team-live-grid">{entries.length ? entries.map(({member,view,record})=>{
      const m=view.measurement, provisional=m && (m.provisional || m.quality!=="good"), points=view.trace || [], now=Date.now();
      const plotted=points.map(p=>({...p,x:Math.max(0,Math.min(240,(p.ts-now+300000)/300000*240)),y:56-p.fi*.5}));
      const path=plotted.map((p,i)=>(i && p.ts-plotted[i-1].ts<=20000 ? "L" : "M")+p.x.toFixed(1)+","+p.y.toFixed(1)).join("");
      return <article key={member.id} className={`team-live-card ${view.fresh ? "is-current" : ""}`} aria-label={`Live ${member.name}`}>
        <div className="team-live-person"><Link to={staffPath(`/s/workers/${encodeURIComponent(member.id)}`)}><strong>{member.name}</strong><small>{member.accountCode || "Pekerja"} · {member.shift || "Shift belum diatur"}</small></Link><span className={`team-live-badge ${view.fresh ? "is-current" : ""}`}><span className="archive-dot"/>{view.label}</span></div>
        {m ? <><div className="team-live-metrics">{[["Fatigue",m.fi],["Beban",m.cli],["Engagement",m.ei]].map(([label,value])=><div key={label}><span>{label}</span><output aria-label={`${label} ${member.name}`}>{archiveNumber(value)}</output></div>)}</div>
          <div className="team-live-classification"><span>{labels[m.classification] || "Belum dinilai"}{provisional ? " · sementara" : ""}</span><small>{view.ageSeconds} dtk lalu</small></div>
          {plotted.length>0 && <svg viewBox="0 0 240 62" preserveAspectRatio="none" role="img" aria-label={`Tren Live fatigue ${member.name}`}><line x1="0" x2="240" y1="56" y2="56" stroke="var(--nt-bg-deep)"/><path d={path} stroke={provisional ? "#8b5cf6" : "#2563eb"} strokeWidth="2.2" vectorEffect="non-scaling-stroke" fill="none"/>{plotted.slice(-1).map(p=><circle key={p.ts} cx={p.x} cy={p.y} r="2" fill="#2563eb"/>)}</svg>}
          {m.scope==="bands-only" && <small>Band power terbaca; indeks belum tersedia.</small>}
          {m.scope==="frontal-only" && <small>Hasil parsial · periksa kontak sensor.</small>}
        </> : <p className="team-live-empty">{view.fresh && view.row?.status==="preparing" ? `Persiapan · ${Math.max(0,view.row.preparationRemaining-(view.ageSeconds || 0))} dtk · ${view.row.receivedSamples.toLocaleString("id-ID")} sampel`
          : view.fresh && view.row?.status==="waiting" ? "Paket/status diterima; menunggu hasil EEG yang dapat ditampilkan."
          : view.row ? "Angka Live disembunyikan sampai ada pembaruan pengukuran."
          : record ? "Arsip sesi tersedia. Perbarui aplikasi HP untuk mengirim Live."
          : member.uid ? "Buka aplikasi pekerja dan hubungkan Muse." : "Akun pekerja belum diaktifkan."}</p>}
      </article>;
    }) : <p className="archive-muted">Tambahkan pekerja untuk mulai memantau.</p>}</div>
    <details className="visual-method"><summary><VisualIcon name="info" size={15}/>Info Live</summary><p>HP dan laptop harus memakai akun berbeda dalam perusahaan yang sama. Nilai terakhir dikirim sekitar 10 detik saat aplikasi HP terbuka dan online. Hasil sementara tetap ditandai; data tanpa pembaruan selama 30 detik tidak dianggap Live. Grafik merangkum FI yang diterima selama halaman ini dibuka, maksimal 5 menit. Rerata laporan tetap memakai hasil bersih dari arsip.</p></details>
  </section>;
};

const SupervisorDailyTrend = ({ points }) => {
  const valid = points.filter((p) => Number.isFinite(p.fi)), start = valid.length ? Date.parse(valid[0].date + "T00:00:00Z") : 0;
  const span = valid.length ? Math.max(86400000, Date.parse(valid[valid.length - 1].date + "T00:00:00Z") - start) : 1;
  const plotted = valid.map((p) => ({ ...p, t: Date.parse(p.date + "T00:00:00Z"), x: 38 + (Date.parse(p.date + "T00:00:00Z") - start) / span * 555, y: 145 - p.fi * 1.2 }));
  let path = "";
  plotted.forEach((p, i) => { path += (i && p.t - plotted[i - 1].t === 86400000 ? "L" : "M") + p.x + "," + p.y; });
  return <section className="supervisor-chart-card"><div className="supervisor-section-heading"><h2>Tren indeks FI</h2><span>Rerata bersih per hari · 0–100</span></div>{plotted.length ? <svg viewBox="0 0 630 185" role="img" aria-label="Tren fatigue tim per hari">{[0,25,50,75,100].map((v) => <g key={v}><line x1="38" x2="600" y1={145-v*1.2} y2={145-v*1.2} stroke="var(--nt-bg-deep)"/><text x="8" y={149-v*1.2} fill="currentColor" fontSize="11">{v}</text></g>)}<path d={path} stroke="#3b82f6" strokeWidth="3" fill="none"/>{plotted.map((p) => <g key={p.date}><circle cx={p.x} cy={p.y} r="4.5" fill="#2563eb"><title>{p.date} · FI {p.fi}</title></circle>{plotted.length < 8 && <text x={p.x} y={p.y-10} textAnchor="middle" fontSize="11" fill="currentColor">{p.fi}</text>}</g>)}<text x="38" y="177" fontSize="10" fill="currentColor">{valid[0].date}</text><text x="600" y="177" textAnchor="end" fontSize="10" fill="currentColor">{valid[valid.length-1].date}</text></svg> : <div className="supervisor-chart-empty">Belum ada hasil untuk grafik.</div>}</section>;
};

const RealSupervisorDashboard = () => {
  const state = useSessionArchive(), [days, setDays] = React.useState(7);
  const data = window.ntSessionInsights.aggregate(state, { days });
  const rows = data.rows;
  const measured = rows.filter((r) => r.summary.clean > 0);
  const workerIds = new Set(rows.map((r) => r.memberId));
  const incidents = rows.reduce((sum, r) => sum + r.summary.incidents, 0);
  const meanFI = data.meanFI;
  const latest = rows.slice(0, 8);
  const team = realWorkerSummaries({ ...state, rows }).filter((w) => w.systemRole === "pekerja");
  const categories = [["kritis", "Prioritas", "#ef4444"], ["berisiko", "Evaluasi", "#f97316"], ["waspada", "Pantau", "#eab308"], ["normal", "Indeks rendah", "#2563eb"], ["unavailable", "Belum dinilai", "#94a3b8"]].map(([key, label, color]) => ({ key, label, color, count: team.filter((w) => w.status === key).length }));
  const priority = team.filter((w) => ["kritis", "berisiko", "waspada"].includes(w.status)).sort((a,b) => ["kritis","berisiko","waspada"].indexOf(a.status)-["kritis","berisiko","waspada"].indexOf(b.status));
  const eligible = team.filter((w) => w.assessment.ready).length;
  return <RealSupervisorFrame active="overview" title="Overview Tim" subtitle="Ringkasan sesi pekerja"
    actions={<div style={{ display: "flex", gap: 6 }}>{[[1, "Hari ini"], [7, "7 hari"], [30, "30 hari"]].map(([n, label]) => <button key={n} type="button" className="archive-back" aria-pressed={days === n} onClick={() => setDays(n)} style={{ fontWeight: days === n ? 800 : 500 }}>{label}</button>)}</div>}>
    <RealArchiveStatus state={state} />
    <TeamSessionConnections state={state}/>
    <div className="workspace-action-grid"><StaffAlertSummary/><ArchiveReviewSummary rows={rows}/></div>
    <div className="supervisor-kpis">
      {realMetric("Pekerja terdaftar", realMembers().length, `${eligible} sesi dapat dinilai`)}
      {realMetric("Anggota dengan sesi", workerIds.size, `${rows.length} sesi dalam periode ini`)}
      {realMetric("Rerata indeks FI", archiveNumber(meanFI), `${measured.length} sesi · ${data.provisional ? "termasuk hasil sementara arsip lama" : "hasil bersih"}`)}
      {realMetric("Indikasi microsleep", incidents, "Perlu tinjauan petugas")}
    </div>
    <div className="supervisor-chart-grid"><SupervisorDailyTrend points={data.trend} /><section className="supervisor-chart-card"><div className="supervisor-section-heading"><h2>Hasil sesi pekerja</h2><span>Sesi terakhir pada periode ini</span></div><TeamDistribution categories={categories}/><div className="supervisor-status-legend">{categories.map((c) => <div key={c.key}><span><i style={{ background: c.color }} />{c.label}</span><strong>{c.count}</strong></div>)}</div></section></div>
    <section className="supervisor-takeaway" aria-label="Kesimpulan sesi tim"><div><span className="supervisor-kicker">TINJAUAN TIM</span><h2>{priority.length ? `${priority.length} pekerja perlu ditinjau` : eligible ? "Pantau sesi berikutnya" : "Belum cukup data untuk kesimpulan"}</h2><p>{priority[0]?.assessment.action || (eligible ? "Kesimpulan mengikuti sesi terakhir, bukan kondisi saat ini." : "Lengkapi kalibrasi dan rekam EEG bersih.")}</p></div><Link className="archive-primary" to={staffPath("/s/workers")}>Lihat pekerja</Link></section>
    <section className="supervisor-chart-card"><div className="supervisor-section-heading"><h2>Sesi Muse terbaru</h2><Link to={staffPath("/s/reports")}>Semua laporan ↗</Link></div>
      {!latest.length ? <p className="archive-muted">Belum ada sesi Muse pada periode ini.</p> : <div className="supervisor-session-list">{latest.map((r) => { const assessment = window.ntSessionInsights.assess(r); return <Link key={r.id} to={staffPath(`/s/reports/${r.id}`)} className="supervisor-session-row"><span><strong>{realName(r.memberId)}</strong><small>{realDate(r.startedAt)}</small></span><span className={`supervisor-result-tag is-${assessment.status}`}>{assessment.title}</span><span className="supervisor-row-score">{archiveNumber(r.summary.meanFI)}<small>FI</small></span></Link>; })}</div>}
    </section>
  </RealSupervisorFrame>;
};

const RealSupervisorWorkerDetail = ({ id }) => {
  const state = useSessionArchive(), member = window.ntSession?.get()?.members?.find((m) => m.id === id), rows = realSessions(state).filter((r) => r.memberId === id);
  const assessment = window.ntSessionInsights.assess(rows[0]);
  return <RealSupervisorFrame active="workers" title={member?.name || "Pekerja tidak ditemukan"} subtitle={member ? `${member.roleDesc || "Pekerja"} · Shift ${member.shift || "Belum diatur"}` : "Akun ini tidak ada dalam daftar pekerja perusahaan."} actions={<Link className="archive-back" to={staffPath("/s/workers")}>Kembali ke daftar</Link>}>
    <RealArchiveStatus state={state} />
    {member && <TeamSessionConnections state={state} memberId={id}/>}
    {member && (!rows.length ? <div style={realCard}>Belum ada sesi Muse.</div> : <><section className="supervisor-takeaway"><div><span className="supervisor-kicker">KESIMPULAN SESI TERAKHIR</span><h2>{assessment.title}</h2><p>{assessment.action}</p></div><Link className="archive-back" to={staffPath(`/s/reports/${rows[0].id}`)}>Lihat sesi ↗</Link></section><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>{realMetric("Sesi", rows.length, "Sesi Muse tersimpan")}{realMetric("Fatigue terakhir", archiveNumber(rows[0].summary.meanFI), `${rows[0].summary.clean} hasil bersih`)}{realMetric("Beban kognitif", archiveNumber(rows[0].summary.meanCLI), "Dari EEG bersih")}{realMetric("Microsleep", rows.reduce((n, r) => n + r.summary.incidents, 0), "Indikasi seluruh sesi")}</div><section style={realCard}><h2 style={{ fontSize: 16 }}>Riwayat sesi</h2>{rows.map((r) => <Link key={r.id} to={staffPath(`/s/reports/${r.id}`)}><div className="nt-card-click" style={{ padding: 12, borderBottom: "1px solid var(--nt-bg-deep)" }}>{realDate(r.startedAt)} · FI {archiveNumber(r.summary.meanFI)} · {r.summary.clean} hasil bersih · {r.review ? "Sudah ditinjau" : "Belum ditinjau"}</div></Link>)}</section></>)}
  </RealSupervisorFrame>;
};

const realIncidentRows = (state) => realSessions(state).flatMap((r) => r.minutes.filter((m) => m.incidents > 0).map((m) => ({ id: `${r.id}:${m.minute}`, session: r, minute: m, timestamp: r.startedAt + m.minute * 60000 }))).sort((a, b) => b.timestamp - a.timestamp);
const RealSupervisorAlerts = () => {
  const state = useSessionArchive(), incidents = realIncidentRows(state);
  return <RealSupervisorFrame active="alerts" title="Alert & Insiden" subtitle="Indikasi dari sesi tersimpan" actions={<Link className="archive-back" to={staffPath("/s/reports")}>Buka laporan</Link>}>
    <RealArchiveStatus state={state} />
    <StaffAlertCenter />
    <h2 className="section-title">Indikasi dari sesi EEG</h2>
    {!incidents.length ? <div style={realCard}>Belum ada indikasi microsleep tercatat.</div> : <div style={{ display: "grid", gap: 10 }}>{incidents.map((entry) => <Link key={entry.id} to={staffPath(`/s/alerts/${encodeURIComponent(entry.id)}`)}><div className="nt-card-click" style={{ ...realCard, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span><strong>{realName(entry.session.memberId)}</strong><small style={{ display: "block", color: "var(--nt-text-3)" }}>{realDate(entry.timestamp)} · {entry.minute.incidents} indikasi</small></span><span>Lihat sesi →</span></div></Link>)}</div>}
  </RealSupervisorFrame>;
};
const RealSupervisorAlertDetail = ({ id }) => {
  const state = useSessionArchive(), entry = realIncidentRows(state).find((e) => e.id === id);
  return <RealSupervisorFrame active="alerts" title={entry ? "Indikasi microsleep" : "Insiden tidak ditemukan"} subtitle={entry ? `${realName(entry.session.memberId)} · ${realDate(entry.timestamp)}` : "Sesi mungkin belum tersinkron atau sudah tidak tersedia."} actions={<Link className="archive-back" to={staffPath("/s/alerts")}>Kembali ke alert</Link>}>
    <RealArchiveStatus state={state} />
    {entry && <div style={realCard}><p>Algoritma menandai {entry.minute.incidents} kejadian pada menit ke-{entry.minute.minute + 1} sesi Muse. Data yang disimpan berupa agregat per menit, sehingga gelombang EEG mentah dan durasi kejadian tidak tersedia di arsip.</p><p>Hasil ini adalah indikasi sementara. Supervisor perlu mengevaluasi kondisi pekerja sebelum mengambil tindakan K3.</p><Link style={{ color: "#fff" }} className="archive-primary" to={staffPath(`/s/reports/${entry.session.id}`)}>Buka laporan sesi</Link></div>}
  </RealSupervisorFrame>;
};

const RealSupervisorSchedule = () => {
  const members = realMembers();
  const [saving, setSaving] = React.useState(false);
  const changeShift = async (memberId, shift) => {
    if (saving) return;
    setSaving(true);
    try {
      if (!await window.ntSetWorkerShift(memberId, shift)) throw new Error("Anggota tidak ditemukan.");
      window.toast?.("Shift tersimpan.", { kind: "success" });
    } catch (error) { window.toast?.(error.message || "Shift gagal disimpan.", { kind: "warn" }); }
    finally { setSaving(false); }
  };
  return <RealSupervisorFrame active="schedule" title="Jadwal Shift" subtitle="Pengelompokan anggota per shift">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>{["Pagi", "Sore", "Malam"].map((shift) => <section key={shift} style={realCard}><h2 style={{ fontSize: 17, marginTop: 0 }}>{shift}</h2>{members.filter((m) => m.shift === shift).map((m) => <div key={m.id} style={{ padding: "7px 0", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><Link to={staffPath(`/s/workers/${encodeURIComponent(m.id)}`)}>{m.name}</Link><select aria-label={`Shift ${m.name}`} value={m.shift} disabled={saving} onChange={(event) => changeShift(m.id, event.target.value)}>{["Pagi", "Sore", "Malam"].map((option) => <option key={option}>{option}</option>)}</select></div>)}{!members.some((m) => m.shift === shift) && <p style={{ color: "var(--nt-text-3)" }}>Belum ada pekerja</p>}</section>)}</div>
  </RealSupervisorFrame>;
};

const RealWorkerHome = () => {
  const state = useSessionArchive(), account = window.ntSession?.get();
  const [,refresh] = React.useReducer(n=>n+1,0);
  React.useEffect(()=>{const update=()=>refresh();window.addEventListener("nt-data",update);window.addEventListener("nt-device",update);const timer=setInterval(()=>{if(window.ntMuse?.status?.().connected)update();},1000);return()=>{clearInterval(timer);window.removeEventListener("nt-data",update);window.removeEventListener("nt-device",update);};},[]);
  const rows = realSessions(state).filter(r=>r.ownerUid===account?.uid);
  const radio=window.ntMuse?.status?.()||{}, now=Date.now();
  const live=window.ntManagement.snapshot({now,device:radio,dsp:window.ntMuseDSP||{},history:window.ntHistory?.(window.CURRENT_WORKER?.id)||[]});
  const result=window.ntManagement.personalResult(rows,live,account?.uid);
  const trace=result.kind==="live" ? window.ntManagement.trend(live.preview,"fi",now) : null;
  return <div className="nt-screen worker-home" style={{ padding: "22px 22px 100px", display: "flex", flexDirection: "column", gap: 16 }}>
    <header className="worker-home-header"><div><span>{account?.companyName}</span><h1>Halo, {account?.memberName}</h1></div><AskAIButton variant="plus" /></header>
    <WorkerSessionPanel />
    <WorkerLiveSyncStatus />
    <WorkerCalibrationCard />
    {account?.role === "pekerja" && <WorkerAlertInbox />}
    {result.kind!=="empty" ? <section className="worker-home-results" aria-label="Hasil sesi pribadi terakhir">
      <div className="worker-home-section-heading"><h2>{result.title}</h2><Link to={result.kind==="live"?"/w/live":"/w/stats"} title={result.kind==="live"?"Buka Live":"Lihat arsip pribadi"} aria-label={result.kind==="live"?"Buka hasil Live":"Lihat arsip pribadi"}><VisualIcon name={result.kind==="live"?"signal":"history"}/></Link></div>
      <div className="worker-home-scores">{[["Fatigue",result.metrics.fi,"#2563eb"],["Beban",result.metrics.cli,"#8b5cf6"],["Engagement",result.metrics.ei,"#0891b2"]].map(([label,value,color])=><ArchiveMetricRing key={label} label={label} value={value} color={color}/>)}</div>
      <p className="worker-home-caption">{result.kind==="live" ? result.provisional?"Live - indikasi sementara":"Live - acuan pribadi" : realDate(result.timestamp)}</p>
      {trace?.latest && <svg className="personal-live-trace" viewBox="0 -5 600 110" role="img" aria-label="Tren FI sesi Live"><path d={trace.solid} fill="none" stroke="#2563eb" strokeWidth="2.5"/><path d={trace.limited} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="4 3"/><circle cx={trace.latest.x} cy={trace.latest.y} r="4" fill="#2563eb"/></svg>}
    </section> : <section className="personal-result-empty" aria-label="Status hasil pribadi"><VisualIcon name="signal" size={34}/><div><strong>Belum ada hasil olahan</strong><p>{radio.connected?"EEG masuk, indeks belum tersedia.":"Rekam sesi untuk melihat hasil."}</p></div><Link to="/w/live" title="Periksa sinyal" aria-label="Periksa sinyal"><VisualIcon name="play"/></Link></section>}
    {result.record && <PersonalSessionTrace record={result.record}/>}
    <PersonalSessionSettings />
    <NeuroTabBar active="home" />
  </div>;
};

const RealWorkerHistory = () => <div className="nt-screen personal-archive" style={{ padding: "20px 16px 100px" }}><Link className="archive-back" to="/w/readiness">← Kembali ke halaman pribadi</Link><h1 style={{ fontSize: 22 }}>Arsip pribadi</h1><SessionArchiveHub ownOnly /><NeuroTabBar active="chart" /></div>;

const CompanyArchiveOverview = ({ state, data }) => {
  const labels = { normal: "Normal", waspada: "Waspada", berisiko: "Berisiko", kritis: "Kritis", unavailable: "Belum tersedia" };
  const points = data.trend.filter((p) => Number.isFinite(p.fi));
  const start = points.length ? Date.parse(points[0].date + "T00:00:00Z") : 0;
  const end = points.length ? Date.parse(points[points.length - 1].date + "T00:00:00Z") : start;
  let previous = null;
  const plotted = points.map((p) => {
    const date = Date.parse(p.date + "T00:00:00Z"), x = 38 + (date - start) / Math.max(86400000, end - start) * 600, y = 132 - p.fi * 1.05;
    const segment = previous && date - previous.date === 86400000 ? `M${previous.x},${previous.y}L${x},${y}` : "";
    previous = { date, x, y }; return { ...p, x, y, segment };
  });
  return <><RealArchiveStatus state={state} /><TeamSessionConnections state={state}/><div className="workspace-action-grid"><StaffAlertSummary/><ArchiveReviewSummary rows={data.rows}/></div><section className="neu-surface" aria-label="Ringkasan hasil perusahaan" style={{ padding: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}><strong>Hasil perusahaan · {data.sessions} sesi</strong><span style={{ fontSize: 12, color: "var(--nt-text-3)" }}>{data.members} anggota dengan sesi</span></div>
    {data.clean > 0 ? <div className="company-results visual-company-rings">{[["Fatigue rata-rata",data.meanFI,"#2563eb"],["Beban kognitif",data.meanCLI,"#8b5cf6"],["Engagement",data.meanEI,"#0891b2"]].map(([label,value,color])=><ArchiveMetricRing key={label} label={label} value={value} color={color}/>)}</div> : <div className="personal-result-empty"><VisualIcon name="chart" size={38}/><strong>Belum ada hasil EEG tersimpan</strong></div>}
    <div className="visual-summary-line"><span className="supervisor-result-tag">{data.clean ? labels[window.ntSessionInsights.status(data.meanFI,data.meanCLI)] : "Belum dinilai"}</span><span>{data.clean} hasil bersih</span><details className="visual-info"><summary aria-label="Metode ringkasan perusahaan" title="Metode ringkasan perusahaan"><VisualIcon name="info"/></summary><p>{data.partial} hasil terbatas dikecualikan; {data.provisional} hasil bersih masih memakai acuan sementara. Indeks prototipe untuk bahan evaluasi K3.</p></details></div>
    <h3 style={{ fontSize: 14 }}>Tren fatigue per hari</h3>{plotted.length ? <svg viewBox="0 0 670 165" width="100%" role="img" aria-label="Tren fatigue perusahaan per hari">{[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1="38" x2="638" y1={132 - v * 1.05} y2={132 - v * 1.05} stroke="var(--nt-bg-deep)" /><text x="5" y={136 - v * 1.05} fontSize="10" fill="currentColor">{v}</text></g>)}<path d={plotted.map((p) => p.segment).join("")} stroke="#2563eb" strokeWidth="2.5" fill="none" />{plotted.map((p) => <circle key={p.date} cx={p.x} cy={p.y} r="4" fill="#2563eb"><title>{p.date}: {p.fi}/100</title></circle>)}<text x="38" y="158" fontSize="10" fill="currentColor">{points[0].date}</text><text x="638" y="158" textAnchor="end" fontSize="10" fill="currentColor">{points[points.length - 1].date}</text></svg> : <p className="archive-empty">Belum ada hasil bersih untuk grafik pada periode ini.</p>}
    <details className="visual-method"><summary><VisualIcon name="info" size={16}/>Metode grafik</summary><p>Rerata ditimbang berdasarkan jumlah hasil bersih. Hari tanpa data tidak disambungkan. Indikator prototipe untuk bahan evaluasi K3.</p></details>
  </section></>;
};
