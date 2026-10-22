const useWorkerAlerts = () => {
  const [state,setState]=React.useState(()=>window.ntWorkerAlerts.state());
  React.useEffect(()=>{const update=()=>setState(window.ntWorkerAlerts.state());window.addEventListener("nt-worker-alerts",update);update();return()=>window.removeEventListener("nt-worker-alerts",update);},[]);
  return state;
};
const alertStage = (row) => row.pending ? "Menyinkronkan" : row.resolvedAt ? "Selesai" : row.acknowledgedAt ? "Dikonfirmasi pekerja" : "Menunggu konfirmasi";
const alertPriority = {info:"Informasi",attention:"Perhatian",urgent:"Prioritas"};
const AlertRows = ({rows,staff=false}) => {
  const [busy,setBusy]=React.useState(null),[error,setError]=React.useState("");
  const act=async(row)=>{setBusy(row.id);setError("");try{await (staff?window.ntWorkerAlerts.resolve(row.id):window.ntWorkerAlerts.acknowledge(row.id));}catch(e){setError(e.message);}finally{setBusy(null);}};
  return <><div className="alert-message-list">{rows.map(row=><article key={row.id} className={`alert-message is-${row.severity}`}>
    <div className="alert-message-meta"><span>{alertPriority[row.severity] || "Pesan K3"}</span><small>{row.createdAt ? archiveDate(row.createdAt):"Memproses waktu kirim"}</small></div>
    <strong>{row.title}</strong>{staff&&<small>Untuk: {window.ntSession?.get()?.members?.find(m=>m.id===row.memberId)?.name || "Pekerja"}</small>}
    <p>{row.message}</p><div className="alert-message-footer"><span>{alertStage(row)}</span>
      {!row.resolvedAt && (staff || !row.acknowledgedAt) && <button type="button" className="frm-button" disabled={busy!==null || row.pending} onClick={()=>act(row)}>{busy===row.id?"Menyimpan…":staff?"Selesaikan alert":"Saya sudah membaca"}</button>}
    </div>
  </article>)}</div>{error&&<p role="alert">{error}</p>}</>;
};
const WorkerAlertInbox = () => {
  const state=useWorkerAlerts();
  return <section className="worker-inbox" aria-label="Pesan petugas K3"><div className="worker-home-section-heading"><h2>Pesan K3</h2><span>{state.rows.filter(r=>!r.acknowledgedAt&&!r.resolvedAt).length} baru</span></div>
    {state.error ? <p role="status">{state.error} <button type="button" className="archive-back" onClick={()=>window.ntWorkerAlerts.retry()}>Coba lagi</button></p> : !state.rows.length ? <p className="archive-muted">{state.ready?"Belum ada pesan dari petugas.":"Memuat pesan…"}</p>:<AlertRows rows={state.rows.slice(0,10)}/>}
    {state.rows.length>10&&<details><summary>Pesan lainnya ({state.rows.length-10})</summary><AlertRows rows={state.rows.slice(10)}/></details>}
  </section>;
};
const WorkerAlertNotice = () => {
  const state=useWorkerAlerts(),[open,setOpen]=React.useState(false);
  const pending=state.rows.filter(r=>!r.pending&&!r.acknowledgedAt&&!r.resolvedAt);
  if(!pending.length&&!open) return null;
  return <><button type="button" className="worker-alert-notice" onClick={()=>setOpen(true)} aria-label={`Buka ${pending.length} pesan K3 baru`}><span aria-hidden="true">●</span><span><strong>{pending[0]?.title || "Pesan K3"}</strong><small>{pending.length} pesan menunggu konfirmasi</small></span><span aria-hidden="true">↗</span></button>
    <Modal open={open} onClose={()=>setOpen(false)} title="Pesan petugas K3" actions={<NeuroBtn tone="default" onClick={()=>setOpen(false)}>Tutup</NeuroBtn>}><WorkerAlertInbox/></Modal></>;
};
const StaffAlertSummary = () => {
  const state=useWorkerAlerts();const open=state.rows.filter(r=>!r.resolvedAt),confirmed=open.filter(r=>r.acknowledgedAt);
  return <section className="staff-alert-summary"><div className="message-art" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M9 8h30v24H22l-10 8v-8H9zM16 16h16M16 23h10" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg></div><div><small>PESAN & TINDAK LANJUT</small><h2>{state.error?"Periksa koneksi pesan":`${open.length} alert aktif`}</h2><p>{confirmed.length} dikonfirmasi pekerja · {state.rows.filter(r=>r.resolvedAt).length} selesai</p></div><Link className="archive-primary" to="/s/alerts">Kelola alert ↗</Link></section>;
};
const StaffAlertCenter = () => {
  const state=useWorkerAlerts(),members=(window.ntSession?.get()?.members||[]).filter(m=>m.role==="pekerja"&&m.uid);
  const [memberId,setMemberId]=React.useState(""),[title,setTitle]=React.useState(""),[message,setMessage]=React.useState(""),[severity,setSeverity]=React.useState("attention"),[filter,setFilter]=React.useState("open"),[busy,setBusy]=React.useState(false),[feedback,setFeedback]=React.useState("");
  const submit=async(e)=>{e.preventDefault();setBusy(true);setFeedback("");try{await window.ntWorkerAlerts.send({memberId,title,message,severity});setTitle("");setMessage("");setFeedback("Alert tersimpan. Konfirmasi pekerja akan muncul setelah ia membacanya.");}catch(e){setFeedback(e.message);}finally{setBusy(false);}};
  const rows=state.rows.filter(r=>filter==="all" || (filter==="open"?!r.resolvedAt:!!r.resolvedAt));
  return <section aria-label="Pengiriman alert pekerja"><div className="alert-workspace"><form className="alert-compose" onSubmit={submit}><div className="supervisor-kicker">KOMUNIKASI K3</div><h2>Kirim arahan</h2><p>Pesan muncul di aplikasi pekerja saat terbuka atau dibuka kembali.</p>
    <label className="archive-field">Pekerja<select aria-label="Penerima alert" value={memberId} onChange={e=>setMemberId(e.target.value)} required><option value="">Pilih pekerja</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    <label className="archive-field">Prioritas<select aria-label="Prioritas alert" value={severity} onChange={e=>setSeverity(e.target.value)}>{Object.entries(alertPriority).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label className="archive-field">Judul<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} placeholder="Contoh: evaluasi kondisi sebelum lanjut" required/></label>
    <label className="archive-field">Pesan<textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={1000} rows={4} placeholder="Tuliskan arahan yang perlu dilakukan pekerja." required/></label>
    <button className="archive-primary" disabled={busy||!state.enabled||!members.length}>{busy?"Mengirim…":"Kirim alert"}</button>{!members.length&&<p>Belum ada pekerja dengan akun aktif.</p>}{feedback&&<p role="status">{feedback}</p>}
  </form><div className="alert-history"><div className="supervisor-section-heading"><h2>Status pesan</h2><select aria-label="Filter status pesan" value={filter} onChange={e=>setFilter(e.target.value)}><option value="open">Aktif</option><option value="done">Selesai</option><option value="all">Semua</option></select></div>
    {state.error&&<p role="alert">{state.error} <button className="archive-back" type="button" onClick={()=>window.ntWorkerAlerts.retry()}>Coba lagi</button></p>}
    {!rows.length?<div className="alert-empty"><div className="message-art" aria-hidden="true">↗</div><h3>Belum ada pesan {filter==="done"?"selesai":"pada daftar ini"}</h3><p>Status konfirmasi pekerja diperbarui otomatis.</p></div>:<AlertRows rows={rows} staff/>}
  </div></div></section>;
};
Object.assign(window,{WorkerAlertInbox,WorkerAlertNotice,StaffAlertCenter,StaffAlertSummary});
