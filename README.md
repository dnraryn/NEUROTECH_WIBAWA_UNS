# NEUROTECH_WIBAWA_UNS

Aplikasi React untuk monitoring fatigue, dengan Mode Demo, Firebase Auth/Firestore, dan integrasi Muse 2 / Muse S / Muse S Athena. Build produksi mengompilasi JSX dengan esbuild dan menyajikan React produksi dari Hosting; browser tidak memuat Babel atau React development. Firebase SDK tetap memakai CDN. Alur akun memakai Firebase Spark tanpa Cloud Functions dan tidak memerlukan pengaktifan penagihan.

## Menjalankan lokal

Pratinjau arsip dan laporan K3 yang baru:

```powershell
npm.cmd ci
npm.cmd run preview
```

Buka alamat yang dicetak terminal (mulai dari http://localhost:8000/#/landing). Pilih **Coba demo → Supervisor K3 → Laporan SMK3 → Lihat contoh laporan**. Grafik, CSV, dan halaman cetak dapat dicoba tanpa alat. Tombol **Cetak / Simpan PDF** membuka laporan; tekan tombol cetaknya lalu pilih **Save as PDF** di browser. Server hanya menyajikan build produksi; mulai ulang setelah mengedit kode. Port yang terpakai dilewati otomatis sampai 8010. `npm.cmd run build` membuat build tanpa membuka server. File aplikasi memakai nama berdasarkan isi untuk cache; sumber JSX, pengujian, checkpoint, dan gambar mockup yang tidak dipakai tidak ikut dipublikasikan.

### Peran dan sumber data

- Pekerja membuka Live dan arsip sendiri. Data tidur dan target pantau dapat diisi melalui **Catat tidur & target pantau** pada halaman pribadi. Saat sesi aktif, perubahan juga disalin ke check-in sesi tersebut.
- Supervisor melihat anggota, shift, indikasi microsleep, dan arsip perusahaan. Manajemen memakai arsip perusahaan yang sama pada tampilan **Ringkasan perusahaan**; **Sesi perangkat ini** membuka hasil Muse pada browser manajemen.
- Ringkasan FI/CLI/Engagement ditimbang menurut jumlah hasil bersih. Hasil terbatas tidak dimasukkan. Kekurangan tidur memakai laporan tidur terakhir yang tersedia per anggota; cakupan target pantau dihitung per anggota/hari sehingga beberapa sesi tidak menggandakan target harian. Ini bukan skor kepatuhan audit SMK3.
- Arsip diperbarui melalui event; tampilan idle tidak melakukan polling satu detik. Penulisan perangkat tetap setiap 10 detik dan sinkronisasi cloud tetap setiap 5 menit/saat selesai. Pembaruan lintas perangkat diambil melalui **Sinkronkan** dan waktu sinkronisasi terakhir ditampilkan.

Build memakai React 18.3.1 dan esbuild yang dikunci di package-lock. Dependensi pengujian Firebase memakai override `@grpc/grpc-js` 1.14.6 untuk menghindari versi rentan yang dipasang dependensi transitif; lihat [advisori resmi gRPC](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j). Override ini hanya memengaruhi dependensi Node; Firebase SDK browser tetap sesuai versi CDN yang digunakan aplikasi.

### Arsip sesi dan laporan K3

- Muse tersambung membuat sesi laporan secara otomatis. **Selesai & simpan** menutup sesi laporan; Bluetooth dapat tetap tersambung. **Mulai sesi Muse** memulai arsip berikutnya. Sesi dibatasi 12 jam dan diteruskan sebagai sesi baru jika alat tetap aktif.
- Ringkasan hasil bersih per menit, jumlah hasil terbatas, baseline sementara, sampel diterima, protokol/versi algoritma, shift, dan check-in disimpan ke IndexedDB setiap 10 detik dan saat sesi selesai. EEG mentah tidak disimpan. Kegagalan penyimpanan ditampilkan, dengan ekspor CSV sebagai alternatif.
- Arsip dipisahkan per perusahaan dan UID akun. Mode demo memakai ruang lokal terpisah dan contoh berlabel simulasi. Pada perangkat bersama, arsip lokal tetap merupakan data perangkat; menghapus data situs akan menghapusnya. Halaman yang ditutup paksa dapat kehilangan perubahan sejak checkpoint terakhir; sesi yang belum selesai ditandai terputus ketika dibuka kembali.
- Hasil terbatas tidak masuk rerata/grafik laporan bersih. Kalibrasi yang belum selesai ditandai baseline sementara. Indikasi microsleep adalah heuristik prototipe; laporan tidak menetapkan diagnosis atau skor kepatuhan SMK3.
- **Pratinjau localhost tidak membaca/menulis arsip ke Firebase produksi.** Sinkronisasi hanya aktif untuk emulator eksplisit (`?emulators=1`) dan domain produksi NeuroTech. Salinan IndexedDB localhost dan domain produksi berbeda.
- Implementasi cloud menggunakan `companies/{code}/sessions/{id}` dan `sessionReviews/{id}`; Rules membatasi pekerja ke sesi sendiri dan petugas ke perusahaan sendiri. Hanya pemilik sesi dapat menulis hasilnya. Sesi selesai dan evaluasi petugas bersifat tetap. Angka dihitung di browser dan tidak dianggap hasil klinis tersertifikasi.
- Untuk instalasi project baru, terapkan **Rules dan indexes dahulu**, tunggu indeks siap, baru Hosting. Tidak memerlukan Cloud Functions atau Cloud Storage. Ringkasan dikirim saat mulai, sekitar setiap 1 menit, dan saat selesai. Antrean lokal dicoba kembali saat online, saat visibilitas halaman berubah, atau menekan Sinkronkan. Status tersinkron diberikan setelah transaksi server berhasil. Dashboard dan arsip berlangganan `onSnapshot` Firestore sehingga pembaruan perangkat lain muncul otomatis setelah tersimpan di server. Listener dilepas saat identitas berubah; pekerja hanya berlangganan sesi/evaluasi miliknya. Daftar cloud memuat maksimal 60 sesi terbaru yang dapat diakses; bukan arsip seluruh perusahaan tanpa batas. Ini pembaruan ringkasan berkala, bukan alarm keselamatan langsung atau streaming EEG mentah.
- **CSV ringkasan** berisi satu baris per sesi: perusahaan, pekerja, waktu dan zona waktu, kualitas, indeks, tidur, dan evaluasi. **CSV per menit** berisi hasil pengukuran per menit. Keduanya memakai UTF-8 BOM, CRLF, petunjuk pemisah `sep=;`, tanda kutip, serta angka desimal Indonesia agar mudah dibuka di Excel. Teks pengguna dilindungi agar tidak dieksekusi sebagai formula. Nilai yang belum tersedia tetap kosong; nilai nol tetap disertakan. Nama berkas memuat jenis laporan, identitas, dan tanggal. API `ntReports` juga mendukung CSV standar dengan `{ excel: false }`. PDF dibuat melalui cetak browser, tanpa Cloud Storage. Durasi tidur/kantuk bersumber dari isian pengguna.

Checkpoint sebelum revisi tersimpan di `.tools/checkpoints/`; `.tools/current-cleanup-checkpoint.txt` mencatat titik pemulihan revisi perapian. Skrip `restore.cjs` di checkpoint memeriksa perubahan tanpa menulis; `--apply` memulihkan sumber lokal dan menolak menimpa suntingan yang lebih baru. Pemulihan lokal tidak mengubah versi Hosting yang sudah dipublikasikan; deploy ulang diperlukan untuk memperbarui situs.

Alternatif server Python untuk hasil build:

```powershell
npm.cmd run build
py -m http.server 8000 --bind 127.0.0.1 --directory .firebase/hosting-public
```

Buka http://localhost:8000/#/landing melalui Chrome/Edge. Biarkan terminal tetap terbuka. Internet diperlukan untuk dependensi CDN. Mode Demo dapat dicoba tanpa akun. Server Python menggunakan layanan Firebase cloud; menjalankan server lokal tidak otomatis menerapkan Rules.

Untuk mencoba akun tanpa mengakses cloud:

```powershell
npm.cmd install
npm.cmd run emulators
```

Buka http://localhost:5000/?emulators=1#/landing. Parameter ini hanya diakui pada localhost/127.0.0.1 dan mengganti project menjadi `demo-neurotech`: Auth di port 9099 dan Firestore di port 8080. AI cloud dinonaktifkan saat memakai emulator. Tautan verifikasi/reset email emulator dicetak di terminal emulator; jangan membagikan kode atau tautan tersebut. Data emulator bersifat sementara.

## Login dan pendaftaran

1. Pemilik membuka Bergabung, memilih paket, mengisi email dan password baru minimal 8 karakter, serta nama/email anggota. Pembayaran masih simulasi.
2. Tekan Simpan, buka email verifikasi, lalu kembali ke formulir dan tekan Simpan lagi.
3. Simpan kode perusahaan yang diberikan. Kode baru memakai awalan paket dan 12 karakter acak; tidak menimpa kode demo lama.
4. Berikan kode perusahaan kepada anggota. Pendaftaran anggota mencatat undangan di Firestore, belum mengirim email undangan otomatis.
5. Anggota membuka Login > Anggota baru? Aktifkan akun, memakai kode dan email yang telah didaftarkan pengelola, lalu memilih password sendiri.
6. Setelah memverifikasi email, anggota menekan Saya sudah verifikasi untuk menerima undangan.
7. Login berikutnya memakai kode, email, dan password. Lupa password menggunakan email reset Firebase.

Pembuatan pemilik/perusahaan atomik. Anggota awal ditambahkan satu per transaksi supaya Rules dapat memverifikasi batas paket dan hak akses. Jika koneksi terputus setelah perusahaan dibuat, ulangi Simpan dengan nama/paket yang sama, atau login lalu tambahkan anggota yang belum masuk melalui daftar pekerja.

## Keamanan dan hubungan data

- Firebase Authentication menangani password. Password tidak disimpan dalam dokumen perusahaan, profil Firestore, daftar anggota, atau sessionStorage.
- Browser menghapus cache sesi lama. Sesi baru dipulihkan dari Firebase Auth serta dokumen keanggotaan yang dilindungi Rules; role dalam sessionStorage tidak dipercaya.
- `companies/{code}` menyimpan metadata, pemilik UID, dan penghitung anggota. `companies/{code}/members/{email-normalized}` menyimpan anggota/undangan tanpa password. `users/{uid}` menghubungkan akun Auth ke perusahaan, anggota, dan role.
- Pekerja membaca metadata perusahaan dan data miliknya. Supervisor/manajemen membaca daftar anggota perusahaan sendiri. Sebelum bergabung, anggota terverifikasi hanya dapat membaca undangan untuk emailnya sendiri jika mengetahui kode perusahaan.
- Pembuatan perusahaan memerlukan tiga dokumen yang cocok dalam satu transaksi: perusahaan, anggota pemilik, dan profil UID. Role pemilik ditetapkan Rules berdasarkan paket.
- Penerimaan undangan hanya boleh mengubah UID/status dari undangan yang cocok dengan email Auth terverifikasi, disertai profil yang cocok. Role undangan tidak boleh diganti oleh penerima.
- Supervisor mengelola pekerja; manajemen mengelola pekerja/supervisor; pemilik mengelola akses manajemen. Hanya pemilik dapat mengubah role yang sudah ada. UI perubahan role belum tersedia; helper `ntCompany.changeRole(id, role)` tetap tunduk pada Rules.
- Perubahan role harus memperbarui dokumen anggota dan profil terkait secara atomik. Penghapusan anggota aktif wajib mencabut profilnya dalam transaksi yang sama. Pemilik dan akun yang sedang digunakan tidak dapat dihapus.
- Tambah/hapus/perubahan role wajib memperbarui penghitung dan revisi perusahaan yang cocok dengan satu anggota. Rules memeriksa batas paket; mengubah kode frontend tidak dapat melewati pemeriksaan ini.
- Transaksi dijalankan di `company-store.js`; otorisasi ditegakkan oleh `firestore.rules`. Konflik penghitung antar sesi dicoba ulang hanya setelah perubahan revisi server terbukti, dengan pemeriksaan keanggotaan baru.
- Monitoring EEG masih berada di memori browser. Rules menolak penulisan monitoring cloud sampai tersedia alur penyimpanan yang tervalidasi. Koleksi `workers` lama dan perusahaan legacy tanpa model baru ditolak.
- Mode Demo memakai data lokal dan tidak memberi hak akses Firebase.

## Pemeriksaan

Gunakan Node.js 22+ untuk alat pengembangan, Firebase CLI, dan Java 21+ untuk Firestore Emulator. Java portabel di `.tools/java21` pada workspace ini dipakai otomatis oleh skrip emulator; folder tersebut tidak masuk Git/Hosting. Komputer lain memerlukan Java sendiri.

```powershell
npm.cmd install
npm.cmd run check
npm.cmd test
npm.cmd run test:security
```

Tes regresi memeriksa Bluetooth, pemulihan sesi, role UI, logout dan penyimpanan. Tes keamanan menjalankan Auth/Firestore Emulator dengan project fiktif `demo-neurotech`, menguji Rules asli serta transaksi aplikasi menggunakan akun/token emulator. Tidak mengubah Firebase produksi.

## Penerapan ke Firebase

Project terpilih di `.firebaserc` adalah `neurotech-id`. Aktifkan Email/Password di Firebase Authentication dan daftarkan domain website/localhost pada Authorized domains. Verifikasi email diperlukan sebelum membaca data atau membuat perusahaan. Alur ini tidak menggunakan Cloud Functions atau Admin SDK di browser.

```powershell
firebase.cmd login
firebase.cmd deploy --only "firestore:rules,hosting" --project neurotech-id
```

Rules harus diterapkan bersama versi frontend yang sesuai. Rules baru menutup alur login lama. Karena data lama masih demo, buat perusahaan demo baru dengan email milik sendiri setelah deploy. Dokumen demo lama tetap tersimpan, ditolak oleh aplikasi, dan tidak dihapus oleh proses deploy. Akun Firebase Auth lama tidak otomatis dihapus. Jangan memakai ulang password lama.

Sebelum deploy, `scripts/build-hosting.js` membuat folder `.firebase/hosting-public` dari daftar file aplikasi dan aset yang diizinkan. Hosting hanya menerbitkan folder hasil build tersebut, sehingga metadata Git, tests/scripts/private/.tools, node_modules, konfigurasi pengembangan, Rules dan log tidak ikut diterbitkan. Emulator Hosting juga menjalankan build ini otomatis. Tidak ada perubahan paket atau metode pembayaran melalui skrip proyek; pemakaian Firebase tetap mengikuti kuota paket project.

## Konfigurasi dan variabel lingkungan

Frontend memakai konfigurasi web Firebase publik di `firebase-init.js` dan `ai-gemini.js`. Tidak memerlukan service-account key atau private key. Jangan menaruh kredensial admin di aplikasi maupun folder Hosting.

`FIRESTORE_EMULATOR_HOST` dan `FIREBASE_AUTH_EMULATOR_HOST` diatur Emulator Suite untuk tes. `JAVA_HOME`/PATH mungkin perlu diatur jika Java 21 belum ditemukan. Tidak ada variabel rahasia frontend yang wajib diisi.

## Target pemantauan, tidur, dan AI

Dashboard sekarang menampilkan kepatuhan target pantau, insiden, sleep debt, dan jam pantau di bagian atas. FI/CLI/Engagement menjadi indeks utama; skor audit SMK3 tidak dibuat dari data EEG. Grafik berisi pengukuran asli, skala 0–100 dan tombol untuk memilih satu atau semua indeks. Band power dan analisis shift/lini/laporan dapat dibuka saat diperlukan.

Buka **Data sesi** atau **Catat tidur** untuk mengubah target pantau, target tidur pribadi dan durasi tidur terakhir. Kepatuhan adalah total menit EEG yang diterima hari ini dibagi target menit pantau, dibatasi 100%. Penghitung ini mencakup paket yang kemudian ditolak pemeriksaan kualitas dan bukan ukuran kepatuhan SOP atau kualitas EEG. Nilai awal target adalah 60 menit dan 8 jam yang dapat diubah, bukan ketentuan klinis. Sleep debt di kartu adalah selisih positif target tidur dan durasi tidur terakhir yang dilaporkan, bukan estimasi utang tidur kumulatif. Tanpa laporan tidur, kartu mengajak pengguna mengisi data dan tidak mengarang angka.

`session-metrics.js` menyimpan agregat jumlah sampel dan catatan tidur secara lokal per perusahaan/anggota, maksimal 14 hari; penghitung dan catatan tidur harian dimulai lagi pada pergantian tanggal lokal. Target pribadi dipertahankan. Tidak menyimpan sampel EEG mentah dan tidak mengirim catatan ke Firestore. Pada demo/tanpa akun, catatan hanya ada di memori halaman. Mengganti akun mengganti sumber catatan. Data ini belum menjadi agregat lintas perangkat/perusahaan.

Chat menggunakan Firebase AI Logic dengan Gemini dan **App Check reCAPTCHA Enterprise**. `appcheck-config.js` memuat site key publik untuk domain Hosting; tidak memuat secret key atau debug token. Provider App Check didaftarkan pada web app yang sama dengan konfigurasi Firebase. Enforcement AI menggunakan service ID `firebaseml.googleapis.com`; panggilan model melewati `firebasevertexai.googleapis.com`. App Check dan reCAPTCHA Enterprise API harus diaktifkan. Konfigurasi project saat perbaikan tetap tanpa penagihan. Dokumentasi: [App Check untuk AI Logic](https://firebase.google.com/docs/ai-logic/app-check), [provider web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider).

Saat pengguna bertanya, AI menerima riwayat percakapan terbatas, indeks EEG yang masih baru serta ringkasan angka catatan sesi; nama, email, perusahaan, token, dan HRV proxy tidak ditambahkan sebagai konteks otomatis. Hasil yang tidak tersedia tetap null. Chat direset saat akun berganti, memiliki batas waktu dan tombol coba lagi, serta menampilkan pesan pemulihan tanpa membocorkan respons SDK/URL layanan. AI cloud dinonaktifkan pada emulator. Provider produksi membatasi domain ke situs Hosting; pengujian AI di localhost membutuhkan konfigurasi debug pribadi sesuai panduan Firebase dan token tersebut tidak boleh diterbitkan.

## Mencoba Muse dalam mode real

Ringkasan Hasil olahan EEG menampilkan FI, Cognitive Load, Engagement pada skala indeks 0–100, serta estimasi klasifikasi. Penjelasan indeks, status kalibrasi, sensor yang dipakai/dikecualikan, dan usia hasil ditampilkan bersama angka. Nilai 0/100 adalah batas pemetaan indeks, bukan ukuran ada/tidaknya aktivitas otak atau persentase konsentrasi. Grafik tren langsung terlihat dan menampilkan pengukuran 60 detik terakhir; hasil berkualitas terbatas digambar putus-putus dan jeda penerimaan tidak dihubungkan menjadi garis. Diagram EEG Band Power menggunakan daya relatif dari jendela dua detik yang sama dengan hasil DSP. Kesimpulan sesi menjelaskan nilai indeks, klasifikasi, tindak lanjut, dan sensor bermasalah. Kategori sesaat mengikuti aturan pada indeks terbaru; kategori tren memakai hasil perataan beberapa jendela sehingga dapat tertinggal saat pola berubah. Keduanya ditampilkan dengan label berbeda, dan hasil saat kalibrasi/kualitas terbatas tetap bersifat sementara. Preview terbatas tetap terpisah dari heatmap, agregat dan CSV bersih.

Pada mode Sesi perangkat ini, halaman Fatigue Risk Management memakai ringkasan KPI, indeks, kesimpulan dan grafik sebagai tampilan utama; heatmap, indeks lini dan laporan tetap tersedia melalui analisis lanjutan atau sidebar. Indikator ringkas di bawah judul menampilkan status kualitas dan sampel EEG; tombol Detail sinyal membuka jumlah sampel, ukuran amplitudo, dan gelombang satu detik setiap sensor. Angka ditandai belum tersedia jika EEG belum diterima, sudah kedaluwarsa, atau ditolak karena gangguan sinyal. Halaman Live memakai pemeriksaan kesegaran dan kualitas yang sama dan tidak beralih menjadi tampilan demo setelah Muse terputus. Penolakan sinyal tidak dilewati untuk memaksa angka muncul. Heatmap merangkum hasil EEG bersih menurut shift yang tercatat dan jam sejak sesi dimulai. Filter periode, ekspor CSV, ringkasan sesi, modal sidebar dan kalibrasi ulang menggunakan data lokal yang tersedia. Riwayat real dibatasi 3.600 hasil terakhir di memori dan hilang saat sesi/browser direset. Kepatuhan dan sleep debt memakai sumber yang dijelaskan di atas. Data contoh hanya ditampilkan pada Mode Demo. Ringkasan perusahaan mengambil arsip Firebase yang sama dengan supervisor. Sesi perangkat ini tetap merupakan pengukuran satu Muse; streaming langsung semua perangkat belum tersedia.

1. Gunakan Chrome/Edge yang mendukung Web Bluetooth melalui HTTPS atau localhost. Aktifkan Bluetooth dan pastikan Muse tidak dipakai aplikasi lain.
2. Masuk sebagai anggota yang akan dipantau dan buka layar Live.
3. Pilih Hubungkan Muse (BLE). Kegagalan pairing tidak beralih otomatis ke simulasi.
4. Pasang TP9, AF7, AF8, TP10; status Live menunjukkan sinyal, gangguan gerakan, dan kalibrasi.
5. Duduk tenang selama sekitar 120 sampel EEG bersih (kurang lebih dua menit). Sinyal datar/gerakan tidak dipakai.
6. Baseline disimpan per perusahaan dan ID anggota di browser yang sama. Reset melalui Profil > Kalibrasi baseline.
7. Saat alat terputus, monitoring berhenti. Logout menghentikan streaming dan membersihkan sesi.

Untuk memeriksa masalah saat Muse benar-benar berjalan di `neurotech-id.web.app`, buka **Fatigue Risk Management > Detail sinyal > Mulai diagnostik ke file** pada Chrome/Edge desktop. Saat pemilih file muncul, simpan dengan nama `neurotech-diagnostics.json` di folder proyek. Biarkan halaman dan Muse berjalan; file diperbarui sekitar setiap dua detik dengan maksimal 30 catatan terakhir (sekitar satu menit). Setelah merekam gangguan, pilih **Hentikan diagnostik** dan beri tahu pemeriksa agar file dalam folder proyek dapat dibaca. File hanya memuat jumlah/laju sampel, kualitas tiap sensor, alasan penolakan, dan indeks. Nama perangkat, identitas akun, token, dan sampel EEG mentah tidak ditulis. Perekaman berhenti saat sesi akun berubah atau halaman ditutup. Browser meminta izin memilih file secara manual; membuka `localhost` saja tidak memberikan akses langsung ke tab browser atau Bluetooth. File ini diabaikan Git dan tidak masuk paket Firebase Hosting.

Pemrosesan saat ini menghapus offset dan tren linear setiap jendela 2 detik sebelum FFT. Setiap sensor diperiksa sendiri: deviasi <0,5 µV dianggap datar; >1% sampel pada batas ADC dianggap terpotong. Batas awal kualitas layak setelah detrend adalah puncak-ke-puncak ≤200 µV, deviasi ≤70 µV, gamma ≤25%. Rentang hingga 400 µV/120 µV/45% gamma diproses dengan peringatan kualitas terbatas; sensor yang melebihi batas berat dikecualikan. Paket dari keempat sensor masih diperlukan untuk membentuk jendela waktu, tetapi kanal yang ditolak tidak masuk perhitungan fitur. Dengan sedikitnya satu kanal frontal (AF7/AF8), FI dan Engagement dapat dihitung sebagai hasil parsial. Cognitive Load memerlukan sedikitnya satu kanal frontal dan satu kanal posterior (TP9/TP10). Jika hanya kanal posterior yang tersisa, hasilnya hanya daya pita EEG; indeks dan klasifikasi ditampilkan belum tersedia. Nilai yang kehilangan sumber data disimpan sebagai null, bukan nol, dan grafik metrik tersebut terputus pada jeda itu. Kategori pada hasil frontal saja memakai FI dan diberi label estimasi fatigue parsial. Ini perluasan perhitungan prototipe, bukan validasi bahwa satu kanal cukup untuk menilai kelelahan secara akurat. Baseline pribadi dari konfigurasi lengkap belum divalidasi untuk konfigurasi kanal yang berkurang. Perubahan kumpulan kanal mereset perataan agar hasil dari konfigurasi berbeda tidak bercampur. Setiap hasil dengan kanal yang berkurang/kualitas terbatas bersifat sementara, tidak melatih baseline, tidak memicu heuristik microsleep, dan tidak masuk agregat/CSV bersih manajemen. Jika seluruh kanal buruk, tidak ada indeks baru. Parameter tersebut merupakan pilihan rekayasa prototipe, belum divalidasi terhadap rekaman Athena fisik dan bukan batas diagnostik.

Klasifikasi Normal/Waspada/Berisiko/Kritis memakai aturan FI/CLI yang sudah ada, bukan model ML yang dilatih ulang. Selama kalibrasi, klasifikasi ditandai sementara. Pipeline v4 menyimpan baseline pada `nt-muse-baseline-v4:` per anggota; baseline versi sebelumnya diabaikan tanpa dihapus, sehingga kalibrasi bersih perlu diulang. Prinsip detrending dan pengecualian sensor buruk mengacu pada [contoh BrainFlow](https://brainflow.readthedocs.io/en/stable/Examples.html) dan [penanganan bad channels MNE](https://mne.tools/stable/auto_tutorials/preprocessing/15_handling_bad_channels.html); rujukan ini tidak memvalidasi ambang atau akurasi klasifikasi aplikasi.

Driver memilih protokol berdasarkan karakteristik GATT yang tersedia. Muse klasik memakai preset `p21`, EEG 12-bit per sensor dan telemetri `273e000b` bila tersedia. Muse S Athena memakai preset `p1045`, karakteristik gabungan `273e0013`/`273e0014`, dan EEG 14-bit; tidak memerlukan karakteristik baterai model lama. Hanya TP9/AF7/AF8/TP10 yang diteruskan ke DSP, tetap 256 Hz. Sensor optik/IMU dilewati sesuai panjang paket, bukan dipakai sebagai EEG. Pairing Athena memerlukan beberapa detik untuk handshake. Implementasi mengacu pada [OpenMuse](https://github.com/DominiqueMakowski/OpenMuse) dan [BlueMuse](https://github.com/kowalej/BlueMuse).

Pesan `No Characteristics matching UUID 273e000b...` pada Athena berarti versi driver lama masih meminta telemetri klasik. Setelah pembaruan Hosting, gunakan Ctrl+Shift+R untuk memuat driver terbaru, tutup aplikasi Muse di HP/komputer lain, nyalakan ulang headband, lalu hubungkan kembali melalui website. Status tersambung menandakan koneksi GATT, sedangkan status kalibrasi di Live memastikan EEG sudah diterima dan diproses.

Decoder Athena membatasi pembacaan pada panjang paket, menolak paket terpotong/tidak dikenal, serta memulai ulang jendela DSP setelah jeda EEG lebih dari 250 ms. Indeks paket gabungan menghitung berbagai sensor dan tidak diperlakukan sebagai indeks EEG klasik. Deteksi kehilangan sampel Athena masih berdasarkan jeda kedatangan/paket rusak; kontinuitas timestamp perangkat dan kehilangan paket singkat perlu divalidasi dengan rekaman headband fisik. Tes otomatis menggunakan paket sintetis untuk kedua format EEG dan alur GATT → DSP → history, bukan bukti kompatibilitas seluruh versi firmware.

Pengujian otomatis belum memvalidasi headband fisik. HRV masih berupa proxy; indeks fatigue/microsleep memakai heuristik yang belum divalidasi untuk keputusan keselamatan kerja.

## Pemakaian melalui ponsel

1. Pekerja membuka `https://neurotech-id.web.app` di **Chrome Android**, masuk dengan akun pekerja yang sudah menjadi anggota perusahaan, lalu membuka area pribadi. Chrome di iPhone/iPad belum mendukung koneksi Bluetooth website; perangkat tersebut tetap dapat dipakai membaca hasil. Lihat [dukungan perangkat Chrome](https://support.google.com/chrome/answer/6362090).
2. Nyalakan Bluetooth, nyalakan Muse dengan tombol fisiknya, pakai dengan kontak sensor yang baik, lalu tutup aplikasi lain yang memakai alat. Pilih **Hubungkan Muse** pada kartu di beranda pekerja dan pilih perangkat. Tombol ini menjalankan pairing serta memulai streaming EEG lalu membuka Live; website tidak menyalakan perangkat yang mati. Setelah terhubung, tombol berubah menjadi **Buka Live**. Browser yang tidak mendukung BLE menampilkan petunjuk; tidak berpindah otomatis ke demo. Simulasi harus dipilih secara eksplisit lewat **Opsi koneksi**.
3. Buka **Live**, periksa kualitas sensor dan tunggu kalibrasi. Panel sesi membedakan paket diterima, hasil bersih, dan hasil terbatas. Indeks/klasifikasi tetap memakai heuristik prototipe yang dijelaskan di atas.
4. Opsional: aktifkan **Jaga layar tetap menyala** jika tersedia. Screen Wake Lock hanya diminta saat Muse tersambung dan halaman terlihat, dilepas saat terputus/tersembunyi/akun berubah, lalu diminta ulang ketika kembali. Izin dapat ditolak browser atau mode hemat baterai. Tetap buka halaman; sistem operasi dapat menghentikan Bluetooth/timer saat layar dikunci atau browser berada di latar belakang. Website ini tidak menjamin perekaman saat ponsel terkunci.
5. Ringkasan sesi dikirim otomatis sekitar setiap satu menit, tanpa tombol Kirim sekarang pada beranda atau Live. Pilih **Akhiri sesi** di Live untuk menutup sesi, mencoba pengiriman hasil, dan memutus Muse. Periksa status tersinkron sebelum menutup browser; menutup paksa aplikasi tidak menjamin kiriman terakhir berhasil. Salinan IndexedDB dicoba setiap 10 detik dan saat visibilitas berubah, sehingga gangguan mendadak masih dapat menghilangkan ekor data yang belum tersimpan. Saat offline, salinan yang tersimpan dicoba kembali saat online/membuka akun yang sama.
6. Supervisor/manajemen masuk ke akun pada **perusahaan yang sama** melalui perangkat masing-masing. Ringkasan perusahaan, daftar pekerja, dan laporan memakai arsip Firebase yang sama, diperbarui otomatis setelah kiriman pekerja berhasil. Evaluasi staf kembali terlihat pada arsip pribadi pekerja. Tidak perlu menghubungkan alat ke perangkat staf. Listener mengikuti aturan akses dan dibatasi 60 arsip terbaru.

Tampilan aplikasi mengikuti lebar layar sampai 900 px, dengan navigasi pekerja tetap di bawah, tab staf bergeser horizontal, formulir berukuran sentuh, dan tabel/grafik rinci yang dapat digeser di dalam kartunya. Status jam/baterai ponsel tiruan disembunyikan pada layar kecil. Navigasi akun nyata menyediakan Beranda, Live, Audio, Riwayat, dan Profil; menu Kondisi yang sebelumnya menduplikasi Beranda dikeluarkan dari navigasi akun nyata. CSV ringkasan/per menit tetap tersedia. Penambahan frekuensi sinkron dan listener memakai kuota baca/tulis Firestore Spark; kapasitas perlu dihitung dari jumlah pekerja, sesi, serta dashboard yang aktif.

Snapshot sebelum perubahan mobile tersedia di `.tools/checkpoints/mobile-2026-10-15T18-25-15-418Z/`; `node .tools/checkpoints/mobile-2026-10-15T18-25-15-418Z/restore.cjs` memeriksa rencana pengembalian, dan `--apply` mengembalikan file jika tidak ada edit baru sesudah checkpoint. Deploy Hosting diperlukan untuk menerapkan pengembalian ke website publik. Folder `.tools` tidak diterbitkan.

Beranda pekerja kini diringkas menjadi kartu koneksi, tiga indeks sesi terakhir, dan formulir tidur yang dapat dibuka. Petunjuk sinkronisasi dan Screen Wake Lock tersedia melalui **Opsi sesi**. Kontrol Muse berada langsung di halaman pekerja, menggantikan kontrol yang sama di header luar. Tombol **Hubungkan Muse** membuka Live setelah pairing berhasil; tombol **Buka Live** pada sesi tersambung tidak memutus alat atau menjalankan pairing ulang. Snapshot sebelum penyederhanaan ini: `.tools/checkpoints/worker-home-2026-10-15T18-43-09-530Z/`, dengan cara pemeriksaan/pengembalian `restore.cjs` yang sama. Cara menyalakan perangkat secara fisik mengikuti [panduan Muse S Athena](https://choosemuse.com/blogs/news/muse-s-athena-starter-guide).

## Supervisor dan perhitungan EEG v4

Overview supervisor berisi empat KPI, tren FI per hari, pembagian hasil sesi pekerja, dan ringkasan tindak lanjut. Grafik tidak mengisi hari kosong dengan angka buatan; satu hari hanya menghasilkan satu titik. Semua kartu mengikuti periode yang dipilih; pembagian kondisi memakai sesi terakhir masing-masing pekerja pada periode itu. KPI rerata FI dan grafik adalah rerata semua hasil bersih, termasuk fase kalibrasi, sedangkan kesimpulan menggunakan kebijakan pascakalibrasi berikut. Sesi staf pribadi tetap masuk agregat arsip perusahaan, dengan label Anggota dengan sesi; pembagian pekerja hanya memakai anggota berperan pekerja. Info sinkronisasi/metode dapat dibuka melalui Info data. Laporan staf tidak lagi menampilkan panduan pairing atau tombol memulai pengukuran; pengukuran pribadi tersedia di area Pekerja. Kolom HRV/Readiness yang tidak diukur dikeluarkan dari tabel anggota nyata.

- Daya pita dihitung dari periodogram satu sisi yang dinormalisasi oleh sampling rate dan energi jendela Hamming. PSD memiliki skala µV²/Hz dan integral pita memiliki skala µV². Batas tidak tumpang tindih: delta [1,4), theta [4,8), alpha [8,13), beta [13,30), gamma [30,45] Hz. Uji sinyal sintetis membandingkan keluaran FFT dengan DFT langsung dan energi sinus yang diketahui. Ini uji matematika implementasi, bukan validasi headband/manusia.
- Baseline memakai 120 hasil dari keempat kanal yang bersih. Kalibrasi harus dilakukan saat terjaga, mata terbuka, dan tenang. Rasio fallback tidak lagi menghalangi pembentukan baseline atau memicu microsleep. Akhir kalibrasi mereset perataan/status dan menunggu jendela berikutnya agar nilai fallback tidak terbawa ke hasil terkalibrasi. Baseline disimpan per perusahaan/anggota pada key v4, menyertakan versi, sampling rate, panjang jendela, protokol, serta waktu. Baseline yang lebih dari 24 jam atau tidak cocok dengan protokol/pipeline memerlukan kalibrasi baru. Umur 24 jam adalah kebijakan rekayasa, bukan interval kalibrasi yang telah diuji klinis. **Kalibrasi ulang** tersedia pada Opsi sesi pekerja dan detail sinyal manajemen. Key lama tidak dihapus.
- FI/EI tetap merupakan rasio resiprokal; bukan dua bukti kondisi yang independen. CLI memakai theta frontal/alpha temporal-belakang. Pemetaan logaritmik 0–100 dan ambang kategori masih heuristik, bukan probabilitas kelelahan atau model yang sudah dilatih pada pekerja.
- Deteksi indikasi microsleep mensyaratkan baseline pribadi yang valid, seluruh kanal berkualitas baik, peningkatan theta/alpha, penurunan beta relatif tanpa pembulatan, dan tiga hasil berturut-turut. Jeda antarhasil >1,5 detik memutus rangkaian; tiga jendela dua detik yang tumpang tindih bukan tiga konfirmasi independen dan bukan ukuran durasi kejadian. Artefak, paket hilang, dan sinyal datar tetap memutus rangkaian. Perlu pembanding penilaian ahli/EEG-EOG atau perilaku untuk mengukur alarm palsu dan kejadian terlewat; lihat [contoh penelitian microsleep](https://arxiv.org/abs/2009.03027). Dasar rasio engagement tidak memvalidasi kebalikannya sebagai kelelahan: [Pope dkk.](https://pubmed.ncbi.nlm.nih.gov/7647180/).
- Kesimpulan arsip versi v4 memerlukan minimal **30 hasil dari menit yang seluruhnya pascakalibrasi** dan proporsi hasil bersih **≥60%**. Kedua batas adalah kebijakan prototipe yang perlu divalidasi. Menit campuran kalibrasi/pengukuran dikecualikan karena jumlah indeksnya tidak disimpan terpisah; tidak ditebak proporsinya. Sesudah kalibrasi mungkin perlu melanjutkan perekaman hingga ada menit yang memenuhi syarat. Dengan hasil cukup, FI/CLI terkalibrasi menghasilkan Indeks sesi rendah / Perlu dipantau / Perlu evaluasi / Prioritas tinjauan. Indikasi microsleep menaikkan prioritas tinjauan. Tanpa bukti memadai, hasilnya Belum cukup data / Kualitas terbatas, bukan Normal. Ini kesimpulan sesi tersimpan, bukan jaminan kondisi pekerja saat ini.
- Sesi baru disimpan dengan `algorithmVersion: eeg-heuristic-v4`. Rules menerima v3 dan v4 dengan versi tetap tidak boleh diubah setelah sesi dibuat. Arsip v3 tetap dapat dibuka/diekspor, tetapi ditandai **Perlu sesi baru** untuk kesimpulan baru: sinyal mentah tidak disimpan sehingga spektrum lama tidak dapat dihitung ulang. Laporan halaman dan PDF memakai aturan kesimpulan yang sama; angka rerata arsip/CSV tetap menyertakan seluruh hasil bersih beserta jumlah hasil sementara.

Rilis v4 memerlukan deploy Rules sebelum Hosting, tanpa Cloud Functions/penagihan baru. Snapshot sebelum perubahan supervisor/kalibrasi: `.tools/checkpoints/supervisor-calibration-2026-10-15T19-00-17-560Z/`. Jalankan `restore.cjs` di folder tersebut untuk memeriksa pengembalian, tambahkan `--apply` bila hendak mengembalikan file (menolak menimpa edit setelah checkpoint). Bila mengembalikan rilis, hentikan sesi v4 dahulu dan deploy kembali Rules/Hosting yang sesuai; jangan menerbitkan rules v3 saja sementara klien v4 masih aktif.


### Pendaftaran pekerja melalui tautan undangan

Perusahaan baru memakai kode pendek seperti B-K7R2NX (enam karakter acak yang mudah dibaca). Kode lama tetap berlaku; kode saja tidak memberi akses data. Akun aktif dapat login dengan email dan password tanpa mengisi kode.

Pemilik tidak perlu memasukkan email pekerja saat membuat perusahaan. Setelah pembuatan perusahaan, atau melalui area Supervisor > Pekerja, pilih Buat tautan undangan lalu Salin tautan/Bagikan. Pekerja membuka tautan, mengisi nama/email/password sendiri, memverifikasi email dan kembali menekan Saya sudah verifikasi. Tidak ada persetujuan manual; role tautan selalu pekerja. Peningkatan role tetap hanya oleh pemilik. Paket Free tetap satu pengguna.

Tautan berlaku tujuh hari dan bisa dicabut di panel yang sama. Siapa pun yang memegang tautan dapat bergabung, jadi bagikan hanya kepada tim. Cabut mencegah pendaftaran berikutnya; akses anggota yang sudah bergabung dicabut melalui Hapus pekerja. Pengguna yang sudah dikeluarkan tidak dapat memakai kembali tautan yang pernah dipakainya. Undangan email lama masih didukung.

Implementasi Spark memakai transaksi atomik anggota/profil, counter perusahaan, konsumsi joinLinks dan bukti joinClaims yang tidak dapat dibaca klien. Rules memeriksa verifikasi email, kedaluwarsa, pencabutan, role pekerja, kuota, UID/email dan keanggotaan perusahaan. Token acak 256 bit hanya berada pada tautan dan dokumen undangan/bukti; tidak disimpan dalam roster pekerja atau laporan CSV.

### Android: loading tanpa dialog perangkat

Samsung Internet mendokumentasikan dukungan Web Bluetooth, sehingga masalah ini tidak otomatis berarti seluruh Samsung Browser tidak didukung. Coba versi browser terbaru, nyalakan Bluetooth dan periksa izin Perangkat di sekitar untuk browser jika pengaturan itu tersedia. Buka website HTTPS langsung di Chrome Android sebagai pembanding, bukan melalui browser di dalam aplikasi pesan. Nyalakan Muse dengan tombol fisik, dekatkan, dan tutup aplikasi/perangkat lain yang sedang memakai Muse.

Tombol Hubungkan Muse memanggil chooser langsung dari klik pengguna. UI menampilkan tahap pilihan perangkat/GATT/layanan/sensor/stream, tombol Batalkan koneksi, dan petunjuk setelah sepuluh detik. Membatalkan mengabaikan hasil chooser lama dan memungkinkan percobaan baru; browser tetap mengendalikan penutupan dialog native. Tidak pernah otomatis beralih ke demo ketika BLE gagal. Uji otomatis memakai radio simulasi; keberhasilan HP + Muse nyata masih harus dikonfirmasi pada perangkat.


### Aplikasi pekerja di HP (PWA)

Buka https://neurotech-id.web.app/?app=worker#/app dari Chrome Android. Tekan Pasang; jika dialog belum tersedia, gunakan menu browser > Instal aplikasi atau Tambahkan ke layar utama. Tombol Pasang juga tersedia pada beranda dan profil pekerja. Setelah dipasang, ikon NeuroTech membuka area pekerja dalam jendela aplikasi. Pengguna yang belum login diarahkan ke login; aturan role dan perusahaan tetap berlaku. Di iPhone, pemasangan dilakukan lewat Safari > Bagikan > Tambahkan ke Layar Utama; pengukuran Muse melalui Web Bluetooth tetap memerlukan browser/perangkat yang mendukungnya, seperti Chrome Android.

Manifest memiliki identitas tetap, start_url pekerja, mode standalone, ikon PNG 192/512 dan maskable, serta shortcut Live dan Riwayat. Service worker hanya menyimpan aset statis dari daftar build. Tidak menyimpan respons Firebase/Auth/AI, laporan pribadi atau EEG dalam CacheStorage. Arsip sesi tetap dikelola IndexedDB dan Firestore yang sudah ada. Membuka ulang aplikasi saat internet mati menampilkan halaman pemulihan; login dan sinkronisasi memerlukan internet.

Pembaruan mengantre sampai semua jendela lama ditutup, atau pengguna memilih Perbarui aplikasi saat Muse terputus dan tidak ada sesi arsip aktif. Tidak ada reload otomatis selama pengukuran. Setelah update disetujui, aplikasi memuat ulang versi baru dan cache aset lama dibersihkan. Service worker dan manifest dikirim dengan Cache-Control: no-cache; berkas JS/CSS ber-hash tetap immutable.

Uji lokal: npm.cmd run preview kemudian buka http://localhost:8000/?app=worker#/app. Pemasangan memerlukan konteks aman (HTTPS atau localhost) dan ketersediaan fitur browser. PWA tidak menjanjikan pemantauan Bluetooth saat aplikasi ditutup atau HP terkunci; tetap buka aplikasi selama sesi dan gunakan opsi jaga layar menyala bila tersedia.
