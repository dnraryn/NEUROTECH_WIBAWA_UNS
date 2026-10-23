// Shared archive UI. Demo records are explicitly labelled and never uploaded.
const archiveNumber = (v, digits = 0) => Number.isFinite(v) ? v.toLocaleString("id-ID", { maximumFractionDigits: digits }) : "—";
const archiveDate = (v) => new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
const useSessionArchive = () => {
  const read = () => ({...window.ntSessionArchive.state(),teamLive:window.ntTeamLive?.state?.()});
  const [state, setState] = React.useState(read);
  React.useEffect(() => { const update = () => setState(read()); window.addEventListener("nt-archive", update); window.addEventListener("nt-team-live",update); update(); return () => {window.removeEventListener("nt-archive", update);window.removeEventListener("nt-team-live",update);}; }, []);
  return state;
};
const archiveDownload = (r) => window.ntReports.download(window.ntReports.minutes(r), window.ntReports.filename("Per-menit", r));
const archiveSummaryDownload = (rows, record) => window.ntReports.download(window.ntReports.summary(rows), window.ntReports.filename("Ringkasan", record));
const archivePrint = (r) => {
  const report = window.open("", "_blank");
  if (!report) { window.toast?.("Izinkan jendela cetak untuk menyimpan laporan sebagai PDF.", { kind: "info" }); return; }
  report.opener = null;
  const esc = (v) => String(v ?? "—").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const s = r.summary, assessment = window.ntSessionInsights.assess(r);
  const rows = r.minutes.map((m) => `<tr><td>${m.minute + 1}</td><td>${m.n}</td><td>${m.partial}</td><td>${m.n ? archiveNumber(m.fi / m.n) : "—"}</td><td>${m.n ? archiveNumber(m.cli / m.n) : "—"}</td><td>${m.n ? archiveNumber(m.ei / m.n) : "—"}</td><td>${m.incidents}</td></tr>`).join("");
  report.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>NeuroTech · ${esc(r.id)}</title><style>body{font:13px/1.6 system-ui,sans-serif;color:#172554;max-width:900px;margin:36px auto;padding:0 24px}h1{line-height:1.2}small{color:#475569}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{text-align:left;border-bottom:1px solid #cbd5e1;padding:8px}.notice{padding:14px;background:#eff6ff;border-left:4px solid #2563eb}button{padding:10px 18px;cursor:pointer}tr{break-inside:avoid}thead{display:table-header-group}@media print{button{display:none}body{margin:0;max-width:none}@page{size:A4;margin:18mm}}</style></head><body>
    <button onclick="window.print()">Cetak / Simpan sebagai PDF</button><p>NEUROTECH · PEMANTAUAN FATIGUE</p><h1>${r.source === "demo" ? "SIMULASI · " : ""}Laporan sesi K3</h1><p><b>${esc(window.ntReports.person(r))}</b> · ${esc(window.ntReports.company(r))}</p><small>${esc(r.id)} · ${esc(r.shift)} · ${esc(r.protocol)} · ${esc(r.algorithmVersion)}</small>
    <p>${esc(archiveDate(r.startedAt))} — ${r.endedAt ? esc(archiveDate(r.endedAt)) : "Sesi masih berjalan"}</p><div class="notice">${r.source === "demo" ? "DATA SIMULASI, bukan pengukuran pekerja. " : ""}Indeks memakai aturan EEG prototipe. Laporan ini adalah bahan evaluasi fatigue, bukan diagnosis atau sertifikasi kepatuhan SMK3. Hasil terbatas tidak masuk rerata. ${s.provisional} jendela bersih memakai baseline sementara.</div>
    <h2>Kesimpulan sesi</h2><p><b>${esc(assessment.title)}</b> · ${esc(assessment.action)}<br>${assessment.calibratedWindows} hasil dari menit yang seluruhnya pascakalibrasi. Kebijakan prototipe: minimal 30 hasil pascakalibrasi dan 60% hasil bersih; bukan ambang klinis. Pada sesi terbaru, indeks direkam setelah kalibrasi; arsip lama dapat memuat hasil sementara.</p>
    <h2>Ringkasan hasil</h2><p>Fatigue rata-rata: <b>${archiveNumber(s.meanFI)}/100</b> · Puncak: ${archiveNumber(s.maxFI)}/100<br>Beban kognitif: ${archiveNumber(s.meanCLI)}/100 · Engagement: ${archiveNumber(s.meanEI)}/100<br>Indikasi microsleep: ${s.incidents} kejadian.</p>
    <p>Durasi sesi: ${archiveNumber(s.durationMinutes, 1)} menit · EEG diterima: ${archiveNumber(s.receivedMinutes, 1)} menit.<br>Jendela bersih: ${s.clean} · Terbatas: ${s.partial} · Proporsi bersih dari hasil olahan: ${archiveNumber(s.cleanPercent)}%.</p>
    <h2>Kondisi yang dilaporkan pengguna</h2><p>Tidur terakhir: ${archiveNumber(r.checkin.sleptHours, 1)} jam · Target: ${archiveNumber(r.checkin.sleepTargetHours, 1)} jam · Kekurangan terhadap target: ${archiveNumber(s.sleepDebt, 1)} jam.<br>Kantuk: ${archiveNumber(r.checkin.sleepiness)}/5.<br>${esc(r.checkin.note || "Belum ada catatan.")}</p>
    <h2>Ringkasan per menit</h2><table><thead><tr><th>Menit</th><th>Bersih</th><th>Terbatas</th><th>FI</th><th>CLI</th><th>EI</th><th>Indikasi</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Belum ada hasil bersih.</td></tr>'}</tbody></table><h2>Evaluasi petugas</h2><p style="white-space:pre-wrap">${esc(r.review?.note || "Belum ditinjau petugas K3.")}</p><p>Petugas: ${esc(r.review?.reviewerUid || "Belum tercatat")} | ${r.review?.reviewedAt ? esc(archiveDate(r.review.reviewedAt)) : ""}</p><small>Sumber: ${esc(r.source)} · ${r.synced ? "Tersinkron Firebase" : "Salinan perangkat"}. Gelombang EEG mentah tidak disertakan.</small></body></html>`);
  report.document.close(); report.focus();
};
const SessionControl = ({ onOpen, ownOnly = false }) => {
  const state = useSessionArchive(), active = state.rows.find((r) => r.id === state.activeId);
  const account = window.ntSession?.get();
  const archiveCount = state.rows.filter((r) => !ownOnly || !account || r.ownerUid === account.uid).length;
  const [busy, setBusy] = React.useState(false);
  const act = async () => { if (busy) return; setBusy(true); try { if (active) { const r = await window.ntSessionArchive.finish(); onOpen?.(r?.id); } else window.ntSessionArchive.begin(); } catch (e) { window.toast?.(e.message, { kind: "info" }); } finally { setBusy(false); } };
  return <section className="archive-session-control" aria-label="Penyimpanan sesi"><div><span className={`archive-dot ${active ? "is-active" : ""}`} /><strong>{active ? "Sesi sedang direkam" : "Sesi & laporan K3"}</strong><p>{active ? `${archiveNumber(active.summary.receivedMinutes, 1)} menit EEG · ${active.summary.clean} hasil bersih · ${active.summary.partial} terbatas` : "Simpan hasil, lihat perubahan, dan catat tindak lanjut."}</p></div><div className="archive-actions"><button type="button" className="frm-button" disabled={busy || !state.ready} onClick={act}>{busy ? "Menyimpan…" : active ? "Selesai & simpan" : "Mulai sesi Muse"}</button>{onOpen && <button type="button" className="archive-primary" onClick={() => onOpen(null)}>Arsip laporan ({archiveCount})</button>}</div></section>;
};
const ArchiveTrend = ({ record }) => {
  const series = [{ key: "fi", label: "Fatigue", color: "#2563eb" }, { key: "cli", label: "Beban kognitif", color: "#8b5cf6" }, { key: "ei", label: "Engagement", color: "#0891b2" }];
  const maxMinute = Math.max(1, ...record.minutes.map((m) => m.minute));
  return <div className="archive-chart"><div className="archive-chart-labels">{series.map((s) => <span key={s.key} style={{ color: s.color }}>● {s.label}</span>)}</div>{record.minutes.some((m) => m.n) ? <><svg viewBox="0 0 650 160" role="img" aria-label="Tren rerata indeks EEG per menit">{[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1="32" x2="635" y1={130 - v * 1.1} y2={130 - v * 1.1} stroke="var(--nt-bg-deep)" /><text x="2" y={134 - v * 1.1} fill="currentColor" fontSize="10">{v}</text></g>)}{series.map((s) => {
    let previous = null; const points = [], segments = [];
    record.minutes.forEach((m) => { if (!m.n) { previous = null; return; } const p = { x: 32 + m.minute / maxMinute * 600, y: 130 - m[s.key] / m.n * 1.1, minute: m.minute }; if (previous && p.minute === previous.minute + 1) segments.push(`M${previous.x},${previous.y}L${p.x},${p.y}`); points.push(p); previous = p; });
    return <g key={s.key}><path d={segments.join("")} fill="none" stroke={s.color} strokeWidth="2.5" />{points.map((p) => <circle key={p.minute} cx={p.x} cy={p.y} r="3" fill={s.color} />)}</g>;
  })}<text x="32" y="154" fontSize="10" fill="currentColor">Menit 1</text><text x="635" y="154" fontSize="10" textAnchor="end" fill="currentColor">Menit {maxMinute + 1}</text></svg><p className="archive-muted">Rerata per menit dari hasil bersih. Slot tanpa hasil tetap kosong; hasil terbatas tidak masuk grafik ini.</p></> : <p className="archive-empty">Belum ada jendela bersih untuk grafik. Periksa kualitas sensor.</p>}</div>;
};
const SessionReport = ({ record: r }) => {
  const [note, setNote] = React.useState(r.review?.note || ""), [busy, setBusy] = React.useState(false), [feedback, setFeedback] = React.useState("");
  const s = r.summary, account = window.ntSession?.get(), assessment = window.ntSessionInsights.assess(r);
  const [action, setAction] = React.useState("Pantau ulang");
  const [actionState, setActionState] = React.useState("Direncanakan");
  const [followup, setFollowup] = React.useState("");
  const canReview = !r.review && r.status !== "recording" && (!account || ["management", "supervisor"].includes(account.role));
  const review = async (e) => { e.preventDefault(); setBusy(true); setFeedback(""); try { await window.ntSessionArchive.review(r.id, `Tindakan: ${action} (${actionState}).\nPantau berikutnya: ${followup.trim() || "Belum ditentukan"}.\nEvaluasi: ${note.trim()}`); setFeedback("Evaluasi tersimpan."); } catch (error) { setFeedback(error.message); } finally { setBusy(false); } };
  return <article className="archive-report"><div className="archive-report-heading"><div><span className="archive-kicker">{r.source === "demo" ? "SIMULASI · CONTOH LAPORAN" : "LAPORAN SESI EEG"}</span><h2>{window.ntReports.person(r)}</h2><p>{window.ntReports.company(r)} · {archiveDate(r.startedAt)}</p><p className="archive-muted">Shift {r.shift} · {r.protocol} · {r.status === "recording" ? "Sedang berjalan" : r.status === "interrupted" ? "Sesi terputus" : "Sesi selesai"}</p></div><div className="archive-actions"><button type="button" className="frm-button" onClick={() => archiveSummaryDownload([r], r)}>CSV ringkasan</button><button type="button" className="frm-button" onClick={() => archiveDownload(r)}>CSV per menit</button><button type="button" className="archive-primary" onClick={() => archivePrint(r)}>Cetak / Simpan PDF</button></div></div>
    <div className="archive-stats">{[{ l: "Rerata fatigue", v: s.meanFI, unit: "/100" }, { l: "Beban kognitif", v: s.meanCLI, unit: "/100" }, { l: "Engagement", v: s.meanEI, unit: "/100" }, { l: "Indikasi microsleep", v: s.incidents, unit: "kejadian" }].map((m) => <div key={m.l}><span>{m.l}</span><strong>{archiveNumber(m.v)} <small>{m.unit}</small></strong></div>)}</div>
    <div className={`archive-takeaway is-${assessment.status}`} aria-label="Kesimpulan sesi"><strong>{assessment.title}</strong><p>{assessment.action}</p><p>{s.clean ? `Fatigue rata-rata ${s.meanFI}/100; puncak ${s.maxFI}/100.` : "Kesimpulan fatigue belum tersedia."}</p><details><summary>Kualitas & metode</summary><p>{assessment.calibratedWindows} hasil dari menit yang seluruhnya sudah terkalibrasi. {s.partial} hasil terbatas dikecualikan; {s.provisional} hasil masih memakai baseline awal.</p><p>Kesimpulan memerlukan ≥30 hasil pascakalibrasi dan ≥60% hasil bersih. Pada arsip lama, menit campuran kalibrasi dan pengukuran dikecualikan karena jumlah nilainya belum dipisah. Rerata arsip/grafik tetap mencakup semua hasil bersih. Arsip versi lama dipertahankan tanpa kesimpulan baru.</p><p>Batas tersebut merupakan kebijakan prototipe, bukan validasi klinis atau skor kepatuhan SMK3.</p></details></div><ArchiveTrend record={r} />
    <div className="archive-two-col"><section className="archive-subcard"><h3>Kualitas & cakupan</h3><p>Durasi sesi: <strong>{archiveNumber(s.durationMinutes, 1)} menit</strong></p><p>EEG diterima: {archiveNumber(s.receivedMinutes, 1)} menit</p><p>Hasil bersih / terbatas: {s.clean} / {s.partial}</p><p>Proporsi bersih dari hasil olahan: {archiveNumber(s.cleanPercent)}%</p><p className="archive-muted">Paket diterima tidak selalu berarti EEG layak. Proporsi ini membandingkan hasil olahan yang tersedia.</p></section><section className="archive-subcard"><h3>Check-in pengguna</h3><p>Tidur terakhir: <strong>{archiveNumber(r.checkin.sleptHours, 1)} jam</strong></p><p>Kekurangan terhadap target: {archiveNumber(s.sleepDebt, 1)} jam</p><p>Kantuk yang dilaporkan: {archiveNumber(r.checkin.sleepiness)}/5</p><p>{r.checkin.note || "Belum ada catatan pengguna."}</p><p className="archive-muted">Tidur dan kantuk diisi pengguna, bukan hasil EEG.</p></section></div>
    <section className="archive-subcard"><h3>Evaluasi & tindak lanjut</h3>{r.review ? <><p style={{ whiteSpace: "pre-wrap" }}>{r.review.note}</p><p className="archive-muted" style={{ overflowWrap: "anywhere" }}>Petugas: {r.review.reviewerUid || "Belum tercatat"} {r.review.reviewedAt ? ` | ${archiveDate(r.review.reviewedAt)}` : ""}</p><span className="archive-badge">{r.source === "demo" ? "Contoh evaluasi" : "Ditinjau petugas"}</span></> : <p className="archive-muted">Belum ditinjau petugas K3.</p>}{canReview && <form onSubmit={review}><label className="archive-field">Tindakan<select aria-label="Tindakan" value={action} onChange={(e) => setAction(e.target.value)}>{["Pantau ulang", "Jeda dan evaluasi", "Rujuk petugas K3", "Tidak ada tindakan tambahan"].map((v) => <option key={v}>{v}</option>)}</select></label><label className="archive-field">Pelaksanaan<select aria-label="Pelaksanaan" value={actionState} onChange={(e) => setActionState(e.target.value)}><option>Direncanakan</option><option>Sudah dilakukan</option></select></label><label className="archive-field">Waktu pemantauan berikutnya<input value={followup} onChange={(e) => setFollowup(e.target.value)} maxLength={100} placeholder="Contoh: sebelum shift berikutnya" /></label><label className="archive-field">Catatan evaluasi<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} rows={3} placeholder="Kondisi, tindakan yang dilakukan, dan rencana pemantauan berikutnya." required /></label><p className="archive-muted">Evaluasi disimpan sebagai catatan tetap. Jadwal ini dicatat untuk petugas, tanpa pengingat otomatis.</p><button className="frm-button" disabled={busy}>{busy ? "Menyimpan…" : r.source === "demo" ? "Coba simpan evaluasi demo" : "Simpan evaluasi petugas"}</button></form>}{feedback && <p role="status">{feedback}</p>}</section><p className="archive-muted">{r.synced ? "Tersinkron ke Firebase." : "Salinan perangkat; belum tersinkron ke Firebase."} ID: {r.id} · {r.algorithmVersion}</p></article>;
};
const SessionArchiveHub = ({ initialId = null, ownOnly = false }) => {
  const state = useSessionArchive(), [selected, setSelected] = React.useState(initialId), [days, setDays] = React.useState(30), [source, setSource] = React.useState("all");
  const [checkinOpen, setCheckinOpen] = React.useState(false), [note, setNote] = React.useState(""), [sleepiness, setSleepiness] = React.useState("");
  const [feedback, setFeedback] = React.useState(""), [busy, setBusy] = React.useState(false);
  React.useEffect(() => setSelected(initialId), [initialId]);
  const account = window.ntSession?.get();
  const staff = !!account && !ownOnly && ["supervisor", "management"].includes(account.role);
  const visible = window.ntSessionInsights.rows(state, { ownOnly });
  const active = visible.find((r) => r.id === state.activeId), record = visible.find((r) => r.id === selected);
  const rows = visible.filter((r) => r.startedAt >= Date.now() - days * 86400000 && (source === "all" || r.source === source));
  const demo = async () => { setBusy(true); try { const r = await window.ntSessionArchive.demo(); setSelected(r.id); } catch (e) { setFeedback(e.message); } finally { setBusy(false); } };
  const saveCheckin = async (e) => { e.preventDefault(); try { const ok = await window.ntSessionArchive.updateCheckin({ sleepiness: sleepiness ? Number(sleepiness) : null, note }); setFeedback(ok ? "Check-in disimpan pada perangkat." : "Check-in tersedia di memori; penyimpanan perangkat belum berhasil."); setCheckinOpen(false); } catch (e) { setFeedback(e.message); } };
  if (record) return <div className="archive-hub"><button type="button" className="archive-back" onClick={() => setSelected(null)}>← Semua laporan</button><SessionReport key={record.id} record={record} /></div>;
  return <div className={"archive-hub" + (staff ? " archive-hub--staff" : "")}>{!staff && <section className="archive-hero"><div><span className="archive-kicker">PANTAU · PAHAMI · TINDAK LANJUTI</span><h2>Sesi hari ini, riwayat yang bisa dibuka kembali.</h2><p>Hasil EEG, kondisi sebelum bekerja, dan evaluasi petugas dalam satu arsip.</p></div><div className="archive-hero-icon" aria-hidden="true">↗</div></section>}
    <div className="archive-storage" role="status"><span className="archive-badge">{state.storage === "device" ? "Arsip perangkat" : state.storage === "loading" ? "Memuat arsip…" : "Memori sementara"}</span><span>{state.cloudEnabled ? "Sesi akun tersinkron berkala saat koneksi tersedia." : "Pratinjau lokal · belum tersinkron lintas perangkat."}</span>{state.cloudEnabled && <button type="button" className="archive-back" disabled={state.syncing} onClick={() => window.ntSessionArchive.sync()}>{state.syncing ? "Menyinkronkan…" : "Sinkronkan"}</button>}</div>
    {(state.error || state.cloudError) && <p className="archive-warning" role="alert">{state.error || state.cloudError}</p>}{!staff && <><SessionControl ownOnly={ownOnly} onOpen={setSelected} /><div className="archive-steps"><span><b>1</b> Hubungkan & cek sensor</span><span><b>2</b> Catat kondisi awal</span><span><b>3</b> Pantau, simpan, evaluasi</span></div></>}
    {active && <button type="button" className="archive-back" onClick={() => { setNote(active.checkin.note); setSleepiness(String(active.checkin.sleepiness || "")); setCheckinOpen(!checkinOpen); }}>Isi check-in sesi aktif →</button>}
    {checkinOpen && active && <form className="archive-subcard" onSubmit={saveCheckin}><label className="archive-field">Seberapa mengantuk sekarang?<select value={sleepiness} onChange={(e) => setSleepiness(e.target.value)}><option value="">Belum diisi</option>{["1 · Tidak mengantuk", "2 · Sedikit", "3 · Sedang", "4 · Mengantuk", "5 · Sangat mengantuk"].map((v, i) => <option key={v} value={i + 1}>{v}</option>)}</select></label><label className="archive-field">Catatan kondisi<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} /></label><p className="archive-muted">Durasi tidur mengikuti Data sesi pada dashboard saat check-in ini disimpan.</p><button className="archive-primary">Simpan check-in</button></form>}{feedback && <p role="status">{feedback}</p>}
    <div className="archive-list-heading"><h3>Riwayat sesi <span className="archive-muted">({rows.length})</span></h3><button type="button" className="frm-button" disabled={!rows.length} onClick={() => archiveSummaryDownload(rows)}>Unduh ringkasan CSV</button><div className="archive-actions"><label>Periode <select aria-label="Periode arsip" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>7 hari</option><option value={30}>30 hari</option><option value={365}>1 tahun</option></select></label><label>Sumber <select aria-label="Sumber arsip" value={source} onChange={(e) => setSource(e.target.value)}><option value="all">Semua</option><option value="muse">Muse nyata</option><option value="demo">Simulasi</option></select></label></div></div>
    {!window.ntSession?.get() && <div className="archive-demo-prompt"><span>Belum ada alat? Lihat contoh grafik dan laporan dengan data simulasi.</span><button type="button" className="frm-button" disabled={busy || !state.ready} onClick={demo}>{busy ? "Menyiapkan…" : "Lihat contoh laporan"}</button></div>}
    {!rows.length ? <div className="archive-empty"><strong>Belum ada sesi tersimpan.</strong><p>{account ? "Hubungkan Muse dan simpan sesi agar riwayat pengukuran tersedia." : "Hubungkan Muse untuk sesi nyata, atau buka contoh simulasi untuk menilai tampilan."}</p></div> : <div className="archive-list">{rows.map((r) => <button type="button" className="archive-list-card" key={r.id} onClick={() => setSelected(r.id)}><div><span className={`archive-badge ${r.source === "demo" ? "is-demo" : ""}`}>{r.source === "demo" ? "Simulasi" : "Muse nyata"}</span><h3>{window.ntReports.person(r)}</h3><p>{archiveDate(r.startedAt)}</p><p>{r.shift} · {archiveNumber(r.summary.durationMinutes, 1)} menit · {r.review ? "Ditinjau" : r.status === "recording" ? "Sedang direkam" : "Belum ditinjau"}</p><small>{r.synced ? "Tersinkron Firebase" : state.storage === "device" ? "Tersimpan di perangkat" : "Memori sementara"}</small></div><div className="archive-list-value"><span>Rerata FI</span><strong>{archiveNumber(r.summary.meanFI)}</strong><small>{r.summary.clean} hasil bersih</small></div><span aria-hidden="true">→</span></button>)}</div>}
    <details className="archive-muted"><summary>Info arsip & ekspor</summary><p>CSV Excel memakai pemisah titik koma dan menyertakan nama, waktu beserta zona waktu, serta konteks pengukuran. Arsip berisi ringkasan per menit, kualitas hasil, dan check-in. EEG mentah tidak disimpan. Arsip perangkat dapat hilang jika data situs dihapus.</p></details></div>;
};
const WorkerSessionPanel = ({ compact = false }) => {
  const archive = useSessionArchive(), account = window.ntSession?.get();
  const [device, setDevice] = React.useState(() => window.ntMobileMonitor.state());
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    const update = () => setDevice(window.ntMobileMonitor.state());
    window.addEventListener("nt-mobile-monitor", update); update();
    return () => window.removeEventListener("nt-mobile-monitor", update);
  }, []);
  const active = archive.rows.find((r) => r.id === archive.activeId && r.ownerUid === account?.uid);
  const own = archive.rows.filter((r) => r.ownerUid === account?.uid && r.source === "muse");
  const pending = own.filter((r) => !r.synced).length;
  const end = async () => {
    if (busy) return; setBusy(true);
    try { await window.ntSessionArchive.finish(); await window.ntDeviceDisconnect(); }
    catch (error) { window.toast?.(error.message || "Sesi belum dapat diselesaikan.", { kind: "warn" }); }
    finally { setBusy(false); }
  };
  const cloudText = !archive.cloudEnabled ? "Pratinjau lokal"
    : !device.online ? "Offline · menunggu koneksi"
    : archive.syncing ? "Menyimpan…"
    : archive.cloudError ? "Sinkronisasi tertunda"
    : !archive.serverConfirmed ? "Memeriksa Firebase…"
    : pending && !active ? "Menunggu sinkronisasi" : pending || !own.length ? "Sinkron otomatis" : "Tersimpan di Firebase";
  return <section className={`worker-session-panel ${compact ? "worker-session-panel--compact" : "worker-session-panel--hero"}`} aria-label="Koneksi dan pengiriman sesi">
    <div className="worker-session-heading"><div><span className="worker-device-badge"><span />{device.connected ? "Muse terhubung" : "MUSE EEG"}</span><h2>{active ? "Sesi berlangsung" : device.connected ? "Muse siap" : "Mulai pemantauan"}</h2></div>{!compact && <svg className="worker-muse-art" viewBox="0 0 100 76" aria-hidden="true"><path d="M12 54V41a38 38 0 0 1 76 0v13"/><rect x="8" y="40" width="15" height="26" rx="7"/><rect x="77" y="40" width="15" height="26" rx="7"/><path d="M30 37h9l5-10 9 24 6-14h11"/></svg>}</div>
    {active && <p className="worker-session-count">{archiveNumber(active.summary.receivedMinutes, 1)} menit EEG · {active.summary.clean} hasil bersih</p>}
    <div className="worker-session-actions">{compact && active ? <button type="button" className="archive-primary" disabled={busy} onClick={end}>{busy ? "Menyelesaikan…" : "Akhiri sesi"}</button> : <DeviceButton embedded />}{compact && !active && device.connected && <button type="button" className="frm-button" disabled={!archive.ready || busy} onClick={() => { try { window.ntSessionArchive.begin(); } catch (error) { window.toast?.(error.message, { kind: "warn" }); } }}>Mulai sesi baru</button>}</div>
    {!device.connected && <p className="worker-power-note">Nyalakan Muse dengan tombol fisiknya terlebih dahulu.</p>}
    <p className="worker-cloud-status" role="status"><span className={`archive-dot ${archive.cloudEnabled && device.online && !archive.cloudError && !pending && own.length ? "is-active" : ""}`} />{cloudText}{device.connected && <span className="worker-foreground-note"> · Biarkan halaman terbuka</span>}</p>
    {archive.error && <p className="worker-session-warning" role="alert">Penyimpanan perangkat bermasalah. Buka opsi sesi.</p>}
    {device.message && <p role="status" className="worker-session-warning">Layar belum dapat dijaga menyala.</p>}
    <details className="worker-session-options"><summary>Opsi sesi</summary>
      {device.connected && <><button type="button" className="frm-button" onClick={() => window.ntMuseClearBaseline?.()}>Kalibrasi ulang</button><p>Kalibrasi saat terjaga, mata terbuka, dan duduk tenang.</p></>}
      {device.wakeSupported && <label className="worker-wake-control"><input type="checkbox" checked={device.keepAwake} onChange={(e) => window.ntMobileMonitor.setKeepAwake(e.target.checked)} /><span>Jaga layar tetap menyala<small>{device.awake ? "Aktif selama Muse tersambung" : device.keepAwake ? "Menunggu sesi aktif / izin browser" : "Opsional selama pemantauan"}</small></span></label>}
      <p>Ringkasan dikirim otomatis setiap sekitar 1 menit dan saat sesi selesai. Hindari mengunci ponsel selama merekam.</p>
      <p>Tujuan: {account?.companyName || "Perusahaan"} · {account?.code || "lokal"}. Supervisor/manajemen membuka portal perusahaan yang sama di laptop, tanpa memasangkan Muse lagi.{archive.lastSyncedAt ? ` Pembaruan Firebase terakhir: ${new Date(archive.lastSyncedAt).toLocaleTimeString("id-ID")}.` : ""}</p>
      {active && <p>{active.summary.partial} hasil terbatas · tidak masuk rerata laporan.</p>}
      {(archive.error || archive.cloudError || device.message) && <p role="status">{archive.error || archive.cloudError || device.message}</p>}
      {!compact && active && <button type="button" className="frm-button" disabled={busy} onClick={end}>{busy ? "Menyelesaikan…" : "Akhiri sesi"}</button>}
    </details>
  </section>;
};
const WorkerSessionArchive = () => {
  const [open, setOpen] = React.useState(false);
  if (window.ntSession?.get()) return <div className="worker-live-session"><WorkerSessionPanel compact /><Link className="archive-back" to="/w/stats">Lihat arsip pribadi</Link></div>;
  return <div style={{ margin: "12px 24px" }}><SessionControl ownOnly onOpen={() => setOpen(true)} /><Modal open={open} onClose={() => setOpen(false)} title="Sesi & laporan pribadi" width={900} actions={<NeuroBtn tone="primary" onClick={() => setOpen(false)}>Tutup</NeuroBtn>}><button type="button" className="archive-back" onClick={() => setOpen(false)}>← Kembali ke pemantauan</button><SessionArchiveHub ownOnly /></Modal></div>;
};
const PersonalSessionSettings = () => {
  const initial = () => { const m = window.ntSessionMetrics.get(); return { sleptHours: m.sleptHours === null ? "" : String(m.sleptHours), sleepTargetHours: String(m.sleepTargetHours), targetMinutes: String(m.targetMinutes) }; };
  const [draft, setDraft] = React.useState(initial), [feedback, setFeedback] = React.useState(""), [busy, setBusy] = React.useState(false);
  const save = async (event) => {
    event.preventDefault(); if (busy) return; setBusy(true); setFeedback("");
    try {
      const saved = window.ntSessionMetrics.update({ sleptHours: draft.sleptHours.trim() === "" ? null : Number(draft.sleptHours), sleepTargetHours: Number(draft.sleepTargetHours), targetMinutes: Number(draft.targetMinutes) });
      const archive = window.ntSessionArchive.state(), active = archive.rows.find((r) => r.id === archive.activeId);
      const checkinSaved = active ? await window.ntSessionArchive.updateCheckin({ sleepiness: active.checkin.sleepiness, note: active.checkin.note }) : true;
      setFeedback(!saved.persisted || !checkinSaved ? "Data tersedia pada sesi ini; penyimpanan perangkat belum berhasil sepenuhnya." : active ? "Data tidur dan target pantau tersimpan pada sesi aktif." : "Data tersimpan untuk sesi Muse berikutnya.");
    } catch (error) { setFeedback(error.message); } finally { setBusy(false); }
  };
  return <details className="archive-subcard personal-settings" onToggle={(event) => { if (event.currentTarget.open) setDraft(initial()); }}><summary>Catat tidur & target pantau</summary><form onSubmit={save}>
    <p>Tidur diisi sendiri. Target pantau digunakan untuk menghitung cakupan pengukuran harian.</p>
    <label className="archive-field">Tidur terakhir (jam)<input type="number" min="0" max="24" step="0.1" value={draft.sleptHours} onChange={(e) => setDraft({ ...draft, sleptHours: e.target.value })} placeholder="Belum diisi" /></label>
    <label className="archive-field">Target tidur (jam)<input required type="number" min="1" max="16" step="0.1" value={draft.sleepTargetHours} onChange={(e) => setDraft({ ...draft, sleepTargetHours: e.target.value })} /></label>
    <label className="archive-field">Target pantau harian (menit)<input required type="number" min="1" max="1440" step="1" value={draft.targetMinutes} onChange={(e) => setDraft({ ...draft, targetMinutes: e.target.value })} /></label>
    <button type="submit" className="archive-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan data pribadi"}</button>{feedback && <p role="status">{feedback}</p>}
  </form></details>;
};
Object.assign(window, { useSessionArchive, SessionControl, SessionArchiveHub, SessionReport, WorkerSessionArchive, WorkerSessionPanel });
