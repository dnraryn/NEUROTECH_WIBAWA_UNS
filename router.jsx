// Hash-based router + Modal + Toast — exposed as window globals to fit the
// script-tag style. Paths look like #/s/workers/rizky-a → parts = ["s","workers","rizky-a"].

// ── Route parsing ─────────────────────────────────────────────────────────
const parseRoute = (hash) => {
  const path = (hash || "#/").replace(/^#/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  return { path, parts, app: parts[0] || null, page: parts[1] || null, id: parts[2] || null };
};

const useHashRoute = () => {
  const [hash, setHash] = React.useState(() =>
    typeof window === "undefined" ? "#/" : window.location.hash
  );
  React.useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return parseRoute(hash);
};

const navigate = (to) => {
  if (typeof window === "undefined") return;
  const h = to.startsWith("#") ? to : "#" + to;
  if (window.location.hash === h) {
    // force re-render even if hash unchanged
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = h;
  }
};

// Link — renders an <a> with hash href so browser back/forward works.
const Link = ({ to, children, style, className, onClick }) => (
  <a
    href={"#" + to}
    onClick={onClick}
    className={className}
    style={{ textDecoration: "none", color: "inherit", cursor: "pointer", ...style }}
  >
    {children}
  </a>
);

// ── Modal ────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, subtitle, children, actions, width = 420, tone = "default" }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toneAccent = {
    default: "#6cb6f0",
    danger:  "#ff7a7a",
    success: "#7dd1a1",
    warn:    "#ffc56a",
  }[tone] || "#6cb6f0";

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(36, 50, 70, 0.45)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "nt-fade .14s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: "90vw",
          background: "var(--nt-bg)",
          borderRadius: 24,
          boxShadow: "var(--nt-shadow-out-lg)",
          padding: 0, overflow: "hidden",
          animation: "nt-pop .18s cubic-bezier(.2,.7,.3,1)",
          position: "relative",
        }}
      >
        <span style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${toneAccent}, ${toneAccent}99)`,
        }} />
        <div style={{ padding: "26px 28px 22px" }}>
          {title && (
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 6, lineHeight: 1.5 }}>
              {subtitle}
            </div>
          )}
          {children && <div style={{ marginTop: title || subtitle ? 16 : 0 }}>{children}</div>}
          {actions && (
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Imperative toast API: window.toast(msg, {kind, duration}) ────────────
const ToastProvider = () => {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    window.toast = (msg, opts = {}) => {
      const id = Math.random().toString(36).slice(2);
      const kind = opts.kind || "info";
      setItems((xs) => [...xs, { id, msg, kind }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), opts.duration || 2800);
    };
  }, []);

  const ICON = {
    info:    "ℹ",
    success: "✓",
    warn:    "!",
    danger:  "×",
  };
  const COLOR = {
    info:    "#6cb6f0",
    success: "#7dd1a1",
    warn:    "#ffc56a",
    danger:  "#ff7a7a",
  };

  return ReactDOM.createPortal(
    <div style={{
      position: "fixed", right: 24, bottom: 24, zIndex: 1100,
      display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none",
    }}>
      {items.map((t) => (
        <div key={t.id} style={{
          minWidth: 280, maxWidth: 360,
          background: "var(--nt-surface)",
          boxShadow: "var(--nt-shadow-out)",
          borderRadius: 16,
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12,
          fontSize: 13, color: "var(--nt-text)", fontWeight: 500,
          animation: "nt-slide-in .22s cubic-bezier(.2,.7,.3,1)",
          pointerEvents: "auto",
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR[t.kind]}, ${COLOR[t.kind]}cc)`,
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14,
            boxShadow: `0 3px 8px ${COLOR[t.kind]}55`,
            flexShrink: 0,
          }}>{ICON[t.kind]}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>,
    document.body
  );
};

// ── Shared button styles ─────────────────────────────────────────────────
const NeuroBtn = ({ children, onClick, tone = "default", size = "md", style }) => {
  const tones = {
    default:  { bg: "var(--nt-surface)", shadow: "var(--nt-shadow-out-sm)", color: "var(--nt-text-2)" },
    primary:  { bg: "linear-gradient(135deg, #9c8bf0, #6cb6f0)", shadow: "0 8px 18px rgba(108,182,240,0.32), inset 0 1px 0 rgba(255,255,255,0.4)", color: "white" },
    success:  { bg: "linear-gradient(135deg, #7dd1a1, #a8e0c0)", shadow: "0 8px 18px rgba(125,209,161,0.32), inset 0 1px 0 rgba(255,255,255,0.4)", color: "white" },
    danger:   { bg: "linear-gradient(135deg, #ff7a7a, #ff9c9c)", shadow: "0 8px 20px rgba(255,122,122,0.35), inset 0 1px 0 rgba(255,255,255,0.4)", color: "white" },
    warn:     { bg: "linear-gradient(135deg, #ffc56a, #ffd791)", shadow: "0 8px 18px rgba(255,197,106,0.35), inset 0 1px 0 rgba(255,255,255,0.4)", color: "white" },
    ghost:    { bg: "transparent", shadow: "none", color: "var(--nt-text-2)" },
  };
  const t = tones[tone] || tones.default;
  const sz = size === "sm"
    ? { padX: 14, padY: 8, fs: 12 }
    : size === "lg"
      ? { padX: 22, padY: 14, fs: 14 }
      : { padX: 18, padY: 11, fs: 13 };
  return (
    <button
      onClick={onClick}
      style={{
        padding: `${sz.padY}px ${sz.padX}px`,
        borderRadius: 14, border: "none",
        background: t.bg,
        boxShadow: t.shadow,
        color: t.color,
        fontWeight: 700, fontSize: sz.fs,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "transform .12s, box-shadow .12s",
        ...style,
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(1px)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </button>
  );
};

// ── Page header with back button (used by detail pages) ──────────────────
const PageHeader = ({ backTo, eyebrow, title, right }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0 18px" }}>
    {backTo && (
      <Link to={backTo}>
        <NeuroIconBtn size={40}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </NeuroIconBtn>
      </Link>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      {eyebrow && <div className="nt-eyebrow" style={{ fontSize: 10 }}>{eyebrow}</div>}
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--nt-text)", letterSpacing: "-0.01em", marginTop: 4 }}>{title}</div>
    </div>
    {right}
  </div>
);

Object.assign(window, {
  parseRoute, useHashRoute, navigate, Link,
  Modal, ToastProvider, NeuroBtn, PageHeader,
});
