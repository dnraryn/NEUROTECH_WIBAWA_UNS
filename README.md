# NeuroTech SMK3

Platform **Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3)** sesuai PP No. 50/2012,
dengan modul unggulan **Ergonomi Kognitif berbasis EEG** (mental fatigue, cognitive load,
microsleep). _"better life, better mind"_

- Teknologi: **HTML + CSS + JavaScript murni** (tanpa build step) di atas **Firebase Auth,
  Cloud Firestore, dan Hosting**.
- Rancangan lengkap (peta SMK3, peran, model data, fase): [`DESIGN.md`](./DESIGN.md).
- Prototipe lama (v1, data di localStorage) disimpan di `backup/v1-prototype/`.

## Status

Seluruh 5 fase rancangan **selesai**: fondasi, insiden & CAPA, register risiko, inspeksi, KPI & laporan,
audit SMK3 (166 kriteria resmi), tinjauan manajemen, kebijakan & P2K3, pelatihan, dan pengendalian dokumen.

📘 **Panduan penggunaan (PDF):** [`docs/Panduan-Penggunaan-NeuroTech-SMK3.pdf`](./docs/Panduan-Penggunaan-NeuroTech-SMK3.pdf)

## Menjalankan secara lokal (emulator — tidak menyentuh data produksi)

Prasyarat: Node.js 18+, Firebase CLI (`npm i -g firebase-tools`), **Java 21+**.

```bash
firebase emulators:start --only auth,firestore,hosting --project neuro-tech
# buka http://127.0.0.1:5000/login?emulator=1   (flag tersimpan; ?emulator=0 untuk mematikan)
```

Alur uji manual:
1. `/register` → buat akun → **Daftarkan perusahaan** → Anda menjadi Admin.
2. Salin tautan/kode undangan (Beranda atau Pengaturan Perusahaan).
3. Di jendela incognito: daftar akun lain → **Gabung dengan kode** → status *menunggu persetujuan*.
4. Admin: **Anggota & Peran** → Setujui → tetapkan peran.
5. Pekerja: **Monitoring Saya** → hubungkan Muse (Chrome/Edge) atau **sesi simulasi**.
6. Admin/Supervisor: **Monitoring Tim** & **Peringatan EEG** → tangani peringatan dengan catatan.

## Pengujian otomatis

```bash
cd tests && npm install

# 1) Firestore Security Rules (46 kasus: onboarding, peran, isolasi antar-perusahaan, privasi EEG, log, modul SMK3)
npm test

# 2) End-to-end di Microsoft Edge headless (daftar → gabung → setujui → sesi EEG → peringatan)
cd ..
firebase emulators:exec --only auth,firestore,hosting --project neuro-tech "node tests/e2e.smoke.mjs"

# 3) Skenario lengkap 5 peran & semua modul + screenshot panduan, lalu bangun PDF
GUIDE_DIR=guide-shots firebase emulators:exec --only auth,firestore,hosting --project neuro-tech "node tests/guide.capture.mjs"
node tests/guide.build.mjs guide-shots
```

## Deploy ke produksi

```bash
firebase login
firebase deploy --only firestore:rules,firestore:indexes   # WAJIB lebih dulu
firebase deploy --only hosting
```

Checklist Firebase Console sebelum dipakai perusahaan:
- **Authentication → Sign-in method**: aktifkan *Email/Password* dan *Google*. Nonaktifkan *Anonymous*.
- **Authentication → Settings → Password policy**: minimal 8 karakter.
- **Authentication → Settings → Authorized domains**: domain hosting Anda.
- **Firestore → Indexes**: tunggu 3 indeks komposit berstatus *Enabled*.
- **Data lama v1** tidak kompatibel (profil v1 tersimpan di localStorage browser). Pengguna v1
  cukup masuk lagi lalu membuat/gabung perusahaan.
- **Service account** yang pernah terekspos di chat harus sudah dicabut/dirotasi di Google Cloud Console.

## Batasan yang perlu diketahui

- **Ambang indeks EEG belum tervalidasi** dengan data lapangan — posisikan sebagai alat pendukung
  keputusan, bukan diagnosis; lakukan studi validasi sebelum dipakai untuk keputusan operasional.
- Integrasi Muse (Web Bluetooth) hanya di Chrome/Edge desktop & Android via HTTPS, dan
  **belum diuji dengan perangkat fisik** pada versi ini.
- Tanpa Cloud Functions (paket Spark): log aktivitas ditulis oleh klien. Rules menjamin log tidak
  bisa diubah/dihapus dan pelaku tidak bisa dipalsukan, tetapi klien yang dimodifikasi dapat
  *tidak* menulis log. Untuk jejak audit yang tak bisa dilewati, pindahkan ke Cloud Functions (Blaze).
- Manajemen & Auditor sengaja **tidak** dapat melihat data EEG individu (privasi, non-punitif);
  analitik agregat untuk mereka dijadwalkan di Fase 3.
