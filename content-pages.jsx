// Content/marketing pages, every navbar & footer link resolves here via
// /p/<slug>. ContentPage reuses LandingNav + LandingFooter for a consistent
// shell. Keys must match slugify(label) of the link that points to them.
// Each section is shown as a collapsible accordion (explanation on click).

const CONTENT = {
  "pemantauan-fatigue": {
    cat: "Solusi", title: "Pemantauan Fatigue",
    intro: "Kelelahan mental sering tidak terasa sampai terlambat. NeuroTech mengukurnya secara objektif dari sinyal otak, secara real-time.",
    sections: [
      { h: "Apa itu Fatigue Index", p: "Fatigue Index (FI) adalah skor 0–100 yang dihitung dari pola gelombang EEG, terutama rasio theta/beta yang meningkat saat otak lelah. Semakin tinggi FI, semakin besar risiko penurunan kewaspadaan." },
      { h: "Dipantau sepanjang shift", p: "Headband Muse merekam aktivitas otak setiap detik. NeuroTech memproses sinyal itu menjadi tren FI yang bisa dilihat pekerja maupun supervisor tanpa jeda." },
      { h: "Bukan untuk menghukum", p: "Data fatigue dipakai untuk pencegahan, bukan sanksi. Tujuannya membantu pekerja beristirahat tepat waktu dan menata ulang jadwal sebelum kelelahan jadi insiden." },
    ],
  },
  "beban-kognitif": {
    cat: "Solusi", title: "Beban Kognitif",
    intro: "Otak punya kapasitas terbatas. Saat beban kognitif terlalu tinggi dalam waktu lama, kesalahan kerja meningkat tajam.",
    sections: [
      { h: "Cognitive Load Index", p: "CLI mengukur seberapa keras otak bekerja dari aktivitas gelombang di area frontal. NeuroTech menandai saat CLI melewati ambang berisiko." },
      { h: "Deteksi overload dini", p: "Sistem memberi tahu ketika beban kognitif tinggi bertahan lama, misalnya 18 menit terus-menerus, sehingga tugas bisa dijeda atau dirotasi." },
      { h: "Desain shift lebih sehat", p: "Pola CLI agregat membantu manajemen menata beban tugas, durasi shift, dan waktu istirahat berdasarkan data, bukan tebakan." },
    ],
  },
  "kesiapan-pra-shift": {
    cat: "Solusi", title: "Kesiapan Pra-Shift",
    intro: "Kondisi pekerja sebelum shift dimulai sangat menentukan risiko sepanjang hari. NeuroTech menilainya lebih dulu.",
    sections: [
      { h: "Skor Readiness", p: "Sebelum shift, NeuroTech menggabungkan data tidur dan baseline EEG menjadi skor readiness 0–100. Skor di bawah ambang menandakan pekerja belum siap penuh." },
      { h: "Data tidur terintegrasi", p: "Headband Muse yang mendukung mode tidur dapat merekam tidur malam sebelumnya. Durasi dan kualitas tidur menjadi masukan utama skor kesiapan." },
      { h: "Keputusan penempatan", p: "Supervisor bisa memakai skor readiness untuk menyesuaikan tugas, menempatkan pekerja dengan skor rendah pada peran berisiko lebih kecil." },
    ],
  },
  "deteksi-microsleep": {
    cat: "Solusi", title: "Deteksi Microsleep",
    intro: "Microsleep, tertidur 1–10 detik tanpa sadar, adalah salah satu penyebab kecelakaan kerja paling berbahaya.",
    sections: [
      { h: "Tanda yang ditangkap", p: "NeuroTech mendeteksi microsleep dari pola gelombang theta yang dominan, runtuhnya gelombang beta, dan penurunan tajam Engagement Index — murni dari sinyal EEG, bukan gerakan kepala fisik." },
      { h: "Peringatan seketika", p: "Saat microsleep terdeteksi, alert kritis langsung dikirim ke pekerja dan supervisor agar tindakan cepat bisa diambil." },
      { h: "Mencegah pengulangan", p: "Setiap kejadian dicatat sehingga pola berulang, misalnya selalu pada jam tertentu, bisa dikenali dan dicegah." },
    ],
  },
  "manajemen-k3": {
    cat: "Solusi", title: "Manajemen K3",
    intro: "NeuroTech mengubah data otak menjadi indikator keselamatan kerja yang bisa langsung ditindaklanjuti.",
    sections: [
      { h: "K3 berbasis data", p: "Alih-alih hanya mengandalkan laporan setelah insiden, NeuroTech memberi indikator risiko real-time sehingga pencegahan bisa dilakukan lebih awal." },
      { h: "Mendukung SMK3", p: "Tren fatigue, insiden, dan skor keselamatan dirangkum dalam laporan yang mendukung penerapan Sistem Manajemen Keselamatan dan Kesehatan Kerja." },
      { h: "Budaya non-punitif", p: "Pendekatan NeuroTech menekankan perlindungan pekerja. Data individu bersifat privat dan dipakai untuk perbaikan sistem, bukan hukuman." },
    ],
  },
  "app-pekerja": {
    cat: "Fitur", title: "App Pekerja",
    intro: "Aplikasi mobile untuk pekerja, memantau kondisi otak sendiri secara pribadi.",
    sections: [
      { h: "Readiness & Live", p: "Pekerja melihat skor kesiapan pra-shift dan kondisi fatigue serta cognitive load secara live selama bekerja." },
      { h: "Tren tidur & statistik", p: "Riwayat tidur dan statistik mingguan membantu pekerja memahami pola dirinya sendiri dari waktu ke waktu." },
      { h: "Privasi penuh", p: "Data detail individu hanya bisa dilihat oleh pekerja yang bersangkutan. Supervisor hanya melihat status ringkas." },
    ],
  },
  "dashboard-supervisor": {
    cat: "Fitur", title: "Dashboard Supervisor",
    intro: "Pusat kendali K3 untuk supervisor, seluruh tim dalam satu layar.",
    sections: [
      { h: "Overview tim real-time", p: "Lihat siapa yang berstatus normal, waspada, berisiko, atau kritis secara langsung, lengkap dengan feed alert terbaru." },
      { h: "Alert & jadwal", p: "Kelola alert microsleep dan fatigue, serta atur jadwal shift berdasarkan kondisi aktual pekerja." },
      { h: "Laporan siap pakai", p: "Hasilkan laporan periodik tim untuk kebutuhan evaluasi dan audit K3." },
    ],
  },
  "analitik-manajemen": {
    cat: "Fitur", title: "Analitik Manajemen",
    intro: "Pandangan agregat untuk manajemen SMK3, fokus pada tren, bukan individu.",
    sections: [
      { h: "Tren agregat", p: "Lihat perkembangan fatigue, beban kognitif, dan insiden di tingkat departemen maupun perusahaan." },
      { h: "Skor K3 & dampak intervensi", p: "Pantau skor keselamatan dari waktu ke waktu dan ukur dampak setiap kebijakan yang diterapkan." },
      { h: "Dasar keputusan kebijakan", p: "Data agregat membantu manajemen mengambil keputusan soal jam kerja, rotasi tugas, dan program kesehatan." },
    ],
  },
  "alert-real-time": {
    cat: "Fitur", title: "Alert Real-time",
    intro: "Peringatan yang muncul tepat saat dibutuhkan, bukan setelah semuanya terlambat.",
    sections: [
      { h: "Ambang otomatis", p: "NeuroTech memantau setiap indeks terhadap ambang risiko dan memicu alert begitu kondisi terlewati." },
      { h: "Tingkat keparahan", p: "Alert dikelompokkan menjadi waspada, berisiko, dan kritis, sehingga respons bisa diprioritaskan." },
      { h: "Sampai ke orang yang tepat", p: "Notifikasi dikirim ke pekerja terkait dan supervisornya secara bersamaan." },
    ],
  },
  "headband-muse": {
    cat: "Perangkat", title: "Headband Muse",
    intro: "NeuroTech bekerja dengan headband EEG Muse, dan kompatibel dengan seluruh model Muse yang mendukung koneksi Bluetooth.",
    sections: [
      { h: "Kompatibel dengan semua model Muse", p: "NeuroTech tidak terbatas pada satu perangkat. Selama headband Muse mendukung perekaman EEG dan koneksi Bluetooth, termasuk Muse 2, Muse S, maupun model Muse lainnya, perangkat itu bisa langsung dipakai dengan NeuroTech." },
      { h: "Sensor EEG", p: "Headband Muse merekam aktivitas otak melalui sensor di dahi dan belakang telinga. Data ini cukup bagi NeuroTech untuk menghitung indeks Fatigue, Cognitive Load, dan Engagement." },
      { h: "Koneksi nirkabel", p: "Semua perangkat terhubung lewat Bluetooth, mengirim sinyal EEG ke aplikasi NeuroTech secara real-time tanpa kabel yang mengganggu." },
      { h: "Nyaman dipakai bekerja", p: "Headband Muse ringan dan nirkabel sehingga bisa dipakai sepanjang shift. Model berbahan kain juga nyaman dipakai tidur untuk merekam kualitas tidur pra-shift." },
    ],
  },
  "kalibrasi-eeg": {
    cat: "Perangkat", title: "Kalibrasi EEG",
    intro: "Setiap otak berbeda. Kalibrasi memastikan indeks NeuroTech akurat untuk tiap pekerja.",
    sections: [
      { h: "Baseline personal", p: "Di awal shift, NeuroTech merekam baseline singkat aktivitas otak pekerja dalam kondisi tenang." },
      { h: "Kenapa penting", p: "Tanpa baseline, indeks fatigue bisa salah baca. Kalibrasi membuat skor 0–100 benar-benar bermakna untuk individu tersebut." },
      { h: "Cepat & otomatis", p: "Proses kalibrasi hanya butuh beberapa menit dan dipandu langsung di dalam aplikasi." },
    ],
  },
  "integrasi-muse": {
    cat: "Dukungan", title: "Integrasi Muse",
    intro: "Cara menghubungkan headband Muse dengan aplikasi NeuroTech.",
    sections: [
      { h: "Pasangkan perangkat", p: "Aktifkan Bluetooth, nyalakan headband Muse, lalu pilih perangkat di aplikasi NeuroTech untuk memasangkannya." },
      { h: "Pakai dengan benar", p: "Pastikan sensor menempel pas di dahi dan belakang telinga agar sinyal EEG yang terekam bersih." },
      { h: "Atasi koneksi putus", p: "Jika koneksi terputus, dekatkan perangkat dan pastikan baterai cukup. NeuroTech akan otomatis menyambung kembali." },
    ],
  },
  "panduan-memulai": {
    cat: "Dukungan", title: "Panduan Memulai",
    intro: "Langkah pertama menggunakan NeuroTech, dari membuat akun hingga shift pertama.",
    sections: [
      { h: "1. Buat akun", p: "Daftar dengan email dan pilih peran Anda, Pekerja, Supervisor, atau Manajemen." },
      { h: "2. Hubungkan headband", p: "Pasangkan headband Muse Anda lewat Bluetooth, lalu lakukan kalibrasi baseline singkat." },
      { h: "3. Mulai shift", p: "Cek skor readiness Anda, lalu pantau kondisi otak secara live sepanjang shift." },
    ],
  },
  "faq": {
    cat: "Dukungan", title: "Pertanyaan Umum (FAQ)",
    intro: "Pertanyaan yang paling sering diajukan tentang NeuroTech.",
    sections: [
      { h: "Apakah data saya aman?", p: "Ya. Data EEG individu bersifat privat dan hanya bisa diakses oleh pemiliknya. Supervisor hanya melihat status ringkas." },
      { h: "Apakah dipakai untuk menghukum?", p: "Tidak. NeuroTech menganut kebijakan non-punitif, data dipakai untuk pencegahan dan perbaikan, bukan sanksi." },
      { h: "Headband apa yang didukung?", p: "NeuroTech mendukung seluruh headband EEG Muse yang memiliki koneksi Bluetooth, termasuk Muse 2, Muse S, dan model Muse lainnya." },
    ],
  },
  "basis-pengetahuan": {
    cat: "Dukungan", title: "Basis Pengetahuan",
    intro: "Kumpulan artikel dan istilah untuk memahami NeuroTech lebih dalam.",
    sections: [
      { h: "Istilah indeks", p: "Pelajari arti Fatigue Index, Cognitive Load Index, Engagement Index, dan skor Readiness." },
      { h: "Panduan per peran", p: "Artikel terpisah untuk Pekerja, Supervisor, dan Manajemen menjelaskan fitur sesuai kebutuhan masing-masing." },
      { h: "Praktik terbaik K3", p: "Rekomendasi penggunaan data NeuroTech untuk menata shift, waktu istirahat, dan rotasi tugas." },
    ],
  },
  "hubungi-kami": {
    cat: "Dukungan", title: "Hubungi Kami",
    intro: "Tim NeuroTech siap membantu pertanyaan dan kebutuhan Anda.",
    sections: [
      { h: "Email & media sosial", p: "Kirim pertanyaan ke neurotech.id@gmail.com, atau hubungi kami lewat Instagram @neurotech.id. Tim kami akan membalas pada hari kerja." },
      { h: "Dukungan teknis", p: "Untuk kendala perangkat atau aplikasi, sertakan detail perangkat dan tangkapan layar agar penanganan lebih cepat." },
      { h: "Kerja sama", p: "Untuk kemitraan atau implementasi skala perusahaan, hubungi kami lewat email yang sama dengan subjek \"Kerja sama\"." },
    ],
  },
  "status-sistem": {
    cat: "Dukungan", title: "Status Sistem",
    intro: "Pantau ketersediaan layanan NeuroTech.",
    sections: [
      { h: "Layanan aplikasi, Normal", p: "Aplikasi web dan mobile NeuroTech beroperasi normal tanpa gangguan." },
      { h: "Sinkronisasi data, Normal", p: "Layanan perekaman dan sinkronisasi data EEG beroperasi normal." },
      { h: "Pemeliharaan terjadwal", p: "Pemeliharaan sistem, bila ada, akan diumumkan lebih dulu di halaman ini." },
    ],
  },
  "about-neurotech": {
    cat: "Tentang", title: "About NeuroTech",
    intro: "Kenali NeuroTech, teknologi EEG di baliknya, dan bagaimana sistem ini membantu mencegah kecelakaan kerja.",
    sections: [
      { h: "Apa itu EEG?", p: "Electroencephalography (EEG) adalah metode merekam aktivitas listrik otak melalui sensor di permukaan kepala. Setiap kali sel saraf bekerja, ia menghasilkan sinyal listrik kecil, EEG menangkap pola sinyal itu secara real-time, tanpa prosedur yang menyakitkan." },
      { h: "Gelombang otak dan artinya", p: "Sinyal EEG terdiri dari beberapa pita gelombang, alpha, beta, theta, dan delta. Komposisinya berubah sesuai kondisi: gelombang beta dominan saat fokus, sedangkan theta dan alpha meningkat saat mengantuk dan lelah. Pergeseran inilah yang menjadi penanda kelelahan." },
      { h: "Apa fungsi NeuroTech?", p: "NeuroTech mengubah sinyal EEG mentah menjadi indikator yang mudah dipahami, Fatigue Index, Cognitive Load Index, dan Engagement Index. Dengan begitu, kondisi otak pekerja bisa dipantau semudah membaca angka, bukan grafik rumit." },
      { h: "Bagaimana mendeteksi kelelahan & microsleep", p: "NeuroTech membandingkan sinyal otak pekerja saat ini dengan baseline pribadinya. Ketika pola gelombang bergeser ke arah mengantuk, gelombang theta naik dominan, atau engagement mendadak turun, sistem mengenalinya sebagai tanda fatigue atau microsleep. Gerakan fisik / artefak otomatis difilter agar tidak terhitung sebagai microsleep." },
      { h: "Bagaimana ini mengurangi kecelakaan kerja", p: "Sebagian besar kecelakaan akibat kelelahan terjadi karena tidak ada peringatan sebelum pekerja kehilangan kewaspadaan. NeuroTech memberi alert dini sehingga pekerja bisa beristirahat dan supervisor bisa bertindak, memutus rantai sebelum berubah menjadi insiden." },
    ],
  },
  "kebijakan-privasi": {
    cat: "Perusahaan", title: "Kebijakan Privasi",
    intro: "Bagaimana NeuroTech mengumpulkan, memakai, dan melindungi data Anda.",
    sections: [
      { h: "Data yang dikumpulkan", p: "NeuroTech mengumpulkan data EEG, data tidur, dan informasi akun yang diperlukan untuk menjalankan layanan." },
      { h: "Penggunaan data", p: "Data dipakai untuk menghitung indeks kesehatan kerja dan menyajikannya kepada pengguna yang berhak. Data individu tidak diperjualbelikan." },
      { h: "Hak pengguna", p: "Pengguna berhak mengetahui, mengakses, dan meminta penghapusan data pribadinya sesuai ketentuan yang berlaku." },
    ],
  },
  "syarat-penggunaan": {
    cat: "Perusahaan", title: "Syarat Penggunaan",
    intro: "Ketentuan dalam menggunakan layanan NeuroTech.",
    sections: [
      { h: "Penggunaan layanan", p: "Layanan NeuroTech ditujukan untuk pemantauan kesehatan kerja dan harus digunakan sesuai peran akun masing-masing." },
      { h: "Tanggung jawab pengguna", p: "Pengguna bertanggung jawab menjaga kerahasiaan akun dan menggunakan perangkat sesuai panduan resmi." },
      { h: "Batasan", p: "NeuroTech adalah alat bantu pencegahan, bukan pengganti penilaian medis atau prosedur K3 resmi perusahaan." },
    ],
  },
  "keamanan-data": {
    cat: "Perusahaan", title: "Keamanan Data",
    intro: "Langkah-langkah NeuroTech menjaga keamanan data Anda.",
    sections: [
      { h: "Akses berdasarkan peran", p: "Setiap peran hanya bisa mengakses data yang relevan. Data EEG detail terkunci hanya untuk pemiliknya." },
      { h: "Penyimpanan terlindungi", p: "Data disimpan pada infrastruktur cloud dengan aturan keamanan yang membatasi akses tidak sah." },
      { h: "Autentikasi", p: "Akses memerlukan login terverifikasi, dan sesi pengguna dikelola secara aman." },
    ],
  },
  "karier": {
    cat: "Perusahaan", title: "Karier di NeuroTech",
    intro: "Bangun teknologi yang melindungi pekerja bersama NeuroTech.",
    sections: [
      { h: "Mengapa NeuroTech", p: "Anda akan mengerjakan produk yang berdampak langsung pada keselamatan dan kesehatan pekerja." },
      { h: "Bidang yang kami cari", p: "Kami terbuka untuk talenta di bidang teknik perangkat lunak, pemrosesan sinyal, desain produk, dan kesehatan kerja." },
      { h: "Cara melamar", p: "Kirim CV dan portofolio ke neurotech.id@gmail.com dengan menyebutkan posisi yang Anda minati." },
    ],
  },
};

// Accordion item, heading is clickable; explanation expands on click.
const AccordionItem = ({ h, p }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={"nt-acc" + (open ? " is-open" : "")}>
      <button className="nt-acc-head" onClick={() => setOpen((o) => !o)}>
        <span>{h}</span>
        <svg className="nt-acc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className="nt-acc-body"><p>{p}</p></div>
    </div>
  );
};

// ── Live app mockups ───────────────────────────────────────────────────────
// The Fitur pages show a carousel of the REAL app screens, rendered live and
// non-interactive, so visitors can preview each persona's UI without assets.
const DEVICE_DIM = {
  mobile:  { w: 360,  h: 780, s: 0.82 },
  desktop: { w: 1280, h: 800, s: 0.6 },
};

const FEATURE_MOCKUPS = {
  "app-pekerja": {
    device: "mobile",
    screens: [
      { label: "Readiness Pra-Shift", c: () => <WorkerReadiness /> },
      { label: "Live Monitoring",     c: () => <WorkerLive /> },
      { label: "Kondisi & Stres",     c: () => <WorkerWellness /> },
      { label: "Neurofeedback Audio", c: () => <WorkerAudio /> },
      { label: "Statistik Mingguan",  c: () => <WorkerStats /> },
      { label: "Profil & Pengaturan", c: () => <WorkerProfile /> },
    ],
  },
  "dashboard-supervisor": {
    device: "desktop",
    screens: [
      { label: "Overview Tim",   c: () => <SupervisorDashboard /> },
      { label: "Daftar Pekerja", c: () => <SupervisorWorkersList /> },
      { label: "Alert K3",       c: () => <SupervisorAlertsList /> },
      { label: "Jadwal Shift",   c: () => <SupervisorSchedule /> },
      { label: "Laporan SMK3",   c: () => <SupervisorReports /> },
    ],
  },
  "analitik-manajemen": {
    device: "desktop",
    screens: [
      { label: "Analitik Manajemen SMK3", c: () => <ManagementDashboard /> },
    ],
  },
};

const MOCK_ARROW = {
  width: 48, height: 48, borderRadius: "50%", flexShrink: 0, padding: 0,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "var(--nt-text)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

// Per-slide error boundary — a screen that fails to load shows a tidy
// placeholder instead of crashing the whole feature page.
class MockupBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error("[NeuroTech] mockup gagal dimuat:", err); }
  render() {
    if (this.state.failed) {
      return (
        <div style={{
          width: "100%", height: "100%", padding: 28, textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          background: "var(--nt-bg)",
        }}>
          <div style={{ fontSize: 30 }}>📱</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text-2)" }}>Layar belum tersedia</div>
          <div style={{ fontSize: 11, color: "var(--nt-text-3)", lineHeight: 1.5 }}>
            Muat ulang halaman dengan Ctrl+Shift+R untuk memuat layar terbaru.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Carousel of live, non-interactive app screens inside a device frame.
const MockupCarousel = ({ device, screens }) => {
  const [i, setI] = React.useState(0);
  const dim = DEVICE_DIM[device];
  const n = screens.length;
  const idx = Math.min(i, n - 1);
  const cur = screens[idx];
  const go = (d) => setI((x) => (x + d + n) % n);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ width: "100%", overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, width: "max-content", margin: "0 auto", padding: "6px 2px" }}>
          {n > 1 && (
            <button onClick={() => go(-1)} aria-label="Layar sebelumnya" style={MOCK_ARROW}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
          )}
          <div style={{ width: dim.w * dim.s, height: dim.h * dim.s, flexShrink: 0 }}>
            <div style={{
              width: dim.w, height: dim.h,
              transform: `scale(${dim.s})`, transformOrigin: "top left",
              pointerEvents: "none", userSelect: "none",
            }} aria-hidden="true">
              <div className={"app-frame app-frame--" + device}>
                <MockupBoundary key={idx}>
                  {cur.c()}
                </MockupBoundary>
              </div>
            </div>
          </div>
          {n > 1 && (
            <button onClick={() => go(1)} aria-label="Layar berikutnya" style={MOCK_ARROW}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)" }}>{cur.label}</div>
        {n > 1 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {screens.map((s, k) => (
              <button key={k} onClick={() => setI(k)} aria-label={s.label} style={{
                width: k === idx ? 24 : 8, height: 8, borderRadius: 999, border: "none", padding: 0,
                cursor: "pointer", transition: "width .2s, background .2s",
                background: k === idx ? "var(--nt-brand-gradient)" : "rgba(255,255,255,0.22)",
              }} />
            ))}
          </div>
        )}
        {n > 1 && (
          <div style={{ fontSize: 12, color: "var(--nt-text-3)", letterSpacing: "0.08em" }}>
            {idx + 1} / {n}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Team profile (About NeuroTech) ─────────────────────────────────────────
// ?v=2 → cache-buster; naikkan versinya tiap kali foto tim diperbarui.
const TEAM = {
  ceo: { name: "Danial Ghazi Arsyad",       role: "Chief Executive Officer",    img: "assets/team-ceo.png?v=2" },
  coo: { name: "Yamilla Kirana Paramita",   role: "Chief Operating Officer",    img: "assets/team-coo.png?v=2" },
  cro: { name: "Dinnar Ary Nastiti",        role: "Chief Relationship Officer", img: "assets/team-cro.png?v=2" },
  cmo: { name: "Nada Nadhifah",             role: "Chief Marketing Officer",    img: "assets/team-cmo.png?v=2" },
  cbo: { name: "Elviana Faza Al Fatah",     role: "Chief Business Officer",     img: "assets/team-cbo.png?v=2" },
  cto: { name: "Novan Gading Krisniawidhi", role: "Chief Technology Officer",   img: "assets/team-cto.png?v=2" },
  cfo: { name: "Emanuela Cherry",           role: "Chief Financial Officer",    img: "assets/team-cfo.png?v=2" },
};

const TEAM_CSS = `
.nt-team-row { display: flex; justify-content: center; gap: 22px; flex-wrap: wrap; }

.nt-team-card {
  width: 250px; max-width: 78vw;
  perspective: 1300px;
  cursor: pointer;
  transition: transform .25s cubic-bezier(.2,.7,.3,1);
}
.nt-team-card:hover { transform: translateY(-8px); }

.nt-team-inner {
  position: relative; width: 100%;
  aspect-ratio: 4 / 5;
  transform-style: preserve-3d;
  transition: transform .65s cubic-bezier(.2,.7,.3,1);
}
.nt-team-inner.is-flipped { transform: rotateY(180deg); }

.nt-team-face {
  position: absolute; inset: 0;
  border-radius: 20px; overflow: hidden;
  -webkit-backface-visibility: hidden; backface-visibility: hidden;
  box-shadow: 0 16px 40px rgba(6,12,34,0.55), 0 0 0 1px rgba(255,255,255,0.07);
}
.nt-team-front img { width: 100%; height: 100%; object-fit: cover; display: block; }

.nt-team-flip-ico {
  position: absolute; bottom: 12px; right: 12px;
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(10,18,42,0.7);
  display: flex; align-items: center; justify-content: center;
  color: #cfe3ff; box-shadow: 0 0 0 1px rgba(255,255,255,0.14);
}

.nt-team-back {
  transform: rotateY(180deg);
  background:
    radial-gradient(75% 55% at 50% 0%, rgba(78,195,224,0.20), transparent 70%),
    linear-gradient(165deg, #1a4a8e 0%, #0a1531 78%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 26px 20px;
}
.nt-team-badge {
  width: 66px; height: 66px; border-radius: 50%;
  background: linear-gradient(135deg, #6cb6f0, #9c8bf0);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 21px; font-weight: 800;
  box-shadow: 0 10px 24px rgba(108,182,240,0.5);
  margin-bottom: 16px;
}
.nt-team-name { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.01em; line-height: 1.3; }
.nt-team-divider { width: 34px; height: 3px; border-radius: 999px; background: linear-gradient(90deg,#4ec3e0,#9c8bf0); margin: 11px 0; }
.nt-team-role { font-size: 12.5px; font-weight: 600; color: #9fb6d8; letter-spacing: 0.03em; }
.nt-team-hint { margin-top: 16px; font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.42); }

@media (prefers-reduced-motion: reduce) { .nt-team-inner { transition: none; } }
`;

// Flip card — front shows the photo; click flips it to reveal name + position.
const TeamCard = ({ m }) => {
  const [flipped, setFlipped] = React.useState(false);
  const initials = m.name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="nt-team-card"
      onClick={() => setFlipped((f) => !f)}
      title={flipped ? "Klik untuk lihat foto" : "Klik untuk lihat nama & posisi"}
    >
      <div className={"nt-team-inner" + (flipped ? " is-flipped" : "")}>
        <div className="nt-team-face nt-team-front">
          <img
            src={m.img}
            alt={`${m.name} — ${m.role}`}
            loading="lazy"
          />
          <span className="nt-team-flip-ico">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
            </svg>
          </span>
        </div>
        <div className="nt-team-face nt-team-back">
          <div className="nt-team-badge">{initials}</div>
          <div className="nt-team-name">{m.name}</div>
          <div className="nt-team-divider" />
          <div className="nt-team-role">{m.role}</div>
          <div className="nt-team-hint">NeuroTech</div>
        </div>
      </div>
    </div>
  );
};

const TeamSection = () => (
  <section className="nt-landing-section">
    <style>{TEAM_CSS}</style>
    <Reveal>
      <div className="nt-eyebrow" style={{ textAlign: "center" }}>Profil Tim</div>
      <h2 className="nt-landing-h2">Tim di Balik NeuroTech</h2>
      <p className="nt-landing-sub" style={{ textAlign: "center", marginTop: 8 }}>
        Tim yang membangun dan menjalankan NeuroTech.
      </p>
    </Reveal>
    <Reveal delay={120} style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="nt-team-row">
        <TeamCard m={TEAM.ceo} />
      </div>
      <div className="nt-team-row">
        <TeamCard m={TEAM.coo} />
        <TeamCard m={TEAM.cro} />
        <TeamCard m={TEAM.cmo} />
      </div>
      <div className="nt-team-row">
        <TeamCard m={TEAM.cbo} />
        <TeamCard m={TEAM.cto} />
        <TeamCard m={TEAM.cfo} />
      </div>
    </Reveal>
  </section>
);

const ContentPage = ({ slug }) => {
  const page = CONTENT[slug];

  if (!page) {
    return (
      <div className="nt-landing">
        <LandingNav />
        <section className="nt-page-hero">
          <div className="nt-page-hero-inner">
            <div className="nt-eyebrow">404</div>
            <h1 className="nt-page-title">Halaman belum tersedia</h1>
            <p className="nt-page-intro">Konten untuk halaman ini sedang disiapkan.</p>
            <div style={{ marginTop: 24 }}>
              <NeuroBtn tone="primary" onClick={() => navigate("/landing")}>Kembali ke beranda</NeuroBtn>
            </div>
          </div>
        </section>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="nt-landing">
      <LandingNav />

      <section className="nt-page-hero">
        <span className="nt-landing-orb nt-landing-orb--a" />
        <div className="nt-page-hero-inner">
          <Reveal delay={0}><div className="nt-eyebrow">{page.cat}</div></Reveal>
          <Reveal delay={90}><h1 className="nt-page-title">{page.title}</h1></Reveal>
          <Reveal delay={170}><p className="nt-page-intro">{page.intro}</p></Reveal>
        </div>
      </section>

      {FEATURE_MOCKUPS[slug] && (
        <section className="nt-landing-section">
          <Reveal>
            <div className="nt-eyebrow" style={{ textAlign: "center" }}>Mockup Aplikasi</div>
            <h2 className="nt-landing-h2">Pratinjau {page.title}</h2>
            <p className="nt-landing-sub" style={{ textAlign: "center", marginTop: 8 }}>
              Klik panah untuk menelusuri tiap layar aplikasi.
            </p>
          </Reveal>
          <Reveal delay={120} style={{ marginTop: 30 }}>
            <MockupCarousel device={FEATURE_MOCKUPS[slug].device} screens={FEATURE_MOCKUPS[slug].screens} />
          </Reveal>
        </section>
      )}

      {slug === "about-neurotech" && <TeamSection />}

      {slug === "about-neurotech" && (
        <section className="nt-landing-section">
          <Reveal>
            <div className="nt-eyebrow" style={{ textAlign: "center" }}>Tentang Kami</div>
            <h2 className="nt-landing-h2">Visi &amp; Misi kami</h2>
          </Reveal>
          <Reveal delay={100}><VisiMisi /></Reveal>
        </section>
      )}

      {slug === "about-neurotech" && <CaraKerja />}

      <div className="nt-page-body">
        <Reveal>
          <div className="nt-page-hint">Klik tiap judul untuk membuka penjelasannya.</div>
        </Reveal>
        {page.sections.map((s, i) => (
          <Reveal key={i} delay={i * 70}>
            <AccordionItem h={s.h} p={s.p} />
          </Reveal>
        ))}
      </div>

      <section className="nt-landing-section">
        <Reveal>
          <div className="nt-landing-final">
            <div className="nt-landing-final-inner">
              <h2 className="nt-landing-h2" style={{ marginTop: 0 }}>Coba NeuroTech sekarang</h2>
              <p className="nt-landing-sub" style={{ marginTop: 12 }}>
                Buat akun untuk tim Anda, atau jelajahi dulu lewat mode demo.
              </p>
              <div className="nt-landing-cta">
                <NeuroBtn tone="primary" size="lg" onClick={() => navigate("/join")}>
                  Bergabung
                </NeuroBtn>
                <NeuroBtn tone="default" size="lg"
                  onClick={() => { sessionStorage.setItem("nt-demo", "1"); navigate("/w/readiness"); }}>
                  Coba demo →
                </NeuroBtn>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <LandingFooter />
    </div>
  );
};

Object.assign(window, { CONTENT, AccordionItem, ContentPage });
