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
    return () => { for (const event of ["nt-data", "nt-device", "nt-muse-baseline"]) window.removeEventListener(event, update); };
  }, []);
  const device = window.ntDeviceStatus?.() || {};
  const dsp = window.ntMuseDSP || {};
  if (!device.real || !device.connected || dsp.baseline) return null;
  const target = dsp.baselineTarget || 120;
  const count = Math.min(target, Math.max(0, dsp.baselineCount || 0));
  const remaining = target - count;
  const clock = String(Math.floor(remaining / 60)).padStart(2, "0") + ":" + String(remaining % 60).padStart(2, "0");
  const quality = dsp.quality?.level;
  const paused = quality === "bad" || quality === "limited" || ["artifact", "no-signal", "error"].includes(dsp.signalState);
  return <section className="worker-calibration-card" aria-label="Kalibrasi Muse">
    <div className="worker-calibration-top"><div><strong>Kalibrasi Muse</strong><span>{paused ? "Sinyal belum layak · periksa sensor" : "Duduk tenang, tetap terjaga, mata terbuka"}</span></div><output aria-label="Waktu kalibrasi tersisa">{clock}</output></div>
    <div className="worker-calibration-track" role="progressbar" aria-label="Kemajuan kalibrasi" aria-valuemin="0" aria-valuemax={target} aria-valuenow={count}><span style={{ width: `${count / target * 100}%` }} /></div>
    <small>{count}/{target} jendela EEG bersih · hitungan berhenti jika sinyal terganggu</small>
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
Object.assign(window, { WorkerAppInstall, WorkerAppInstallCard, WorkerCalibrationCard });
