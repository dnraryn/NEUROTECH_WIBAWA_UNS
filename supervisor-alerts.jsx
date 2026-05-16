// Supervisor, Alert list (/s/alerts) + detail (/s/alerts/:id)

const SupervisorAlertsList = () => {
  const [statusFilter, setStatusFilter] = React.useState(null);
  const filtered = ALERTS.filter((a) => !statusFilter || a.status === statusFilter);
  const counts = Object.fromEntries(
    Object.keys(STATUS_MAP).map((k) => [k, ALERTS.filter((a) => a.status === k).length])
  );

  return (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="alerts" />

    <main style={{ padding: "22px 28px 22px 6px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHeader
        eyebrow={`${filtered.length} alert · 14 Mei 2026`}
        title="Alert & Insiden"
        right={
          <NeuroBtn tone="default" size="sm" onClick={() => window.toast?.("Export alerts → CSV (mock)", { kind: "info" })}>
            Export CSV
          </NeuroBtn>
        }
      />

      {/* Status filter pills with counts */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setStatusFilter(null)} style={{
          padding: "10px 16px", borderRadius: 14,
          background: !statusFilter ? "linear-gradient(135deg, #9c8bf0, #6cb6f0)" : "var(--nt-surface)",
          boxShadow: !statusFilter ? "0 6px 16px rgba(108,182,240,0.32)" : "var(--nt-shadow-out-sm)",
          color: !statusFilter ? "white" : "var(--nt-text-2)",
          fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit"
        }}>Semua · {ALERTS.length}</button>
        {Object.entries(STATUS_MAP).map(([k, s]) => (
          <button key={k} onClick={() => setStatusFilter(statusFilter === k ? null : k)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: 14,
            background: "var(--nt-surface)",
            boxShadow: statusFilter === k ? "var(--nt-shadow-in)" : "var(--nt-shadow-out-sm)",
            color: statusFilter === k ? s.color : "var(--nt-text-2)",
            fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit"
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            {s.label} · {counts[k]}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="neu-surface" style={{ padding: 18, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {filtered.map((a) => {
          const s = STATUS_MAP[a.status];
          return (
            <Link key={a.id} to={`/s/alerts/${a.id}`}>
              <div className="nt-card-click" style={{
                display: "grid", gridTemplateColumns: "auto 80px 1fr auto auto",
                gap: 16, alignItems: "center",
                padding: "14px 18px", borderRadius: 16,
                background: "var(--nt-bg)", boxShadow: "var(--nt-shadow-in)",
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: `linear-gradient(135deg, ${s.color}, ${s.soft})`,
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700,
                  boxShadow: `0 4px 10px ${s.color}55`,
                }}>{s.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)", fontVariantNumeric: "tabular-nums" }}>{a.t}</div>
                  <div style={{ fontSize: 10, color: "var(--nt-text-3)" }}>{a.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)" }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "var(--nt-text-2)", marginTop: 2 }}>{a.workerName}</div>
                </div>
                <StatusPill status={a.status} size="sm" />
                <span style={{ fontSize: 13, color: "var(--nt-text-3)" }}>›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  </div>
  );
};

// ── Alert detail ──────────────────────────────────────────────────────────
const SupervisorAlertDetail = ({ id }) => {
  const a = ALERTS_BY_ID[id];
  const [resolveModal, setResolveModal] = React.useState(false);
  const [resolved, setResolved] = React.useState(false);

  if (!a) {
    return (
      <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
        <SupervisorSidebar active="alerts" />
        <main style={{ padding: 28 }}>
          <PageHeader backTo="/s/alerts" title="Alert tidak ditemukan" />
        </main>
      </div>
    );
  }

  const s = STATUS_MAP[a.status];
  const worker = a.worker ? WORKERS_BY_ID[a.worker] : null;

  return (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="alerts" />

    <main style={{ padding: "22px 28px 22px 6px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        backTo="/s/alerts"
        eyebrow={`${a.date} · ${a.t}`}
        title={a.title}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            {!resolved && a.status !== "normal" && (
              <NeuroBtn tone="success" size="sm" onClick={() => setResolveModal(true)}>Tandai Resolved</NeuroBtn>
            )}
            <NeuroBtn tone="default" size="sm" onClick={() => window.toast?.("Export alert → PDF (mock)", { kind: "info" })}>Export PDF</NeuroBtn>
          </div>
        }
      />

      {/* Hero */}
      <div className="neu-surface" style={{ padding: 24, display: "flex", alignItems: "center", gap: 24, position: "relative", overflow: "hidden" }}>
        <span style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(70% 70% at 100% 0%, ${s.color}33, transparent 60%)`,
          pointerEvents: "none"
        }} />
        <div style={{
          width: 80, height: 80, borderRadius: 22,
          background: `linear-gradient(135deg, ${s.color}, ${s.soft})`,
          color: "white", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 700, boxShadow: `0 8px 20px ${s.color}55`, position: "relative"
        }}>{s.emoji}</div>
        <div style={{ flex: 1, position: "relative" }}>
          <StatusPill status={a.status} />
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--nt-text)", marginTop: 10 }}>{a.title}</div>
          <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 6, maxWidth: 600, lineHeight: 1.5 }}>{a.detail}</div>
        </div>
        {resolved && (
          <div style={{
            position: "relative",
            padding: "8px 14px", borderRadius: 14,
            background: "linear-gradient(135deg, #7dd1a1, #a8e0c0)",
            color: "white", fontWeight: 700, fontSize: 12, boxShadow: "0 4px 10px rgba(125,209,161,0.4)"
          }}>RESOLVED ✓</div>
        )}
      </div>

      {/* 2-col: worker info + raw signal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
        {worker ? (
          <Link to={`/s/workers/${worker.id}`}>
            <div className="neu-surface nt-card-click" style={{ padding: 20, height: "100%" }}>
              <div className="nt-eyebrow" style={{ fontSize: 9 }}>Pekerja terdampak</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${worker.img}, ${worker.img}cc)`,
                  color: "white", fontSize: 18, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 6px 14px ${worker.img}55`
                }}>{worker.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--nt-text)" }}>{worker.name}</div>
                  <div style={{ fontSize: 12, color: "var(--nt-text-2)" }}>{worker.role} · Shift {worker.shift}</div>
                </div>
                <StatusPill status={worker.status} size="sm" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 18 }}>
                {[
                  { l: "FI",  v: worker.fi },
                  { l: "CLI", v: worker.cli },
                  { l: "HRV", v: worker.hrv },
                ].map((m) => (
                  <div key={m.l}>
                    <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.14em" }}>{m.l}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--nt-text)", marginTop: 4 }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 11, color: "var(--nt-brand-mid)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Buka detail pekerja →</div>
            </div>
          </Link>
        ) : (
          <div className="neu-surface" style={{ padding: 20, fontSize: 13, color: "var(--nt-text-2)" }}>
            <div className="nt-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>Cakupan</div>
            {a.workerName}
          </div>
        )}

        <div className="neu-surface" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="nt-eyebrow" style={{ fontSize: 9 }}>EEG di sekitar event</div>
            <div style={{ fontSize: 10, color: "var(--nt-text-3)" }}>±30 detik</div>
          </div>
          <EEGWave width={620} height={88} color={s.color} seed={parseInt(a.id.replace(/\D/g, ""), 10) || 1} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 14 }}>
            {[
              { l: "Theta naik", v: "+38%" },
              { l: "Alpha turun", v: "−24%" },
              { l: "Eng. Index", v: "−41%" },
            ].map((m, i) => (
              <div key={i} className="neu-surface-sm" style={{ padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.14em" }}>{m.l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--nt-text)", marginTop: 4 }}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline / actions */}
      <div className="neu-surface" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)", marginBottom: 14 }}>Timeline tindakan</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { t: a.t, l: "Sistem deteksi", d: "Alert otomatis dibuat sistem.", c: s.color },
            ...(resolved ? [{ t: "11:48", l: "Supervisor tindak lanjut", d: "Dialihkan dari tugas safety-critical, istirahat 15 menit.", c: "#7dd1a1" }] : []),
          ].map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 60, fontSize: 12, color: "var(--nt-text-3)", fontVariantNumeric: "tabular-nums", paddingTop: 2 }}>{e.t}</div>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: e.c, boxShadow: `0 0 6px ${e.c}`,
                marginTop: 4, flexShrink: 0
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>{e.l}</div>
                <div style={{ fontSize: 12, color: "var(--nt-text-2)", marginTop: 2 }}>{e.d}</div>
              </div>
            </div>
          ))}
        </div>

        {!resolved && a.status !== "normal" && (
          <div style={{ display: "flex", gap: 10, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--nt-bg-deep)" }}>
            <NeuroBtn tone="danger" size="md" onClick={() => window.toast?.(`Rotasi tugas ${a.workerName} terkirim`, { kind: "success" })}>Rotasi Tugas</NeuroBtn>
            <NeuroBtn tone="warn" size="md" onClick={() => window.toast?.(`Notifikasi istirahat dikirim ke ${a.workerName}`, { kind: "success" })}>Istirahat Wajib</NeuroBtn>
            <NeuroBtn tone="default" size="md" onClick={() => window.toast?.(`WhatsApp via Fonnte → ${a.workerName} (mock)`, { kind: "success" })}>WhatsApp ↗</NeuroBtn>
          </div>
        )}
      </div>

      <Modal open={resolveModal} onClose={() => setResolveModal(false)} tone="success"
        title="Tandai alert ini resolved?"
        subtitle="Alert akan dipindahkan ke arsip. Pastikan tindakan korektif sudah dilakukan dan tercatat."
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setResolveModal(false)}>Batal</NeuroBtn>
            <NeuroBtn tone="success" onClick={() => { setResolveModal(false); setResolved(true); window.toast?.("Alert ditandai resolved", { kind: "success" }); }}>Tandai Resolved</NeuroBtn>
          </>
        }
      />
    </main>
  </div>
  );
};

Object.assign(window, { SupervisorAlertsList, SupervisorAlertDetail });
