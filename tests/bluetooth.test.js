const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, fakeMuse, feed } = require('./helpers');
test('small personal spectral ratios normalize around baseline instead of pinning the index', async () => {
  const b = browser(), muse = fakeMuse(b);
  b.load('ble-muse.js'); b.load('ble-muse-dsp.js'); b.load('mock-data.jsx');
  b.c.ntSession.set({ code: 'A', memberId: 'one' });
  await b.c.ntDeviceConnect('real');
  function signal(theta, offset) {
    const samples = Float32Array.from({ length: 512 }, (_, i) => {
      const t = (i + offset) / 256;
      return 10 * Math.sin(2 * Math.PI * 10 * t) + theta * Math.sin(2 * Math.PI * 6 * t) + 4 * Math.sin(2 * Math.PI * 20 * t);
    });
    for (const channel of ['TP9', 'AF7', 'AF8', 'TP10']) b.emit('nt-muse-eeg', { channel, samples });
  }
  for (let i = 0; i < 124; i++) { b.setClock(2000 + i * 1000); signal(1, i * 256); }
  assert.equal(b.c.ntMuseDSP.baselineProgress, 1);
  b.setClock(126000); signal(1, 124 * 256);
  assert.ok(Math.abs(b.c.ntMuseDSP.last.cli - 40) <= 2);
  assert.ok(Math.abs(b.c.ntMuseDSP.last.ei - 50) <= 2);
  const first = b.c.ntMuseDSP.last.cli;
  b.setClock(127000); signal(2, 125 * 256);
  assert.ok(b.c.ntMuseDSP.last.cli > first);
  assert.equal(muse.device.gatt.connected, true);
});
function setup(missing) {
  const b = browser(), muse = fakeMuse(b, missing);
  b.load('ble-muse.js');
  b.load('ble-muse-dsp.js');
  b.load('mock-data.jsx');
  return { b, muse, c: b.c };
}

test('real pairing replaces active demo, streams correct commands, and preserves 0% battery', async () => {
  const { b, muse, c } = setup();
  assert.equal(c.NT_LIVE, true);
  assert.equal(c.ntDeviceStatus().real, false);
  await c.ntDeviceConnect('real');
  assert.equal(muse.selections, 1);
  assert.deepEqual(muse.commands, ['h', 'p21', 's', 'd']);
  assert.equal(c.ntDeviceStatus().real, true);
  for (const [raw, expected] of [[0, 0], [25600, 50], [51200, 100]]) {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint16(2, raw);
    muse.notify('000b', bytes);
    assert.equal(c.ntDeviceStatus().battery, expected);
  }
  const decoded = [];
  b.c.addEventListener('nt-muse-eeg', (e) => decoded.push(e.detail));
  const bytes = new Uint8Array(20), data = new DataView(bytes.buffer);
  data.setUint16(0, 42);
  for (let i = 0; i < 6; i++) { // Encode two known 12-bit values per triplet.
    const a = 2048 + i, z = 2047 - i, p = 2 + i * 3;
    bytes[p] = a >> 4; bytes[p + 1] = ((a & 15) << 4) | (z >> 8); bytes[p + 2] = z & 255;
  }
  muse.notify('0003', bytes);
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0].index, 42);
  assert.equal(decoded[0].samples[2], 0.48828125);
  assert.equal(decoded[0].samples[3], -0.9765625);
});

test('missing required EEG channel fails visibly and cleans up instead of simulating', async () => {
  const { muse, c } = setup('0005');
  await assert.rejects(c.ntDeviceConnect('real'), /AF8/);
  assert.equal(c.NT_LIVE, false);
  assert.equal(c.ntMuse.status().connected, false);
  assert.equal(muse.device.gatt.connected, false);
  for (const characteristic of muse.chars.values()) {
    assert.equal(characteristic.listeners.get('characteristicvaluechanged')?.size || 0, 0);
  }
});

test('radio disconnect freezes monitoring, clears stale DSP, and reconnect has one subscription', async () => {
  const { b, muse, c } = setup();
  await c.ntDeviceConnect('real');
  b.setClock(2000); feed(b, { count: 512 });
  assert.ok(c.ntMuseDSP.last);
  muse.device.gatt.disconnect();
  assert.equal(c.ntMuseConnected, false);
  assert.equal(c.NT_LIVE, false);
  assert.equal(c.ntMuse.status().lastDisconnect.reason, 'gatt');
  assert.ok(c.ntMuse.status().lastDisconnect.durationMs >= 0);
  assert.equal(c.ntDeviceStatus().battery, null);
  assert.equal(c.ntMuseDSP.last, null);
  await c.ntDeviceConnect('real');
  assert.equal(c.ntMuse.status().lastDisconnect, null);
  assert.equal(muse.chars.get('0003').listeners.get('characteristicvaluechanged').size, 1);
});

test('logout cancels an open pairing chooser; a late selection cannot restart monitoring', async () => {
  const { muse, c } = setup();
  let choose;
  c.navigator.bluetooth.requestDevice = () => new Promise((resolve) => { choose = resolve; });
  const connecting = c.ntDeviceConnect('real');
  await c.ntLogout();
  choose(muse.device);
  await assert.rejects(connecting, /dibatalkan/);
  assert.equal(muse.connections, 0);
  assert.equal(c.NT_LIVE, false);
  assert.equal(c.ntSession.get(), null);
});

test('clean EEG produces finite indices and waits for fresh data from all four channels', async () => {
  const { b, c } = setup();
  await c.ntDeviceConnect('real');
  b.setClock(2000); feed(b, { count: 512 });
  const first = c.ntMuseDSP.last;
  assert.ok(first);
  for (const key of ['fi', 'cli', 'ei', 'hrv']) assert.ok(Number.isFinite(first[key]));
  assert.equal(c.WORKERS_BY_ID[c.CURRENT_WORKER.id].fi, first.fi);
  const history = c.ntHistory(c.CURRENT_WORKER.id);
  assert.equal(history.length, 1);
  b.setClock(4000); feed(b, { channels: ['TP9', 'AF7', 'AF8'], offset: 512 });
  assert.equal(history.length, 1);
  feed(b, { channels: ['TP10'], offset: 512 });
  assert.equal(history.length, 2);
  assert.equal(b.errors.length, 0);
});

test('movement and flat EEG do not train baseline or publish fabricated scores', async () => {
  const { b, c } = setup();
  await c.ntDeviceConnect('real');
  b.setClock(2000); feed(b, { count: 512, amplitude: 20 });
  assert.equal(c.ntMuseDSP.signalState, 'artifact');
  assert.ok(c.ntMuseDSP.quality.channels.AF7.peakToPeak > 100);
  assert.equal(c.ntMuseDSP.baselineCount, 0);
  assert.equal(c.ntHistory(c.CURRENT_WORKER.id).length, 0);
  c.ntMuseClearBaseline();
  b.setClock(4000); feed(b, { count: 512, amplitude: 0 });
  assert.equal(c.ntMuseDSP.signalState, 'no-signal');
  assert.equal(c.ntMuseDSP.last, null);
});

test('each Muse pairing recalibrates and a different account cannot inherit its baseline', async () => {
  const { b, c } = setup();
  const member = (memberId, code = 'A') => ({ code, memberId, members: [], role: 'pekerja' });
  c.ntSession.set(member('one'));
  await c.ntDeviceConnect('real');
  b.setClock(2000); feed(b, { count: 512 });
  for (let i = 1; i < 124; i++) {
    b.setClock(2000 + i * 1000);
    feed(b, { offset: 512 + (i - 1) * 256 });
  }
  assert.equal(c.ntMuseDSP.baselineProgress, 1);
  assert.ok(c.ntMuseDSP.baseline);
  c.ntSession.set(member('two'));
  assert.equal(c.ntMuseDSP.baseline, null);
  c.ntSession.set(member('one', 'B'));
  assert.equal(c.ntMuseDSP.baseline, null);
  c.ntSession.set(member('one'));
  assert.equal(c.ntMuseDSP.baseline, null);
  b.local.set('nt-muse-baseline-v4:A:one', '{"old":"baseline"}');
  c.ntMuseClearBaseline();
  assert.equal(c.ntMuseDSP.last, null);
  await c.ntDeviceDisconnect();
  await c.ntDeviceConnect('real');
  assert.equal(c.ntMuseDSP.baseline, null);
  assert.equal(c.ntMuseDSP.baselineCount, 0);
});

test('corrupt baselines and EEG received after disconnect cannot poison the next session', async () => {
  const { b, c } = setup();
  b.local.set('nt-muse-baseline-v4:A:one', JSON.stringify({ fiRaw: 0 }));
  c.ntSession.set({ code: 'A', memberId: 'one' });
  await c.ntDeviceConnect('real');
  assert.equal(c.ntMuseDSP.baseline, null);
  b.setClock(2000); feed(b, { count: 512 });
  assert.ok(Number.isFinite(c.ntMuseDSP.last.fi));
  await c.ntDeviceDisconnect();
  const size = c.ntHistory(c.CURRENT_WORKER.id).length;
  b.setClock(5000); feed(b, { count: 512 });
  assert.equal(c.ntHistory(c.CURRENT_WORKER.id).length, size);
});


test('real sessions discard simulated history before publishing EEG', async () => {
  const { b, c } = setup();
  c.ntPushHistory(c.CURRENT_WORKER.id, { ts: 0, fi: 99 });
  await c.ntDeviceConnect('real');
  assert.equal(c.ntHistory(c.CURRENT_WORKER.id).length, 0);
  b.setClock(2000); feed(b, { count: 512 });
  assert.equal(c.ntHistory(c.CURRENT_WORKER.id).length, 1);
  assert.notEqual(c.ntHistory(c.CURRENT_WORKER.id)[0].fi, 99);
});

test('adapter disconnect errors do not make later pairing permanently fail', async () => {
  const { muse, c } = setup();
  await c.ntDeviceConnect('real');
  const disconnect = muse.device.gatt.disconnect;
  muse.device.gatt.disconnect = () => { throw new Error('Adapter disappeared'); };
  await c.ntDeviceDisconnect();
  muse.device.gatt.disconnect = disconnect;
  await c.ntDeviceConnect('real');
  assert.equal(c.ntDeviceStatus().real, true);
});

test('flat EEG breaks the consecutive-window microsleep heuristic', async () => {
  const { b, c } = setup();
  b.local.set('nt-muse-baseline-v4:A:one', JSON.stringify({
    fiRaw: 3, cliRaw: 2, eiRaw: 0.8, thetaAlpha: 0.001, betaRel: 100,
    algorithmVersion: "eeg-heuristic-v4", sampleRate: 256, windowSize: 512, protocol: "classic", ts: 1000,
  }));
  c.ntSession.set({ code: 'A', memberId: 'one' });
  await c.ntDeviceConnect('real');
  b.setClock(2000); feed(b, { count: 512 });
  b.setClock(3000); feed(b, { offset: 512 });
  assert.equal(c.ntMuseDSP.last.microsleep, false);
  b.setClock(5000); feed(b, { count: 512, amplitude: 0 });
  assert.equal(c.ntMuseDSP.signalState, 'no-signal');
  b.setClock(7000); feed(b, { count: 512 });
  assert.equal(c.ntMuseDSP.last.microsleep, false);
});

test('raw Muse packets flow through GATT decoding, DSP and history; packet loss requires a fresh window', async () => {
  const { b, c, muse } = setup();
  await c.ntDeviceConnect('real');
  function packet(index) {
    b.setClock(1000 + index * 12 / 256 * 1000);
    const bytes = new Uint8Array(20);
    new DataView(bytes.buffer).setUint16(0, index);
    const values = Array.from({ length: 12 }, (_, i) => {
      const t = (index * 12 + i) / 256;
      return Math.round((12 * Math.sin(2 * Math.PI * 10 * t) +
        3 * Math.sin(2 * Math.PI * 6 * t) + 7 * Math.sin(2 * Math.PI * 20 * t)) / 0.48828125) + 2048;
    });
    for (let i = 0; i < 12; i += 2) {
      const offset = 2 + i / 2 * 3;
      bytes[offset] = values[i] >> 4;
      bytes[offset + 1] = ((values[i] & 15) << 4) | (values[i + 1] >> 8);
      bytes[offset + 2] = values[i + 1] & 255;
    }
    for (const id of ['0003', '0004', '0005', '0006']) muse.notify(id, bytes);
  }
  for (let i = 0; i < 60; i++) packet(i);
  assert.ok(c.ntMuseDSP.last);
  assert.ok(c.ntMuseDSP.bands.alpha > c.ntMuseDSP.bands.beta);
  const firstCount = c.ntHistory(c.CURRENT_WORKER.id).length;
  // Lose one packet from every channel. Incomplete windows cannot be scored.
  for (let i = 61; i < 80; i++) packet(i);
  assert.equal(c.ntHistory(c.CURRENT_WORKER.id).length, firstCount);
  for (let i = 80; i < 112; i++) packet(i);
  assert.ok(c.ntHistory(c.CURRENT_WORKER.id).length > firstCount);
  assert.equal(b.errors.length, 0);
});
