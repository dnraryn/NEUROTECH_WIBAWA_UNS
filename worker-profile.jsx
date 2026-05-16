// Worker mobile, Profile & settings (/w/profile)

const WorkerProfile = () => {
  const w = CURRENT_WORKER;
  const [notifications, setNotifications] = React.useState(true);
  const [autoBreak, setAutoBreak] = React.useState(true);
  const [signOutModal, setSignOutModal] = React.useState(false);

  return (
  <div className="nt-screen" style={{ paddingBottom: 100 }}>
    <NeuroStatusBar time="07:24" />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px 0" }}>
      <Link to="/w/readiness">
        <NeuroIconBtn size={40}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </NeuroIconBtn>
      </Link>
      <div style={{ fontSize: 12, letterSpacing: "0.42em", color: "var(--nt-text-2)", fontWeight: 600 }}>P R O F I L</div>
      <NeuroIconBtn size={40} onClick={() => window.toast?.("Edit profil, fitur akan datang", { kind: "info" })}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>
      </NeuroIconBtn>
    </div>

    {/* Hero */}
    <div style={{ textAlign: "center", padding: "20px 32px 0" }}>
      <div style={{
        width: 88, height: 88, borderRadius: "50%",
        background: `linear-gradient(135deg, ${w.img}, ${w.img}cc)`,
        color: "white", fontSize: 30, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto", boxShadow: `0 10px 24px ${w.img}55`
      }}>{w.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>
      <div className="nt-title-lg" style={{ marginTop: 14 }}>{w.name}</div>
      <div style={{ fontSize: 12, color: "var(--nt-text-2)", marginTop: 6 }}>
        {w.role} · Karyawan ID #2026-{w.id.toUpperCase().slice(0, 3)}
      </div>
    </div>

    {/* Quick stats */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "20px 24px 0" }}>
      {[
        { l: "Shift bulan ini", v: "18", c: ["#9c8bf0", "#b9adf5"] },
        { l: "Rerata readiness", v: w.readiness, c: ["#6cb6f0", "#8cc6f5"] },
        { l: "Sleep score",      v: "84", c: ["#ff8aa1", "#ffaebb"] },
      ].map((s, i) => (
        <div key={i} className="neu-surface-sm" style={{ padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--nt-text)", letterSpacing: "-0.01em" }}>{s.v}</div>
          <div style={{ fontSize: 9.5, color: "var(--nt-text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{s.l}</div>
        </div>
      ))}
    </div>

    {/* Settings */}
    <div className="neu-surface" style={{ margin: "18px 24px 0", padding: "8px 0" }}>
      {[
        { l: "Notifikasi istirahat mikro", v: notifications, set: setNotifications, type: "toggle" },
        { l: "Auto-start istirahat saat Waspada", v: autoBreak, set: setAutoBreak, type: "toggle" },
        { l: "Kalibrasi baseline", sub: "Terakhir: kemarin", type: "action", onClick: () => window.toast?.("Mulai sesi kalibrasi singkat (5 menit)", { kind: "info" }) },
        { l: "Riwayat tidur lengkap", type: "link", to: "/w/sleep" },
        { l: "Pasangkan ulang Muse S", type: "action", onClick: () => window.toast?.("Mode pasangan dimulai · cari di Bluetooth HP", { kind: "info" }) },
      ].map((row, i) => {
        const content = (
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 18px",
            borderTop: i > 0 ? "1px solid var(--nt-bg-deep)" : "none",
            cursor: row.type === "toggle" ? "default" : "pointer"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nt-text)" }}>{row.l}</div>
              {row.sub && <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>{row.sub}</div>}
            </div>
            {row.type === "toggle" && (
              <button
                onClick={() => row.set(!row.v)}
                style={{
                  width: 42, height: 24, borderRadius: 999,
                  background: row.v ? "linear-gradient(135deg, #7dd1a1, #a8e0c0)" : "var(--nt-bg-deep)",
                  boxShadow: row.v ? "0 3px 8px rgba(125,209,161,0.4)" : "inset 1px 1px 2px rgba(140,156,180,0.3)",
                  border: "none", cursor: "pointer", position: "relative", padding: 0
                }}>
                <span style={{
                  position: "absolute", top: 2, left: row.v ? 20 : 2,
                  width: 20, height: 20, borderRadius: "50%",
                  background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                  transition: "left .18s"
                }} />
              </button>
            )}
            {row.type !== "toggle" && (
              <span style={{ fontSize: 14, color: "var(--nt-text-3)" }}>›</span>
            )}
          </div>
        );
        return row.type === "link" ? (
          <Link key={i} to={row.to}>{content}</Link>
        ) : row.type === "action" ? (
          <div key={i} onClick={row.onClick}>{content}</div>
        ) : (
          <div key={i}>{content}</div>
        );
      })}
    </div>

    {/* Privacy note */}
    <div className="neu-surface-sm" style={{ margin: "14px 24px 0", padding: "12px 16px" }}>
      <div className="nt-eyebrow" style={{ fontSize: 9 }}>🔒 Privasi</div>
      <div style={{ fontSize: 11.5, color: "var(--nt-text-2)", marginTop: 6, lineHeight: 1.5 }}>
        Data EEG mentah Anda hanya tersimpan di perangkat. Supervisor & manajemen hanya melihat indeks ringkas (FI/CLI/HRV), bukan sinyal mentah. Data tidak digunakan untuk sanksi.
      </div>
    </div>

    {/* Sign out */}
    <div style={{ padding: "14px 24px 0" }}>
      <NeuroBtn tone="default" style={{ width: "100%" }} onClick={() => setSignOutModal(true)}>
        Keluar
      </NeuroBtn>
    </div>

    <Modal open={signOutModal} onClose={() => setSignOutModal(false)} tone="warn"
      title="Keluar dari NeuroTech?"
      subtitle="Pemantauan akan berhenti sampai Anda masuk kembali. Pastikan headband Muse S dilepas dan disimpan dengan baik."
      actions={
        <>
          <NeuroBtn tone="ghost" onClick={() => setSignOutModal(false)}>Batal</NeuroBtn>
          <NeuroBtn tone="warn" onClick={() => {
            setSignOutModal(false);
            window.toast?.("Anda telah keluar", { kind: "success" });
            navigate("/login");
          }}>Keluar</NeuroBtn>
        </>
      }
    />

    <NeuroTabBar active="home" />
  </div>
  );
};

Object.assign(window, { WorkerProfile });
