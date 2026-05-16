// Join flow (/join) — owner onboarding: pick a package → payment (name,
// email, simulated) → success pop-up → set-up profile (company + members)
// → receive a company code.

const JOIN_ROLES = [
  { v: "pekerja", l: "Pekerja" },
  { v: "supervisor", l: "Supervisor" },
  { v: "management", l: "Manajemen" },
];

// Max number of "pekerja"-role members per package (supervisors not counted).
const PKG_LIMIT = { free: 0, bronze: 10, silver: 25, gold: 50, platinum: 100 };

const JoinFlow = () => {
  const [step, setStep] = React.useState("package"); // package | pay | setup | done
  const [pkg, setPkg] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [paid, setPaid] = React.useState(false); // payment-success pop-up

  const [payName, setPayName] = React.useState("");
  const [payEmail, setPayEmail] = React.useState("");

  const [companyName, setCompanyName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [ownerDesc, setOwnerDesc] = React.useState("Pemilik Usaha");
  const [ownerPass, setOwnerPass] = React.useState("");
  const [workers, setWorkers] = React.useState([
    { name: "", role: "pekerja", roleDesc: "", password: "" },
  ]);

  const isFree = pkg && pkg.name.toLowerCase() === "free";
  const ownerRole = isFree ? "pekerja" : "management";
  const limit = pkg ? (PKG_LIMIT[pkg.name.toLowerCase()] ?? 10) : 10;

  const addWorker = () => {
    const pekerjaCount = workers.filter((w) => w.role === "pekerja").length;
    if (pekerjaCount >= limit) {
      window.toast?.(
        `Perusahaan Anda terdaftar di paket ${pkg.name}, sehingga tidak bisa menambah lebih banyak pekerja.`,
        { kind: "warn" }
      );
      return;
    }
    setWorkers((w) => [...w, { name: "", role: "pekerja", roleDesc: "", password: "" }]);
  };
  const removeWorker = (i) => setWorkers((w) => w.filter((_, j) => j !== i));
  const setWorker = (i, k, val) =>
    setWorkers((w) => w.map((x, j) => (j === i ? { ...x, [k]: val } : x)));

  const doPay = () => {
    if (!payName.trim() || !payEmail.trim()) {
      window.toast?.("Isi nama dan email dulu.", { kind: "warn" });
      return;
    }
    setPaid(true);
  };

  const startSetup = () => {
    setPaid(false);
    if (!ownerName) setOwnerName(payName.trim());
    setStep("setup");
  };

  const save = async () => {
    if (!companyName.trim() || !ownerName.trim() || !ownerPass.trim()) {
      window.toast?.("Lengkapi nama perusahaan, nama & password pemilik.", { kind: "warn" });
      return;
    }
    if (!window.ntCompany) {
      window.toast?.("Firebase belum siap. Muat ulang halaman.", { kind: "danger" });
      return;
    }
    const validWorkers = isFree ? [] : workers.filter((w) => w.name.trim());
    if (validWorkers.filter((w) => w.role === "pekerja").length > limit) {
      window.toast?.(`Paket ${pkg.name} hanya mengizinkan ${limit} pekerja.`, { kind: "warn" });
      return;
    }
    setBusy(true);
    try {
      const members = [
        { id: "owner", name: ownerName.trim(), role: ownerRole,
          roleDesc: ownerDesc.trim() || (isFree ? "Pengguna" : "Manajemen"), password: ownerPass.trim() },
        ...validWorkers.map((w, i) => ({
          id: "w" + (i + 1), name: w.name.trim(), role: w.role,
          roleDesc: w.roleDesc.trim() || JOIN_ROLES.find((r) => r.v === w.role).l,
          password: w.password.trim() || "123456",
        })),
      ];
      const newCode = await window.ntCompany.create({
        pkg: pkg.name.toLowerCase(), companyName: companyName.trim(), members,
      });
      setCode(newCode);
      setStep("done");
    } catch (e) {
      window.toast?.("Gagal menyimpan: " + (e.message || e), { kind: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const enterDashboard = () => {
    window.ntSession.set({
      code, companyName: companyName.trim(), package: pkg.name.toLowerCase(),
      memberName: ownerName.trim(), role: ownerRole, roleDesc: ownerDesc.trim() || "Manajemen",
    });
    window.toast?.("Selamat datang, " + ownerName.trim() + "!", { kind: "success" });
    navigate(ownerRole === "pekerja" ? "/w/readiness" : "/m/overview");
  };

  return (
    <div className="nt-join">
      <div className="nt-join-top">
        <a onClick={() => navigate("/landing")} style={{ cursor: "pointer", display: "flex" }}>
          <Brand size={30} />
        </a>
        <NeuroBtn tone="ghost" size="sm" onClick={() => navigate("/login")}>
          Sudah punya kode? Login
        </NeuroBtn>
      </div>

      <div className="nt-join-body">
        {/* ── Step 1: choose package ─────────────────────────────── */}
        {step === "package" && (
          <div className="nt-join-card nt-join-card--wide">
            <div className="nt-eyebrow">Langkah 1 dari 3</div>
            <h1 className="nt-join-h1">Pilih paket NeuroTech</h1>
            <p className="nt-join-sub">Pilih paket yang sesuai dengan skala usaha Anda.</p>
            <div className="nt-price-grid" style={{ marginTop: 26 }}>
              {PACKAGES.map((p) => (
                <div
                  key={p.name}
                  className={"nt-price-card nt-join-pick" + (pkg && pkg.name === p.name ? " is-sel" : "")}
                  onClick={() => setPkg(p)}
                >
                  <span className="nt-price-name">{p.name}</span>
                  <div className="nt-price-amount">
                    {p.price}{p.unit && <span className="nt-price-unit"> {p.unit}</span>}
                  </div>
                  <div className="nt-price-seg">{p.seg}</div>
                  <span className="nt-price-users">{p.users}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 26 }}>
              <NeuroBtn tone="primary" size="lg"
                onClick={() => (pkg ? setStep("pay") : window.toast?.("Pilih satu paket dulu.", { kind: "warn" }))}>
                Lanjut ke pembayaran →
              </NeuroBtn>
            </div>
          </div>
        )}

        {/* ── Step 2: payment ────────────────────────────────────── */}
        {step === "pay" && (
          <div className="nt-join-card">
            <div className="nt-eyebrow">Langkah 2 dari 3</div>
            <h1 className="nt-join-h1">Pembayaran</h1>
            <p className="nt-join-sub">
              Simulasi pembayaran untuk keperluan demo, tidak ada transaksi nyata.
            </p>
            <div className="nt-join-paybox">
              <div>Paket <strong>{pkg.name}</strong></div>
              <div className="nt-join-payamount">{pkg.price}{pkg.unit && " " + pkg.unit}</div>
            </div>
            <label className="nt-join-field">
              <span>Nama lengkap</span>
              <input className="nt-join-input" value={payName}
                onChange={(e) => setPayName(e.target.value)} placeholder="Nama Anda" />
            </label>
            <label className="nt-join-field">
              <span>Email</span>
              <input className="nt-join-input" type="email" value={payEmail}
                onChange={(e) => setPayEmail(e.target.value)} placeholder="email@anda.com" />
            </label>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <NeuroBtn tone="default" size="lg" onClick={() => setStep("package")}>← Kembali</NeuroBtn>
              <NeuroBtn tone="primary" size="lg" onClick={doPay}>Bayar sekarang</NeuroBtn>
            </div>
          </div>
        )}

        {/* ── Step 3: set-up profile ─────────────────────────────── */}
        {step === "setup" && (
          <div className="nt-join-card nt-join-card--wide">
            <div className="nt-eyebrow">Langkah 3 dari 3</div>
            <h1 className="nt-join-h1">Set-Up Profile</h1>
            <p className="nt-join-sub">Lengkapi data perusahaan dan pekerja Anda.</p>
            <div className="nt-join-note">
              ℹ️ Tenang, data ini masih bisa Anda adjust (tambah/hapus pekerja) di dalam aplikasi nanti.
            </div>

            <label className="nt-join-field">
              <span>Nama perusahaan</span>
              <input className="nt-join-input" value={companyName}
                onChange={(e) => setCompanyName(e.target.value)} placeholder="mis. PT Maju Bersama" />
            </label>

            <div className="nt-join-section-label">
              {isFree ? "Akun Anda · peran: Pekerja" : "Akun pemilik · peran: Manajemen"}
            </div>
            <div className="nt-join-grid3">
              <input className="nt-join-input" value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)} placeholder="Nama Anda" />
              <input className="nt-join-input" value={ownerDesc}
                onChange={(e) => setOwnerDesc(e.target.value)} placeholder="Deskripsi peran" />
              <input className="nt-join-input" type="text" value={ownerPass}
                onChange={(e) => setOwnerPass(e.target.value)} placeholder="Password" />
            </div>

            {isFree ? (
              <div className="nt-join-note" style={{ marginTop: 22 }}>
                Paket Free hanya untuk 1 pengguna individu, jadi tidak ada data pekerja tambahan.
              </div>
            ) : (
              <>
                <div className="nt-join-section-label">
                  Data pekerja · maksimal {limit} pekerja untuk paket {pkg.name}
                </div>
                {workers.map((w, i) => (
                  <div className="nt-join-worker" key={i}>
                    <input className="nt-join-input" value={w.name}
                      onChange={(e) => setWorker(i, "name", e.target.value)} placeholder="Nama pekerja" />
                    <select className="nt-join-input" value={w.role}
                      onChange={(e) => setWorker(i, "role", e.target.value)}>
                      {JOIN_ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                    <input className="nt-join-input" value={w.roleDesc}
                      onChange={(e) => setWorker(i, "roleDesc", e.target.value)}
                      placeholder="Deskripsi peran (mis. Driver Truk)" />
                    <input className="nt-join-input" type="text" value={w.password}
                      onChange={(e) => setWorker(i, "password", e.target.value)} placeholder="Password" />
                    <button className="nt-join-del" type="button"
                      onClick={() => removeWorker(i)} title="Hapus pekerja">✕</button>
                  </div>
                ))}
                <button className="nt-join-add" type="button" onClick={addWorker}>+ Tambah pekerja</button>
              </>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <NeuroBtn tone="default" size="lg" onClick={() => setStep("pay")}>← Kembali</NeuroBtn>
              <NeuroBtn tone="primary" size="lg" onClick={save}>
                {busy ? "Menyimpan…" : "Simpan & buat perusahaan"}
              </NeuroBtn>
            </div>
          </div>
        )}

        {/* ── Step 4: done ───────────────────────────────────────── */}
        {step === "done" && (
          <div className="nt-join-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44 }}>🎉</div>
            <h1 className="nt-join-h1">Perusahaan terdaftar!</h1>
            <p className="nt-join-sub">
              Simpan kode di bawah ini. Pekerja Anda memakainya untuk login ke NeuroTech.
            </p>
            <div className="nt-join-code">{code}</div>
            <p className="nt-join-sub">Paket {pkg.name} · {companyName}</p>
            <div style={{ marginTop: 22 }}>
              <NeuroBtn tone="primary" size="lg" onClick={enterDashboard}>
                Masuk ke dashboard →
              </NeuroBtn>
            </div>
          </div>
        )}
      </div>

      {/* Payment-success pop-up */}
      <Modal
        open={paid}
        onClose={startSetup}
        tone="success"
        title="Selamat, pembayaran berhasil! 🎉"
        subtitle="Pembayaran paket Anda berhasil (simulasi). Selanjutnya, lengkapi profil perusahaan Anda."
        actions={<NeuroBtn tone="primary" onClick={startSetup}>Set-Up Profile →</NeuroBtn>}
      />
    </div>
  );
};

Object.assign(window, { JoinFlow });
