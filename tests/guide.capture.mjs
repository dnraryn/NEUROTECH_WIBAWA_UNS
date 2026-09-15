// Skenario lengkap multi-peran di Microsoft Edge (headless) terhadap Firebase Emulator.
// Sekaligus: (1) uji end-to-end seluruh modul, (2) screenshot untuk panduan penggunaan.
// Jalankan dari root proyek:
//   GUIDE_DIR=<folder> firebase emulators:exec --only auth,firestore,hosting --project neuro-tech "node tests/guide.capture.mjs"
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:5000";
const OUT = process.env.GUIDE_DIR || "guide-shots";
mkdirSync(OUT, { recursive: true });
const errors = [];
const stamp = Date.now();
const step = (m) => console.log("•", m);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const year = new Date().getFullYear();

const browser = await chromium.launch({ channel: "msedge", headless: true });
const allPages = [];

async function user(label, { mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 860 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${label}] pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/favicon|iconify|net::ERR|ERR_BLOCKED|Failed to load resource/.test(t)) return;
    errors.push(`[${label}] console: ${t}`);
  });
  page.on("dialog", (d) => d.accept());
  await page.goto(BASE + "/login?emulator=1");
  page.label = label;
  allPages.push(page);
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "warn") errors.push(`[${label}] warn: ${m.text()}`.slice(0, 300)); });
  return page;
}

// Untuk panduan: sembunyikan toast & banner verifikasi email (efek emulator); pada tangkapan
// halaman penuh, sidebar & topbar dibuat tidak menempel agar tidak terpotong.
async function shot(page, name, { full = false, clip } = {}) {
  await wait(700);
  const css = `.toast-host,.banner{display:none!important}.reveal{opacity:1!important;transform:none!important;transition:none!important}` +
    (full ? `.sidebar{position:static!important;height:auto!important}.topbar{position:static!important}body::before,body::after{display:none!important}` : "");
  const tag = await page.addStyleTag({ content: css });
  await wait(150);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full, clip });
  await tag.evaluate((t) => t.remove());
}
const go = async (page, hash, sel = ".page-head h1") => { await page.goto(`${BASE}/app#${hash}`); await page.waitForSelector(sel, { timeout: 20000 }); await wait(500); };
const until = (page, text, timeout = 20000) => page.waitForFunction((t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()), text, { timeout });

async function fill(page, values, scope = "dialog.modal") {
  for (const [name, v] of Object.entries(values)) {
    const loc = page.locator(`${scope} [name="${name}"]`).first();
    const tag = await loc.evaluate((e) => e.tagName);
    if (tag === "SELECT") {
      const value = await loc.evaluate((e, want) => {
        const o = [...e.options].find((x) => x.value === want || x.textContent.trim().startsWith(want));
        return o ? o.value : null;
      }, String(v));
      if (value == null) throw new Error(`Opsi "${v}" tidak ada di ${name}`);
      await loc.selectOption(value);
    } else await loc.fill(String(v));
  }
}
async function submit(page) {
  await page.click("dialog.modal [data-submit]");
  await page.waitForSelector("dialog.modal", { state: "detached", timeout: 20000 });
  await wait(400);
}

async function register(page, name, email) {
  await page.goto(BASE + "/register");
  await page.fill("#name", name); await page.fill("#email", email);
  await page.fill("#password", "Rahasia123!"); await page.fill("#password2", "Rahasia123!");
  await page.click("#submit");
  await page.waitForURL(/\/onboarding/, { timeout: 20000 });
  await page.waitForSelector("#form:not(.hidden)", { timeout: 20000 });
}
async function join(page, code, position) {
  await page.fill("#code", code); await page.fill("#position", position);
  await page.click("#submit");
  await page.waitForSelector("text=Menunggu persetujuan", { timeout: 20000 });
}

try {
  /* ================= 1. Halaman publik & pendaftaran ================= */
  const admin = await user("admin");
  await admin.goto(BASE + "/"); await admin.waitForSelector(".hero h1");
  await shot(admin, "01-landing");
  await admin.goto(BASE + "/login"); await shot(admin, "02-login");
  await admin.goto(BASE + "/register");
  await admin.fill("#name", "Rina Kartika"); await admin.fill("#email", `rina${stamp}@suryamanufaktur.co.id`);
  await admin.fill("#password", "Rahasia123!"); await admin.fill("#password2", "Rahasia123!");
  await shot(admin, "03-register");
  await admin.click("#submit");
  await admin.waitForURL(/\/onboarding/); await admin.waitForSelector("#form:not(.hidden)");
  await admin.click('#seg button[data-mode="create"]');
  await admin.fill("#company", "PT Surya Manufaktur Indonesia");
  await admin.selectOption("#sector", "Manufaktur");
  await admin.fill("#address", "Kawasan Industri Jababeka, Cikarang");
  await admin.fill("#position", "HR & GA Manager");
  await shot(admin, "04-onboarding-buat");
  await admin.click("#submit");
  await admin.waitForURL(/\/app/); await admin.waitForSelector(".badge-code");
  const code = (await admin.textContent(".badge-code")).trim();
  step(`perusahaan dibuat, kode ${code}`);
  await go(admin, "/perusahaan");
  await shot(admin, "05-pengaturan-perusahaan");

  /* ================= 2. Anggota bergabung & disetujui ================= */
  const people = [
    { key: "k3", name: "Dewi Lestari", pos: "Ahli K3 Umum", role: "ahli_k3", dept: "HSE" },
    { key: "sup", name: "Andi Saputra", pos: "Supervisor Produksi", role: "supervisor", dept: "Produksi A" },
    { key: "worker", name: "Budi Santoso", pos: "Operator CNC", role: "pekerja", dept: "Produksi A", shift: "Shift Pagi" },
    { key: "mgr", name: "Hendra Wijaya", pos: "Direktur Operasional", role: "manajemen", dept: "Direksi" },
  ];
  const P = { admin };
  for (const [i, p] of people.entries()) {
    const pg = await user(p.key);
    await register(pg, p.name, `${p.key}${stamp}@suryamanufaktur.co.id`);
    if (i === 2) {
      await pg.fill("#code", code); await pg.fill("#position", p.pos);
      await shot(pg, "06-onboarding-gabung");
      await pg.click("#submit"); await pg.waitForSelector("text=Menunggu persetujuan");
      await shot(pg, "07-menunggu-persetujuan");
    } else await join(pg, code, p.pos);
    P[p.key] = pg;
  }
  await go(admin, "/anggota", 'button[data-act="approve"]');
  await shot(admin, "08-anggota-menunggu");
  for (const p of people) {
    await admin.locator("tr", { hasText: p.name }).locator('button[data-act="approve"]').click();
    await admin.waitForSelector("dialog.modal select[name=role]");
    await fill(admin, { role: p.role, department: p.dept, ...(p.shift ? { shift: p.shift } : {}) });
    if (p.key === "worker") await shot(admin, "09-modal-setujui");
    await submit(admin);
  }
  for (const p of people) await P[p.key].waitForSelector(".shell", { timeout: 30000 });
  await admin.click('#tabs button[data-tab="active"]');
  await shot(admin, "10-anggota-aktif");
  step("4 anggota disetujui dengan peran masing-masing");
  const { k3, sup, worker, mgr } = P;

  await go(admin, "/");
  await shot(admin, "11-beranda-admin");
  await go(worker, "/");
  await shot(worker, "12-beranda-pekerja");

  /* ================= 3. Kebijakan K3 & P2K3 ================= */
  await go(k3, "/smk3/kebijakan", "#newPol");
  await k3.click("#newPol");
  await k3.waitForSelector("dialog.modal textarea[name=content]");
  await fill(k3, { title: "Kebijakan Keselamatan dan Kesehatan Kerja", version: "1.0" });
  await shot(k3, "13-kebijakan-draf");
  await submit(k3);
  await go(mgr, "/smk3/kebijakan", "tr[data-id]");
  await mgr.click("tr[data-id]");
  await mgr.waitForSelector('dialog.modal [data-a="approve"]');
  await shot(mgr, "14-kebijakan-sahkan");
  await mgr.click('dialog.modal [data-a="approve"]');
  await mgr.waitForSelector("dialog.modal", { state: "detached" });
  await go(worker, "/smk3/kebijakan", "text=PERLU DIBACA");
  await shot(worker, "15-kebijakan-perlu-dibaca");
  await worker.click("tr[data-id]"); await worker.waitForSelector("dialog.modal [data-submit]");
  await submit(worker);
  step("kebijakan disahkan manajemen & dikonfirmasi pekerja");

  await k3.click('#tabs button[data-tab="p2k3"]'); await k3.waitForSelector("#editP2k3");
  await k3.click("#editP2k3"); await k3.waitForSelector("dialog.modal [name=name_0]");
  await fill(k3, { skNumber: "KEP.123/P2K3/2026", skDate: `${year}-02-01`, meetingSchedule: "Senin minggu pertama setiap bulan, 09.00",
    name_0: "Hendra Wijaya", role_0: "ketua", pos_0: "Direktur Operasional", name_1: "Dewi Lestari", role_1: "sekretaris", pos_1: "Ahli K3 Umum",
    name_2: "Andi Saputra", role_2: "anggota", pos_2: "Supervisor Produksi" });
  await submit(k3);
  await shot(k3, "16-p2k3");

  /* ================= 4. Register risiko ================= */
  await go(k3, "/smk3/risiko", "#newBtn");
  const risks = [
    { area: "Mesin CNC Line A", hazard: "Kelelahan mental operator shift panjang", risk: "Microsleep, tangan terjepit spindle", category: "kognitif", position: "Operator CNC",
      existingControls: "Istirahat 15 menit tiap 2 jam", likelihood: "4", severity: "4", hierarchy: "administrasi", additionalControls: "Monitoring EEG & rotasi tugas bila status berisiko", residualL: "2", residualS: "4", owner: "Andi Saputra" },
    { area: "Gudang bahan baku", hazard: "Tumpukan palet tinggi", risk: "Tertimpa material", category: "mekanik",
      existingControls: "Batas tinggi tumpukan 2 m", likelihood: "3", severity: "3", hierarchy: "rekayasa", additionalControls: "Rak palet permanen", residualL: "2", residualS: "3", owner: "Dewi Lestari" },
    { area: "Area pengecatan", hazard: "Uap pelarut organik", risk: "Gangguan pernapasan", category: "kimia",
      existingControls: "Masker kain", likelihood: "4", severity: "3", hierarchy: "apd", additionalControls: "Respirator organik & exhaust fan", residualL: "2", residualS: "2", owner: "Dewi Lestari" },
  ];
  for (const [i, r] of risks.entries()) {
    await k3.click("#newBtn"); await k3.waitForSelector("dialog.modal [name=area]");
    await fill(k3, r);
    if (i === 0) await shot(k3, "17-risiko-form");
    await submit(k3);
  }
  await until(k3, "Tumpukan palet tinggi");
  await shot(k3, "18-risiko-register");
  step("register risiko terisi");

  /* ================= 5. Dokumen ================= */
  await go(k3, "/smk3/dokumen", "#newDoc");
  await k3.click("#newDoc"); await k3.waitForSelector("dialog.modal [name=code]");
  await fill(k3, { code: "SOP-K3-001", type: "sop", title: "SOP Pengoperasian Mesin CNC yang Aman", version: "1.0", owner: "Dewi Lestari",
    content: "1. Tujuan\nMemastikan mesin CNC dioperasikan dengan aman.\n\n2. Langkah kerja\na. Periksa pelindung mesin sebelum mulai.\nb. Gunakan kacamata pengaman.\nc. Hentikan mesin bila status kognitif Berisiko/Kritis.",
    distribution: "Line Produksi A" });
  await shot(k3, "19-dokumen-form");
  await submit(k3);
  await k3.click("tr[data-id]"); await k3.waitForSelector('dialog.modal [data-a="review"]'); await k3.click('dialog.modal [data-a="review"]');
  await k3.waitForSelector("dialog.modal", { state: "detached" }); await until(k3, "Ditinjau");
  await k3.click("tr[data-id]"); await k3.waitForSelector('dialog.modal [data-a="approve"]'); await k3.click('dialog.modal [data-a="approve"]');
  await k3.waitForSelector("dialog.modal", { state: "detached" }); await until(k3, "Disetujui");
  await k3.click("tr[data-id]"); await k3.waitForSelector("dialog.modal .doc-content");
  await shot(k3, "20-dokumen-disetujui");
  await k3.click("dialog.modal [data-close]");
  step("dokumen draf → tinjau → disetujui");

  /* ================= 6. Pelatihan ================= */
  await go(k3, "/smk3/pelatihan", "#newTr");
  for (const t of [
    { name: "K3 Operator Mesin Produksi", category: "keahlian_khusus", validityMonths: 24, requiredForText: "Operator CNC" },
    { name: "Induksi K3 Karyawan", category: "induksi", validityMonths: 0, requiredForText: "*" },
    { name: "Tanggap Darurat & P3K", category: "tanggap_darurat", validityMonths: 12, requiredForText: "Supervisor Produksi, Operator CNC" },
  ]) { await k3.click("#newTr"); await k3.waitForSelector("dialog.modal [name=requiredForText]"); await fill(k3, t); await submit(k3); }
  for (const r of [
    { uid: "Budi Santoso", trainingId: "K3 Operator Mesin Produksi", date: `${year - 1}-10-01`, certificateNo: "SERT/KEMNAKER/0921", provider: "PJK3 Mitra Selamat" },
    { uid: "Budi Santoso", trainingId: "Induksi K3 Karyawan", date: `${year}-01-05`, provider: "Internal HSE" },
    { uid: "Andi Saputra", trainingId: "Tanggap Darurat & P3K", date: `${year - 1}-10-20`, provider: "PMI Bekasi" },
  ]) { await k3.click("#newRec"); await k3.waitForSelector("dialog.modal [name=trainingId]"); await fill(k3, r); await submit(k3); }
  await until(k3, "Budi Santoso");
  await shot(k3, "21-pelatihan-matriks");
  step("pelatihan & matriks kompetensi");

  /* ================= 7. Monitoring EEG ================= */
  await go(worker, "/eeg/saya", "#startSim");
  await worker.click("#startSim");
  await worker.waitForFunction(() => document.querySelector("#note")?.textContent.includes("Monitoring aktif"), null, { timeout: 40000 });
  await wait(5000);
  await shot(worker, "22-eeg-monitoring-saya");
  await go(sup, "/eeg/tim", ".worker-card");
  await shot(sup, "23-eeg-monitoring-tim-normal");
  for (let i = 0; i < 4; i++) { await worker.click("#fatigueBtn"); await wait(1500); }
  await sup.waitForSelector("#alerts button[data-ack]", { timeout: 45000 });
  await wait(2500);
  await shot(sup, "24-eeg-monitoring-tim-peringatan");
  await shot(worker, "25-eeg-peringatan-pekerja");
  await sup.click("#alerts button[data-ack]");
  await fill(sup, { note: "Budi diistirahatkan 15 menit dan tugas CNC dialihkan sementara ke operator cadangan." });
  await shot(sup, "26-eeg-tangani-peringatan");
  await submit(sup);
  step("peringatan EEG ditangani");

  /* ================= 8. Insiden (near miss otomatis + laporan manual) ================= */
  await go(sup, "/smk3/insiden", "tr[data-id]");
  await until(sup, "sistem EEG");
  await shot(sup, "27-insiden-daftar");

  await wait(50000); // pastikan minimal 1 menit riwayat sesi
  await worker.click("#endBtn");
  await worker.waitForFunction(() => document.querySelector("#note")?.textContent.includes("Sesi selesai"), null, { timeout: 20000 });
  await worker.waitForSelector("#history .list-item");
  const sessHref = await worker.getAttribute("#history .list-item", "href");
  await worker.goto(BASE + "/app" + sessHref); await worker.waitForSelector(".stackbar i", { timeout: 20000 });
  await shot(worker, "28-eeg-detail-sesi");
  step("sesi EEG selesai & detail sesi");

  await go(worker, "/smk3/insiden", "#reportBtn");
  await worker.click("#reportBtn"); await worker.waitForSelector("dialog.modal [name=title]");
  await fill(worker, { type: "kondisi_tidak_aman", severity: "sedang", title: "Pelindung spindle mesin CNC-03 retak", location: "Line Produksi A",
    description: "Saat pengecekan awal shift ditemukan pelindung transparan spindle CNC-03 retak di sisi kanan sehingga serpihan dapat terlempar.",
    immediateAction: "Mesin CNC-03 dihentikan dan diberi label jangan dioperasikan." });
  await shot(worker, "29-insiden-lapor");
  await submit(worker);
  await worker.waitForSelector(".page-head h1");
  const incUrl = worker.url().split("#")[1];

  await go(k3, incUrl, "#invForm");
  await fill(k3, { why1: "Pelindung spindle retak", why2: "Terkena benturan benda kerja", why3: "Benda kerja tidak dijepit sempurna", why4: "Operator baru belum paham torsi penjepitan", why5: "Instruksi kerja penjepitan belum tersedia",
    rootCause: "Belum ada instruksi kerja penjepitan benda kerja dan pemeriksaan pelindung sebelum operasi.", recommendation: "Ganti pelindung, buat IK penjepitan, dan tambahkan butir inspeksi harian." }, "#invForm");
  await k3.click('#invForm button[type="submit"]'); await until(k3, "Investigasi disimpan");
  await k3.click("#capaBtn"); await k3.waitForSelector("dialog.modal [name=assigneeUid]");
  await fill(k3, { title: "Ganti pelindung spindle CNC-03 dan buat IK penjepitan", assigneeUid: "Budi Santoso", priority: "tinggi" });
  await shot(k3, "30-capa-buat");
  await submit(k3);
  await until(k3, "Ganti pelindung spindle");
  await shot(k3, "31-insiden-investigasi", { full: true });
  step("insiden dilaporkan, diinvestigasi, CAPA dibuat");

  /* ================= 9. CAPA ================= */
  await go(worker, "/smk3/capa", "tr[data-id]");
  await shot(worker, "32-capa-tugas-saya");
  await worker.click("tr[data-id]"); await worker.waitForSelector("#progForm");
  await fill(worker, { progressNote: "Pelindung baru dipasang oleh tim maintenance. Draf IK penjepitan diserahkan ke Ahli K3.", evidence: "WO Maintenance #MT-2026-118, foto pemasangan tersimpan di folder HSE." }, "#progForm");
  await shot(worker, "33-capa-progres");
  await worker.click('#progForm button[data-status="selesai"]');
  await until(worker, "Menunggu verifikasi");
  const capaUrl = worker.url().split("#")[1];
  await go(k3, capaUrl, "#verForm");
  await fill(k3, { note: "Diperiksa di lapangan: pelindung terpasang kokoh, IK-CNC-004 sudah disetujui." }, "#verForm");
  await k3.click('#verForm button[type="submit"]'); await until(k3, "Terverifikasi");
  await shot(k3, "34-capa-terverifikasi");
  await incUrl && go(k3, incUrl, "#closeBtn");
  await k3.click("#closeBtn"); await until(k3, "Ditutup oleh");
  step("CAPA dikerjakan, diverifikasi, insiden ditutup");

  /* ================= 10. Inspeksi ================= */
  await go(k3, "/smk3/inspeksi", "#newTpl");
  await k3.click("#newTpl"); await k3.waitForSelector("dialog.modal [name=itemsText]");
  await fill(k3, { name: "Inspeksi Harian Area CNC", area: "Line Produksi A", frequency: "harian",
    itemsText: "Pelindung mesin terpasang dan tidak retak\nTombol emergency stop berfungsi\nAPAR tersedia dan belum kedaluwarsa\nJalur evakuasi bebas hambatan\nOperator memakai kacamata pengaman" });
  await shot(k3, "35-inspeksi-template");
  await submit(k3);
  await go(sup, "/smk3/inspeksi", "[data-start]");
  await shot(sup, "36-inspeksi-jadwal");
  await sup.click("[data-start]"); await sup.waitForSelector(".ck-item");
  const items = sup.locator(".ck-item");
  const n = await items.count();
  for (let i = 0; i < n; i++) await items.nth(i).locator(i === 3 ? "label.radio.tidak" : "label.radio.ok").click();
  await items.nth(3).locator(".ck-note").fill("Palet menghalangi pintu darurat sisi timur");
  await shot(sup, "37-inspeksi-checklist");
  await sup.click('button[data-act="finish"]'); await sup.waitForSelector("dialog.modal [data-submit]");
  await shot(sup, "38-inspeksi-selesai-capa");
  await submit(sup);
  await until(sup, "Diselesaikan");
  step("inspeksi dengan temuan → CAPA");

  /* ================= 11. KPI ================= */
  await go(k3, "/smk3/kpi", "#tabs");
  await k3.click('#tabs button[data-tab="jam"]'); await k3.waitForSelector("[data-save]");
  const nowMonth = new Date().getMonth() + 1;
  for (let m = 1; m <= nowMonth; m++) {
    const id = `${year}-${String(m).padStart(2, "0")}`;
    const row = k3.locator(`tr[data-m="${id}"]`);
    await row.locator('[name="workers"]').fill(String(118 + (m % 4)));
    await row.locator('[name="hours"]').fill(String(20500 + m * 130));
    await row.locator(`[data-save="${id}"]`).click();
    await until(k3, `Jam kerja ${id} disimpan`);
  }
  await shot(k3, "39-kpi-jam-kerja");
  step("jam kerja bulanan diisi");

  /* ================= 12. Audit SMK3 ================= */
  await go(k3, "/smk3/audit", "#newBtn");
  await k3.click("#newBtn"); await k3.waitForSelector("dialog.modal [name=level]");
  await fill(k3, { title: `Audit Internal SMK3 Semester II ${year}`, level: "awal", auditors: "Dewi Lestari (Lead), Andi Saputra", scope: "Seluruh area produksi dan gudang" });
  await shot(k3, "42-audit-baru");
  await submit(k3);
  await k3.waitForSelector("details.element select[data-field=r]");
  const selects = k3.locator("details.element[open] select[data-field=r]");
  const cnt = await selects.count();
  for (let i = 0; i < cnt; i++) { await selects.nth(i).selectOption(i === 2 ? "minor" : "sesuai"); await wait(150); }
  await wait(1500);
  await k3.locator("details.element[open] .crit.minor input[data-field=note]").first().fill("Kebijakan belum dikomunikasikan ke kontraktor dan pemasok");
  await wait(1500);
  await shot(k3, "43-audit-penilaian");
  await k3.click("#finishBtn");
  await until(k3, "Audit diselesaikan");
  await go(k3, "/smk3/audit", "tr[data-id]");
  await shot(k3, "44-audit-daftar");
  step("audit SMK3 (tingkat awal) dinilai & diselesaikan");

  await go(k3, "/smk3/kpi", ".metrics.kpi");
  await until(k3, "Audit Internal SMK3");
  await shot(k3, "40-kpi-ringkasan", { full: true });
  await k3.click('#tabs button[data-tab="laporan"]'); await k3.waitForSelector(".report");
  await k3.emulateMedia({ media: "print" });
  await shot(k3, "41-kpi-laporan-cetak", { full: true });
  await k3.emulateMedia({ media: "screen" });
  step("KPI & laporan");

  /* ================= 13. Tinjauan manajemen ================= */
  await go(mgr, "/smk3/tinjauan", "#newBtn");
  await mgr.click("#newBtn"); await mgr.waitForSelector("dialog.modal [name=title]");
  await fill(mgr, { title: `Tinjauan Manajemen SMK3 Semester II ${year}`, chair: "Hendra Wijaya", participants: "Hendra Wijaya, Rina Kartika, Dewi Lestari, Andi Saputra, perwakilan pekerja" });
  await submit(mgr);
  await mgr.waitForSelector("#pullBtn"); await mgr.click("#pullBtn"); await until(mgr, "Data masukan diperbarui");
  await mgr.locator("[name=t_f]").check(); await mgr.locator("[name=t_h]").check();
  await fill(mgr, { a_kebijakan: "Kebijakan K3 v1.0 masih sesuai; perlu dikomunikasikan ke kontraktor (temuan audit 1.1.3).",
    a_pemantauan: "Terdapat peringatan microsleep pada operator CNC shift pagi. Data EEG menunjukkan risiko kelelahan perlu dikendalikan.",
    a_peningkatan: "Seluruh CAPA insiden spindle CNC-03 telah diverifikasi efektif." }, "#rvForm");
  await mgr.click('#rvForm button[type="submit"]'); await until(mgr, "Tersimpan");
  await mgr.click("#decBtn"); await mgr.waitForSelector("dialog.modal [name=pic]");
  await fill(mgr, { text: "Terapkan rotasi tugas operator CNC setiap 2 jam dan evaluasi data EEG bulanan.", pic: "Andi Saputra" });
  await submit(mgr);
  await until(mgr, "Terapkan rotasi tugas");
  await shot(mgr, "45-tinjauan-manajemen", { full: true });
  step("tinjauan manajemen");

  /* ================= 14. Log, profil, mobile ================= */
  await go(admin, "/log", "table.tbl tbody tr");
  await until(admin, "Memverifikasi CAPA");
  await shot(admin, "46-log-aktivitas");
  await go(worker, "/profil");
  await shot(worker, "47-profil");
  await go(sup, "/smk3/capa", "#tabs");
  await shot(sup, "48-capa-daftar-supervisor");

  const mobile = await user("mobile", { mobile: true });
  await mobile.goto(BASE + "/login");
  await mobile.fill("#email", `worker${stamp}@suryamanufaktur.co.id`); await mobile.fill("#password", "Rahasia123!");
  await mobile.click("#submit"); await mobile.waitForSelector(".shell", { timeout: 20000 });
  await go(mobile, "/eeg/saya");
  await shot(mobile, "49-mobile-monitoring");
  await mobile.click("#menuBtn"); await mobile.waitForSelector("body.menu-open");
  await shot(mobile, "50-mobile-menu");
  step("log, profil, tampilan mobile");
} catch (e) {
  errors.push("GAGAL: " + (e.stack || e.message).split("\n").slice(0, 3).join(" | "));
  for (const pg of allPages) {
    try {
      await pg.screenshot({ path: `${OUT}/zz-gagal-${pg.label}.png` });
      errors.push(`[${pg.label}] url=${pg.url()} toast=${await pg.evaluate(() => [...document.querySelectorAll(".toast")].map((t) => t.textContent).join(" / "))}`);
    } catch {}
  }
} finally {
  await browser.close();
}

if (errors.length) { console.log("\nMASALAH:"); errors.forEach((e) => console.log("  - " + e)); process.exit(1); }
console.log("\nSELESAI — seluruh skenario lulus tanpa error JavaScript.");
