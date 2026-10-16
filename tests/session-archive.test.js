const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { browser } = require('./helpers');
const settle = () => new Promise((r) => setImmediate(r));
async function setup() {
  const b=browser(); b.c.crypto=webcrypto; b.c.location={hostname:'localhost'};
  b.c.ntMuseConnected=true; b.c.ntMuse={status:()=>({connected:b.c.ntMuseConnected,protocol:'athena',connectedAt:900})};
  b.c.CURRENT_WORKER={shift:'Pagi'}; b.c.ntSessionMetrics={get:()=>({sleptHours:6.5,sleepTargetHours:8,targetMinutes:60})};
  b.load('session-insights.js'); b.load('report-export.js'); b.load('session-archive.js'); await settle(); return b;
}
function output(b, ts, changes={}) {
  b.setClock(ts); b.c.ntMuseDSP={signalState:'ready',last:{ts,qualityLevel:'good',outputScope:'full',fi:30,cli:40,ei:60,microsleep:false,classificationProvisional:false,...changes}}; b.emit('nt-data');
}
test('raw samples may arrive during calibration but no report indices are saved before baseline', async () => {
  const b = await setup(); b.c.ntSessionArchive.begin();
  b.setClock(2000); b.c.ntMuseDSP = { baselineTarget:120, baselineCount:30, signalState:'calibrating',
    last:{ts:2000,qualityLevel:'good',outputScope:'full',fi:80,cli:70,ei:20} }; b.emit('nt-data');
  assert.equal(b.c.ntSessionArchive.state().rows[0].summary.clean,0);
  b.setClock(3000); b.c.ntMuseDSP = { baselineTarget:120, baselineCount:120, baseline:{ts:3000}, signalState:'ready',
    last:{ts:2000,qualityLevel:'good',outputScope:'full',fi:80,cli:70,ei:20} }; b.emit('nt-data');
  assert.equal(b.c.ntSessionArchive.state().rows[0].summary.clean,0);
  b.setClock(4000); b.c.ntMuseDSP.last = {ts:4000,qualityLevel:'good',outputScope:'full',fi:40,cli:40,ei:50}; b.emit('nt-data');
  assert.equal(b.c.ntSessionArchive.state().rows[0].summary.clean,1);
});
test('manual recalibration starts a separate report instead of mixing two baselines', async () => {
  const b = await setup(); b.c.ntSessionArchive.begin(); output(b,2000);
  const first = b.c.ntSessionArchive.state().activeId;
  b.emit('nt-muse-baseline',{baseline:null}); await settle(); await settle();
  const state = b.c.ntSessionArchive.state();
  assert.equal(state.rows.length,2);
  assert.notEqual(state.activeId,first);
  assert.equal(state.rows.find(r=>r.id===first).summary.clean,1);
  assert.equal(state.rows.find(r=>r.id===state.activeId).summary.clean,0);
});
test('partial and posterior-only results cannot enter clean report averages; null stays unavailable',async()=>{
  const b=await setup(); b.c.ntSessionArchive.begin();
  output(b,2000); output(b,3000,{qualityLevel:'limited',fi:99,cli:null,outputScope:'frontal-only'});
  output(b,4000,{qualityLevel:'limited',fi:null,cli:null,ei:null,outputScope:'bands-only'});
  const r=b.c.ntSessionArchive.state().rows[0]; assert.equal(r.summary.meanFI,30); assert.equal(r.summary.partial,2); assert.equal(r.summary.clean,1);
  await b.c.ntSessionArchive.finish(); assert.equal(b.c.ntSessionArchive.state().activeId,null);
  output(b,5000); assert.equal(b.c.ntSessionArchive.state().rows.length,1,'manual finish suppresses automatic restart on the same connection');
});
test('microsleep uses rising edges from clean calibrated output, never partial or baseline guesses',async()=>{
  const b=await setup(); b.c.ntSessionArchive.begin();
  output(b,2000,{microsleep:true}); output(b,3000,{microsleep:true}); output(b,4000,{microsleep:false});
  output(b,5000,{microsleep:true,classificationProvisional:true}); output(b,6000,{microsleep:false});
  output(b,7000,{microsleep:true,qualityLevel:'limited'});
  assert.equal(b.c.ntSessionArchive.state().rows[0].summary.incidents,1);
});
test('check-in ranges are validated and stale results, duplicate timestamps, and demo ticks are ignored',async()=>{
  const b=await setup(); b.c.ntSessionArchive.begin();
  assert.throws(()=>b.c.ntSessionArchive.updateCheckin({sleepiness:6,note:''}));
  await b.c.ntSessionArchive.updateCheckin({sleepiness:3,note:'Kurang tidur'});
  output(b,2000); b.emit('nt-data'); b.setClock(9000); b.emit('nt-data');
  const r=b.c.ntSessionArchive.state().rows[0]; assert.equal(r.summary.clean,1); assert.equal(r.checkin.sleepiness,3); assert.equal(r.summary.sleepDebt,1.5);
  b.c.ntMuseConnected=false; output(b,10000); assert.equal(b.c.ntSessionArchive.state().rows[0].summary.clean,1);
});
test('account changes hide the previous account archive and local previews never call production Firebase',async()=>{
  const b=await setup(); let touched=false; b.c.NT_FIREBASE={db:{collection(){touched=true;throw Error('must not call');}}};
  await b.c.ntSessionArchive.demo(); assert.equal(b.c.ntSessionArchive.state().rows.length,1);
  b.c.ntSession.set({uid:'new',code:'B',memberId:'new'}); await settle();
  assert.equal(b.c.ntSessionArchive.state().rows.length,0); await b.c.ntSessionArchive.sync(); assert.equal(touched,false);
  assert.throws(()=>b.c.ntSessionArchive.demo());
});
test('demo exports carry the simulation label and storage failures are visible rather than claimed saved',async()=>{
  const b=await setup(), r=await b.c.ntSessionArchive.demo();
  assert.equal(r.source,'demo'); assert.match(b.c.ntSessionArchive.csv(r),/"demo"/);
  assert.equal(b.c.ntSessionArchive.state().storage,'memory'); assert.match(b.c.ntSessionArchive.state().error,/Ekspor CSV/);
  assert.equal(b.c.ntSessionArchive.state().rows[0].synced,false);
});
test('pairing may publish its event before the shared device flag; recording starts after the adapter updates',async()=>{
  const b=await setup(); b.c.ntMuseConnected=false;
  b.emit('nt-muse',{connected:true}); b.c.ntMuseConnected=true;
  await settle(); assert.ok(b.c.ntSessionArchive.state().activeId);
});
test('malformed remote minute values cannot poison report rendering or averages',async()=>{
  const b=await setup(); b.setClock(2000000); const r=await b.c.ntSessionArchive.demo();
  assert.equal(b.c.ntSessionArchive.validRecord(r),true);
  r.minutes[0].fi=Infinity; assert.equal(b.c.ntSessionArchive.validRecord(r),false);
});
test('a rejected server transaction never marks the device record synced or exposes provider error details',async()=>{
  const b=await setup(); b.c.ntSession.set({uid:'one',code:'A',memberId:'one'}); await settle();
  b.c.ntSessionArchive.begin(); output(b,2000); await b.c.ntSessionArchive.finish();
  b.c.NT_FIREBASE={emulators:true,db:{runTransaction:async()=>{throw Error('private-provider-detail');}}};
  await b.c.ntSessionArchive.sync();
  const state=b.c.ntSessionArchive.state(); assert.equal(state.rows[0].synced,false);
  assert.match(state.cloudError,/Belum tersinkron/); assert.ok(!state.cloudError.includes('private-provider-detail'));
});
test('logout clears private records immediately and ignores a previous identity\'s delayed cloud acknowledgement',async()=>{
  const b=await setup(); b.c.ntSession.set({uid:'one',code:'A',memberId:'one'}); await settle();
  b.c.ntSessionArchive.begin(); output(b,2000); await b.c.ntSessionArchive.finish();
  let complete; const gate=new Promise(resolve=>{complete=resolve;});
  b.c.NT_FIREBASE={emulators:true,db:{runTransaction:()=>gate}};
  const syncing=b.c.ntSessionArchive.sync();
  b.c.ntSession.clear(); assert.equal(b.c.ntSessionArchive.state().rows.length,0);
  complete(null); await syncing; await settle();
  assert.equal(b.c.ntSessionArchive.state().rows.length,0); assert.equal(b.c.ntSessionArchive.state().syncing,false);
});

test('idle archive snapshots are shared until actual changes, while recording emits updated results without UI polling',async()=>{
  const b=await setup();
  const idle=b.c.ntSessionArchive.state(); assert.equal(b.c.ntSessionArchive.state(),idle);
  b.tick(); assert.equal(b.c.ntSessionArchive.state(),idle);
  let updates=0; b.c.addEventListener('nt-archive',()=>updates++);
  b.c.ntSessionArchive.begin(); output(b,2000);
  const before=b.c.ntSessionArchive.state(); assert.equal(before.summary,undefined);
  const count=before.rows[0].summary.clean, previousUpdates=updates;
  output(b,5000,{fi:60});
  const after=b.c.ntSessionArchive.state(); assert.notEqual(after,before);
  assert.equal(before.rows[0].summary.clean,count); assert.equal(after.rows[0].summary.clean,count+1);
  assert.ok(updates>previousUpdates,'new measurements must notify subscribed screens');
});

async function cloudSetup() {
  const b = browser(), listeners = [], writes = [];
  b.c.crypto = webcrypto; b.c.location = { hostname: 'localhost' };
  b.c.ntSession.set({ uid: 'one', code: 'A', memberId: 'one', role: 'pekerja' });
  b.c.ntMuseConnected = true; b.c.ntMuse = { status: () => ({ connected: b.c.ntMuseConnected, protocol: 'athena', connectedAt: 900 }) };
  b.c.CURRENT_WORKER = { shift: 'Pagi' };
  // Exercise acknowledged writes; the ordinary tests separately cover unavailable storage.
  b.c.indexedDB = { open() { const request = {}; setImmediate(() => {
    request.result = { transaction() { const tx = { objectStore: () => ({ put() {}, index: () => ({ getAll: () => ({ result: [] }) }) }) };
      setImmediate(() => tx.oncomplete?.()); return tx; } };
    request.onsuccess();
  }); return request; } };
  const collection = name => {
    const query = { name, filters: [], where(field, op, value) { this.filters.push([field, op, value]); return this; }, orderBy() { return this; }, limit() { return this; }, doc: id => ({ name, id }),
      onSnapshot(options, next, fail) { const listener = { name, filters: this.filters, next, fail, stopped: false }; listeners.push(listener); return () => { listener.stopped = true; }; } };
    return query;
  };
  b.c.firebase = { firestore: { FieldValue: { serverTimestamp: () => 'server-time' } } };
  b.c.NT_FIREBASE = { emulators: true, db: { collection: () => ({ doc: () => ({ collection }) }),
    runTransaction: async callback => callback({ get: async () => ({ exists: false }), set: (ref, record) => writes.push(JSON.parse(JSON.stringify(record))) }) } };
  b.load('session-insights.js'); b.load('report-export.js'); b.load('session-archive.js'); await settle(); await settle();
  return { b, listeners, writes };
}
test('cloud listeners are owner scoped, update reports automatically, and reject late callbacks after logout', async () => {
  const { b, listeners } = await cloudSetup();
  assert.equal(listeners.length, 2); assert.equal(b.c.ntSessionArchive.state().liveUpdates, true);
  for (const listener of listeners) assert.deepEqual(listener.filters, [['ownerUid', '==', 'one']]);
  const row = b.c.ntSessionArchive.begin(); await settle(); await settle();
  listeners[0].next({ docs: [{ data: () => ({ ...row, updatedAt: 1500 }) }], metadata: { fromCache: false } });
  assert.equal(b.c.ntSessionArchive.state().rows.length, 1);
  assert.ok(b.c.ntSessionArchive.state().lastSyncedAt);
  b.c.ntSession.clear(); await settle(); assert.ok(listeners.every(listener => listener.stopped));
  listeners[0].next({ docs: [{ data: () => row }] });
  assert.equal(b.c.ntSessionArchive.state().rows.length, 0);
});
test('a session completed during an upload is queued and its final status reaches the server', async () => {
  const { b, writes } = await cloudSetup();
  const original = b.c.NT_FIREBASE.db.runTransaction; let release;
  const gate = new Promise(resolve => { release = resolve; }); let first = true;
  b.c.NT_FIREBASE.db.runTransaction = async callback => { if (first) { first = false; await gate; } return original(callback); };
  b.c.ntSessionArchive.begin(); await settle();
  await b.c.ntSessionArchive.finish(); release();
  for (let i = 0; i < 10; i++) await settle();
  assert.deepEqual(writes.map(record => record.status), ['recording', 'completed']);
  assert.equal(b.c.ntSessionArchive.state().rows[0].synced, true);
});
test('periodic cloud updates include received samples even if no acceptable EEG result was produced', async () => {
  const { b, writes } = await cloudSetup();
  b.c.ntSessionArchive.begin(); for (let i = 0; i < 5; i++) await settle();
  b.emit('nt-muse-eeg', { channel: 'AF7', samples: [1, 2, 3] });
  b.setClock(62000); b.tick(); for (let i = 0; i < 5; i++) await settle();
  assert.equal(writes.length, 2); assert.equal(writes[1].receivedSamples, 3);
  assert.equal(writes[1].minutes.length, 0);
});
