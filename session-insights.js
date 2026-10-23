// Shared calculations for company, supervisor and personal archived results.
(function () {
  "use strict";
  var shifts = ["Pagi", "Sore", "Malam", "Lembur"];
  function account() { return window.ntSession?.get?.() || null; }
  function status(fi, cli) {
    if (!Number.isFinite(fi)) return "unavailable";
    return fi >= 76 || cli >= 82 ? "kritis" : fi >= 60 || cli >= 70 ? "berisiko" : fi >= 44 || cli >= 56 ? "waspada" : "normal";
  }
  function day(timestamp) {
    var d = new Date(timestamp);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  }
  function rows(state, options) {
    options = options || {};
    var user = options.account === undefined ? account() : options.account;
    var now = options.now ?? Date.now();
    var cutoff = options.days === 1 ? new Date(now).setHours(0, 0, 0, 0) : Number.isFinite(options.days) ? now - options.days * 86400000 : 0;
    return (Array.isArray(state) ? state : state.rows || []).filter(function (r) {
      if (r.startedAt < cutoff || r.startedAt > now) return false;
      if (user && (r.source !== "muse" || r.companyCode !== user.code || (user.role === "pekerja" && r.ownerUid !== user.uid))) return false;
      return (!options.ownOnly || !user || r.ownerUid === user.uid) && (!options.source || options.source === "all" || r.source === options.source);
    }).slice().sort(function (a, b) { return b.startedAt - a.startedAt || a.id.localeCompare(b.id); });
  }
  function aggregate(input, options) {
    var data = rows(input, options), latestByMember = new Map(), latestSleep = new Map(), daily = new Map();
    var clean = 0, partial = 0, provisional = 0, fi = 0, cli = 0, ei = 0, incidents = 0, minutes = 0;
    var bins = shifts.map(function () { return Array.from({ length: 8 }, function () { return { sum: 0, n: 0 }; }); });
    var shiftTotals = shifts.map(function () { return { sum: 0, n: 0 }; });
    var dailyTrend = new Map();
    data.forEach(function (r) {
      var identity = r.ownerUid || r.memberId || r.id;
      if (!latestByMember.has(identity)) latestByMember.set(identity, r);
      var received = (r.receivedSamples || 0) / (4 * 256 * 60);
      minutes += received;
      var key = identity + ":" + day(r.startedAt), checkin = r.checkin || {};
      if (!latestSleep.has(identity) && Number.isFinite(checkin.sleptHours) && Number.isFinite(checkin.sleepTargetHours)) latestSleep.set(identity, r);
      var monitored = daily.get(key) || { minutes: 0, target: 0 };
      monitored.minutes += received;
      if (Number.isFinite(checkin.targetMinutes)) monitored.target = Math.max(monitored.target, checkin.targetMinutes);
      daily.set(key, monitored);
      (r.minutes || []).forEach(function (m) {
        clean += m.n; partial += m.partial; provisional += m.provisional;
        fi += m.fi; cli += m.cli; ei += m.ei; incidents += m.incidents;
        var shift = shifts.indexOf(r.shift), hour = Math.floor(m.minute / 60);
        if (shift >= 0 && m.n) { shiftTotals[shift].sum += m.fi; shiftTotals[shift].n += m.n; }
        if (shift >= 0 && hour < 8 && m.n) { bins[shift][hour].sum += m.fi; bins[shift][hour].n += m.n; }
        var date = day(r.startedAt + m.minute * 60000), point = dailyTrend.get(date) || { date: date, sum: 0, n: 0 };
        point.sum += m.fi; point.n += m.n; dailyTrend.set(date, point);
      });
    });
    var coverage = Array.from(daily.values()).filter(function (d) { return d.target > 0; });
    var sleep = Array.from(latestSleep.values());
    return { rows: data, sessions: data.length, members: latestByMember.size, clean: clean, partial: partial, provisional: provisional,
      meanFI: clean ? Math.round(fi / clean) : null, meanCLI: clean ? Math.round(cli / clean) : null, meanEI: clean ? Math.round(ei / clean) : null,
      incidents: incidents, receivedMinutes: minutes, cleanPercent: clean + partial ? Math.round(clean / (clean + partial) * 100) : null,
      compliance: coverage.length ? coverage.reduce(function (s, d) { return s + Math.min(100, d.minutes / d.target * 100); }, 0) / coverage.length : null,
      complianceDays: coverage.length, sleepReportedMembers: sleep.length,
      sleepDebt: sleep.length ? sleep.reduce(function (s, r) { return s + Math.max(0, r.checkin.sleepTargetHours - r.checkin.sleptHours); }, 0) / sleep.length : null,
      heatRows: shifts.map(function (shift, i) { return { l: shift, h: bins[i].map(function (b) { return b.n ? Math.round(b.sum / b.n) : null; }) }; }),
      shiftIndices: shifts.map(function (shift, i) { var b = shiftTotals[i]; return { l: shift, v: b.n ? Math.round(b.sum / b.n) : null }; }),
      trend: Array.from(dailyTrend.values()).sort(function (a, b) { return a.date.localeCompare(b.date); }).map(function (p) { return { date: p.date, fi: p.n ? Math.round(p.sum / p.n) : null }; }) };
  }
  // Conservative reporting policy, not a clinically validated confidence score.
  // A minute with mixed calibration/measurement has no separate power sums;
  // excluding that whole minute prevents inventing a post-calibration average.
  function assess(record) {
    var clean = 0, partial = 0, n = 0, fi = 0, cli = 0, incidents = 0;
    (Array.isArray(record?.minutes) ? record.minutes : []).forEach(function (m) {
      if (!m || !Number.isInteger(m.n) || m.n < 0 || m.n > 120 || !Number.isInteger(m.partial) || m.partial < 0 || m.partial > 120) return;
      clean += m.n; partial += m.partial;
      if (!m.n || m.provisional !== 0 || ![m.fi, m.cli, m.ei].every(function (v) { return Number.isFinite(v) && v >= 0 && v <= m.n * 100; })) return;
      n += m.n; fi += m.fi; cli += m.cli;
      if (Number.isInteger(m.incidents) && m.incidents >= 0 && m.incidents <= m.n) incidents += m.incidents;
    });
    var fraction = clean + partial ? clean / (clean + partial) : 0;
    var result = { ready: false, status: "unavailable", calibratedWindows: n, cleanPercent: Math.round(fraction * 100),
      meanFI: n ? Math.round(fi / n) : null, meanCLI: n ? Math.round(cli / n) : null,
      incidents: incidents, title: "Belum cukup data", action: "Selesaikan kalibrasi dan lanjutkan rekaman bersih.", reason: "insufficient" };
    if (!record) { result.action = "Belum ada sesi Muse."; return result; }
    if (record.source !== "muse") { result.title = "Data simulasi"; result.action = "Contoh hasil, bukan pengukuran pekerja."; result.reason = "demo"; return result; }
    if (record.algorithmVersion !== "eeg-heuristic-v4") {
      result.title = "Perlu sesi baru"; result.action = "Arsip memakai perhitungan lama. Rekam ulang untuk kesimpulan terbaru."; result.reason = "legacy"; return result;
    }
    if (n < 30) return result;
    if (fraction < 0.6) { result.title = "Kualitas terbatas"; result.action = "Perbaiki kontak sensor dan ulangi pengukuran."; result.reason = "quality"; return result; }
    result.ready = true; result.reason = "assessed";
    result.status = incidents ? "kritis" : status(result.meanFI, result.meanCLI);
    result.title = { normal: "Indeks sesi rendah", waspada: "Perlu dipantau", berisiko: "Perlu evaluasi", kritis: "Prioritas tinjauan" }[result.status];
    result.action = incidents ? "Ada indikasi microsleep. Tinjau sesi bersama pekerja." : {
      normal: "Pantau perubahan pada sesi berikutnya.", waspada: "Periksa kondisi pekerja dan pantau ulang.",
      berisiko: "Sarankan jeda dan evaluasi kondisi pekerja.", kritis: "Tinjau segera bersama pekerja dan periksa kualitas pengukuran."
    }[result.status];
    return result;
  }
  function connection(record, options) {
    options = options || {};
    if (!record) return { key:"none", label:"Belum ada sesi" };
    if (record.status !== "recording") return {key:"ended",label:"Sesi selesai"};
    if (!options.confirmed) return {key:"unknown",label:"Belum terkonfirmasi"};
    var age = (options.now ?? Date.now()) - record.updatedAt;
    return age >= -5000 && age <= 90000 ? {key:"active",label:"Sesi mengirim"} : {key:"stale",label:"Pembaruan terhenti"};
  }
  window.ntSessionInsights = { rows: rows, aggregate: aggregate, status: status, day: day, assess: assess, connection: connection };
})();
