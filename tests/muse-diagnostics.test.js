const test = require('node:test');
const assert = require('node:assert/strict');
const { browser } = require('./helpers');

function setup() {
  const b = browser();
  const counts = { TP9: 1024, AF7: 1024, AF8: 1024, TP10: 1024 };
  const q = { state: 'limited', peakToPeak: 170, processedPeakToPeak: 120,
    deviation: 50, gamma: 28, clippedFraction: 0,
    reasons: ['kualitas terbatas', 'SECRET_FROM_UNTRUSTED_FIELD'], raw: 'RAW_SECRET' };
  b.c.ntMuse = { status: () => ({ connected: true, protocol: 'athena', name: 'PRIVATE_DEVICE_NAME',
    samples: counts.TP9 * 4, channelSamples: counts, channelRateHz: { AF7: 255 },
    lastEEGAt: 1000, token: 'AUTH_SECRET' }),
    readEEG: () => ['RAW_SECRET'] };
  b.c.ntMuseDSP = { signalState: 'limited', quality: { level: 'limited',
    usedChannels: ['TP9', 'AF7', 'AF8'], excludedChannels: ['TP10'],
    channels: { TP9: q, AF7: q, AF8: q, TP10: q }, secret: 'AUTH_SECRET' },
    last: { ts: 1000, fi: 93, cli: 40, ei: 0, status: 'kritis', classificationProvisional: true,
      bands: { raw: 'RAW_SECRET' } }, baselineCount: 3, baselineTarget: 120,
    baseline: null, stream: { discontinuities: 2, lastDiscontinuityAt: 900 },
    calibration: { stage: 'baseline', outcome: 'incomplete', policyVersion: 'baseline-quality-v2',
      acceptedWindows: 30, rejectedWindows: 4, acceptedDurationSec: 30, rejectedDurationSec: 4,
      availabilityPercent: 88, independentWindows: 15, lastUsableAt: 1000, deviceRateVerified: true,
      stability: { fiRaw: 0.2, secret: 'AUTH_SECRET' } }, secret: 'AUTH_SECRET' };
  let contents = '', writes = 0, fail = false;
  b.c.showSaveFilePicker = async () => ({ name: 'neurotech-diagnostics.json',
    async createWritable() {
      if (fail) throw new Error('PRIVATE_FILE_PATH');
      let pending = '';
      return { async write(value) { pending = value; }, async close() { contents = pending; writes++; }, async abort() {} };
    } });
  b.load('muse-diagnostics.js');
  return { b, counts, get contents() { return contents; }, get writes() { return writes; },
    failWrites() { fail = true; } };
}

test('portable mobile diagnostic export is anonymous and includes only allowed disconnect context', () => {
  const {b}=setup();
  b.c.ntMuse.status=()=>({connected:false,lastDisconnect:{reason:'gatt',at:900,eegAgeMs:20,durationMs:800,pageHidden:true,token:'AUTH_SECRET'}});
  const exported=b.c.ntMuseDiagnostics.exportSnapshot();
  assert.equal(exported.frames[0].disconnect.reason,'gatt');
  assert.equal(exported.frames[0].disconnect.pageHidden,true);
  assert.ok(exported.frames[0].anonymousSessionId);
  assert.equal(b.c.ntMuseDiagnostics.status().active,false);
  assert.ok(!JSON.stringify(exported).includes('SECRET'));
  assert.ok(!JSON.stringify(exported).includes('PRIVATE_DEVICE_NAME'));
});

test('diagnostics writes only allowed runtime measurements and actual per-channel rates', async () => {
  const f = setup();
  await f.b.c.ntMuseDiagnostics.start();
  let saved = JSON.parse(f.contents);
  assert.equal(saved.recording, true);
  assert.equal(saved.frames[0].result.ei, 0);
  assert.equal(saved.frames[0].discontinuities, 2);
  assert.equal(saved.frames[0].calibration.stage, 'baseline');
  assert.equal(saved.frames[0].calibration.acceptedWindows, 30);
  assert.equal(saved.frames[0].calibration.stabilityLog2Spread.fiRaw, 0.2);
  assert.equal(saved.frames[0].observedDeviceRateHz.AF7, 255);
  assert.ok(saved.frames[0].anonymousParticipantId);
  assert.ok(saved.frames[0].anonymousSessionId);
  for (const word of ['PRIVATE_DEVICE_NAME', 'AUTH_SECRET', 'RAW_SECRET', 'SECRET_FROM_UNTRUSTED_FIELD'])
    assert.equal(f.contents.includes(word), false, word);
  for (const channel of Object.keys(f.counts)) f.counts[channel] += 512;
  f.b.setClock(3000); f.b.tick();
  await new Promise(setImmediate);
  saved = JSON.parse(f.contents);
  assert.equal(saved.frames.at(-1).samplesPerSecond.AF7, 256);
  assert.equal(saved.frames.at(-1).channels.AF7.processedPeakToPeakUv, 120);
  assert.deepEqual(saved.frames.at(-1).channels.AF7.reasons, ['kualitas terbatas']);
  await f.b.c.ntMuseDiagnostics.stop();
  assert.equal(JSON.parse(f.contents).recording, false);
  const count = f.writes;
  f.b.setClock(5000); f.b.tick();
  await new Promise(setImmediate);
  assert.equal(f.writes, count);
});

test('diagnostics keeps a bounded recent window and stops on session change', async () => {
  const f = setup();
  await f.b.c.ntMuseDiagnostics.start();
  for (let i = 1; i <= 35; i++) {
    f.b.setClock(1000 + 2000 * i); f.b.tick(); await new Promise(setImmediate);
  }
  assert.equal(JSON.parse(f.contents).frames.length, 30);
  f.b.emit('nt-session');
  await new Promise(setImmediate);
  assert.equal(f.b.c.ntMuseDiagnostics.status().active, false);
  assert.equal(JSON.parse(f.contents).recording, false);
});

test('diagnostics refuses another filename and reports a write failure without exposing its path', async () => {
  const f = setup();
  f.b.c.showSaveFilePicker = async () => ({ name: 'other.json', createWritable() { throw Error('should not write'); } });
  await f.b.c.ntMuseDiagnostics.start();
  assert.equal(f.writes, 0);
  assert.match(f.b.c.ntMuseDiagnostics.status().error, /neurotech-diagnostics.json/);
  f.b.c.showSaveFilePicker = async () => ({ name: 'neurotech-diagnostics.json',
    async createWritable() { throw Error('PRIVATE_FILE_PATH'); } });
  await f.b.c.ntMuseDiagnostics.start();
  assert.equal(f.b.c.ntMuseDiagnostics.status().active, false);
  assert.equal(f.b.c.ntMuseDiagnostics.status().error.includes('PRIVATE_FILE_PATH'), false);
});
