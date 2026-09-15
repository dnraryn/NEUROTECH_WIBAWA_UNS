# NeuroTech SMK3 — Rancangan Sistem (v2)

Platform **Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3)** untuk perusahaan,
dengan modul unggulan **Ergonomi Kognitif berbasis EEG** (mental fatigue, cognitive load,
microsleep). _"better life, better mind"_

- Acuan regulasi: **PP No. 50 Tahun 2012** (penerapan SMK3, 5 tahap, 12 elemen / 166 kriteria
  audit), **UU No. 1 Tahun 1970**, **Permenaker No. 5 Tahun 2018** (K3 lingkungan kerja,
  termasuk faktor ergonomi & psikologi).
- Teknologi: **HTML + CSS + JavaScript murni** (ES module, tanpa build step),
  **Firebase Auth + Cloud Firestore + Hosting** (paket Spark, tanpa Cloud Functions).
- Target: **produk yang dipakai perusahaan sungguhan** → keamanan multi-tenant ditegakkan di
  Firestore Rules, tanpa data simulasi di dashboard produksi, setiap aksi penting tercatat.

Prototipe v1 (demo lomba) disimpan di `backup/v1-prototype/`.

---

## 1. Peta SMK3 → Modul

| Tahap PP 50/2012 | Modul | Elemen audit | Fase |
|---|---|---|---|
| 1. Penetapan kebijakan K3 | Kebijakan K3, struktur P2K3 | 1 | 5 |
| 2. Perencanaan K3 | **Register Risiko (HIRADC)**, daftar regulasi, sasaran & program K3 | 2, 3 | 2 |
| 3. Pelaksanaan rencana K3 | **🧠 Ergonomi Kognitif (EEG)**, pelatihan & kompetensi, pengendalian dokumen, APD, tanggap darurat | 4, 5, 6, 9, 12 | 1 (EEG), 5 |
| 4. Pemantauan & evaluasi | **Insiden & Near Miss**, inspeksi, KPI K3, riwayat EEG | 7, 8, 10 | 2, 3 |
| 5. Peninjauan & peningkatan | **CAPA**, audit internal 166 kriteria, tinjauan manajemen | 8, 11 | 2, 4 |

### Integrasi modul EEG (pembeda produk)
```
EEG alert kritis / microsleep ──► Near Miss (otomatis) ──► CAPA
Tren fatigue per jabatan      ──► skor Register Risiko (bahaya "kelelahan mental")
Riwayat sesi & ringkasan      ──► bukti audit elemen 6, 7, 10 + laporan periodik
```

### Fase pengerjaan
| Fase | Isi | Status |
|---|---|---|
| 1. Fondasi | Auth, perusahaan multi-tenant, anggota & peran dengan persetujuan, Firestore Rules, log aktivitas, app shell, modul EEG (heartbeat, riwayat per menit, ringkasan sesi, alert + tindak lanjut) | ✅ |
| 2. MVP SMK3 | Insiden & near miss (5 Why), CAPA (penugasan → bukti → verifikasi), Register Risiko HIRADC (matriks 5×5, hierarki pengendalian, risiko sisa), EEG kritis → near miss otomatis | ✅ |
| 3. Pemantauan | Inspeksi (template, jadwal, temuan → CAPA), KPI (LTIFR, severity rate, CAPA, inspeksi), agregat EEG anonim bulanan, laporan cetak/PDF | ✅ |
| 4. Audit & tinjauan | Audit 166 kriteria resmi Lampiran II PP 50/2012 (skor & kategori temuan otomatis), tinjauan manajemen Pasal 15 | ✅ |
| 5. Pelengkap | Kebijakan K3 (pengesahan pimpinan, versi, konfirmasi baca), P2K3, pelatihan & matriks kompetensi, pengendalian dokumen & revisi | ✅ |

Catatan cakupan: APD dan tanggap darurat tidak dibuat sebagai modul tersendiri — rencana tanggap darurat dikelola sebagai jenis dokumen, pelatihan/simulasi darurat sebagai kategori pelatihan, dan pemeriksaan APD sebagai butir template inspeksi.


---

## 2. Peran (per perusahaan)

| Kode | Nama | Ringkas hak |
|---|---|---|
| `admin` | Admin Perusahaan | Semua; kelola anggota, peran, pengaturan, kode undangan |
| `ahli_k3` | Ahli K3 / P2K3 | Kelola seluruh modul SMK3; lihat monitoring EEG tim |
| `supervisor` | Supervisor | Monitoring EEG tim & tindak lanjut alert; lapor insiden; kerjakan CAPA yang ditugaskan |
| `manajemen` | Manajemen | Dashboard & laporan **agregat**; tinjauan manajemen; **tidak** melihat data EEG individu |
| `auditor` | Auditor Internal | Hanya-baca modul SMK3 + log aktivitas; modul audit |
| `pekerja` | Pekerja | Monitoring EEG diri sendiri; lapor insiden/near miss; lihat data miliknya |

**Prinsip non-punitif & privasi** ditegakkan di **Rules**, bukan hanya tampilan:
data EEG individu hanya bisa dibaca oleh pemiliknya, `supervisor`, `ahli_k3`, dan `admin`.

### Alur keanggotaan
```
Daftar/Masuk ──► users/{uid} ada companyId?
   ├─ tidak ──► Onboarding
   │     ├─ Buat perusahaan ──► jadi `admin` (aktif), kode undangan dibuat
   │     └─ Gabung dengan kode ──► member `pending` (peran default pekerja)
   │                                   └─ Admin menyetujui + menetapkan peran ──► `active`
   └─ ya ──► member status
         ├─ pending  ──► layar "menunggu persetujuan" (bisa batalkan)
         ├─ disabled ──► layar "akses dinonaktifkan"
         └─ active   ──► App (menu sesuai peran)
```
Pengguna **tidak dapat** memilih/mengubah perannya sendiri. Pemilik perusahaan tidak dapat
dinonaktifkan atau diturunkan perannya.

---

## 3. Model Data Firestore

```
users/{uid}
  name, email, companyId|null, createdAt, updatedAt

companyCodes/{CODE}                     # lookup kode undangan (get saja, tidak bisa di-list)
  companyId, createdAt

companies/{cid}
  name, sector, address, code, ownerUid, createdAt, updatedAt

companies/{cid}/members/{uid}           # SUMBER KEBENARAN peran
  uid, name, email, role, status: pending|active|disabled,
  position, department, shift, joinedAt, updatedAt, approvedBy

companies/{cid}/auditLogs/{id}          # append-only
  actorUid, actorName, action, entity, entityId, summary, at

companies/{cid}/eegSessions/{sid}
  uid, name, position, department, shift, source: sim|muse,
  active, baseline{fi,cli,ei}, latest{fi,cli,ei,hrv,stress,readiness,signal,ts},
  status, microsleepCount, startedAt, lastSeenAt, endedAt,
  summary{ durationMin, avgFi, maxFi, avgCli, avgEi, avgStress, statusMinutes{…} }

companies/{cid}/eegSessions/{sid}/minutes/{mNNNN}   # riwayat agregat per menit
  uid, m, at, fi, cli, ei, hrv, stress, worst, microsleep

companies/{cid}/eegAlerts/{aid}
  uid, name, position, sessionId, incidentId, type: microsleep|fatigue|cognitive|stress,
  severity: berisiko|kritis, message, status: open|ack|closed,
  createdAt, handledBy, handledByName, handledAt, note

companies/{cid}/incidents/{id}        type, severity, title, description, location, occurredAt/Date, lostDays,
                                      source: manual|eeg, status: dilaporkan|investigasi|selesai, investigation{…}
companies/{cid}/capa/{id}             title, type, priority, sourceType/Id/Label, assigneeUid/Name, dueDate,
                                      status: terbuka|dikerjakan|selesai|terverifikasi|dibatalkan, evidence, effective
companies/{cid}/risks/{id}            area, hazard, risk, category, position, likelihood×severity, hierarchy, residualL×S
companies/{cid}/inspectionTemplates/{id}, inspections/{id}
companies/{cid}/manhours/{YYYY-MM}    hours, workers
companies/{cid}/eegStats/{YYYY-MM}    agregat anonim (hanya bertambah): sessions, minutes, microsleep, *Min, groups{jabatan}
companies/{cid}/audits/{id}           level: awal|transisi|lanjutan, results{ "1_1_1": {r, note, capaId} }, score
companies/{cid}/reviews/{id}          inputs (snapshot KPI), triggers[a–h], areas{…}, decisions[…], status: draft|final
companies/{cid}/policies/{id}/acks/{uid}, p2k3/structure
companies/{cid}/trainings/{id}, trainingRecords/{id}
companies/{cid}/documents/{id}/revisions/{rid}
```

Catatan desain:
- **Kode undangan** 8 karakter (tanpa huruf ambigu). Keunikan dijamin Rules: `companyCodes`
  hanya bisa di-_create_, jadi tabrakan kode → ditolak → klien mencoba kode lain.
- **Tanpa Cloud Functions**, maka peran dibaca Rules via `get()` ke dokumen member.
- **EEG hemat kuota**: dokumen sesi di-update maksimal tiap 5 detik (heartbeat), riwayat
  ditulis 1 dokumen/menit. Sesi dianggap **terputus** bila `latest.ts` > 60 detik.
  Saat memulai sesi baru, sesi aktif lama milik pekerja yang sama otomatis ditutup.
- **Log aktivitas** ditulis klien (append-only, tidak bisa diubah/dihapus). Keterbatasan:
  tanpa server, klien yang nakal bisa _tidak_ menulis log. Untuk jejak yang tidak bisa
  dilewati, fase lanjutan dapat memindahkan penulisan log ke Cloud Functions (paket Blaze).

---

## 4. Struktur Aplikasi

```
public/
  index.html              landing
  login.html              masuk + lupa kata sandi
  register.html           daftar (email/Google) + verifikasi email
  onboarding.html         buat / gabung perusahaan
  app.html                APP SHELL (SPA, hash router)
  404.html
  css/style.css
  js/
    core/   firebase.js  auth.js  ui.js  router.js  context.js  audit.js  roles.js  nav.js  form.js  members.js  code.js
    eeg/    eeg-engine.js  muse.js  eeg-ui.js
    smk3/   common.js  criteria.js (166 kriteria resmi, diekstrak dari PDF JDIH Kemnaker)
    pages/  login.js  register.js  onboarding.js  app.js
    views/  dashboard.js  members.js  company.js  profile.js  audit-log.js
            eeg-self.js  eeg-team.js  eeg-alerts.js  eeg-session.js
            smk3-incidents.js  smk3-capa.js  smk3-risks.js  smk3-inspections.js  smk3-kpi.js
            smk3-audit.js  smk3-reviews.js  smk3-policies.js  smk3-trainings.js  smk3-documents.js
docs/       Panduan-Penggunaan-NeuroTech-SMK3.pdf, guide/panduan.html (sumber panduan)
tests/      rules.test.js · e2e.smoke.mjs · guide.capture.mjs · guide.build.mjs
```

- **Router**: `#/path`. Setiap view: `export default { title, roles, render(el, ctx) }` →
  mengembalikan fungsi _cleanup_ (lepas `onSnapshot`, hentikan interval).
- **Keamanan tampilan**: semua teks dari pengguna dirender lewat `esc()` / `h`-template yang
  meng-escape HTML (menutup celah XSS v1).
- **Menu** dibangun dari `nav.js` (peran + fase). Modul fase berikutnya tampil dengan label
  _Segera_ dan halaman penjelasan cakupannya.

---

## 5. Modul Ergonomi Kognitif (EEG)

- Sumber data: headband **Muse S / Muse 2** via Web Bluetooth (Chrome/Edge, HTTPS),
  atau **mode simulasi** yang ditandai jelas (untuk pelatihan/uji coba; sesi tercatat `source: sim`).
- Kalibrasi baseline: default **3 menit** (dapat diatur admin: 1–5 menit).
- 6 indeks (0–100): Fatigue, Cognitive Load, Engagement, HRV, Readiness, Stres.
- Microsleep: pola EEG kantuk + (penurunan tajam EI atau anggukan kepala).
- Status: normal / waspada / berisiko / kritis terhadap baseline personal.
- Screen Wake Lock selama sesi; deteksi Muse terputus (data basi tidak diproses).
- Alert berisiko/kritis/microsleep → `eegAlerts` → supervisor/ahli K3 menindaklanjuti
  (`open → ack → closed` + catatan). Fase 2: alert kritis otomatis membuat near miss.

> ⚠ Ambang indeks belum tervalidasi dengan data lapangan. Sebelum dipakai untuk keputusan
> operasional, lakukan studi validasi dan sesuaikan ambang di `eeg-engine.js`.
