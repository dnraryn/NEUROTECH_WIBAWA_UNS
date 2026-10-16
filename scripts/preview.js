"use strict";
// Build and serve the Hosting whitelist, never private workspace files.
require("./build-hosting");
const fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const root = path.resolve(__dirname, "../.firebase/hosting-public");
const server = http.createServer((request, response) => {
  let name;
  try { name = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400).end(); return; }
  const file = path.resolve(root, "." + (name === "/" ? "/index.html" : name));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile() || !fs.realpathSync(file).startsWith(root + path.sep)) {
    response.writeHead(404).end(); return;
  }
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", /\.jsx?$/.test(file) ? "application/javascript" : /\.webmanifest$/.test(file) ? "application/manifest+json" : /\.html$/.test(file) ? "text/html; charset=utf-8" : /\.css$/.test(file) ? "text/css; charset=utf-8" : /\.png$/.test(file) ? "image/png" : "application/octet-stream");
  fs.createReadStream(file).pipe(response);
});
let port = 8000;
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && port < 8010) { port++; server.listen(port, "127.0.0.1"); }
  else { console.error("Preview gagal:", e.code); process.exitCode = 1; }
});
server.on("listening", () => console.log("Pratinjau lokal: http://localhost:" + port + "/#/landing\nPilih Coba demo → Supervisor K3 → Laporan SMK3 → Lihat contoh laporan.\nCtrl+C untuk menghentikan server."));
server.listen(port, "127.0.0.1");
