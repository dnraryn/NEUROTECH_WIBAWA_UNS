// Supervisor, Laporan SMK3 (/s/reports) + detail (/s/reports/:id)

const SupervisorReports = () => (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="reports" />

    <main style={{ padding: "22px 28px 22px 6px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHeader
        eyebrow="Sesuai PP No. 50/2012 SMK3"
        title="Laporan SMK3"
        right={
          <NeuroBtn tone="primary" size="sm" onClick={() => window.toast?.("Generate laporan baru, fitur akan datang", { kind: "info" })}>
            + Generate Laporan
          </NeuroBtn>
        }
      />

      {/* Reports grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {REPORTS.map((r) => (
          <Link key={r.id} to={`/s/reports/${r.id}`}>
            <div className="neu-surface nt-card-click" style={{ padding: 20, height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="nt-eyebrow" style={{ fontSize: 9 }}>Periode</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--nt-text)", marginTop: 4, letterSpacing: "-0.01em" }}>{r.period}</div>
                  <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>Diterbitkan {r.date}</div>
                </div>
                <span style={{
                  padding: "4px 10px", borderRadius: 999,
                  background: r.status === "Final" ? "linear-gradient(135deg, #7dd1a1, #a8e0c0)" : "linear-gradient(135deg, #ffc56a, #ffd791)",
                  color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                  boxShadow: r.status === "Final" ? "0 3px 8px rgba(125,209,161,0.4)" : "0 3px 8px rgba(255,197,106,0.4)"
                }}>{r.status}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 18 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.12em" }}>PEKERJA</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--nt-text)", marginTop: 4 }}>{r.workers}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.12em" }}>INSIDEN</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: r.incidents > 15 ? "#ff7a7a" : "var(--nt-text)", marginTop: 4 }}>{r.incidents}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.12em" }}>SCORE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: r.score >= 80 ? "#7dd1a1" : r.score >= 70 ? "#ffc56a" : "#ff7a7a", marginTop: 4 }}>{r.score}</div>
                </div>
              </div>

              <div style={{ marginTop: 16, fontSize: 11, color: "var(--nt-brand-mid)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Lihat laporan →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  </div>
);

// ── Report detail ─────────────────────────────────────────────────────────
const SupervisorReportDetail = ({ id }) => {
  const r = REPORTS_BY_ID[id];
  const [downloadModal, setDownloadModal] = React.useState(false);

  if (!r) {
    return (
      <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
        <SupervisorSidebar active="reports" />
        <main style={{ padding: 28 }}>
          <PageHeader backTo="/s/reports" title="Laporan tidak ditemukan" />
        </main>
      </div>
    );
  }

  return (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="reports" />

    <main style={{ padding: "22px 28px 22px 6px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        backTo="/s/reports"
        eyebrow={`Laporan SMK3 · ${r.status}`}
        title={r.period}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <NeuroBtn tone="default" size="sm" onClick={() => window.toast?.("Share link disalin ke clipboard (mock)", { kind: "success" })}>Bagikan</NeuroBtn>
            <NeuroBtn tone="primary" size="sm" onClick={() => setDownloadModal(true)}>Unduh PDF</NeuroBtn>
          </div>
        }
      />

      {/* Score hero */}
      <div className="neu-surface" style={{ padding: 24, display: "flex", alignItems: "center", gap: 24 }}>
        <NeuroGauge value={r.score} size={140} label={`${r.score}`} sublabel="K3 score" gradient={["#9c8bf0", "#6cb6f0"]} thickness={16} />
        <div style={{ flex: 1 }}>
          <div className="nt-eyebrow">Penilaian SMK3</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--nt-text)", marginTop: 6, letterSpacing: "-0.01em" }}>
            {r.score >= 85 ? "Sangat Baik" : r.score >= 75 ? "Baik" : r.score >= 60 ? "Cukup" : "Perlu Perbaikan"}
          </div>
          <div style={{ fontSize: 13, color: "var(--nt-text-2)", marginTop: 6, lineHeight: 1.5 }}>
            {r.workers} pekerja terpantau · {r.incidents} insiden fatigue/microsleep tercatat · {(r.workers * 0.92 * 8 * 20).toLocaleString("id-ID")} jam pemantauan total.
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { l: "Kepatuhan headband", v: "92%", c: "#7dd1a1" },
          { l: "Rerata readiness",    v: "76",  c: "#6cb6f0" },
          { l: "Rerata sleep debt",   v: "1.2 j", c: "#9c8bf0" },
          { l: "Microsleep events",   v: r.incidents > 10 ? "4" : "1", c: "#ff7a7a" },
        ].map((k, i) => (
          <div key={i} className="neu-surface" style={{ padding: 16 }}>
            <div className="nt-eyebrow" style={{ fontSize: 9 }}>{k.l}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.c, marginTop: 8, letterSpacing: "-0.01em" }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="neu-surface" style={{ padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)", marginBottom: 16 }}>Daftar isi laporan</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { n: "1", l: "Ringkasan eksekutif", d: "Skor K3, tren bulanan, headline." },
            { n: "2", l: "Metodologi pemantauan", d: "Muse 2 / Muse S, indeks EEG, kalibrasi personal." },
            { n: "3", l: "Statistik agregat", d: "Distribusi FI/CLI per lini, per shift, per jam kerja." },
            { n: "4", l: "Daftar insiden", d: `${r.incidents} insiden dengan timeline & tindakan korektif.` },
            { n: "5", l: "Evaluasi & rekomendasi", d: "Penyesuaian shift, rotasi, kalibrasi ulang." },
            { n: "6", l: "Lampiran", d: "Log alert lengkap (anonimized), grafik mingguan." },
          ].map((sec, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 14px", borderRadius: 12,
              background: "var(--nt-bg)", boxShadow: "var(--nt-shadow-in)"
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, #9c8bf0, #6cb6f0)",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700
              }}>{sec.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>{sec.l}</div>
                <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>{sec.d}</div>
              </div>
              <span style={{ fontSize: 13, color: "var(--nt-text-3)" }}>›</span>
            </div>
          ))}
        </div>
      </div>

      <Modal open={downloadModal} onClose={() => setDownloadModal(false)}
        title={`Unduh laporan ${r.period}?`}
        subtitle="File PDF berisi laporan lengkap (anonim, sesuai SMK3) akan disiapkan. Proses ini umumnya 5-15 detik."
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setDownloadModal(false)}>Batal</NeuroBtn>
            <NeuroBtn tone="primary" onClick={() => {
              setDownloadModal(false);
              window.toast?.(`Menyiapkan PDF · ${r.period}…`, { kind: "info", duration: 1500 });
              setTimeout(() => window.toast?.(`PDF siap diunduh · neurotech-${r.id}.pdf (mock)`, { kind: "success", duration: 4000 }), 1500);
            }}>Mulai Unduh</NeuroBtn>
          </>
        }
      />
    </main>
  </div>
  );
};

Object.assign(window, { SupervisorReports, SupervisorReportDetail });
