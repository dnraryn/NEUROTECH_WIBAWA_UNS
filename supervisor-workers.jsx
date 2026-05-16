// Supervisor, Pekerja list (/s/workers) + detail (/s/workers/:id)

const SHIFT_TABS = ["Semua", "Pagi", "Sore", "Malam"];

const SupervisorWorkersList = () => {
  const [shiftFilter, setShiftFilter] = React.useState("Semua");
  const [statusFilter, setStatusFilter] = React.useState(null);

  const filtered = WORKERS.filter((w) =>
    (shiftFilter === "Semua" || w.shift === shiftFilter) &&
    (!statusFilter || w.status === statusFilter)
  );

  return (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="workers" />

    <main style={{ padding: "22px 28px 22px 6px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHeader
        eyebrow={`${filtered.length} dari ${WORKERS.length} pekerja`}
        title="Pekerja"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <NeuroBtn tone="default" size="sm" onClick={() => window.toast?.("Export pekerja → CSV (mock)", { kind: "info" })}>
              Export CSV
            </NeuroBtn>
            <NeuroBtn tone="primary" size="sm" onClick={() => window.toast?.("Tambah pekerja, fitur akan datang", { kind: "info" })}>
              + Tambah Pekerja
            </NeuroBtn>
          </div>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-in)" }}>
          {SHIFT_TABS.map((s) => (
            <button key={s} onClick={() => setShiftFilter(s)} style={{
              padding: "8px 16px", borderRadius: 999,
              background: shiftFilter === s ? "var(--nt-surface)" : "transparent",
              boxShadow: shiftFilter === s ? "var(--nt-shadow-out-sm)" : "none",
              fontSize: 11, fontWeight: 600,
              color: shiftFilter === s ? "var(--nt-brand-mid)" : "var(--nt-text-2)",
              border: "none", cursor: "pointer", fontFamily: "inherit"
            }}>{s}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(STATUS_MAP).map(([k, s]) => (
            <button key={k}
              onClick={() => setStatusFilter(statusFilter === k ? null : k)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 999,
                background: "var(--nt-surface)",
                boxShadow: statusFilter === k ? "var(--nt-shadow-in)" : "var(--nt-shadow-out-sm)",
                fontSize: 11, color: statusFilter === k ? s.color : "var(--nt-text-2)",
                fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit"
              }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              {s.label}
            </button>
          ))}
        </div>

        {statusFilter && (
          <NeuroBtn tone="ghost" size="sm" onClick={() => setStatusFilter(null)}>Reset filter</NeuroBtn>
        )}
      </div>

      {/* Table */}
      <div className="neu-surface" style={{ padding: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr",
          padding: "14px 22px", gap: 12,
          fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
          borderBottom: "1px solid var(--nt-bg-deep)"
        }}>
          <span>Nama</span><span>Peran</span><span>Shift</span>
          <span style={{ textAlign: "right" }}>FI</span>
          <span style={{ textAlign: "right" }}>CLI</span>
          <span style={{ textAlign: "right" }}>HRV</span>
          <span style={{ textAlign: "right" }}>Sleep</span>
          <span style={{ textAlign: "right" }}>Status</span>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map((w) => {
            const s = STATUS_MAP[w.status];
            return (
              <Link key={w.id} to={`/s/workers/${w.id}`}>
                <div className="nt-card-click" style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr",
                  padding: "14px 22px", gap: 12,
                  alignItems: "center",
                  borderBottom: "1px solid var(--nt-bg-deep)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${w.img}, ${w.img}cc)`,
                      color: "white", fontSize: 12, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>{w.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>{w.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--nt-text-2)" }}>{w.role}</div>
                  <div style={{ fontSize: 12, color: "var(--nt-text-2)" }}>{w.shift}</div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: w.fi > 65 ? "#ff7a7a" : "var(--nt-text)" }}>{w.fi}</div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: w.cli > 65 ? "#ff7a7a" : "var(--nt-text)" }}>{w.cli}</div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: w.hrv < 50 ? "#ff7a7a" : "var(--nt-text)" }}>{w.hrv}</div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--nt-text-2)" }}>{w.sleep.toFixed(1)} j</div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <StatusPill status={w.status} size="sm" />
                  </div>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--nt-text-3)", fontSize: 13 }}>
              Tidak ada pekerja yang cocok dengan filter ini.
            </div>
          )}
        </div>
      </div>
    </main>
  </div>
  );
};

// ── Worker Detail ─────────────────────────────────────────────────────────
const SupervisorWorkerDetail = ({ id }) => {
  const w = WORKERS_BY_ID[id];
  const [rotateModal, setRotateModal] = React.useState(false);
  const [breakModal, setBreakModal] = React.useState(false);
  const [calibModal, setCalibModal] = React.useState(false);

  if (!w) {
    return (
      <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
        <SupervisorSidebar active="workers" />
        <main style={{ padding: 28 }}>
          <PageHeader backTo="/s/workers" title="Pekerja tidak ditemukan" />
          <div className="neu-surface" style={{ padding: 24, fontSize: 13, color: "var(--nt-text-2)" }}>
            ID pekerja <code>{id}</code> tidak ada di sistem.
          </div>
        </main>
      </div>
    );
  }

  const s = STATUS_MAP[w.status];
  const relatedAlerts = ALERTS.filter((a) => a.worker === w.id);

  return (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="workers" />

    <main style={{ padding: "22px 28px 22px 6px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        backTo="/s/workers"
        eyebrow={`${w.role} · Shift ${w.shift} · Upd ${w.t}`}
        title={w.name}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <NeuroBtn tone="default" size="sm" onClick={() => window.toast?.(`WhatsApp → ${w.name} (mock)`, { kind: "success" })}>WhatsApp ↗</NeuroBtn>
            <NeuroBtn tone="warn" size="sm" onClick={() => setBreakModal(true)}>Suruh Istirahat</NeuroBtn>
            <NeuroBtn tone="danger" size="sm" onClick={() => setRotateModal(true)}>Rotasi Tugas</NeuroBtn>
          </div>
        }
      />

      {/* Hero card */}
      <div className="neu-surface" style={{ padding: 24, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center" }}>
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: `linear-gradient(135deg, ${w.img}, ${w.img}cc)`,
          color: "white", fontSize: 28, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 10px 24px ${w.img}55`, position: "relative"
        }}>
          {w.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
          <span style={{
            position: "absolute", bottom: 0, right: 0,
            width: 22, height: 22, borderRadius: "50%",
            background: s.color, border: "4px solid var(--nt-surface)",
            boxShadow: `0 0 10px ${s.color}`
          }} />
        </div>
        <div>
          <div className="nt-eyebrow">Status saat ini</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "var(--nt-text)", marginTop: 4, letterSpacing: "-0.01em" }}>{s.label}</div>
          <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 4 }}>
            {w.microsleep ? "Microsleep terdeteksi 11:42 · butuh intervensi segera." :
             w.status === "berisiko" ? "Cognitive load di atas ambang berisiko." :
             w.status === "waspada" ? "Fatigue/load mendekati ambang waspada." :
             "Indeks dalam rentang baseline."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <NeuroGauge value={w.readiness} size={120} label={`${w.readiness}`} sublabel="readiness" gradient={["#6cb6f0", "#9c8bf0"]} thickness={14} />
        </div>
      </div>

      {/* Indices grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { l: "Fatigue Index",   v: w.fi,  c: ["#b9adf5","#cfc4f8"], hint: "Theta+alpha / beta · trailing 20m" },
          { l: "Cognitive Load",  v: w.cli, c: ["#ffc56a","#ffd791"], hint: "Theta / alpha · trailing 10s" },
          { l: "Engagement",      v: w.ei,  c: ["#7dd1a1","#a8e0c0"], hint: "Beta / (alpha+theta)" },
          { l: "HRV (RMSSD)",     v: w.hrv, c: ["#ff8aa1","#ffaebb"], hint: "ms · dari PPG", suffix: " ms" },
        ].map((m, i) => (
          <div key={i} className="neu-surface" style={{ padding: 16 }}>
            <div className="nt-eyebrow" style={{ fontSize: 9 }}>{m.l}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "var(--nt-text)", marginTop: 8, letterSpacing: "-0.01em" }}>
              {m.v}<span style={{ fontSize: 13, color: "var(--nt-text-3)", marginLeft: 2 }}>{m.suffix || ""}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "var(--nt-bg-deep)", marginTop: 10, overflow: "hidden", boxShadow: "inset 1px 1px 2px rgba(140,156,180,0.3)" }}>
              <div style={{ width: `${Math.min(100, m.v)}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${m.c[0]}, ${m.c[1]})` }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 6 }}>{m.hint}</div>
          </div>
        ))}
      </div>

      {/* EEG live + sleep history */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="neu-surface" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>EEG band power · live</div>
              <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>Trailing 10 detik · Muse S TP9 · AF7 · AF8 · TP10</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--nt-text-2)", fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7dd1a1", boxShadow: "0 0 6px #7dd1a1" }} />
              Streaming
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", justifyItems: "center", padding: "12px 0" }}>
            <NeuroBar value={42} color={["#6cb6f0", "#8cc6f5"]} label="Delta" sub="42%" height={100} />
            <NeuroBar value={71} color={["#9c8bf0", "#b9adf5"]} label="Theta" sub="71%" height={100} />
            <NeuroBar value={28} color={["#ff8aa1", "#ffaebb"]} label="Alpha" sub="28%" height={100} />
            <NeuroBar value={54} color={["#ffc56a", "#ffd791"]} label="Beta"  sub="54%" height={100} />
            <NeuroBar value={18} color={["#7dd1a1", "#a8e0c0"]} label="Gamma" sub="18%" height={100} />
          </div>
          <div style={{ marginTop: 4, paddingTop: 14, borderTop: "1px solid var(--nt-bg-deep)" }}>
            <div style={{ fontSize: 11, color: "var(--nt-text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>EEG waveform</div>
            <EEGWave width={680} height={64} color="#9c8bf0" seed={w.fi} />
          </div>
        </div>

        <div className="neu-surface" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)", marginBottom: 4 }}>Tidur 7 hari terakhir</div>
          <div style={{ fontSize: 11, color: "var(--nt-text-3)" }}>Rerata {w.sleep.toFixed(1)} jam · target ≥ 7 jam</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100, marginTop: 16 }}>
            {[6.2, 6.8, 5.4, 7.1, 7.4, 6.0, w.sleep].map((h, i) => {
              const ok = h >= 7;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: "100%", height: `${(h / 9) * 100}%`,
                    borderRadius: 8,
                    background: i === 6
                      ? "linear-gradient(180deg, #9c8bf0, #6cb6f0)"
                      : ok ? "linear-gradient(180deg, #7dd1a1cc, #a8e0c0cc)" : "linear-gradient(180deg, #ffc56acc, #ffd791cc)",
                    boxShadow: i === 6 ? "0 4px 10px rgba(108,182,240,0.4)" : "none"
                  }} />
                  <div style={{ fontSize: 10, color: "var(--nt-text-3)", fontVariantNumeric: "tabular-nums" }}>{h.toFixed(1)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--nt-text-3)", marginTop: 8 }}>
            <span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span>M</span>
          </div>
          <NeuroBtn tone="default" size="sm" style={{ width: "100%", marginTop: 14 }} onClick={() => setCalibModal(true)}>
            Minta Kalibrasi Ulang
          </NeuroBtn>
        </div>
      </div>

      {/* Alert history for this worker */}
      <div className="neu-surface" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Alert pekerja ini</div>
          <Link to="/s/alerts"><span style={{ fontSize: 10.5, color: "var(--nt-brand-mid)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer" }}>Semua alert →</span></Link>
        </div>
        {relatedAlerts.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--nt-text-3)", padding: "12px 0" }}>Tidak ada alert hari ini untuk pekerja ini.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {relatedAlerts.map((a) => {
              const sa = STATUS_MAP[a.status];
              return (
                <Link key={a.id} to={`/s/alerts/${a.id}`}>
                  <div className="nt-card-click" style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 12,
                    background: "var(--nt-bg)", boxShadow: "var(--nt-shadow-in)"
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: sa.color, boxShadow: `0 0 6px ${sa.color}` }} />
                    <span style={{ fontSize: 11, color: "var(--nt-text-3)", fontVariantNumeric: "tabular-nums" }}>{a.t}</span>
                    <span style={{ fontSize: 12, color: "var(--nt-text)", fontWeight: 500, flex: 1 }}>{a.title}</span>
                    <span style={{ fontSize: 10, color: sa.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{sa.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={rotateModal} onClose={() => setRotateModal(false)} tone="danger"
        title={`Rotasi tugas ${w.name}?`}
        subtitle="Pekerja akan dialihkan ke tugas non-safety-critical 30 menit. Supervisor zona akan diberi tahu."
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setRotateModal(false)}>Batal</NeuroBtn>
            <NeuroBtn tone="danger" onClick={() => { setRotateModal(false); window.toast?.(`Rotasi tugas ${w.name} terkirim`, { kind: "success" }); }}>Rotasikan</NeuroBtn>
          </>
        }
      />
      <Modal open={breakModal} onClose={() => setBreakModal(false)} tone="warn"
        title={`Suruh ${w.name} istirahat mikro?`}
        subtitle="Notifikasi akan muncul di app pekerja. Pekerja bisa menerima atau menunda sampai tugas aman."
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setBreakModal(false)}>Batal</NeuroBtn>
            <NeuroBtn tone="warn" onClick={() => { setBreakModal(false); window.toast?.(`Notifikasi istirahat dikirim ke ${w.name}`, { kind: "success" }); }}>Kirim</NeuroBtn>
          </>
        }
      />
      <Modal open={calibModal} onClose={() => setCalibModal(false)}
        title="Kalibrasi ulang baseline?"
        subtitle="Pekerja akan diminta menjalani sesi kalibrasi singkat (5 menit) di awal shift berikutnya. Baseline personal akan diperbarui."
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setCalibModal(false)}>Batal</NeuroBtn>
            <NeuroBtn tone="primary" onClick={() => { setCalibModal(false); window.toast?.("Permintaan kalibrasi terkirim", { kind: "success" }); }}>Jadwalkan</NeuroBtn>
          </>
        }
      />
    </main>
  </div>
  );
};

Object.assign(window, { SupervisorWorkersList, SupervisorWorkerDetail });
