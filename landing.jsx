// Landing page (/landing) — interactive marketing entry, brain.fm-inspired.
// Sections fade + slide into view on scroll via IntersectionObserver (<Reveal>).

// Reveal — fades & lifts its children into view when scrolled near.
const Reveal = ({ children, delay = 0, y = 28, style }) => {
  const ref = React.useRef(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? "translateY(0)" : `translateY(${y}px)`,
      transition: `opacity .7s ease ${delay}ms, transform .8s cubic-bezier(.2,.7,.3,1) ${delay}ms`,
      willChange: "opacity, transform",
      ...style,
    }}>
      {children}
    </div>
  );
};

// Brand lockup — SVG mark + gradient wordmark (NeuroLogo's own text is dark).
const Brand = ({ size = 30 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <NeuroLogo size={size} withText={false} color="#4a93ec" />
    <span style={{
      fontSize: size * 0.62, fontWeight: 800, letterSpacing: "-0.01em",
      background: "var(--nt-brand-gradient)",
      WebkitBackgroundClip: "text", backgroundClip: "text",
      WebkitTextFillColor: "transparent", color: "transparent",
    }}>neurotech</span>
  </div>
);

const LANDING_FEATURES = [
  { icon: "👷", title: "Pekerja", text: "Cek readiness pra-shift, pantau kondisi otak saat bekerja, dan lihat tren tidur — privat, hanya untuk Anda." },
  { icon: "🛡", title: "Supervisor K3", text: "Dashboard tim real-time: siapa kritis, alert microsleep, jadwal shift, dan laporan dalam satu layar." },
  { icon: "📊", title: "Manajemen SMK3", text: "Analitik agregat tren fatigue, skor K3, dan dampak intervensi untuk keputusan kebijakan." },
];

const LANDING_STEPS = [
  { n: "01", title: "Pakai headband", text: "Pekerja memakai Muse 2 / Muse S. Kalibrasi baseline otak singkat dilakukan di awal shift." },
  { n: "02", title: "Analisis real-time", text: "Sinyal EEG diproses menjadi indeks Fatigue, Cognitive Load, dan Engagement setiap saat." },
  { n: "03", title: "Peringatan dini", text: "Sistem memberi alert sebelum kelelahan berubah menjadi microsleep atau insiden kerja." },
];

const LANDING_STATS = [
  { v: "142", l: "pekerja terpantau" },
  { v: "11.4k", l: "jam EEG terekam" },
  { v: "−24%", l: "insiden fatigue" },
];

// Bar heights for the decorative EEG strip (cycled across all bars).
const EEG_HEIGHTS = [38, 62, 28, 82, 50, 70, 34, 90, 46, 66, 30, 74];

const LandingPage = () => {
  const goRegister = () => { sessionStorage.setItem("nt-auth-mode", "register"); navigate("/login"); };
  const goLogin = () => { sessionStorage.removeItem("nt-auth-mode"); navigate("/login"); };
  const goDemo = () => {
    sessionStorage.setItem("nt-demo", "1");
    window.toast?.("Mode demo aktif — tanpa login", { kind: "info" });
    navigate("/w/readiness");
  };

  return (
    <div className="nt-landing">
      {/* ── Sticky nav ──────────────────────────────────────────── */}
      <nav className="nt-landing-nav">
        <Brand size={30} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NeuroBtn tone="ghost" size="sm" onClick={goLogin}>Masuk</NeuroBtn>
          <NeuroBtn tone="primary" size="sm" onClick={goRegister}>Daftar</NeuroBtn>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <header className="nt-landing-hero">
        <span className="nt-landing-orb nt-landing-orb--a" />
        <span className="nt-landing-orb nt-landing-orb--b" />

        <div className="nt-landing-hero-inner">
          <Reveal delay={0}>
            <div className="nt-landing-logo-wrap">
              <span className="nt-landing-ring" />
              <span className="nt-landing-ring" style={{ animationDelay: "1.4s" }} />
              <img src="assets/neurotech-logo.png" alt="NeuroTech" width="96" height="96" />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="nt-eyebrow" style={{ marginTop: 26 }}>
              Sistem Monitoring K3 Berbasis EEG
            </div>
          </Reveal>

          <Reveal delay={200}>
            <h1 className="nt-landing-h1">
              Lihat <span className="nt-grad-text">fatigue &amp; cognitive load</span>
              <br />sebelum jadi insiden.
            </h1>
          </Reveal>

          <Reveal delay={300}>
            <p className="nt-landing-sub">
              NeuroTech menggabungkan data tidur pra-shift dengan pemantauan otak
              real-time dari headband Muse — supaya kelelahan mental terdeteksi
              lebih dulu, bukan setelah terjadi kecelakaan.
            </p>
          </Reveal>

          <Reveal delay={400}>
            <div className="nt-landing-cta">
              <NeuroBtn tone="primary" size="lg" onClick={goRegister}>Mulai sekarang</NeuroBtn>
              <NeuroBtn tone="default" size="lg" onClick={goDemo}>Coba demo →</NeuroBtn>
            </div>
          </Reveal>

          <Reveal delay={520}>
            <div className="nt-landing-eeg">
              {Array.from({ length: 44 }, (_, i) => (
                <span key={i} style={{
                  height: EEG_HEIGHTS[i % EEG_HEIGHTS.length] + "%",
                  animationDelay: (i % 12) * 0.08 + "s",
                }} />
              ))}
            </div>
          </Reveal>

          <Reveal delay={600}>
            <div className="nt-landing-stats">
              {LANDING_STATS.map((s) => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div className="nt-landing-stat-v">{s.v}</div>
                  <div className="nt-landing-stat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </header>

      {/* ── Features: three personas ────────────────────────────── */}
      <section className="nt-landing-section">
        <Reveal>
          <div className="nt-eyebrow" style={{ textAlign: "center" }}>Tiga sudut pandang</div>
          <h2 className="nt-landing-h2">Satu sistem untuk seluruh tim K3</h2>
        </Reveal>
        <div className="nt-landing-grid">
          {LANDING_FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 130}>
              <div className="nt-landing-card">
                <div className="nt-landing-card-icon">{f.icon}</div>
                <div className="nt-landing-card-title">{f.title}</div>
                <p className="nt-landing-card-text">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="nt-landing-section">
        <Reveal>
          <div className="nt-eyebrow" style={{ textAlign: "center" }}>Cara kerja</div>
          <h2 className="nt-landing-h2">Dari sinyal otak ke pencegahan insiden</h2>
        </Reveal>
        <div className="nt-landing-grid">
          {LANDING_STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 130}>
              <div className="nt-landing-step">
                <div className="nt-landing-step-n">{s.n}</div>
                <div className="nt-landing-card-title">{s.title}</div>
                <p className="nt-landing-card-text">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Final call to action ────────────────────────────────── */}
      <section className="nt-landing-section">
        <Reveal>
          <div className="nt-landing-final">
            <span className="nt-landing-orb nt-landing-orb--c" />
            <div className="nt-landing-final-inner">
              <h2 className="nt-landing-h2" style={{ marginTop: 0 }}>
                Siap mencegah insiden<br />sebelum terjadi?
              </h2>
              <p className="nt-landing-sub" style={{ marginTop: 14 }}>
                Buat akun untuk tim Anda, atau jelajahi dulu lewat mode demo.
              </p>
              <div className="nt-landing-cta">
                <NeuroBtn tone="primary" size="lg" onClick={goRegister}>Buat akun</NeuroBtn>
                <NeuroBtn tone="default" size="lg" onClick={goDemo}>Coba demo →</NeuroBtn>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="nt-landing-footer">
        <Brand size={24} />
        <div className="nt-landing-footer-meta">
          © 2026 NeuroTech · Technology of the Mind · Sistem Monitoring Fatigue &amp; K3
        </div>
      </footer>
    </div>
  );
};

Object.assign(window, { Reveal, LandingPage });
