// One export format for archive, company and local monitoring reports.
(function () {
  "use strict";
  var labels = { normal: "Normal", waspada: "Waspada", berisiko: "Berisiko", kritis: "Kritis", unavailable: "Belum tersedia" };
  function user() { return window.ntSession?.get?.() || null; }
  function person(r) {
    var current = user();
    if (r.source === "demo") return "Pekerja Simulasi";
    return current?.members?.find(function (m) { return m.id === r.memberId; })?.name || (r.ownerUid === current?.uid ? current.memberName : "Anggota tidak terdaftar");
  }
  function company(r) { return r.source === "demo" ? "Perusahaan Simulasi" : user()?.companyName || r.companyCode || "Sesi perangkat"; }
  function zone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  function stamp(ts) {
    if (!Number.isFinite(ts)) return { date: "", time: "", iso: "" };
    var d = new Date(ts);
    return { date: [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-"),
      time: [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (v) { return String(v).padStart(2, "0"); }).join(":"), iso: d.toISOString() };
  }
  function cell(value, excel) {
    if (value == null || (typeof value === "number" && !Number.isFinite(value))) return '""';
    var text = typeof value === "number" ? String(Number(value.toFixed(2))) : String(value);
    if (typeof value === "number" && excel) text = text.replace(".", ",");
    // Text supplied by users must not execute as a spreadsheet formula.
    if (typeof value === "string" && /^[\s]*[=+\-@\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function table(rows, options) {
    var excel = options?.excel !== false, separator = excel ? ";" : ",";
    return (excel ? "sep=;\r\n" : "") + rows.map(function (r) { return r.map(function (v) { return cell(v, excel); }).join(separator); }).join("\r\n") + "\r\n";
  }
  var identityHeaders = ["Perusahaan", "Nama Pekerja", "ID Anggota", "ID Sesi", "Sumber Data", "Shift", "Tanggal Mulai", "Waktu Mulai", "Zona Waktu", "Mulai (UTC ISO)"];
  function identity(r) { var date = stamp(r.startedAt); return [company(r), person(r), r.memberId || "", r.id, r.source, r.shift, date.date, date.time, zone(), date.iso]; }
  function stats(r) { return r.summary || window.ntSessionArchive.summary(r); }
  function summary(records, options) {
    var rows = [identityHeaders.concat(["Status Sesi", "Selesai (UTC ISO)", "Durasi Sesi (menit)", "EEG Diterima (menit)", "Target Pantau (menit per hari)", "Hasil Bersih", "Hasil Terbatas", "Baseline Sementara", "Hasil Bersih (%)", "Fatigue Rata-rata (0-100)", "Fatigue Maksimum (0-100)", "Beban Kognitif (0-100)", "Engagement (0-100)", "Kategori Rerata", "Indikasi Microsleep", "Tidur Dilaporkan (jam)", "Target Tidur (jam)", "Kekurangan Tidur (jam)", "Kantuk Dilaporkan (1-5)", "Catatan Pekerja", "Status Evaluasi", "Catatan Evaluasi", "Dievaluasi (UTC ISO)", "Status Sinkronisasi", "Algoritma"])];
    records.forEach(function (r) {
      var s = stats(r), c = r.checkin || {};
      rows.push(identity(r).concat([r.status, stamp(r.endedAt).iso, s.durationMinutes, s.receivedMinutes, c.targetMinutes, s.clean, s.partial, s.provisional, s.cleanPercent,
        s.meanFI, s.maxFI, s.meanCLI, s.meanEI, labels[window.ntSessionInsights.status(s.meanFI, s.meanCLI)], s.incidents,
        c.sleptHours, c.sleepTargetHours, s.sleepDebt, c.sleepiness, c.note || "", r.review ? "Sudah ditinjau" : "Belum ditinjau", r.review?.note || "", stamp(r.review?.reviewedAt).iso,
        r.source === "demo" ? "Simulasi" : r.synced ? "Tersinkron Firebase" : "Salinan perangkat", r.algorithmVersion]));
    });
    return table(rows, options);
  }
  function minutes(r, options) {
    var rows = [identityHeaders.concat(["Menit Ke", "Waktu Menit (UTC ISO)", "Hasil Bersih", "Hasil Terbatas", "Baseline Sementara", "Fatigue Rata-rata (0-100)", "Fatigue Maksimum (0-100)", "Beban Kognitif (0-100)", "Engagement (0-100)", "Indikasi Microsleep", "Kualitas Hasil"])];
    r.minutes.slice().sort(function (a, b) { return a.minute - b.minute; }).forEach(function (m) {
      rows.push(identity(r).concat([m.minute + 1, stamp(r.startedAt + m.minute * 60000).iso, m.n, m.partial, m.provisional,
        m.n ? m.fi / m.n : null, m.n ? m.fiMax : null, m.n ? m.cli / m.n : null, m.n ? m.ei / m.n : null, m.incidents,
        m.n ? m.partial ? "Bersih dan terbatas" : "Bersih" : m.partial ? "Terbatas; indeks tidak disertakan" : "Belum ada hasil"]));
    });
    return table(rows, options);
  }
  function live(history, options) {
    var rows = [["Waktu (UTC ISO)", "Fatigue Index (0-100)", "Beban Kognitif (0-100)", "Engagement (0-100)", "Indikasi Microsleep", "Kualitas Sinyal", "Kategori Tren", "Sementara", "Kategori Sesaat", "Sumber Data"]];
    history.forEach(function (p) { rows.push([stamp(p.ts).iso, p.fi, p.cli, p.ei, p.microsleep ? 1 : 0, p.quality || "", labels[p.status] || "", p.provisional ? 1 : 0, labels[p.instantStatus] || "", p.source || ""]); });
    return table(rows, options);
  }
  function safeName(text) { return String(text || "laporan").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "laporan"; }
  function filename(kind, record) { return ["NeuroTech", record?.source === "demo" ? "SIMULASI" : "K3", safeName(kind), safeName(record ? person(record) : user()?.companyName), stamp(record?.startedAt ?? Date.now()).date, record ? safeName(record.id) : ""].filter(Boolean).join("_") + ".csv"; }
  function download(content, name) {
    var url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }));
    var link = document.createElement("a"); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  window.ntReports = { summary: summary, minutes: minutes, live: live, table: table, filename: filename, download: download, person: person, company: company, stamp: stamp, zone: zone };
})();
