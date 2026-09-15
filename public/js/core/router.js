// Hash router sederhana untuk app shell.
//   view module: export default { render(el, ctx, params) → cleanup? }
//   ctx.setLeaveGuard(fn) — fn() mengembalikan pesan bila navigasi perlu dikonfirmasi.
import { matchRoute } from "./nav.js";
import { html, mount, icon, errorMessage } from "./ui.js";

export function startRouter({ outlet, ctx, onRoute }) {
  let cleanup = null, guard = null, current = "", token = 0;

  ctx.setLeaveGuard = (fn) => { guard = fn; };
  ctx.leaveMessage = () => guard?.();
  ctx.navigate = (path) => { location.hash = "#" + path; };

  window.addEventListener("beforeunload", (e) => {
    const m = guard?.(); if (m) { e.preventDefault(); e.returnValue = m; }
  });

  async function go() {
    const path = (location.hash.replace(/^#/, "") || "/").split("?")[0];
    if (path === current) return;
    const m = guard?.();
    if (m && !confirm(m)) { history.replaceState(null, "", "#" + current); return; }

    try { cleanup?.(); } catch (e) { console.warn(e); }
    cleanup = null; guard = null; current = path;
    const my = ++token;

    const found = matchRoute(path);
    if (!found) { onRoute?.(null); return renderMessage(outlet, "Halaman tidak ditemukan", "Periksa kembali alamat yang Anda buka."); }
    const { route, params } = found;
    onRoute?.(route);
    document.title = `${route.title} — NeuroTech SMK3`;

    if (!route.roles.includes(ctx.member.role))
      return renderMessage(outlet, "Akses dibatasi", "Peran Anda tidak memiliki akses ke halaman ini.");

    mount(outlet, html`<div class="loading-view"><span class="spinner"></span></div>`);
    try {
      const mod = await route.load();
      if (my !== token) return;
      const res = await mod.default.render(outlet, ctx, params, route);
      if (my !== token) { try { res?.(); } catch (e) {} return; }
      cleanup = typeof res === "function" ? res : null;
    } catch (err) {
      console.error(err);
      if (my === token) renderMessage(outlet, "Gagal memuat halaman", errorMessage(err));
    }
    outlet.focus?.({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", go);
  go();
}

function renderMessage(outlet, title, text) {
  mount(outlet, html`<div class="empty-state">${icon("mdi:compass-off-outline")}<h2>${title}</h2><p>${text}</p>
    <a class="btn btn-ghost" href="#/">Kembali ke Beranda</a></div>`);
}
