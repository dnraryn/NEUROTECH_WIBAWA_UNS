// Each member authenticates with Firebase Auth before any company data is read.
const PKG_LABEL = { free: "Free", bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };
const ROLE_LANDING = { pekerja: "/w/readiness", supervisor: "/s/overview", management: "/m/overview" };
const PortalSessionGate = ({ session, workerOnly = false, linkedAccount = false }) => <main className="nt-auth-screen"><section className="nt-auth-box">
  <Brand size={30}/><div className="portal-symbol"><VisualIcon name={workerOnly ? "signal" : "team"} size={34}/></div>
  <h1 className="nt-auth-title">{linkedAccount ? "Ganti akun untuk masuk" : !window.ntPortal.apps(session).length ? "Akses belum tersedia" : workerOnly ? "Aplikasi khusus pekerja" : "Portal akun berbeda"}</h1>
  {linkedAccount && <p className="nt-auth-text">Tautan ini untuk akun lain. Keluar dari akun yang sedang masuk untuk melanjutkan.</p>}
  <p className="nt-auth-text">{workerOnly ? `Akun yang masih masuk: ${session.memberName || "anggota"} (${window.ntPortal.roles[session.role]?.label || "anggota"}). Pilih Ganti akun, lalu masuk dengan akun pekerja untuk menghubungkan Muse.` : `Akun ini terdaftar sebagai ${window.ntPortal.roles[session.role]?.label || "anggota"}. Gunakan portal sesuai peran akun Anda.`}{!window.ntPortal.apps(session).length && " Hubungi pemilik perusahaan untuk memeriksa peran dan paket akun."}</p>
  {!workerOnly && !!window.ntPortal.apps(session).length && <a className="nt-price-cta portal-browser-link" href={`/?portal=web#${window.ntPortal.login(session.role)}`} target="_blank" rel="noopener">Buka portal {window.ntPortal.roles[session.role]?.label || "akun"}</a>}
  <button type="button" className="nt-price-cta" style={{width:"100%",marginTop:22}} onClick={async()=>{const query=window.ntPortal.linkAccount() ? window.location.hash.split("?")[1] : "";await window.ntLogout();navigate(window.ntPortal.login(workerOnly?"pekerja":null)+(query ? "?"+query : ""));}}>Ganti akun</button>
</section></main>;
const MemberLogin = ({ portalRole = "", inviteCode = "" }) => {
  const workerOnly=window.ntPortal.workerApp();
  const link=window.ntPortal.linkAccount();
  const [step,setStep]=React.useState("code"),[code,setCode]=React.useState(""),[password,setPassword]=React.useState("");
  const [key,setKey]=React.useState(""),[company,setCompany]=React.useState(()=>{try{return localStorage.getItem("nt-login-company") || "";}catch{return "";}});
  const [busy,setBusy]=React.useState(false),[error,setError]=React.useState("");
  const pending=React.useRef(false);
  React.useEffect(()=>{if(link){setCode(link.accountCode);setCompany(link.companyCode);setStep("code");setPassword("");setError("");}},[link?.loginCode,link?.accountCode,link?.companyCode]);
  const portal=window.ntPortal.roles[workerOnly ? "pekerja" : portalRole] || {label:"NeuroTech",icon:"team"};
  const submit=async event=>{
    event.preventDefault();setError("");
    if(step==="code"){
      if(window.ntPortal.isLoginCode(code)){setKey(window.ntPortal.loginCode(code));setCompany("");setStep("password");return;}
      const label=window.ntPortal.accountCode(code);
      if(!label){setError("Masukkan kode akun, misalnya P001 atau S001.");return;}
      const companyCode=company.trim().toUpperCase();
      if(!/^[FBSGP]-([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}|[A-F0-9]{12})$/.test(companyCode)){setError("Masukkan kode perusahaan, misalnya P-ST7XQ9.");return;}
      setCode(label);setKey(label);setCompany(companyCode);setStep("password");return;
    }
    if(pending.current)return;
    pending.current=true;setBusy(true);
    try{
      const session=await window.ntAuth.signInCode({code:key,password,accountCode:window.ntPortal.accountCode(code) || undefined,companyCode:company || undefined});
      if(!session)throw new Error("Akun belum aktif. Hubungi pengelola perusahaan.");
      if(workerOnly && session.role!=="pekerja"){navigate("/w/readiness");return;}
      window.toast?.("Selamat datang, "+session.memberName+"!",{kind:"success"});
      navigate(ROLE_LANDING[session.role]);
    }catch(e){setError(e.code?.startsWith("auth/") ? "Kode akun atau password tidak sesuai. Periksa kembali atau hubungi pengelola." : e.code==="permission-denied" ? "Akun belum tersedia atau akses sudah dicabut. Hubungi pengelola." : e.message || "Belum dapat masuk. Coba kembali.");}
    finally{setPassword("");pending.current=false;setBusy(false);}
  };
  return <main className="nt-auth-screen"><section className="nt-auth-box portal-picker">
    <Brand size={30}/><div className="portal-symbol"><VisualIcon name={portal.icon} size={28}/><span>{workerOnly ? "Aplikasi pekerja" : portal.label}</span></div>
    <div className="login-steps" aria-label="Tahap masuk"><span aria-current={step==="code"?"step":undefined}>1 · Kode akun</span><span aria-current={step==="password"?"step":undefined}>2 · Password</span></div>
    <h1 className="nt-auth-title">{step==="code" ? "Masuk ke NeuroTech" : "Masukkan password"}</h1>
    <p className="nt-auth-text">{step==="code" ? "Gunakan kode akun dari perusahaan Anda." : window.ntPortal.accountCode(code) || window.ntPortal.formatLoginCode(code)}</p>
    {inviteCode && <p className="nt-auth-text">Minta kode akun dan password awal kepada pengelola.</p>}
    <form onSubmit={submit}>
      {step==="code" ? <><label className="nt-join-field" style={{marginTop:18}}><span>Kode perusahaan</span><input aria-label="Kode perusahaan" className="nt-join-input" autoComplete="organization" autoCapitalize="characters" spellCheck={false} maxLength={14} value={company} onChange={e=>{setCompany(e.target.value);setError("");}} placeholder="P-ST7XQ9" required={!window.ntPortal.isLoginCode(code)}/></label><label className="nt-join-field" style={{marginTop:22}}><span>Kode akun</span><input className="nt-join-input login-member-code" autoComplete="username" autoCapitalize="characters" spellCheck={false} required maxLength={24} value={code} onChange={e=>{setCode(e.target.value);setError("");}} placeholder="P001"/></label>
        </>
        : <label className="nt-join-field" style={{marginTop:22}}><span>Password</span><input className="nt-join-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" autoFocus/></label>}
      {error && <p className="login-code-error" role="alert">{error}</p>}
      <button type="submit" className="nt-price-cta" style={{width:"100%",marginTop:20}} disabled={busy}>{busy ? "Memproses…" : step==="code" ? "Lanjut" : "Masuk"}</button>
    </form>
    {step==="password" && <div className="nt-auth-foot"><button type="button" className="login-change-code" disabled={busy} onClick={()=>{setPassword("");setError("");setStep("code");}}>Ganti kode akun</button></div>}
    <button type="button" className="nt-auth-demo" disabled={busy} onClick={async()=>{await goDemo();navigate(workerOnly ? "/w/readiness" : window.ntPortal.roles[portalRole]?.home || "/w/readiness");}}>Coba mode demo <span>Simulasi tanpa akun</span></button>
    <div className="nt-auth-foot"><Link to="/landing">Kembali ke beranda</Link>{!workerOnly && <> · <Link to="/join">Daftarkan perusahaan</Link></>}</div>
    <details className="login-portals"><summary>Lupa kode atau password?</summary><p>Anggota dapat meminta kode dan bantuan kepada pengelola perusahaan.</p>{!workerOnly && <Link to="/join/recover">Pemilik: pulihkan kode akun</Link>}</details>
  </section></main>;
};
Object.assign(window, { MemberLogin, PortalSessionGate });
