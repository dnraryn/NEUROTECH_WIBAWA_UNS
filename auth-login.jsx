// Each member authenticates with Firebase Auth before any company data is read.
const PKG_LABEL = { free: "Free", bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };
const ROLE_LANDING = { pekerja: "/w/readiness", supervisor: "/s/overview", management: "/m/overview" };
const PortalSessionGate = ({ session, workerOnly = false }) => <main className="nt-auth-screen"><section className="nt-auth-box">
  <Brand size={30}/><div className="portal-symbol"><VisualIcon name={workerOnly ? "signal" : "team"} size={34}/></div>
  <h1 className="nt-auth-title">{!window.ntPortal.apps(session).length ? "Akses belum tersedia" : workerOnly ? "Aplikasi khusus pekerja" : "Portal akun berbeda"}</h1>
  <p className="nt-auth-text">{workerOnly ? `Akun yang masih masuk: ${session.memberName || "anggota"} (${window.ntPortal.roles[session.role]?.label || "anggota"}). Pilih Ganti akun, lalu masuk dengan akun pekerja untuk menghubungkan Muse.` : `Akun ini terdaftar sebagai ${window.ntPortal.roles[session.role]?.label || "anggota"}. Gunakan portal sesuai peran akun Anda.`}{!window.ntPortal.apps(session).length && " Hubungi pemilik perusahaan untuk memeriksa peran dan paket akun."}</p>
  {!workerOnly && !!window.ntPortal.apps(session).length && <a className="nt-price-cta portal-browser-link" href={`/?portal=web#${window.ntPortal.login(session.role)}`} target="_blank" rel="noopener">Buka portal {window.ntPortal.roles[session.role]?.label || "akun"}</a>}
  <button type="button" className="nt-price-cta" style={{width:"100%",marginTop:22}} onClick={async()=>{await window.ntLogout();navigate(window.ntPortal.login(workerOnly?"pekerja":null));}}>Ganti akun</button>
</section></main>;
const MemberLogin = ({ inviteCode = "", inviteToken = "", portalRole = "" }) => {
  const isInvite = !!inviteCode && !!inviteToken;
  const workerOnly = window.ntPortal.workerApp();
  const [accountStep,setAccountStep] = React.useState(isInvite);
  const [memberCode,setMemberCode] = React.useState("");
  const [accessRole,setAccessRole] = React.useState("");
  const [codeError,setCodeError] = React.useState("");
  const selectedRole = isInvite || workerOnly ? "pekerja" : portalRole || accessRole;
  const portal = window.ntPortal.roles[selectedRole] || {label:"NeuroTech",icon:"team",description:"Akun Anda menentukan area yang dapat dibuka."};
  const [memberName, setMemberName] = React.useState("");
  const [code, setCode] = React.useState(inviteCode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [register, setRegister] = React.useState(isInvite);
  const [verify, setVerify] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const pending = React.useRef(false);
  const run = async (action) => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try { await action(); }
    catch (error) {
      const message = ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(error.code)
        ? "Email atau password tidak sesuai."
        : isInvite && error.code === "permission-denied" ? "Undangan tidak dapat digunakan. Tautan mungkin kedaluwarsa, dicabut, kapasitas penuh, atau akun pernah dikeluarkan. Hubungi pengelola."
        : error.code === "auth/email-already-in-use" ? "Email sudah memiliki akun. Pilih Sudah punya akun? Masuk di bawah."
        : error.message || "Gagal masuk. Silakan coba kembali.";
      window.toast?.(message, { kind: "danger" });
    } finally { pending.current = false; setBusy(false); }
  };
  const enter = async () => {
    await window.ntAuth.verify();
    let session = await window.ntAuth.refresh(code, memberCode);
    if (!session && isInvite) session = await window.ntCompany.joinWithLink(inviteCode, inviteToken, memberName || window.NT_FIREBASE.auth.currentUser?.displayName || "Pekerja");
    else if (!session && code.trim()) session = await window.ntCompany.acceptInvitation(code,memberCode);
    if (!session) throw new Error("Keanggotaan belum tersedia. Hubungi pengelola perusahaan.");
    if (!window.ntPortal.matches(session,selectedRole)) return;
    window.toast?.("Selamat datang, " + session.memberName + "!", { kind: "success" });
    navigate(ROLE_LANDING[session.role] || "/w/readiness");
  };
  const submit = () => run(async () => {
    if (!email.trim() || !password) throw new Error("Isi email dan password.");
    if (register && !isInvite && !code.trim()) throw new Error("Buka tautan undangan dari pengelola atau isi kode untuk undangan email lama.");
    if (register && !memberName.trim()) throw new Error("Isi nama lengkap Anda.");
    if (register) {
      await window.ntAuth.signUp({ name: memberName.trim(), email, password });
      setPassword(""); setVerify(true);
      window.toast?.("Buka email verifikasi, lalu kembali ke halaman ini.", { kind: "info" });
      return;
    }
    const user = await window.ntAuth.signIn({ email, password });
    setPassword("");
    if (!user.emailVerified) { setVerify(true); return; }
    await enter();
  });
  if (!accountStep) return <main className="nt-auth-screen"><section className="nt-auth-box portal-picker">
    <Brand size={30}/><div className="portal-symbol"><VisualIcon name={portal.icon} size={28}/><span>{workerOnly ? "Aplikasi pekerja" : portal.label}</span></div>
    <div className="login-steps" aria-label="Tahap masuk"><strong aria-current="step">1 · Kode</strong><span>2 · Akun</span></div>
    <h1 className="nt-auth-title">Masuk dengan kode anggota</h1><p className="nt-auth-text">Kode mengarahkan ke ruang Anda.</p>
    <form onSubmit={event=>{
      event.preventDefault();setCodeError("");
      const role=window.ntPortal.codeRole(memberCode);
      if(!role){setCodeError("Periksa kode anggota, misalnya P-ABCD-EFGH.");return;}
      if((workerOnly || portalRole) && role!==selectedRole){setCodeError(workerOnly ? "Aplikasi ini memakai kode pekerja (P). Minta akun pekerja kepada pengelola." : `Kode ini untuk ${window.ntPortal.roles[role].label}. Gunakan halaman login utama atau portal yang sesuai.`);return;}
      setMemberCode(window.ntPortal.normalizeCode(memberCode));setAccessRole(role);setAccountStep(true);
    }}>
      <label className="nt-join-field" style={{marginTop:22}}><span>Kode anggota</span><input className="nt-join-input login-member-code" autoComplete="off" autoCapitalize="characters" spellCheck={false} required maxLength={24} value={memberCode} onChange={e=>{setMemberCode(e.target.value);setCodeError("");}} placeholder={selectedRole === "supervisor" ? "S-ABCD-EFGH" : selectedRole === "management" ? "M-ABCD-EFGH" : "P-ABCD-EFGH"}/></label>
      {codeError && <p className="login-code-error" role="alert">{codeError}</p>}
      <button type="submit" className="nt-price-cta" style={{width:"100%",marginTop:20}}>Lanjut ke akun</button>
    </form>
    <button type="button" className="nt-auth-demo" onClick={()=>{setMemberCode("");setAccountStep(true);}}>Masuk dengan akun <span>Untuk anggota yang belum memiliki kode</span></button>
    {!workerOnly && <><details className="login-portals"><summary>Pilih portal</summary><div className="portal-choices">{Object.entries(window.ntPortal.roles).map(([role,p])=><Link key={role} to={window.ntPortal.login(role)} className="portal-choice"><VisualIcon name={p.icon}/><span><strong>{p.label}</strong></span><span aria-hidden="true">↗</span></Link>)}</div></details><div className="nt-auth-foot"><Link to="/join">Daftarkan perusahaan</Link></div></>}
    {workerOnly && <button type="button" className="nt-auth-demo" onClick={async()=>{await goDemo();navigate("/w/readiness");}}>Coba mode demo <span>Simulasi pekerja</span></button>}
  </section></main>;
  return (
    <div className="nt-auth-screen">
      <span className="nt-landing-orb nt-landing-orb--a" />
      <span className="nt-landing-orb nt-landing-orb--b" />
      <div className="nt-auth-box">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Brand size={30} /></div>
        <div className="portal-symbol"><VisualIcon name={portal.icon} size={28}/><span>{portal.label}</span></div>
        {!isInvite && <div className="login-steps" aria-label="Tahap masuk"><span>1 · Kode</span><strong aria-current="step">2 · Akun</strong></div>}
        {!!memberCode && <p className="login-code-summary">Kode anggota: {memberCode.replace(/^(.)(.{4})(.{4})$/,"$1-$2-$3")}</p>}
        <h1 className="nt-auth-title">{verify ? "Verifikasi email Anda" : register ? isInvite ? "Bergabung sebagai pekerja" : "Aktifkan akun anggota" : `Masuk ${portal.label}`}</h1>
        <p className="nt-auth-text">
          {verify ? "Buka tautan verifikasi di email Anda. Setelah selesai, tekan tombol di bawah."
            : register ? isInvite ? "Isi data Anda sendiri. Setelah verifikasi email, Anda langsung bergabung sebagai pekerja." : "Untuk undangan email lama, gunakan email yang didaftarkan pengelola."
            : portal.description}
        </p>
        <form onSubmit={(event) => { event.preventDefault(); if (!busy) verify ? run(enter) : submit(); }}>
          {!isInvite && (!memberCode || register) && <label className="nt-join-field" style={{ marginTop: 18 }}>
            <span>Kode perusahaan {register ? "" : "(opsional untuk akun aktif)"}</span>
            <input className="nt-join-input" value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="mis. B-K7R2NX" required={register} autoComplete="organization" />
          </label>}
          {!verify && <>
            {register && <label className="nt-join-field" style={{ marginTop: 12 }}><span>Nama lengkap</span>
              <input className="nt-join-input" value={memberName} onChange={(e) => setMemberName(e.target.value)} required maxLength={120} autoComplete="name" />
            </label>}
            <label className="nt-join-field" style={{ marginTop: 12 }}>
              <span>Email anggota</span>
              <input className="nt-join-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="username" placeholder="email@anda.com" />
            </label>
            <label className="nt-join-field" style={{ marginTop: 12 }}>
              <span>Password</span>
              <input className="nt-join-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"} />
            </label>
          </>}
          <button type="submit" className="nt-price-cta" disabled={busy} style={{ width: "100%", marginTop: 18 }}>
            {busy ? "Memproses…" : verify ? "Saya sudah verifikasi · lanjut" : register ? "Buat akun & kirim verifikasi" : "Masuk"}
          </button>
        </form>
        {!verify && !register && !isInvite && <button type="button" className="nt-auth-demo" disabled={busy} onClick={async()=>{await goDemo();navigate(window.ntPortal.roles[selectedRole]?.home || "/w/readiness");}}>Coba mode demo <span>Simulasi {portal.label.toLowerCase()}</span></button>}
        {!verify && !isInvite && <div className="nt-auth-foot"><button type="button" className="login-change-code" disabled={busy} onClick={()=>{setAccountStep(false);setMemberCode("");setAccessRole("");setPassword("");setRegister(false);}}>Ganti kode anggota</button></div>}
        {!window.ntPortal.workerApp() && !isInvite && <div className="nt-auth-foot"><Link to="/login">Pilih portal lain</Link></div>}
        {verify ? <div className="nt-auth-foot">
          <a onClick={() => run(async () => { await window.ntAuth.resendVerification(); window.toast?.("Email verifikasi dikirim.", { kind: "info" }); })}>Kirim ulang email</a>
          {" · "}<a onClick={() => run(async () => { await window.ntAuth.signOut(); setVerify(false); })}>Ganti akun</a>
        </div> : <>
          <div className="nt-auth-foot">
            <a onClick={() => { setRegister(!register); setPassword(""); }}>{register ? "Sudah punya akun? Masuk" : "Anggota baru? Aktifkan akun"}</a>
          </div>
          <div className="nt-auth-foot">
            <a onClick={() => run(async () => {
              if (!email.trim()) throw new Error("Isi email terlebih dahulu.");
              await window.ntAuth.resetPassword(email);
              window.toast?.("Jika akun tersedia, tautan reset password dikirim ke email Anda.", { kind: "info" });
            })}>Lupa password?</a>
            {!window.ntPortal.workerApp() && <>{" · "}<a onClick={() => navigate("/join")}>Daftarkan perusahaan</a></>}
          </div>
        </>}
      </div>
    </div>
  );
};
Object.assign(window, { MemberLogin, PortalSessionGate });
