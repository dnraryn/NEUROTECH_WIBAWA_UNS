// Kriteria Audit SMK3 — Lampiran II PP No. 50 Tahun 2012 (Pedoman Penilaian Penerapan SMK3).
// Diekstrak otomatis dari dokumen resmi JDIH Kemnaker (PPNOMOR50_TAHUN_2012.pdf).
// 12 elemen, 166 kriteria. level = tingkat pertama kriteria wajib dinilai:
//   awal (64 kriteria) · transisi (+58 = 122) · lanjutan (+44 = 166).
// Catatan: dokumen resmi memuat salah ketik "5..2.1" pada Tabel 1; di sini dinormalisasi menjadi 5.2.1.
export const AUDIT_ELEMENTS = [
 {
  "no": 1,
  "title": "Pembangunan dan Pemeliharaan Komitmen",
  "subs": [
   {
    "id": "1.1",
    "title": "Kebijakan K3",
    "criteria": [
     {
      "id": "1.1.1",
      "text": "Terdapat kebijakan K3 yang tertulis, bertanggal, ditandatangani oleh pengusaha atau pengurus, secara jelas menyatakan tujuan dan sasaran K3 serta komitmen terhadap peningkatan K3.",
      "level": "awal"
     },
     {
      "id": "1.1.2",
      "text": "Kebijakan disusun oleh pengusaha dan/atau pengurus setelah melalui proses konsultasi dengan wakil tenaga kerja.",
      "level": "transisi"
     },
     {
      "id": "1.1.3",
      "text": "Perusahaan mengkomunikasikan kebijakan K3 kepada seluruh tenaga kerja, tamu, kontraktor, pelanggan, dan pemasok dengan tata cara yang tepat.",
      "level": "awal"
     },
     {
      "id": "1.1.4",
      "text": "Kebijakan khusus dibuat untuk masalah K3 yang bersifat khusus.",
      "level": "lanjutan"
     },
     {
      "id": "1.1.5",
      "text": "Kebijakan K3 dan kebijakan khusus lainnya ditinjau ulang secara berkala untuk menjamin bahwa kebijakan tersebut sesuai dengan perubahan yang terjadi dalam perusahaan dan dalam peraturan perundang-undangan.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "1.2",
    "title": "Tanggung Jawab dan Wewenang Untuk Bertindak",
    "criteria": [
     {
      "id": "1.2.1",
      "text": "Tanggung jawab dan wewenang untuk mengambil tindakan dan melaporkan kepada semua pihak yang terkait dalam perusahaan di bidang K3 telah ditetapkan, diinformasikan dan didokumentasikan.",
      "level": "transisi"
     },
     {
      "id": "1.2.2",
      "text": "Penunjukan penanggung jawab K3 harus sesuai peraturan perundang-undangan.",
      "level": "awal"
     },
     {
      "id": "1.2.3",
      "text": "Pimpinan unit kerja dalam suatu perusahaan bertanggung jawab atas kinerja K3 pada unit kerjanya.",
      "level": "transisi"
     },
     {
      "id": "1.2.4",
      "text": "Pengusaha atau pengurus bertanggung jawab secara penuh untuk menjamin pelaksanaan SMK3.",
      "level": "awal"
     },
     {
      "id": "1.2.5",
      "text": "Petugas yang bertanggung jawab untuk penanganan keadaan darurat telah ditetapkan dan mendapatkan pelatihan.",
      "level": "awal"
     },
     {
      "id": "1.2.6",
      "text": "Perusahaan mendapatkan saran-saran dari para ahli di bidang K3 yang berasal dari dalam dan/atau luar perusahaan.",
      "level": "awal"
     },
     {
      "id": "1.2.7",
      "text": "Kinerja K3 termuat dalam laporan tahunan perusahaan atau laporan lain yang setingkat.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "1.3",
    "title": "Tinjauan dan Evaluasi",
    "criteria": [
     {
      "id": "1.3.1",
      "text": "Tinjauan terhadap penerapan SMK3 meliputi kebijakan, perencanaan, pelaksanaan, pemantauan dan evaluasi telah dilakukan, dicatat dan didokumentasikan.",
      "level": "transisi"
     },
     {
      "id": "1.3.2",
      "text": "Hasil tinjauan dimasukkan dalam perencanaan tindakan manajemen.",
      "level": "lanjutan"
     },
     {
      "id": "1.3.3",
      "text": "Pengurus harus meninjau ulang pelaksanaan SMK3 secara berkala untuk menilai kesesuaian dan efektivitas SMK3.",
      "level": "awal"
     }
    ]
   },
   {
    "id": "1.4",
    "title": "Keterlibatan dan Konsultasi dengan Tenaga Kerja",
    "criteria": [
     {
      "id": "1.4.1",
      "text": "Keterlibatan dan penjadwalan konsultasi tenaga kerja dengan wakil perusahaan didokumentasikan dan disebarluaskan ke seluruh tenaga kerja.",
      "level": "awal"
     },
     {
      "id": "1.4.2",
      "text": "Terdapat prosedur yang memudahkan konsultasi mengenai perubahan-perubahan yang mempunyai implikasi terhadap K3.",
      "level": "transisi"
     },
     {
      "id": "1.4.3",
      "text": "Perusahaan telah membentuk P2K3 Sesuai dengan peraturan perundang-undangan.",
      "level": "awal"
     },
     {
      "id": "1.4.4",
      "text": "Ketua P2K3 adalah pimpinan puncak atau pengurus.",
      "level": "awal"
     },
     {
      "id": "1.4.5",
      "text": "Sekretaris P2K3 adalah ahli K3 sesuai dengan peraturan perundang-undangan.",
      "level": "awal"
     },
     {
      "id": "1.4.6",
      "text": "P2K3 menitikberatkan kegiatan pada pengembangan kebijakan dan prosedur mengendalikan risiko.",
      "level": "awal"
     },
     {
      "id": "1.4.7",
      "text": "Susunan pengurus P2K3 didokumentasikan dan diinformasikan kepada tenaga kerja.",
      "level": "awal"
     },
     {
      "id": "1.4.8",
      "text": "P2K3 mengadakan pertemuan secara teratur dan hasilnya disebarluaskan di tempat kerja.",
      "level": "awal"
     },
     {
      "id": "1.4.9",
      "text": "P2K3 melaporkan kegiatannya secara teratur sesuai dengan peraturan perundang-undangan.",
      "level": "awal"
     },
     {
      "id": "1.4.10",
      "text": "Dibentuk kelompok-kelompok kerja dan dipilih dari wakil-wakil tenaga kerja yang ditunjuk sebagai penanggung jawab K3 di tempat kerjanya dan kepadanya diberikan pelatihan sesuai dengan peraturan perundang-undangan.",
      "level": "lanjutan"
     },
     {
      "id": "1.4.11",
      "text": "Susunan kelompok-kelompok kerja yang telah terbentuk didokumentasikan dan diinformasikan kepada tenaga kerja.",
      "level": "lanjutan"
     }
    ]
   }
  ]
 },
 {
  "no": 2,
  "title": "Pembuatan dan Pendokumentasian Rencana K3",
  "subs": [
   {
    "id": "2.1",
    "title": "Rencana strategi K3",
    "criteria": [
     {
      "id": "2.1.1",
      "text": "Terdapat prosedur terdokumentasi untuk identifikasi potensi bahaya, penilaian, dan pengendalian risiko K3.",
      "level": "awal"
     },
     {
      "id": "2.1.2",
      "text": "Identifikasi potensi bahaya, penilaian, dan pengendalian risiko K3 sebagai rencana strategi K3 dilakukan oleh petugas yang berkompeten.",
      "level": "transisi"
     },
     {
      "id": "2.1.3",
      "text": "Rencana strategi K3 sekurang-kurangya berdasarkan tinjauan awal, identifikasi potensi bahaya, penilaian, pengendalian risiko, dan peraturan perundang-undangan serta informasi K3 lain baik dari dalam maupun luar perusahaan.",
      "level": "transisi"
     },
     {
      "id": "2.1.4",
      "text": "Rencana strategi K3 yang telah ditetapkan digunakan untuk mengendalikan risiko K3 dengan menetapkan tujuan dan sasaran yang dapat diukur dan menjadi prioritas serta menyediakan sumber daya.",
      "level": "transisi"
     },
     {
      "id": "2.1.5",
      "text": "Rencana kerja dan rencana khusus yang berkaitan dengan produk, proses, proyek atau tempat kerja tertentu telah dibuat dengan menetapkan tujuan dan sasaran yang dapat diukur, menetapkan waktu pencapaian dan menyediakan sumber daya.",
      "level": "lanjutan"
     },
     {
      "id": "2.1.6",
      "text": "Rencana K3 diselaraskan dengan rencana sistem manajemen perusahaan.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "2.2",
    "title": "Manual SMK3",
    "criteria": [
     {
      "id": "2.2.1",
      "text": "Manual SMK3 meliputi kebijakan, tujuan, rencana, prosedur K3, instruksi kerja, formulir, catatan dan tanggung jawab serta wewenang tanggung jawab K3 untuk semua tingkatan dalam perusahaan.",
      "level": "transisi"
     },
     {
      "id": "2.2.2",
      "text": "Terdapat manual khusus yang berkaitan dengan produk, proses, atau tempat kerja tertentu.",
      "level": "lanjutan"
     },
     {
      "id": "2.2.3",
      "text": "Manual SMK3 mudah didapat oleh semua personil dalam perusahaan sesuai kebutuhan.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "2.3",
    "title": "Peraturan perundangan dan persyaratan lain dibidang K3",
    "criteria": [
     {
      "id": "2.3.1",
      "text": "Terdapat prosedur yang terdokumentasi untuk mengidentifikasi, memperoleh, memelihara dan memahami peraturan perundang-undangan, standar, pedoman teknis, dan persyaratan lain yang relevan dibidang K3 untuk seluruh tenaga kerja di perusahaan.",
      "level": "transisi"
     },
     {
      "id": "2.3.2",
      "text": "Penanggung jawab untuk memelihara dan mendistribusikan informasi terbaru mengenai peraturan perundangan, standar, pedoman teknis, dan persyaratan lain telah ditetapkan",
      "level": "transisi"
     },
     {
      "id": "2.3.3",
      "text": "Persyaratan pada peraturan perundang-undangan, standar, pedoman teknis, dan persyaratan lain yang relevan di bidang K3 dimasukkan pada prosedur-prosedur dan petunjuk-petunjuk kerja.",
      "level": "lanjutan"
     },
     {
      "id": "2.3.4",
      "text": "Perubahan pada peraturan perundang-undangan, standar, pedoman teknis, dan persyaratan lain yang relevan di bidang K3 digunakan untuk peninjauan prosedur-prosedur dan petunjuk-petunjuk kerja.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "2.4",
    "title": "Informasi K3",
    "criteria": [
     {
      "id": "2.4.1",
      "text": "Informasi yang dibutuhkan mengenai kegiatan K3 disebarluaskan secara sistematis kepada seluruh tenaga kerja, tamu, kontraktor, pelanggan, dan pemasok.",
      "level": "awal"
     }
    ]
   }
  ]
 },
 {
  "no": 3,
  "title": "Pengendalian Perancangan dan Peninjauan Kontrak",
  "subs": [
   {
    "id": "3.1",
    "title": "Pengendalian Perancangan",
    "criteria": [
     {
      "id": "3.1.1",
      "text": "Prosedur yang terdokumentasi mempertimbangkan identifikasi potensi bahaya, penilaian, dan pengendalian risiko yang dilakukan pada tahap perancangan dan modifikasi.",
      "level": "awal"
     },
     {
      "id": "3.1.2",
      "text": "Prosedur, instruksi kerja dalam penggunaan produk, pengoperasian mesin dan peralatan, instalasi, pesawat atau proses serta informasi lainnya yang berkaitan dengan K3 telah dikembangkan selama perancangan dan/atau modifikasi.",
      "level": "transisi"
     },
     {
      "id": "3.1.3",
      "text": "Petugas yang berkompeten melakukan verifikasi bahwa perancangan dan/atau modifikasi memenuhi persyaratan K3 yang ditetapkan sebelum penggunaan hasil rancangan.",
      "level": "transisi"
     },
     {
      "id": "3.1.4",
      "text": "Semua perubahan dan modifikasi perancangan yang mempunyai implikasi terhadap K3 diidentifikasikan, didokumentasikan, ditinjau ulang dan disetujui oleh petugas yang berwenang sebelum pelaksanaan.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "3.2",
    "title": "Peninjauan Kontrak",
    "criteria": [
     {
      "id": "3.2.1",
      "text": "Prosedur yang terdokumentasi harus mampu mengidentifikasi bahaya dan menilai risiko K3 bagi tenaga kerja, lingkungan, dan masyarakat, dimana prosedur tersebut digunakan pada saat memasok barang dan jasa dalam suatu kontrak.",
      "level": "transisi"
     },
     {
      "id": "3.2.2",
      "text": "Identifikasi bahaya dan penilaian risiko dilakukan pada tinjauan kontrak oleh petugas yang berkompeten.",
      "level": "awal"
     },
     {
      "id": "3.2.3",
      "text": "Kontrak ditinjau ulang untuk menjamin bahwa pemasok dapat memenuhi persyaratan K3 bagi pelanggan.",
      "level": "lanjutan"
     },
     {
      "id": "3.2.4",
      "text": "Catatan tinjauan kontrak dipelihara dan didokumentasikan.",
      "level": "lanjutan"
     }
    ]
   }
  ]
 },
 {
  "no": 4,
  "title": "Pengendalian Dokumen",
  "subs": [
   {
    "id": "4.1",
    "title": "Persetujuan, Pengeluaran dan Pengendalian Dokumen",
    "criteria": [
     {
      "id": "4.1.1",
      "text": "Dokumen K3 mempunyai identifikasi status, wewenang, tanggal pengeluaran dan tanggal modifikasi.",
      "level": "awal"
     },
     {
      "id": "4.1.2",
      "text": "Penerima distribusi dokumen tercantum dalam dokumen tersebut.",
      "level": "transisi"
     },
     {
      "id": "4.1.3",
      "text": "Dokumen K3 edisi terbaru disimpan secara sistematis pada tempat yang ditentukan.",
      "level": "lanjutan"
     },
     {
      "id": "4.1.4",
      "text": "Dokumen usang segera disingkirkan dari penggunaannya sedangkan dokumen usang yang disimpan untuk keperluan tertentu diberi tanda khusus.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "4.2",
    "title": "Perubahan dan Modifikasi Dokumen",
    "criteria": [
     {
      "id": "4.2.1",
      "text": "Terdapat sistem untuk membuat, menyetujui perubahan terhadap dokumen K3.",
      "level": "transisi"
     },
     {
      "id": "4.2.2",
      "text": "Dalam hal terjadi perubahan diberikan alasan terjadinya perubahan dan tertera dalam dokumen atau lampirannya dan menginformasikan kepada pihak terkait.",
      "level": "lanjutan"
     },
     {
      "id": "4.2.3",
      "text": "Terdapat prosedur pengendalian dokumen atau daftar seluruh dokumen yang mencantumkan status dari setiap dokumen tersebut, dalam upaya mencegah penggunaan dokumen yang usang.",
      "level": "lanjutan"
     }
    ]
   }
  ]
 },
 {
  "no": 5,
  "title": "Pembelian dan Pengendalian Produk",
  "subs": [
   {
    "id": "5.1",
    "title": "Spesifikasi Pembelian Barang dan Jasa",
    "criteria": [
     {
      "id": "5.1.1",
      "text": "Terdapat prosedur yang terdokumentasi yang dapat menjamin bahwa spesifikasi teknik dan informasi lain yang relevan dengan K3 telah diperiksa sebelum keputusan untuk membeli.",
      "level": "awal"
     },
     {
      "id": "5.1.2",
      "text": "Spesifikasi pembelian untuk setiap sarana produksi, zat kimia atau jasa harus dilengkapi spesifikasi yang sesuai dengan persyaratan peraturan perundang-undangan dan standar K3.",
      "level": "awal"
     },
     {
      "id": "5.1.3",
      "text": "Konsultasi dengan tenaga kerja yang kompeten pada saat keputusan pembelian, dilakukan untuk menetapkan persyaratan K3 yang dicantumkan dalam spesifikasi pembelian dan diinformasikan kepada tenaga kerja yang menggunakannya.",
      "level": "transisi"
     },
     {
      "id": "5.1.4",
      "text": "Kebutuhan pelatihan, pasokan alat pelindung diri dan perubahan terhadap prosedur kerja harus dipertimbangkan sebelum pembelian dan penggunaannya.",
      "level": "lanjutan"
     },
     {
      "id": "5.1.5",
      "text": "Persyaratan K3 dievaluasi dan menjadi pertimbangan dalam seleksi pembelian.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "5.2",
    "title": "Sistem Verifikasi Barang dan Jasa Yang Telah Dibeli",
    "criteria": [
     {
      "id": "5.2.1",
      "text": "Barang dan jasa yang dibeli diperiksa kesesuaiannya dengan spesifikasi pembelian.",
      "level": "awal"
     }
    ]
   },
   {
    "id": "5.3",
    "title": "Pengendalian Barang dan Jasa Yang Dipasok Pelanggan",
    "criteria": [
     {
      "id": "5.3.1",
      "text": "Barang dan jasa yang dipasok pelanggan, sebelum digunakan terlebih dahulu diidentifikasi potensi bahaya dan dinilai risikonya dan catatan tersebut dipelihara untuk memeriksa prosedur.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "5.4",
    "title": "Kemampuan Telusur Produk",
    "criteria": [
     {
      "id": "5.4.1",
      "text": "Semua produk yang digunakan dalam proses produksi dapat diidentifikasi di seluruh tahapan produksi dan instalasi, jika terdapat potensi masalah K3.",
      "level": "lanjutan"
     },
     {
      "id": "5.4.2",
      "text": "Terdapat prosedur yang terdokumentasi untuk penelusuran produk yang telah terjual, jika terdapat potensi masalah K3 di dalam penggunaannya.",
      "level": "lanjutan"
     }
    ]
   }
  ]
 },
 {
  "no": 6,
  "title": "Keamanan Bekerja Berdasarkan SMK3",
  "subs": [
   {
    "id": "6.1",
    "title": "Sistem Kerja",
    "criteria": [
     {
      "id": "6.1.1",
      "text": "Petugas yang kompeten telah mengidentifikasi bahaya, menilai dan mengendalikan risiko yang timbul dari suatu proses kerja.",
      "level": "awal"
     },
     {
      "id": "6.1.2",
      "text": "Apabila upaya pengendalian risiko diperlukan, maka upaya tersebut ditetapkan melalui tingkat pengendalian.",
      "level": "transisi"
     },
     {
      "id": "6.1.3",
      "text": "Terdapat prosedur atau petunjuk kerja yang terdokumentasi untuk mengendalikan risiko yang teridentifikasi dan dibuat atas dasar masukan dari personil yang kompeten serta tenaga kerja yang terkait dan disahkan oleh orang yang berwenang di perusahaan.",
      "level": "transisi"
     },
     {
      "id": "6.1.4",
      "text": "Kepatuhan terhadap peraturan perundang-undangan, standar serta pedoman teknis yang relevan diperhatikan pada saat mengembangkan atau melakukan modifikasi atau petunjuk kerja.",
      "level": "transisi"
     },
     {
      "id": "6.1.5",
      "text": "Terdapat sistem izin kerja untuk tugas berisiko tinggi.",
      "level": "awal"
     },
     {
      "id": "6.1.6",
      "text": "Alat pelindung diri disediakan sesuai kebutuhan dan digunakan secara benar serta selalu dipelihara dalam kondisi layak pakai.",
      "level": "awal"
     },
     {
      "id": "6.1.7",
      "text": "Alat pelindung diri yang digunakan dipastikan telah dinyatakan layak pakai sesuai dengan standar dan/atau peraturan perundang-undangan yang berlaku.",
      "level": "awal"
     },
     {
      "id": "6.1.8",
      "text": "Upaya pengendalian risiko dievaluasi secara berkala apabila terjadi ketidaksesuaian atau perubahan pada proses kerja.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "6.2",
    "title": "Pengawasan",
    "criteria": [
     {
      "id": "6.2.1",
      "text": "Dilakukan pengawasan untuk menjamin bahwa setiap pekerjaan dilaksanakan dengan aman dan mengikuti prosedur dan petunjuk kerja yang telah ditentukan.",
      "level": "awal"
     },
     {
      "id": "6.2.2",
      "text": "Setiap orang diawasi sesuai dengan tingkat kemampuan dan tingkat risiko tugas.",
      "level": "transisi"
     },
     {
      "id": "6.2.3",
      "text": "Pengawas/penyelia ikut serta dalam identifikasi bahaya dan membuat upaya pengendalian.",
      "level": "transisi"
     },
     {
      "id": "6.2.4",
      "text": "Pengawas/penyelia diikutsertakan dalam melakukan penyelidikan dan pembuatan laporan terhadap terjadinya kecelakaan dan penyakit akibat kerja serta wajib menyerahkan laporan dan saran-saran kepada pengusaha atau pengurus.",
      "level": "transisi"
     },
     {
      "id": "6.2.5",
      "text": "Pengawas/penyelia ikut serta dalam proses konsultasi.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "6.3",
    "title": "Seleksi dan Penempatan Personil",
    "criteria": [
     {
      "id": "6.3.1",
      "text": "Persyaratan tugas tertentu termasuk persyaratan kesehatan diidentifikasi dan dipakai untuk menyeleksi dan menempatkan tenaga kerja.",
      "level": "awal"
     },
     {
      "id": "6.3.2",
      "text": "Penugasan pekerjaan harus berdasarkan kemampuan dan keterampilan serta kewenangan yang dimiliki.",
      "level": "awal"
     }
    ]
   },
   {
    "id": "6.4",
    "title": "Area Terbatas",
    "criteria": [
     {
      "id": "6.4.1",
      "text": "Pengusaha atau pengurus melakukan penilaian risiko lingkungan kerja untuk mengetahui daerah-daerah yang memerlukan pembatasan izin masuk.",
      "level": "awal"
     },
     {
      "id": "6.4.2",
      "text": "Terdapat pengendalian atas daerah/tempat dengan pembatasan izin masuk.",
      "level": "awal"
     },
     {
      "id": "6.4.3",
      "text": "Tersedianya fasilitas dan layanan di tempat kerja sesuai dengan standar dan pedoman teknis.",
      "level": "awal"
     },
     {
      "id": "6.4.4",
      "text": "Rambu-rambu K3 harus dipasang sesuai dengan standar dan pedoman teknis.",
      "level": "awal"
     }
    ]
   },
   {
    "id": "6.5",
    "title": "Pemeliharaan, Perbaikan, dan Perubahan Sarana Produksi",
    "criteria": [
     {
      "id": "6.5.1",
      "text": "Penjadualan pemeriksaan dan pemeliharaan sarana produksi serta peralatan mencakup verifikasi alat-alat pengaman serta persyaratan yang ditetapkan oleh peraturan perundang-undangan, standar dan pedoman teknis yang relevan.",
      "level": "transisi"
     },
     {
      "id": "6.5.2",
      "text": "Semua catatan yang memuat data secara rinci dari kegiatan pemeriksaan, pemeliharaan, perbaikan dan perubahan yang dilakukan atas sarana dan peralatan produksi harus disimpan dan dipelihara.",
      "level": "awal"
     },
     {
      "id": "6.5.3",
      "text": "Sarana dan peralatan produksi memiliki sertifikat yang masih berlaku sesuai dengan persyaratan peraturan perundang-undangan dan standar.",
      "level": "awal"
     },
     {
      "id": "6.5.4",
      "text": "Pemeriksaan, pemeliharaan, perawatan, perbaikan dan setiap perubahan harus dilakukan petugas yang kompeten dan berwenang.",
      "level": "awal"
     },
     {
      "id": "6.5.5",
      "text": "Terdapat prosedur untuk menjamin bahwa Jika terjadi perubahan terhadap sarana dan peralatan produksi, perubahan tersebut harus sesuai dengan persyaratan peraturan perundang-undangan, standar dan pedoman teknis yang relevan.",
      "level": "transisi"
     },
     {
      "id": "6.5.6",
      "text": "Terdapat prosedur permintaan pemeliharaan sarana dan peralatan produksi dengan kondisi K3 yang tidak memenuhi persyaratan dan perlu segera diperbaiki.",
      "level": "transisi"
     },
     {
      "id": "6.5.7",
      "text": "Terdapat sistem untuk penandaan bagi peralatan yang sudah tidak aman lagi untuk digunakan atau sudah tidak digunakan.",
      "level": "awal"
     },
     {
      "id": "6.5.8",
      "text": "Apabila diperlukan dilakukan penerapan sistem penguncian pengoperasian (lock out system) untuk mencegah agar sarana produksi tidak dihidupkan sebelum saatnya.",
      "level": "awal"
     },
     {
      "id": "6.5.9",
      "text": "Terdapat prosedur yang dapat menjamin keselamatan dan kesehatan tenaga kerja atau orang lain yang berada didekat sarana dan peralatan produksi pada saat proses pemeriksaan, pemeliharaan, perbaikan dan perubahan.",
      "level": "awal"
     },
     {
      "id": "6.5.10",
      "text": "Terdapat penanggung jawab untuk menyetujui bahwa sarana dan peralatan produksi telah aman digunakan setelah proses pemeliharaan, perawatan, perbaikan atau perubahan.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "6.6",
    "title": "Pelayanan",
    "criteria": [
     {
      "id": "6.6.1",
      "text": "Apabila perusahaan dikontrak untuk menyediakan pelayanan yang tunduk pada standar dan peraturan perundang-undangan mengenai K3, maka perlu disusun prosedur untuk menjamin bahwa pelayanan memenuhi persyaratan.",
      "level": "lanjutan"
     },
     {
      "id": "6.6.2",
      "text": "Apabila perusahaan diberi pelayanan melalui kontrak, dan pelayanan tunduk pada standar dan peraturan perundang-undangan K3, maka perlu disusun prosedur untuk menjamin bahwa pelayanan memenuhi persyaratan.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "6.7",
    "title": "Kesiapan Untuk Menangani Keadaan Darurat",
    "criteria": [
     {
      "id": "6.7.1",
      "text": "Keadaan darurat yang potensial di dalam dan/atau di luar tempat kerja telah diidentifikasi dan prosedur keadaan darurat telah didokumentasikan dan diinformasikan agar diketahui oleh seluruh orang yang ada di tempat kerja.",
      "level": "transisi"
     },
     {
      "id": "6.7.2",
      "text": "Penyediaan alat/sarana dan prosedur keadaan darurat berdasarkan hasil identifikasi dan diuji serta ditinjau secara rutin oleh petugas yang berkompeten dan berwenang.",
      "level": "transisi"
     },
     {
      "id": "6.7.3",
      "text": "Tenaga kerja mendapat instruksi dan pelatihan mengenai prosedur keadaan darurat yang sesuai dengan tingkat risiko.",
      "level": "transisi"
     },
     {
      "id": "6.7.4",
      "text": "Petugas penanganan keadaan darurat ditetapkan dan diberikan pelatihan khusus serta diinformasikan kepada seluruh orang yang ada di tempat kerja.",
      "level": "awal"
     },
     {
      "id": "6.7.5",
      "text": "Instruksi/prosedur keadaan darurat dan hubungan keadaan darurat diperlihatkan secara jelas dan menyolok serta diketahui oleh seluruh tenaga kerja di perusahaan.",
      "level": "transisi"
     },
     {
      "id": "6.7.6",
      "text": "Peralatan, dan sistem tanda bahaya keadaan darurat disediakan, diperiksa, diuji dan dipelihara secara berkala sesuai dengan peraturan perundang-undangan, standar dan pedoman teknis yang relevan.",
      "level": "awal"
     },
     {
      "id": "6.7.7",
      "text": "Jenis, jumlah, penempatan dan kemudahan untuk mendapatkan alat keadaan darurat telah sesuai dengan peraturan perundang-undangan atau standar dan dinilai oleh petugas yang berkompeten dan berwenang.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "6.8",
    "title": "Pertolongan Pertama Pada Kecelakaan",
    "criteria": [
     {
      "id": "6.8.1",
      "text": "Perusahaan telah mengevaluasi alat P3K dan menjamin bahwa sistem P3K yang ada memenuhi peraturan perundang-undangan, standar dan pedoman teknis.",
      "level": "awal"
     },
     {
      "id": "6.8.2",
      "text": "Petugas P3K telah dilatih dan ditunjuk sesuai dengan peraturan perundangan-undangan.",
      "level": "awal"
     }
    ]
   },
   {
    "id": "6.9",
    "title": "Rencana dan Pemulihan Keadaan Darurat",
    "criteria": [
     {
      "id": "6.9.1",
      "text": "Prosedur untuk pemulihan kondisi tenaga kerja maupun sarana dan peralatan produksi yang mengalami kerusakan telah ditetapkan dan dapat diterapkan sesegera mungkin setelah terjadinya kecelakaan dan penyakit akibat kerja.",
      "level": "lanjutan"
     }
    ]
   }
  ]
 },
 {
  "no": 7,
  "title": "Standar Pemantauan",
  "subs": [
   {
    "id": "7.1",
    "title": "Pemeriksaan Bahaya",
    "criteria": [
     {
      "id": "7.1.1",
      "text": "Pemeriksaan/inspeksi terhadap tempat kerja dan cara kerja dilaksanakan secara teratur.",
      "level": "awal"
     },
     {
      "id": "7.1.2",
      "text": "Pemeriksaan/inspeksi dilaksanakan oleh petugas yang berkompeten dan berwenang yang telah memperoleh pelatihan mengenai identifikasi bahaya.",
      "level": "transisi"
     },
     {
      "id": "7.1.3",
      "text": "Pemeriksaan/inspeksi mencari masukan dari tenaga kerja yang melakukan tugas di tempat yang diperiksa.",
      "level": "transisi"
     },
     {
      "id": "7.1.4",
      "text": "Daftar periksa (check list) tempat kerja telah disusun untuk digunakan pada saat pemeriksaan/inspeksi.",
      "level": "transisi"
     },
     {
      "id": "7.1.5",
      "text": "Laporan pemeriksaan/inspeksi berisi rekomendasi untuk tindakan perbaikan dan diajukan kepada pengurus dan P2K3 sesuai dengan kebutuhan.",
      "level": "transisi"
     },
     {
      "id": "7.1.6",
      "text": "Pengusaha atau pengurus telah menetapkan penanggung jawab untuk pelaksanaan tindakan perbaikan dari hasil laporan pemeriksaan/inspeksi.",
      "level": "transisi"
     },
     {
      "id": "7.1.7",
      "text": "Tindakan perbaikan dari hasil laporan pemeriksaan/inspeksi dipantau untuk menentukan efektifitasnya.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "7.2",
    "title": "Pemantauan/Pengukuran Lingkungan Kerja",
    "criteria": [
     {
      "id": "7.2.1",
      "text": "Pemantauan/pengukuran lingkungan kerja dilaksanakan secara teratur dan hasilnya didokumentasikan, dipelihara dan digunakan untuk penilaian dan pengendalian risiko.",
      "level": "awal"
     },
     {
      "id": "7.2.2",
      "text": "Pemantauan/pengukuran lingkungan kerja meliputi faktor fisik, kimia, biologi, ergonomi dan psikologi.",
      "level": "awal"
     },
     {
      "id": "7.2.3",
      "text": "Pemantauan/pengukuran lingkungan kerja dilakukan oleh petugas atau pihak yang berkompeten dan berwenang dari dalam dan/atau luar perusahaan.",
      "level": "awal"
     }
    ]
   },
   {
    "id": "7.3",
    "title": "Peralatan Pemeriksaan/Inspeksi, Pengukuran dan Pengujian",
    "criteria": [
     {
      "id": "7.3.1",
      "text": "Terdapat prosedur yang terdokumentasi mengenai identifikasi, kalibrasi, pemeliharaan dan penyimpanan untuk alat pemeriksaan, ukur dan uji mengenai K3.",
      "level": "lanjutan"
     },
     {
      "id": "7.3.2",
      "text": "Alat dipelihara dan dikalibrasi oleh petugas atau pihak yang berkompeten dan berwenang dari dalam dan/atau luar perusahaan.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "7.4",
    "title": "Pemantauan Kesehatan Tenaga Kerja",
    "criteria": [
     {
      "id": "7.4.1",
      "text": "Dilakukan pemantauan kesehatan tenaga kerja yang bekerja pada tempat kerja yang mengandung potensi bahaya tinggi sesuai dengan peraturan perundang-undangan.",
      "level": "awal"
     },
     {
      "id": "7.4.2",
      "text": "Pengusaha atau pengurus telah melaksanakan identifikasi keadaan dimana pemeriksaan kesehatan tenaga kerja perlu dilakukan dan telah melaksanakan sistem untuk membantu pemeriksaan ini.",
      "level": "transisi"
     },
     {
      "id": "7.4.3",
      "text": "Pemeriksaan kesehatan tenaga kerja dilakukan oleh dokter pemeriksa yang ditunjuk sesuai peraturan perundang-undangan.",
      "level": "awal"
     },
     {
      "id": "7.4.4",
      "text": "Perusahaan menyediakan pelayanan kesehatan kerja sesuai peraturan perundang-undangan.",
      "level": "awal"
     },
     {
      "id": "7.4.5",
      "text": "Catatan mengenai pemantauan kesehatan tenaga kerja dibuat sesuai dengan peraturan perundang-undangan.",
      "level": "awal"
     }
    ]
   }
  ]
 },
 {
  "no": 8,
  "title": "Pelaporan dan Perbaikan Kekurangan",
  "subs": [
   {
    "id": "8.1",
    "title": "Pelaporan Bahaya",
    "criteria": [
     {
      "id": "8.1.1",
      "text": "Terdapat prosedur pelaporan bahaya yang berhubungan dengan K3 dan prosedur ini diketahui oleh tenaga kerja.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "8.2",
    "title": "Pelaporan Kecelakaan",
    "criteria": [
     {
      "id": "8.2.1",
      "text": "Terdapat prosedur terdokumentasi yang menjamin bahwa semua kecelakaan kerja, penyakit akibat kerja, kebakaran atau peledakan serta kejadian berbahaya lainnya di tempat kerja dicatat dan dilaporkan sesuai dengan peraturan perundang-undangan.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "8.3",
    "title": "Pemeriksaan dan pengkajian Kecelakaan",
    "criteria": [
     {
      "id": "8.3.1",
      "text": "Tempat kerja/perusahaan mempunyai prosedur pemeriksaan dan pengkajian kecelakaan kerja dan penyakit akibat kerja.",
      "level": "awal"
     },
     {
      "id": "8.3.2",
      "text": "Pemeriksaan dan pengkajian kecelakaan kerja dilakukan oleh petugas atau Ahli K3 yang ditunjuk sesuai peraturan perundang-undangan atau pihak lain yang berkompeten dan berwenang.",
      "level": "transisi"
     },
     {
      "id": "8.3.3",
      "text": "Laporan pemeriksaan dan pengkajian berisi tentang sebab dan akibat serta rekomendasi/saran dan jadwal waktu pelaksanaan usaha perbaikan.",
      "level": "lanjutan"
     },
     {
      "id": "8.3.4",
      "text": "Penanggung jawab untuk melaksanakan tindakan perbaikan atas laporan pemeriksaan dan pengkajian telah ditetapkan.",
      "level": "lanjutan"
     },
     {
      "id": "8.3.5",
      "text": "Tindakan perbaikan diinformasikan kepada tenaga kerja yang bekerja di tempat terjadinya kecelakaan.",
      "level": "lanjutan"
     },
     {
      "id": "8.3.6",
      "text": "Pelaksanaan tindakan perbaikan dipantau, didokumentasikan dan diinformasikan ke seluruh tenaga kerja.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "8.4",
    "title": "Penanganan Masalah",
    "criteria": [
     {
      "id": "8.4.1",
      "text": "Terdapat prosedur untuk menangani masalah keselamatan dan kesehatan yang timbul dan sesuai dengan peraturan perundang-undangan yang berlaku.",
      "level": "lanjutan"
     }
    ]
   }
  ]
 },
 {
  "no": 9,
  "title": "Pengelolaan Material dan Perpindahannya",
  "subs": [
   {
    "id": "9.1",
    "title": "Penanganan Secara Manual dan Mekanis",
    "criteria": [
     {
      "id": "9.1.1",
      "text": "Terdapat prosedur untuk mengidentifikasi potensi bahaya dan menilai risiko yang berhubungan dengan penanganan secara manual dan mekanis.",
      "level": "awal"
     },
     {
      "id": "9.1.2",
      "text": "Identifikasi bahaya dan penilaian risiko dilaksanakan oleh petugas yang berkompeten dan berwenang.",
      "level": "awal"
     },
     {
      "id": "9.1.3",
      "text": "Pengusaha atau pengurus menerapkan dan meninjau cara pengendalian risiko yang berhubungan dengan penanganan secara manual atau mekanis.",
      "level": "transisi"
     },
     {
      "id": "9.1.4",
      "text": "Terdapat prosedur untuk penanganan bahan meliputi metode pencegahan terhadap kerusakan, tumpahan dan/atau kebocoran.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "9.2",
    "title": "Sistem Pengangkutan, Penyimpanan dan Pembuangan",
    "criteria": [
     {
      "id": "9.2.1",
      "text": "Terdapat prosedur yang menjamin bahwa bahan disimpan dan dipindahkan dengan cara yang aman sesuai dengan peraturan perundang-undangan.",
      "level": "awal"
     },
     {
      "id": "9.2.2",
      "text": "Terdapat prosedur yang menjelaskan persyaratan pengendalian bahan yang dapat rusak atau kadaluarsa.",
      "level": "lanjutan"
     },
     {
      "id": "9.2.3",
      "text": "Terdapat prosedur yang menjamin bahwa bahan dibuang dengan cara yang aman sesuai dengan peraturan perundang-undangan.",
      "level": "awal"
     }
    ]
   },
   {
    "id": "9.3",
    "title": "Pengendalian Bahan Kimia Berbahaya (BKB)",
    "criteria": [
     {
      "id": "9.3.1",
      "text": "Perusahaan telah mendokumentasikan dan menerapkan prosedur mengenai penyimpanan, penanganan dan pemindahan BKB sesuai dengan persyaratan peraturan perundang-undangan, standar dan pedoman teknis yang relevan.",
      "level": "awal"
     },
     {
      "id": "9.3.2",
      "text": "Terdapat Lembar Data Keselamatan BKB (Material Safety Data Sheets) meliputi keterangan mengenai keselamatan bahan sebagaimana diatur pada peraturan perundang-undangan dan dengan mudah dapat diperoleh.",
      "level": "lanjutan"
     },
     {
      "id": "9.3.3",
      "text": "Terdapat sistem untuk mengidentifikasi dan pemberian label secara jelas pada bahan kimia berbahaya.",
      "level": "awal"
     },
     {
      "id": "9.3.4",
      "text": "Rambu peringatan bahaya terpasang sesuai dengan persyaratan peraturan perundang-undangan dan/atau standar yang relevan.",
      "level": "awal"
     },
     {
      "id": "9.3.5",
      "text": "Penanganan BKB dilakukan oleh petugas yang berkompeten dan berwenang.",
      "level": "transisi"
     }
    ]
   }
  ]
 },
 {
  "no": 10,
  "title": "Pengumpulan dan Penggunaan Data",
  "subs": [
   {
    "id": "10.1",
    "title": "Catatan K3",
    "criteria": [
     {
      "id": "10.1.1",
      "text": "Pengusaha atau pengurus telah mendokumentasikan dan menerapkan prosedur pelaksanaan identifikasi, pengumpulan, pengarsipan, pemeliharaan, penyimpanan dan penggantian catatan K3.",
      "level": "transisi"
     },
     {
      "id": "10.1.2",
      "text": "Peraturan perundang-undangan, standar dan pedoman teknis K3 yang relevan dipelihara pada tempat yang mudah didapat.",
      "level": "transisi"
     },
     {
      "id": "10.1.3",
      "text": "Terdapat prosedur yang menentukan persyaratan untuk menjaga kerahasiaan catatan.",
      "level": "lanjutan"
     },
     {
      "id": "10.1.4",
      "text": "Catatan kompensasi kecelakaan dan rehabilitasi kesehatan tenaga kerja dipelihara.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "10.2",
    "title": "Data dan Laporan K3",
    "criteria": [
     {
      "id": "10.2.1",
      "text": "Data K3 yang terbaru dikumpulkan dan dianalisa.",
      "level": "transisi"
     },
     {
      "id": "10.2.2",
      "text": "Laporan rutin kinerja K3 dibuat dan disebarluaskan di dalam tempat kerja.",
      "level": "transisi"
     }
    ]
   }
  ]
 },
 {
  "no": 11,
  "title": "Pemeriksaan SMK3",
  "subs": [
   {
    "id": "11.1",
    "title": "Audit Internal SMK3",
    "criteria": [
     {
      "id": "11.1.1",
      "text": "Audit internal SMK3 yang terjadwal dilaksanakan untuk memeriksa kesesuaian kegiatan perencanaan dan untuk menentukan efektifitas kegiatan tersebut.",
      "level": "lanjutan"
     },
     {
      "id": "11.1.2",
      "text": "Audit internal SMK3 dilakukan oleh petugas yang independen, berkompeten dan berwenang.",
      "level": "lanjutan"
     },
     {
      "id": "11.1.3",
      "text": "Laporan audit didistribusikan kepada pengusaha atau pengurus dan petugas lain yang berkepentingan dan dipantau untuk menjamin dilakukannya tindakan perbaikan.",
      "level": "lanjutan"
     }
    ]
   }
  ]
 },
 {
  "no": 12,
  "title": "Pengembangan Keterampilan dan Kemampuan",
  "subs": [
   {
    "id": "12.1",
    "title": "Strategi Pelatihan",
    "criteria": [
     {
      "id": "12.1.1",
      "text": "Analisis kebutuhan pelatihan K3 sesuai persyaratan peraturan perundang-undangan telah dilakukan.",
      "level": "lanjutan"
     },
     {
      "id": "12.1.2",
      "text": "Rencana pelatihan K3 bagi semua tingkatan telah disusun.",
      "level": "transisi"
     },
     {
      "id": "12.1.3",
      "text": "Jenis pelatihan K3 yang dilakukan harus disesuaikan dengan kebutuhan untuk pengendalian potensi bahaya.",
      "level": "lanjutan"
     },
     {
      "id": "12.1.4",
      "text": "Pelatihan dilakukan oleh orang atau badan yang berkompeten dan berwenang sesuai peraturan perundang-undangan.",
      "level": "transisi"
     },
     {
      "id": "12.1.5",
      "text": "Terdapat fasilitas dan sumber daya memadai untuk pelaksanaan pelatihan yang efektif.",
      "level": "transisi"
     },
     {
      "id": "12.1.6",
      "text": "Pengusaha atau pengurus mendokumentasikan dan menyimpan catatan seluruh pelatihan.",
      "level": "transisi"
     },
     {
      "id": "12.1.7",
      "text": "Program pelatihan ditinjau secara teratur untuk menjamin agar tetap relevan dan efektif.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "12.2",
    "title": "Pelatihan Bagi Manajemen dan Penyelia",
    "criteria": [
     {
      "id": "12.2.1",
      "text": "Anggota manajemen eksekutif dan pengurus berperan serta dalam pelatihan yang mencakup penjelasan tentang kewajiban hukum dan prinsip-prinsip serta pelaksanaan K3.",
      "level": "awal"
     },
     {
      "id": "12.2.2",
      "text": "Manajer dan pengawas/penyelia menerima pelatihan yang sesuai dengan peran dan tanggung jawab mereka.",
      "level": "awal"
     }
    ]
   },
   {
    "id": "12.3",
    "title": "Pelatihan Bagi Tenaga Kerja",
    "criteria": [
     {
      "id": "12.3.1",
      "text": "Pelatihan diberikan kepada semua tenaga kerja termasuk tenaga kerja baru dan yang dipindahkan agar mereka dapat melaksanakan tugasnya secara aman.",
      "level": "awal"
     },
     {
      "id": "12.3.2",
      "text": "Pelatihan diberikan kepada tenaga kerja apabila di tempat kerjanya terjadi perubahan sarana produksi atau proses.",
      "level": "transisi"
     },
     {
      "id": "12.3.3",
      "text": "Pengusaha atau pengurus memberikan pelatihan penyegaran kepada semua tenaga kerja.",
      "level": "lanjutan"
     }
    ]
   },
   {
    "id": "12.4",
    "title": "Pelatihan Pengenalan dan Pelatihan Untuk Pengunjung dan Kontraktor",
    "criteria": [
     {
      "id": "12.4.1",
      "text": "Terdapat prosedur yang menetapkan persyaratan untuk memberikan taklimat (briefing) kepada pengunjung dan mitra kerja guna menjamin K3.",
      "level": "transisi"
     }
    ]
   },
   {
    "id": "12.5",
    "title": "Pelatihan Keahlian Khusus",
    "criteria": [
     {
      "id": "12.5.1",
      "text": "Perusahaan mempunyai sistem yang menjamin kepatuhan terhadap persyaratan lisensi atau kualifikasi sesuai dengan peraturan perundangan untuk melaksanakan tugas khusus, melaksanakan pekerjaan atau mengoperasikan peralatan.",
      "level": "awal"
     }
    ]
   }
  ]
 }
];

export const LEVELS = [
  { key: "awal", label: "Tingkat Awal", count: 64, includes: ["awal"] },
  { key: "transisi", label: "Tingkat Transisi", count: 122, includes: ["awal", "transisi"] },
  { key: "lanjutan", label: "Tingkat Lanjutan", count: 166, includes: ["awal", "transisi", "lanjutan"] },
];

export const ALL_CRITERIA = AUDIT_ELEMENTS.flatMap((e) => e.subs.flatMap((s) => s.criteria.map((c) => ({ ...c, element: e.no, sub: s.id }))));
export const criteriaForLevel = (level) => {
  const inc = LEVELS.find((l) => l.key === level)?.includes || [];
  return ALL_CRITERIA.filter((c) => inc.includes(c.level));
};
