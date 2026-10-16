// Muse 2 / Muse S (classic + Athena) Web Bluetooth driver. Public API: window.ntMuse.
// nt-muse-eeg samples are signed microvolts at 256 Hz for TP9/AF7/AF8/TP10.
// Protocol references: https://github.com/DominiqueMakowski/OpenMuse
// and https://github.com/kowalej/BlueMuse (Athena 14-bit scale/centering).
(function () {
  "use strict";
  var MUSE_SVC = "0000fe8d-0000-1000-8000-00805f9b34fb";
  var CTRL_CHAR = "273e0001-4c4d-454d-96be-f03bac821358";
  var TEL_CHAR = "273e000b-4c4d-454d-96be-f03bac821358";
  var ATHENA_DATA = "273e0013-4c4d-454d-96be-f03bac821358";
  var ATHENA_OTHER = "273e0014-4c4d-454d-96be-f03bac821358";
  var EEG_CHARS = {
    TP9: "273e0003-4c4d-454d-96be-f03bac821358",
    AF7: "273e0004-4c4d-454d-96be-f03bac821358",
    AF8: "273e0005-4c4d-454d-96be-f03bac821358",
    TP10: "273e0006-4c4d-454d-96be-f03bac821358",
  };
  var device = null, ctrlChar = null, battery = null;
  var samples = 0, connected = false, connecting = false, attempt = 0;
  var lastEEGAt = null, connectedAt = null, channelSamples = {}, channelLastEEGAt = {}, channelRateHz = {}, rateEpoch = {}, eegBuffers = {};
  var lastDisconnect = null;
  var protocol = null, controlBuffer = "", lastAthenaEEG = null, athenaGap = false;
  var subscriptions = [];
  var disconnecting = Promise.resolve();
  var phase = "idle";
  function setPhase(value) {
    phase = value;
    window.dispatchEvent(new CustomEvent("nt-muse-phase", { detail: { phase: value } }));
  }

  function supported() {
    return typeof navigator !== "undefined" && typeof navigator.bluetooth?.requestDevice === "function"
      && window.isSecureContext !== false;
  }
  function buildCmd(str) {
    var packet = new Uint8Array(str.length + 2);
    packet[0] = str.length + 1;
    for (var i = 0; i < str.length; i++) packet[i + 1] = str.charCodeAt(i);
    packet[packet.length - 1] = 10;
    return packet;
  }
  function assertAttempt(id) {
    if (id !== attempt) throw new Error("Pairing Muse dibatalkan.");
  }
  async function writeCommand(characteristic, command) {
    var packet = buildCmd(command);
    // Athena supports writes without response; do not request an unsupported ATT operation.
    if (characteristic.properties && characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(packet);
    } else if (characteristic.properties && characteristic.properties.write && characteristic.writeValueWithResponse) {
      await characteristic.writeValueWithResponse(packet);
    } else {
      await characteristic.writeValue(packet);
    }
  }
  function updateBattery(percent) {
    if (typeof percent !== "number" || !Number.isFinite(percent) || percent < 0 || percent > 100) return;
    battery = Math.round(percent);
    window.dispatchEvent(new CustomEvent("nt-muse-telemetry", { detail: { battery: battery } }));
  }
  function onControl(e) {
    var value = e.target.value;
    if ((!connected && !connecting) || !value || value.byteLength < 2) return;
    var length = Math.min(value.getUint8(0), value.byteLength - 1);
    for (var i = 1; i <= length; i++) controlBuffer += String.fromCharCode(value.getUint8(i));
    if (controlBuffer.length > 4096) controlBuffer = "";
    // Responses may span notifications. Only parse complete JSON objects, including
    // quoted braces and escapes; never log raw replies (they may include a serial).
    while (controlBuffer.indexOf("{") !== -1) {
      controlBuffer = controlBuffer.slice(controlBuffer.indexOf("{"));
      var depth = 0, quoted = false, escaped = false, end = -1;
      for (var j = 0; j < controlBuffer.length; j++) {
        var ch = controlBuffer[j];
        if (quoted) {
          if (escaped) escaped = false;
          else if (ch === "\\") escaped = true;
          else if (ch === '"') quoted = false;
        } else if (ch === '"') quoted = true;
        else if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) { end = j + 1; break; }
      }
      if (end === -1) return;
      try { updateBattery(JSON.parse(controlBuffer.slice(0, end)).bp); } catch (error) { /* Ignore malformed status. */ }
      controlBuffer = controlBuffer.slice(end);
    }
    controlBuffer = "";
  }
  function onTelemetry(e) {
    var value = e.target.value;
    if (!connected || !value || value.byteLength < 4) return;
    // Muse telemetry uses 512 units per percent (as in muse-js).
    updateBattery(value.getUint16(2, false) / 512);
  }
  function emitEEG(channel, decoded, metadata) {
    samples += decoded.length;
    lastEEGAt = Date.now();
    channelSamples[channel] = (channelSamples[channel] || 0) + decoded.length;
    channelLastEEGAt[channel] = lastEEGAt;
    if (!rateEpoch[channel]) rateEpoch[channel] = { at: lastEEGAt, count: channelSamples[channel] };
    else if (lastEEGAt - rateEpoch[channel].at >= 2000) {
      channelRateHz[channel] = Math.round((channelSamples[channel] - rateEpoch[channel].count) /
        ((lastEEGAt - rateEpoch[channel].at) / 1000));
      rateEpoch[channel] = { at: lastEEGAt, count: channelSamples[channel] };
    }
    var buffer = eegBuffers[channel] || (eegBuffers[channel] = []);
    for (var i = 0; i < decoded.length; i++) buffer.push(decoded[i]);
    if (buffer.length > 256) buffer.splice(0, buffer.length - 256);
    window.dispatchEvent(new CustomEvent("nt-muse-eeg", {
      detail: Object.assign({ channel: channel, samples: decoded }, metadata),
    }));
  }
  function onEEGFor(channel) {
    return function (e) {
      var value = e.target.value;
      if (!connected || !value || value.byteLength < 20) return;
      var decoded = new Float32Array(12), out = 0;
      for (var i = 2; i < 20; i += 3) {
        decoded[out++] = (((value.getUint8(i) << 4) | (value.getUint8(i + 1) >> 4)) - 2048) * 0.48828125;
        decoded[out++] = ((((value.getUint8(i + 1) & 15) << 8) | value.getUint8(i + 2)) - 2048) * 0.48828125;
      }
      emitEEG(channel, decoded, { index: value.getUint16(0, false) });
    };
  }
  function onAthenaForStream() {
    var previous = null;
    return function (e) {
      var value = e.target.value;
      if (!connected || !value) return;
      var bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      // A notification can contain several length-prefixed packets. Do not scan
      // unknown payload bytes for tag patterns: that can fabricate EEG samples.
      if (previous && previous.length === bytes.length && previous.every(function (b, i) { return b === bytes[i]; })) return;
      previous = bytes.slice();
      var lengths = { 0x11: 28, 0x12: 28, 0x34: 30, 0x35: 40, 0x36: 40, 0x47: 36, 0x53: 24, 0x98: 20 };
      var offset = 0;
      while (offset < bytes.length) {
        var size = bytes[offset], end = offset + size;
        if (size < 14 || end > bytes.length) { athenaGap = true; return; }
        var cursor = offset + 9;
        while (cursor < end) {
          var tag = bytes[cursor], start = cursor + 5;
          var length = tag === 0x88 ? end - start : lengths[tag];
          if (length === undefined || length < 2 || start + length > end) { athenaGap = true; break; }
          if (tag === 0x11 || tag === 0x12) {
            var channelCount = tag === 0x11 ? 4 : 8, count = 16 / channelCount;
            var channels = Object.keys(EEG_CHARS), decoded = channels.map(function () { return new Float32Array(count); });
            for (var n = 0; n < 16; n++) {
              var bit = n * 14, pos = start + (bit >> 3), shift = bit & 7;
              var packed = bytes[pos] | (bytes[pos + 1] << 8) | ((pos + 2 < start + length ? bytes[pos + 2] : 0) << 16);
              var raw = (packed >>> shift) & 16383, channel = n % channelCount;
              if (channel < 4) decoded[channel][Math.floor(n / channelCount)] = (raw - 8192) * (1450 / 16383);
            }
            var now = Date.now();
            var gap = athenaGap || (lastAthenaEEG !== null && now - lastAthenaEEG > 250);
            athenaGap = false;
            lastAthenaEEG = now;
            // The mux transport index counts other sensors too, so it is not
            // the classic per-electrode EEG index. Never feed it to that check.
            // Preserve the gap flag on every channel, but invalidate the shared
            // montage only once at the beginning of this mux packet.
            channels.forEach(function (ch, i) { emitEEG(ch, decoded[i], { discontinuity: gap, discontinuityStart: i === 0 }); });
          } else if (tag === 0x88 || tag === 0x98) {
            updateBattery((bytes[start] | (bytes[start + 1] << 8)) / 256);
          }
          cursor = start + length;
        }
        offset = end;
      }
    };
  }
  function onDisconnected(e) {
    if (e.target === device) cleanup("gatt");
  }
  function cleanup(reason) {
    var hadDevice = !!device || connected || connecting;
    if (reason === "user") lastDisconnect = null;
    if (hadDevice) {
      var now = Date.now();
      lastDisconnect = { reason: reason || "disconnected", at: now,
        eegAgeMs: lastEEGAt === null ? null : Math.max(0, now - lastEEGAt),
        durationMs: connectedAt === null ? null : Math.max(0, now - connectedAt),
        pageHidden: typeof document !== "undefined" && document.visibilityState === "hidden" };
    }
    attempt++;
    if (device) device.removeEventListener("gattserverdisconnected", onDisconnected);
    subscriptions.forEach(function (s) {
      s.characteristic.removeEventListener("characteristicvaluechanged", s.handler);
    });
    subscriptions = [];
    device = ctrlChar = null;
    battery = null;
    protocol = null;
    controlBuffer = "";
    lastAthenaEEG = null;
    athenaGap = false;
    samples = 0;
    lastEEGAt = null;
    connectedAt = null;
    channelSamples = {};
    channelLastEEGAt = {};
    channelRateHz = {};
    rateEpoch = {};
    eegBuffers = {};
    connected = connecting = false;
    setPhase("idle");
    if (hadDevice) window.dispatchEvent(new CustomEvent("nt-muse", {
      detail: { connected: false, reason: reason || "disconnected" },
    }));
  }
  async function subscribe(characteristic, handler, id) {
    assertAttempt(id);
    characteristic.addEventListener("characteristicvaluechanged", handler);
    subscriptions.push({ characteristic: characteristic, handler: handler });
    await characteristic.startNotifications();
    assertAttempt(id);
  }
  async function connect() {
    if (!supported()) throw new Error("Web Bluetooth tidak tersedia. Gunakan Chrome/Edge dengan HTTPS atau localhost.");
    if (connected) return { name: device.name, battery: battery };
    if (connecting) throw new Error("Pairing Muse masih berlangsung.");
    var policy = typeof document !== "undefined" && (document.permissionsPolicy || document.featurePolicy);
    if (policy && typeof policy.features === "function" && policy.features().includes("bluetooth")
      && !policy.allowsFeature("bluetooth")) throw new Error("Akses Bluetooth diblokir halaman ini. Buka NeuroTech langsung di browser, bukan di dalam aplikasi lain.");
    var id = ++attempt;
    connecting = true;
    var selected = null;
    try {
      setPhase("chooser");
      // Open the chooser immediately, within the user's click gesture.
      selected = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MUSE_SVC] }, { namePrefix: "Muse" }],
        optionalServices: [MUSE_SVC],
      });
      assertAttempt(id);
      await disconnecting;
      assertAttempt(id);
      device = selected;
      setPhase("gatt");
      selected.addEventListener("gattserverdisconnected", onDisconnected);
      var server = await selected.gatt.connect();
      assertAttempt(id);
      setPhase("services");
      var service = await server.getPrimaryService(MUSE_SVC);
      assertAttempt(id);
      var characteristics = await service.getCharacteristics();
      assertAttempt(id);
      function find(uuid) {
        return characteristics.find(function (ch) { return ch.uuid.toLowerCase() === uuid; });
      }
      ctrlChar = find(CTRL_CHAR);
      if (!ctrlChar) throw new Error("Layanan kontrol Muse tidak tersedia. Tutup aplikasi Muse lain, nyalakan ulang headband, lalu coba kembali.");
      protocol = find(ATHENA_DATA) ? "athena" : "classic";
      setPhase("notifications");
      await subscribe(ctrlChar, onControl, id);
      assertAttempt(id);
      if (protocol === "athena") {
        await subscribe(find(ATHENA_DATA), onAthenaForStream(), id);
        var other = find(ATHENA_OTHER);
        if (other && (other.properties.notify || other.properties.indicate)) {
          await subscribe(other, onAthenaForStream(), id);
        }
        // OpenMuse handshake: paced commands and repeated dc001. 'd' also
        // starts transitional Athena firmware that does not understand dc001.
        setPhase("streaming");
        var commands = [["v6", 200], ["s", 200], ["h", 200], ["p1045", 200],
          ["s", 200], ["dc001", 50], ["dc001", 100], ["d", 100], ["L1", 300], ["s", 200]];
        for (var step of commands) {
          assertAttempt(id);
          await writeCommand(ctrlChar, step[0]);
          await new Promise(function (resolve) { setTimeout(resolve, step[1]); });
          assertAttempt(id);
        }
      } else {
        var telemetry = find(TEL_CHAR);
        if (telemetry) await subscribe(telemetry, onTelemetry, id);
        var channels = Object.keys(EEG_CHARS);
        for (var i = 0; i < channels.length; i++) {
          var channel = channels[i];
          try {
            var characteristic = find(EEG_CHARS[channel]);
            if (!characteristic) throw new Error("Missing EEG characteristic");
            await subscribe(characteristic, onEEGFor(channel), id);
          } catch (error) {
            assertAttempt(id);
            throw new Error("Kanal EEG " + channel + " gagal diaktifkan. Periksa headband dan coba hubungkan kembali.");
          }
        }
        setPhase("streaming");
        for (var command of ["h", "p21", "s", "d"]) {
          assertAttempt(id);
          await writeCommand(ctrlChar, command);
        }
      }
      assertAttempt(id);
      connected = true;
      connectedAt = Date.now();
      lastDisconnect = null;
      connecting = false;
      setPhase("ready");
      window.dispatchEvent(new CustomEvent("nt-muse", {
        detail: { connected: true, name: selected.name || "Muse", battery: battery, protocol: protocol },
      }));
      return { name: selected.name || "Muse", battery: battery };
    } catch (error) {
      if (id === attempt) cleanup("error");
      if (selected && selected !== device && selected.gatt.connected) selected.gatt.disconnect();
      if (error.name === "NotFoundError") throw new Error("Belum ada Muse yang dipilih. Nyalakan headband, dekatkan ke HP, dan tutup aplikasi lain yang terhubung ke Muse.");
      if (error.name === "NotAllowedError" || error.name === "SecurityError") throw new Error("Izin Bluetooth belum diberikan. Periksa izin browser, lalu tekan Hubungkan Muse kembali. Jika dialog tidak muncul, coba Chrome Android.");
      throw error;
    }
  }
  function disconnect() {
    var previousDevice = device, previousControl = ctrlChar;
    cleanup("user"); // Stop accepting samples and cancel a pending chooser now.
    var previousDisconnect = disconnecting;
    disconnecting = (async function () {
      await previousDisconnect.catch(function () {});
      try {
        if (previousDevice && previousDevice.gatt.connected && previousControl) {
          await writeCommand(previousControl, "h");
        }
      } catch (error) { /* A lost radio link cannot acknowledge halt. */ }
      finally {
        try {
          if (previousDevice && previousDevice.gatt.connected) previousDevice.gatt.disconnect();
        } catch (error) { /* The adapter may have already disappeared. */ }
      }
    })();
    return disconnecting;
  }
  function status() {
    return { connected: connected, name: device ? device.name : null,
      battery: battery, samples: samples, supported: supported(), protocol: protocol, phase: phase,
      lastEEGAt: lastEEGAt, connectedAt: connectedAt,
      channelSamples: Object.assign({}, channelSamples),
      channelLastEEGAt: Object.assign({}, channelLastEEGAt),
      channelRateHz: Object.assign({}, channelRateHz), lastDisconnect: lastDisconnect };
  }
  window.ntMuse = { supported: supported, connect: connect, disconnect: disconnect, status: status,
    readEEG: function (channel) { return (eegBuffers[channel] || []).slice(); },
    get battery() { return battery; } };
  // Reserved interface: Athena IMU packets are not decoded until paired
  // device recordings validate their tags, timing and scale on this preset.
  window.ntMuseMotion = Object.freeze({ supported: function () { return false; },
    latest: function () { return null; } });
})();
