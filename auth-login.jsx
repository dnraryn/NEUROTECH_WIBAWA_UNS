// Login page (/login) — full-bleed, no frame chrome.

const AuthLogin = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("worker");
  const [busy, setBusy] = React.useState(false);

  const ROLES = [
    { id: "worker", l: "Pekerja", sub: "Mobile app", icon: "👷", to: "/w/readiness" },
    { id: "supervisor", l: "Supervisor K3", sub: "Desktop dashboard", icon: "🛡", to: "/s/overview" },
    { id: "manager", l: "Manajemen SMK3", sub: "Analitik agregat", icon: "📊", to: "/m/overview" },
  ];

  const onSubmit = (e) => {
    e.preventDefault();
    const r = ROLES.find((x) => x.id === role);
    setBusy(true);
    window.toast?.(`Masuk sebagai ${r.l}…`, { kind: "info", duration: 900 });
    setTimeout(() => {
      setBusy(false);
      window.toast?.(`Selamat datang${email ? ", " + email.split("@")[0] : ""}`, { kind: "success" });
      navigate(r.to);
    }, 900);
  };

  const onDemo = () => {
    const r = ROLES.find((x) => x.id === role);
    window.toast?.(`Mode demo · ${r.l}`, { kind: "info" });
    navigate(r.to);
  };

  return (
    <div style={{
      width: "100%", height: "100%", minHeight: "100vh",
      background: "var(--nt-bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "auto"
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background:
          "radial-gradient(60% 80% at 0% 0%, rgba(108,182,240,0.18), transparent 60%)," +
          "radial-gradient(60% 80% at 100% 100%, rgba(156,139,240,0.18), transparent 60%)",
        pointerEvents: "none"
      }} />

      <div style={{
        position: "relative", width: 880, maxWidth: "100%",
        display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 32,
      }}>
        {/* Left: brand */}
        <div style={{ padding: "20px 24px" }}>
          <NeuroLogo size={32} />
          <div style={{ marginTop: 56 }}>
            <div className="nt-eyebrow" style={{ fontSize: 11 }}>SISTEM MONITORING K3</div>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--nt-text)", margin: "12px 0 0", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              Pantau fatigue & cognitive load <span style={{ color: "var(--nt-brand-mid)" }}>sebelum</span> jadi insiden.
            </h1>
            <p style={{ fontSize: 14, color: "var(--nt-text-2)", marginTop: 14, lineHeight: 1.6, maxWidth: 380 }}>
              Berbasis Muse 2 / Muse S. Menggabungkan data tidur pra-shift dengan pemantauan EEG saat shift. Data individu hanya untuk Anda. Tidak untuk sanksi.
            </p>
            <div style={{ display: "flex", gap: 18, marginTop: 28, fontSize: 12, color: "var(--nt-text-3)" }}>
              <div><b style={{ color: "var(--nt-text-2)" }}>142</b> pekerja terpantau</div>
              <div><b style={{ color: "var(--nt-text-2)" }}>11.4k</b> jam EEG</div>
              <div><b style={{ color: "var(--nt-text-2)" }}>−24%</b> insiden fatigue</div>
            </div>
          </div>
        </div>

        {/* Right: form card */}
        <div className="neu-surface" style={{ padding: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>Masuk ke NeuroTech</div>
          <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 6 }}>Pilih peran lalu masuk dengan kredensial perusahaan.</div>

          {/* Role pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 20 }}>
            {ROLES.map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)} style={{
                padding: "14px 10px", borderRadius: 14,
                background: role === r.id ? "linear-gradient(135deg, #9c8bf0, #6cb6f0)" : "var(--nt-surface)",
                boxShadow: role === r.id ? "0 8px 18px rgba(108,182,240,0.32), inset 0 1px 0 rgba(255,255,255,0.4)" : "var(--nt-shadow-out-sm)",
                color: role === r.id ? "white" : "var(--nt-text)",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6
              }}>
                <span style={{ fontSize: 22 }}>{r.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{r.l}</span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>{r.sub}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Email perusahaan</span>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.id" required
                style={{
                  padding: "12px 16px", borderRadius: 14,
                  background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-in)",
                  border: "none", outline: "none", fontSize: 14, fontFamily: "inherit",
                  color: "var(--nt-text)"
                }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Password</span>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                style={{
                  padding: "12px 16px", borderRadius: 14,
                  background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-in)",
                  border: "none", outline: "none", fontSize: 14, fontFamily: "inherit",
                  color: "var(--nt-text)"
                }} />
            </label>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--nt-text-3)" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked />
                Ingat saya
              </label>
              <a onClick={() => window.toast?.("Reset password — fitur akan datang", { kind: "info" })} style={{ color: "var(--nt-brand-mid)", cursor: "pointer", fontWeight: 600 }}>Lupa password?</a>
            </div>

            <NeuroBtn tone="primary" size="lg" style={{ marginTop: 4 }}>
              {busy ? "Memuat…" : "Masuk"}
            </NeuroBtn>
            <button type="button" onClick={onDemo} style={{
              padding: "10px 16px", borderRadius: 14, border: "none",
              background: "transparent", color: "var(--nt-brand-mid)",
              fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit"
            }}>
              Coba mode demo (tanpa login)
            </button>
          </form>

          <div style={{ marginTop: 16, fontSize: 10.5, color: "var(--nt-text-3)", lineHeight: 1.5, textAlign: "center" }}>
            Dengan masuk, Anda menyetujui penggunaan data EEG sesuai kebijakan privasi non-punitif perusahaan.
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AuthLogin });
