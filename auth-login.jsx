// Each member authenticates with Firebase Auth before any company data is read.
const PKG_LABEL = { free: "Free", bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };
const ROLE_LANDING = { pekerja: "/w/readiness", supervisor: "/s/overview", management: "/m/overview" };
const MemberLogin = ({ inviteCode = "", inviteToken = "" }) => {
  const isInvite = !!inviteCode && !!inviteToken;
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
    let session = await window.ntAuth.refresh(code);
    if (!session && isInvite) session = await window.ntCompany.joinWithLink(inviteCode, inviteToken, memberName || window.NT_FIREBASE.auth.currentUser?.displayName || "Pekerja");
    else if (!session && code.trim()) session = await window.ntCompany.acceptInvitation(code);
    if (!session) throw new Error("Keanggotaan belum tersedia. Hubungi pengelola perusahaan.");
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
  return (
    <div className="nt-auth-screen">
      <span className="nt-landing-orb nt-landing-orb--a" />
      <span className="nt-landing-orb nt-landing-orb--b" />
      <div className="nt-auth-box">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Brand size={30} /></div>
        <h1 className="nt-auth-title">{verify ? "Verifikasi email Anda" : register ? isInvite ? "Bergabung sebagai pekerja" : "Aktifkan akun anggota" : "Masuk ke NeuroTech"}</h1>
        <p className="nt-auth-text">
          {verify ? "Buka tautan verifikasi di email Anda. Setelah selesai, tekan tombol di bawah."
            : register ? isInvite ? "Isi data Anda sendiri. Setelah verifikasi email, Anda langsung bergabung sebagai pekerja." : "Untuk undangan email lama, gunakan email yang didaftarkan pengelola."
            : "Masuk dengan email dan password Anda."}
        </p>
        <form onSubmit={(event) => { event.preventDefault(); if (!busy) verify ? run(enter) : submit(); }}>
          {!isInvite && <label className="nt-join-field" style={{ marginTop: 18 }}>
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
        {!verify && !register && !isInvite && <button type="button" className="nt-auth-demo" disabled={busy} onClick={goDemo}>Coba mode demo <span>Simulasi tanpa akun atau Muse</span></button>}
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
            {" · "}<a onClick={() => navigate("/join")}>Daftarkan perusahaan</a>
          </div>
        </>}
      </div>
    </div>
  );
};
Object.assign(window, { MemberLogin });
