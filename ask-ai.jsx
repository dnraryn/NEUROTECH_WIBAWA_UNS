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
  const [messages, setMessages] = React.useState([{ role: "model", text: GREETING }]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [frame, setFrame] = React.useState(null);
  const bodyRef = React.useRef(null);
  const requestRef = React.useRef(0);
  const busyRef = React.useRef(false);
  React.useEffect(() => {
    const clear = () => { requestRef.current++; busyRef.current = false; setBusy(false); setMessages([{ role: "model", text: GREETING }]); setInput(""); setOpen(false); };
    window.addEventListener("nt-session", clear);
    return () => { requestRef.current++; window.removeEventListener("nt-session", clear); };
  }, []);

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

  const send = async (suggestion) => {
    const text = (typeof suggestion === "string" ? suggestion : input).trim().slice(0, 2000);
    if (!text || busyRef.current) return;
    busyRef.current = true;
    const ticket = ++requestRef.current;
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      await window.ntAI.wait();
      if (ticket !== requestRef.current) return;
      const history = next.slice(1).filter((message) => !message.error);
      const reply = await window.ntGemini(history);
      if (ticket === requestRef.current) setMessages((m) => [...m, { role: "model", text: (reply || "").trim() || "AI belum menghasilkan jawaban. Coba lagi." }]);
    } catch (e) {
      if (ticket === requestRef.current) setMessages((m) => [...m, { role: "model", text: window.ntAI.errorMessage(e), error: true }]);
    } finally {
      if (ticket === requestRef.current) { busyRef.current = false; setBusy(false); }
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
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

        <div className="nt-ai-body" ref={bodyRef} role="log" aria-live="polite" aria-label="Percakapan NeuroTech AI">
          {messages.map((m, i) => (
            <div key={i} className={"nt-ai-msg nt-ai-msg--" + (m.role === "user" ? "user" : "ai")}>
              {m.role === "model" && m.animate
                ? <Typewriter text={m.text} onTick={scrollDown} />
                : m.text}
            </div>
          ))}
          {busy && <div className="nt-ai-msg nt-ai-msg--ai nt-ai-typing">sedang mengetik…</div>}
        </div>
        {messages.length === 1 && <div className="nt-ai-suggestions">{["Jelaskan hasil EEG saya", "Kenapa Cognitive Load belum tersedia?", "Bagaimana menghitung sleep debt?"].map((text) => <button key={text} type="button" disabled={busy} onClick={() => send(text)}>{text}</button>)}</div>}
        {messages[messages.length - 1]?.error && <button type="button" className="frm-link nt-ai-retry" disabled={busy} onClick={() => send([...messages].reverse().find((m) => m.role === "user")?.text)}>Coba lagi</button>}

        <div className="nt-ai-input-row">
          <input
            className="nt-ai-input"
            value={input}
            placeholder="Tulis pertanyaan…"
            aria-label="Pertanyaan untuk NeuroTech AI"
            maxLength={2000}
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
        <div className="nt-ai-privacy">Saat bertanya, ringkasan indeks dan catatan sesi dikirim ke Gemini. Jawaban AI bersifat informatif.</div>
      </div>
    </div>,
    target
  );
};

Object.assign(window, { Typewriter, AskAI, AskAIButton });
