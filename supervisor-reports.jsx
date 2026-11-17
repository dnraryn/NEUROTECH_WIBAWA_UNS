// Persisted session reports shared by supervisors and management.
const SupervisorReports = () => (
  <div className="nt-screen archive-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="reports" />
    <main style={{ padding: "24px 28px 24px 6px", overflowY: "auto" }}>
      <PageHeader title="Laporan K3" />
      <SessionArchiveHub />
    </main>
  </div>
);
const SupervisorReportDetail = ({ id }) => {
  const state = useSessionArchive();
  const record = state.rows.find((r) => r.id === id);
  const account = window.ntSession?.get();
  const [loading,setLoading] = React.useState(false), [error,setError] = React.useState(""), [attempt,retry] = React.useReducer(n=>n+1,0);
  React.useEffect(()=>{
    if (!state.ready || (record && !record._needsReview)) return;
    let cancelled=false; setLoading(true); setError("");
    window.ntSessionArchive.loadReport(id).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[id,account?.uid,account?.code,state.ready,!!record,record?._needsReview,attempt]);
  return <div className="nt-screen archive-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="reports" />
    <main style={{ padding: "24px 28px 24px 6px", overflowY: "auto" }}>
      <PageHeader backTo={staffPath("/s/reports")} title="Laporan sesi K3" />
      {record ? <SessionReport key={record.id} record={record} /> : <div className="archive-empty">{loading || !state.ready ? "Memuat laporan…" : error || "Laporan tidak tersedia untuk akun atau perangkat ini. Pilih sesi pada arsip laporan."}{!loading && error && <button type="button" className="frm-button" onClick={retry}>Coba lagi</button>}</div>}
    </main>
  </div>;
};
Object.assign(window, { SupervisorReports, SupervisorReportDetail });
