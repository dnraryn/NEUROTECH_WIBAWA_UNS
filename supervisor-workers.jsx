// Supervisor, Pekerja list (/s/workers) + detail (/s/workers/:id)

const SHIFT_TABS = ["Semua", "Pagi", "Sore", "Malam"];

// Job-title suggestions for the "Deskripsi role" field (autocomplete).
const WORKER_ROLE_DESCS = [
  "Operator CCR", "Operator Mesin", "Driver Truk", "Driver Forklift",
  "Dispatcher", "Lab Analyst", "Security CCTV", "Teknisi", "Admin Logistik",
];
const ROLE_OPTIONS = [
  { v: "pekerja",    l: "Pekerja" },
  { v: "supervisor", l: "Supervisor" },
  { v: "management", l: "Manajemen" },
];

const SupervisorWorkersList = () => {
  const [shiftFilter, setShiftFilter] = React.useState("Semua");
  const [statusFilter, setStatusFilter] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState(null);
  const [codeTarget, setCodeTarget] = React.useState(null);
  const [form, setForm] = React.useState({ name: "", password: "", role: "pekerja", roleDesc: "", shift: "Pagi" });
  const session = window.ntSession?.get();
  const archive = useSessionArchive();
  const workers = session ? realWorkerSummaries(archive) : WORKERS;
  const codeMember = session?.members?.find(m=>m.id === codeTarget);
  const availableRoles = !session || session.uid === session.ownerUid ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((r) => r.v === "pekerja" || (session.role === "management" && r.v === "supervisor"));

  const saving = React.useRef(false);
  const filtered = workers.filter((w) =>
    (shiftFilter === "Semua" || w.shift === shiftFilter) &&
    (!statusFilter || w.status === statusFilter)
  );

  // Build a fresh worker record and hand it to the shared store.
  const submitAdd = async () => {
    if (saving.current) return;
    const name = form.name.trim();
    if (!name) { window.toast?.("Nama pekerja wajib diisi.", { kind: "warn" }); return; }
    if (session && form.password.length<8) { window.toast?.("Password awal minimal 8 karakter.", { kind: "warn" }); return; }
    if (!availableRoles.some((r) => r.v === form.role)) {
      window.toast?.("Pilih role pekerja.", { kind: "warn" }); return;
    }
    saving.current = true;
    try {
      const ok = session ? await window.ntCompany.addCodeMember({...form,name}) : await window.ntAddWorker({name,role:form.role,roleDesc:form.roleDesc,shift:form.shift});
      if (!ok) throw new Error("Gagal menambah pekerja.");
      window.toast?.(name + " ditambahkan ke daftar pekerja.", { kind: "success" });
      setForm({ name: "", password: "", role: "pekerja", roleDesc: "", shift: "Pagi" });
      setAddOpen(false);
      if(session && ok?.id)setCodeTarget(ok.id);
    } catch (error) { window.toast?.(error.message || "Gagal menyimpan pekerja.", { kind: "danger" }); }
    finally { saving.current = false; }
  };

  const confirmRemove = async () => {
    if (saving.current) return;
    if (!removeTarget) return;
    const nm = removeTarget.name;
    saving.current = true;
    try {
      if (!await window.ntRemoveWorker(removeTarget.id)) throw new Error("Pekerja tidak ditemukan.");
      window.toast?.(nm + " dihapus dari daftar pekerja.", { kind: "success" });
      setRemoveTarget(null);
    } catch (error) { window.toast?.(error.message || "Gagal menghapus pekerja.", { kind: "danger" }); }
    finally { saving.current = false; }
  };

  const fieldStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 12, border: "none",
    background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-in)",
    fontSize: 13, color: "var(--nt-text)", fontFamily: "inherit", outline: "none",
  };
  const labelStyle = {
    display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--nt-text-3)",
    letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6,
  };

  return (
  <div className="nt-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="workers" />

    <main style={{ padding: "22px 28px 22px 6px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHeader
        eyebrow={`${filtered.length} dari ${workers.length} anggota perusahaan`}
        title="Pekerja"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <NeuroBtn tone="default" size="sm" onClick={() => session ? navigate(staffPath("/s/reports")) : window.toast?.("Export pekerja → CSV (mock)", { kind: "info" })}>
              {session ? "Buka laporan" : "Export CSV"}
            </NeuroBtn>
            <NeuroBtn tone="primary" size="sm" onClick={() => setAddOpen(true)}>
              + Tambah Pekerja
            </NeuroBtn>
          </div>
        }
      />
      {session && <RealArchiveStatus state={archive} />}

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

        <div className="worker-status-filters" style={{ display: "flex", gap: 6 }}>
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
      <p className="worker-table-hint">Geser tabel ke samping untuk melihat seluruh kolom.</p>
      <div className={"neu-surface workers-table" + (session ? " workers-table--real" : "")} tabIndex={0} role="region" aria-label="Daftar pekerja, dapat digeser ke samping" style={{ padding: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: session ? "1.9fr 1.05fr 0.85fr 0.58fr 0.58fr 0.95fr 44px" : "1.9fr 1.05fr 0.85fr 0.58fr 0.58fr 0.58fr 0.68fr 0.95fr 44px",
          padding: "14px 22px", gap: 12,
          fontSize: 10, color: "var(--nt-text-3)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
          borderBottom: "1px solid var(--nt-bg-deep)"
        }}>
          <span>Nama</span><span>Peran</span><span>Shift</span>
          <span style={{ textAlign: "right" }}>FI</span>
          <span style={{ textAlign: "right" }}>CLI</span>
          {!session && <><span style={{ textAlign: "right" }}>HRV</span><span style={{ textAlign: "right" }}>Ready</span></>}
          <span style={{ textAlign: "right" }}>Status</span>
          <span />
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map((w) => {
            const s = STATUS_MAP[w.status];
            return (
              <Link key={w.id} to={staffPath(`/s/workers/${w.id}`)}>
                <div className="nt-card-click" style={{
                  display: "grid",
                  gridTemplateColumns: session ? "1.9fr 1.05fr 0.85fr 0.58fr 0.58fr 0.95fr 44px" : "1.9fr 1.05fr 0.85fr 0.58fr 0.58fr 0.58fr 0.68fr 0.95fr 44px",
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
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nt-text)" }}>{w.name}</div>
                      {session && <small className={`worker-connection-label is-${w.connection.key}`}>{w.connection.label}</small>}
                      {session && <button type="button" className="worker-code-action" aria-label={`Kode masuk ${w.name}`} onClick={e=>{e.preventDefault();e.stopPropagation();setCodeTarget(w.id);}}>Kode masuk ↗</button>}
                      {(w.roleDesc || (session && w.recordedAt)) && (
                        <div style={{ fontSize: 10.5, color: "var(--nt-text-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session ? realDate(w.recordedAt) : w.roleDesc}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--nt-text-2)" }}>{w.role}</div>
                  <div style={{ fontSize: 12, color: "var(--nt-text-2)" }}>{w.shift}</div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: w.fi > 65 ? "#ff7a7a" : "var(--nt-text)" }}>{w.fi ?? "—"}</div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: w.cli > 65 ? "#ff7a7a" : "var(--nt-text)" }}>{w.cli ?? "—"}</div>
                  {!session && <><div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: Number.isFinite(w.hrv) && w.hrv < 50 ? "#ff7a7a" : "var(--nt-text)" }}>{w.hrv ?? "—"}</div><div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: Number.isFinite(w.readiness) && w.readiness < 60 ? "#ff7a7a" : "var(--nt-text)" }}>{w.readiness ?? "—"}</div></>}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <StatusPill status={w.status} size="sm" />
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      title={`Hapus ${w.name}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRemoveTarget(w); }}
                      style={{
                        width: 30, height: 30, borderRadius: 9, border: "none", cursor: "pointer",
                        background: "var(--nt-surface)", boxShadow: "var(--nt-shadow-out-sm)",
                        color: "#ff7a7a", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
                    </button>
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

      {/* Tambah pekerja */}
      <Modal open={!!codeTarget} onClose={()=>setCodeTarget(null)} title={`Kode masuk ${codeMember?.name || "anggota"}`} width={420}
        actions={<NeuroBtn onClick={()=>setCodeTarget(null)}>Tutup</NeuroBtn>}>
        {codeMember ? <><MemberAccessCode companyCode={session.code} memberId={codeMember.id} role={codeMember.role}/><p className="archive-muted">Bagikan kode dan password awal kepada anggota ini. Tidak perlu email untuk login.</p></> : <p>Anggota sudah tidak tersedia.</p>}
      </Modal>
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Pekerja"
        subtitle="Buat akun dengan nama, peran, dan password awal. Kode akun muncul setelah tersimpan."
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setAddOpen(false)}>Batal</NeuroBtn>
            <NeuroBtn tone="primary" onClick={submitAdd}>Tambah Pekerja</NeuroBtn>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nama lengkap</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); }}
              placeholder="cth. Andi Saputra"
              style={fieldStyle}
              autoFocus
            />
          </div>
          <div>
            <label style={labelStyle}>Password awal</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password" placeholder="Minimal 8 karakter" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={fieldStyle}
            >
              {availableRoles.map((r) => (
                <option key={r.v} value={r.v}>{r.l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Deskripsi role</label>
            <input
              value={form.roleDesc}
              onChange={(e) => setForm({ ...form, roleDesc: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); }}
              placeholder="cth. Operator CCR"
              list="nt-role-desc-list"
              style={fieldStyle}
            />
            <datalist id="nt-role-desc-list">
              {WORKER_ROLE_DESCS.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>
          <div>
            <label style={labelStyle}>Shift</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Pagi", "Sore", "Malam"].map((s) => {
                const on = form.shift === s;
                return (
                  <button key={s} onClick={() => setForm({ ...form, shift: s })} style={{
                    flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                    background: on ? "linear-gradient(135deg, #9c8bf0, #6cb6f0)" : "var(--nt-surface)",
                    boxShadow: on ? "0 6px 14px rgba(108,182,240,0.32)" : "var(--nt-shadow-out-sm)",
                    color: on ? "white" : "var(--nt-text-2)",
                    fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                  }}>{s}</button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Hapus pekerja */}
      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        tone="danger"
        title={removeTarget ? `Hapus ${removeTarget.name}?` : ""}
        subtitle="Pekerja akan dihapus dari daftar pemantauan. Anda dapat menambahkannya kembali kapan saja lewat tombol Tambah Pekerja."
        actions={
          <>
            <NeuroBtn tone="ghost" onClick={() => setRemoveTarget(null)}>Batal</NeuroBtn>
            <NeuroBtn tone="danger" onClick={confirmRemove}>Hapus</NeuroBtn>
          </>
        }
      />
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
          <PageHeader backTo={staffPath("/s/workers")} title="Pekerja tidak ditemukan" />
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
        backTo={staffPath("/s/workers")}
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
              {m.v ?? "—"}<span style={{ fontSize: 13, color: "var(--nt-text-3)", marginLeft: 2 }}>{Number.isFinite(m.v) ? m.suffix || "" : ""}</span>
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
          <Link to={staffPath("/s/alerts")}><span style={{ fontSize: 10.5, color: "var(--nt-brand-mid)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer" }}>Semua alert →</span></Link>
        </div>
        {relatedAlerts.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--nt-text-3)", padding: "12px 0" }}>Tidak ada alert hari ini untuk pekerja ini.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {relatedAlerts.map((a) => {
              const sa = STATUS_MAP[a.status];
              return (
                <Link key={a.id} to={staffPath(`/s/alerts/${a.id}`)}>
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
