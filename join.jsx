// Owner onboarding creates only the owner account; workers self-register with a revocable link.
const JoinFlow = () => {
  const [step, setStep] = React.useState("package"); // package | pay | setup | done
  const [pkg, setPkg] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [paid, setPaid] = React.useState(false); // payment-success pop-up
  const [verificationPending, setVerificationPending] = React.useState(false);
  const submitting = React.useRef(false);

  const [payName, setPayName] = React.useState("");
  const [payEmail, setPayEmail] = React.useState("");

  const [companyName, setCompanyName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [ownerDesc, setOwnerDesc] = React.useState("Pemilik Usaha");
  const [ownerPass, setOwnerPass] = React.useState("");
  const isFree = pkg && pkg.name.toLowerCase() === "free";

  const doPay = () => {
    if (!payName.trim() || !payEmail.trim()) {
      window.toast?.("Isi nama dan email dulu.", { kind: "warn" });
      return;
    }
    setPaid(true);
  };

  const startSetup = () => {
    setPaid(false);
    if (!ownerName) setOwnerName(payName.trim());
    setStep("setup");
  };

  const save = async () => {
    if (submitting.current) return;
    if (!companyName.trim() || !ownerName.trim() || !payEmail.trim() || ownerPass.length < 8) {
      window.toast?.("Lengkapi nama, email pemilik, dan password minimal 8 karakter.", { kind: "warn" }); return;
    }
    submitting.current = true; setBusy(true);
    try {
      let user = window.NT_FIREBASE.auth.currentUser;
      if (!user || user.isAnonymous || user.email?.toLowerCase() !== payEmail.trim().toLowerCase()) {
        try { user = await window.ntAuth.signUp({ name: ownerName, email: payEmail, password: ownerPass }); }
        catch (error) {
          if (error.code !== "auth/email-already-in-use") throw error;
          user = await window.ntAuth.signIn({ email: payEmail, password: ownerPass });
        }
      }
      if (!user.emailVerified) {
        setVerificationPending(true);
        try { await window.ntAuth.verify(); }
        catch (error) {
          window.toast?.("Buka email verifikasi, lalu tekan Simpan lagi. Anda juga dapat mengirim ulang email.", { kind: "info" }); return;
        }
      }
      const newCode = await window.ntCompany.create({
        pkg: pkg.name.toLowerCase(), companyName: companyName.trim(),
        ownerName: ownerName.trim(), ownerDesc: ownerDesc.trim() || "Pemilik",
        members: [],
      });
      setOwnerPass(""); setCode(newCode); setStep("done");
    } catch (error) {
      window.toast?.(error.message || "Gagal membuat perusahaan.", { kind: "danger" });
    } finally { submitting.current = false; setBusy(false); }
  };

  const enterDashboard = async () => {
    try {
      const session = await window.ntAuth.refresh(code);
      if (!session) throw new Error("Masuk kembali untuk memuat keanggotaan.");
      navigate(session.role === "pekerja" ? "/w/readiness" : "/m/overview");
    } catch (error) { window.toast?.(error.message, { kind: "danger" }); }
  };

  return (
    <div className="nt-join">
      <div className="nt-join-top">
        <a onClick={() => navigate("/landing")} style={{ cursor: "pointer", display: "flex" }}>
          <Brand size={30} />
        </a>
        <NeuroBtn tone="ghost" size="sm" onClick={() => navigate("/login")}>
          Sudah punya akun? Login
        </NeuroBtn>
      </div>

      <div className="nt-join-body">
        {/* ── Step 1: choose package — glassmorphic Forma-AI style ─── */}
        {step === "package" && (
          <div className="nt-pricing-hero" style={{ width: "100%", maxWidth: 1180 }}>
            <div className="nt-eyebrow">Langkah 1 dari 3</div>
            <h1 className="nt-join-h1">Pilih paket NeuroTech</h1>
            <p className="nt-join-sub">Pilih paket yang sesuai dengan skala usaha Anda.</p>
            <div className="nt-price-grid">
              {PACKAGES.map((p) => (
                <div
                  key={p.name}
                  className={"nt-price-card"
                    + (p.popular ? " nt-price-card--popular" : "")
                    + (pkg && pkg.name === p.name ? " is-sel" : "")}
                  onClick={() => setPkg(p)}
                >
                  <div>
                    <span className="nt-price-name">{p.name}</span>
                    {p.popular && <span className="nt-price-badge">Populer</span>}
                  </div>
                  <div className="nt-price-amount">
                    {p.price}{p.unit && <span className="nt-price-unit"> {p.unit}</span>}
                  </div>
                  <div className="nt-price-seg">{p.seg}</div>
                  <span className="nt-price-users">{p.users}</span>
                  <ul className="nt-price-feats">
                    {p.features.map((f, j) => (
                      <li className="nt-price-feat" key={j}>
                        <svg viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 6" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="nt-price-cta"
                    onClick={(e) => { e.stopPropagation(); setPkg(p); setStep("pay"); }}>
                    Pilih Paket
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: payment ────────────────────────────────────── */}
        {step === "pay" && (
          <div className="nt-join-card">
            <div className="nt-eyebrow">Langkah 2 dari 3</div>
            <h1 className="nt-join-h1">Pembayaran</h1>
            <p className="nt-join-sub">
              Simulasi pembayaran untuk keperluan demo, tidak ada transaksi nyata.
            </p>
            <div className="nt-join-paybox">
              <div>Paket <strong>{pkg.name}</strong></div>
              <div className="nt-join-payamount">{pkg.price}{pkg.unit && " " + pkg.unit}</div>
            </div>
            <label className="nt-join-field">
              <span>Nama lengkap</span>
              <input className="nt-join-input" value={payName}
                onChange={(e) => setPayName(e.target.value)} placeholder="Nama Anda" />
            </label>
            <label className="nt-join-field">
              <span>Email</span>
              <input className="nt-join-input" type="email" value={payEmail}
                onChange={(e) => setPayEmail(e.target.value)} placeholder="email@anda.com" />
            </label>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <NeuroBtn tone="default" size="lg" onClick={() => setStep("package")}>← Kembali</NeuroBtn>
              <NeuroBtn tone="primary" size="lg" onClick={doPay}>Bayar sekarang</NeuroBtn>
            </div>
          </div>
        )}

        {/* ── Step 3: set-up profile ─────────────────────────────── */}
        {step === "setup" && (
          <div className="nt-join-card nt-join-card--wide">
            <div className="nt-eyebrow">Langkah 3 dari 3</div>
            <h1 className="nt-join-h1">Set-Up Profile</h1>
            <p className="nt-join-sub">Lengkapi profil perusahaan dan akun pemilik.</p>
            <div className="nt-join-note">
              ℹ️ Tenang, data ini masih bisa Anda adjust (tambah/hapus pekerja) di dalam aplikasi nanti.
            </div>

            <label className="nt-join-field">
              <span>Nama perusahaan</span>
              <input className="nt-join-input" value={companyName}
                onChange={(e) => setCompanyName(e.target.value)} placeholder="mis. PT Maju Bersama" />
            </label>

            <div className="nt-join-section-label">
              {isFree ? "Akun Anda · peran: Pekerja" : "Akun pemilik · peran: Manajemen"}
            </div>
            <div className="nt-join-grid3">
              <input className="nt-join-input" value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)} placeholder="Nama Anda" />
              <input className="nt-join-input" value={ownerDesc}
                onChange={(e) => setOwnerDesc(e.target.value)} placeholder="Deskripsi peran" />
              <input className="nt-join-input" type="password" autoComplete="new-password" value={ownerPass}
                onChange={(e) => setOwnerPass(e.target.value)} placeholder="Password minimal 8 karakter" />
            </div>

            <label className="nt-join-field" style={{ marginTop: 14 }}>
              <span>Email pemilik</span>
              <input className="nt-join-input" type="email" value={payEmail}
                onChange={(e) => setPayEmail(e.target.value)} autoComplete="username" />
            </label>
            {verificationPending && <div className="nt-join-note" style={{ marginTop: 14 }}>
              Buka tautan verifikasi di email, lalu tekan Simpan kembali.
              <NeuroBtn tone="ghost" onClick={async () => {
                try { await window.ntAuth.resendVerification(); window.toast?.("Email verifikasi dikirim.", { kind: "info" }); }
                catch (error) { window.toast?.(error.message, { kind: "danger" }); }
              }}>Kirim ulang email</NeuroBtn>
            </div>}

            <div className="nt-join-note" style={{ marginTop: 22 }}>
              {isFree ? "Paket Free untuk satu pengguna individu." : "Pekerja mendaftar sendiri melalui tautan undangan. Anda tidak perlu mengisi email pekerja."}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <NeuroBtn tone="default" size="lg" onClick={() => setStep("pay")}>← Kembali</NeuroBtn>
              <NeuroBtn tone="primary" size="lg" onClick={save}>
                {busy ? "Menyimpan…" : "Simpan & buat perusahaan"}
              </NeuroBtn>
            </div>
          </div>
        )}

        {/* ── Step 4: done ───────────────────────────────────────── */}
        {step === "done" && (
          <div className="nt-join-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44 }}>🎉</div>
            <h1 className="nt-join-h1">Perusahaan terdaftar!</h1>
            <p className="nt-join-sub">
              Simpan kode perusahaan Anda. Untuk mengajak pekerja, bagikan tautan undangan di bawah.
            </p>
            <div className="nt-join-code">{code}</div>
            {window.ntSession?.get() && <MemberAccessCode companyCode={code} memberId={window.ntSession.get().memberId} role={window.ntSession.get().role}/>}
            {!isFree && <CompanyInvitePanel code={code} />}
            <p className="nt-join-sub">Paket {pkg.name} · {companyName}</p>
            <div style={{ marginTop: 22 }}>
              <NeuroBtn tone="primary" size="lg" onClick={enterDashboard}>
                Masuk ke dashboard →
              </NeuroBtn>
            </div>
          </div>
        )}
      </div>

      {/* Payment-success pop-up */}
      <Modal
        open={paid}
        onClose={startSetup}
        tone="success"
        title="Selamat, pembayaran berhasil! 🎉"
        subtitle="Pembayaran paket Anda berhasil (simulasi). Selanjutnya, lengkapi profil perusahaan Anda."
        actions={<NeuroBtn tone="primary" onClick={startSetup}>Set-Up Profile →</NeuroBtn>}
      />
    </div>
  );
};

// A link grants worker membership only; elevated roles still need the owner.
const CompanyInvitePanel = ({ code }) => {
  const [links, setLinks] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const pending = React.useRef(false);
  const load = async () => setLinks(await window.ntCompany.listJoinLinks(code));
  React.useEffect(() => {
    let alive = true;
    window.ntCompany.listJoinLinks(code).then((rows) => { if (alive) setLinks(rows); })
      .catch(() => { if (alive) setError("Daftar undangan belum dapat dimuat."); });
    return () => { alive = false; };
  }, [code]);
  const run = async (action) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await action(); await load(); }
    catch (_) { setError("Undangan gagal diproses. Periksa koneksi dan kapasitas paket, lalu coba lagi."); }
    finally { pending.current = false; setBusy(false); }
  };
  const url = (row) => `${window.location.origin}${window.location.pathname}#/invite/${encodeURIComponent(code)}/${row.token}`;
  const active = links.filter((row) => row.enabled && row.expiresAt > Date.now()).sort((a, b) => b.expiresAt - a.expiresAt);
  const [fallback, setFallback] = React.useState("");
  const copy = async (row) => {
    try { await navigator.clipboard.writeText(url(row)); window.toast?.("Tautan undangan disalin.", { kind: "success" }); }
    catch (_) { setFallback(url(row)); }
  };
  return <section className="nt-invite-panel">
    <div className="nt-invite-heading"><div><strong>Undang pekerja</strong><p>Bagikan tautan · pekerja mengisi akun sendiri · berlaku 7 hari.</p></div>
      <NeuroBtn tone="primary" size="sm" disabled={busy} onClick={() => run(() => window.ntCompany.createJoinLink(code))}>{busy ? "Memproses…" : active.length ? "Buat tautan tambahan" : "Buat tautan undangan"}</NeuroBtn></div>
    {active.map((row, i) => <div className="nt-invite-row" key={row.token}>
      <span>Undangan {i + 1}<small>{row.uses} bergabung · sampai {new Date(row.expiresAt).toLocaleDateString("id-ID")}</small></span>
      <NeuroBtn size="sm" onClick={() => copy(row)}>Salin tautan</NeuroBtn>
      {typeof navigator.share === "function" && <NeuroBtn size="sm" onClick={() => navigator.share({ title: "Undangan pekerja NeuroTech", url: url(row) }).catch(() => {})}>Bagikan</NeuroBtn>}
      <NeuroBtn size="sm" disabled={busy} onClick={() => run(async () => { await window.ntCompany.revokeJoinLink(code, row.token); setFallback(""); })}>Cabut</NeuroBtn>
    </div>)}
    {fallback && <label>Tautan siap disalin<input className="nt-join-input" aria-label="Tautan undangan" readOnly value={fallback} onFocus={(event) => event.target.select()} /></label>}
    {active.length > 0 && <p className="nt-invite-note">Siapa pun yang menerima tautan dapat bergabung sebagai pekerja. Bagikan hanya kepada tim Anda; cabut jika sudah selesai.</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
};
Object.assign(window, { JoinFlow, CompanyInvitePanel });
