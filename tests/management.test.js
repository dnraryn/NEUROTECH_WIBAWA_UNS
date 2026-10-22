const test = require('node:test');
const assert = require('node:assert/strict');
const { browser } = require('./helpers');
function setup() {
  const b = browser(); b.load('report-export.js'); b.load('management-data.js');
  return b.c.ntManagement;
}
const day = 86400000, now = 40 * day;
const point = (ts, fi = 40, extra = {}) => ({ source: 'muse', ts, fi, cli: 30, ei: 60, ...extra });

test('signal reliability separates fresh sensor quality from personal calibration without inventing confidence percentages', () => {
  const model = setup(), channels=['TP9','AF7','AF8','TP10'];
  const device={connected:true,lastEEGAt:now,channelLastEEGAt:Object.fromEntries(channels.map(ch=>[ch,now]))};
  const dsp={quality:{checkedAt:now,level:'good',usedChannels:channels,channels:Object.fromEntries(channels.map(ch=>[ch,{state:'good'}]))}};
  const fallback=model.signalReliability(device,dsp,now);
  assert.equal(fallback.used.length,4); assert.equal(fallback.kind,'limited'); assert.match(fallback.basis,/umum/);
  assert.equal(model.signalReliability(device,{...dsp,baseline:{ts:now}},now).kind,'good');
  const stale=model.signalReliability(device,dsp,now+4000);
  assert.equal(stale.used.length,0);assert.equal(stale.label,'Menunggu EEG');
  const missing=model.signalReliability({...device,channelLastEEGAt:{AF7:now}},dsp,now);
  assert.equal(missing.used.length,1); assert.equal(missing.label,'Sinyal terbatas');
  assert.equal(model.signalReliability({...device,connected:false},dsp,now).used.length,0);
});

test('live fatigue outlook shows a first value and extrapolates four timestamped provisional FI points', () => {
  const model = setup();
  const rows = [0, 1, 2, 3].map(i => point(now - 3000 + i * 1000, 40 + i * 2,
    { quality: 'limited', provisional: true }));
  const first = model.fatigueOutlook(rows.slice(0, 1), now - 3000);
  assert.equal(first.current, 40);
  assert.equal(first.ready, false);
  const result = model.fatigueOutlook(rows, now);
  assert.equal(result.ready, true);
  assert.equal(result.trend, 'naik');
  assert.equal(result.projection, 62);
  assert.equal(result.provisional, true);
  assert.equal(model.fatigueOutlook(rows, now + 3000).current, null);
  assert.equal(model.fatigueOutlook([...rows, point(now, 99, {source:'demo',quality:'good'})],now).current,46);
  assert.equal(model.fatigueOutlook([rows[0], rows[0], rows[1], rows[2]], now).ready, false);
  const withGap = [...rows, point(now + 5000, 52, {quality:'good'})];
  assert.equal(model.fatigueOutlook(withGap, now + 5000).count, 1);
  assert.equal(model.fatigueOutlook([...rows, point(now + 1000, null, {quality:'bad'})], now + 1000).current, null);
});

test('preview history supplies provisional trends after preparation and resets when the personal baseline activates', () => {
  const model = setup();
  const history = [0, 1, 2, 3].map(i => point(now - 3000 + i * 1000, 40 + i, {quality:'good'}));
  const dsp = { baselineTarget:40, baselineCount:4, calibration:{startedAt:now-65000}, signalState:'calibrating', last:history[3] };
  const data = model.snapshot({now,device:{connected:true,lastEEGAt:now},dsp,history});
  assert.equal(data.preview.length,4);
  assert.ok(data.preview.every(p=>p.quality==='limited' && p.provisional));
  assert.equal(model.fatigueOutlook(data.preview,now).ready,true);
  assert.equal(data.history.length,0);
  const calibrated = model.snapshot({now,device:{connected:true,lastEEGAt:now},dsp:{...dsp,baseline:{ts:now-500}},history});
  assert.equal(calibrated.preview.length,1);
  assert.equal(model.fatigueOutlook(calibrated.preview,now).ready,false);
});

test('one minute opens experimental indices and indications without admitting them to clean reports', () => {
  const model = setup(), startedAt = now - 60000;
  const device = { connected: true, lastEEGAt: now };
  const dsp = { baselineTarget: 40, baselineCount: 5, baseline: null,
    calibration: { startedAt }, signalState: 'limited',
    last: point(now, 63, { classificationProvisional: true, status: 'berisiko', instantStatus: 'berisiko' }) };
  const before = model.snapshot({ now: now - 1, device: { ...device, lastEEGAt: now - 1 },
    dsp: { ...dsp, last: point(now - 1) } });
  assert.equal(before.valid, false);
  const result = model.snapshot({ now, device, dsp, history: [dsp.last] });
  assert.equal(result.latest.fi, 63);
  assert.equal(result.latest.cli, 30);
  assert.equal(result.latest.classificationProvisional, true);
  assert.equal(result.latest.status, 'berisiko');
  assert.equal(result.latest.microsleep, false);
  assert.match(result.conclusion.title, /Indikasi sementara: Berisiko/);
  assert.match(result.conclusion.summary, /acuan umum/);
  assert.match(result.conclusion.note, /eksperimental/);
  assert.equal(result.history.length, 0);
  assert.equal(result.incidents, 0);
  assert.equal(result.preview[0].quality, 'limited');
  for (const state of ['artifact', 'no-signal', 'waiting', 'error']) {
    assert.equal(model.snapshot({ now, device, dsp: { ...dsp, signalState: state } }).valid, false);
  }
  assert.equal(model.snapshot({ now: now + 4000, device, dsp }).valid, false);
  assert.equal(model.snapshot({ now, device, dsp: { ...dsp, calibration: { startedAt: now } } }).valid, false);
  const partial = model.snapshot({ now, device, dsp: { ...dsp, last: { ...dsp.last, cli: null, outputScope: 'frontal-only' } } });
  assert.equal(partial.latest.cli, null);
  assert.equal(partial.latest.fi, 63);
  const bandsOnly = model.snapshot({ now, device, dsp: { ...dsp, last: { ...dsp.last,
    fi: null, cli: null, ei: null, outputScope: 'bands-only', bands: { delta: 10, theta: 20, alpha: 40, beta: 20, gamma: 10 } } } });
  assert.equal(bandsOnly.latest.status, null);
  assert.equal(bandsOnly.latest.instantStatus, null);
});

test('a new Muse pairing hides indices and history until its own baseline is valid', () => {
  const model = setup(), device = { connected: true, lastEEGAt: now };
  const before = model.snapshot({ now, device, dsp: { baselineTarget: 40, baselineCount: 35,
    signalState: 'calibrating', last: point(now, 73) }, history: [point(now - 1000, 78)] });
  assert.equal(before.valid, false);
  assert.equal(before.latest, null);
  assert.equal(before.preview.length, 0);
  assert.equal(before.history.length, 0);
  assert.match(before.message, /5 jendela/);
  const ready = model.snapshot({ now, device, dsp: { baselineTarget: 40, baselineCount: 40,
    baseline: { ts: now - 500 }, signalState: 'ready', last: point(now, 43) },
    history: [point(now - 1000, 78), point(now, 43)] });
  assert.equal(ready.latest.fi, 43);
  assert.deepEqual(ready.history.map(p => p.fi), [43]);
});

test('management shows real fresh indices but distinguishes artifacts, stale data and GATT-only connections', () => {
  const model = setup();
  const device = { connected: true, lastEEGAt: now, samples: 1024 };
  const dsp = { last: point(now), signalState: 'calibrating', baselineCount: 3 };
  const result = model.snapshot({ now, device, dsp });
  assert.equal(result.latest.fi, 40); assert.equal(result.valid, true);
  assert.match(result.message, /3\/40/);
  const artifact = model.snapshot({ now, device, dsp: { ...dsp, signalState: 'artifact' } });
  assert.equal(artifact.receiving, true); assert.equal(artifact.latest, null);
  assert.match(artifact.message, /terganggu/);
  const stalled = model.snapshot({ now: now + 4000, device, dsp });
  assert.equal(stalled.latest, null); assert.match(stalled.message, /berhenti/);
  const gatt = model.snapshot({ now, device: { connected: true, lastEEGAt: null } });
  assert.equal(gatt.latest, null); assert.match(gatt.message, /menunggu paket/);
  const invalid = model.snapshot({ now, device, dsp: { ...dsp, last: point(now, NaN) } });
  assert.equal(invalid.latest, null);
});

test('period filters actual history, counts rising edges once and never manufactures empty heatmap cells', () => {
  const model = setup();
  const history = [
    point(now - 10 * day, 20), point(now - 8 * day, 45, { microsleep: true }),
    point(now - 6 * day, 50, { microsleep: true }), point(now - 2 * day, 30),
    point(now - 1000, 60, { microsleep: true, shift: 'Pagi', monitoringStartedAt: now - 2000 }),
    point(now, 80, { microsleep: true, shift: 'Pagi', monitoringStartedAt: now - 2000 }),
  ];
  const week = model.snapshot({ now, history, period: 0 });
  const month = model.snapshot({ now, history, period: 1 });
  assert.equal(week.history.length, 4); assert.equal(month.history.length, 6);
  assert.equal(week.incidents, 1); assert.equal(month.incidents, 2);
  assert.equal(week.heatRows[0].h[0], 70);
  assert.ok(week.heatRows[0].h.slice(1).every((v) => v === null));
  assert.ok(week.heatRows.slice(1).every((r) => r.h.every((v) => v === null)));
  assert.equal(week.lini[0].v, null);
});

test('monitor hours derive from four-channel 256 Hz samples and CSV contains recorded measurements only', () => {
  const model = setup(), history = [point(now, 42)];
  const data = model.snapshot({ now, history, device: { samples: 4 * 256 * 3600 } });
  assert.equal(data.monitorHours, 1);
  const csv = model.csv(data.history);
  assert.ok(csv.includes('"42","30","60","0"'));
  assert.equal(csv.trimEnd().split('\r\n').length, 2);
  assert.ok(csv.includes(new Date(now).toISOString()));
});

test('demo and unlabelled histories cannot appear in a real management report', () => {
  const model = setup();
  const history = [point(now, 50), point(now, 80, { source: 'demo' }), point(now, 95, { source: undefined })];
  const real = model.snapshot({ now, history });
  const demo = model.snapshot({ now, history, demo: true });
  assert.equal(real.history.length, 1); assert.equal(real.history[0].fi, 50);
  assert.equal(demo.history.length, 1); assert.equal(demo.history[0].fi, 80);
});

test('limited-quality indices can be previewed but never enter clean historical aggregates', () => {
  const model = setup();
  const latest = point(now, 55, { quality: 'limited', classificationProvisional: true, status: 'waspada' });
  const snapshot = model.snapshot({ now, device: { connected: true, lastEEGAt: now },
    dsp: { last: latest, signalState: 'limited', quality: { excludedChannels: ['AF7'] } },
    history: [latest, point(now - 1000)] });
  assert.equal(snapshot.latest.fi, 55); assert.equal(snapshot.latest.classificationProvisional, true);
  assert.match(snapshot.message, /AF7/);
  assert.equal(snapshot.history.length, 1);
  assert.equal(snapshot.preview.length, 2);
});

test('EEG trend preserves real zero values and marks limited segments without inventing measurements', () => {
  const model = setup();
  const history = [point(now - 2000, 90, { ei: 0 }), point(now - 1000, 93, { ei: 0, quality: 'limited' }),
    point(now, 94, { ei: 0 })];
  const data = model.snapshot({ now, history });
  const engagement = model.trend(data.preview, 'ei', now);
  assert.equal(engagement.latest.y, 100);
  assert.equal(engagement.latest.x, 600);
  assert.equal(engagement.solid, '');
  assert.ok(engagement.limited.includes('L600.0,100.0'));
  assert.equal(data.history.length, 2);
  assert.equal(data.preview.length, 3);
});

test('EEG trend breaks at missing data and excludes demo, expired and invalid points', () => {
  const model = setup();
  const history = [point(now - 61000), point(now - 8000, 20), point(now - 1000, 80),
    point(now, 42, { source: 'demo' }), point(now + 1000), point(now, NaN)];
  const data = model.snapshot({ now, history });
  assert.equal(data.preview.length, 2);
  const trend = model.trend(data.preview, 'fi', now);
  assert.equal(trend.solid, ''); assert.equal(trend.limited, '');
  assert.equal(trend.latest.y, 20);
  assert.equal(model.trend([], 'fi', now).latest, null);
});

test('fresh results create a readable conclusion and a chart point even before member history exists', () => {
  const model = setup();
  const data = model.snapshot({ now, device: { connected: true, lastEEGAt: now },
    dsp: { signalState: 'ready', baseline: {}, last: point(now, 93, { cli: 40, ei: 0,
      status: 'kritis', qualityLevel: 'good', classificationProvisional: false }) } });
  assert.equal(data.conclusion.title, 'Kritis');
  assert.match(data.conclusion.summary, /93\/100/);
  assert.match(data.conclusion.summary, /engagement 0\/100/);
  assert.match(data.conclusion.action, /jeda/);
  assert.equal(data.insight.tier, 'critical');
  assert.equal(data.history.length, 0);
  assert.equal(data.preview.length, 1);
  assert.equal(model.trend(data.preview, 'ei', now).latest.y, 100);
});

test('limited and calibrating conclusions identify provisional output and actual problematic sensors', () => {
  const model = setup();
  const input = { now, device: { connected: true, lastEEGAt: now },
    dsp: { signalState: 'limited', baseline: {}, last: point(now, 55, { status: 'waspada' }),
      quality: { level: 'limited', channels: { AF7: { state: 'bad', reasons: ['sinyal datar'] } } } } };
  const limited = model.snapshot(input);
  assert.equal(limited.conclusion.title, 'Waspada · sementara');
  assert.match(limited.conclusion.action, /kontak sensor/);
  assert.deepEqual(Array.from(limited.conclusion.problemChannels), ['AF7: sinyal datar']);
  assert.equal(limited.history.length, 0);
  assert.equal(limited.preview[0].quality, 'limited');
  input.dsp = { signalState: 'calibrating', last: point(now, 40, { status: 'normal' }) };
  const calibrating = model.snapshot(input);
  assert.match(calibrating.conclusion.title, /sementara/);
  assert.match(calibrating.conclusion.action, /Pantau/);
});

test('rejected or expired results do not remain a current conclusion while new packets arrive', () => {
  const model = setup();
  const input = { now, device: { connected: true, lastEEGAt: now },
    dsp: { signalState: 'artifact', last: point(now, 93, { status: 'kritis' }) } };
  assert.equal(model.snapshot(input).conclusion.title, 'Kesimpulan belum tersedia');
  input.dsp = { signalState: 'ready', last: point(now - 4000, 93, { status: 'kritis' }) };
  const stale = model.snapshot(input);
  assert.equal(stale.latest, null);
  assert.match(stale.message, /hasil olahan terbaru belum tersedia/);
  assert.equal(stale.conclusion.summary.includes('93/100'), false);
  input.dsp.last = point(now + 1000);
  assert.equal(model.snapshot(input).valid, false);
});

test('raw waveform reflects recorded samples, preserves zero and bounds only display amplitude', () => {
  const model = setup();
  const wave = model.waveform([1000, 1200, 800, 1000]);
  assert.equal(wave.peakToPeak, 400);
  assert.equal(wave.path, 'M0.0,20.0L200.0,2.0L400.0,38.0L600.0,20.0');
  assert.equal(model.waveform([0, 0]).peakToPeak, 0);
  assert.equal(model.waveform([]).path, '');
  assert.equal(model.waveform([]).peakToPeak, null);
});

test('the conclusion distinguishes an increased current classification from the slower trend category', () => {
  const model = setup();
  const data = model.snapshot({ now, device: { connected: true, lastEEGAt: now },
    dsp: { signalState: 'ready', baseline: {}, last: point(now, 62,
      { cli: 0, ei: 3, instantStatus: 'berisiko', status: 'normal' }) } });
  assert.equal(data.conclusion.title, 'Berisiko');
  assert.match(data.conclusion.summary, /Pola sesaat: Berisiko/);
  assert.match(data.conclusion.summary, /Kategori tren beberapa jendela terakhir: Normal/);
  assert.equal(data.insight.tier, 'high');
  assert.match(data.conclusion.action, /jeda/);
});

test('a frontal-only result displays real FI/EI, a partial conclusion, and leaves CLI unavailable', () => {
  const model = setup();
  const last = point(now, 62, { cli: null, ei: 25, hrv: null, quality: 'limited', qualityLevel: 'limited',
    outputScope: 'frontal-only', classificationProvisional: true, status: 'berisiko', instantStatus: 'berisiko' });
  const result = model.snapshot({ now, device: { connected: true, lastEEGAt: now },
    dsp: { signalState: 'limited', last }, history: [last] });
  assert.equal(result.valid, true);
  assert.equal(result.latest.cli, null);
  assert.match(result.conclusion.title, /sementara \(kanal frontal\)/);
  assert.match(result.conclusion.summary, /beban kognitif belum tersedia/);
  assert.match(result.message, /Cognitive Load menunggu/);
  assert.equal(result.preview.length, 1);
  assert.equal(result.history.length, 0);
  assert.equal(model.trend(result.preview, 'cli', now).latest, null);
  assert.ok(model.trend(result.preview, 'fi', now).latest);
});

test('bands-only results remain visible without a misleading fatigue verdict or manufactured history points', () => {
  const model = setup();
  const result = model.snapshot({ now, device: { connected: true, lastEEGAt: now },
    dsp: { signalState: 'limited', last: { ts: now, fi: null, cli: null, ei: null, status: null,
      outputScope: 'bands-only', bands: { delta: 10, theta: 20, alpha: 40, beta: 20, gamma: 10 } } } });
  assert.equal(result.valid, true);
  assert.equal(result.latest.fi, null);
  assert.match(result.conclusion.title, /Band power tersedia/);
  assert.equal(result.preview.length, 0);
  assert.equal(result.history.length, 0);
  assert.match(result.conclusion.note, /belum cukup/);
});

test('an unavailable metric breaks its graph even when other indices continue streaming', () => {
  const model = setup();
  const history = [point(now - 2000, 50), point(now - 1000, 55, { cli: null, quality: 'limited' }), point(now, 60)];
  const cli = model.trend(history, 'cli', now);
  const fi = model.trend(history, 'fi', now);
  assert.equal(cli.solid + cli.limited, '');
  assert.ok(fi.limited);
});
