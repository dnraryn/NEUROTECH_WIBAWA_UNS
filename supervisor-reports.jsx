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
  return <div className="nt-screen archive-screen" style={{ padding: 0, display: "grid", gridTemplateColumns: "228px 1fr" }}>
    <SupervisorSidebar active="reports" />
    <main style={{ padding: "24px 28px 24px 6px", overflowY: "auto" }}>
      <PageHeader backTo={staffPath("/s/reports")} title="Laporan sesi K3" />
      {record ? <SessionReport key={record.id} record={record} /> : <div className="archive-empty">{state.ready ? "Laporan tidak tersedia untuk akun atau perangkat ini. Pilih sesi pada arsip laporan." : "Memuat laporan…"}</div>}
    </main>
  </div>;
};
Object.assign(window, { SupervisorReports, SupervisorReportDetail });
