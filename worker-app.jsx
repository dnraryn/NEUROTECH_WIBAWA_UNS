const useWorkerApp = () => {
  const read = () => window.ntPWA?.state() || { installed: false, canInstall: false, updateAvailable: false };
  const [state, setState] = React.useState(read);
  React.useEffect(() => {
    const refresh = () => setState(read());
    window.addEventListener("nt-pwa", refresh);
    window.addEventListener("nt-device", refresh);
    window.addEventListener("nt-archive", refresh);
    return () => {
      window.removeEventListener("nt-pwa", refresh);
      window.removeEventListener("nt-device", refresh);
      window.removeEventListener("nt-archive", refresh);
    };
  }, []);
  return state;
};

const WorkerAppInstallCard = ({ always = false, showUpdates = false }) => {
  const state = useWorkerApp();
  const [help, setHelp] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (state.installed && !state.updateAvailable && !always) return null;
  const install = async () => {
    if (busy) return;
    if (!state.canInstall) { setHelp(!help); return; }
    setBusy(true);
    try { const result = await window.ntPWA.install(); if (result === "manual") setHelp(true); }
    finally { setBusy(false); }
  };
  return <section className="worker-app-card" aria-label="Aplikasi pekerja">
    <div className="worker-app-card-main"><img src="assets/worker-app-192.png" width="42" height="42" alt="" />
      <div><strong>{state.installed ? "NeuroTech di HP Anda" : "NeuroTech di layar utama"}</strong><span>{state.installed ? "Aplikasi pekerja" : "Buka lebih cepat seperti aplikasi."}</span></div>
      {!state.installed && <button type="button" onClick={install} disabled={busy}>{busy ? "Membuka…" : "Pasang"}</button>}
      {state.installed && always && <span className="worker-app-installed">Terpasang</span>}
    </div>
    {showUpdates && state.updateAvailable && <div className="worker-app-update"><span>Versi baru tersedia.</span><button type="button" onClick={() => {
      try { window.ntPWA.update(); } catch (error) { window.toast?.(error.message, { kind: "info" }); }
    }}>Perbarui aplikasi</button><small>Akhiri sesi dan putuskan Muse dahulu.</small></div>}
    {help && <div className="worker-app-help">
      <p>{ios ? "Di Safari: Bagikan → Tambahkan ke Layar Utama → Tambahkan." : "Di Chrome Android: menu ⋮ → Instal aplikasi atau Tambahkan ke layar utama → Instal."}</p>
      <p>{ios ? "Anda dapat membuka akun dan riwayat di iPhone. Koneksi Muse melalui web belum tersedia di Safari/iPhone; gunakan Chrome Android untuk pengukuran." : "Jika pilihan belum muncul, tunggu sebentar lalu buka menu browser lagi. Gunakan Chrome Android untuk menghubungkan Muse."}</p>
    </div>}
  </section>;
};

const VisualIcon = ({name="signal",size=20}) => {
  const paths={signal:"M3 12h4l3-7 4 14 3-7h4",chart:"M4 19h16M6 16v-4M12 16V5M18 16V9",team:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M18 8a3 3 0 0 1 0 6M22 21v-2a4 4 0 0 0-3-3.8",file:"M14 2H6v20h12V6zM14 2v5h5M8 12h8M8 16h6",info:"M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",history:"M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2",message:"M3 3h18v14H9l-6 4zM7 8h10M7 12h6",play:"M8 4l13 8-13 8z",check:"M4 12l5 5L20 6",settings:"M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0"};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.signal}/></svg>;
};

const MemberAccessCode = ({ companyCode, memberId, role }) => {
  const [code,setCode] = React.useState(""), [error,setError] = React.useState("");
  const [copied,setCopied] = React.useState(false);
  const session=window.ntSession?.get(),member=session?.members?.find(m=>m.id===memberId);
  const assigned=member?.accountCode || (session?.memberId===memberId ? session.accountCode : null);
  const identity=member?.loginCode || (session?.memberId===memberId ? session.loginCode : null);
  const link=window.ntPortal.accessLink({accountCode:code,loginCode:identity},companyCode);
  const canCreate=["supervisor","management"].includes(session?.role);
  const [linkCopied,setLinkCopied]=React.useState(false);
  React.useEffect(()=>{setCode(assigned || "");setError("");setCopied(false);setLinkCopied(false);},[companyCode,memberId,role,assigned]);
  return <section className="member-access-code" aria-label="Kode akun"><div><small>Kode akun · {window.ntPortal.roles[role]?.label}</small><output>{code || "Belum dibuat"}</output></div>
    <button type="button" disabled={!code && !canCreate} aria-label={code ? "Salin kode akun" : "Buat kode akun"} onClick={async()=>{
      try{if(!code){const value=await window.ntCompany.ensureAccountCode(memberId);setCode(value);}else{await navigator.clipboard.writeText(code);setCopied(true);}}catch{setError(code ? "Salin kode secara manual." : "Kode belum dapat dibuat. Hubungi pengelola perusahaan.");}
    }}>{copied ? <VisualIcon name="check" size={18}/> : code ? "Salin" : "Buat kode"}</button>
    {link && <button type="button" className="account-link-copy" onClick={async()=>{try{await navigator.clipboard.writeText(link);setLinkCopied(true);setError("");}catch{setError("Salin alamat tautan masuk di bawah secara manual.");}}}>{linkCopied ? "Tautan tersalin" : "Salin tautan masuk"}</button>}
    <p role={error ? "alert" : undefined}>{error || "Buka tautan masuk sekali di HP/laptop, lalu login dengan kode dan password."}</p>
    {error && link && <a className="account-link-manual" href={link}>Tautan masuk {code}</a>}
  </section>;
};

const AccountPasswordForm = () => {
  const [current,setCurrent]=React.useState(""),[next,setNext]=React.useState(""),[confirm,setConfirm]=React.useState("");
  const [busy,setBusy]=React.useState(false),[feedback,setFeedback]=React.useState("");
  return <details className="account-password"><summary>Ganti password</summary><form onSubmit={async e=>{
    e.preventDefault();if(busy)return;setFeedback("");if(next!==confirm){setFeedback("Konfirmasi password belum sama.");return;}
    setBusy(true);try{await window.ntAuth.changePassword(current,next);setCurrent("");setNext("");setConfirm("");setFeedback("Password berhasil diganti.");}
    catch{setFeedback("Password belum diganti. Periksa password saat ini dan koneksi Anda.");}finally{setBusy(false);}
  }}><label>Password saat ini<input type="password" value={current} onChange={e=>setCurrent(e.target.value)} autoComplete="current-password" required disabled={busy}/></label><label>Password baru<input type="password" value={next} onChange={e=>setNext(e.target.value)} minLength={8} autoComplete="new-password" required disabled={busy}/></label><label>Ulangi password baru<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} autoComplete="new-password" required disabled={busy}/></label><button type="submit" className="archive-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan password"}</button>{feedback && <p role="status">{feedback}</p>}</form></details>;
};

const WorkerLiveSyncStatus = () => {
  const account=window.ntSession?.get();
  const [state,setState]=React.useState(()=>window.ntTeamLive?.state?.() || {});
  React.useEffect(()=>{const update=()=>setState(window.ntTeamLive?.state?.() || {});window.addEventListener("nt-team-live",update);update();return()=>window.removeEventListener("nt-team-live",update);},[]);
  if(account?.role!=="pekerja")return null;
  const label=!state.enabled ? "Pratinjau lokal" : state.online===false ? "HP offline" : state.error ? "Live belum terkirim" : state.sending ? "Mengirim Live..."
    : state.lastSentAt ? `Live terkirim ${new Date(state.lastSentAt).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}` : "Live siap dikirim saat Muse terhubung";
  return <section className={`worker-live-sync ${state.error || state.online===false ? "has-error" : ""}`} aria-label="Sinkronisasi Live pekerja"><div><span role="status"><span className={`archive-dot ${state.lastSentAt && !state.error && state.online!==false ? "is-active" : ""}`}/>{label}</span><small>{account.accountCode || "Pekerja"} · {account.code}</small></div>{state.error && <button type="button" onClick={()=>window.ntTeamLive.retry()}>Coba lagi</button>}</section>;
};

const WorkerCalibrationCard = () => {
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => {
    const update = () => refresh();
    for (const event of ["nt-data", "nt-device", "nt-muse-baseline"]) window.addEventListener(event, update);
    const timer = setInterval(update, 1000);
    return () => { clearInterval(timer); for (const event of ["nt-data", "nt-device", "nt-muse-baseline"]) window.removeEventListener(event, update); };
  }, []);
  const device = window.ntDeviceStatus?.() || {};
  const radio = window.ntMuse?.status?.() || {};
  const dsp = window.ntMuseDSP || {};
  if (!device.real || !device.connected) return null;
  if (dsp.baseline) return null;
  const target = dsp.baselineTarget || 40;
  const count = Math.min(target, Math.max(0, dsp.baselineCount || 0));
  const cal = dsp.calibration || {};
  const startedAt = cal.startedAt || radio.connectedAt;
  if (Number.isFinite(startedAt) && Date.now() - startedAt >= 60000) return null;
  const remaining = Number.isFinite(startedAt) ? Math.max(0, Math.ceil((60000 - (Date.now() - startedAt)) / 1000)) : 60;
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const stageLabels = { "device-check": "Periksa perangkat", stabilization: "Stabilisasi sinyal", baseline: "Baseline mata terbuka", validation: "Validasi baseline" };
  return <section className="worker-calibration-card" aria-label="Kalibrasi Muse">
    <div className="worker-calibration-top"><div><strong>{stageLabels[cal.stage] || "Persiapan Muse"}</strong><span>{cal.reason || "Duduk tenang, mata terbuka"}</span></div><output aria-label="Waktu persiapan tersisa">{clock}</output></div>
    <div className="worker-calibration-track" role="progressbar" aria-label="Kemajuan kalibrasi" aria-valuemin="0" aria-valuemax={target} aria-valuenow={count}><span style={{ width: `${count / target * 100}%` }} /></div>
    <small>{count}/{target} jendela bersih. Live Monitor terbuka setelah satu menit.</small>
  </section>;
};

const WorkerSignalStatus = () => {
  const info = window.ntManagement.signalReliability(window.ntMuse?.status?.() || {}, window.ntMuseDSP || {}, Date.now());
  return <section className={`worker-signal-status is-${info.kind}`} aria-label="Kualitas dan acuan hasil" role="status">
    <VisualIcon name="signal"/><strong>{info.label}</strong><span title="Sensor yang dipakai">{info.used.length}/{info.total}</span>
    <details className="visual-info"><summary title="Kualitas dan acuan hasil" aria-label="Info kualitas dan acuan hasil"><VisualIcon name="info"/></summary><p>{info.basis}. {info.action}</p></details>
  </section>;
};

const WorkerSignalDetails = () => {
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  const [pairing, setPairing] = React.useState(false);
  React.useEffect(() => {
    const update = () => refresh();
    const timer = setInterval(update, 1000);
    for (const event of ["nt-data", "nt-device"]) window.addEventListener(event, update);
    return () => { clearInterval(timer); for (const event of ["nt-data", "nt-device"]) window.removeEventListener(event, update); };
  }, []);
  const radio = window.ntMuse?.status?.() || {};
  const dsp = window.ntMuseDSP || {};
  const disconnected = !radio.connected && radio.lastDisconnect?.reason === "gatt";
  if (!radio.connected && !disconnected) return null;
  const now = Date.now();
  const receiving = radio.connected && radio.lastEEGAt && now - radio.lastEEGAt < 3000;
  const qualityFresh = dsp.quality?.checkedAt && now - dsp.quality.checkedAt < 5000;
  const gaps = dsp.stream?.discontinuities || 0;
  const cal = dsp.calibration || {};
  const reconnect = async () => {
    if (pairing) return;
    setPairing(true);
    try { await window.ntDeviceConnect("real"); }
    catch (error) { window.toast?.(error?.message || "Muse belum tersambung", { kind: "warn" }); }
    finally { setPairing(false); }
  };
  return <section className="worker-signal-details" aria-label="Detail sinyal Muse">
    <div className="worker-signal-heading"><div><strong>Detail sinyal</strong><span>{disconnected ? "Bluetooth terputus" : receiving ? "EEG masuk · kualitas diperiksa terpisah" : "Menunggu paket EEG baru"}</span></div><span className={receiving ? "worker-signal-dot is-live" : "worker-signal-dot"} /></div>
    {disconnected ? <><p>Koneksi Bluetooth terputus{radio.lastDisconnect.pageHidden ? " saat aplikasi di latar belakang" : ""}. Kalibrasi perlu dimulai lagi setelah tersambung.</p><button type="button" className="worker-signal-reconnect" disabled={pairing} onClick={reconnect}>{pairing ? "Menghubungkan…" : "Sambungkan Muse lagi"}</button></>
      : <>
        <div className="signal-detail-metrics">{[
          ["signal",radio.samples || 0,"Sampel"],
          ["history",radio.lastEEGAt ? `${Math.max(0,Math.floor((now-radio.lastEEGAt)/1000))}s` : "-","Paket"],
          ["check",cal.acceptedWindows || 0,"Layak"],
          ["info",gaps,"Jeda"]
        ].map(([icon,value,label])=><div key={label} title={label}><VisualIcon name={icon} size={18}/><strong>{value}</strong><small>{label}</small></div>)}</div>
        <div className="worker-signal-list">{["TP9", "AF7", "AF8", "TP10"].map((ch) => {
          const lastAt = radio.channelLastEEGAt?.[ch] || dsp.stream?.lastSampleAt?.[ch];
          const fresh = lastAt && now - lastAt < 3000;
          const q = qualityFresh && fresh ? dsp.quality?.channels?.[ch] : null;
          const wave = fresh ? window.ntManagement?.waveform?.(window.ntMuse?.readEEG?.(ch)) : null;
          return <div className="worker-signal-channel" key={ch}>
            <div className="worker-signal-channel-head"><strong>{ch}</strong><span>{!fresh ? "Tidak ada data baru" : !q ? "Menunggu penilaian" : ({ good: "Layak", limited: "Terbatas", bad: "Tidak dipakai" })[q.state]}</span></div>
            <div className="worker-signal-values"><span>{radio.channelSamples?.[ch] || 0} sampel · {Number.isFinite(radio.channelRateHz?.[ch]) ? `${radio.channelRateHz[ch]} Hz` : "laju belum tersedia"}</span><span>Puncak-ke-puncak {Number.isFinite(q?.peakToPeak) ? `${q.peakToPeak.toFixed(1)} µV` : "—"}</span></div>
            <small>Setelah detrend: {Number.isFinite(q?.processedPeakToPeak) ? `${q.processedPeakToPeak.toFixed(1)} µV` : "—"}</small>
            {wave && <svg role="img" aria-label={`Gelombang EEG ${ch}`} viewBox="0 0 600 32" preserveAspectRatio="none"><line x1="0" y1="16" x2="600" y2="16" stroke="var(--nt-bg-deep)"/><path d={wave.path} fill="none" stroke="#8b5cf6" strokeWidth="1.5"/></svg>}
            {q?.reasons?.length > 0 && <small>{q.reasons.join(" · ")}</small>}
          </div>;
        })}</div>
        <p className="worker-signal-tip">Jika AF7/AF8 terbatas, rapikan rambut dan pastikan sensor depan menempel pada kulit. Tetap diam dengan mata terbuka. Grafik bergerak berarti paket masuk; indeks belum tentu layak.</p>
      </>}
    <button type="button" className="frm-button" title="Unduh diagnostik sinyal" aria-label="Unduh diagnostik sinyal" onClick={() => {
      try { window.ntMuseDiagnostics.download(); }
      catch (error) { window.toast?.("Diagnostik belum dapat diunduh. Coba buka melalui Chrome.", { kind: "warn" }); }
    }}><VisualIcon name="file" size={17}/> Diagnostik</button>
    <small className="worker-signal-tip">Berisi status sensor dan koneksi; tanpa identitas akun atau EEG mentah.</small>
  </section>;
};

const WorkerAppInstall = () => {
  const account = window.ntSession?.get();
  return <main className="nt-auth-screen worker-app-install"><div className="nt-auth-box">
    <Brand size={30} />
    <div className="worker-app-preview"><img src="assets/worker-app-512.png" width="92" height="92" alt="NeuroTech" /><span>APLIKASI PEKERJA</span></div>
    <h1 className="nt-auth-title">Satu ketukan, siap pantau.</h1>
    <p className="nt-auth-text">Pasang NeuroTech di layar utama HP untuk mengakses Muse, hasil sesi, dan riwayat pribadi Anda.</p>
    <WorkerAppInstallCard always />
    <button className="nt-price-cta" type="button" onClick={() => navigate(account?.role === "pekerja" ? "/w/readiness" : "/login/pekerja")}>{account?.role === "pekerja" ? "Buka beranda pekerja" : "Masuk ke akun pekerja"}</button>
    <p className="worker-app-limits">Untuk pengukuran Muse, gunakan Chrome Android dan tetap buka aplikasi selama sesi. Login dan sinkronisasi memerlukan internet.</p>
    <Link to="/landing" className="worker-app-back">Kembali ke website</Link>
  </div></main>;
};
Object.assign(window, { WorkerAppInstall, WorkerAppInstallCard, WorkerCalibrationCard, WorkerSignalDetails, WorkerSignalStatus, WorkerLiveSyncStatus, VisualIcon, MemberAccessCode, AccountPasswordForm });
