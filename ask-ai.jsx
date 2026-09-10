// Ask AI, chat assistant available on every page. Talks to Gemini via
// window.ntGemini (set up by ai-gemini.js / Firebase AI Logic).
//
// Layout architecture:
//   <AskAIButton variant="card" | "plus" />  — inline launcher rendered where
//     each persona wants it (sidebar above ThemeToggle on desktop, top-right
//     inside the phone frame on mobile). Click fires a `nt-ai-open` event.
//   <AskAI route={...} />                    — panel host. Listens for the
//     event and toggles open/close. On mobile (worker) the panel portals
//     INSIDE `.app-frame--mobile`; on desktop it portals to document.body
//     and floats at bottom-right.

// Typewriter, reveals text character by character (used for AI replies).
const Typewriter = ({ text, speed = 14, onTick }) => {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (onTick) onTick();
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return <span>{text.slice(0, n)}</span>;
};

// Inline launcher — rendered by each persona's UI.
//   variant="card" → wide pro-card (used in supervisor/management sidebars)
//   variant="plus" → small circular + button (used at top-right of phone frame)
const AskAIButton = ({ variant = "card" }) => {
  const open = () => window.dispatchEvent(new Event("nt-ai-open"));
  if (variant === "plus") {
    return (
      <button className="nt-ai-plus" onClick={open} aria-label="Buka NeuroTech-AI">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
          <path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
        </svg>
      </button>
    );
  }
  return (
    <button className="nt-ai-procard" onClick={open} aria-label="Buka NeuroTech-AI">
      <div className="nt-ai-procard-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
          <path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
        </svg>
      </div>
      <div className="nt-ai-procard-body">
        <span className="nt-ai-procard-badge">AI</span>
        <span className="nt-ai-procard-title">NeuroTech-AI</span>
        <span className="nt-ai-procard-sub">Asisten K3 &amp; wellness</span>
      </div>
      <span className="nt-ai-procard-arrow">↗</span>
    </button>
  );
};

const AskAI = ({ route }) => {
  const GREETING = "Halo! Saya NeuroTech-AI. Tanyakan apa saja soal fatigue, microsleep, cognitive load, K3, atau cara memakai aplikasi ini.";
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([{ role: "model", text: GREETING, animate: true }]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [frame, setFrame] = React.useState(null);
  const bodyRef = React.useRef(null);

  // Listen for AskAIButton clicks.
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    const onToggle = () => setOpen((o) => !o);
    window.addEventListener("nt-ai-open", onOpen);
    window.addEventListener("nt-ai-close", onClose);
    window.addEventListener("nt-ai-toggle", onToggle);
    return () => {
      window.removeEventListener("nt-ai-open", onOpen);
      window.removeEventListener("nt-ai-close", onClose);
      window.removeEventListener("nt-ai-toggle", onToggle);
    };
  }, []);

  // Re-detect the phone frame whenever the route changes (worker mounts it,
  // supervisor/management do not). rAF waits one tick for the new screen to commit.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      const f = typeof document !== "undefined"
        ? document.querySelector(".app-frame--mobile") : null;
      setFrame(f);
    });
    return () => cancelAnimationFrame(id);
  }, [route]);

  // Close the panel automatically when leaving worker mobile (avoids the
  // panel briefly flashing in the wrong portal target).
  React.useEffect(() => {
    if (route !== "w") setOpen(false);
  }, [route]);

  const scrollDown = () => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  };
  React.useEffect(scrollDown, [messages, busy, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      if (typeof window.ntGemini !== "function") {
        throw new Error("Asisten AI belum aktif. Pastikan Firebase AI Logic sudah diaktifkan di Firebase Console.");
      }
      const history = next.slice(1);
      const reply = await window.ntGemini(history);
      setMessages((m) => [...m, { role: "model", text: (reply || "").trim() || "(jawaban kosong)", animate: true }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "model", text: "⚠️ " + (e && e.message ? e.message : "Terjadi kesalahan.") }]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const target = frame || (typeof document !== "undefined" ? document.body : null);
  if (!target) return null;
  const isMobile = !!frame;

  return ReactDOM.createPortal(
    <div className={"nt-ai" + (isMobile ? " nt-ai--mobile" : "")}>
      <div className={"nt-ai-panel" + (open ? "" : " nt-ai-panel--hidden")}>
        <div className="nt-ai-head">
          <div className="nt-ai-head-title">
            <span className="nt-ai-dot" />
            NeuroTech-AI
          </div>
          <button className="nt-ai-x" onClick={() => setOpen(false)} aria-label="Tutup">✕</button>
        </div>

        <div className="nt-ai-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={"nt-ai-msg nt-ai-msg--" + (m.role === "user" ? "user" : "ai")}>
              {m.role === "model" && m.animate
                ? <Typewriter text={m.text} onTick={scrollDown} />
                : m.text}
            </div>
          ))}
          {busy && <div className="nt-ai-msg nt-ai-msg--ai nt-ai-typing">sedang mengetik…</div>}
        </div>

        <div className="nt-ai-input-row">
          <input
            className="nt-ai-input"
            value={input}
            placeholder="Tulis pertanyaan…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
          />
          <button className="nt-ai-send" onClick={send} disabled={busy || !input.trim()} aria-label="Kirim">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    target
  );
};

Object.assign(window, { Typewriter, AskAI, AskAIButton });
