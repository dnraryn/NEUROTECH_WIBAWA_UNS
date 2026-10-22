const test=require('node:test'),assert=require('node:assert/strict');
const {browser}=require('./helpers');
function setup(role='pekerja') {
  const b=browser(),listeners=[],writes=[];
  b.c.ntSession.set({uid:'one',code:'A',role,members:[{id:'worker-id',uid:'worker-one',role:'pekerja',name:'Fixture'}]});
  b.c.firebase={firestore:{FieldValue:{serverTimestamp:()=> 'server-time'}}};
  b.c.NT_FIREBASE={emulators:true,db:{collection:()=>({doc:()=>({collection:()=>{
    const q={filters:[],where(...args){this.filters.push(args);return this;},orderBy(){return this;},limit(){return this;},
      onSnapshot(next,fail){const listener={next,fail,filters:q.filters,stopped:false};listeners.push(listener);return()=>listener.stopped=true;},
      add:async data=>{writes.push(data);},doc:id=>({update:async data=>writes.push({id,...data})})};return q;
  }})})}};
  b.load('worker-alerts.js');return{b,listeners,writes};
}
const record={recipientUid:'one',memberId:'worker-id',senderUid:'staff',title:'Arahan',message:'Pesan fixture',severity:'attention',createdAt:{toMillis:()=>1000},acknowledgedAt:null,resolvedAt:null};
test('worker alert subscriptions are recipient scoped and late snapshots cannot cross identity changes',()=>{
  const {b,listeners}=setup();assert.deepEqual(listeners[0].filters,[['recipientUid','==','one']]);
  listeners[0].next({docs:[{id:'id',data:()=>record}],metadata:{hasPendingWrites:false}});
  assert.equal(b.c.ntWorkerAlerts.state().rows.length,1);
  b.c.ntSession.clear();assert.equal(b.c.ntWorkerAlerts.state().rows.length,0);
  listeners[0].next({docs:[{id:'id',data:()=>record}]});assert.equal(b.c.ntWorkerAlerts.state().rows.length,0);
  assert.equal(listeners[0].stopped,true);
});
test('staff sending requires an active target, validates content and never reports a failed write as delivery',async()=>{
  const {b,writes}=setup('supervisor');
  await b.c.ntWorkerAlerts.send({memberId:'worker-id',title:'  Arahan ',message:' Periksa kondisi ',severity:'urgent'});
  assert.equal(writes[0].recipientUid,'worker-one');assert.equal(writes[0].title,'Arahan');assert.equal(writes[0].acknowledgedAt,null);
  assert.equal(b.c.ntWorkerAlerts.state().rows.length,0,'only snapshots publish saved messages');
  b.c.NT_FIREBASE.db.collection=()=>({doc:()=>({collection:()=>({add:async()=>{throw Error('private-provider-message');}})})});
  await assert.rejects(b.c.ntWorkerAlerts.send({memberId:'worker-id',title:'x',message:'x',severity:'info'}),error=>/belum berhasil/.test(error.message)&&!error.message.includes('private-provider'));
  await assert.rejects(b.c.ntWorkerAlerts.send({memberId:'foreign',title:'x',message:'x',severity:'info'}),/Pilih pekerja/);
  const worker=setup();await assert.rejects(worker.b.c.ntWorkerAlerts.send({}),/Hanya petugas/);
});
test('only the recipient acknowledges and only staff resolve; pending messages stay labelled unsynced',async()=>{
  const {b,listeners,writes}=setup();
  listeners[0].next({docs:[{id:'id',data:()=>record}],metadata:{hasPendingWrites:true}});
  assert.equal(b.c.ntWorkerAlerts.state().rows[0].pending,true);
  await b.c.ntWorkerAlerts.acknowledge('id');assert.equal(writes[0].acknowledgedAt,'server-time');
  await assert.rejects(b.c.ntWorkerAlerts.resolve('id'),/tidak diizinkan/);
});
