const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, fakeMuse, feed } = require('./helpers');

async function setup() {
  const b = browser(); fakeMuse(b);
  b.load('ble-muse.js'); b.load('ble-muse-dsp.js'); b.load('mock-data.jsx');
  await b.c.ntDeviceConnect('real');
  return b;
}
function clean(b, tick, offset = tick * 256) {
  b.setClock(2000 + tick * 1000);
  feed(b, { count: 512, offset });
}
function mixed(b, tick, highTheta) {
  b.setClock(2000 + tick * 1000);
  const samples = Float32Array.from({ length: 512 }, (_, i) => {
    const t = (i + tick * 256) / 256;
    return (highTheta ? 20 : 1) * Math.sin(2 * Math.PI * 6 * t) +
      8 * Math.sin(2 * Math.PI * 10 * t) +
      (highTheta ? 1 : 20) * Math.sin(2 * Math.PI * 20 * t);
  });
  for (const channel of ['TP9', 'AF7', 'AF8', 'TP10']) b.emit('nt-muse-eeg', { channel, samples });
}

test('calibration verifies streams, stabilizes, collects independent epochs and activates only after validation', async () => {
  const b = await setup();
  assert.equal(b.c.ntMuseDSP.calibration.stage, 'device-check');
  clean(b, 0);
  assert.equal(b.c.ntMuseDSP.calibration.stage, 'stabilization');
  for (let i = 1; i <= 3; i++) clean(b, i);
  assert.equal(b.c.ntMuseDSP.calibration.stage, 'baseline');
  assert.equal(b.c.ntMuseDSP.baselineCount, 0);
  for (let i = 4; i < 124; i++) clean(b, i);
  const dsp = b.c.ntMuseDSP;
  assert.equal(dsp.calibration.stage, 'complete');
  assert.equal(dsp.calibration.outcome, 'success');
  assert.equal(dsp.baseline.calibrationVersion, 'baseline-quality-v3');
  assert.ok(dsp.baseline.independentWindows >= 20);
  assert.equal(dsp.calibration.acceptedWindows, 124);
  assert.equal(dsp.calibration.rejectedWindows, 0);
  assert.equal(dsp.calibration.availabilityPercent, 100);
});

test('clean baseline waits one minute, then unlocks without a two-minute wait', async () => {
  const b = await setup();
  for (let i = 0; i < 44; i++) clean(b, i);
  assert.equal(b.c.ntMuseDSP.baselineCount, 40);
  assert.equal(b.c.ntMuseDSP.baselineProgress, 1);
  assert.equal(b.c.ntMuseDSP.baseline, null);
  b.setClock(61000);
  feed(b, { count: 512, offset: 44 * 256 });
  assert.equal(b.c.ntMuseDSP.calibration.outcome, 'success');
  assert.ok(b.c.ntMuseDSP.baseline);
  assert.ok(b.c.ntMuseDSP.baseline.ts < 120000);
});

test('poor signal restarts stabilization without training baseline; packet gaps invalidate progress windows', async () => {
  const b = await setup();
  clean(b, 0); clean(b, 1); clean(b, 2);
  assert.equal(b.c.ntMuseDSP.calibration.stabilizationCount, 2);
  b.setClock(5000); feed(b, { count: 512, amplitude: 20 });
  assert.equal(b.c.ntMuseDSP.calibration.stabilizationCount, 0);
  assert.equal(b.c.ntMuseDSP.calibration.rejectedWindows, 1);
  assert.equal(b.c.ntMuseDSP.baselineCount, 0);
  clean(b, 4); clean(b, 5); clean(b, 6);
  assert.equal(b.c.ntMuseDSP.calibration.stage, 'baseline');
  b.setClock(9000);
  b.emit('nt-muse-eeg', { channel: 'TP9', samples: new Float32Array(12), discontinuity: true });
  assert.equal(b.c.ntMuseDSP.calibration.rejectedWindows, 2);
  assert.equal(b.c.ntMuseDSP.calibration.stage, 'baseline');
  assert.equal(b.c.ntMuseDSP.baseline, null);
});

test('large baseline feature dispersion remains incomplete and later stable EEG can recover', async () => {
  const b = await setup();
  for (let i = 0; i < 124; i++) mixed(b, i, Math.floor(i / 4) % 2 === 0);
  assert.equal(b.c.ntMuseDSP.baseline, null);
  assert.equal(b.c.ntMuseDSP.calibration.stage, 'validation');
  assert.equal(b.c.ntMuseDSP.calibration.outcome, 'unstable');
  for (let i = 124; i < 260 && !b.c.ntMuseDSP.baseline; i++) mixed(b, i, true);
  assert.ok(b.c.ntMuseDSP.baseline);
  assert.equal(b.c.ntMuseDSP.calibration.outcome, 'success');
});

test('observed classic transport rate is reported separately from inferred EEG quality', async () => {
  const b = browser(), muse = fakeMuse(b);
  b.load('ble-muse.js');
  await b.c.ntMuse.connect();
  const bytes = new Uint8Array(20);
  b.setClock(1000); muse.notify('0003', bytes);
  for (let i = 1; i <= 43; i++) {
    b.setClock(1000 + i * 2000 / 43);
    muse.notify('0003', bytes);
  }
  assert.ok(b.c.ntMuse.status().channelRateHz.TP9 >= 240);
  assert.ok(b.c.ntMuse.status().channelRateHz.TP9 <= 270);
  assert.equal(b.c.ntMuseMotion.supported(), false);
  assert.equal(b.c.ntMuseMotion.latest(), null);
});
