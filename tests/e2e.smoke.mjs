// Uji asap end-to-end di Microsoft Edge (headless) terhadap Firebase Emulator.
// Jalankan dari root proyek:
//   firebase emulators:exec --only auth,firestore,hosting --project neuro-tech "node tests/e2e.smoke.mjs"
import { chromium } from "playwright-core";

const BASE = "http://127.0.0.1:5000";
const stamp = Date.now();
const errors = [];
const step = (m) => console.log("•", m);
const SHOTS = process.env.SHOTS; // opsional: folder untuk screenshot
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }); };

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function newPage(label) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${label}] pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/favicon|iconify|ERR_BLOCKED|net::ERR/.test(t)) return;
    errors.push(`[${label}] console: ${t}`);
  });
  page.on("dialog", (d) => d.accept());
  await page.goto(BASE + "/login?emulator=1");
  return page;
}

async function register(page, name, email) {
  await page.goto(BASE + "/register");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "Rahasia123!");
  await page.fill("#password2", "Rahasia123!");
  await page.click("#submit");
  await page.waitForURL(/\/onboarding/, { timeout: 20000 });
  await page.waitForSelector("#form:not(.hidden)", { timeout: 20000 });
}

async function expectView(page, hash, text) {
  await page.goto(BASE + "/app#" + hash);
  await page.waitForSelector(".page-head h1, .empty-state h2", { timeout: 20000 });
  if (text) await page.waitForFunction((t) => document.querySelector("#outlet")?.textContent.includes(t), text, { timeout: 15000 })
    .catch(() => {});
  const body = await page.textContent("#outlet");
  if (/Gagal memuat halaman|Akses dibatasi|Akses ditolak/.test(body)) throw new Error(`View ${hash} gagal: ${body.slice(0, 200)}`);
  if (text && !body.includes(text)) throw new Error(`View ${hash} tidak memuat teks "${text}" — isi: ${body.replace(/\s+/g, " ").slice(0, 300)}`);
}

try {
  /* ---------- admin mendaftarkan perusahaan ---------- */
  const admin = await newPage("admin");
  await register(admin, "Rina Admin", `admin${stamp}@contoh.id`);
  step("admin terdaftar");
  await admin.click('#seg button[data-mode="create"]');
  await admin.fill("#company", "PT Uji Keselamatan");
  await admin.fill("#position", "HSE Manager");
  await admin.click("#submit");
  await admin.waitForURL(/\/app/, { timeout: 20000 });
  await admin.waitForSelector("text=Halo, Rina", { timeout: 20000 });
  const code = (await admin.textContent(".badge-code")).trim();
  step(`perusahaan dibuat, kode undangan ${code}`);

  for (const [h, t] of [["/anggota", "Anggota"], ["/perusahaan", "Kode undangan"], ["/log", "Membuat perusahaan"],
    ["/profil", "Keanggotaan"], ["/eeg/tim", "Monitoring Tim"], ["/eeg/peringatan", "Peringatan EEG"],
    ["/smk3/risiko", "Register Risiko"], ["/smk3/audit", "166 kriteria"], ["/smk3/kpi", "KPI"], ["/eeg/saya", "Monitoring Saya"], ["/", "Peta Penerapan SMK3"]]) {
    await expectView(admin, h, t);
  }
  await shot(admin, "01-beranda-admin");
  step("semua halaman admin termuat");

  /* ---------- pekerja gabung dengan kode ---------- */
  const worker = await newPage("worker");
  await register(worker, "Budi Operator", `budi${stamp}@contoh.id`);
  await worker.fill("#code", code.toLowerCase());
  await worker.fill("#position", "Operator CNC");
  await worker.click("#submit");
  await worker.waitForURL(/\/app/, { timeout: 20000 });
  await worker.waitForSelector("text=Menunggu persetujuan", { timeout: 20000 });
  step("pekerja mengajukan bergabung → menunggu persetujuan");

  /* pekerja tidak bisa membuka halaman admin via URL */
  /* ---------- admin menyetujui ---------- */
  await admin.goto(BASE + "/app#/anggota");
  await admin.waitForSelector('button[data-act="approve"]', { timeout: 20000 });
  await shot(admin, "02-anggota-pending");
  await admin.click('button[data-act="approve"]');
  await admin.waitForSelector("dialog.modal select[name=role]");
  await shot(admin, "03-modal-setujui");
  await admin.selectOption("dialog.modal select[name=role]", "pekerja");
  await admin.fill("dialog.modal input[name=department]", "Produksi A");
  await admin.click("dialog.modal [data-submit]");
  await admin.waitForSelector("dialog.modal", { state: "detached", timeout: 15000 });
  step("admin menyetujui pekerja");

  await worker.waitForSelector(".shell", { timeout: 30000 });
  step("halaman pekerja terbuka otomatis setelah disetujui");
  await worker.goto(BASE + "/app#/perusahaan");
  await worker.waitForSelector("text=Akses dibatasi", { timeout: 15000 });
  const navText = await worker.textContent(".side-nav");
  if (/Anggota|Log Aktivitas|Monitoring Tim/.test(navText)) throw new Error("Menu staf tampil untuk pekerja");
  step("pekerja tidak dapat membuka menu admin/staf");

  /* ---------- sesi EEG simulasi ---------- */
  await worker.goto(BASE + "/app#/eeg/saya");
  await worker.waitForSelector("#startSim", { timeout: 15000 });
  await worker.click("#startSim");
  await worker.waitForFunction(() => document.querySelector("#note")?.textContent.includes("Monitoring aktif"), null, { timeout: 40000 });
  step("kalibrasi selesai, monitoring berjalan");

  await admin.goto(BASE + "/app#/eeg/tim");
  await admin.waitForSelector(".worker-card >> text=Budi Operator", { timeout: 20000 });
  step("supervisor/admin melihat pekerja secara real-time");

  for (let i = 0; i < 4; i++) { await worker.click("#fatigueBtn"); await worker.waitForTimeout(1500); }
  await admin.waitForSelector('#alerts button[data-ack]', { timeout: 45000 });
  await shot(admin, "04-monitoring-tim");
  await shot(worker, "05-monitoring-saya");
  step("peringatan EEG muncul di dashboard tim");
  await admin.click('#alerts button[data-ack]');
  await admin.fill("dialog.modal textarea[name=note]", "Pekerja diistirahatkan 15 menit.");
  await admin.click("dialog.modal [data-submit]");
  await admin.waitForSelector("dialog.modal", { state: "detached", timeout: 15000 });
  step("peringatan ditangani dengan catatan");

  await worker.waitForTimeout(62000); // lewati 1 menit agar riwayat per menit tertulis
  await worker.click("#endBtn");
  await worker.waitForFunction(() => document.querySelector("#note")?.textContent.includes("Sesi selesai"), null, { timeout: 20000 });
  await worker.waitForSelector("#history .list-item", { timeout: 15000 });
  step("sesi diakhiri & tampil di riwayat");

  const href = await worker.getAttribute("#history .list-item", "href");
  await worker.goto(BASE + "/app" + href);
  await worker.waitForFunction(() => document.querySelector("#metrics")?.textContent.includes("Durasi"), null, { timeout: 20000 });
  const stackbar = await worker.$(".stackbar i");
  if (!stackbar) throw new Error("Distribusi status tidak tampil pada detail sesi");
  await worker.waitForTimeout(1000); await shot(worker, "06-detail-sesi");
  step("detail sesi (ringkasan, distribusi, grafik) termuat");

  await expectView(admin, "/log", "Menangani peringatan EEG");
  step("log aktivitas mencatat persetujuan & penanganan");

  /* ---------- tampilan mobile ---------- */
  await worker.setViewportSize({ width: 390, height: 844 });
  await worker.goto(BASE + "/app#/eeg/saya");
  await worker.waitForSelector("#menuBtn", { state: "visible", timeout: 15000 });
  await worker.click("#menuBtn");
  await worker.waitForSelector("body.menu-open", { timeout: 5000 });
  await worker.waitForTimeout(400); await shot(worker, "07-mobile-menu");
  step("menu mobile berfungsi");
} catch (e) {
  errors.push("GAGAL: " + e.message);
} finally {
  await browser.close();
}

if (errors.length) { console.log("\nMASALAH:"); errors.forEach((e) => console.log("  - " + e)); process.exit(1); }
console.log("\nE2E OK — tidak ada error JavaScript.");
