// Management / SMK3 desktop dashboard, aggregate analytics. 1280x800.

const ManagementDashboard = () => {
  const [period, setPeriod] = React.useState(1);
  const periods = ["7 hari", "30 hari", "Kuartal", "Tahun"];
  const [heatCell, setHeatCell] = React.useState(null);
  return (
  <div className="nt-screen" style={{ padding: "26px 32px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 18 }}>
    {/* Top bar */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <NeuroLogo size={28} />
        <div style={{
          padding: "6px 14px", borderRadius: 999,
          background: "var(--nt-surface)",
          boxShadow: "var(--nt-shadow-in)",
          fontSize: 11, fontWeight: 600,
          color: "var(--nt-text-2)",
          letterSpacing: "0.12em", textTransform: "uppercase"
        }}>
          Analitik Agregat · SMK3
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{
          display: "flex", gap: 4,
          padding: 4, borderRadius: 999,
          background: "var(--nt-surface)",
          boxShadow: "var(--nt-shadow-in)"
        }}>
          {periods.map((b, i) => (
            <button key={i}
              onClick={() => { setPeriod(i); window.toast?.(`Periode: ${b}`, { kind: "info" }); }}
              style={{
                padding: "8px 16px", borderRadius: 999,
                background: i === period ? "var(--nt-surface)" : "transparent",
                boxShadow: i === period ? "var(--nt-shadow-out-sm)" : "none",
                fontSize: 11, fontWeight: 600,
                color: i === period ? "var(--nt-brand-mid)" : "var(--nt-text-2)",
                border: "none", cursor: "pointer", fontFamily: "inherit"
              }}>{b}</button>
          ))}
        </div>
        <NeuroIconBtn size={38} onClick={() => window.toast?.("Export analitik → CSV (mock)", { kind: "info" })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        </NeuroIconBtn>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px 6px 6px", borderRadius: 999,
          background: "var(--nt-surface)",
          boxShadow: "var(--nt-shadow-out-sm)"
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #ffc56a, #ff8aa1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 11, fontWeight: 700
          }}>AR</div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--nt-text)" }}>Arman R.</div>
            <div style={{ fontSize: 10, color: "var(--nt-text-3)" }}>HSE Manager</div>
          </div>
        </div>
      </div>
    </div>

    {/* Page title */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div className="nt-eyebrow" style={{ fontSize: 10 }}>1, 30 April 2026 · 4 lini · 142 pekerja</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--nt-text)", marginTop: 6, letterSpacing: "-0.01em" }}>
          Fatigue Risk Management
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--nt-text-3)", textAlign: "right", lineHeight: 1.5 }}>
        Data agregat & anonim, sesuai PP No. 50/2012 SMK3<br/>
        Pemantauan · Evaluasi · Tindak lanjut
      </div>
    </div>

    {/* KPI row */}
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr", gap: 14 }}>
      <div className="neu-surface" style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
        <NeuroGauge value={84} size={108} label="84" sublabel="K3 Score" gradient={["#9c8bf0", "#6cb6f0"]} thickness={12} />
        <div style={{ flex: 1 }}>
          <div className="nt-eyebrow" style={{ fontSize: 9 }}>SMK3 Index</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--nt-text)", marginTop: 4, lineHeight: 1.1 }}>Baik</div>
          <div style={{ fontSize: 11, color: "var(--nt-text-2)", marginTop: 4, lineHeight: 1.4 }}>
            <span style={{ color: "#7dd1a1", fontWeight: 700 }}>↑ 6 poin</span> vs Maret
          </div>
        </div>
      </div>

      {[
        { l: "Kepatuhan",       v: "92%",   sub: "Headband terpasang",   c: "#7dd1a1", trend: "+3%" },
        { l: "Insiden Fatigue", v: "11",    sub: "Microsleep & 🟠/🔴",    c: "#ff8aa1", trend: "−24%" },
        { l: "Sleep Debt",      v: "1.2 j", sub: "Rerata / pekerja",      c: "#9c8bf0", trend: "−0.3" },
        { l: "Jam Pantau",      v: "11.4k", sub: "Total jam EEG",         c: "#ffc56a", trend: "+18%" },
      ].map((k, i) => (
        <div key={i} className="neu-surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="nt-eyebrow" style={{ fontSize: 9 }}>{k.l}</div>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: k.trend.startsWith("−") && k.l === "Insiden Fatigue" ? "#7dd1a1" :
                     k.trend.startsWith("−") ? "#7dd1a1" : "#7dd1a1",
              padding: "2px 8px", borderRadius: 999,
              background: "var(--nt-surface)",
              boxShadow: "var(--nt-shadow-in)"
            }}>{k.trend}</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--nt-text)", lineHeight: 1, letterSpacing: "-0.01em" }}>{k.v}</div>
          <div style={{ fontSize: 11, color: "var(--nt-text-3)" }}>{k.sub}</div>
          {/* tiny spark */}
          <svg width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none" style={{ marginTop: 2 }}>
            <path
              d={i === 1 ? "M0,8 L14,12 L28,10 L42,16 L56,14 L70,18 L84,17 L100,19"
                : "M0,16 L14,14 L28,17 L42,11 L56,13 L70,8 L84,10 L100,5"}
              fill="none" stroke={k.c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>
      ))}
    </div>

    {/* Main grid: 2 cols */}
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, flex: 1, minHeight: 0 }}>
      {/* LEFT, heatmap shift x hour */}
      <div className="neu-surface" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)" }}>Pola Fatigue · Shift × Jam</div>
            <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>Rata-rata Fatigue Index dari 142 pekerja</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--nt-text-3)" }}>Rendah</span>
            <div style={{
              width: 100, height: 8, borderRadius: 999,
              background: "linear-gradient(90deg, #7dd1a1, #ffc56a, #ff8aa1, #ff7a7a)",
              boxShadow: "inset 1px 1px 2px rgba(140,156,180,0.3)"
            }} />
            <span style={{ fontSize: 10, color: "var(--nt-text-3)" }}>Tinggi</span>
          </div>
        </div>

        {/* Heatmap */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "center" }}>
          {[
            { l: "Pagi",   h: [22, 18, 24, 35, 48, 52, 58, 46] },
            { l: "Sore",   h: [28, 32, 38, 52, 62, 71, 78, 64] },
            { l: "Malam",  h: [42, 48, 58, 72, 86, 92, 88, 76] },
            { l: "Lembur", h: [38, 44, 56, 68, 80, 86, 78, 70] },
          ].map((row, r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 56, fontSize: 11, color: "var(--nt-text-2)", fontWeight: 600 }}>{row.l}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, flex: 1 }}>
                {row.h.map((v, c) => {
                  const t = v / 100;
                  const hue = 140 - t * 140;  // green → red
                  const sat = 60 + t * 20;
                  const lit = 78 - t * 18;
                  const bg = `hsl(${hue}, ${sat}%, ${lit}%)`;
                  return (
                    <button key={c}
                      onClick={() => setHeatCell({ shift: row.l, hour: `+${c + 1}j`, fi: v })}
                      style={{
                        height: 38,
                        borderRadius: 10,
                        background: bg,
                        boxShadow: `0 2px 5px ${bg}88, inset 0 1px 0 rgba(255,255,255,0.3)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                        color: t > 0.6 ? "white" : "#3a4a5e",
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                        transition: "transform .12s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.06)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>{v}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "56px repeat(8,1fr)", gap: 6, fontSize: 9.5, color: "var(--nt-text-3)", textAlign: "center", marginTop: 2 }}>
          <span></span>
          {["+1j", "+2j", "+3j", "+4j", "+5j", "+6j", "+7j", "+8j"].map((h, i) => <span key={i}>{h}</span>)}
        </div>
      </div>

      {/* RIGHT column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
        {/* Per-lini bar */}
        <div className="neu-surface" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Indeks per Lini</div>
            <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Risk avg</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", paddingTop: 4 }}>
            <NeuroBar value={32} color={["#7dd1a1", "#a8e0c0"]} label="Lab"        sub="32" height={100} width={28} />
            <NeuroBar value={46} color={["#6cb6f0", "#8cc6f5"]} label="CCR"        sub="46" height={100} width={28} />
            <NeuroBar value={58} color={["#ffc56a", "#ffd791"]} label="Dispatch"  sub="58" height={100} width={28} />
            <NeuroBar value={71} color={["#ff8aa1", "#ffaebb"]} label="Transport" sub="71" height={100} width={28} />
            <NeuroBar value={64} color={["#b9adf5", "#cfc4f8"]} label="Security"  sub="64" height={100} width={28} />
          </div>
        </div>

        {/* Recommendations / report */}
        <div className="neu-surface" style={{ padding: 18, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>Insight & Rekomendasi</div>
            <div style={{
              padding: "4px 10px", borderRadius: 999,
              background: "linear-gradient(135deg, #9c8bf0, #6cb6f0)",
              color: "white", fontSize: 10, fontWeight: 700,
              boxShadow: "0 4px 10px rgba(108,182,240,0.35)"
            }}>AI</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
            {[
              {
                c: "#ff8aa1",
                icon: "⚠",
                t: "Shift malam jam +5/+6, fatigue puncak",
                d: "Pertimbangkan istirahat wajib 15 menit pada +4j; rotasi tugas di +6j.",
              },
              {
                c: "#ffc56a",
                icon: "🚛",
                t: "Transport: sleep debt rata-rata 2.1 j",
                d: "5 pekerja konsisten readiness < 60. Tinjau jadwal off-day.",
              },
              {
                c: "#9c8bf0",
                icon: "📐",
                t: "Pola fatigue konsisten ≥3 minggu",
                d: "Cukup data untuk evaluasi formal desain shift saat audit triwulan.",
              },
              {
                c: "#7dd1a1",
                icon: "✓",
                t: "Lini Lab, risiko rendah berkelanjutan",
                d: "Pola istirahat eksisting bisa jadi referensi internal.",
              },
            ].map((r, i) => (
              <div key={i} style={{
                display: "flex", gap: 12,
                padding: "10px 12px",
                borderRadius: 14,
                background: "var(--nt-bg)",
                boxShadow: "var(--nt-shadow-in)",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: `linear-gradient(135deg, ${r.c}, ${r.c}cc)`,
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                  boxShadow: `0 3px 8px ${r.c}55`
                }}>{r.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--nt-text)" }}>{r.t}</div>
                  <div style={{ fontSize: 11, color: "var(--nt-text-2)", marginTop: 3, lineHeight: 1.4 }}>{r.d}</div>
                </div>
              </div>
            ))}
          </div>

          <Link to="/s/reports">
            <button
              style={{
                padding: "11px 14px", width: "100%",
                borderRadius: 14, border: "none",
                background: "var(--nt-surface)",
                boxShadow: "var(--nt-shadow-out-sm)",
                color: "var(--nt-brand-mid)", fontWeight: 700, fontSize: 12,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>
              Buka Laporan SMK3
            </button>
          </Link>
        </div>
      </div>

      <Modal
        open={!!heatCell}
        onClose={() => setHeatCell(null)}
        title={heatCell ? `${heatCell.shift} · ${heatCell.hour} setelah mulai` : ""}
        subtitle={heatCell ? `Rata-rata Fatigue Index pada slot ini: ${heatCell.fi}. ${heatCell.fi > 70 ? "Slot puncak fatigue, pertimbangkan istirahat wajib." : heatCell.fi > 50 ? "Slot dengan fatigue meningkat, pantau lebih ketat." : "Slot relatif aman, pola istirahat eksisting cukup."}` : ""}
        tone={heatCell?.fi > 70 ? "danger" : heatCell?.fi > 50 ? "warn" : "success"}
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setHeatCell(null)}>Tutup</NeuroBtn>
            <Link to="/s/schedule"><NeuroBtn tone="primary" onClick={() => setHeatCell(null)}>Tinjau jadwal</NeuroBtn></Link>
          </>
        }
      />
    </div>
  </div>
  );
};

Object.assign(window, { ManagementDashboard });
