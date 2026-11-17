const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const { browser, source } = require('./helpers');

test('member codes identify a specific company, person and stored role without carrying an email or granting access',async()=>{
  const b=browser();b.c.crypto=webcrypto;b.c.TextEncoder=TextEncoder;b.load('portal-access.js');
  const api=b.c.ntPortal,code=await api.memberCode('B-ABCDEF','worker@example.test','pekerja');
  assert.match(code,/^P-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
  assert.equal(code.includes('@'),false);
  assert.equal(await api.memberCode(' b-abcdef ',' WORKER@EXAMPLE.TEST ','pekerja'),code);
  assert.equal(api.codeRole(code),'pekerja');
  assert.equal(await api.matchesCode(code.toLowerCase().replaceAll('-',' '),'B-ABCDEF','worker@example.test','pekerja'),true);
  assert.equal(await api.matchesCode(code,'B-ABCDEF','other@example.test','pekerja'),false);
  assert.equal(await api.matchesCode(code,'B-OTHERX','worker@example.test','pekerja'),false);
  assert.equal(await api.matchesCode(code.replace(/^P/,'M'),'B-ABCDEF','worker@example.test','management'),false);
  assert.equal(api.codeRole('P-INVALID-EMAIL@example.test'),null);
  assert.equal(api.codeRole('P-0000-1111'),null);
  const staff=await api.memberCode('B-ABCDEF','worker@example.test','supervisor');
  assert.equal(api.codeRole(staff),'supervisor');
  assert.equal(await api.matchesCode(code,'B-ABCDEF','worker@example.test','supervisor'),false);
  await assert.rejects(api.memberCode('B-ABCDEF','worker@example.test','admin'));
  await assert.rejects(api.memberCode('B-ABCDEF','worker@example.test','constructor'));
  assert.deepEqual(Array.from(api.apps({role:'constructor'})),[]);
});
test('login account codes are random identifiers with canonical formatting and internal aliases',()=>{
 const b=browser();b.c.crypto=webcrypto;b.load('portal-access.js');const api=b.c.ntPortal;
 const first=api.newLoginCode('pekerja'),second=api.newLoginCode('pekerja');
 assert.notEqual(first,second);assert.equal(api.isLoginCode(first),true);
 assert.equal(api.loginCode(api.formatLoginCode(first).toLowerCase()),first);
 assert.equal(api.isAliasEmail(api.aliasEmail(first)),true);
 assert.equal(api.isLoginCode('P-ABCD-EFGH'),false);
 assert.equal(api.isAliasEmail('real-person@example.test'),false);
});

test('short labels retain separate company contexts and links never include passwords or email addresses',()=>{
 const b=browser();b.c.crypto=webcrypto;b.c.URLSearchParams=URLSearchParams;b.c.location={origin:'https://example.test',pathname:'/',hash:''};b.load('portal-access.js');
 const api=b.c.ntPortal,a={accountCode:'P001',loginCode:api.newLoginCode('pekerja'),code:'B-ABCDEF',companyName:'First'},
   other={...a,code:'B-UVWXYZ',companyName:'Second',loginCode:api.newLoginCode('pekerja')};
 assert.equal(api.accountCode(' p001 '),'P001');assert.equal(api.accountCode('P000'),'');assert.equal(api.accountCode('P0001'),'');assert.equal(api.accountCode('S1000'),'S1000');
 api.rememberAccount({...a,password:'not-to-be-saved',email:'private@example.test'});api.rememberAccount(other);api.rememberAccount(a);
 assert.equal(api.savedAccounts().length,2);assert.equal(api.savedAccounts().filter(e=>e.accountCode==='P001').length,2);
 assert.equal(b.c.localStorage.getItem('nt-account-access-v1').includes('password'),false);
 assert.equal(b.c.localStorage.getItem('nt-account-access-v1').includes('@'),false);
 const link=api.accessLink(a,a.code);assert.equal(link.includes('@'),false);b.c.location.hash=link.slice(link.indexOf('#'));
 assert.equal(api.linkAccount().accountCode,'P001');assert.equal(api.linkAccount().companyCode,a.code);assert.equal(api.linkAccount().loginCode,a.loginCode);
 b.c.location.hash='#/login?account=P001&access=P001&company=B-ABCDEF';assert.equal(api.linkAccount(),null);
 b.c.localStorage.setItem('nt-account-access-v1','broken');assert.equal(api.savedAccounts().length,0);
});

test('authenticated portals stay isolated by stored role and staff never fall back into the worker app', () => {
  const b=browser();b.load('portal-access.js');
  const code = source('app.jsx');
  const { allowedApps } = vm.runInContext(code.slice(code.indexOf('const ROLE_HOME'), code.indexOf('// Resolve a route')) + '\n({ allowedApps });',b.c);
  assert.deepEqual(Array.from(allowedApps({ role: 'pekerja', package: 'bronze' })), ['w']);
  assert.deepEqual(Array.from(allowedApps({ role: 'supervisor', package: 'bronze' })), ['s']);
  assert.deepEqual(Array.from(allowedApps({ role: 'management', package: 'gold' })), ['m']);
  assert.deepEqual(Array.from(allowedApps({ role: 'management', package: 'free' })), []);
  assert.deepEqual(Array.from(allowedApps({ role: 'forged', package: 'gold' })), []);
  assert.equal(b.c.ntPortal.matches({role:'pekerja'},'supervisor'),false);
  assert.equal(b.c.ntPortal.matches({role:'management'},'management'),true);
});

test('installed and app-link launches are worker-only; management links stay in its own portal',()=>{
  const b=browser();b.c.URLSearchParams=URLSearchParams;b.c.location={search:''};b.load('portal-access.js');
  assert.equal(b.c.ntPortal.workerApp(),false);
  b.c.location.search='?app=worker';assert.equal(b.c.ntPortal.workerApp(),true);
  b.c.location.search='?portal=web';b.c.ntPWA={state:()=>({installed:true,standalone:false})};assert.equal(b.c.ntPortal.workerApp(),false);
  b.c.ntPWA.state=()=>({installed:true,standalone:true});assert.equal(b.c.ntPortal.workerApp(),true);
  b.c.ntSession.set({role:'management'});
  assert.equal(b.c.ntPortal.staffPath('/s/workers/member%40example.test'),'/m/workers/member%40example.test');
  assert.equal(b.c.ntPortal.staffPath('/w/live'),'/w/live');
  b.c.ntSession.clear();assert.equal(b.c.ntPortal.staffPath('/s/reports'),'/s/reports');
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
  const account=parse('#/login/pekerja?access=opaque&account=P001');
  assert.equal(account.page,'pekerja');assert.equal(account.path,'/login/pekerja');assert.equal(account.query,'access=opaque&account=P001');
});

test('staff list uses fresh Live including zero and unavailable metrics, then falls back to the last measured archive', () => {
  let view = { measurement: { fi: 0, cli: null, ei: 25, quality: 'limited', provisional: true }, live: true, fresh: true, label: 'Live', row: { status: 'live' } };
  const c = { window: { ntSession: { get: () => ({ code: 'A', members: [
    { id: 'one', uid: 'u-one', name: 'One', role: 'pekerja', accountCode: 'P001' }, { id: 'staff', uid: 'u-staff', name: 'Staff', role: 'management' },
  ] }) }, ntTeamLive: { view: () => view } }, ROLE_LABEL_ID: { pekerja: 'Pekerja', management: 'Manajemen' }, NT_IMG: ['blue'] };
  vm.runInNewContext(source('session-insights.js'), c);
  const api = vm.runInNewContext(source('role-real.jsx').split('const realMetric')[0] + '\n({ realWorkerSummaries, canRemoveMember });', c);
  const base = { source: 'muse', companyCode: 'A', memberId: 'one', algorithmVersion: 'eeg-heuristic-v4', status: 'completed',
    startedAt: 1000, updatedAt: 1000, minutes: [{ minute: 0, n: 30, partial: 0, provisional: 0, fi: 1500, cli: 1200, ei: 1800, incidents: 0 }], summary: { meanFI: 50, meanCLI: 40, meanEI: 60 } };
  const state = { rows: [{ ...base, startedAt: 2000, status: 'recording', minutes: [], summary: { meanFI: null, meanCLI: null } }, base] };
  let [worker] = api.realWorkerSummaries(state, { live: true, workersOnly: true });
  assert.equal(worker.fi, 0); assert.equal(worker.cli, null); assert.equal(worker.ei, 25);
  assert.equal(worker.status, 'normal'); assert.equal(worker.provisional, true); assert.equal(worker.resultLabel, 'Live');
  assert.equal(api.realWorkerSummaries(state, { live: true, workersOnly: true }).length, 1);
  assert.equal(api.realWorkerSummaries(state).length, 2);
  view = { measurement: null, fresh: false, label: 'Pembaruan terhenti', row: { status: 'live' } };
  [worker] = api.realWorkerSummaries(state, { live: true });
  assert.equal(worker.fi, 50); assert.equal(worker.cli, 40); assert.equal(worker.recordedAt, 1000);
  assert.equal(worker.resultLabel, 'Arsip terakhir'); assert.equal(worker.connection.label, 'Pembaruan terhenti');
  const [archiveOnly] = api.realWorkerSummaries(state);
  assert.equal(archiveOnly.fi, 50, 'company aggregate cards never replace archive results with provisional Live');
  assert.equal(archiveOnly.connection.label, 'Belum terkonfirmasi', 'connection comes from the new recording, not the completed fallback');
});

test('staff member controls respect removal hierarchy and protect the owner and current account', () => {
  const c = { window: {}, ROLE_LABEL_ID: {}, NT_IMG: [] };
  const canRemove = vm.runInNewContext(source('role-real.jsx').split('const realMetric')[0] + '\ncanRemoveMember;', c);
  const worker = { id: 'worker', uid: 'w', systemRole: 'pekerja' }, staff = { id: 'staff', uid: 's', systemRole: 'supervisor' }, owner = { id: 'owner', uid: 'o', systemRole: 'management' };
  const supervisor = { uid: 's', memberId: 'staff', ownerUid: 'o', role: 'supervisor' };
  assert.equal(canRemove(worker, supervisor), true);
  assert.equal(canRemove(staff, supervisor), false); assert.equal(canRemove(owner, supervisor), false);
  assert.equal(canRemove({ ...staff, id: 'other', uid: 'other' }, supervisor), false);
  const manager = { uid: 'm', memberId: 'manager', ownerUid: 'o', role: 'management' };
  assert.equal(canRemove(staff, manager), true); assert.equal(canRemove(owner, manager), false);
  assert.equal(canRemove({ ...owner, id: 'other', uid: 'other' }, manager), false);
  assert.equal(canRemove(staff, { ...manager, uid: 'o', memberId: 'owner' }), true);
});
