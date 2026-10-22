# Verifikasi NeuroTech sebelum penggunaan lapangan

Status: perangkat asli dan akurasi klasifikasi pekerja belum diverifikasi dari lingkungan pengembangan ini. Lulus tes sintetis bukan bukti akurasi fatigue atau microsleep.

## Pemeriksaan perangkat lunak

Jalankan `npm.cmd run validate:eeg`. Laporan lokal `.tools/eeg-validation-report.json` mencatat waktu, commit, cakupan dan hasil tes tanpa identitas pengguna. Laporan ini diabaikan Git dan tidak ikut deploy. Tes meliputi decoding paket classic/Athena, kanal, batas paket, FFT versus DFT, baseline, saturasi, sinyal datar dan penolakan artefak. Jalankan juga `npm.cmd test` dan `npm.cmd run test:security`.

Tes IndexedDB browser asli: `npm.cmd run test:storage`. Persiapan opsional: `npm.cmd install --prefix .tools/browser playwright-core`. Script memakai Edge Windows bila tersedia; untuk browser lain set `NT_BROWSER_EXECUTABLE` ke executable Chromium. Alternatifnya set `NT_PLAYWRIGHT_MODULE` ke lokasi modul Playwright yang sudah terpasang. Tes ini menjalankan server lokal sementara, menyelesaikan sesi secara offline, membuka ulang halaman, dan memeriksa pemulihan arsip serta isolasi akun. Firebase produksi tidak dipanggil. Tes browser desktop tidak membuktikan ketahanan saat HP mematikan proses.

## Uji perangkat yang perlu dilakukan tim

1. Catat model Muse, versi firmware jika tersedia, HP, OS dan browser. Masuk sebagai akun pengujian. Pastikan Muse tidak sedang tersambung ke aplikasi lain.
2. Hubungkan Muse. Selama persiapan satu menit periksa keempat kanal, umur paket, laju sampel yang diamati, amplitudo dan alasan kualitas. Paket yang masuk tidak membuktikan kontak elektroda baik. Bandingkan pemetaan kanal, urutan, laju dan skala dengan rekaman/peralatan referensi atau tools Muse yang sesuai model; jangan mengubah skala hanya agar indeks muncul.
3. Rekam duduk tenang dengan mata terbuka, kemudian gerakan normal/kedipan. Catat waktu peristiwa; ekspor diagnostik sebelum dan sesudahnya. Artefak tidak boleh berubah menjadi microsleep. Jangan melakukan uji pada tugas berbahaya atau memancing kelelahan.
4. Setelah satu menit, pastikan angka yang tersedia ditandai acuan umum bila baseline pribadi belum siap. Pastikan sensor yang ditolak tidak ikut menghitung dan Cognitive Load tetap kosong jika cakupan kanal tidak mendukung.
5. Putuskan Muse dan sambungkan ulang. Hasil lama tidak boleh menjadi hasil terkini; baseline koneksi sebelumnya tidak dipakai ulang. Uji juga kunci layar dan kembali ke aplikasi. Web Bluetooth tidak menjamin perekaman ketika aplikasi berada di latar belakang.
6. Aktifkan mode pesawat setelah satu sesi dimulai, lalu selesaikan sesi. Periksa salinan perangkat. Pulihkan internet: satu sesi yang sama harus tersinkron, tanpa duplikasi atau klaim tersimpan saat gagal. Tutup dan buka ulang browser untuk memastikan arsip yang sudah tersimpan dapat dibaca. Ini perlu diuji di HP asli; penutupan paksa dapat kehilangan ekor data yang belum tersimpan.
7. Supervisor meninjau sesi selesai yang sudah tersinkron, mencatat tindakan, pelaksanaan dan rencana pantau. Periksa ID petugas/waktu, akses pekerja sendiri, serta larangan mengubah evaluasi lama. Rencana pantau berupa catatan, bukan pengingat otomatis.

Format log lokal (simpan di `private/`, tanpa nama/email/token):

```csv
participant_code,session_code,device_model,firmware,browser,os,event_time_utc,event,expected,observed,diagnostic_file,pass_fail
```

## Validasi ilmiah yang masih diperlukan

- Tentukan dahulu target berbeda: kualitas sinyal, fatigue, cognitive load, engagement dan microsleep. Jangan menyamakan kategori indeks dengan label kondisi yang sudah terbukti.
- Diagnostik aplikasi berisi ringkasan, bukan EEG mentah; file tersebut cukup untuk audit transport/kualitas, tidak cukup untuk melatih atau membuktikan akurasi fisiologis. Perekaman referensi perlu disiapkan terpisah dengan persetujuan peserta dan identitas tersamar.
- Gunakan penilaian pembanding independen yang sesuai target. Keluhan kantuk pengguna saja bukan label pasti microsleep. Contoh penelitian microsleep memakai EEG/EOG dan penilaian ahli; prosedur itu tidak otomatis memvalidasi rasio heuristik aplikasi ini.
- Pisahkan peserta untuk pengembangan dan pengujian; jendela yang tumpang tindih dari orang/sesi yang sama tidak boleh bocor antarkelompok. Bekukan versi kode dan ambang sebelum pengujian akhir.
- Laporkan proporsi data layak, proporsi hasil sementara, sensitivitas, spesifisitas, precision/recall, alarm palsu per jam dan interval ketidakpastian. Nilai generalisasi lintas pekerja/perangkat, bukan hanya contoh yang tampak berhasil. Tetapkan kriteria penerimaan bersama ahli K3/EEG sebelum menyatakan siap dipakai untuk keputusan keselamatan.

Rujukan primer: [Muse developer tools](https://choosemuse.com/pages/developers), [Automatic Detection of Microsleep Episodes With Deep Learning](https://pmc.ncbi.nlm.nih.gov/articles/PMC8024556/). Kode BLE web NeuroTech bukan implementasi SDK resmi dan tidak mengklaim kompatibilitas firmware yang belum diuji.
