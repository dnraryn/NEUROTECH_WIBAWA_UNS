// Login (/login) — company-code login. Enter the company code, then pick your
// name from the member list and enter your password. No email/Google login.

const PKG_LABEL = { free: "Free", bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };
const ROLE_LANDING = { pekerja: "/w/readiness", supervisor: "/s/overview", management: "/m/overview" };

const MemberLogin = () => {
  const [step, setStep] = React.useState("code"); // code | member
  const [code, setCode] = React.useState("");
  const [company, setCompany] = React.useState(null);
  const [memberName, setMemberName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const checkCode = async () => {
    if (!code.trim()) { window.toast?.("Masukkan kode perusahaan dulu.", { kind: "warn" }); return; }
    if (!window.ntCompany) { window.toast?.("Firebase belum siap. Muat ulang halaman.", { kind: "danger" }); return; }
    setBusy(true);
    try {
      const c = await window.ntCompany.getByCode(code);
      if (!c) { window.toast?.("Kode perusahaan tidak ditemukan.", { kind: "danger" }); return; }
      setCompany(c);
      setMemberName((c.members && c.members[0] && c.members[0].name) || "");
      setStep("member");
    } catch (e) {
      window.toast?.("Gagal memuat data: " + (e.message || e), { kind: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const doLogin = () => {
    const m = (company.members || []).find((x) => x.name === memberName);
    if (!m) { window.toast?.("Pilih nama Anda dari daftar.", { kind: "warn" }); return; }
    if ((password || "") !== (m.password || "")) {
      window.toast?.("Password salah.", { kind: "danger" });
      return;
    }
    window.ntSession.set({
      code: company.code, companyName: company.companyName, package: company.package,
      memberName: m.name, role: m.role, roleDesc: m.roleDesc,
    });
    window.toast?.("Selamat datang, " + m.name + "!", { kind: "success" });
    navigate(ROLE_LANDING[m.role] || "/w/readiness");
  };

  return (
    <div className="nt-auth-screen">
      <span className="nt-landing-orb nt-landing-orb--a" />
      <span className="nt-landing-orb nt-landing-orb--b" />

      <div className="nt-auth-box">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <Brand size={30} />
        </div>

        {/* ── Step 1: company code ─────────────────────────────────── */}
        {step === "code" && (
          <>
            <h1 className="nt-auth-title">Masuk ke NeuroTech</h1>
            <p className="nt-auth-text">
              Masukkan kode perusahaan Anda. Kode diberikan saat perusahaan Anda
              bergabung dengan NeuroTech.
            </p>
            <label className="nt-join-field" style={{ marginTop: 18 }}>
              <span>Kode perusahaan</span>
              <input
                className="nt-join-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") checkCode(); }}
                placeholder="mis. P-001"
                autoFocus
              />
            </label>
            <div style={{ marginTop: 18 }}>
              <NeuroBtn tone="primary" size="lg" style={{ width: "100%" }} onClick={checkCode}>
                {busy ? "Memeriksa…" : "Lanjut"}
              </NeuroBtn>
            </div>
            <div className="nt-auth-foot">
              Perusahaan Anda belum bergabung?{" "}
              <a onClick={() => navigate("/join")}>Bergabung dengan kami</a>
            </div>
          </>
        )}

        {/* ── Step 2: pick member + password ───────────────────────── */}
        {step === "member" && company && (
          <>
            <div className="nt-auth-greet">
              <strong>{company.companyName}</strong>, terima kasih telah mempercayai
              NeuroTech. Perusahaan Anda terdaftar sebagai member paket{" "}
              <strong>{PKG_LABEL[company.package] || company.package}</strong>.
            </div>
            <h1 className="nt-auth-title" style={{ marginTop: 16 }}>Pilih akun Anda</h1>

            <label className="nt-join-field" style={{ marginTop: 14 }}>
              <span>Nama</span>
              <select className="nt-join-input" value={memberName}
                onChange={(e) => setMemberName(e.target.value)}>
                {(company.members || []).map((m) => (
                  <option key={m.id || m.name} value={m.name}>
                    {m.name} — {m.roleDesc || m.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="nt-join-field" style={{ marginTop: 12 }}>
              <span>Password</span>
              <input
                className="nt-join-input" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }}
                placeholder="Password Anda" autoFocus
              />
            </label>
            <div style={{ marginTop: 18 }}>
              <NeuroBtn tone="primary" size="lg" style={{ width: "100%" }} onClick={doLogin}>
                Masuk
              </NeuroBtn>
            </div>
            <div className="nt-auth-foot">
              <a onClick={() => { setStep("code"); setPassword(""); }}>← Ganti kode perusahaan</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { MemberLogin });
