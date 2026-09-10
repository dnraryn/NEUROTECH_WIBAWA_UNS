// ble-muse.js — Web Bluetooth driver for Muse S / Muse Sleep headbands.
//
// Exposes `window.ntMuse` with:
//   .supported()  → boolean, true if the browser exposes navigator.bluetooth
//   .connect()    → Promise<{name, battery}>; opens the OS pairing dialog,
//                   connects to the GATT server, subscribes to telemetry +
//                   the four EEG channels, and starts streaming preset p21.
//   .disconnect() → Promise<void>; halts streaming and disconnects.
//   .status()     → { connected, name, battery, samples, supported }
//   .battery      → last seen battery % (0-100)
//
// Events dispatched on `window`:
//   "nt-muse"            { connected, name?, reason? }
//   "nt-muse-telemetry"  { battery }
//   "nt-muse-eeg"        { channel, samples: Float32Array } (best-effort decoded)
//
// Muse uses the Bluetooth SIG vendor service 0xFE8D. Each EEG channel and
// the control / telemetry channels live on the 273e000X UUID family.

(function () {
  "use strict";

  var MUSE_SVC  = "0000fe8d-0000-1000-8000-00805f9b34fb";
  var CTRL_CHAR = "273e0001-4c4d-454d-96be-f03bac821358";
  var TEL_CHAR  = "273e000b-4c4d-454d-96be-f03bac821358";
  // EEG order is the same Muse SDK uses — TP9, AF7, AF8, TP10, AUX.
  var EEG_CHARS = {
    TP9:  "273e0003-4c4d-454d-96be-f03bac821358",
    AF7:  "273e0004-4c4d-454d-96be-f03bac821358",
    AF8:  "273e0005-4c4d-454d-96be-f03bac821358",
    TP10: "273e0006-4c4d-454d-96be-f03bac821358",
    AUX:  "273e0007-4c4d-454d-96be-f03bac821358",
  };

  var device = null;
  var server = null;
  var service = null;
  var ctrlChar = null;
  var battery = null;
  var samples = 0;
  var connected = false;

  function supported() {
    return typeof navigator !== "undefined" && !!navigator.bluetooth;
  }

  // Build a Muse control packet: [len, ...ascii, 0x0a]. Used to send tiny
  // commands like "h"=halt, "s"=start streaming, "d"=resume data, "p21"=
  // preset 21 (the compressed-EEG preset used by Muse 2 / Muse S).
  function buildCmd(str) {
    var buf = new Uint8Array(str.length + 2);
    buf[0] = str.length + 1;
    for (var i = 0; i < str.length; i++) buf[i + 1] = str.charCodeAt(i);
    buf[buf.length - 1] = 0x0a;
    return buf;
  }
  function cmd(str) {
    if (!ctrlChar) return Promise.resolve();
    return ctrlChar.writeValue(buildCmd(str));
  }

  // Telemetry packet (16 bytes):
  //   bytes 0-1  packet index (uint16 BE)
  //   bytes 2-3  battery raw → percent = raw / 512
  //   bytes 4-5  fuel gauge (mAh)
  //   bytes 6-7  adc volts
  //   bytes 8-9  temperature (deg C * 256)
  function parseTelemetry(dv) {
    var raw = dv.getUint16(2, false);
    return Math.max(0, Math.min(100, Math.round(raw / 5.12) / 10 * 10));
  }
  function onTelemetry(e) {
    var dv = e.target.value;
    if (!dv || dv.byteLength < 4) return;
    var pct = parseTelemetry(dv);
    if (isFinite(pct)) {
      battery = pct;
      window.dispatchEvent(new CustomEvent("nt-muse-telemetry", { detail: { battery: pct } }));
    }
  }

  // Muse compressed EEG packet (20 bytes):
  //   bytes 0-1  packet index
  //   bytes 2-19 12 samples × 12 bits = 144 bits = 18 bytes
  // Each sample is a 12-bit unsigned value centered at 0x800. Convert to
  // microvolts with the SDK's gain constant (0.48828125 µV / LSB).
  function decodeEEG(dv) {
    var out = new Float32Array(12);
    var bits = 0, buffer = 0, idx = 0;
    for (var b = 2; b < 20; b++) {
      buffer = (buffer << 8) | dv.getUint8(b);
      bits += 8;
      while (bits >= 12 && idx < 12) {
        bits -= 12;
        var raw = (buffer >> bits) & 0xFFF;
        out[idx++] = (raw - 0x800) * 0.48828125;
      }
    }
    return out;
  }
  function onEEGFor(label) {
    return function (e) {
      var dv = e.target.value;
      if (!dv || dv.byteLength < 20) return;
      samples += 12;
      try {
        var s = decodeEEG(dv);
        window.dispatchEvent(new CustomEvent("nt-muse-eeg", {
          detail: { channel: label, samples: s },
        }));
      } catch (err) { /* malformed packet, skip */ }
    };
  }

  function cleanup(reason) {
    connected = false;
    battery = null;
    samples = 0;
    device = server = service = ctrlChar = null;
    window.dispatchEvent(new CustomEvent("nt-muse", {
      detail: { connected: false, reason: reason || "disconnected" },
    }));
  }

  async function connect() {
    if (!supported()) {
      throw new Error("Browser ini tidak mendukung Web Bluetooth (butuh Chrome / Edge desktop, atau Bluefy di iOS).");
    }
    if (connected) return { name: device && device.name, battery: battery };

    // 1. Pairing dialog. Muse devices broadcast names like
    //    "Muse-XXXX" / "MuseS-XXXX" — we accept any with the Muse service
    //    UUID OR a Muse-ish name prefix.
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [MUSE_SVC] },
        { namePrefix: "Muse" },
        { namePrefix: "MuseS" },
      ],
      optionalServices: [MUSE_SVC],
    });
    device.addEventListener("gattserverdisconnected", function () { cleanup("gatt"); });

    // 2. GATT
    server = await device.gatt.connect();
    service = await server.getPrimaryService(MUSE_SVC);

    // 3. Control + telemetry
    ctrlChar = await service.getCharacteristic(CTRL_CHAR);
    await ctrlChar.startNotifications();
    var tel = await service.getCharacteristic(TEL_CHAR);
    tel.addEventListener("characteristicvaluechanged", onTelemetry);
    await tel.startNotifications();

    // 4. Subscribe to each EEG channel that's available. Muse S exposes
    //    all four; AUX is optional and may be missing on some firmwares.
    var labels = Object.keys(EEG_CHARS);
    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      try {
        var c = await service.getCharacteristic(EEG_CHARS[label]);
        c.addEventListener("characteristicvaluechanged", onEEGFor(label));
        await c.startNotifications();
      } catch (e) { /* channel missing on this firmware — skip */ }
    }

    // 5. Kick off streaming. h=halt to reset state, p21=preset 21 (Muse 2
    //    / Muse S, all sensors, compressed), s=start, d=resume data.
    await cmd("h");
    await cmd("p21");
    await cmd("s");
    await cmd("d");

    connected = true;
    window.dispatchEvent(new CustomEvent("nt-muse", {
      detail: { connected: true, name: device.name || "Muse" },
    }));
    return { name: device.name, battery: battery };
  }

  async function disconnect() {
    try { await cmd("h"); } catch (e) { /* ignore */ }
    if (device && device.gatt && device.gatt.connected) {
      try { device.gatt.disconnect(); } catch (e) { /* ignore */ }
    }
    cleanup("user");
  }

  function status() {
    return {
      connected: connected,
      name: device ? device.name : null,
      battery: battery,
      samples: samples,
      supported: supported(),
    };
  }

  window.ntMuse = {
    supported: supported,
    connect: connect,
    disconnect: disconnect,
    status: status,
    get battery() { return battery; },
  };
})();
