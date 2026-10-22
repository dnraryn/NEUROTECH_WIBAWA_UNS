(function () {
  "use strict";

  var FILE_NAME = "neurotech-diagnostics.json";
  var CHANNELS = ["TP9", "AF7", "AF8", "TP10"];
  var INTERVAL_MS = 2000;
  var MAX_FRAMES = 30;
  var handle = null, timer = null, frames = [], previous = null;
  var active = false, pending = false, lastSavedAt = null, error = null;
  var generation = 0, writeQueue = Promise.resolve(), writing = false;
  var anonymousParticipant = null, anonymousSession = null;
  var REASONS = ["sinyal terpotong pada batas alat", "sinyal datar",
    "gangguan amplitudo/frekuensi berat", "kualitas terbatas"];

  function finite(value) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
  function age(now, timestamp) { return finite(timestamp) === null ? null : Math.max(0, now - timestamp); }
  function known(value, allowed) { return allowed.indexOf(value) >= 0 ? value : null; }
  function randomId() {
    return window.crypto?.randomUUID?.() ||
      "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }
  function emit() { window.dispatchEvent(new CustomEvent("nt-diagnostics")); }

  function snapshot() {
    var now = Date.now();
    var device = window.ntMuse && typeof window.ntMuse.status === "function" ? window.ntMuse.status() : {};
    var dsp = window.ntMuseDSP || {}, quality = dsp.quality || {}, last = dsp.last || {};
    var counts = {}, rates = {}, channels = {}, deviceRates = {};
    CHANNELS.forEach(function (channel) {
      var count = finite(device.channelSamples && device.channelSamples[channel]);
      counts[channel] = count;
      var elapsed = previous && (now - previous.at) / 1000;
      rates[channel] = elapsed > 0 && count !== null && previous.counts[channel] !== null && count >= previous.counts[channel]
        ? Math.round((count - previous.counts[channel]) / elapsed * 10) / 10 : null;
      deviceRates[channel] = finite(device.channelRateHz && device.channelRateHz[channel]);
      var q = quality.channels && quality.channels[channel] || {};
      channels[channel] = {
        state: known(q.state, ["good", "limited", "bad"]),
        peakToPeakUv: finite(q.peakToPeak),
        processedPeakToPeakUv: finite(q.processedPeakToPeak),
        deviationUv: finite(q.deviation),
        gammaPercent: finite(q.gamma),
        clippedFraction: finite(q.clippedFraction),
        reasons: Array.isArray(q.reasons) ? q.reasons.filter(function (reason) { return REASONS.indexOf(reason) >= 0; }).slice(0, 5) : [],
      };
    });
    previous = { at: now, counts: counts };
    var calibration = dsp.calibration || {}, stability = calibration.stability || {};
    return {
      anonymousParticipantId: anonymousParticipant,
      anonymousSessionId: anonymousSession,
      at: new Date(now).toISOString(), connected: device.connected === true,
      protocol: known(device.protocol, ["classic", "athena"]),
      firmwareIdentifier: null, motionAvailable: window.ntMuseMotion?.supported?.() === true,
      algorithmVersion: known(window.ntEEGAlgorithmVersion, ["eeg-heuristic-v4"]),
      signalPolicyVersion: known(quality.policy?.version, ["signal-quality-v1"]),
      totalSamples: finite(device.samples), channelSamples: counts, samplesPerSecond: rates,
      observedDeviceRateHz: deviceRates,
      eegAgeMs: age(now, device.lastEEGAt), resultAgeMs: age(now, last.ts),
      lastUsableAgeMs: age(now, calibration.lastUsableAt),
      discontinuities: finite(dsp.stream?.discontinuities),
      lastDiscontinuityAgeMs: age(now, dsp.stream?.lastDiscontinuityAt),
      signalState: known(dsp.signalState, ["waiting", "no-signal", "artifact", "error", "limited", "calibrating", "ready"]),
      inferenceStatus: known(dsp.inferenceStatus, ["INSUFFICIENT_SIGNAL", "CALIBRATING", "PROVISIONAL", "ELIGIBLE"]),
      qualityLevel: known(quality.level, ["good", "limited", "bad"]),
      contactQualityMeasured: false, inferenceEligible: quality.inferenceEligible === true,
      outputScope: known(last.outputScope, ["full", "frontal-only", "bands-only"]),
      usedChannels: CHANNELS.filter(function (channel) { return Array.isArray(quality.usedChannels) && quality.usedChannels.indexOf(channel) >= 0; }),
      excludedChannels: CHANNELS.filter(function (channel) { return Array.isArray(quality.excludedChannels) && quality.excludedChannels.indexOf(channel) >= 0; }),
      channels: channels,
      result: { fi: finite(last.fi), cli: finite(last.cli), ei: finite(last.ei),
        classification: known(last.status, ["normal", "waspada", "berisiko", "kritis", "Normal", "Waspada", "Berisiko", "Kritis"]),
        instantClassification: known(last.instantStatus, ["normal", "waspada", "berisiko", "kritis"]),
        provisional: last.classificationProvisional === true },
      calibration: { count: finite(dsp.baselineCount), target: finite(dsp.baselineTarget), ready: !!dsp.baseline,
        elapsedMs: age(now, calibration.startedAt),
        stage: known(calibration.stage, ["device-check", "stabilization", "baseline", "validation", "complete"]),
        outcome: known(calibration.outcome, ["incomplete", "insufficient-data", "unstable", "success"]),
        policyVersion: known(calibration.policyVersion, ["baseline-quality-v2", "baseline-quality-v3"]),
        acceptedWindows: finite(calibration.acceptedWindows), rejectedWindows: finite(calibration.rejectedWindows),
        acceptedDurationSec: finite(calibration.acceptedDurationSec), rejectedDurationSec: finite(calibration.rejectedDurationSec),
        availabilityPercent: finite(calibration.availabilityPercent),
        independentWindows: finite(calibration.independentWindows),
        deviceRateVerified: calibration.deviceRateVerified === true,
        stabilityLog2Spread: { fiRaw: finite(stability.fiRaw), cliRaw: finite(stability.cliRaw),
          thetaAlpha: finite(stability.thetaAlpha), betaRel: finite(stability.betaRel) } },
      clock: { epochMs: now, monotonicMs: finite(window.performance?.now?.()) },
    };
  }

  function status() {
    return { supported: typeof window.showSaveFilePicker === "function", active: active,
      pending: pending, frames: frames.length, lastSavedAt: lastSavedAt, error: error };
  }

  function save(token) {
    if (!handle || token !== generation) return writeQueue;
    if (writing && active) return writeQueue;
    var record = snapshot();
    frames.push(record);
    if (frames.length > MAX_FRAMES) frames.shift();
    var file = handle;
    var content = JSON.stringify({ schemaVersion: 1, recording: active, updatedAt: record.at, frames: frames }, null, 2);
    writing = true;
    writeQueue = writeQueue.catch(function () {}).then(async function () {
      if (token !== generation) return;
      var writable;
      try {
        writable = await file.createWritable();
        await writable.write(content);
        await writable.close();
        lastSavedAt = Date.now();
        emit();
      } catch (cause) {
        if (writable && typeof writable.abort === "function") { try { await writable.abort(); } catch (ignore) {} }
        if (token === generation) {
          error = "Gagal menulis file diagnostik. Periksa izin dan ruang penyimpanan.";
          active = false;
          clearInterval(timer); timer = null;
          emit();
        }
      } finally {
        writing = false;
      }
    });
    return writeQueue;
  }

  async function start() {
    if (active || pending) return status();
    if (typeof window.showSaveFilePicker !== "function") {
      error = "Penyimpanan langsung tersedia di Chrome atau Edge desktop melalui HTTPS/localhost.";
      emit(); return status();
    }
    var token = ++generation;
    pending = true; error = null; emit();
    try {
      // Keep the picker as the first awaited action so the browser preserves the click gesture.
      var selected = await window.showSaveFilePicker({ suggestedName: FILE_NAME,
        types: [{ description: "JSON diagnostik NeuroTech", accept: { "application/json": [".json"] } }] });
      if (token !== generation) return status();
      if (!selected || selected.name !== FILE_NAME) {
        error = "Pilih nama file neurotech-diagnostics.json agar file lain tidak tertimpa.";
        return status();
      }
      handle = selected; frames = []; previous = null; lastSavedAt = null;
      anonymousParticipant = randomId(); anonymousSession = randomId();
      active = true;
      await save(token);
      if (active && token === generation) timer = setInterval(function () { save(token); }, INTERVAL_MS);
    } catch (cause) {
      if (token === generation && cause && cause.name !== "AbortError")
        error = "File diagnostik tidak dapat dibuka. Periksa izin browser dan folder tujuan.";
    } finally {
      if (token === generation) { pending = false; emit(); }
    }
    return status();
  }

  async function stop() {
    if (!active && !pending) return status();
    var token = generation;
    active = false;
    pending = true;
    clearInterval(timer); timer = null;
    if (handle) await save(token); // Commit the final recording:false marker.
    generation++;
    pending = false; handle = null; previous = null;
    anonymousParticipant = anonymousSession = null;
    emit();
    return status();
  }

  window.addEventListener("nt-session", function () { stop(); });
  window.addEventListener("pagehide", function () { stop(); });
  window.ntMuseDiagnostics = { start: start, stop: stop, status: status, snapshot: snapshot };
})();
