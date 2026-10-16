const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { browser, source } = require('./helpers');

test('staff can measure their own Muse data while workers remain locked to the personal area', () => {
  const code = source('app.jsx');
  const { allowedApps } = vm.runInNewContext(code.slice(code.indexOf('const ROLE_HOME'), code.indexOf('// Resolve a route')) + '\n({ allowedApps });');
  assert.deepEqual(Array.from(allowedApps({ role: 'pekerja', package: 'bronze' })), ['w']);
  assert.deepEqual(Array.from(allowedApps({ role: 'supervisor', package: 'bronze' })), ['w', 's']);
  assert.deepEqual(Array.from(allowedApps({ role: 'management', package: 'gold' })), ['w', 's', 'm']);
  assert.deepEqual(Array.from(allowedApps({ role: 'management', package: 'free' })), ['w']);
});

test('real members have no fabricated health measurements and background ticks cannot invent them', async () => {
  const b = browser(); b.load('mock-data.jsx');
  b.c.ntSession.set({ uid: 's', code: 'A', memberId: 'staff', role: 'supervisor', members: [
    { id: 'staff', name: 'Staff', role: 'supervisor', shift: 'Pagi' },
    { id: 'worker', name: 'Worker', role: 'pekerja', shift: 'Pagi' },
  ] });
  b.c.ntStartWorkerSync();
  b.c.ntLiveStart(); b.tick();
  for (const w of b.c.WORKERS) {
    for (const key of ['fi', 'cli', 'ei', 'hrv', 'readiness', 'sleep', 'status']) assert.equal(w[key], null);
    assert.equal(b.c.ntHistory(w.id).length, 0);
  }
  await b.c.ntDeviceConnect('demo'); b.tick();
  assert.equal(b.c.ntHistory('worker').length, 0, 'an explicit personal demo must not simulate other company members');
  assert.equal(b.c.ntHistory('staff')[0].source, 'demo');
  await b.c.ntDeviceDisconnect();
  assert.equal(b.c.NT_DEMO_DEVICE, false);
});

test('supervisor summaries exclude foreign/demo records, preserve a measured zero and leave absent measurements unavailable', () => {
  const c = { window: { ntSession: { get: () => ({ code: 'A', members: [
    { id: 'one', name: 'One', role: 'pekerja' }, { id: 'two', name: 'Two', role: 'pekerja' },
  ] }) } }, ROLE_LABEL_ID: { pekerja: 'Pekerja' }, NT_IMG: ['blue'], archiveDate: String };
  const code = source('role-real.jsx');
  vm.runInNewContext(source('session-insights.js'), c);
  const api = vm.runInNewContext(code.slice(0, code.indexOf('const realMetric')) + '\n({ realSessions, realWorkerSummaries });', c);
  const state = { rows: [
    { source: 'demo', companyCode: 'A', memberId: 'two', summary: { meanFI: 99 } },
    { source: 'muse', companyCode: 'B', memberId: 'two', summary: { meanFI: 88 } },
    { source: 'muse', companyCode: 'A', memberId: 'one', startedAt: 123, algorithmVersion: 'eeg-heuristic-v4', minutes: [{ minute: 0, n: 30, partial: 0, provisional: 0, fi: 0, cli: 0, ei: 0, incidents: 0 }], summary: { meanFI: 0, meanCLI: 0, meanEI: 0 } },
  ] };
  assert.equal(api.realSessions(state).length, 1);
  const [one, two] = api.realWorkerSummaries(state);
  assert.equal(one.fi, 0); assert.equal(one.status, 'normal'); assert.equal(one.recordedAt, 123);
  assert.equal(two.fi, null); assert.equal(two.status, 'unavailable');
  assert.equal(one.hrv, null); assert.equal(two.readiness, null);
});

test('encoded member and incident IDs survive route parsing, including malformed escapes', () => {
  const code = source('router.jsx');
  const parse = vm.runInNewContext(code.slice(code.indexOf('const parseRoute'), code.indexOf('const useHashRoute')) + '\nparseRoute;');
  assert.equal(parse('#/s/workers/member%40example.test').id, 'member@example.test');
  assert.equal(parse('#/s/alerts/s-abc%3A5').id, 's-abc:5');
  assert.equal(parse('#/s/workers/bad%escape').id, 'bad%escape');
});
