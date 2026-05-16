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
  { label: "Edukasi", page: "education-space" },
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
  { title: "Dukungan", links: ["Panduan Memulai", "FAQ", "Basis Pengetahuan", "Education Space", "Hubungi Kami", "Status Sistem"] },
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
              <button
                key={item.label}
                className="nt-nav-link"
                onClick={() => (item.page ? navigate("/p/" + item.page) : goCaraKerja())}
              >
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

// K3 accident hook — figures from BPJS Ketenagakerjaan (kecelakaan kerja nasional).
const HOOK_STATS = [
  { v: "462.241", l: "kasus kecelakaan kerja tercatat di Indonesia sepanjang 2024" },
  { v: "Rp 3,49 T", l: "nilai klaim kecelakaan kerja yang dibayarkan selama 2024" },
  { v: "370.747", l: "kasus pada 2023 — artinya angkanya terus meningkat tiap tahun" },
];

// Research references — real, verifiable publications on EEG fatigue detection.
const RESEARCH = [
  {
    tag: "Survei",
    title: "A Survey on Drowsiness Detection — Modern Applications and Methods",
    venue: "IEEE Transactions on Intelligent Vehicles",
    year: "2024",
    url: "https://arxiv.org/abs/2408.12990",
  },
  {
    tag: "Survei",
    title: "EEG-based neural networks approaches for fatigue and drowsiness detection: A survey",
    venue: "Neurocomputing (Elsevier)",
    year: "2023",
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0925231223008329",
  },
  {
    tag: "Jurnal",
    title: "An EEG-Based Fatigue Detection and Mitigation System",
    venue: "International Journal of Neural Systems",
    year: "2016",
    url: "https://pubmed.ncbi.nlm.nih.gov/27121994/",
  },
  {
    tag: "Jurnal",
    title: "Drowsiness detection using portable wireless EEG",
    venue: "Computer Methods and Programs in Biomedicine",
    year: "2022",
    url: "https://www.sciencedirect.com/science/article/abs/pii/S016926072100609X",
  },
];

// Consultation / contact details.
const CONTACT = {
  address: "Prodi Teknik Industri, Fakultas Teknik, Universitas Sebelas Maret — Jl. Ir. Sutami No. 36A, Kentingan, Jebres, Surakarta 57126, Jawa Tengah",
  phone: "0812-3456-7859",
  phoneIntl: "6281234567859",
  email: "neurotech.id@gmail.com",
  ig: "@neurotech.id",
  igUrl: "https://instagram.com/neurotech.id",
};

// Bar heights for the decorative EEG strip (cycled across all bars).
const EEG_HEIGHTS = [38, 62, 28, 82, 50, 70, 34, 90, 46, 66, 30, 74];

// ── Contact form — posts to the team inbox via FormSubmit (no backend) ──────
const ContactForm = () => {
  const [form, setForm] = React.useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("https://formsubmit.co/ajax/" + CONTACT.email, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          Nama: form.name,
          Email: form.email,
          Subjek: form.subject,
          Pesan: form.message,
          _subject: "Konsultasi NeuroTech — " + (form.subject || "tanpa subjek"),
        }),
      });
      if (!res.ok) throw new Error("Gagal mengirim pesan. Coba lagi nanti.");
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      window.toast?.("Pesan terkirim. Terima kasih!", { kind: "success" });
    } catch (err) {
      window.toast?.(err.message || "Gagal mengirim pesan.", { kind: "danger" });
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="nt-cform-done">
        <div style={{ fontSize: 30 }}>✓</div>
        <div className="nt-landing-card-title" style={{ marginTop: 6 }}>Pesan terkirim</div>
        <p className="nt-landing-card-text" style={{ marginBottom: 14 }}>
          Terima kasih — pesan Anda sudah kami terima dan akan dibalas lewat email.
        </p>
        <NeuroBtn tone="default" size="sm" onClick={() => setSent(false)}>Kirim pesan lain</NeuroBtn>
      </div>
    );
  }

  return (
    <form className="nt-cform" onSubmit={submit}>
      <input className="nt-cform-input" name="name" placeholder="Nama Lengkap" required
        value={form.name} onChange={set("name")} />
      <input className="nt-cform-input" name="email" type="email" placeholder="Alamat Email" required
        value={form.email} onChange={set("email")} />
      <input className="nt-cform-input" name="subject" placeholder="Subjek" required
        value={form.subject} onChange={set("subject")} />
      <textarea className="nt-cform-input nt-cform-textarea" name="message" placeholder="Pesan Anda"
        required rows={4} value={form.message} onChange={set("message")} />
      <NeuroBtn tone="primary" size="lg" style={{ width: "100%" }}>
        {busy ? "Mengirim…" : "Kirim Pesan"}
      </NeuroBtn>
    </form>
  );
};

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

    {/* ── Hook: K3 accidents are still high ─────────────────────── */}
    <section className="nt-hook">
      <Reveal>
        <div className="nt-eyebrow" style={{ textAlign: "center" }}>Kenapa ini penting</div>
        <h2 className="nt-landing-h2">Kecelakaan kerja masih tinggi — dan terus naik</h2>
      </Reveal>
      <Reveal delay={100}>
        <div className="nt-hook-stat-grid">
          {HOOK_STATS.map((s, i) => (
            <div className="nt-hook-stat" key={i}>
              <div className="nt-hook-stat-v">{s.v}</div>
              <div className="nt-hook-stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal delay={160}>
        <p className="nt-hook-note">
          Banyak insiden ini dipicu <strong>kelelahan dan microsleep</strong> — kondisi
          yang tidak terlihat mata, tapi <strong>bisa dideteksi lebih awal lewat sinyal
          otak (EEG)</strong>. Di situlah NeuroTech bekerja: mengubah kelelahan yang tak
          terlihat menjadi peringatan dini yang bisa ditindaklanjuti.
        </p>
        <div className="nt-hook-src">
          Sumber: BPJS Ketenagakerjaan — data kecelakaan kerja nasional 2023–2024.
        </div>
      </Reveal>
    </section>

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

    {/* ── Research & journals ───────────────────────────────────── */}
    <section className="nt-landing-section">
      <Reveal>
        <div className="nt-eyebrow" style={{ textAlign: "center" }}>Riset &amp; Jurnal</div>
        <h2 className="nt-landing-h2">Didukung bukti ilmiah</h2>
        <p className="nt-landing-sub" style={{ marginTop: 14 }}>
          Pemantauan kelelahan berbasis EEG bukan ide baru — sudah diteliti luas dan
          terbukti efektif untuk keselamatan kerja. Beberapa rujukan ilmiahnya:
        </p>
      </Reveal>
      <div className="nt-research-grid">
        {RESEARCH.map((r, i) => (
          <Reveal key={i} delay={i * 110}>
            <a className="nt-research-card" href={r.url} target="_blank" rel="noopener noreferrer">
              <span className="nt-research-tag">{r.tag}</span>
              <div className="nt-research-title">{r.title}</div>
              <div className="nt-research-meta">{r.venue} · {r.year}</div>
              <div className="nt-research-meta">
                <span className="nt-research-link">Buka sumber →</span>
              </div>
            </a>
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

    {/* ── Consultation / contact ────────────────────────────────── */}
    <section className="nt-contact">
      <Reveal>
        <div className="nt-eyebrow" style={{ textAlign: "center" }}>Konsultasi</div>
        <h2 className="nt-landing-h2" style={{ marginBottom: 30 }}>Konsultasi &amp; Hubungi Kami</h2>
      </Reveal>
      <Reveal delay={90}>
        <div className="nt-contact-card">
          <div>
            <div className="nt-landing-card-title" style={{ marginTop: 0 }}>Informasi kontak</div>
            <div className="nt-contact-rows">
              <div className="nt-contact-row">
                <span className="nt-contact-ico">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-7-5.3-7-11a7 7 0 1114 0c0 5.7-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <div>
                  <div className="nt-contact-row-label">Alamat</div>
                  <div className="nt-contact-row-value">{CONTACT.address}</div>
                </div>
              </div>
              <div className="nt-contact-row">
                <span className="nt-contact-ico">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z" />
                  </svg>
                </span>
                <div>
                  <div className="nt-contact-row-label">Telepon / WhatsApp</div>
                  <div className="nt-contact-row-value">
                    <a href={"tel:+" + CONTACT.phoneIntl}>{CONTACT.phone}</a>
                  </div>
                </div>
              </div>
              <div className="nt-contact-row">
                <span className="nt-contact-ico">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </span>
                <div>
                  <div className="nt-contact-row-label">Email</div>
                  <div className="nt-contact-row-value">
                    <a href={"mailto:" + CONTACT.email}>{CONTACT.email}</a>
                  </div>
                </div>
              </div>
              <div className="nt-contact-row">
                <span className="nt-contact-ico">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <div>
                  <div className="nt-contact-row-label">Instagram</div>
                  <div className="nt-contact-row-value">
                    <a href={CONTACT.igUrl} target="_blank" rel="noopener noreferrer">{CONTACT.ig}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="nt-contact-side">
            <div className="nt-landing-card-title" style={{ marginTop: 0 }}>Kirim pesan</div>
            <p className="nt-landing-card-text">
              Isi formulir di bawah — pesan Anda akan kami terima langsung melalui email.
            </p>
            <ContactForm />
          </div>
        </div>
      </Reveal>
    </section>

    <LandingFooter />
  </div>
);

Object.assign(window, { Reveal, Brand, LandingNav, LandingFooter, LandingPage });
