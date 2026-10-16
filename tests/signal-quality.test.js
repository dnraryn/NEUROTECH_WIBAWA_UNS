const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, fakeMuse, feed } = require('./helpers');
async function setup() {
  const b = browser(); fakeMuse(b);
  b.load('ble-muse.js'); b.load('ble-muse-dsp.js'); b.load('mock-data.jsx');
  await b.c.ntDeviceConnect('real'); b.setClock(2000);
  return { b, c: b.c };
}
function wave(amplitude = 1, drift = 0, gamma = 0) {
  return Float32Array.from({ length: 512 }, (_, i) => {
    const t = i / 256;
    return amplitude * (12 * Math.sin(2 * Math.PI * 10 * t) +
      3 * Math.sin(2 * Math.PI * 6 * t) + 7 * Math.sin(2 * Math.PI * 20 * t)) +
      drift * (i - 255.5) / 511 + gamma * Math.sin(2 * Math.PI * 38 * t);
  });
}
function send(b, byChannel) {
  for (const ch of ['TP9', 'AF7', 'AF8', 'TP10']) b.emit('nt-muse-eeg', { channel: ch, samples: byChannel[ch] || wave() });
}

test('moderate EEG above the previous 100 uV limit produces indices and a risk class', async () => {
  const { b, c } = await setup();
  feed(b, { count: 512, amplitude: 4 });
  assert.ok(c.ntMuseDSP.quality.channels.AF7.peakToPeak > 100);
  assert.equal(c.ntMuseDSP.quality.level, 'good');
  assert.ok(c.ntMuseDSP.last);
  assert.ok(['normal', 'waspada', 'berisiko', 'kritis'].includes(c.ntMuseDSP.last.status));
  assert.equal(c.ntMuseDSP.baselineCount, 1);
  assert.equal(c.ntMuseDSP.last.classificationProvisional, true); // Calibration still in progress.
});

test('linear voltage drift is removed before quality checks and spectral classification', async () => {
  const plain = await setup(), drifting = await setup();
  send(plain.b, {});
  send(drifting.b, Object.fromEntries(['TP9', 'AF7', 'AF8', 'TP10'].map((ch) => [ch, wave(1, 600)])));
  const result = drifting.c.ntMuseDSP;
  assert.ok(result.quality.channels.AF7.peakToPeak > 500);
  assert.ok(result.quality.channels.AF7.processedPeakToPeak < 100);
  assert.equal(result.quality.level, 'good');
  for (const key of ['fi', 'cli', 'ei']) assert.ok(Math.abs(result.last[key] - plain.c.ntMuseDSP.last[key]) <= 1);
});

test('one bad channel is excluded; three usable channels give explicitly provisional results', async () => {
  const { b, c } = await setup();
  send(b, { AF7: wave(20) });
  assert.equal(c.ntMuseDSP.signalState, 'limited');
  assert.equal(c.ntMuseDSP.quality.channels.AF7.state, 'bad');
  assert.equal(c.ntMuseDSP.quality.usedChannels.length, 3);
  assert.ok(!c.ntMuseDSP.quality.usedChannels.includes('AF7'));
  assert.ok(c.ntMuseDSP.last);
  assert.equal(c.ntMuseDSP.last.classificationProvisional, true);
  assert.equal(c.ntMuseDSP.last.microsleep, false);
  assert.equal(c.ntMuseDSP.baselineCount, 0);
  assert.equal(c.ntHistory(c.CURRENT_WORKER.id)[0].quality, 'limited');
});

test('two unusable channels are excluded while one frontal and one posterior channel retain provisional indices', async () => {
  const { b, c } = await setup();
  send(b, { AF7: wave(20), TP9: wave(20) });
  assert.equal(c.ntMuseDSP.signalState, 'limited');
  assert.deepEqual(Array.from(c.ntMuseDSP.quality.usedChannels), ['AF8', 'TP10']);
  for (const key of ['fi', 'cli', 'ei']) assert.ok(Number.isFinite(c.ntMuseDSP.last[key]));
  assert.equal(c.ntMuseDSP.last.outputScope, 'full');
  assert.equal(c.ntMuseDSP.last.classificationProvisional, true);
  assert.equal(c.ntMuseDSP.last.microsleep, false);
  assert.equal(c.ntMuseDSP.baselineCount, 0);
});

test('one usable frontal channel produces FI/EI and bands without inventing CLI or using rejected channels', async () => {
  const first = await setup(), second = await setup();
  send(first.b, { TP9: wave(20), AF7: wave(7), AF8: wave(20), TP10: wave(20) });
  send(second.b, { TP9: wave(40), AF7: wave(7), AF8: wave(40), TP10: wave(40) });
  const dsp = first.c.ntMuseDSP, out = dsp.last;
  assert.deepEqual(Array.from(dsp.quality.usedChannels), ['AF7']);
  assert.equal(out.outputScope, 'frontal-only');
  assert.equal(dsp.signalState, 'limited');
  assert.ok(Number.isFinite(out.fi) && Number.isFinite(out.ei));
  assert.equal(out.cli, null);
  assert.equal(out.hrv, null);
  assert.equal(out.microsleep, false);
  assert.equal(out.classificationProvisional, true);
  assert.ok(['normal', 'waspada', 'berisiko', 'kritis'].includes(out.instantStatus));
  assert.equal(dsp.baselineCount, 0);
  for (const key of ['fi', 'ei']) assert.equal(out[key], second.c.ntMuseDSP.last[key]);
  for (const key of ['delta', 'theta', 'alpha', 'beta', 'gamma']) {
    assert.ok(Number.isFinite(out.bands[key]));
    assert.equal(out.bands[key], second.c.ntMuseDSP.last.bands[key]);
  }
  assert.equal(first.c.ntHistory(first.c.CURRENT_WORKER.id)[0].quality, 'limited');
});

test('posterior-only input provides measured bands but no fabricated indices or fatigue classification', async () => {
  const { b, c } = await setup();
  send(b, { AF7: wave(20), AF8: wave(20), TP10: wave(20) });
  const out = c.ntMuseDSP.last;
  assert.equal(out.outputScope, 'bands-only');
  assert.equal(c.ntMuseDSP.signalState, 'limited');
  for (const key of ['fi', 'cli', 'ei', 'hrv', 'status', 'instantStatus']) assert.equal(out[key], null);
  assert.equal(c.CURRENT_WORKER.status, 'unavailable');
  assert.ok(out.bands.alpha > 0);
  assert.equal(c.ntMuseDSP.baselineCount, 0);
  assert.equal(out.microsleep, false);
});

test('a change in the usable channel set resets smoothing instead of blending features from another montage', async () => {
  const changed = await setup(), reference = await setup();
  send(changed.b, { TP9: wave(20), AF8: wave(20), TP10: wave(20) });
  const replacement = Float32Array.from({ length: 512 }, (_, i) =>
    12 * Math.sin(2 * Math.PI * 6 * i / 256) + 5 * Math.sin(2 * Math.PI * 10 * i / 256) + 2 * Math.sin(2 * Math.PI * 20 * i / 256));
  const channels = { TP9: wave(20), AF7: wave(20), AF8: replacement, TP10: wave(20) };
  changed.b.setClock(4000); send(changed.b, channels); send(reference.b, channels);
  assert.equal(changed.c.ntMuseDSP.last.fi, reference.c.ntMuseDSP.last.fi);
  assert.equal(changed.c.ntMuseDSP.last.ei, reference.c.ntMuseDSP.last.ei);
});

test('moderate amplitude warnings do not train baseline or trigger microsleep', async () => {
  const { b, c } = await setup();
  const warning = wave(7); // Above the clean bound, below the hard bound.
  for (let i = 0; i < 4; i++) {
    b.setClock(2000 + i * 1000);
    send(b, Object.fromEntries(['TP9', 'AF7', 'AF8', 'TP10'].map((ch) => [ch, warning])));
    assert.equal(c.ntMuseDSP.signalState, 'limited');
    assert.equal(c.ntMuseDSP.last.microsleep, false);
    assert.equal(c.ntMuseDSP.baselineCount, 0);
  }
  b.setClock(7000); send(b, {});
  assert.equal(c.ntMuseDSP.signalState, 'calibrating');
  assert.equal(c.ntMuseDSP.baselineCount, 1);
});

test('moderate gamma contamination is labelled limited even when amplitude is low', async () => {
  const { b, c } = await setup();
  const samples = wave(1, 0, 10);
  send(b, Object.fromEntries(['TP9', 'AF7', 'AF8', 'TP10'].map((ch) => [ch, samples])));
  assert.ok(c.ntMuseDSP.quality.channels.AF7.processedPeakToPeak < 100);
  assert.ok(c.ntMuseDSP.quality.channels.AF7.gamma > 25);
  assert.equal(c.ntMuseDSP.signalState, 'limited');
  assert.equal(c.ntMuseDSP.baselineCount, 0);
  assert.equal(c.ntMuseDSP.last.classificationProvisional, true);
});

test('saturated samples and gamma-dominated EEG are rejected per channel', async () => {
  const { b, c } = await setup();
  const clipped = wave();
  for (let i = 100; i < 108; i++) clipped[i] = 1000;
  send(b, { AF7: clipped });
  assert.equal(c.ntMuseDSP.quality.channels.AF7.state, 'bad');
  assert.ok(c.ntMuseDSP.quality.channels.AF7.reasons.some((r) => r.includes('terpotong')));
  b.setClock(4000);
  const gamma = wave(1, 0, 30);
  send(b, Object.fromEntries(['TP9', 'AF7', 'AF8', 'TP10'].map((ch) => [ch, gamma])));
  assert.equal(c.ntMuseDSP.signalState, 'artifact');
  assert.equal(c.ntMuseDSP.quality.usedChannels.length, 0);
});

test('the new filtering pipeline ignores old calibration without deleting it', async () => {
  const { b, c } = await setup();
  const saved = JSON.stringify({ fiRaw: 3, cliRaw: 2, eiRaw: 0.8, thetaAlpha: 0.5, betaRel: 14 });
  b.local.set('nt-muse-baseline-v2:A:one', saved);
  c.ntSession.set({ code: 'A', memberId: 'one' });
  assert.equal(c.ntMuseDSP.baseline, null);
  assert.equal(b.local.get('nt-muse-baseline-v2:A:one'), saved);
});
