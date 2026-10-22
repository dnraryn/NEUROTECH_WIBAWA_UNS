const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, serverTimestamp, setLogLevel, onSnapshot } = require('firebase/firestore');
setLogLevel('silent');
let env;
const client = (uid, extra = {}) => env.authenticatedContext(uid, { email: uid + '@example.com', email_verified: true, firebase: { sign_in_provider: 'password' }, ...extra }).firestore();
const sid = (n) => 's-test-' + String(n).padStart(16, '0');
const record = (n, uid = 'A-worker', status = 'completed') => ({ schemaVersion: 1, id: sid(n), companyCode: 'A', ownerUid: uid, memberId: uid, shift: 'Pagi', source: 'muse',
  startedAt: Date.now() - 60000, endedAt: status === 'recording' ? null : Date.now() - 1000, updatedAt: Date.now(), status, protocol: 'athena', algorithmVersion: 'eeg-heuristic-v3', receivedSamples: 1024,
  minutes: [{ minute: 0, n: 1, partial: 0, provisional: 0, fi: 30, cli: 40, ei: 60, fiMax: 30, incidents: 0 }], checkin: { sleptHours: 6.5, sleepTargetHours: 8, targetMinutes: 60, sleepiness: 3, note: '' }, savedAt: serverTimestamp() });
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  env = await initializeTestEnvironment({ projectId: 'demo-neurotech-archive', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const code of ['A','B']) {
      await setDoc(doc(db, 'companies', code), { schemaVersion: 2, ownerUid: code + '-owner' });
      for (const [suffix,role] of [['owner','management'],['supervisor','supervisor'],['worker','pekerja'],['other','pekerja']]) {
        const uid = code + '-' + suffix;
        await setDoc(doc(db,'users',uid), { schemaVersion:2, companyCode:code, memberId:uid, status:'active',role });
        await setDoc(doc(db,'companies',code,'members',uid), { uid,status:'active',role });
      }
    }
    await setDoc(doc(db,'companies','A','sessions',sid(1)),record(1));
    await setDoc(doc(db,'companies','A','sessions',sid(2)),record(2,'A-other'));
  });
});
after(async () => { await env?.cleanup(); });

test('staff alert reaches only its worker; acknowledgement and closure synchronize across accounts', async () => {
  const staff=client('A-supervisor'), worker=client('A-worker');
  const path=['companies','A','workerAlerts','message-1'];
  const data={schemaVersion:1,recipientUid:'A-worker',memberId:'A-worker',senderUid:'A-supervisor',title:'Evaluasi kondisi',message:'Temui petugas K3 sebelum melanjutkan.',severity:'attention',createdAt:serverTimestamp(),acknowledgedAt:null,resolvedAt:null,resolvedBy:null};
  await assertFails(setDoc(doc(client('A-worker'),...path),{...data,senderUid:'A-worker'}));
  await assertFails(setDoc(doc(client('B-supervisor'),...path),{...data,senderUid:'B-supervisor'}));
  await assertFails(setDoc(doc(staff,...path),{...data,recipientUid:'B-worker'}));
  await assertSucceeds(setDoc(doc(staff,...path),data));
  await assertFails(getDoc(doc(client('A-other'),...path)));
  await assertFails(getDoc(doc(client('B-worker'),...path)));
  await assertFails(getDocs(collection(worker,'companies','A','workerAlerts')));
  const messages=await assertSucceeds(getDocs(query(collection(worker,'companies','A','workerAlerts'),where('recipientUid','==','A-worker'))));
  assert.equal(messages.size,1);
  const observe=(db,predicate)=>new Promise((resolve,reject)=>{
    let stop;const timeout=setTimeout(()=>{stop?.();reject(Error('realtime delivery timeout'));},7000);
    stop=onSnapshot(doc(db,...path),snap=>{if(predicate(snap.data())){clearTimeout(timeout);stop();resolve(snap.data());}},reject);
  });
  const delivered=await observe(worker,r=>r?.title===data.title);assert.equal(delivered.recipientUid,'A-worker');
  await assertFails(updateDoc(doc(worker,...path),{message:'tampered',acknowledgedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(client('A-other'),...path),{acknowledgedAt:serverTimestamp()}));
  const acknowledged=observe(staff,r=>!!r?.acknowledgedAt);
  await assertSucceeds(updateDoc(doc(worker,...path),{acknowledgedAt:serverTimestamp()}));await acknowledged;
  const closed=observe(worker,r=>!!r?.resolvedAt);
  await assertSucceeds(updateDoc(doc(staff,...path),{resolvedAt:serverTimestamp(),resolvedBy:'A-supervisor'}));await closed;
  await assertFails(updateDoc(doc(staff,...path),{resolvedAt:null,resolvedBy:null}));
});
test('session access isolates companies, workers, anonymous and unverified accounts', async () => {
  const path = ['companies','A','sessions',sid(1)];
  await assertSucceeds(getDoc(doc(client('A-worker'),...path)));
  await assertSucceeds(getDoc(doc(client('A-supervisor'),...path)));
  await assertSucceeds(getDoc(doc(client('A-owner'),...path)));
  for (const db of [client('A-other'),client('B-owner'),client('A-worker',{email_verified:false}),env.unauthenticatedContext().firestore()]) await assertFails(getDoc(doc(db,...path)));
  await assertFails(getDocs(collection(client('A-worker'),'companies','A','sessions')));
  await assertSucceeds(getDocs(query(collection(client('A-worker'),'companies','A','sessions'),where('ownerUid','==','A-worker'))));
});
test('only actual members create their own Muse summaries; demo, raw payloads and identity forgery fail', async () => {
  const db = client('A-worker');
  await assertSucceeds(setDoc(doc(db,'companies','A','sessions',sid(3)),record(3)));
  for (const [n, change] of [[4,{ownerUid:'A-owner',memberId:'A-owner'}],[5,{source:'demo'}],[6,{rawEEG:[1,2,3]}],[7,{checkin:{sleptHours:-1}}],[8,{companyCode:'B'}]]) {
    await assertFails(setDoc(doc(db,'companies','A','sessions',sid(n)),{...record(n),...change}));
  }
  await assertFails(setDoc(doc(client('B-worker'),'companies','A','sessions',sid(9)),record(9,'B-worker')));
});
test('completed sessions are immutable; recording updates preserve ownership and increasing counters', async () => {
  const db = client('A-worker'), path=['companies','A','sessions',sid(10)], initial=record(10,'A-worker','recording');
  await assertSucceeds(setDoc(doc(db,...path),initial));
  await assertFails(updateDoc(doc(db,...path),{memberId:'A-owner',savedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(db,...path),{receivedSamples:0,savedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(client('A-supervisor'),...path),{receivedSamples:2048,savedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(db,...path),{status:'completed',endedAt:Date.now(),updatedAt:Date.now(),receivedSamples:2048,savedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(db,...path),{receivedSamples:4096,savedAt:serverTimestamp()}));
});
test('v4 calibrated summaries are supported while algorithm identity remains immutable and unknown versions are denied', async () => {
  const db=client('A-worker'), path=['companies','A','sessions',sid(20)];
  await assertSucceeds(setDoc(doc(db,...path),{...record(20,'A-worker','recording'),algorithmVersion:'eeg-heuristic-v4'}));
  await assertFails(updateDoc(doc(db,...path),{algorithmVersion:'eeg-heuristic-v3',savedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(db,'companies','A','sessions',sid(21)),{...record(21),algorithmVersion:'invented-model'}));
  await assertSucceeds(updateDoc(doc(db,...path),{status:'completed',endedAt:Date.now(),updatedAt:Date.now(),savedAt:serverTimestamp()}));
});
test('reviews require same-company staff, a finished session, genuine reviewer UID and immutable notes', async () => {
  const path=['companies','A','sessionReviews',sid(1)], data={schemaVersion:1,sessionId:sid(1),ownerUid:'A-worker',reviewerUid:'A-supervisor',status:'reviewed',note:'Istirahat dan evaluasi kembali.',updatedAt:serverTimestamp()};
  await assertFails(setDoc(doc(client('A-worker'),...path),{...data,reviewerUid:'A-worker'}));
  await assertFails(setDoc(doc(client('B-supervisor'),...path),{...data,reviewerUid:'B-supervisor'}));
  await assertFails(setDoc(doc(client('A-supervisor'),...path),{...data,ownerUid:'A-other'}));
  await assertSucceeds(setDoc(doc(client('A-supervisor'),...path),data));
  await assertSucceeds(getDoc(doc(client('A-worker'),...path)));
  await assertFails(getDoc(doc(client('A-other'),...path)));
  await assertFails(updateDoc(doc(client('A-supervisor'),...path),{note:'overwrite',updatedAt:serverTimestamp()}));
});
