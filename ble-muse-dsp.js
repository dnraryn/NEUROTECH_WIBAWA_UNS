// ble-muse-dsp.js — real-time signal processing for Muse S EEG.
//
// Pipeline (refined from a literature review of Muse-S validated practice
// and Kaggle drowsiness datasets — see deep-research report 2026-06-05):
//
//   1.  2-second Hamming FFT on each channel, recomputed every ~1 s with
//       50% overlap. Bin resolution = 0.5 Hz, matching Krigolson 2021
//       (Frontiers Neurosci, Muse hardware, n=1000) and the DROZY drowsy-
//       driving STFT pipeline.
//   2.  Band powers — δ (1-4), θ (4-8), α (8-13), β (13-30), γ (30-45 Hz).
//   3.  Indices (well-established formulas, kept verbatim):
//         FI  = (θ+α) / β              [Pope/Jap drowsiness ratio]
//         CLI = θ_frontal / α_posterior [Gevins frontal-theta vs post-α split]
//         EI  = β / (α+θ)               [Pope I2 engagement index]
//       The MDPI Sensors 2023 PRISMA review (82 studies, 37 ratios) confirms
//       these are the most-used formulations — direction is correct.
//   4.  Personalised baseline: first ~120 s of pairing collects per-user
//       median of fiRaw / cliRaw / eiRaw + θ/α ratio + β_rel, then persists
//       to localStorage. All subsequent values are normalised AGAINST this
//       baseline instead of hard-coded constants — the systematic review
//       explicitly notes "no standardization exists" for global thresholds.
//   5.  Microsleep flag — rising θ/α ratio (≥1.5× baseline) for ≥3
//       consecutive 2-s windows AND β_rel below 0.7× baseline. Coelho et al.
//       2024 (Sensors 24(8):2625, 50 drivers, 927 events) found θ/α had
//       r=0.9971 vs visual scoring and 94.7% sensitivity — best single
//       feature in their bundle.
//   6.  Artifact rejection — 100 µV peak-to-peak per window discards
//       blinks / jaw clenches / motion (Krigolson 2021; relaxed from the
//       paper's 60 µV to keep an always-on workplace monitor usable).
//   7.  EMA α=0.35 on the displayed indices, 5-window mode filter on the
//       Brain-Timeline status class.
//
// Each clean window mutates CURRENT_WORKER, pushes into WORKER_HISTORY via
// ntPushHistory, and dispatches `nt-data` so every UI consumer (gauges,
// Prediksi Kelelahan, Brain Timeline, LiveSparkline) re-renders.

(function () {
  "use strict";

  var FS  = 256;   // Muse sample rate (Hz)
  var WIN = 512;   // 2-second FFT window (was 256). 0.5 Hz bin resolution.
  var EMIT_MS = 1000;
  var EMA_A = 0.35;
  var EPS = 1e-6;
  // Personal baseline target = ~120 s of clean data. We emit ~every 1 s, so
  // ~120 emitted windows. Stored in localStorage so subsequent pairings
  // skip the calibration step.
  var BASELINE_TARGET = 120;
  var BASELINE_KEY = "nt-muse-baseline-v1";

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

  // Compute band powers (delta/theta/alpha/beta/gamma) in absolute scale.
  function bandPowers(samples) {
    var re = new Float32Array(WIN);
    var im = new Float32Array(WIN);
    var mean = 0;
    for (var i = 0; i < WIN; i++) mean += samples[i];
    mean /= WIN;
    for (i = 0; i < WIN; i++) re[i] = (samples[i] - mean) * hamming[i];
    fft(re, im);
    var psd = new Float32Array(WIN / 2);
    for (var k = 0; k < WIN / 2; k++) {
      psd[k] = (re[k] * re[k] + im[k] * im[k]) / WIN;
    }
    var binW = FS / WIN; // = 1 Hz
    function integ(lo, hi) {
      var s = 0;
      var k0 = Math.max(1, Math.floor(lo / binW));
      var k1 = Math.min(psd.length - 1, Math.ceil(hi / binW));
      for (var kk = k0; kk <= k1; kk++) s += psd[kk];
      return s;
    }
    return {
      delta: integ(1, 4),
      theta: integ(4, 8),
      alpha: integ(8, 13),
      beta:  integ(13, 30),
      gamma: integ(30, 45),
    };
  }

  // ── Per-channel ring buffer (~4 s of samples each — 2× WIN) ─────────────
  var buf = { TP9: [], AF7: [], AF8: [], TP10: [] };
  function pushSamples(channel, samples) {
    var b = buf[channel];
    if (!b) return;
    for (var i = 0; i < samples.length; i++) b.push(samples[i]);
    while (b.length > WIN * 2) b.shift();
  }

  // ── Per-user baseline ───────────────────────────────────────────────────
  // baselineBuffer collects the first BASELINE_TARGET clean windows of
  // ratios; once full we take the median of each and persist. Until then
  // we fall back to DEFAULT_BASELINE.
  var baseline = null;
  var baselineBuffer = [];
  try {
    var saved = localStorage.getItem(BASELINE_KEY);
    if (saved) baseline = JSON.parse(saved);
  } catch (e) { /* ignore */ }

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
    };
    try { localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline)); }
    catch (e) { /* quota / private mode */ }
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
  var MICROSLEEP_NEEDED = 3;    // ≥3 s of slow-wave dominance before flagging
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
    if (buf.TP9.length < WIN || buf.AF7.length < WIN ||
        buf.AF8.length < WIN || buf.TP10.length < WIN) return null;
    var p = {
      TP9:  bandPowers(buf.TP9.slice(-WIN)),
      AF7:  bandPowers(buf.AF7.slice(-WIN)),
      AF8:  bandPowers(buf.AF8.slice(-WIN)),
      TP10: bandPowers(buf.TP10.slice(-WIN)),
    };

    var frontTheta = (p.AF7.theta + p.AF8.theta) / 2;
    var frontAlpha = (p.AF7.alpha + p.AF8.alpha) / 2;
    var frontBeta  = (p.AF7.beta  + p.AF8.beta)  / 2;
    var postAlpha  = (p.TP9.alpha + p.TP10.alpha) / 2;

    // Raw indices — directions validated by MDPI Sensors 2023 PRISMA review
    // (82 studies, 37 ratios) and Qi et al. 2020. Magnitudes are subject-
    // specific, so we log-map AGAINST the personalised baseline (or fall
    // back to DEFAULT_BASELINE during the first ~120 s of pairing).
    var fiRaw  = (frontTheta + frontAlpha) / Math.max(EPS, frontBeta);
    var cliRaw =  frontTheta               / Math.max(EPS, postAlpha);
    var eiRaw  =  frontBeta                / Math.max(EPS, frontAlpha + frontTheta);

    var BL = activeBaseline();
    var fi  = Math.round(clip(40 + 22 * log2(Math.max(0.5, fiRaw)  / BL.fiRaw),  0, 100));
    var cli = Math.round(clip(40 + 22 * log2(Math.max(0.5, cliRaw) / BL.cliRaw), 0, 100));
    var ei  = Math.round(clip(50 + 35 * log2(Math.max(0.2, eiRaw)  / BL.eiRaw),  0, 100));

    // θ/α ratio (frontal+posterior) — the highest-performing single feature
    // for microsleep in Coelho et al. 2024 (r=0.9971, 94.7% sensitivity).
    var thetaAlpha = (frontTheta + postTheta) / Math.max(EPS, frontAlpha + postAlpha);

    // Relative band power (% of total) — easier to show as a bar height.
    var total = 0, perBand = {};
    ["delta", "theta", "alpha", "beta", "gamma"].forEach(function (k) {
      perBand[k] = (p.TP9[k] + p.AF7[k] + p.AF8[k] + p.TP10[k]) / 4;
      total += perBand[k];
    });
    if (total <= 0) total = 1;
    var bands = {
      delta: Math.round(perBand.delta / total * 100),
      theta: Math.round(perBand.theta / total * 100),
      alpha: Math.round(perBand.alpha / total * 100),
      beta:  Math.round(perBand.beta  / total * 100),
      gamma: Math.round(perBand.gamma / total * 100),
    };

    // ── Artifact rejection — distinguish real microsleep from movement.
    // Head shakes / nods / jaw clenches generate big EMG bursts that look
    // theta-heavy and collapse beta, which previously triggered false
    // microsleep flags. Reject any window whose raw amplitude or gamma
    // content suggests motion before scoring the microsleep heuristic.
    var maxP2P = 0;  // peak-to-peak across all channels (µV)
    var maxSig = 0;  // std-dev signal level
    ["TP9", "AF7", "AF8", "TP10"].forEach(function (ch) {
      var arr = buf[ch].slice(-WIN);
      var mn = Infinity, mx = -Infinity, sum = 0, sum2 = 0;
      for (var ii = 0; ii < arr.length; ii++) {
        var v = arr[ii];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
        sum += v;
        sum2 += v * v;
      }
      var p2p = mx - mn;
      var mean = sum / arr.length;
      var sigma = Math.sqrt(Math.max(0, sum2 / arr.length - mean * mean));
      if (p2p > maxP2P) maxP2P = p2p;
      if (sigma > maxSig) maxSig = sigma;
    });
    // Movement/EMG signatures. P2P 100 µV mirrors Krigolson 2021's Muse
    // pipeline ("segments with absolute difference > 60 µV were discarded";
    // relaxed to 100 µV here so the always-on workplace UI doesn't drop
    // ~35% of windows). γ-power > 25 % captures jaw clenches.
    var movementArtifact = (maxP2P > 100) || (maxSig > 60) || (bands.gamma > 25);

    // Microsleep heuristic — RISING θ/α ratio relative to the personal
    // baseline (≥ 1.5×), with β-collapse (< 0.7× baseline β_rel), for at
    // least MICROSLEEP_NEEDED consecutive clean windows. Coelho et al. 2024
    // showed θ/α is robust to alpha-spindle non-monotonicity during the
    // wake→sleep transition — fixed absolute-α thresholds misfire there.
    var thetaAlphaUp = thetaAlpha >= 1.5 * BL.thetaAlpha;
    var betaCollapsed = bands.beta < 0.7 * BL.betaRel;
    var msInstant = !movementArtifact && thetaAlphaUp && betaCollapsed;
    if (movementArtifact) microsleepStreak = 0; // movement breaks the streak
    else microsleepStreak = msInstant ? microsleepStreak + 1 : 0;
    var microsleep = microsleepStreak >= MICROSLEEP_NEEDED;

    // Accumulate baseline samples while the user is in their first ~2 min
    // of clean data. We deliberately skip artifact windows so blinks and
    // jaw clenches don't poison the baseline. The msInstant flag is also
    // excluded so a user pairing while already drowsy doesn't anchor their
    // baseline to a fatigued state.
    if (!baseline && !movementArtifact && !msInstant) {
      baselineBuffer.push({
        fiRaw: fiRaw, cliRaw: cliRaw, eiRaw: eiRaw,
        thetaAlpha: thetaAlpha, betaRel: bands.beta,
      });
      if (baselineBuffer.length >= BASELINE_TARGET) finalizeBaseline();
    }

    // EMA-smooth the running indices so single-window noise doesn't make
    // the gauges jitter.
    var raw = { fi: fi, cli: cli, ei: ei,
                delta: bands.delta, theta: bands.theta, alpha: bands.alpha,
                beta: bands.beta, gamma: bands.gamma };
    if (!ema) ema = Object.assign({}, raw);
    else Object.keys(raw).forEach(function (k) {
      ema[k] = ema[k] * (1 - EMA_A) + raw[k] * EMA_A;
    });

    var fiS  = Math.round(ema.fi);
    var cliS = Math.round(ema.cli);
    var eiS  = Math.round(ema.ei);

    // HRV proxy — replaced once we wire PPG. Higher CLI / lower EI ⇒ lower HRV.
    var hrv = Math.round(clip(78 - cliS * 0.35 + (eiS - 50) * 0.10, 30, 95));

    // Status thresholds match _statusOf() in mock-data.jsx. Run them
    // through a 5-window mode filter so the Brain Timeline doesn't
    // flicker between classes on every breath / blink.
    var instant =
      (microsleep || fiS >= 76 || cliS >= 82) ? "kritis"
      : (fiS >= 60 || cliS >= 70)             ? "berisiko"
      : (fiS >= 44 || cliS >= 56)             ? "waspada" : "normal";
    statusHistory.push(instant);
    if (statusHistory.length > STATUS_WINDOW) statusHistory.shift();
    // Mode: most-common class in the rolling window. Ties resolve toward
    // the calmer state so a single bad second can't drag the timeline.
    var counts = {};
    for (var si = 0; si < statusHistory.length; si++) {
      counts[statusHistory[si]] = (counts[statusHistory[si]] || 0) + 1;
    }
    var order = ["normal", "waspada", "berisiko", "kritis"];
    var status = order[0], best = 0;
    for (var oi = 0; oi < order.length; oi++) {
      var c = counts[order[oi]] || 0;
      if (c > best) { best = c; status = order[oi]; }
    }

    return {
      ts: Date.now(),
      fi: fiS, cli: cliS, ei: eiS, hrv: hrv,
      microsleep: microsleep, status: status,
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
    w.status = out.status;
    var d = new Date(out.ts);
    w.t = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");

    // Push into the ring buffer the Prediksi Kelelahan / Brain Timeline read.
    if (window.ntPushHistory) {
      window.ntPushHistory(w.id, {
        ts: out.ts, fi: out.fi, cli: out.cli, hrv: out.hrv, ei: out.ei,
        readiness: w.readiness, status: out.status, microsleep: out.microsleep,
      });
    }

    // Cumulative microsleep event counter — increment ONLY on a rising
    // edge (false→true), so a 3-second episode counts as 1, not 3.
    if (out.microsleep && !msPrev) msEvents += 1;
    msPrev = out.microsleep;

    // Expose the latest snapshot so screens that want raw band powers can
    // read them directly (e.g. the Worker Live EEG Band Power bars).
    window.ntMuseDSP = {
      last: out, bands: out.bands,
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
    baselineBuffer.length = 0;
    try { localStorage.removeItem(BASELINE_KEY); } catch (e) { /* ignore */ }
    window.dispatchEvent(new CustomEvent("nt-muse-baseline", { detail: { baseline: null } }));
  };

  // Linear-regression slope of FI over the recent ring buffer + ETA to FI=60.
  function predictionFor(workerId) {
    if (!window.ntHistory) return null;
    var hist = window.ntHistory(workerId) || [];
    var recent = hist.slice(-20);
    if (recent.length < 4) return null;
    var n = recent.length;
    var sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (var i = 0; i < n; i++) {
      sx += i; sy += recent[i].fi; sxy += i * recent[i].fi; sxx += i * i;
    }
    var slope = (n * sxy - sx * sy) / Math.max(EPS, (n * sxx - sx * sx));
    var cur = recent[n - 1].fi;
    var dtSec = 1; // we emit ~1 / second
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

  window.addEventListener("nt-muse-eeg", function (e) {
    var d = e && e.detail;
    if (!d || !d.channel || !d.samples) return;
    pushSamples(d.channel, d.samples);
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (now - lastEmit < EMIT_MS) return;
    lastEmit = now;
    var out = compute();
    if (out) apply(out);
  });

  // Reset internal state on every connect/disconnect. We clear the
  // cumulative microsleep counter and the in-progress baseline buffer,
  // but PRESERVE the persisted per-user baseline (kept in localStorage) so
  // re-pairings don't force a 2-minute recalibration every time.
  window.addEventListener("nt-muse", function () {
    buf.TP9.length = 0; buf.AF7.length = 0;
    buf.AF8.length = 0; buf.TP10.length = 0;
    ema = null;
    lastEmit = 0;
    statusHistory.length = 0;
    microsleepStreak = 0;
    msPrev = false;
    msEvents = 0;
    baselineBuffer.length = 0;
  });

  window.ntMuseDSP = { last: null, bands: null, predict: null };
})();
