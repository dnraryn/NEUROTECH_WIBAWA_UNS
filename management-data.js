// Pure transformations for the management dashboard. Real results only come
// from this browser's recorded EEG; missing company metrics stay unavailable.
(function () {
  "use strict";
  var shifts = ["Pagi", "Sore", "Malam", "Lembur"];
  var channels = ["TP9", "AF7", "AF8", "TP10"];
  var indexKeys = ["fi", "cli", "ei"];
  function validIndex(value) { return Number.isFinite(value) && value >= 0 && value <= 100; }
  function measuredIndices(point) {
    return indexKeys.every(function (key) { return point[key] == null || validIndex(point[key]); }) &&
      indexKeys.some(function (key) { return validIndex(point[key]); });
  }
  function fresh(timestamp, now) {
    return Number.isFinite(timestamp) && timestamp <= now && now - timestamp < 3000;
  }
  function conclusion(latest, dsp, message) {
    var labels = { normal: "Normal", waspada: "Waspada", berisiko: "Berisiko", kritis: "Kritis" };
    var problemChannels = channels.filter(function (ch) {
      var q = dsp.quality?.channels?.[ch];
      return q && q.state !== "good";
    }).map(function (ch) {
      var q = dsp.quality.channels[ch];
      return ch + ": " + (q.reasons?.join(", ") || "kontak atau kualitas sinyal perlu diperiksa");
    });
    if (!latest) return {
      title: "Kesimpulan belum tersedia",
      summary: message,
      action: "Periksa kontak keempat sensor, duduk tenang, dan tunggu jendela EEG berikutnya. Jika aliran berhenti, hubungkan ulang Muse.",
      note: "Jumlah sampel yang bertambah menunjukkan paket diterima; kualitas sinyal tetap harus memenuhi pemeriksaan sebelum indeks dihitung.",
      problemChannels: problemChannels,
    };
    if (latest.outputScope === "bands-only") return {
      title: "Band power tersedia · hasil parsial",
      summary: "Daya pita EEG dihitung hanya dari sensor yang dapat dipakai. Indeks fatigue, cognitive load, dan engagement belum tersedia dari sinyal yang tersisa.",
      action: "Perbaiki kontak sensor frontal AF7 atau AF8 agar indeks berbasis kanal frontal dapat dihitung.",
      note: "Band power saja belum cukup untuk menyimpulkan kelelahan. Sensor yang ditolak tidak dimasukkan dalam perhitungan.",
      problemChannels: problemChannels,
    };
    if (!dsp.baseline) return {
      title: "Indikasi sementara" + (latest.outputScope === "frontal-only" ? " (kanal frontal)" : "") + ": " + (labels[latest.instantStatus || latest.status] || "Indeks tersedia"),
      summary: "Pola indeks memakai acuan umum." + (latest.cli == null ? " beban kognitif belum tersedia." : ""),
      action: "Pantau perubahan indeks dan kualitas sinyal.",
      note: "Estimasi eksperimental dengan acuan umum, bukan penilaian klinis. Tidak masuk laporan bersih atau deteksi microsleep.", problemChannels: problemChannels,
    };
    var provisional = latest.classificationProvisional || dsp.signalState === "limited";
    var currentStatus = labels[latest.instantStatus] ? latest.instantStatus : latest.status;
    var actions = {
      normal: "Pertahankan kondisi pengukuran yang stabil dan pantau perubahan indeks.",
      waspada: "Ambil jeda singkat dan pantau apakah indeks kembali turun setelah beristirahat.",
      berisiko: "Ambil jeda dan evaluasi kondisi sebelum melanjutkan aktivitas yang membutuhkan konsentrasi.",
      kritis: "Pola indeks tinggi terdeteksi. Ambil jeda dan evaluasi kondisi serta kualitas pengukuran.",
    };
    return {
      title: (labels[currentStatus] || "Indeks EEG tersedia") + (provisional ? " · sementara" : "") + (latest.outputScope === "frontal-only" ? " (kanal frontal)" : ""),
      summary: "Fatigue Index " + (validIndex(latest.fi) ? latest.fi + "/100" : "belum tersedia") +
        ", beban kognitif " + (validIndex(latest.cli) ? latest.cli + "/100" : "belum tersedia") +
        ", dan engagement " + (validIndex(latest.ei) ? latest.ei + "/100" : "belum tersedia") + ". " +
        (latest.outputScope === "frontal-only" ? "Hasil parsial dari kanal frontal; cognitive load memerlukan kanal frontal dan posterior. Kategori hanya memakai FI yang tersedia. " : "") +
        (currentStatus !== latest.status ? "Pola sesaat: " + labels[currentStatus] + ". Kategori tren beberapa jendela terakhir: " + (labels[latest.status] || "belum tersedia") + "."
          : "Kategori dari pola EEG saat ini: " + (labels[currentStatus] || "belum tersedia") + "."),
      action: dsp.signalState === "limited" ? "Perbaiki kontak sensor yang ditandai, duduk tenang, lalu periksa kembali hasil setelah kualitas membaik."
        : !dsp.baseline ? "Lanjutkan kalibrasi dengan duduk tenang sebelum membaca hasil."
        : actions[currentStatus] || "Pantau perubahan indeks pada grafik sesi.",
      note: "Kesimpulan memakai aturan indeks EEG prototipe, belum menjadi penilaian klinis atau keputusan keselamatan kerja.",
      problemChannels: problemChannels,
    };
  }
  function snapshot(input) {
    var now = input.now, device = input.device || {}, dsp = input.dsp || {};
    var calibrationRequired = !input.demo && Number.isFinite(dsp.baselineTarget) && dsp.baselineTarget > 0;
    var baselineReady = !calibrationRequired || !!dsp.baseline;
    var measurementStart = calibrationRequired ? (dsp.baseline?.ts || Infinity) : -Infinity;
    var preparationStart = dsp.calibration?.startedAt;
    var preparing = calibrationRequired && Number.isFinite(preparationStart) && now - preparationStart < 60000;
    var uncalibratedPreview = calibrationRequired && !dsp.baseline && Number.isFinite(preparationStart) && now - preparationStart >= 60000;
    var displayStart = uncalibratedPreview ? preparationStart + 60000 : measurementStart;
    var remaining = Math.max(0, (dsp.baselineTarget || 40) - (dsp.baselineCount || 0));
    var periodDays = [7, 30, 90, 365][input.period || 0];
    var cutoff = now - periodDays * 86400000;
    var preview = (input.history || []).filter(function (p) {
      return p.source === "muse" && Number.isFinite(p.ts) && p.ts >= displayStart && p.ts >= now - 60000 && p.ts <= now &&
        measuredIndices(p);
    }).map(function (p) { return uncalibratedPreview ? Object.assign({}, p, { quality: "limited", provisional: true }) : p;
    }).sort(function (a, b) { return a.ts - b.ts; });
    var source = (input.history || []).filter(function (p) {
      return p.source === (input.demo ? "demo" : "muse") && p.quality !== "limited" && Number.isFinite(p.ts) && p.ts >= measurementStart && p.ts <= now && Number.isFinite(p.fi) && p.fi >= 0 && p.fi <= 100;
    }).slice().sort(function (a, b) { return a.ts - b.ts; });
    var history = source.filter(function (p) { return p.ts >= cutoff; });
    var receiving = !!device.connected && fresh(device.lastEEGAt, now);
    var valid = receiving && !preparing && (baselineReady || uncalibratedPreview) && !!dsp.last && dsp.last.ts >= displayStart && fresh(dsp.last.ts, now) &&
      ["calibrating", "ready", "limited"].includes(dsp.signalState) &&
      (measuredIndices(dsp.last) || (dsp.last.outputScope === "bands-only" && indexKeys.every(function (key) { return dsp.last[key] == null; }) &&
        ["delta", "theta", "alpha", "beta", "gamma"].every(function (key) { return validIndex(dsp.last.bands?.[key]); })));
    // The current measurement remains visible if member history has not yet
    // been populated. It is only a preview and never becomes a clean report row.
    if (!input.demo && valid && measuredIndices(dsp.last) && !preview.some(function (p) { return p.ts === dsp.last.ts; })) {
      preview.push(Object.assign({}, dsp.last, { source: "muse", quality: uncalibratedPreview ? "limited" : dsp.last.qualityLevel || dsp.quality?.level,
        provisional: uncalibratedPreview || dsp.last.classificationProvisional }));
      preview.sort(function (a, b) { return a.ts - b.ts; });
    }
    var bins = shifts.map(function () { return Array.from({ length: 8 }, function () { return []; }); });
    var incidents = 0;
    var incidentSeries = [];
    source.forEach(function (p, i) {
      if (p.ts < cutoff) return;
      if (p.microsleep && !(source[i - 1] && source[i - 1].microsleep)) incidents++;
      incidentSeries.push(incidents);
      var row = shifts.indexOf(p.shift);
      var start = p.monitoringStartedAt;
      var hour = Number.isFinite(start) ? Math.floor((p.ts - start) / 3600000) : -1;
      if (row >= 0 && hour >= 0 && hour < 8) bins[row][hour].push(p.fi);
    });
    var heatRows = shifts.map(function (shift, row) {
      return { l: shift, h: bins[row].map(function (values) {
        return values.length ? Math.round(values.reduce(function (s, v) { return s + v; }, 0) / values.length) : null;
      }) };
    });
    var message = !device.connected ? "Hubungkan Muse untuk memulai pemantauan."
      : !Number.isFinite(device.lastEEGAt) ? "Bluetooth tersambung; menunggu paket EEG."
      : !receiving ? "Aliran EEG berhenti. Periksa headband dan hubungkan ulang."
      : uncalibratedPreview ? (valid ? "Live Monitor aktif · indikasi sementara dari pola indeks." : "Sinyal belum terbaca. Periksa sensor yang ditandai.")
      : !baselineReady && dsp.calibration ? "Kalibrasi " + (dsp.baselineCount || 0) + "/" +
        (dsp.baselineTarget || 40) + " jendela baseline · " + (dsp.calibration.reason || "menunggu data EEG layak") + "."
      : !baselineReady ? "Kalibrasi: " + remaining + " jendela EEG bersih belum terkumpul. " +
        (["artifact", "no-signal", "limited"].includes(dsp.signalState) ? "Sinyal belum layak; periksa sensor dan duduk tenang." : "Tetap terjaga, mata terbuka, dan jaga kontak sensor.")
      : dsp.signalState === "limited" ? (dsp.last?.outputScope === "bands-only" ? "Band power parsial tersedia; indeks menunggu sensor frontal. "
        : dsp.last?.outputScope === "frontal-only" ? "FI dan Engagement parsial tersedia; Cognitive Load menunggu kanal posterior. " : "Kualitas terbatas · hasil dan klasifikasi sementara. ") +
        "Periksa sensor: " + (dsp.quality?.excludedChannels?.join(", ") || "amplitudo/gamma meningkat") + "."
      : dsp.signalState === "artifact" ? "Sinyal terganggu. Periksa kontak sensor dan duduk tenang."
      : dsp.signalState === "no-signal" ? "Sinyal belum dapat dinilai. Periksa kontak sensor."
      : dsp.signalState === "error" ? "Pemrosesan EEG gagal. Hubungkan ulang Muse."
      : dsp.signalState === "ready" ? "Monitoring EEG aktif; baseline siap."
      : dsp.signalState === "calibrating" ? "Kalibrasi " + (dsp.baselineCount || 0) + "/" + (dsp.baselineTarget || 40) + " · tetap terjaga, mata terbuka."
      : "Menunggu cukup data dari empat sensor EEG.";
    if (receiving && baselineReady && !valid && ["ready", "limited", "calibrating"].includes(dsp.signalState))
      message = "Paket EEG diterima, tetapi hasil olahan terbaru belum tersedia. Menunggu jendela baru yang lengkap dari empat sensor.";
    var latest = valid ? (uncalibratedPreview ? Object.assign({}, dsp.last, {
      status: validIndex(dsp.last.fi) ? dsp.last.status : null,
      instantStatus: validIndex(dsp.last.fi) ? dsp.last.instantStatus : null,
      classificationProvisional: true, microsleep: false,
    }) : dsp.last) : null;
    var assessment = conclusion(latest, dsp, message);
    return { history: history, preview: preview, heatRows: heatRows, incidents: incidents, incidentSeries: incidentSeries,
      receiving: receiving, valid: valid, message: message, latest: latest, conclusion: assessment,
      monitorHours: (device.samples || 0) / (4 * 256 * 3600),
      lini: [{ l: "Sesi Muse", v: valid ? dsp.last.fi : null }],
      insight: { tier: valid && !uncalibratedPreview ? ({ normal: "low", waspada: "medium", berisiko: "high", kritis: "critical" }[dsp.last.instantStatus || dsp.last.status] || "medium") : "medium",
        icon: "•", t: valid ? assessment.title + ": " + assessment.summary : message,
        d: assessment.action } };
  }
  function trend(history, metric, now) {
    var solid = "", limited = "", points = [], previous = null;
    history.forEach(function (p) {
      if (!Number.isFinite(p.ts) || p.ts < now - 60000 || p.ts > now) return;
      if (!validIndex(p[metric])) { previous = null; return; }
      var x = (p.ts - (now - 60000)) / 60000 * 600, y = 100 - p[metric];
      var current = { x: x, y: y, ts: p.ts, limited: p.quality === "limited" };
      var prev = previous;
      if (prev && p.ts - prev.ts <= 3000) {
        var segment = "M" + prev.x.toFixed(1) + "," + prev.y.toFixed(1) + "L" + x.toFixed(1) + "," + y.toFixed(1);
        if (prev.limited || current.limited) limited += segment;
        else solid += segment;
      }
      points.push(current);
      previous = current;
    });
    return { solid: solid, limited: limited, latest: points[points.length - 1] || null };
  }
  function csv(history) {
    return window.ntReports.live(history, { excel: false });
  }
  function waveform(samples) {
    var values = Array.from(samples || []).slice(-256).filter(Number.isFinite);
    if (!values.length) return { path: "", peakToPeak: null };
    var mean = values.reduce(function (sum, v) { return sum + v; }, 0) / values.length;
    var path = values.map(function (v, i) {
      return (i ? "L" : "M") + (i * 600 / Math.max(1, values.length - 1)).toFixed(1) + "," +
        (20 - Math.max(-200, Math.min(200, v - mean)) / 200 * 18).toFixed(1);
    }).join("");
    return { path: path, peakToPeak: Math.max.apply(null, values) - Math.min.apply(null, values) };
  }
  // A short linear extrapolation of the displayed FI, not a validated fatigue forecast.
  function fatigueOutlook(points, now, source) {
    var recent = [], expectedSource = source || "muse";
    (points || []).filter(function (p) {
      return p.source === expectedSource && Number.isFinite(p.ts) && p.ts <= now && p.ts >= now - 60000;
    }).slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (p) {
      if (!validIndex(p.fi) || !["good", "limited"].includes(p.quality)) { recent = []; return; }
      var previous = recent[recent.length - 1];
      if (previous && (p.ts - previous.ts > 1500 || p.outputScope !== previous.outputScope)) recent = [];
      if (previous && p.ts === previous.ts) recent.pop();
      recent.push(p);
    });
    recent = recent.slice(-20);
    var last = recent[recent.length - 1];
    if (!last || !fresh(last.ts, now)) return { ready: false, count: 0, current: null, points: [], projection: null };
    var result = { ready: false, count: recent.length, current: last.fi, points: recent, projection: null,
      provisional: recent.some(function (p) { return p.provisional || p.quality === "limited"; }) };
    if (recent.length < 4 || last.ts - recent[0].ts < 3000) return result;
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = recent.length;
    recent.forEach(function (p) { var x = (p.ts - recent[0].ts) / 1000;
      sx += x; sy += p.fi; sxx += x * x; sxy += x * p.fi; });
    var slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    result.ready = true;
    result.trend = slope > 0.05 ? "naik" : slope < -0.05 ? "turun" : "stabil";
    result.projection = Math.round(Math.max(0, Math.min(100, last.fi + slope * 8)));
    return result;
  }
  function signalReliability(device, dsp, now) {
    var quality = dsp.quality || {}, timestamps = device.channelLastEEGAt || dsp.stream?.lastSampleAt || {};
    var current = fresh(quality.checkedAt, now);
    var used = channels.filter(function (ch) {
      return current && fresh(timestamps[ch], now) && quality.usedChannels?.includes(ch) &&
        ["good", "limited"].includes(quality.channels?.[ch]?.state);
    });
    var connected = device.connected === true, receiving = connected && fresh(device.lastEEGAt, now);
    var good = receiving && used.length === 4 && quality.level === "good";
    return { used: receiving ? used : [], total: 4,
      label: !connected ? "Muse terputus" : !receiving ? "Menunggu EEG" : !used.length ? "Sinyal belum layak" : good ? "Sinyal baik" : "Sinyal terbatas",
      basis: dsp.baseline ? "Acuan pribadi" : "Acuan umum - hasil sementara",
      kind: good && dsp.baseline ? "good" : receiving && used.length ? "limited" : "unavailable",
      action: !connected ? "Hubungkan Muse." : !receiving ? "Pastikan Muse menyala dan halaman tetap terbuka."
        : used.length < 4 ? "Periksa sensor yang ditandai pada detail sinyal." : "Pantau perubahan pola indeks." };
  }
  window.ntManagement = { snapshot: snapshot, csv: csv, trend: trend, waveform: waveform, fatigueOutlook: fatigueOutlook, signalReliability: signalReliability };
})();
