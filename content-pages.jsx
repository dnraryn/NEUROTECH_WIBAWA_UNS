// Content/marketing pages — every navbar & footer link resolves here via
// /p/<slug>. ContentPage reuses LandingNav + LandingFooter for a consistent
// shell. Keys must match slugify(label) of the link that points to them.

const CONTENT = {
  "pemantauan-fatigue": {
    cat: "Solusi", title: "Pemantauan Fatigue",
    intro: "Kelelahan mental sering tidak terasa sampai terlambat. NeuroTech mengukurnya secara objektif dari sinyal otak, secara real-time.",
    sections: [
      { h: "Apa itu Fatigue Index", p: "Fatigue Index (FI) adalah skor 0–100 yang dihitung dari pola gelombang EEG — terutama rasio theta/beta yang meningkat saat otak lelah. Semakin tinggi FI, semakin besar risiko penurunan kewaspadaan." },
      { h: "Dipantau sepanjang shift", p: "Headband Muse merekam aktivitas otak setiap detik. NeuroTech memproses sinyal itu menjadi tren FI yang bisa dilihat pekerja maupun supervisor tanpa jeda." },
      { h: "Bukan untuk menghukum", p: "Data fatigue dipakai untuk pencegahan, bukan sanksi. Tujuannya membantu pekerja beristirahat tepat waktu dan menata ulang jadwal sebelum kelelahan jadi insiden." },
    ],
  },
  "beban-kognitif": {
    cat: "Solusi", title: "Beban Kognitif",
    intro: "Otak punya kapasitas terbatas. Saat beban kognitif terlalu tinggi dalam waktu lama, kesalahan kerja meningkat tajam.",
    sections: [
      { h: "Cognitive Load Index", p: "CLI mengukur seberapa keras otak bekerja dari aktivitas gelombang di area frontal. NeuroTech menandai saat CLI melewati ambang berisiko." },
      { h: "Deteksi overload dini", p: "Sistem memberi tahu ketika beban kognitif tinggi bertahan lama — misalnya 18 menit terus-menerus — sehingga tugas bisa dijeda atau dirotasi." },
      { h: "Desain shift lebih sehat", p: "Pola CLI agregat membantu manajemen menata beban tugas, durasi shift, dan waktu istirahat berdasarkan data, bukan tebakan." },
    ],
  },
  "kesiapan-pra-shift": {
    cat: "Solusi", title: "Kesiapan Pra-Shift",
    intro: "Kondisi pekerja sebelum shift dimulai sangat menentukan risiko sepanjang hari. NeuroTech menilainya lebih dulu.",
    sections: [
      { h: "Skor Readiness", p: "Sebelum shift, NeuroTech menggabungkan data tidur dan baseline EEG menjadi skor readiness 0–100. Skor di bawah ambang menandakan pekerja belum siap penuh." },
      { h: "Data tidur terintegrasi", p: "Muse S dapat merekam tidur malam sebelumnya. Durasi dan kualitas tidur menjadi masukan utama skor kesiapan." },
      { h: "Keputusan penempatan", p: "Supervisor bisa memakai skor readiness untuk menyesuaikan tugas — menempatkan pekerja dengan skor rendah pada peran berisiko lebih kecil." },
    ],
  },
  "deteksi-microsleep": {
    cat: "Solusi", title: "Deteksi Microsleep",
    intro: "Microsleep — tertidur 1–10 detik tanpa sadar — adalah salah satu penyebab kecelakaan kerja paling berbahaya.",
    sections: [
      { h: "Tanda yang ditangkap", p: "NeuroTech mendeteksi microsleep dari kombinasi anggukan kepala, penurunan tajam Engagement Index, dan pola EEG khas mengantuk." },
      { h: "Peringatan seketika", p: "Saat microsleep terdeteksi, alert kritis langsung dikirim ke pekerja dan supervisor agar tindakan cepat bisa diambil." },
      { h: "Mencegah pengulangan", p: "Setiap kejadian dicatat sehingga pola berulang — misalnya selalu pada jam tertentu — bisa dikenali dan dicegah." },
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
    intro: "Aplikasi mobile untuk pekerja — memantau kondisi otak sendiri secara pribadi.",
    sections: [
      { h: "Readiness & Live", p: "Pekerja melihat skor kesiapan pra-shift dan kondisi fatigue serta cognitive load secara live selama bekerja." },
      { h: "Tren tidur & statistik", p: "Riwayat tidur dan statistik mingguan membantu pekerja memahami pola dirinya sendiri dari waktu ke waktu." },
      { h: "Privasi penuh", p: "Data detail individu hanya bisa dilihat oleh pekerja yang bersangkutan. Supervisor hanya melihat status ringkas." },
    ],
  },
  "dashboard-supervisor": {
    cat: "Fitur", title: "Dashboard Supervisor",
    intro: "Pusat kendali K3 untuk supervisor — seluruh tim dalam satu layar.",
    sections: [
      { h: "Overview tim real-time", p: "Lihat siapa yang berstatus normal, waspada, berisiko, atau kritis secara langsung, lengkap dengan feed alert terbaru." },
      { h: "Alert & jadwal", p: "Kelola alert microsleep dan fatigue, serta atur jadwal shift berdasarkan kondisi aktual pekerja." },
      { h: "Laporan siap pakai", p: "Hasilkan laporan periodik tim untuk kebutuhan evaluasi dan audit K3." },
    ],
  },
  "analitik-manajemen": {
    cat: "Fitur", title: "Analitik Manajemen",
    intro: "Pandangan agregat untuk manajemen SMK3 — fokus pada tren, bukan individu.",
    sections: [
      { h: "Tren agregat", p: "Lihat perkembangan fatigue, beban kognitif, dan insiden di tingkat departemen maupun perusahaan." },
      { h: "Skor K3 & dampak intervensi", p: "Pantau skor keselamatan dari waktu ke waktu dan ukur dampak setiap kebijakan yang diterapkan." },
      { h: "Dasar keputusan kebijakan", p: "Data agregat membantu manajemen mengambil keputusan soal jam kerja, rotasi tugas, dan program kesehatan." },
    ],
  },
  "alert-real-time": {
    cat: "Fitur", title: "Alert Real-time",
    intro: "Peringatan yang muncul tepat saat dibutuhkan — bukan setelah semuanya terlambat.",
    sections: [
      { h: "Ambang otomatis", p: "NeuroTech memantau setiap indeks terhadap ambang risiko dan memicu alert begitu kondisi terlewati." },
      { h: "Tingkat keparahan", p: "Alert dikelompokkan menjadi waspada, berisiko, dan kritis — sehingga respons bisa diprioritaskan." },
      { h: "Sampai ke orang yang tepat", p: "Notifikasi dikirim ke pekerja terkait dan supervisornya secara bersamaan." },
    ],
  },
  "muse-2": {
    cat: "Perangkat", title: "Muse 2",
    intro: "Headband EEG ringkas yang dipakai NeuroTech untuk pemantauan saat shift.",
    sections: [
      { h: "Sensor EEG multi-titik", p: "Muse 2 merekam aktivitas otak melalui beberapa sensor di dahi dan belakang telinga, cukup untuk menghitung indeks fatigue dan cognitive load." },
      { h: "Nyaman untuk kerja", p: "Bentuknya ringan dan nirkabel, sehingga bisa dipakai sepanjang shift tanpa mengganggu aktivitas." },
      { h: "Koneksi nirkabel", p: "Data dikirim via Bluetooth ke aplikasi NeuroTech secara real-time." },
    ],
  },
  "muse-s": {
    cat: "Perangkat", title: "Muse S",
    intro: "Versi headband berbahan kain — nyaman dipakai termasuk saat tidur.",
    sections: [
      { h: "Pemantauan tidur", p: "Muse S dirancang nyaman dipakai tidur, sehingga bisa merekam kualitas tidur pra-shift yang menjadi dasar skor readiness." },
      { h: "Sama andal untuk shift", p: "Selama shift, Muse S berfungsi sama seperti Muse 2 untuk memantau fatigue dan cognitive load." },
      { h: "Baterai tahan lama", p: "Daya tahannya cukup untuk merekam tidur semalaman penuh tanpa perlu diisi ulang." },
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
      { h: "1. Buat akun", p: "Daftar dengan email dan pilih peran Anda — Pekerja, Supervisor, atau Manajemen." },
      { h: "2. Hubungkan headband", p: "Pasangkan Muse 2 atau Muse S, lalu lakukan kalibrasi baseline singkat." },
      { h: "3. Mulai shift", p: "Cek skor readiness Anda, lalu pantau kondisi otak secara live sepanjang shift." },
    ],
  },
  "faq": {
    cat: "Dukungan", title: "Pertanyaan Umum (FAQ)",
    intro: "Pertanyaan yang paling sering diajukan tentang NeuroTech.",
    sections: [
      { h: "Apakah data saya aman?", p: "Ya. Data EEG individu bersifat privat dan hanya bisa diakses oleh pemiliknya. Supervisor hanya melihat status ringkas." },
      { h: "Apakah dipakai untuk menghukum?", p: "Tidak. NeuroTech menganut kebijakan non-punitif — data dipakai untuk pencegahan dan perbaikan, bukan sanksi." },
      { h: "Apakah headband mengganggu kerja?", p: "Tidak. Headband Muse ringan dan nirkabel, dirancang untuk dipakai nyaman sepanjang shift." },
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
      { h: "Email", p: "Kirim pertanyaan ke support@neurotech.id dan tim kami akan membalas pada hari kerja." },
      { h: "Dukungan teknis", p: "Untuk kendala perangkat atau aplikasi, sertakan detail perangkat dan tangkapan layar agar penanganan lebih cepat." },
      { h: "Kerja sama", p: "Untuk kemitraan atau implementasi skala perusahaan, hubungi kami lewat email yang sama dengan subjek \"Kerja sama\"." },
    ],
  },
  "status-sistem": {
    cat: "Dukungan", title: "Status Sistem",
    intro: "Pantau ketersediaan layanan NeuroTech.",
    sections: [
      { h: "Layanan aplikasi — Normal", p: "Aplikasi web dan mobile NeuroTech beroperasi normal tanpa gangguan." },
      { h: "Sinkronisasi data — Normal", p: "Layanan perekaman dan sinkronisasi data EEG beroperasi normal." },
      { h: "Pemeliharaan terjadwal", p: "Pemeliharaan sistem, bila ada, akan diumumkan lebih dulu di halaman ini." },
    ],
  },
  "tentang-neurotech": {
    cat: "Perusahaan", title: "Tentang NeuroTech",
    intro: "NeuroTech lahir dari satu keyakinan: kecelakaan kerja akibat kelelahan bisa dicegah.",
    sections: [
      { h: "Misi kami", p: "Membantu perusahaan melindungi pekerja dengan mendeteksi kelelahan mental sebelum berubah menjadi insiden." },
      { h: "Teknologi", p: "NeuroTech memadukan headband EEG Muse, pemrosesan sinyal real-time, dan analitik K3 dalam satu sistem terpadu." },
      { h: "Nilai kami", p: "Kami menjunjung privasi pekerja dan pendekatan non-punitif — teknologi untuk melindungi, bukan mengawasi." },
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
      { h: "Cara melamar", p: "Kirim CV dan portofolio ke karir@neurotech.id dengan menyebutkan posisi yang Anda minati." },
    ],
  },
};

const ContentPage = ({ slug }) => {
  const page = CONTENT[slug];

  // Reset scroll to top whenever the page changes.
  React.useEffect(() => {
    const stage = document.querySelector(".app-stage");
    if (stage) stage.scrollTop = 0;
  }, [slug]);

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

      <div className="nt-page-body">
        {page.sections.map((s, i) => (
          <Reveal key={i} delay={i * 80}>
            <article className="nt-page-section">
              <h2 className="nt-page-h2">{s.h}</h2>
              <p className="nt-page-p">{s.p}</p>
            </article>
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
                <NeuroBtn tone="primary" size="lg"
                  onClick={() => { sessionStorage.setItem("nt-auth-mode", "register"); navigate("/login"); }}>
                  Buat akun
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

Object.assign(window, { CONTENT, ContentPage });
