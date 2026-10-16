const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, collection, runTransaction, serverTimestamp,
  getDoc, getDocs, setDoc, updateDoc, writeBatch, setLogLevel, increment } = require('firebase/firestore');
const { ntCreateCompanyStore } = require('../../company-store');
setLogLevel('silent');
const apps = []; let number = 0;
before(() => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
});
after(async () => { await Promise.all(apps.map(deleteApp)); });
async function account(label, verified = true, codeGenerator) {
  const app = initializeApp({ projectId: 'demo-neurotech', apiKey: 'fake-key' }, label + '-' + ++number); apps.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const email = label + '-' + Date.now() + '-' + number + '@example.com';
  const { user } = await createUserWithEmailAndPassword(auth, email, 'emulator-only-new-password-23!');
  if (verified) {
    const result = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-neurotech/accounts:update', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: user.uid, emailVerified: true }),
    });
    assert.equal(result.ok, true, 'test email verification must succeed');
    await user.reload(); await user.getIdToken(true);
  }
  const wrap = (native) => ({ native, id: native.id, path: native.path, collection: (name) => coll(native.path + '/' + name),
    async get() { const snap = await getDoc(native); return { exists: snap.exists(), data: () => snap.data() }; } });
  const coll = (path) => ({ doc: (id) => wrap(doc(db, path, id)) });
  const compat = { collection: coll, runTransaction: (callback) => runTransaction(db, async (tx) => callback({
    async get(ref) { const snap = await tx.get(ref.native); return { exists: snap.exists(), id: snap.id, data: () => snap.data() }; },
    set: (ref, data) => tx.set(ref.native, data), update: (ref, data) => tx.update(ref.native, data), delete: (ref) => tx.delete(ref.native),
  })) };
  const store = ntCreateCompanyStore({ db: compat, auth, stamp: serverTimestamp, increment, randomToken: () => require("node:crypto").randomBytes(32).toString("hex"),
    randomCode: codeGenerator || (() => (++number).toString(16).padStart(12, '0').toUpperCase()) });
  return { app, db, auth, user, email, store };
}
const info = (a, members = [], pkg = 'bronze') => ({ pkg, companyName: a.email, ownerName: 'Owner', members });
const invite = (a, role = 'pekerja') => ({ name: 'Member', email: a.email, role, shift: 'Pagi' });
const denied = (value) => assert.rejects(value, (e) => /permission-denied|Akses|Hanya|Supervisor|Keanggotaan|akun|perusahaan|paket|verifikasi|tidak ditemukan/i.test(e.code || e.message));

test('short readable company codes retry a collision without overwriting another company', async () => {
  const first = await account('short-code-first', true, () => 'K7R2NX');
  let tries = 0;
  const second = await account('short-code-second', true, () => ++tries === 1 ? 'K7R2NX' : 'M8W3PQ');
  const firstCode = await first.store.create(info(first));
  const secondCode = await second.store.create(info(second));
  assert.equal(firstCode, 'B-K7R2NX'); assert.equal(secondCode, 'B-M8W3PQ'); assert.equal(tries, 2);
  assert.equal((await getDoc(doc(first.db, 'companies', firstCode))).data().ownerUid, first.user.uid);
  await denied(getDoc(doc(second.db, 'companies', firstCode)));
});

test('secret worker links join without pre-entered email; tokens, quotas and roles stay protected', async () => {
  const owner = await account('link-owner'), a = await account('link-a'), b = await account('link-b'), stranger = await account('link-outsider');
  const code = await owner.store.create(info(owner));
  const link = await owner.store.createJoinLink(code);
  await denied(getDocs(collection(stranger.db, 'companies', code, 'joinLinks')));
  await denied(getDoc(doc(stranger.db, 'companies', code)));
  await denied(stranger.store.joinWithLink(code, '0'.repeat(64), 'Unknown'));
  await Promise.all([a.store.joinWithLink(code, link.token, 'Worker A'), b.store.joinWithLink(code, link.token, 'Worker B')]);
  const company = (await getDoc(doc(owner.db, 'companies', code))).data();
  assert.equal(company.memberCount, 3); assert.equal(company.workerCount, 2);
  assert.equal((await getDoc(doc(a.db, 'users', a.user.uid))).data().role, 'pekerja');
  assert.equal((await getDoc(doc(owner.db, 'companies', code, 'joinLinks', link.token))).data().uses, 2);
  await a.store.joinWithLink(code, link.token, 'Already joined');
  assert.equal((await getDoc(doc(owner.db, 'companies', code))).data().memberCount, 3);
  await denied(getDoc(doc(a.db, 'companies', code, 'joinClaims', a.user.uid)));
  await denied(a.store.createJoinLink(code));
  await denied(updateDoc(doc(a.db, 'users', a.user.uid), { role: 'management' }));
  await owner.store.removeMember(a.email);
  await denied(a.store.joinWithLink(code, link.token, 'Removed user'));
  await owner.store.revokeJoinLink(code, link.token);
  await denied(stranger.store.joinWithLink(code, link.token, 'Revoked'));
  const free = await account('link-free'); const freeCode = await free.store.create(info(free, [], 'free'));
  await assert.rejects(free.store.createJoinLink(freeCode));
});

test('link joining rejects forged roles, incomplete claims, expired links and quota races', async () => {
  const owner = await account('link-boundary-owner'), a = await account('link-boundary-a'), b = await account('link-boundary-b');
  const code = await owner.store.create(info(owner));
  const link = await owner.store.createJoinLink(code);
  await denied(setDoc(doc(a.db, 'companies', code, 'joinClaims', a.user.uid), {
    uid: a.user.uid, email: a.email, token: link.token, createdAt: serverTimestamp(),
  }));
  await denied(updateDoc(doc(a.db, 'companies', code, 'joinLinks', link.token), { uses: increment(1), lastJoinedUid: a.user.uid }));
  const forged = writeBatch(a.db);
  forged.set(doc(a.db, 'companies', code, 'joinClaims', a.user.uid), { uid: a.user.uid, email: a.email, token: link.token, createdAt: serverTimestamp() });
  forged.set(doc(a.db, 'companies', code, 'members', a.email), {
    id: a.email, uid: a.user.uid, email: a.email, name: 'Forged', role: 'management', roleDesc: 'Owner', shift: 'Pagi', status: 'active',
  });
  forged.set(doc(a.db, 'users', a.user.uid), { schemaVersion: 2, companyCode: code, memberId: a.email, role: 'management', status: 'active' });
  forged.update(doc(a.db, 'companies', code), { memberCount: increment(1), workerCount: increment(1), revision: increment(1), lastMemberId: a.email, lastMemberAction: 'join' });
  forged.update(doc(a.db, 'companies', code, 'joinLinks', link.token), { uses: increment(1), lastJoinedUid: a.user.uid });
  await denied(forged.commit());
  const expired = await owner.store.createJoinLink(code);
  const expire = await fetch(`http://127.0.0.1:8080/v1/projects/demo-neurotech/databases/(default)/documents/companies/${code}/joinLinks/${expired.token}?updateMask.fieldPaths=expiresAt`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { expiresAt: { timestampValue: '2020-01-01T00:00:00Z' } } }),
  });
  assert.equal(expire.ok, true);
  await denied(a.store.joinWithLink(code, expired.token, 'Expired'));
  for (let i = 0; i < 9; i++) await owner.store.addMember({ name: 'Reserved worker', email: `reserved-${i}@example.test` });
  const results = await Promise.allSettled([a.store.joinWithLink(code, link.token, 'A'), b.store.joinWithLink(code, link.token, 'B')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  const c = (await getDoc(doc(owner.db, 'companies', code))).data();
  assert.equal(c.workerCount, 10); assert.equal(c.memberCount, 11);
});
test('Spark onboarding and verified invitation run through the actual Firestore Rules', async () => {
  const owner = await account('spark-owner'), worker = await account('spark-worker'), stranger = await account('spark-stranger');
  const code = await owner.store.create(info(owner, [invite(worker)]));
  const company = (await getDoc(doc(owner.db, 'companies', code))).data();
  assert.equal(company.ownerUid, owner.user.uid); assert.equal(company.memberCount, 2); assert.equal(company.workerCount, 1);
  assert.equal(company.members, undefined);
  await denied(getDoc(doc(stranger.db, 'companies', code)));
  await denied(getDocs(collection(stranger.db, 'companies', code, 'members')));
  await denied(worker.store.addMember(invite(stranger, 'management')));
  await worker.store.acceptInvitation(code);
  assert.equal((await getDoc(doc(worker.db, 'users', worker.user.uid))).data().role, 'pekerja');
  await denied(updateDoc(doc(worker.db, 'users', worker.user.uid), { role: 'management' }));
  await denied(updateDoc(doc(worker.db, 'companies', code, 'members', worker.email), { role: 'management' }));
  const forged = writeBatch(worker.db);
  forged.update(doc(worker.db, 'users', worker.user.uid), { role: 'management' });
  forged.update(doc(worker.db, 'companies', code, 'members', worker.email), { role: 'management' });
  forged.update(doc(worker.db, 'companies', code), { lastMemberAction: 'role', lastMemberId: worker.email, workerCount: 0, revision: 2 });
  await denied(forged.commit());
  await owner.store.changeRole(worker.email, 'supervisor');
  const staleAction = writeBatch(owner.db);
  staleAction.update(doc(owner.db, 'companies', code, 'members', worker.email), { role: 'pekerja' });
  staleAction.update(doc(owner.db, 'users', worker.user.uid), { role: 'pekerja' });
  await denied(staleAction.commit());
  await worker.store.setShift(worker.email, 'Malam');
  assert.equal((await getDoc(doc(worker.db, 'companies', code, 'members', worker.email))).data().shift, 'Malam');
  await denied(worker.store.addMember(invite(stranger, 'management')));
  await owner.store.removeMember(worker.email);
  await denied(getDoc(doc(worker.db, 'companies', code)));
  await denied(worker.store.setShift(worker.email, 'Pagi'));
  await signOut(owner.auth);
  await denied(getDoc(doc(owner.db, 'companies', code)));
});
test('Rules reject arbitrary company claims, joining with an elevated role and cross-company writes', async () => {
  const first = await account('tenant-one'), second = await account('tenant-two'), member = await account('tenant-member');
  const code = await first.store.create(info(first, [invite(member)]));
  const other = await second.store.create(info(second));
  await denied(updateDoc(doc(second.db, 'companies', code), { ownerUid: second.user.uid }));
  await denied(updateDoc(doc(second.db, 'companies', code, 'members', first.email), { shift: 'Malam' }));
  await denied(member.store.acceptInvitation(other));
  const escalation = writeBatch(member.db);
  escalation.update(doc(member.db, 'companies', code, 'members', member.email), { uid: member.user.uid, status: 'active', role: 'management' });
  escalation.set(doc(member.db, 'users', member.user.uid), { schemaVersion: 2, companyCode: code, memberId: member.email, role: 'management', status: 'active' });
  await denied(escalation.commit());
  await member.store.acceptInvitation(code);
  await denied(member.store.acceptInvitation(other));
  await denied(second.store.setShift(first.email, 'Malam'));
  await denied(setDoc(doc(member.db, 'companies', code, 'members', 'fake@example.com'), {
    id: 'fake@example.com', email: 'fake@example.com', uid: member.user.uid, name: 'Fake', role: 'management', roleDesc: 'Fake', shift: 'Pagi', status: 'active',
  }));
});
test('Rules enforce roster counters and package limits even when a manager bypasses the app', async () => {
  const owner = await account('quota-owner'), member = await account('quota-member');
  const code = await owner.store.create(info(owner));
  // An invite without its matching counter update is denied.
  const data = { id: member.email, email: member.email, name: 'Test', role: 'pekerja', roleDesc: 'Test', shift: 'Pagi', uid: null, status: 'invited' };
  await denied(setDoc(doc(owner.db, 'companies', code, 'members', member.email), data));
  const badCount = writeBatch(owner.db);
  badCount.set(doc(owner.db, 'companies', code, 'members', member.email), data);
  badCount.update(doc(owner.db, 'companies', code), { memberCount: 2, workerCount: 0, lastMemberId: member.email, lastMemberAction: 'add', revision: 1 });
  await denied(badCount.commit());
  const pair = writeBatch(owner.db);
  pair.set(doc(owner.db, 'companies', code, 'members', member.email), data);
  pair.set(doc(owner.db, 'companies', code, 'members', 'extra@example.com'), { ...data, id: 'extra@example.com', email: 'extra@example.com' });
  pair.update(doc(owner.db, 'companies', code), { memberCount: 2, workerCount: 1, lastMemberId: member.email, lastMemberAction: 'add', revision: 1 });
  await denied(pair.commit());
  const free = await account('free-owner'); const freeCode = await free.store.create(info(free, [], 'free'));
  const full = writeBatch(free.db);
  full.set(doc(free.db, 'companies', freeCode, 'members', member.email), data);
  full.update(doc(free.db, 'companies', freeCode), { memberCount: 2, workerCount: 2, lastMemberId: member.email, lastMemberAction: 'add', revision: 1 });
  await denied(full.commit());
  await owner.store.addMember(invite(member));
  const removeOnly = writeBatch(owner.db); removeOnly.delete(doc(owner.db, 'companies', code, 'members', member.email));
  await denied(removeOnly.commit());
});
test('unverified accounts are denied and concurrent additions preserve the company counters', async () => {
  const unverified = await account('not-verified', false);
  await denied(unverified.store.create(info(unverified)));
  await denied(setDoc(doc(unverified.db, 'users', unverified.user.uid), { role: 'management' }));
  const owner = await account('concurrency-owner'), a = await account('concurrent-a'), b = await account('concurrent-b');
  const code = await owner.store.create(info(owner));
  await Promise.all([owner.store.addMember(invite(a)), owner.store.addMember(invite(b))]);
  const company = (await getDoc(doc(owner.db, 'companies', code))).data();
  assert.equal(company.memberCount, 3); assert.equal(company.workerCount, 2);
  await a.store.acceptInvitation(code);
  const removal = writeBatch(owner.db);
  removal.delete(doc(owner.db, 'companies', code, 'members', a.email));
  removal.update(doc(owner.db, 'companies', code), { memberCount: 2, workerCount: 1, lastMemberId: a.email, lastMemberAction: 'remove', revision: company.revision + 1 });
  await denied(removal.commit()); // active profile must be revoked atomically
});
