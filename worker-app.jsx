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
        <p className="worker-signal-summary">{radio.samples || 0} sampel diterima · {receiving ? "paket terakhir baru saja" : radio.lastEEGAt ? `paket terakhir ${Math.floor((now - radio.lastEEGAt) / 1000)} detik lalu` : "belum ada paket"} · {gaps} jeda paket terdeteksi</p>
        <p className="worker-signal-summary">Jendela diterima {cal.acceptedWindows || 0} · ditolak {cal.rejectedWindows || 0} · ketersediaan {Number.isFinite(cal.availabilityPercent) ? `${cal.availabilityPercent}%` : "—"}. {cal.lastUsableAt ? `EEG layak terakhir ${Math.max(0, Math.floor((now - cal.lastUsableAt) / 1000))} detik lalu.` : "Belum ada EEG layak."}</p>
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
    <button className="nt-price-cta" type="button" onClick={() => navigate(account ? "/w/readiness" : "/login")}>{account ? "Buka beranda pekerja" : "Masuk ke akun pekerja"}</button>
    <p className="worker-app-limits">Untuk pengukuran Muse, gunakan Chrome Android dan tetap buka aplikasi selama sesi. Login dan sinkronisasi memerlukan internet.</p>
    <Link to="/landing" className="worker-app-back">Kembali ke website</Link>
  </div></main>;
};
Object.assign(window, { WorkerAppInstall, WorkerAppInstallCard, WorkerCalibrationCard, WorkerSignalDetails });
