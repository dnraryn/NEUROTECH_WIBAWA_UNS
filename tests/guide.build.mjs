// Membangun PDF panduan penggunaan dari docs/guide/panduan.html + screenshot.
//   node tests/guide.build.mjs <folder-screenshot-jpg>
import { chromium } from "playwright-core";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SHOTS = process.argv[2];
if (!SHOTS) { console.error("Pakai: node tests/guide.build.mjs <folder-screenshot>"); process.exit(1); }

let html = readFileSync(join(ROOT, "docs/guide/panduan.html"), "utf8");
const toData = (file) => {
  const ext = extname(file).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
};

const images = Object.fromEntries(readdirSync(SHOTS).filter((f) => /\.(jpe?g|png)$/i.test(f)).map((f) => [basename(f, extname(f)), join(SHOTS, f)]));
const missing = [];
html = html.replace(/\{\{([\w-]+)\}\}/g, (m, key) => {
  if (key === "LOGO") return toData(join(ROOT, "public/assets/logo-mark.png"));
  if (key === "DATE") return new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  if (images[key]) return toData(images[key]);
  missing.push(key); return "";
});
if (missing.length) { console.error("Screenshot tidak ditemukan:", missing.join(", ")); process.exit(1); }

const out = join(ROOT, "docs/Panduan-Penggunaan-NeuroTech-SMK3.pdf");
mkdirSync(join(ROOT, "docs"), { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: out, format: "A4", printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `<div style="width:100%;font-size:8px;color:#7a8499;padding:0 15mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial">
    <span>Panduan Penggunaan NeuroTech SMK3</span><span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span></div>`,
  margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
});
await browser.close();
console.log("PDF:", out);
