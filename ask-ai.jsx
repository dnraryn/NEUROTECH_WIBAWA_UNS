// Ask AI, floating chat assistant available on every page.
// Talks to Gemini via window.ntGemini (set up by ai-gemini.js / Firebase AI Logic).

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

const AskAI = () => {
  const GREETING = "Halo! Saya NeuroTech-AI. Tanyakan apa saja soal fatigue, microsleep, cognitive load, K3, atau cara memakai aplikasi ini.";
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([{ role: "model", text: GREETING, animate: true }]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const bodyRef = React.useRef(null);

  const scrollDown = () => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  };
  // Panel stays mounted (hidden via CSS) so the typewriter never replays.
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
      const history = next.slice(1); // drop the opening greeting
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

  return ReactDOM.createPortal(
    <div className="nt-ai">
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

      {!open && <div className="nt-ai-label">Ask NeuroTech-AI</div>}

      <button className="nt-ai-fab" onClick={() => setOpen((o) => !o)} aria-label="Ask NeuroTech-AI">
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        ) : (
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
            <path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
          </svg>
        )}
      </button>
    </div>,
    document.body
  );
};

Object.assign(window, { Typewriter, AskAI });
