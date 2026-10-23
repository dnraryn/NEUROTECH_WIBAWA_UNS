const test = require('node:test');
const assert = require('node:assert/strict');
const { browser, clone } = require('./helpers');
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve)); };
async function setup(role = 'management') {
  const b = browser(), paths = new Map(), queries = [];
  const members = [
    { id: 'owner', uid: 'owner', name: 'Owner', email: 'owner@example.com', role: 'management', status: 'active', shift: 'Pagi' },
    { id: 'worker', uid: 'worker', name: 'Worker', email: 'worker@example.com', role: 'pekerja', status: 'active', shift: 'Pagi' },
  ];
  members.forEach((m) => paths.set('companies/A/members/' + m.id, clone(m)));
  paths.set('companies/A', { schemaVersion: 2, code: 'A', ownerUid: 'owner', companyName: 'Company A', package: 'gold' });
  const uid = role === 'management' ? 'owner' : 'worker';
  paths.set('users/' + uid, { schemaVersion: 2, companyCode: 'A', memberId: uid, role, status: 'active' });
  const snap = (path) => ({ exists: paths.has(path), data: () => clone(paths.get(path) || null) });
  const listing = (path, field, value) => ({ docs: [...paths.keys()].filter((p) => p.startsWith(path + '/') &&
    p.split('/').length === path.split('/').length + 1 && (!field || paths.get(p)[field] === value))
    .map((p) => snap(p)) });
  const query = (path, field, value) => ({
    async get() { queries.push({ path, field, value }); return listing(path, field, value); },
    onSnapshot(cb) { cb(listing(path, field, value)); return () => {}; },
    where(key, op, val) { return query(path, key, val); },
    doc(id) { return ref(path + '/' + id); },
  });
  const ref = (path) => ({
    async get() { queries.push({ path }); return snap(path); },
    onSnapshot(cb) { cb(snap(path)); return () => {}; },
    collection(name) { return query(path + '/' + name); },
  });
  const user = { uid, email: uid + '@example.com', emailVerified: true, isAnonymous: false,
    async reload() {}, async getIdToken() { return 'test-token-never-printed'; } };
  const listeners = new Set();
  let signOuts = 0;
  const auth = { currentUser: user, async setPersistence() {},
    onAuthStateChanged(cb) { listeners.add(cb); cb(this.currentUser); return () => listeners.delete(cb); },
    async signOut() { signOuts++; this.currentUser = null; for (const cb of listeners) await cb(null); },
  };
  const control = { gate: Promise.resolve(), fail: false, calls: [] };
  const functions = { httpsCallable(name) { return async (payload) => {
    control.calls.push({ name, payload: clone(payload) }); await control.gate;
    if (control.fail) throw new Error('write-denied');
    if (name === 'setShift') paths.get('companies/A/members/' + payload.id).shift = payload.shift;
    if (name === 'addMember') paths.set('companies/A/members/new', { ...payload.member, id: 'new', uid: null, status: 'invited' });
    if (name === 'removeMember') paths.delete('companies/A/members/' + payload.id);
    return { data: {} };
  }; } };
  const authFactory = () => auth;
  authFactory.Auth = { Persistence: { SESSION: 'session' } };
  b.c.firebase = { initializeApp() {}, app: () => ({ functions: () => functions }),
    firestore: () => ({ collection: (name) => query(name) }), auth: authFactory };
  b.c.ntCreateCompanyStore = () => Object.fromEntries(['create', 'acceptInvitation', 'addMember', 'removeMember', 'setShift', 'changeRole'].map((name) => [name, (...args) => {
    const payload = name === 'addMember' ? { member: args[0] } : name === 'setShift' ? { id: args[0], shift: args[1] } : { id: args[0] };
    return functions.httpsCallable(name)(payload);
  }]));
  b.c.location = { hostname: 'localhost', search: '' };
  b.c.URLSearchParams = URLSearchParams;
  b.c.sessionStorage.setItem('nt-session', JSON.stringify({ role: 'management', members: [{ password: 'obsolete-test-fixture' }] }));
  b.load('firebase-init.js'); b.load('mock-data.jsx'); await flush();
  return { b, c: b.c, paths, control, queries, auth, signOuts: () => signOuts };
}
test('sessions load from Firebase identity and membership; obsolete password cache cannot authorize a user', async () => {
  const { c, auth } = await setup('pekerja');
  assert.equal(c.sessionStorage.getItem('nt-session'), null);
  assert.equal(c.ntSession.get().role, 'pekerja');
  assert.equal(c.ntSession.get().memberId, auth.currentUser.uid);
  assert.equal(c.ntSession.get().members.length, 1);
  assert.throws(() => c.ntSession.set({ ...c.ntSession.get(), role: 'management' }), /Firebase/);
});
test('worker session does not query the company roster or unrelated profiles', async () => {
  const { queries, c } = await setup('pekerja');
  assert.equal(queries.some((q) => q.path === 'companies/A/members'), false);
  assert.equal(queries.some((q) => q.path === 'users/owner'), false);
  assert.equal(c.WORKERS.length, 1);
});
test('failed member writes preserve session, shifts and worker list', async () => {
  const { c, control } = await setup();
  const before = JSON.stringify(c.ntSession.get()); control.fail = true;
  await assert.rejects(c.ntSetWorkerShift('worker', 'Malam'), /write-denied/);
  assert.equal(JSON.stringify(c.ntSession.get()), before);
  assert.equal(c.WORKERS_BY_ID.worker.shift, 'Pagi');
  await assert.rejects(c.ntAddWorker({ name: 'Extra', email: 'extra@example.com', role: 'pekerja' }), /write-denied/);
  assert.equal(c.WORKERS.length, 2);
});
test('member additions await backend acknowledgement and retain newer members and EEG metrics', async () => {
  const { c, control, paths } = await setup();
  c.CURRENT_WORKER.fi = c.WORKERS_BY_ID.owner.fi = 37;
  let release; control.gate = new Promise((resolve) => { release = resolve; });
  const saving = c.ntAddWorker({ name: 'New', email: 'new@example.com', role: 'pekerja', shift: 'Sore' });
  await flush(); assert.equal(c.WORKERS.length, 2);
  paths.set('companies/A/members/remote', { id: 'remote', name: 'Remote', role: 'pekerja', status: 'invited' });
  release(); assert.equal(await saving, true);
  assert.equal(c.WORKERS.length, 4); assert.equal(c.CURRENT_WORKER.fi, 37);
  assert.equal(JSON.stringify(control.calls).includes('password'), false);
});
test('serialized shifts retain both edits; self deletion is blocked', async () => {
  const { c, paths } = await setup();
  await Promise.all([c.ntSetWorkerShift('owner', 'Sore'), c.ntSetWorkerShift('worker', 'Malam')]);
  assert.equal(paths.get('companies/A/members/owner').shift, 'Sore');
  assert.equal(paths.get('companies/A/members/worker').shift, 'Malam');
  await assert.rejects(c.ntRemoveWorker('owner'), /sedang digunakan/);
});
test('logout signs out of Firebase, clears private state and rejects late save responses', async () => {
  const { c, control, auth, signOuts } = await setup();
  c.sessionStorage.setItem('nt-demo', '1');
  c.ntPushHistory('owner', { fi: 37 });
  let release; control.gate = new Promise((resolve) => { release = resolve; });
  const saving = c.ntSetWorkerShift('worker', 'Malam'); await flush();
  await c.ntLogout(); release();
  await assert.rejects(saving, /Sesi berubah/);
  assert.equal(c.ntSession.get(), null); assert.equal(auth.currentUser, null);
  assert.equal(signOuts(), 1); assert.equal(c.sessionStorage.getItem('nt-demo'), null);
  assert.equal(c.ntHistory('owner').length, 0); assert.equal(c.NT_LIVE, false);
  assert.equal(c.WORKERS_BY_ID.owner, undefined);
});
test('ordinary refresh preserves Bluetooth identity; revoked membership clears the session', async () => {
  const { c, paths } = await setup();
  let count = 0; c.addEventListener('nt-session', () => count++);
  await c.ntAuth.refresh(); assert.equal(count, 0);
  paths.get('users/owner').status = 'revoked';
  await c.ntAuth.refresh();
  assert.equal(c.ntSession.get(), null); assert.equal(count, 1);
  assert.equal(c.WORKERS_BY_ID.owner, undefined);
});
test('an authorized role change reloads the data scope even when company and UID stay the same',async()=>{
  const {c,paths}=await setup('pekerja');let resets=0;
  c.addEventListener('nt-session',()=>resets++);
  paths.get('users/worker').role='supervisor';paths.get('companies/A/members/worker').role='supervisor';
  await c.ntAuth.refresh();
  assert.equal(c.ntSession.get().role,'supervisor');assert.equal(resets,1);
  assert.equal(c.ntSession.get().members.length,2);
});
