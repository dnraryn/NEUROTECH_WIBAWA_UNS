// Landing page (/landing) — interactive marketing entry, brain.fm-inspired,
// with an Emotiv-style dropdown navbar and a multi-column footer.
// LandingNav + LandingFooter are exported so content pages can reuse them.

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

// ── Shared navigation helpers ──────────────────────────────────────────────
const goRegister = () => { sessionStorage.setItem("nt-auth-mode", "register"); navigate("/login"); };
const goLogin = () => { sessionStorage.removeItem("nt-auth-mode"); navigate("/login"); };
const goDemo = () => {
  sessionStorage.setItem("nt-demo", "1");
  window.toast?.("Mode demo aktif — tanpa login", { kind: "info" });
  navigate("/w/readiness");
};
// Every nav/footer label resolves to a content page at /p/<slug>.
const goPage = (label) => navigate("/p/" + slugify(label));
const goCaraKerja = () => {
  const el = document.getElementById("cara-kerja");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  else navigate("/landing");
};

// ── Navbar menu (Emotiv-style dropdowns, NeuroTech content) ────────────────
const NAV_MENU = [
  { label: "Solusi", links: [
    { label: "Pemantauan Fatigue", desc: "Deteksi kelelahan mental real-time" },
    { label: "Beban Kognitif", desc: "Ukur cognitive load saat bekerja" },
    { label: "Kesiapan Pra-Shift", desc: "Skor readiness dari data tidur" },
    { label: "Deteksi Microsleep", desc: "Peringatan dini sebelum insiden" },
  ]},
  { label: "Fitur", links: [
    { label: "App Pekerja", desc: "Pantau kondisi otak Anda sendiri" },
    { label: "Dashboard Supervisor", desc: "Overview tim & alert K3" },
    { label: "Analitik Manajemen", desc: "Tren agregat & skor SMK3" },
  ]},
  { label: "Cara Kerja" },
  { label: "Dukungan", links: [
    { label: "Panduan Memulai", desc: "Langkah pertama dengan NeuroTech" },
    { label: "Integrasi Muse", desc: "Hubungkan headband Muse 2 / Muse S" },
    { label: "Hubungi Kami", desc: "Tim dukungan siap membantu" },
  ]},
];

// ── Footer columns (Emotiv-style, NeuroTech content) ───────────────────────
const FOOT_COLS = [
  { title: "Solusi", links: ["Pemantauan Fatigue", "Beban Kognitif", "Kesiapan Pra-Shift", "Deteksi Microsleep", "Manajemen K3"] },
  { title: "Fitur", groups: [
    { sub: "Aplikasi", links: ["App Pekerja", "Dashboard Supervisor", "Analitik Manajemen"] },
    { sub: "Perangkat", links: ["Muse 2", "Muse S", "Kalibrasi EEG", "Alert Real-time"] },
  ]},
  { title: "Dukungan", links: ["Panduan Memulai", "FAQ", "Basis Pengetahuan", "Hubungi Kami", "Status Sistem"] },
  { title: "Perusahaan", links: ["Tentang NeuroTech", "Kebijakan Privasi", "Syarat Penggunaan", "Keamanan Data", "Karier"] },
];

// ── Navbar ─────────────────────────────────────────────────────────────────
const LandingNav = () => {
  const [openMenu, setOpenMenu] = React.useState(null);
  return (
    <nav className="nt-nav">
      <div className="nt-nav-inner">
        <a onClick={() => navigate("/landing")} style={{ cursor: "pointer", display: "flex" }}>
          <Brand size={30} />
        </a>

        <div className="nt-nav-menu">
          {NAV_MENU.map((item) => (
            item.links ? (
              <div
                key={item.label}
                className="nt-nav-item"
                onMouseEnter={() => setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  className="nt-nav-link"
                  onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                >
                  {item.label}
                  <svg className="nt-nav-chev" width="11" height="11" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openMenu === item.label && (
                  <div className="nt-nav-dropdown">
                    {item.links.map((l) => (
                      <a
                        key={l.label}
                        className="nt-nav-drop-link"
                        onClick={() => { goPage(l.label); setOpenMenu(null); }}
                      >
                        <span className="nt-nav-drop-title">{l.label}</span>
                        <span className="nt-nav-drop-desc">{l.desc}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button key={item.label} className="nt-nav-link" onClick={goCaraKerja}>
                {item.label}
              </button>
            )
          ))}
        </div>

        <div className="nt-nav-actions">
          <button className="nt-nav-icon" title="Basis pengetahuan"
            onClick={() => goPage("Basis Pengetahuan")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
          <button className="nt-nav-icon" title="Masuk" onClick={goLogin}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </button>
          <NeuroBtn tone="primary" size="sm" onClick={goRegister}>Mulai</NeuroBtn>
        </div>
      </div>
    </nav>
  );
};

// ── Footer ─────────────────────────────────────────────────────────────────
const LandingFooter = () => (
  <footer className="nt-foot">
    <div className="nt-foot-top">
      <div className="nt-foot-brand">
        <Brand size={28} />
        <p className="nt-foot-blurb">
          Sistem monitoring fatigue, beban kognitif, dan K3 berbasis EEG Muse —
          deteksi dini sebelum kelelahan menjadi insiden.
        </p>
        <div className="nt-foot-badge">
          <span>✦</span> Mendukung penerapan SMK3
        </div>
      </div>

      <div className="nt-foot-cols">
        {FOOT_COLS.map((col) => (
          <div className="nt-foot-col" key={col.title}>
            <div className="nt-foot-col-title">{col.title}</div>
            {col.links && col.links.map((l) => (
              <a key={l} className="nt-foot-link" onClick={() => goPage(l)}>{l}</a>
            ))}
            {col.groups && col.groups.map((g) => (
              <div key={g.sub}>
                <div className="nt-foot-sub">{g.sub}</div>
                {g.links.map((l) => (
                  <a key={l} className="nt-foot-link" onClick={() => goPage(l)}>{l}</a>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>

    <div className="nt-foot-bottom">
      <span>© 2026 NeuroTech · Technology of the Mind</span>
      <div className="nt-foot-bottom-links">
        <a onClick={() => navigate("/p/kebijakan-privasi")}>Privasi</a>
        <a onClick={() => navigate("/p/syarat-penggunaan")}>Syarat</a>
        <a onClick={() => navigate("/p/keamanan-data")}>Keamanan Data</a>
      </div>
    </div>
  </footer>
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

const LandingPage = () => (
  <div className="nt-landing">
    <LandingNav />

    {/* ── Hero ──────────────────────────────────────────────────── */}
    <header className="nt-landing-hero" id="hero">
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

    {/* ── Features: three personas ──────────────────────────────── */}
    <section className="nt-landing-section" id="solusi">
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

    {/* ── How it works ──────────────────────────────────────────── */}
    <section className="nt-landing-section" id="cara-kerja">
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

    {/* ── Final call to action ──────────────────────────────────── */}
    <section className="nt-landing-section" id="mulai">
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

    <LandingFooter />
  </div>
);

Object.assign(window, { Reveal, Brand, LandingNav, LandingFooter, LandingPage });
