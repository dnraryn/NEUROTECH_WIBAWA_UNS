// Login & registration page (/login) — full-bleed, no frame chrome.
// Real Firebase Auth: sign-in, sign-up (writes a profile to Firestore), or a
// no-auth demo bypass. App.jsx's auth listener handles post-auth routing.

const ROLE_OPTIONS = [
  { id: "worker",     l: "Pekerja",        sub: "Mobile app",        icon: "👷" },
  { id: "supervisor", l: "Supervisor K3",  sub: "Desktop dashboard", icon: "🛡" },
  { id: "manager",    l: "Manajemen SMK3", sub: "Analitik agregat",  icon: "📊" },
];

// Map Firebase auth error codes to friendly Indonesian messages.
const authErrorMessage = (err) => {
  const code = err && err.code;
  return {
    "nt/no-name":                  "Nama lengkap wajib diisi.",
    "auth/invalid-email":          "Format email tidak valid.",
    "auth/user-not-found":         "Email atau password salah.",
    "auth/wrong-password":         "Email atau password salah.",
    "auth/invalid-credential":     "Email atau password salah.",
    "auth/email-already-in-use":   "Email ini sudah terdaftar. Silakan masuk.",
    "auth/weak-password":          "Password minimal 6 karakter.",
    "auth/too-many-requests":      "Terlalu banyak percobaan. Coba lagi nanti.",
    "auth/network-request-failed": "Gagal terhubung. Periksa koneksi internet.",
    "auth/operation-not-allowed":  "Metode Email/Password belum diaktifkan di Firebase Console.",
  }[code] || (err && err.message) || "Terjadi kesalahan. Coba lagi.";
};

const AuthLogin = () => {
  // Landing-page CTAs may request the register form via sessionStorage.
  const [mode, setMode] = React.useState(() => {
    if (typeof sessionStorage === "undefined") return "login";
    const requested = sessionStorage.getItem("nt-auth-mode");
    sessionStorage.removeItem("nt-auth-mode");
    return requested === "register" ? "register" : "login";
  }); // "login" | "register"
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("worker");
  const [busy, setBusy] = React.useState(false);

  const isRegister = mode === "register";

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (!window.ntAuth) throw new Error("Firebase belum siap. Muat ulang halaman.");
      if (isRegister) {
        if (!name.trim()) throw { code: "nt/no-name" };
        await window.ntAuth.signUp({ name: name.trim(), email, password, role });
        window.toast?.("Akun berhasil dibuat. Selamat datang!", { kind: "success" });
      } else {
        await window.ntAuth.signIn({ email, password });
        window.toast?.("Berhasil masuk.", { kind: "success" });
      }
      // App.jsx's auth listener loads the profile and routes by role.
    } catch (err) {
      window.toast?.(authErrorMessage(err), { kind: "danger" });
      setBusy(false);
    }
  };

  const onDemo = () => {
    sessionStorage.setItem("nt-demo", "1");
    window.toast?.("Mode demo aktif — tanpa login", { kind: "info" });
    navigate("/w/readiness");
  };

  // Shared input styling — used by the name/email/password fields.
  const fieldInput = {
    padding: "12px 16px", borderRadius: 14,
    background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-in)",
    border: "none", outline: "none", fontSize: 14, fontFamily: "inherit",
    color: "var(--nt-text)",
  };
  const fieldLabel = {
    fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.12em",
    textTransform: "uppercase", fontWeight: 700,
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

      <div className="nt-auth-grid">
        {/* Left: brand — hidden on mobile so the form takes the screen */}
        <div className="nt-auth-brand" style={{ padding: "20px 24px" }}>
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
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>
            {isRegister ? "Daftar akun NeuroTech" : "Masuk ke NeuroTech"}
          </div>
          <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 6 }}>
            {isRegister
              ? "Buat akun untuk tim K3 Anda. Peran menentukan dashboard yang Anda lihat."
              : "Masuk dengan email dan password akun Anda."}
          </div>

          {/* Role pills — only when registering (login reads role from Firestore) */}
          {isRegister && (
            <>
              <div style={{ ...fieldLabel, marginTop: 20 }}>Daftar sebagai</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                {ROLE_OPTIONS.map((r) => (
                  <button type="button" key={r.id} onClick={() => setRole(r.id)} style={{
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
            </>
          )}

          <form onSubmit={onSubmit} style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            {isRegister && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={fieldLabel}>Nama lengkap</span>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda" required style={fieldInput} />
              </label>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={fieldLabel}>Email perusahaan</span>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.id" required style={fieldInput} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={fieldLabel}>Password</span>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6} style={fieldInput} />
            </label>

            {!isRegister && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--nt-text-3)" }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked />
                  Ingat saya
                </label>
                <a onClick={() => window.toast?.("Reset password — fitur akan datang", { kind: "info" })} style={{ color: "var(--nt-brand-mid)", cursor: "pointer", fontWeight: 600 }}>Lupa password?</a>
              </div>
            )}

            <NeuroBtn tone="primary" size="lg" style={{ marginTop: 4 }}>
              {busy ? "Memuat…" : isRegister ? "Daftar" : "Masuk"}
            </NeuroBtn>
            {!isRegister && (
              <button type="button" onClick={onDemo} style={{
                padding: "10px 16px", borderRadius: 14, border: "none",
                background: "transparent", color: "var(--nt-brand-mid)",
                fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit"
              }}>
                Coba mode demo (tanpa login)
              </button>
            )}
          </form>

          {/* Toggle between sign-in and sign-up */}
          <div style={{ marginTop: 14, fontSize: 12, color: "var(--nt-text-2)", textAlign: "center" }}>
            {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
            <a
              onClick={() => { setMode(isRegister ? "login" : "register"); setBusy(false); }}
              style={{ color: "var(--nt-brand-mid)", cursor: "pointer", fontWeight: 700 }}>
              {isRegister ? "Masuk di sini" : "Daftar di sini"}
            </a>
          </div>

          <div style={{ marginTop: 14, fontSize: 10.5, color: "var(--nt-text-3)", lineHeight: 1.5, textAlign: "center" }}>
            Dengan masuk, Anda menyetujui penggunaan data EEG sesuai kebijakan privasi non-punitif perusahaan.
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AuthLogin });
