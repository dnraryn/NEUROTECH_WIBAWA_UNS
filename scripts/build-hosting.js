"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, ".."), parent = path.join(root, ".firebase"), output = path.join(parent, "hosting-public");
fs.mkdirSync(parent, { recursive: true });
// This is the only directory this build owns and may clean. Reject symlinks.
if (fs.realpathSync(parent) !== parent || (fs.existsSync(output) &&
    (fs.lstatSync(output).isSymbolicLink() || fs.realpathSync(output) !== output))) throw new Error("Unsafe Hosting output directory.");
if (output !== path.join(root, ".firebase", "hosting-public")) throw new Error("Unsafe Hosting path.");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const generated = [];
function asset(stem, code, extension = "js") {
  const hash = crypto.createHash("sha256").update(code).digest("hex").slice(0, 12);
  const name = `${stem}.${hash}.${extension}`;
  fs.writeFileSync(path.join(output, name), code);
  generated.push({ name, bytes: Buffer.byteLength(code) });
  return name;
}
const vendor = ["react/umd/react.production.min.js", "react-dom/umd/react-dom.production.min.js"]
  .map((name) => fs.readFileSync(path.join(root, "node_modules", name), "utf8")).join("\n;\n");
const vendorFile = asset("react-vendor", vendor);
const tags = [...html.matchAll(/<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)><\/script>/g)];
const jsxSources = tags.filter((t) => /type="text\/babel"/.test(t[1] + t[3])).map((tag) => {
  if (!/^[A-Za-z0-9_-]+\.jsx$/.test(tag[2])) throw new Error("Unexpected JSX source.");
  // Keep the established declaration order in one production closure.
  // Explicit window exports continue serving the Bluetooth/data adapters.
  return fs.readFileSync(path.join(root, tag[2]), "utf8");
});
const appCode = esbuild.transformSync(jsxSources.join("\n;\n"), {
  loader: "jsx", format: "iife", target: "chrome100", minify: true, legalComments: "none",
}).code;
const appFile = asset("application", appCode);
let insertedApp = false, insertedVendor = false;
for (const tag of tags) {
  const source = tag[2], attributes = tag[1] + tag[3];
  let replacement;
  if (/^https:\/\/unpkg\.com\/(react@|react-dom@|@babel\/standalone@)/.test(source)) {
    replacement = insertedVendor ? "" : `<script src="${vendorFile}"></script>`;
    insertedVendor = true;
  } else if (/type="text\/babel"/.test(attributes)) {
    replacement = insertedApp ? "" : `<script defer src="${appFile}"></script>`;
    insertedApp = true;
  } else if (/^https?:/.test(source)) {
    replacement = tag[0];
  } else {
    if (!/^[A-Za-z0-9_-]+\.js$/.test(source) || source === "check-syntax.js") throw new Error("Unexpected application script.");
    const moduleScript = /type="module"/.test(attributes);
    const code = esbuild.transformSync(fs.readFileSync(path.join(root, source), "utf8"), {
      loader: "js", target: "chrome100", minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false,
      ...(moduleScript ? { format: "esm" } : {}), legalComments: "none",
    }).code;
    const file = asset(source.slice(0, -3), code);
    replacement = `<script${moduleScript ? ' type="module" async' : ""} src="${file}"></script>`;
  }
  html = html.replace(tag[0], replacement);
}
const css = esbuild.transformSync(fs.readFileSync(path.join(root, "styles.css"), "utf8"), { loader: "css", minify: true }).code;
const cssFile = asset("styles", css, "css");
html = html.replace('href="styles.css"', `href="${cssFile}"`).replace(/<!--[\s\S]*?-->/g, "").replace(/\n\s*\n/g, "\n");
if (/text\/babel|react\.development|babel\.min\.js/.test(html)) throw new Error("Development runtime in production HTML.");
fs.writeFileSync(path.join(output, "index.html"), html);
for (const name of fs.readdirSync(path.join(root, "assets"))) {
  if (!/^[A-Za-z0-9_-]+\.(?:png|svg|jpg|jpeg|webp|mp4|woff2)$/.test(name)) throw new Error("Unexpected asset file.");
  const from = path.join(root, "assets", name);
  if (fs.lstatSync(from).isSymbolicLink() || !fs.statSync(from).isFile()) throw new Error("Unexpected asset path.");
  fs.mkdirSync(path.join(output, "assets"), { recursive: true });
  fs.copyFileSync(from, path.join(output, "assets", name));
}
for (const name of ["manifest.webmanifest", "offline.html"]) {
  fs.copyFileSync(path.join(root, name), path.join(output, name));
}
// A release-specific allowlist prevents API/account data from entering CacheStorage.
const precache = ["/offline.html", "/manifest.webmanifest", "/assets/worker-app-192.png",
  "/assets/worker-app-512.png", "/assets/worker-app-maskable-512.png", ...generated.map((file) => "/" + file.name)];
const swSource = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const releaseHash = crypto.createHash("sha256").update(html).update(swSource);
for (const name of precache) releaseHash.update(fs.readFileSync(path.join(output, name.slice(1))));
const release = releaseHash.digest("hex").slice(0, 16);
const worker = swSource.replace('const RELEASE = "development";', `const RELEASE = "${release}";`)
  .replace('const STATIC_ASSETS = /* build:assets */ [];', `const STATIC_ASSETS = ${JSON.stringify(precache)};`);
fs.writeFileSync(path.join(output, "service-worker.js"), worker);
fs.writeFileSync(path.join(parent, "build-info.json"), JSON.stringify({ application: appFile, vendor: vendorFile, files: generated }, null, 2));
console.info(`Hosting production build ready: ${Math.round(Buffer.byteLength(appCode) / 1024)} KB application; no browser Babel or unused mockup exports.`);
