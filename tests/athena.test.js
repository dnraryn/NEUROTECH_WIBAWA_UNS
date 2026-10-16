const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, fakeMuse } = require('./helpers');

function setup(missing, athena = true) {
  const b = browser(), muse = fakeMuse(b, missing, athena), delays = [];
  // Complete handshake waits without real radio delays. DSP time remains explicit.
  b.c.setTimeout = (fn, ms) => { delays.push(ms); queueMicrotask(fn); return 0; };
  b.load('ble-muse.js'); b.load('ble-muse-dsp.js'); b.load('mock-data.jsx');
  return { b, c: b.c, muse, delays };
}
function eeg(values) {
  assert.equal(values.length, 16);
  let packed = 0n;
  values.forEach((v, i) => { packed |= BigInt(v) << BigInt(i * 14); });
  return Uint8Array.from({ length: 28 }, (_, i) => Number((packed >> BigInt(i * 8)) & 255n));
}
function packet(parts, index = 0) {
  const bytes = new Uint8Array(9 + parts.reduce((size, part) => size + 5 + part.data.length, 0));
  assert.ok(bytes.length <= 255);
  bytes[0] = bytes.length; bytes[1] = index & 255;
  new DataView(bytes.buffer).setUint32(2, index * 1000, true);
  let offset = 9;
  for (const part of parts) {
    bytes[offset] = part.tag;
    bytes.set(part.data, offset + 5);
    offset += part.data.length + 5;
  }
  return bytes;
}
const part = (tag, data) => ({ tag, data });
const join = (...arrays) => Uint8Array.from(arrays.flatMap((a) => [...a]));

test('classic EEG still connects when optional legacy battery characteristic is absent', async () => {
  const { c, muse } = setup('000b', false);
  await c.ntDeviceConnect('real');
  assert.equal(c.ntMuse.status().protocol, 'classic');
  assert.equal(c.ntDeviceStatus().real, true);
  assert.equal(c.ntMuse.battery, null);
  assert.deepEqual(muse.commands, ['h', 'p21', 's', 'd']);
});

test('Athena discovers mux characteristics without requesting legacy telemetry/EEG and paces writes', async () => {
  const { c, muse, delays } = setup();
  muse.device.name = 'Muse S Athena';
  muse.chars.get('0001').writeValue = async () => { throw new Error('Unsupported write with response'); };
  await c.ntDeviceConnect('real');
  assert.equal(c.ntMuse.status().protocol, 'athena');
  assert.equal(c.ntDeviceStatus().real, true);
  assert.equal(muse.chars.has('000b'), false);
  assert.deepEqual(muse.commands, ['v6', 's', 'h', 'p1045', 's', 'dc001', 'dc001', 'd', 'L1', 's']);
  assert.deepEqual(delays, [200, 200, 200, 200, 200, 50, 100, 100, 300, 200]);
  for (const id of ['0013', '0014']) {
    assert.equal(muse.chars.get(id).listeners.get('characteristicvaluechanged').size, 1);
  }
  await c.ntDeviceDisconnect();
  assert.equal(muse.commands.at(-1), 'h');
  for (const ch of muse.chars.values()) assert.equal(ch.listeners.get('characteristicvaluechanged').size, 0);
});

test('Athena maps 14-bit sample-major EEG4/EEG8 to four electrodes and respects packet boundaries', async () => {
  const { b, c, muse } = setup();
  await c.ntDeviceConnect('real');
  const events = [];
  b.c.addEventListener('nt-muse-eeg', (e) => events.push(e.detail));
  const raw = [0, 8192, 16383, 8191, 9000, 9100, 9200, 9300, 8193, 8194, 8195, 8196, 1, 2, 3, 4];
  const optical = new Uint8Array(40).fill(0x11); // Looks like EEG tags; must be skipped.
  const a = packet([part(0x36, optical), part(0x11, eeg(raw))], 1);
  const z = packet([part(0x12, eeg(raw))], 2);
  const joined = join(a, z);
  // Nonzero DataView byteOffset must not change decoding.
  const backing = join(new Uint8Array(7), joined, new Uint8Array(3));
  muse.notify('0013', backing.subarray(7, 7 + joined.length));
  assert.deepEqual(events.map((e) => e.channel), ['TP9', 'AF7', 'AF8', 'TP10', 'TP9', 'AF7', 'AF8', 'TP10']);
  for (let p = 0; p < 2; p++) {
    const channels = p ? 8 : 4, count = 16 / channels;
    for (let ch = 0; ch < 4; ch++) {
      const event = events[p * 4 + ch];
      assert.equal(event.samples.length, count);
      assert.equal(event.index, undefined); // Transport index is not an EEG counter.
      for (let sample = 0; sample < count; sample++) {
        const expected = (raw[sample * channels + ch] - 8192) * 1450 / 16383;
        assert.ok(Math.abs(event.samples[sample] - expected) < 0.0001);
      }
    }
  }
  muse.notify('0013', joined); // Duplicate notification must not duplicate samples.
  assert.equal(events.length, 8);
  const status = c.ntMuse.status();
  assert.equal(status.channelSamples.TP9, 6);
  assert.equal(status.samples, 24);
  assert.equal(status.lastEEGAt, 1000);
  const waveform = c.ntMuse.readEEG('TP9');
  assert.equal(waveform.length, 6);
  waveform[0] = 999;
  assert.notEqual(c.ntMuse.readEEG('TP9')[0], 999); // UI cannot mutate the driver buffer.
  status.channelSamples.TP9 = 999;
  assert.equal(c.ntMuse.status().channelSamples.TP9, 6);
  await c.ntDeviceDisconnect();
  assert.equal(c.ntMuse.status().lastEEGAt, null);
  assert.equal(c.ntMuse.readEEG('TP9').length, 0);
});

test('Athena battery uses LE /256 and fragmented control replies preserve zero percent', async () => {
  const { c, muse } = setup();
  await c.ntDeviceConnect('real');
  for (const [raw, expected] of [[0, 0], [12800, 50], [25600, 100]]) {
    const data = new Uint8Array(20);
    new DataView(data.buffer).setUint16(0, raw, true);
    muse.notify('0014', packet([part(0x98, data)], expected));
    assert.equal(c.ntMuse.battery, expected);
  }
  const status = new Uint8Array(201).fill(0x12);
  new DataView(status.buffer).setUint16(0, 64 * 256, true);
  const next = packet([part(0x11, eeg(new Array(16).fill(8192)))], 2);
  muse.notify('0014', join(packet([part(0x88, status)], 1), next));
  assert.equal(c.ntMuse.battery, 64); // Variable status consumes only its own frame.
  function control(text) {
    muse.notify('0001', Uint8Array.from([text.length, ...Buffer.from(text)]));
  }
  control('{"label":"brace } in text","b'); control('p":0}');
  assert.equal(c.ntMuse.battery, 0);
  control('{"bp":101}{"bp":"50"}');
  assert.equal(c.ntMuse.battery, 0); // Invalid telemetry is not presented as real data.
});

test('Athena skips unknown/truncated payloads without scanning them for fake EEG', async () => {
  const { b, c, muse } = setup();
  await c.ntDeviceConnect('real');
  const events = [];
  b.c.addEventListener('nt-muse-eeg', (e) => events.push(e.detail));
  const valid = packet([part(0x11, eeg(new Array(16).fill(8193)))], 3);
  muse.notify('0013', valid.subarray(0, valid.length - 1));
  muse.notify('0013', new Uint8Array([0])); // Must terminate, never loop on length zero.
  muse.notify('0013', packet([part(0xff, valid)], 2));
  assert.equal(events.length, 0);
  muse.notify('0013', valid);
  assert.equal(events.length, 4);
  assert.ok(events.every((e) => e.discontinuity));
  assert.equal(b.errors.length, 0);
});

test('Athena data reaches DSP/history across mixed sensor frames; a radio stall needs a new window', async () => {
  const { b, c, muse } = setup();
  await c.ntDeviceConnect('real');
  let sampleOffset = 0, index = 0;
  function send(base = 1000) {
    b.setClock(base + sampleOffset / 256 * 1000);
    const raw = Array.from({ length: 16 }, (_, i) => {
      const t = (sampleOffset + Math.floor(i / 8)) / 256;
      return 8192 + Math.round((12 * Math.sin(2 * Math.PI * 10 * t) +
        3 * Math.sin(2 * Math.PI * 6 * t) + 7 * Math.sin(2 * Math.PI * 20 * t)) * 16383 / 1450);
    });
    // Non-EEG transport packets must not reset the per-channel DSP windows.
    muse.notify('0013', packet([part(0x47, new Uint8Array(36)), part(0x12, eeg(raw))], index++));
    sampleOffset += 2;
  }
  for (let i = 0; i < 320; i++) send();
  assert.ok(c.ntMuseDSP.last);
  assert.ok(c.ntMuseDSP.bands.alpha > c.ntMuseDSP.bands.beta);
  for (const key of ['fi', 'cli', 'ei']) assert.ok(Number.isFinite(c.ntMuseDSP.last[key]));
  const history = c.ntHistory(c.CURRENT_WORKER.id), before = history.length;
  for (let i = 0; i < 200; i++) send(3000); // >250 ms stall, fewer than 512 fresh samples.
  assert.equal(history.length, before);
  for (let i = 0; i < 150; i++) send(3000);
  assert.ok(history.length > before);
  muse.device.gatt.disconnect();
  assert.equal(c.ntMuseDSP.last, null);
  assert.equal(c.ntDeviceStatus().real, false);
  assert.equal(b.errors.length, 0);
});

test('Athena skips a read-only secondary characteristic and can use only the main stream', async () => {
  const { c, muse } = setup();
  muse.chars.get('0014').properties = { read: true };
  await c.ntDeviceConnect('real');
  assert.equal(muse.chars.get('0014').listeners.get('characteristicvaluechanged'), undefined);
  assert.equal(c.ntMuse.status().protocol, 'athena');
});

test('cancelling during Athena handshake stops later commands and removes all subscriptions', async () => {
  const { c, muse } = setup();
  let firstWait, release;
  const waiting = new Promise((resolve) => { firstWait = resolve; });
  c.setTimeout = (fn) => { release = fn; firstWait(); return 0; };
  const connecting = c.ntDeviceConnect('real');
  await waiting;
  await c.ntDeviceDisconnect();
  release();
  await assert.rejects(connecting, /dibatalkan/);
  assert.deepEqual(muse.commands, ['v6', 'h']);
  assert.equal(c.NT_LIVE, false);
  assert.equal(c.ntMuse.status().protocol, null);
  for (const ch of muse.chars.values()) assert.equal(ch.listeners.get('characteristicvaluechanged').size, 0);
});
