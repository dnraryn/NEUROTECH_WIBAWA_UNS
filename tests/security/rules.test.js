const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, setDoc, updateDoc, getDoc, getDocs, deleteDoc, query, where, setLogLevel } = require('firebase/firestore');
setLogLevel('silent');
let env;
const company = (code, ownerUid) => ({ schemaVersion: 2, code, ownerUid, companyName: code, package: 'gold', memberCount: 3, workerCount: 1 });
const claims = (uid) => ({ email: uid + '@example.com', email_verified: true, firebase: { sign_in_provider: 'password' } });
const client = (uid, extra = {}) => env.authenticatedContext(uid, { ...claims(uid), ...extra }).firestore();
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'security tests require the emulator');
  env = await initializeTestEnvironment({ projectId: 'demo-neurotech', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(['A', 'B'].map((code) => setDoc(doc(db, 'companies', code), company(code, code + '-owner'))));
    for (const code of ['A', 'B']) {
      for (const [suffix, role] of [['owner', 'management'], ['supervisor', 'supervisor'], ['worker', 'pekerja']]) {
        const uid = code + '-' + suffix;
        await setDoc(doc(db, 'users', uid), { schemaVersion: 2, status: 'active', role, companyCode: code, memberId: uid });
        await setDoc(doc(db, 'companies', code, 'members', uid), { id: uid, uid, role, name: suffix, status: 'active' });
        await setDoc(doc(db, 'companies', code, 'workers', uid), { fi: 22 });
      }
    }
    await setDoc(doc(db, 'companies', 'LEGACY'), { code: 'LEGACY', members: [{ id: 'old', password: 'test-fixture-only' }] });
    await setDoc(doc(db, 'users', 'old'), { role: 'management', companyCode: 'LEGACY' });
    await setDoc(doc(db, 'workers', 'old'), { fi: 22 });
  });
});
after(async () => { await env?.cleanup(); });
test('unauthenticated, anonymous, unverified and unrelated accounts cannot read company/member data', async () => {
  const dbs = [env.unauthenticatedContext().firestore(), client('anonymous', { email_verified: false, firebase: { sign_in_provider: 'anonymous' } }),
    client('A-worker', { email_verified: false }), client('stranger')];
  for (const db of dbs) {
    await assertFails(getDoc(doc(db, 'companies', 'A')));
    await assertFails(getDoc(doc(db, 'companies', 'A', 'members', 'A-worker')));
    await assertFails(getDocs(collection(db, 'companies')));
  }
});
test('workers see their own record; staff see their company; cross-company reads always fail', async () => {
  const worker = client('A-worker');
  await assertSucceeds(getDoc(doc(worker, 'companies', 'A')));
  await assertSucceeds(getDoc(doc(worker, 'companies', 'A', 'members', 'A-worker')));
  await assertSucceeds(getDocs(query(collection(worker, 'companies', 'A', 'members'), where('uid', '==', 'A-worker'))));
  await assertFails(getDoc(doc(worker, 'companies', 'A', 'members', 'A-owner')));
  await assertFails(getDocs(collection(worker, 'companies', 'A', 'members')));
  for (const uid of ['A-worker', 'A-supervisor', 'A-owner']) {
    const db = client(uid);
    await assertFails(getDoc(doc(db, 'companies', 'B')));
    await assertFails(getDoc(doc(db, 'companies', 'B', 'members', 'B-worker')));
    await assertFails(getDoc(doc(db, 'companies', 'B', 'workers', 'B-worker')));
  }
  await assertSucceeds(getDocs(collection(client('A-supervisor'), 'companies', 'A', 'members')));
  await assertSucceeds(getDoc(doc(client('A-owner'), 'companies', 'A', 'workers', 'A-worker')));
  await assertFails(getDoc(doc(worker, 'companies', 'A', 'workers', 'A-owner')));
});
test('clients cannot create or edit profiles, roles, company ownership, memberships or monitoring records', async () => {
  for (const uid of ['A-worker', 'A-supervisor', 'A-owner']) {
    const db = client(uid, { role: 'management' });
    await assertFails(updateDoc(doc(db, 'users', uid), { role: 'management', companyCode: 'B' }));
    await assertFails(setDoc(doc(db, 'users', 'new-user'), { role: 'management' }));
    await assertFails(updateDoc(doc(db, 'companies', 'A'), { ownerUid: uid }));
    await assertFails(setDoc(doc(db, 'companies', 'NEW'), company('NEW', uid)));
    await assertFails(setDoc(doc(db, 'companies', 'A', 'members', uid), { uid, role: 'management', status: 'active' }));
    await assertFails(deleteDoc(doc(db, 'companies', 'A', 'members', 'A-worker')));
    await assertFails(setDoc(doc(db, 'companies', 'A', 'workers', uid), { fi: 0 }));
    await assertFails(setDoc(doc(db, 'companyCounters', 'B'), { value: 0 }));
  }
});
test('legacy role documents and legacy password arrays grant no company or global worker access', async () => {
  const db = client('old', { role: 'management' });
  await assertFails(getDoc(doc(db, 'companies', 'LEGACY')));
  await assertFails(getDoc(doc(db, 'workers', 'old')));
  await assertFails(setDoc(doc(db, 'workers', 'old'), { fi: 0 }));
  await assertFails(getDoc(doc(client('A-owner'), 'users', 'B-worker')));
  await assertSucceeds(getDoc(doc(client('A-worker'), 'users', 'A-worker')));
});
test('revoking server membership denies subsequent reads even with the same existing token', async () => {
  const db = client('B-supervisor');
  await assertSucceeds(getDoc(doc(db, 'companies', 'B')));
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users', 'B-supervisor'), { status: 'revoked' });
  });
  await assertFails(getDoc(doc(db, 'companies', 'B')));
  await assertFails(getDocs(collection(db, 'companies', 'B', 'members')));
});
