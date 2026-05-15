// Supervisor — Jadwal Shift (/s/schedule)

const SupervisorSchedule = () => {
  const [assignModal, setAssignModal] = React.useState(null); // { day, shift }

  return (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="schedule" />

    <main style={{ padding: "22px 28px 22px 6px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHeader
        eyebrow={SCHEDULE.weekLabel}
        title="Jadwal Shift"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <NeuroIconBtn size={38} onClick={() => window.toast?.("Minggu sebelumnya (mock)", { kind: "info" })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
            </NeuroIconBtn>
            <NeuroIconBtn size={38} onClick={() => window.toast?.("Minggu berikutnya (mock)", { kind: "info" })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </NeuroIconBtn>
            <NeuroBtn tone="primary" size="sm" onClick={() => window.toast?.("Publikasi jadwal — 10 pekerja akan dinotifikasi", { kind: "success" })}>
              Publikasi Jadwal
            </NeuroBtn>
          </div>
        }
      />

      {/* Grid header */}
      <div className="neu-surface" style={{ padding: 20, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px repeat(7, 1fr)", gap: 8, marginBottom: 12 }}>
          <div></div>
          {SCHEDULE.days.map((d, i) => (
            <div key={d} style={{
              fontSize: 11, fontWeight: 700, color: "var(--nt-text-3)",
              letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center",
              padding: "8px 0"
            }}>{d}<br/><span style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)", letterSpacing: 0 }}>{11 + i}</span></div>
          ))}
        </div>

        {SCHEDULE.shifts.map((shift) => (
          <div key={shift.id} style={{ display: "grid", gridTemplateColumns: "160px repeat(7, 1fr)", gap: 8, marginBottom: 10 }}>
            <div style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "var(--nt-bg)",
              boxShadow: "var(--nt-shadow-in)",
              fontSize: 12, fontWeight: 700, color: "var(--nt-text)",
              display: "flex", flexDirection: "column", justifyContent: "center"
            }}>
              {shift.label.split(" · ")[0]}
              <span style={{ fontSize: 10, color: "var(--nt-text-3)", marginTop: 2, fontWeight: 500 }}>
                {shift.label.split(" · ")[1]}
              </span>
            </div>
            {SCHEDULE.days.map((d, dayIdx) => (
              <button key={d}
                onClick={() => setAssignModal({ day: d, shift: shift.id, shiftLabel: shift.label, dayIdx })}
                style={{
                  padding: "10px 8px",
                  borderRadius: 12,
                  background: "var(--nt-surface)",
                  boxShadow: "var(--nt-shadow-out-sm)",
                  fontSize: 10, color: "var(--nt-text-2)",
                  display: "flex", flexDirection: "column", gap: 4,
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  minHeight: 88, justifyContent: "flex-start"
                }}>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {shift.workers.slice(0, 3).map((wid, i) => {
                    const w = WORKERS_BY_ID[wid];
                    if (!w) return null;
                    return (
                      <span key={i} style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${w.img}, ${w.img}cc)`,
                        color: "white", fontSize: 8, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{w.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                    );
                  })}
                  {shift.workers.length > 3 && (
                    <span style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: "var(--nt-bg-deep)",
                      fontSize: 8, fontWeight: 700, color: "var(--nt-text-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>+{shift.workers.length - 3}</span>
                  )}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--nt-text-3)", letterSpacing: "0.08em", marginTop: "auto" }}>
                  {shift.workers.length} ORANG
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Assignments preview */}
      <div className="neu-surface" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--nt-text)" }}>Penugasan minggu ini</div>
            <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>Akan disinkronkan ke jadwal individu setelah dipublikasikan</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {SCHEDULE.shifts.map((shift) => (
            <div key={shift.id} className="neu-surface-sm" style={{ padding: 14 }}>
              <div className="nt-eyebrow" style={{ fontSize: 9 }}>{shift.label.split(" · ")[0]}</div>
              <div style={{ fontSize: 11, color: "var(--nt-text-3)", marginTop: 2 }}>{shift.label.split(" · ")[1]}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {shift.workers.map((wid) => {
                  const w = WORKERS_BY_ID[wid];
                  if (!w) return null;
                  return (
                    <Link key={wid} to={`/s/workers/${wid}`}>
                      <div className="nt-card-click" style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "6px 10px", borderRadius: 10,
                        background: "var(--nt-bg)", boxShadow: "var(--nt-shadow-in)"
                      }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: `linear-gradient(135deg, ${w.img}, ${w.img}cc)`,
                          color: "white", fontSize: 9, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>{w.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--nt-text)" }}>{w.name}</div>
                          <div style={{ fontSize: 10, color: "var(--nt-text-3)" }}>{w.role}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!assignModal} onClose={() => setAssignModal(null)}
        title={assignModal ? `${assignModal.day}, ${assignModal.shiftLabel}` : ""}
        subtitle="Pekerja yang ditugaskan pada slot ini. Untuk mengubah, klik nama → ganti/lepaskan."
        width={420}
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setAssignModal(null)}>Tutup</NeuroBtn>
            <NeuroBtn tone="primary" onClick={() => { setAssignModal(null); window.toast?.("Tambah pekerja ke shift — fitur akan datang", { kind: "info" }); }}>+ Tambah pekerja</NeuroBtn>
          </>
        }>
        {assignModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SCHEDULE.shifts.find((s) => s.id === assignModal.shift)?.workers.map((wid) => {
              const w = WORKERS_BY_ID[wid];
              if (!w) return null;
              return (
                <div key={wid} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 12,
                  background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-out-sm)"
                }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${w.img}, ${w.img}cc)`,
                    color: "white", fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>{w.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: "var(--nt-text-3)" }}>{w.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </main>
  </div>
  );
};

Object.assign(window, { SupervisorSchedule });
