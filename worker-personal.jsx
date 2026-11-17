// Personal condition and history use only the authenticated worker's Muse data.
const usePersonalMonitor = () => {
  const state=useSessionArchive(), account=window.ntSession?.get();
  const [now,setNow]=React.useState(Date.now());
  React.useEffect(()=>{
    const update=()=>setNow(Date.now());
    window.addEventListener("nt-data",update);window.addEventListener("nt-device",update);
    const timer=setInterval(update,1000);
    return()=>{clearInterval(timer);window.removeEventListener("nt-data",update);window.removeEventListener("nt-device",update);};
  },[]);
  const rows=window.ntSessionInsights.rows(state,{ownOnly:true,source:"muse"});
  const dsp=window.ntMuseDSP || {},device=window.ntMuse?.status?.() || {};
  const live=window.ntManagement.snapshot({now,device,dsp,history:window.ntHistory?.(window.CURRENT_WORKER?.id) || []});
  const result=window.ntManagement.personalResult(rows,live,account?.uid);
  return {state,account,rows,now,dsp,device,live,result};
};

const PersonalMetricSet = ({ metrics, title }) => <section className="personal-metric-set" aria-label={title}>
  <div className="worker-section-title"><h2>{title}</h2><span>0–100</span></div>
  <div className="worker-home-scores">{[["Fatigue",metrics?.fi,"#2563eb"],["Beban",metrics?.cli,"#8b5cf6"],["Engagement",metrics?.ei,"#0891b2"]].map(([label,value,color])=><ArchiveMetricRing key={label} label={label} value={value} color={color}/>)}</div>
</section>;

const PersonalCheckin = ({ active }) => {
  const [sleepiness,setSleepiness]=React.useState(""),[note,setNote]=React.useState(""),[busy,setBusy]=React.useState(false),[feedback,setFeedback]=React.useState("");
  const saving=React.useRef(false);
  React.useEffect(()=>{setSleepiness(String(active?.checkin?.sleepiness || ""));setNote(active?.checkin?.note || "");setFeedback("");},[active?.id]);
  const save=async e=>{
    e.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setFeedback("");
    try{const ok=await window.ntSessionArchive.updateCheckin({sleepiness:sleepiness?Number(sleepiness):null,note});setFeedback(ok?"Catatan tersimpan di perangkat dan mengikuti sinkronisasi sesi.":"Catatan ada di memori; penyimpanan perangkat belum berhasil.");}
    catch(error){setFeedback(error.message);}finally{saving.current=false;setBusy(false);}
  };
  if(!active)return null;
  return <details className="personal-checkin"><summary>Catat kondisi saya</summary><form onSubmit={save}>
    <label className="archive-field">Kantuk yang dirasakan<select aria-label="Kantuk yang dirasakan" value={sleepiness} onChange={e=>setSleepiness(e.target.value)} disabled={busy}><option value="">Belum diisi</option>{["Tidak mengantuk","Sedikit mengantuk","Sedang","Mengantuk","Sangat mengantuk"].map((label,i)=><option key={label} value={i+1}>{i+1} · {label}</option>)}</select></label>
    <label className="archive-field">Catatan kondisi<textarea aria-label="Catatan kondisi" value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={3} disabled={busy}/></label>
    <button className="archive-primary" disabled={busy}>{busy?"Menyimpan…":"Simpan kondisi"}</button>{feedback&&<p role="status">{feedback}</p>}
  </form></details>;
};

const PersonalMicrosleepHistory = ({ rows, onOpen }) => {
  const entries=rows.flatMap(r=>(r.minutes || []).filter(m=>m.incidents>0).map(m=>({record:r,minute:m.minute,count:m.incidents,ts:r.startedAt+m.minute*60000}))).sort((a,b)=>b.ts-a.ts);
  const eligible=rows.some(r=>r.summary.clean>r.summary.provisional);
  return <section className="personal-condition-card" aria-label="Riwayat indikasi microsleep"><div className="worker-section-title"><h2>Indikasi microsleep</h2><span>{entries.reduce((n,e)=>n+e.count,0)} tercatat</span></div>
    {!entries.length?<p className="archive-muted">{eligible?"Belum ada indikasi tercatat pada arsip yang dimuat.":"Belum dapat dinilai dari arsip. Deteksi memerlukan baseline pribadi dan EEG bersih."}</p>:<div className="personal-event-list">{entries.slice(0,8).map(e=><button type="button" key={`${e.record.id}:${e.minute}`} onClick={()=>onOpen(e.record.id)}><VisualIcon name="signal" size={20}/><span><strong>{e.count} indikasi</strong><small>{archiveDate(e.ts)} · menit {e.minute+1}</small></span><span>↗</span></button>)}</div>}
    <small className="archive-muted">Agregat per menit; durasi setiap kejadian tidak direkam.</small>
  </section>;
};

const PersonalReportModal = ({ selection, onClose }) => <Modal open={selection!==null} onClose={onClose} title="Laporan pribadi" width={900} actions={<NeuroBtn onClick={onClose}>Tutup</NeuroBtn>}>
  <SessionArchiveHub key={selection || "all"} ownOnly initialId={selection || null}/>
</Modal>;

const RealWorkerWellness = () => {
  const {state,rows,account,live,result,dsp}=usePersonalMonitor();
  const [report,setReport]=React.useState(null);
  const active=rows.find(r=>r.id===state.activeId), latest=active || rows[0];
  const daily=window.ntSessionInsights.aggregate(rows,{ownOnly:true,days:1});
  const checkin=latest?.checkin;
  const assessed=result.record?window.ntSessionInsights.assess(result.record):null;
  const microsleep=live.valid && dsp.baseline && !live.latest?.classificationProvisional && live.latest?.qualityLevel==="good" && live.latest?.outputScope==="full" ? live.latest.microsleep===true:null;
  const archiveAdvice=result.record?.summary.incidents>0?"Arsip mencatat indikasi microsleep. Tinjau hasil bersama petugas K3.":assessed?.ready?{normal:"Pantau perubahan pada pengukuran berikutnya.",waspada:"Periksa kondisi Anda dan pantau kembali.",berisiko:"Ambil jeda dan diskusikan kondisi dengan petugas.",kritis:"Tinjau hasil ini bersama petugas K3."}[assessed.status]:"Periksa kualitas pengukuran sebelum menafsirkan hasil tersimpan.";
  const copy=result.kind==="live"?live.conclusion.action:result.kind==="preview"?"Hasil tersimpan masih sementara. Pantau kualitas sensor dan perubahan indeks.":result.kind==="archive"?archiveAdvice:"Buka Live untuk memeriksa sensor dan memulai pengukuran.";
  return <div className="nt-screen personal-condition">
    <WorkerPageHeader title="Kondisi saya" eyebrow="PEMANTAUAN PRIBADI" action={<Link to="/w/stats" aria-label="Buka riwayat kondisi"><VisualIcon name="history"/></Link>}/>
    <div className="personal-page-content">
      <section className="personal-condition-hero" aria-label="Sumber kondisi pribadi"><div><VisualIcon name="signal" size={24}/><span>{result.kind==="empty"?"Menunggu pengukuran":result.title}</span></div><h2>{result.kind==="live"?live.conclusion.title:result.kind==="preview"?"Pola EEG sementara":result.kind==="archive"?"Ringkasan sesi tersimpan":"Kenali kondisi Anda"}</h2><p>{copy}</p><small>{result.timestamp?archiveDate(result.timestamp):account?.memberName}{result.provisional?" · sementara":""}</small><Link to="/w/live" style={{color:"#1d4ed8"}}>{result.kind==="live"?"Lihat Live":"Buka Live"} <span>↗</span></Link></section>
      <PersonalMetricSet metrics={result.metrics} title="Indeks EEG pribadi"/>
      <div className="personal-current-microsleep"><small>SAAT INI · {live.valid?"Hasil Live":"Belum ada hasil Live"}</small><MicrosleepLiveIndicator value={microsleep}/></div>
      <section className="personal-condition-card" aria-label="Kondisi yang dilaporkan"><div className="worker-section-title"><h2>Catatan sesi</h2><span>{active?"Sesi aktif":"Terakhir tersimpan"}</span></div><div className="personal-condition-facts">
        {[["Tidur",checkin?.sleptHours,"jam"],["Kurang tidur",checkin?.sleptHours==null?null:Math.max(0,checkin.sleepTargetHours-checkin.sleptHours),"jam"],["Kantuk",checkin?.sleepiness,"/5"]].map(([label,value,unit])=><div key={label}><VisualIcon name={label==="Tidur"?"moon":"chart"} size={19}/><strong>{archiveNumber(value,1)} <small>{unit}</small></strong><span>{label}</span></div>)}
      </div><small className="archive-muted">Diisi sendiri; bukan hasil pengukuran EEG.</small>{checkin?.note&&<p className="personal-note">{checkin.note}</p>}</section>
      <PersonalCheckin active={active}/>
      <section className="personal-condition-card"><div className="worker-section-title"><h2>Pantauan hari ini</h2><span>{daily.sessions} sesi</span></div><div className="personal-monitor-summary"><strong>{archiveNumber(daily.receivedMinutes,1)} <small>menit EEG</small></strong><span>{daily.clean} bersih · {daily.preview.count} sementara</span></div></section>
      <PersonalMicrosleepHistory rows={rows} onOpen={setReport}/>
      <Link to="/w/audio" className="personal-audio-link"><VisualIcon name="headphones" size={28}/><span><strong>Audio relaksasi</strong><small>Hujan, ombak, angin, dan musik</small></span><span>↗</span></Link>
      <PersonalSessionSettings/>
      <details className="visual-method"><summary><VisualIcon name="info" size={16}/>Tentang hasil kondisi</summary><p>FI, beban kognitif, dan engagement adalah indeks pola EEG prototipe. Beban kognitif bukan pengukuran stres psikologis. Skor kesiapan dan HRV memerlukan sumber data yang belum tersedia. Hasil tersimpan menampilkan kondisi saat sesi tersebut, bukan keadaan saat ini. Sesi yang belum tersinkron hanya tersedia pada perangkat ini.</p></details>
    </div>
    <PersonalReportModal selection={report} onClose={()=>setReport(null)}/>
    <NeuroTabBar active="pulse"/>
  </div>;
};

const PersonalHistoryChart = ({ points, metric, provisional }) => {
  const time=date=>Date.parse(date+"T00:00:00Z");
  const start=points.length?time(points[0].date):0,end=points.length?time(points[points.length-1].date):0;
  let previous=null;
  const plotted=points.map(p=>{
    if(!Number.isFinite(p[metric])){previous=null;return null;}
    const x=32+(time(p.date)-start)/Math.max(86400000,end-start)*300,y=128-p[metric];
    const path=previous && time(p.date)-time(previous.date)===86400000?`M${previous.x},${previous.y}L${x},${y}`:"";
    previous={date:p.date,x,y};return {...p,x,y,path};
  }).filter(Boolean);
  return plotted.length?<div className="personal-history-chart"><svg viewBox="0 0 350 166" role="img" aria-label="Tren indeks pribadi per hari">{[0,25,50,75,100].map(v=><g key={v}><line x1="32" x2="332" y1={128-v} y2={128-v} stroke="var(--nt-bg-deep)"/><text x="3" y={132-v} fontSize="10" fill="currentColor">{v}</text></g>)}<path d={plotted.map(p=>p.path).join("")} stroke={provisional?"#8b5cf6":"#2563eb"} strokeWidth="2.5" strokeDasharray={provisional?"5 4":undefined} fill="none"/>{plotted.map(p=><circle key={p.date} cx={p.x} cy={p.y} r="4" fill={provisional?"#8b5cf6":"#2563eb"}><title>{p.date}: {p[metric]}</title></circle>)}<text x="32" y="156" fontSize="10" fill="currentColor">{points[0].date}</text><text x="332" y="156" textAnchor="end" fontSize="10" fill="currentColor">{points[points.length-1].date}</text></svg></div>:<p className="archive-empty">Belum ada indeks ini pada sumber dan periode terpilih.</p>;
};

const PersonalBrainTimeline = ({ record, source, onOpen }) => {
  const points=window.ntSessionInsights.personalSeries(record?[record]:[],{metricSource:source});
  const colored=points.filter(p=>Number.isFinite(p.fi));
  const colors={normal:"#60a5fa",waspada:"#eab308",berisiko:"#f97316",kritis:"#ef4444"};
  const end=Math.max(1,...points.map(p=>p.minute+1));
  return <section className="personal-condition-card" aria-label="Timeline sesi pribadi"><div className="worker-section-title"><h2>Timeline sesi</h2><span>{source==="preview"?"Sementara":"Bersih"}</span></div>
    {colored.length?<><svg className="personal-brain-timeline" viewBox="0 0 600 140" role="img" aria-label="Timeline fatigue dan indikasi microsleep pribadi">{[0,50,100].map(v=><line key={v} x1="0" x2="600" y1={120-v} y2={120-v} stroke="var(--nt-bg-deep)"/>)}{colored.map(p=><g key={p.minute}><rect x={p.minute/end*600} y={120-p.fi} width={Math.max(.4,600/end-2)} height={Math.max(1,p.fi)} rx="2" fill={colors[window.ntSessionInsights.status(p.fi,p.cli)]} opacity={source==="preview"?.65:1}><title>Menit {p.minute+1}: FI {archiveNumber(p.fi)}{p.incidents?` · ${p.incidents} indikasi microsleep`:""}</title></rect>{p.incidents>0&&<circle cx={(p.minute+.5)/end*600} cy="8" r="4" fill="#ef4444"/>}</g>)}</svg><div className="personal-timeline-legend"><span>Menit 1–{end}</span><span>● Indikasi microsleep</span></div></>:<p className="archive-muted">Belum ada Fatigue Index pada sesi dan sumber ini.</p>}
    {record&&<button type="button" className="archive-back" onClick={()=>onOpen(record.id)}>Buka laporan sesi ↗</button>}
  </section>;
};

const RealWorkerHistory = () => {
  const state=useSessionArchive();
  const [days,setDays]=React.useState(0),[source,setSource]=React.useState("auto"),[metric,setMetric]=React.useState("fi"),[sessionId,setSessionId]=React.useState(""),[report,setReport]=React.useState(null),[error,setError]=React.useState("");
  const data=window.ntSessionInsights.aggregate(state,{ownOnly:true,source:"muse",days});
  const rows=data.rows,selected=fatigueSeries(data,source),metricSource=selected.preview?"preview":"clean";
  const points=window.ntSessionInsights.personalDays(rows,{metricSource});
  const chosen=rows.find(r=>r.id===sessionId) || rows.find(r=>Number.isFinite(selected.preview?window.ntSessionInsights.previewSummary(r).meanFI:r.summary.meanFI)) || rows[0];
  const values=points.filter(p=>Number.isFinite(p[metric])),delta=values.length>1?values[values.length-1][metric]-values[0][metric]:null;
  const more=async()=>{setError("");try{await window.ntSessionArchive.loadMore();}catch(e){setError(e.message);}};
  return <div className="nt-screen personal-history">
    <WorkerPageHeader title="Riwayat saya" eyebrow="SESI & PERUBAHAN INDEKS" action={<button type="button" className="archive-back" aria-label="Unduh riwayat CSV" disabled={!rows.length} onClick={()=>archiveSummaryDownload(rows)}><VisualIcon name="download"/></button>}/>
    <div className="personal-page-content">
      <div className="personal-periods" role="group" aria-label="Periode riwayat">{[[7,"7 hari"],[30,"30 hari"],[90,"90 hari"],[0,"Semua"]].map(([n,label])=><button type="button" key={n} aria-pressed={days===n} onClick={()=>setDays(n)}>{label}</button>)}</div>
      <section className="personal-history-summary" aria-label="Ringkasan riwayat pribadi"><div><VisualIcon name="history" size={24}/><strong>{rows.length}</strong><span>Sesi</span></div><div><VisualIcon name="signal" size={24}/><strong>{archiveNumber(data.receivedMinutes,1)}</strong><span>Menit EEG</span></div><div><VisualIcon name="chart" size={24}/><strong>{data.clean>data.provisional?data.incidents:"—"}</strong><span>Indikasi</span></div></section>
      <section className="personal-condition-card"><FatigueSourceControl value={source} onChange={setSource}/><small className="archive-muted">{selected.label}</small><PersonalMetricSet title="Rerata indeks" metrics={{fi:selected.meanFI,cli:selected.meanCLI,ei:selected.meanEI}}/></section>
      <section className="personal-condition-card" aria-label="Grafik riwayat pribadi"><div className="worker-section-title"><h2>Tren indeks</h2><select aria-label="Indeks grafik riwayat" value={metric} onChange={e=>setMetric(e.target.value)}><option value="fi">Fatigue</option><option value="cli">Beban</option><option value="ei">Engagement</option></select></div><strong className="personal-trend-copy">{delta===null?"Menunggu dua hari dengan hasil":delta>0?`Naik ${delta} poin`:delta<0?`Turun ${Math.abs(delta)} poin`:"Tetap"}</strong><small className="archive-muted">{values.length>1?`${values[0].date} → ${values[values.length-1].date}`:"Rerata per hari dari hasil yang tersimpan"}</small><PersonalHistoryChart points={points} metric={metric} provisional={selected.preview}/></section>
      {rows.length>0&&<><label className="archive-field">Pilih sesi timeline<select aria-label="Pilih sesi timeline" value={chosen?.id || ""} onChange={e=>setSessionId(e.target.value)}>{rows.map(r=><option key={r.id} value={r.id}>{archiveDate(r.startedAt)} · {r.shift}</option>)}</select></label><PersonalBrainTimeline record={chosen} source={metricSource} onOpen={setReport}/></>}
      <PersonalMicrosleepHistory rows={rows} onOpen={setReport}/>
      <section className="personal-condition-card" aria-label="Daftar sesi pribadi"><div className="worker-section-title"><h2>Sesi tersimpan</h2><button type="button" className="archive-back" onClick={()=>setReport("")}>Arsip lengkap ↗</button></div>
        {!rows.length?<div className="personal-history-empty"><VisualIcon name="history" size={35}/><strong>{state.ready?"Belum ada sesi di periode ini":"Memuat riwayat…"}</strong><p>Rekam sesi di Live, atau pilih periode lain.</p><Link className="archive-primary" style={{color:"#fff"}} to="/w/live">Buka Live</Link></div>:<div className="personal-session-list">{rows.map(r=>{const preview=window.ntSessionInsights.previewSummary(r),clean=Number.isFinite(r.summary.meanFI);return <button type="button" key={r.id} onClick={()=>setReport(r.id)}><span className="personal-session-icon"><VisualIcon name="signal" size={20}/></span><span><strong>{archiveDate(r.startedAt)}</strong><small>{r.shift} · {archiveNumber(r.summary.durationMinutes,1)} menit · {r.synced?"Tersinkron":"Perangkat ini"}</small><small>{clean?"FI bersih":preview.count?"FI sementara":"Indeks belum tersimpan"}</small></span><strong>{archiveNumber(clean?r.summary.meanFI:preview.meanFI)}</strong><span>↗</span></button>;})}</div>}
        {state.hasMore&&<button type="button" className="frm-button" disabled={state.loadingMore} onClick={more}>{state.loadingMore?"Memuat…":"Muat sesi sebelumnya"}</button>}
      </section>
      {(state.cloudError || error)&&<p role="status" className="archive-warning">{state.cloudError || error}</p>}
      <details className="visual-method"><summary><VisualIcon name="info" size={16}/>Info riwayat</summary><p>Grafik dan CSV hanya memakai sesi Muse milik akun ini pada perusahaan yang sama. Hasil bersih dan sementara dipisahkan; metrik yang tidak tersedia tetap kosong. Garis tidak menyambungkan hari tanpa data. Indikasi microsleep berasal dari arsip bersih, tanpa perkiraan durasi. Rerata tidak menyatakan skor audit K3 atau kesiapan bekerja.</p></details>
    </div>
    <PersonalReportModal selection={report} onClose={()=>setReport(null)}/>
    <NeuroTabBar active="chart"/>
  </div>;
};
Object.assign(window,{RealWorkerWellness,RealWorkerHistory});
