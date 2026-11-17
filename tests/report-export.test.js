const test = require('node:test');
const assert = require('node:assert/strict');
const { browser } = require('./helpers');
function setup() {
  const b = browser(); b.setClock(2000000);
  b.c.ntSession.set({ uid: 'owner', code: 'A', role: 'management', companyName: 'PT Uji; Bersama', memberName: 'Owner', members: [{ id: 'worker', name: '=HYPERLINK("contoh")', role: 'pekerja' }] });
  b.load('session-insights.js'); b.load('report-export.js');
  return b;
}
function record(changes = {}) {
  return { id: 's-test-0123456789abcdef', ownerUid: 'worker-uid', memberId: 'worker', companyCode: 'A', source: 'muse', startedAt: 100000, endedAt: 220000, updatedAt: 220000, status: 'completed', shift: 'Pagi', receivedSamples: 61440, algorithmVersion: 'eeg-heuristic-v3',
    checkin: { sleptHours: 0, sleepTargetHours: 8, targetMinutes: 60, sleepiness: 2, note: 'Catatan; "satu"\r\nbaris kedua' },
    minutes: [{ minute: 0, n: 2, partial: 1, provisional: 1, fi: 0, cli: 3, ei: 100, fiMax: 0, incidents: 0 }, { minute: 1, n: 0, partial: 2, provisional: 0, fi: 0, cli: 0, ei: 0, fiMax: 0, incidents: 0 }],
    summary: { clean: 2, partial: 3, provisional: 1, cleanPercent: 40, meanFI: 0, meanCLI: 1.5, meanEI: 50, maxFI: 0, incidents: 0, durationMinutes: 2, receivedMinutes: 1, sleepDebt: 8 },
    review: { note: '+Catatan petugas', reviewedAt: 230000 }, synced: true, ...changes };
}
// Parse quoted cells, embedded newlines and escaped quotes rather than counting commas.
function parse(csv, separator) {
  if (csv.startsWith('sep=;\r\n')) csv = csv.slice(7);
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') { if (quoted && csv[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (ch === separator && !quoted) { row.push(value); value = ''; }
    else if (ch === '\r' && csv[i + 1] === '\n' && !quoted) { row.push(value); rows.push(row); row = []; value = ''; i++; }
    else value += ch;
  }
  assert.equal(quoted, false);
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}
test('Excel summary has one rectangular table with readable identity, zero values, locale numbers, multiline notes and safe user text', () => {
  const b = setup(), csv = b.c.ntReports.summary([record()]), rows = parse(csv, ';');
  assert.ok(csv.startsWith('sep=;\r\n')); assert.equal(rows.length, 2);
  assert.equal(rows[0].length, rows[1].length);
  const data = Object.fromEntries(rows[0].map((key, i) => [key, rows[1][i]]));
  assert.equal(data.Perusahaan, 'PT Uji; Bersama'); assert.equal(data['Nama Pekerja'], '\'=HYPERLINK("contoh")');
  assert.equal(data['Fatigue Rata-rata (0-100)'], '0'); assert.equal(data['Beban Kognitif (0-100)'], '1,5');
  assert.equal(data['Tidur Dilaporkan (jam)'], '0'); assert.equal(data['Catatan Pekerja'], record().checkin.note);
  assert.equal(data['Catatan Evaluasi'], "'+Catatan petugas"); assert.ok(data['Zona Waktu']); assert.equal(data['Mulai (UTC ISO)'], new Date(100000).toISOString());
});
test('per-minute export leaves unavailable indices blank and preserves zero; standard CSV stays comma separated', () => {
  const b = setup(), rows = parse(b.c.ntReports.minutes(record(), { excel: false }), ',');
  assert.equal(rows.length, 3); assert.ok(rows.every(r => r.length === rows[0].length));
  const index = rows[0].indexOf('Fatigue Rata-rata (0-100)');
  assert.equal(rows[1][index], '0'); assert.equal(rows[2][index], '');
  assert.equal(rows[2].at(-1), 'Terbatas; indeks tidak disertakan');
  assert.equal(rows[1][rows[0].indexOf('Beban Kognitif (0-100)')], '1.5');
});

test('preview-only sessions export actual experimental metrics independently from clean averages including a missing metric and zero', () => {
  const b = setup(), r = record({ minutes: [], previewMinutes: [{ minute: 1, n: 2, fiN: 2, fi: 140, cliN: 0, cli: 0, eiN: 2, ei: 0, limited: 2, uncalibrated: 2 }],
    summary: { ...record().summary, clean: 0, meanFI: null, meanCLI: null, meanEI: null, incidents: 0 } });
  const rows = parse(b.c.ntReports.minutes(r), ';');
  assert.equal(rows.length, 2); assert.equal(rows[0].length, rows[1].length);
  const m = Object.fromEntries(rows[0].map((key, i) => [key, rows[1][i]]));
  assert.equal(m['Fatigue Rata-rata (0-100)'], ''); assert.equal(m['Fatigue Sementara (0-100)'], '70');
  assert.equal(m['Beban Sementara (0-100)'], ''); assert.equal(m['Engagement Sementara (0-100)'], '0');
  assert.equal(m['Hasil Sementara'], '2'); assert.equal(m['Indikasi Microsleep'], '0');
  const csv = parse(b.c.ntReports.summary([r]), ';'); assert.equal(csv[0].length, csv[1].length);
  const data = Object.fromEntries(csv[0].map((key, i) => [key, csv[1][i]]));
  assert.equal(data['Fatigue Rata-rata (0-100)'], ''); assert.equal(data['Fatigue Sementara (0-100)'], '70');
});

test('daily coverage caps a reached target but exposes its actual numerator without multiplying targets for repeated sessions', () => {
  const b = setup(), sampleMinute = 4 * 256 * 60;
  b.setClock(100000000);
  const r = record({ startedAt: 100000, receivedSamples: 45 * sampleMinute });
  let data = b.c.ntSessionInsights.aggregate([r]);
  assert.equal(data.compliance, 75); assert.equal(data.targetReachedDays, 0);
  data = b.c.ntSessionInsights.aggregate([r, record({ startedAt: 200000, receivedSamples: 45 * sampleMinute })]);
  assert.equal(data.compliance, 100); assert.equal(data.coverageMinutes, 90); assert.equal(data.coverageTargetMinutes, 60);
  assert.equal(data.complianceDays, 1); assert.equal(data.targetReachedDays, 1); assert.equal(data.coverageDetails[0].minutes, 90);
  data = b.c.ntSessionInsights.aggregate([r, record({ memberId: 'other', ownerUid: 'other', startedAt: 200000, receivedSamples: 0 })]);
  assert.equal(data.compliance, 37.5, 'a recorded member/day with no samples must not receive 100%');
  assert.equal(b.c.ntSessionInsights.aggregate([]).compliance, null);
});
test('company aggregation weights clean windows and excludes demo, other tenants, missing data and repeated daily targets', () => {
  const b = setup(), base = record();
  const first = record({ startedAt: 100000, minutes: [{ minute: 0, n: 1, fi: 100, cli: 20, ei: 30, partial: 0, provisional: 0, incidents: 1 }] });
  const second = record({ id: 'second', startedAt: 300000, minutes: [{ minute: 0, n: 9, fi: 90, cli: 180, ei: 270, partial: 8, provisional: 2, incidents: 0 }], checkin: { ...base.checkin, sleptHours: null } });
  const data = b.c.ntSessionInsights.aggregate({ rows: [first, second, record({ source: 'demo' }), record({ companyCode: 'B' })] });
  assert.equal(data.sessions, 2); assert.equal(data.members, 1); assert.equal(data.meanFI, 19); assert.equal(data.meanCLI, 20);
  assert.equal(data.clean, 10); assert.equal(data.partial, 8); assert.equal(data.incidents, 1);
  assert.equal(data.complianceDays, 1); assert.ok(Math.abs(data.compliance - 2 / 60 * 100) < 1e-10);
  assert.equal(data.sleepDebt, 8); assert.equal(data.sleepReportedMembers, 1); assert.equal(data.heatRows[0].h[0], 19);
});
test('worker analytics remain private and shift averages include results beyond the first eight hours', () => {
  const b = setup(), other = record({ id: 'other', ownerUid: 'other' });
  b.c.ntSession.set({ uid: 'worker-uid', code: 'A', role: 'pekerja', memberId: 'worker' });
  const own = record({ minutes: [{ minute: 600, n: 1, fi: 77, cli: 20, ei: 30, partial: 0, provisional: 0, incidents: 0 }] });
  const data = b.c.ntSessionInsights.aggregate({ rows: [own, other] });
  assert.equal(data.sessions, 1); assert.equal(data.meanFI, 77); assert.equal(data.shiftIndices[0].v, 77);
  assert.ok(data.heatRows[0].h.every(v => v === null));
});
test('descriptive filenames cannot contain path separators, formulas, or unsafe punctuation', () => {
  const b = setup(), name = b.c.ntReports.filename('Ringkasan', record({ source: 'demo' }));
  assert.match(name, /^NeuroTech_SIMULASI_Ringkasan_Pekerja-Simulasi_/);
  assert.ok(!/[\\/:*?"<>|=]/.test(name)); assert.ok(name.endsWith('.csv'));
});

test('single-session filenames include the worker, local date and time, shift and session for CSV and PDF', () => {
  const b = setup();
  b.c.ntSession.set({ uid: 'staff', code: 'A', role: 'supervisor', companyName: 'PT Uji', members: [{ id: 'worker', name: 'Dinnar Arsyad' }] });
  const r = record(), stamp = b.c.ntReports.stamp(r.startedAt);
  const base = `NeuroTech_K3_Ringkasan_Dinnar-Arsyad_${stamp.date}_${stamp.time.replace(/:/g, '-')}_Pagi_${r.id}`;
  assert.equal(b.c.ntReports.filename('Ringkasan', r), base + '.csv');
  assert.equal(b.c.ntReports.filename('Ringkasan', [r]), base + '.csv', 'list export of one session retains its identity');
  assert.equal(b.c.ntReports.filename('Ringkasan', r, 'pdf'), base + '.pdf');
  assert.notEqual(b.c.ntReports.filename('Ringkasan', r), b.c.ntReports.filename('Ringkasan', record({ id: 's-other-0123456789abcdef', startedAt: r.startedAt + 1000 })));
});

test('multi-session filenames distinguish a worker archive, company archive and simulation without mutating ordering', () => {
  const b = setup(), first = record(), last = record({ id: 's-later-0123456789abcdef', startedAt: first.startedAt + 86400000 });
  const rows = [last, first], worker = b.c.ntReports.filename('Ringkasan', rows);
  assert.ok(worker.includes('HYPERLINK-contoh'));
  assert.ok(worker.includes('sampai-')); assert.ok(worker.endsWith('_2-sesi.csv'));
  assert.equal(rows[0], last);
  const company = b.c.ntReports.filename('Ringkasan', [first, record({ ownerUid: 'other', memberId: 'other' })]);
  assert.ok(company.includes('PT-Uji-Bersama')); assert.ok(company.endsWith('_2-sesi.csv'));
  const demo = b.c.ntReports.filename('Ringkasan', [record({ source: 'demo' })]);
  assert.ok(demo.includes('_SIMULASI_')); assert.ok(demo.includes('_Pekerja-Simulasi_'));
});
