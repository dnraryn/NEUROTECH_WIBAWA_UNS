// Real-time Muse EEG prototype: 256 Hz, 2-second Hamming FFT, 1-45 Hz bands.
// Each channel is linearly detrended and checked for flatness, ADC clipping,
// amplitude and gamma contamination. Bad channels are excluded. Frontal-only
// output has FI/EI, frontal + posterior coverage adds CLI; any usable channel
// can provide band power. Partial/limited output is provisional and
// cannot train a baseline or trigger the microsleep heuristic.
// FI/CLI/EI and risk classes are experimental rules, not a validated classifier.
// Processing references (not validation of the chosen thresholds):
// https://brainflow.readthedocs.io/en/stable/Examples.html
// https://mne.tools/stable/auto_tutorials/preprocessing/15_handling_bad_channels.html

(function () {
  "use strict";

  var FS  = 256;   // Muse sample rate (Hz)
  var WIN = 512;   // 2-second FFT window (was 256). 0.5 Hz bin resolution.
  var EMIT_MS = 1000;
  var EMA_A = 0.35;
  var EPS = 1e-6;
  var ALGORITHM_VERSION = "eeg-heuristic-v4";
  window.ntEEGAlgorithmVersion = ALGORITHM_VERSION;
  // Every pairing collects ~120 clean one-second windows before results are shown.
  var BASELINE_TARGET = 120;
  // Detrending changes spectral features; do not reuse pre-filter baselines.
  var BASELINE_MAX_AGE = 24 * 3600000; // Engineering freshness policy, not a clinical threshold.
  // Engineering defaults for this prototype, pending recorded-headband validation.
  var FILTER_POLICY = Object.freeze({ cleanP2P: 200, hardP2P: 400, cleanDeviation: 70,
    hardDeviation: 120, cleanGamma: 25, hardGamma: 45, flatDeviation: 0.5,
    maxClippedFraction: 0.01, minChannels: 1 });
  var lastQualityLevel = null, lastChannelSet = null;

  // Default fallback baseline — used until the per-user calibration
  // completes. Chosen to keep the FALLBACK indices similar to the old
  // hard-coded log2 mapping (FI=3, CLI=2, EI=0.8).
  var DEFAULT_BASELINE = {
    fiRaw: 3.0, cliRaw: 2.0, eiRaw: 0.8,
    thetaAlpha: 0.5,  // typical eyes-open θ/α at rest
    betaRel: 14,      // typical β relative power (%) at rest
  };

  // ── FFT (radix-2 Cooley-Tukey, in-place) ────────────────────────────────
  function fft(re, im) {
    var n = re.length;
    var i, j = 0, bit, tr, ti;
    for (i = 1; i < n; i++) {
      bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        tr = re[i]; re[i] = re[j]; re[j] = tr;
        ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }
    for (var len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len;
      var wlr = Math.cos(ang), wli = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var wr = 1, wi = 0;
        for (var k = 0; k < len / 2; k++) {
          var pr = re[i + k], pi = im[i + k];
          var sr = re[i + k + len / 2], si = im[i + k + len / 2];
          var qr = sr * wr - si * wi;
          var qi = sr * wi + si * wr;
          re[i + k]           = pr + qr;
          im[i + k]           = pi + qi;
          re[i + k + len / 2] = pr - qr;
          im[i + k + len / 2] = pi - qi;
          var nwr = wr * wlr - wi * wli;
          wi = wr * wli + wi * wlr;
          wr = nwr;
        }
      }
    }
  }

  // Hamming window — precomputed.
  var hamming = new Float32Array(WIN);
  (function () {
    for (var i = 0; i < WIN; i++) {
      hamming[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (WIN - 1));
    }
  })();

  // One-sided periodogram (uV^2/Hz), integrated to band power (uV^2).
  function bandPowers(samples) {
    var re = new Float32Array(WIN);
    var im = new Float32Array(WIN);
    var mean = 0;
    for (var i = 0; i < WIN; i++) mean += samples[i];
    mean /= WIN;
    var windowEnergy = 0;
    for (i = 0; i < WIN; i++) {
      re[i] = (samples[i] - mean) * hamming[i];
      windowEnergy += hamming[i] * hamming[i];
    }
    fft(re, im);
    var psd = new Float32Array(WIN / 2 + 1);
    for (var k = 0; k <= WIN / 2; k++) {
      psd[k] = (re[k] * re[k] + im[k] * im[k]) / (FS * windowEnergy) * (k > 0 && k < WIN / 2 ? 2 : 1);
    }
    var binW = FS / WIN; // = 0.5 Hz
    function integ(lo, hi, includeHigh) {
      var s = 0;
      var k0 = Math.max(1, Math.ceil(lo / binW));
      var end = Math.min(psd.length, includeHigh ? Math.floor(hi / binW) + 1 : Math.ceil(hi / binW));
      for (var kk = k0; kk < end; kk++) s += psd[kk] * binW;
      return s;
    }
    return {
      delta: integ(1, 4),
      theta: integ(4, 8),
      alpha: integ(8, 13),
      beta:  integ(13, 30),
      gamma: integ(30, 45, true),
    };
  }

  function prepareChannel(raw) {
    var n = raw.length, center = (n - 1) / 2, mean = 0, numerator = 0, denominator = 0;
    var mn = Infinity, mx = -Infinity, clipped = 0;
    var rail = window.ntMuse?.status?.().protocol === "athena" ? 724 : 999;
    for (var i = 0; i < n; i++) {
      mean += raw[i]; mn = Math.min(mn, raw[i]); mx = Math.max(mx, raw[i]);
      if (Math.abs(raw[i]) >= rail) clipped++;
      numerator += (i - center) * raw[i]; denominator += (i - center) * (i - center);
    }
    mean /= n;
    var slope = numerator / denominator, clean = new Float32Array(n);
    var cleanMin = Infinity, cleanMax = -Infinity, energy = 0;
    for (var j = 0; j < n; j++) {
      clean[j] = raw[j] - mean - slope * (j - center);
      cleanMin = Math.min(cleanMin, clean[j]); cleanMax = Math.max(cleanMax, clean[j]);
      energy += clean[j] * clean[j];
    }
    var powers = bandPowers(clean), total = powers.delta + powers.theta + powers.alpha + powers.beta + powers.gamma;
    var p2p = cleanMax - cleanMin, deviation = Math.sqrt(energy / n);
    var gamma = total > EPS ? powers.gamma / total * 100 : 0;
    var state = "good", reasons = [];
    if (clipped / n > FILTER_POLICY.maxClippedFraction) { state = "bad"; reasons.push("sinyal terpotong pada batas alat"); }
    if (deviation < FILTER_POLICY.flatDeviation || total <= EPS) { state = "bad"; reasons.push("sinyal datar"); }
    if (p2p > FILTER_POLICY.hardP2P || deviation > FILTER_POLICY.hardDeviation || gamma > FILTER_POLICY.hardGamma) {
      state = "bad"; reasons.push("gangguan amplitudo/frekuensi berat");
    }
    if (state === "good" && (p2p > FILTER_POLICY.cleanP2P || deviation > FILTER_POLICY.cleanDeviation ||
        gamma > FILTER_POLICY.cleanGamma || clipped > 0)) {
      state = "limited"; reasons.push("kualitas terbatas");
    }
    return { powers: powers, stats: { peakToPeak: mx - mn, processedPeakToPeak: p2p,
      deviation: deviation, gamma: gamma, clippedFraction: clipped / n, state: state, reasons: reasons } };
  }

  // ── Per-channel ring buffer (~4 s of samples each — 2× WIN) ─────────────
  var buf = { TP9: [], AF7: [], AF8: [], TP10: [] };
  var fresh = { TP9: 0, AF7: 0, AF8: 0, TP10: 0 };
  var sequence = {};
  function pushSamples(channel, samples, index, discontinuity) {
    var b = buf[channel];
    if (!b || !samples.length) return false;
    for (var i = 0; i < samples.length; i++) if (!Number.isFinite(samples[i])) return false;
    if (discontinuity) {
      b.length = 0;
      fresh[channel] = 0;
      delete sequence[channel];
      microsleepStreak = 0;
    }
    if (typeof index === "number") {
      var previous = sequence[channel];
      if (previous === index) return false;
      if (previous !== undefined && ((previous + 1) & 65535) !== index) {
        b.length = 0;
        fresh[channel] = 0;
        microsleepStreak = 0;
      }
      sequence[channel] = index;
    }
    for (var j = 0; j < samples.length; j++) b.push(samples[j]);
    fresh[channel] += samples.length;
    if (b.length > WIN * 2) b.splice(0, b.length - WIN * 2);
    return true;
  }

  // Calibration belongs to this connection. A new pairing starts fresh.
  var baseline = null;
  var baselineBuffer = [];
  function validBaseline(value) {
    return value && value.algorithmVersion === ALGORITHM_VERSION && value.sampleRate === FS && value.windowSize === WIN &&
      ["classic", "athena"].includes(value.protocol) &&
      (!window.ntMuse?.status?.().protocol || value.protocol === window.ntMuse.status().protocol) &&
      Number.isFinite(value.ts) && value.ts <= Date.now() + 5000 && Date.now() - value.ts < BASELINE_MAX_AGE &&
      ["fiRaw", "cliRaw", "eiRaw", "thetaAlpha", "betaRel"].every(function (k) {
      return Number.isFinite(value[k]) && value[k] > 0;
    });
  }

  function median(values) {
    if (!values.length) return 0;
    var s = values.slice().sort(function (a, b) { return a - b; });
    var m = s.length >>> 1;
    return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
  }

  function finalizeBaseline() {
    if (baselineBuffer.length < BASELINE_TARGET) return;
    baseline = {
      fiRaw:      median(baselineBuffer.map(function (b) { return b.fiRaw; })),
      cliRaw:     median(baselineBuffer.map(function (b) { return b.cliRaw; })),
      eiRaw:      median(baselineBuffer.map(function (b) { return b.eiRaw; })),
      thetaAlpha: median(baselineBuffer.map(function (b) { return b.thetaAlpha; })),
      betaRel:    median(baselineBuffer.map(function (b) { return b.betaRel; })),
      ts: Date.now(),
      algorithmVersion: ALGORITHM_VERSION, sampleRate: FS, windowSize: WIN,
      protocol: window.ntMuse?.status?.().protocol || "unknown",
    };
    // FI and EI are reciprocal features, not independent corroborating measurements.
    baseline.eiRaw = 1 / baseline.fiRaw;
    ema = null; statusHistory.length = 0; microsleepStreak = 0;
    Object.assign(window.ntMuseDSP, { baseline: baseline, baselineProgress: 1, baselineCount: baselineBuffer.length });
    window.dispatchEvent(new CustomEvent("nt-muse-baseline", {
      detail: { baseline: baseline },
    }));
  }
  function activeBaseline() { return baseline || DEFAULT_BASELINE; }

  // ── Smoothing state ──────────────────────────────────────────────────────
  var ema = null;
  // Rolling buffers used for hysteresis — Brain Timeline kept showing
  // "kritis" on stable sessions because a single noisy window was enough
  // to flip status. We now require multiple consecutive windows before
  // committing to a worse class.
  var statusHistory = [];
  var STATUS_WINDOW = 5;        // ~5 s of context
  var microsleepStreak = 0;
  var MICROSLEEP_NEEDED = 3;    // Three overlapping analysis windows, not a measured episode duration.
  var microsleepLastAt = 0;
  // Cumulative session microsleep events. We count RISING edges (each
  // distinct microsleep episode increments once, regardless of how long it
  // lasts) so the displayed count is monotonic — without this it would
  // bounce 0→2→0→2 as transient flagged windows aged out of the 60-tick
  // ring buffer. Reset on every connect/disconnect.
  var msPrev = false;
  var msEvents = 0;

  function clip(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function log2(x) { return Math.log(x) / Math.log(2); }

  // ── Derive indices + status from a fresh second of data ─────────────────
  function compute() {
    if (baseline && !validBaseline(baseline)) {
      baseline = null; baselineBuffer.length = 0; ema = null; statusHistory.length = 0; microsleepStreak = 0;
    }
    var calibrated = !!baseline;
    if (buf.TP9.length < WIN || buf.AF7.length < WIN ||
        buf.AF8.length < WIN || buf.TP10.length < WIN) return null;
    var channels = ["TP9", "AF7", "AF8", "TP10"], p = {}, qualityChannels = {};
    channels.forEach(function (ch) {
      var prepared = prepareChannel(buf[ch].slice(-WIN));
      p[ch] = prepared.powers;
      qualityChannels[ch] = prepared.stats;
    });
    var used = channels.filter(function (ch) { return qualityChannels[ch].state !== "bad"; });
    var front = used.filter(function (ch) { return ch === "AF7" || ch === "AF8"; });
    var posterior = used.filter(function (ch) { return ch === "TP9" || ch === "TP10"; });
    var excluded = channels.filter(function (ch) { return used.indexOf(ch) === -1; });
    var qualityLevel = used.length < FILTER_POLICY.minChannels ? "bad"
      : excluded.length || used.some(function (ch) { return qualityChannels[ch].state === "limited"; }) ? "limited" : "good";
    var outputScope = !front.length ? "bands-only" : !posterior.length ? "frontal-only" : "full";
    window.ntMuseDSP = Object.assign({}, window.ntMuseDSP, {
      quality: { channels: qualityChannels, checkedAt: Date.now(), level: qualityLevel,
        usedChannels: used, excludedChannels: excluded, outputScope: outputScope, policy: FILTER_POLICY },
    });
    if (qualityLevel === "bad") {
      signalState(used.length === 0 && channels.every(function (ch) {
        return qualityChannels[ch].deviation < FILTER_POLICY.flatDeviation;
      }) ? "no-signal" : "artifact");
      lastQualityLevel = null;
      lastChannelSet = null;
      return null;
    }
    function avg(list, band) { return list.length ? list.reduce(function (sum, ch) { return sum + p[ch][band]; }, 0) / list.length : null; }
    var frontTheta = avg(front, "theta"), frontAlpha = avg(front, "alpha"), frontBeta = avg(front, "beta");
    var postAlpha = avg(posterior, "alpha"), postTheta = avg(posterior, "theta");

    // Experimental ratios normalized against personal calibration.
    var fiRaw  = front.length ? (frontTheta + frontAlpha) / Math.max(EPS, frontBeta) : null;
    var cliRaw = front.length && posterior.length ? frontTheta / Math.max(EPS, postAlpha) : null;
    var eiRaw  = front.length ? frontBeta / Math.max(EPS, frontAlpha + frontTheta) : null;
    var BL = activeBaseline();
    // Protect the logarithm numerically, without replacing small valid ratios.
    // An absolute floor (0.5 / 0.2) pins scores for baselines below that floor.
    function index(ratio, base, center, scale) {
      return Number.isFinite(ratio) && ratio > EPS ? Math.round(clip(center + scale * log2(Math.max(EPS, ratio / base)), 0, 100)) : null;
    }
    var fi = index(fiRaw, BL.fiRaw, 40, 22);
    var cli = index(cliRaw, BL.cliRaw, 40, 22);
    var ei = index(eiRaw, BL.eiRaw, 50, 35);
    if ([fi, cli, ei].some(function (v) { return v === null; })) qualityLevel = "limited";
    outputScope = [fi, cli, ei].every(Number.isFinite) ? "full"
      : Number.isFinite(fi) || Number.isFinite(ei) ? "frontal-only" : "bands-only";
    window.ntMuseDSP.quality.level = qualityLevel;
    window.ntMuseDSP.quality.outputScope = outputScope;
    var channelSet = used.join(",") + ":" + outputScope;
    if (lastQualityLevel !== qualityLevel || lastChannelSet !== channelSet) { ema = null; statusHistory.length = 0; microsleepStreak = 0; }
    lastQualityLevel = qualityLevel;
    lastChannelSet = channelSet;

    // Relative theta/alpha feature for the existing microsleep heuristic.
    var thetaAlpha = front.length && posterior.length ? (frontTheta + postTheta) / Math.max(EPS, frontAlpha + postAlpha) : null;

    // Relative band power (% of total) — easier to show as a bar height.
    var total = 0, perBand = {};
    ["delta", "theta", "alpha", "beta", "gamma"].forEach(function (k) {
      perBand[k] = avg(used, k);
      total += perBand[k];
    });
    if (!Number.isFinite(total) || total <= EPS) { signalState("no-signal"); return null; }
    var bands = {
      delta: Math.round(perBand.delta / total * 100),
      theta: Math.round(perBand.theta / total * 100),
      alpha: Math.round(perBand.alpha / total * 100),
      beta:  Math.round(perBand.beta  / total * 100),
      gamma: Math.round(perBand.gamma / total * 100),
    };

    // Degraded output cannot train calibration or trigger microsleep.
    window.ntMuseDSP.quality.gamma = perBand.gamma / total * 100;
    var movementArtifact = qualityLevel !== "good";

    var thetaAlphaUp = Number.isFinite(thetaAlpha) && thetaAlpha >= 1.5 * BL.thetaAlpha;
    var betaCollapsed = perBand.beta / total * 100 < 0.7 * BL.betaRel;
    var msInstant = calibrated && !movementArtifact && thetaAlphaUp && betaCollapsed;
    if (movementArtifact) microsleepStreak = 0; // movement breaks the streak
    else if (!msInstant) microsleepStreak = 0;
    else microsleepStreak = microsleepStreak > 0 && Date.now() - microsleepLastAt <= EMIT_MS * 1.5 ? microsleepStreak + 1 : 1;
    microsleepLastAt = msInstant ? Date.now() : 0;
    var microsleep = microsleepStreak >= MICROSLEEP_NEEDED;

    // Accumulate baseline samples while the user is in their first ~2 min
    // of clean data. Calibrate while awake, eyes open. A fallback ratio cannot
    // determine whether a new user is drowsy and must not prevent calibration.
    if (!baseline && !movementArtifact && [fiRaw, cliRaw, eiRaw, thetaAlpha].every(function (v) { return Number.isFinite(v) && v > EPS; })) {
      baselineBuffer.push({
        fiRaw: Math.max(EPS, fiRaw), cliRaw: Math.max(EPS, cliRaw), eiRaw: Math.max(EPS, eiRaw),
        thetaAlpha: Math.max(EPS, thetaAlpha), betaRel: Math.max(EPS, perBand.beta / total * 100),
      });
      if (baselineBuffer.length >= BASELINE_TARGET) { finalizeBaseline(); return null; }
    }
    if (!baseline) {
      Object.assign(window.ntMuseDSP, {
        baseline: null, baselineCount: baselineBuffer.length,
        baselineProgress: baselineBuffer.length / BASELINE_TARGET, baselineTarget: BASELINE_TARGET,
      });
    }

    // EMA-smooth the running indices so single-window noise doesn't make
    // the gauges jitter.
    var raw = { fi: fi, cli: cli, ei: ei,
                delta: bands.delta, theta: bands.theta, alpha: bands.alpha,
                beta: bands.beta, gamma: bands.gamma };
    if (!ema) ema = Object.assign({}, raw);
    else Object.keys(raw).forEach(function (k) {
      ema[k] = raw[k] === null ? null : !Number.isFinite(ema[k]) ? raw[k] : ema[k] * (1 - EMA_A) + raw[k] * EMA_A;
    });

    var fiS  = Number.isFinite(ema.fi) ? Math.round(ema.fi) : null;
    var cliS = Number.isFinite(ema.cli) ? Math.round(ema.cli) : null;
    var eiS  = Number.isFinite(ema.ei) ? Math.round(ema.ei) : null;

    // HRV proxy — replaced once we wire PPG. Higher CLI / lower EI ⇒ lower HRV.
    var hrv = Number.isFinite(cliS) && Number.isFinite(eiS) ? Math.round(clip(78 - cliS * 0.35 + (eiS - 50) * 0.10, 30, 95)) : null;

    // Status thresholds match _statusOf() in mock-data.jsx. Run them
    // through a 5-window mode filter so the Brain Timeline doesn't
    // flicker between classes on every breath / blink.
    var instant = !Number.isFinite(fiS) ? null :
      (microsleep || fiS >= 76 || cliS >= 82) ? "kritis"
      : (fiS >= 60 || cliS >= 70)             ? "berisiko"
      : (fiS >= 44 || cliS >= 56)             ? "waspada" : "normal";
    if (instant) statusHistory.push(instant);
    if (statusHistory.length > STATUS_WINDOW) statusHistory.shift();
    // Mode: most-common class in the rolling window. Ties resolve toward
    // the calmer state so a single bad second can't drag the timeline.
    var counts = {};
    for (var si = 0; si < statusHistory.length; si++) {
      counts[statusHistory[si]] = (counts[statusHistory[si]] || 0) + 1;
    }
    var order = ["normal", "waspada", "berisiko", "kritis"];
    var status = instant ? order[0] : null, best = 0;
    for (var oi = 0; oi < order.length; oi++) {
      var c = counts[order[oi]] || 0;
      if (c > best) { best = c; status = order[oi]; }
    }

    return {
      ts: Date.now(),
      fi: fiS, cli: cliS, ei: eiS, hrv: hrv,
      microsleep: microsleep, status: status, instantStatus: instant, qualityLevel: qualityLevel, outputScope: outputScope,
      classificationProvisional: !calibrated || qualityLevel !== "good",
      algorithmVersion: ALGORITHM_VERSION, absoluteBands: perBand,
      bands: {
        delta: Math.round(ema.delta),
        theta: Math.round(ema.theta),
        alpha: Math.round(ema.alpha),
        beta:  Math.round(ema.beta),
        gamma: Math.round(ema.gamma),
      },
    };
  }

  // ── Apply the DSP result to the live data model ─────────────────────────
  function apply(out) {
    var w = window.CURRENT_WORKER;
    if (!w) return;
    w.fi = out.fi;
    w.cli = out.cli;
    w.ei = out.ei;
    w.hrv = out.hrv;
    w.microsleep = out.microsleep;
    w.status = out.status || "unavailable";
    w.qualityLevel = out.qualityLevel;
    w.outputScope = out.outputScope;
    w.classificationProvisional = out.classificationProvisional;
    var d = new Date(out.ts);
    w.t = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");

    var row = window.WORKERS_BY_ID && window.WORKERS_BY_ID[w.id];
    if (row && row !== w) Object.assign(row, w);

    // Push into the ring buffer the Prediksi Kelelahan / Brain Timeline read.
    if (window.ntPushHistory) {
      window.ntPushHistory(w.id, {
        source: "muse", quality: out.qualityLevel, provisional: out.classificationProvisional, outputScope: out.outputScope,
        ts: out.ts, fi: out.fi, cli: out.cli, hrv: out.hrv, ei: out.ei,
        readiness: w.readiness, status: out.status, instantStatus: out.instantStatus, microsleep: out.microsleep,
        shift: w.shift, monitoringStartedAt: window.ntMuse?.status?.().connectedAt,
      });
    }

    // Cumulative microsleep event counter — increment ONLY on a rising
    // edge (false→true), so a 3-second episode counts as 1, not 3.
    if (out.microsleep && !msPrev) msEvents += 1;
    msPrev = out.microsleep;

    // Expose the latest snapshot so screens that want raw band powers can
    // read them directly (e.g. the Worker Live EEG Band Power bars).
    window.ntMuseDSP = {
      quality: window.ntMuseDSP && window.ntMuseDSP.quality,
      last: out, bands: out.bands, signalState: out.qualityLevel === "limited" ? "limited" : baseline ? "ready" : "calibrating",
      microsleepEvents: msEvents,
      // Calibration status — UI can show "Kalibrasi N/120 s" while baseline
      // is being built. Once `baseline` is non-null, calibration is done.
      baseline: baseline,
      baselineProgress: baseline ? 1 : (baselineBuffer.length / BASELINE_TARGET),
      baselineCount: baselineBuffer.length,
      baselineTarget: BASELINE_TARGET,
      // Linear-fit slope across the last ~20 history entries → used by the
      // Prediksi Kelelahan card to estimate ETA.
      predict: predictionFor(w.id),
    };

    window.dispatchEvent(new CustomEvent("nt-data"));
  }

  // Allow the UI to force-recalibrate (e.g. a "kalibrasi ulang" button).
  window.ntMuseClearBaseline = function () {
    baseline = null;
    resetState();
    var w = window.CURRENT_WORKER;
    if (w && window.ntHistory) window.ntHistory(w.id).length = 0;
    window.dispatchEvent(new CustomEvent("nt-muse-baseline", { detail: { baseline: null } }));
    window.dispatchEvent(new CustomEvent("nt-data"));
  };

  // Linear-regression slope of FI over the recent ring buffer + ETA to FI=60.
  function predictionFor(workerId) {
    if (!window.ntHistory) return null;
    var hist = window.ntHistory(workerId) || [];
    var recent = hist.filter(function (p) { return p.quality === "good" && !p.provisional && Number.isFinite(p.fi); }).slice(-20);
    if (recent.length < 4) return null;
    var n = recent.length;
    var sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (var i = 0; i < n; i++) {
      var x = (recent[i].ts - recent[0].ts) / 1000;
      sx += x; sy += recent[i].fi; sxy += x * recent[i].fi; sxx += x * x;
    }
    var slope = (n * sxy - sx * sy) / Math.max(EPS, (n * sxx - sx * sx));
    var cur = recent[n - 1].fi;
    var dtSec = 1; // Regression x is elapsed seconds.
    if (slope <= 0.05) return { trend: "stabil", slope: slope, current: cur };
    var stepsToBerisiko = (60 - cur) / slope;
    if (cur >= 60) return { trend: "naik", slope: slope, current: cur, etaSec: 0 };
    return {
      trend: "naik", slope: slope, current: cur,
      etaSec: Math.max(0, Math.round(stepsToBerisiko * dtSec)),
    };
  }

  // ── Wire up event handlers ──────────────────────────────────────────────
  var lastEmit = 0;

  function signalState(state) {
    microsleepStreak = 0;
    window.ntMuseDSP = Object.assign({}, window.ntMuseDSP, { signalState: state });
    window.dispatchEvent(new CustomEvent("nt-data"));
  }
  window.addEventListener("nt-muse-eeg", function (e) {
    if (!window.ntMuseConnected || !window.NT_LIVE) return;
    var d = e && e.detail;
    if (!d || !d.samples || !pushSamples(d.channel, d.samples, d.index, d.discontinuity)) return;
    var channels = Object.keys(buf);
    if (!channels.every(function (ch) { return buf[ch].length >= WIN && fresh[ch] >= FS; })) return;
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (now - lastEmit < EMIT_MS) return;
    lastEmit = now;
    channels.forEach(function (ch) { fresh[ch] = 0; });
    try {
      var out = compute();
      if (out) apply(out);
    } catch (error) {
      console.error("[NeuroTech] EEG processing failed:", error);
      signalState("error");
    }
  });

  function resetState() {
    Object.keys(buf).forEach(function (ch) { buf[ch].length = 0; fresh[ch] = 0; });
    sequence = {};
    ema = null;
    lastEmit = 0;
    statusHistory.length = 0;
    microsleepStreak = 0;
    msPrev = false;
    msEvents = 0;
    lastQualityLevel = null;
    lastChannelSet = null;
    baselineBuffer.length = 0;
    window.ntMuseDSP = {
      last: null, bands: null, predict: null, microsleepEvents: 0,
      signalState: "waiting", baseline: baseline, baselineProgress: baseline ? 1 : 0,
      baselineCount: 0, baselineTarget: BASELINE_TARGET,
    };
  }
  function resetForIdentity() { baseline = null; resetState(); }
  window.addEventListener("nt-muse", resetForIdentity);
  window.addEventListener("nt-session", resetForIdentity);
  resetForIdentity();

})();
