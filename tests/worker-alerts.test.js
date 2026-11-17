const test=require('node:test'),assert=require('node:assert/strict');
const {browser}=require('./helpers');
function setup(role='pekerja') {
  const b=browser(),listeners=[],writes=[],documentListeners={};
  b.c.document={visibilityState:'visible',addEventListener(type,fn){documentListeners[type]=fn;}};
  b.c.ntSession.set({uid:'one',code:'A',role,members:[{id:'worker-id',uid:'worker-one',role:'pekerja',name:'Fixture',status:'active'}]});
  b.c.firebase={firestore:{FieldValue:{serverTimestamp:()=> 'server-time'}}};
  b.c.NT_FIREBASE={emulators:true,db:{collection:()=>({doc:()=>({collection:()=>{
    const q={filters:[],where(...args){this.filters.push(args);return this;},orderBy(){return this;},limit(){return this;},
      onSnapshot(options,next,fail){const listener={next,fail,filters:q.filters,stopped:false,options};listeners.push(listener);return()=>listener.stopped=true;},
      add:async data=>{writes.push(data);},doc:id=>({update:async data=>writes.push({id,...data})})};return q;
  }})})}};
  b.load('worker-alerts.js');return{b,listeners,writes,documentListeners};
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

test('a confirmed incoming worker alert vibrates once, never for cached or pending data or another recipient',()=>{
  const {b,listeners}=setup(),patterns=[];
  b.c.navigator.vibrate=pattern=>{patterns.push(Array.from(pattern));return true;};
  const snapshot=(metadata,changes={})=>({docs:[{id:'new-alert',data:()=>({...record,...changes})}],metadata});
  assert.equal(listeners[0].options.includeMetadataChanges,true);
  listeners[0].next(snapshot({fromCache:true,hasPendingWrites:false}));assert.equal(patterns.length,0);
  listeners[0].next(snapshot({fromCache:false,hasPendingWrites:true}));assert.equal(patterns.length,0);
  listeners[0].next(snapshot({fromCache:false,hasPendingWrites:false},{severity:'urgent'}));
  assert.deepEqual(patterns,[[250,100,250,100,400]]);
  listeners[0].next(snapshot({fromCache:false,hasPendingWrites:false}));assert.equal(patterns.length,1);
  b.c.ntWorkerAlerts.retry();listeners.at(-1).next(snapshot({fromCache:false,hasPendingWrites:false}));assert.equal(patterns.length,1,'reconnecting does not vibrate again for the same unread alert');
  listeners.at(-1).next({docs:[{id:'foreign',data:()=>({...record,recipientUid:'other'})}],metadata:{fromCache:false}});assert.equal(patterns.length,1);
});

test('alerts received while hidden wait for foreground, respect mute, and vibration failures never block the inbox',()=>{
  const {b,listeners,documentListeners}=setup(),patterns=[];
  b.c.navigator.vibrate=pattern=>{patterns.push(pattern);return false;};b.c.document.visibilityState='hidden';
  listeners[0].next({docs:[{id:'hidden',data:()=>record}],metadata:{fromCache:false,hasPendingWrites:false}});
  assert.equal(patterns.length,0);
  b.c.document.visibilityState='visible';documentListeners.visibilitychange();assert.equal(patterns.length,1);
  assert.equal(b.c.ntWorkerAlerts.state().haptics.result,'blocked');assert.equal(b.c.ntWorkerAlerts.state().rows.length,1);
  b.c.ntWorkerAlerts.setHaptics(false);
  listeners[0].next({docs:[{id:'muted',data:()=>record}],metadata:{fromCache:false}});assert.equal(patterns.length,1);
  b.c.ntWorkerAlerts.setHaptics(true);b.c.navigator.vibrate=()=>{throw Error('not supported');};
  listeners[0].next({docs:[{id:'unsupported',data:()=>record}],metadata:{fromCache:false}});
  assert.equal(b.c.ntWorkerAlerts.state().rows.length,1);assert.equal(b.c.ntWorkerAlerts.state().error,'');
});

test('offline sends are explicit and only active worker accounts are selectable as recipients',async()=>{
  const {b,writes}=setup('management');b.c.navigator.onLine=false;
  await assert.rejects(b.c.ntWorkerAlerts.send({memberId:'worker-id',title:'a',message:'b',severity:'info'}),/Hubungkan internet/);assert.equal(writes.length,0);
  b.c.navigator.onLine=true;
  const s=b.c.ntSession.get();s.members[0].status='invited';b.c.ntSession.set(s);
  await assert.rejects(b.c.ntWorkerAlerts.send({memberId:'worker-id',title:'a',message:'b',severity:'info'}),/Pilih pekerja/);
});

test('buzzer requires worker activation, sounds once for a confirmed foreground batch and respects mute and identity changes',async()=>{
  const {b,listeners,documentListeners}=setup(),notes=[],contexts=[];
  b.c.AudioContext=class {
    constructor(){this.state='suspended';this.currentTime=0;this.destination={};contexts.push(this);}
    async resume(){this.state='running';}async close(){this.state='closed';}
    createOscillator(){return {frequency:{},connect(){},disconnect(){},start:t=>notes.push(t),stop(){}};}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
  };
  const snapshot=(id,metadata={fromCache:false,hasPendingWrites:false})=>listeners.at(-1).next({docs:[{id,data:()=>({...record,severity:'urgent'})}],metadata});
  snapshot('silent');assert.equal(notes.length,0);
  assert.equal(await b.c.ntWorkerAlerts.setSound(true),true);assert.equal(b.c.ntWorkerAlerts.state().sound.ready,true);
  snapshot('cached',{fromCache:true});assert.equal(notes.length,0);
  snapshot('loud');assert.equal(notes.length,3);snapshot('loud');assert.equal(notes.length,3);
  b.c.document.visibilityState='hidden';snapshot('hidden');assert.equal(notes.length,3);
  b.c.document.visibilityState='visible';documentListeners.visibilitychange();assert.equal(notes.length,6);
  await b.c.ntWorkerAlerts.setSound(false);snapshot('muted');assert.equal(notes.length,6);
  await b.c.ntWorkerAlerts.testSound();assert.equal(notes.length,8);
  assert.equal(b.c.ntWorkerAlerts.state().sound.result,'requested');
  b.c.ntSession.clear();assert.equal(contexts[0].state,'closed');assert.equal(b.c.ntWorkerAlerts.state().sound.enabled,false);
});

test('blocked or unsupported audio never prevents receipt, and a late resume cannot sound for another account',async()=>{
  const {b,listeners}=setup();
  assert.equal(await b.c.ntWorkerAlerts.testSound(),false);assert.equal(b.c.ntWorkerAlerts.state().sound.result,'unsupported');
  let resume; b.c.AudioContext=class{constructor(){this.state='suspended';}resume(){return new Promise(r=>resume=r);}async close(){this.state='closed';}};
  const pending=b.c.ntWorkerAlerts.testSound();b.c.ntSession.clear();resume();assert.equal(await pending,false);
  const next=setup();next.b.c.AudioContext=class{async resume(){throw Error('autoplay');}};
  assert.equal(await next.b.c.ntWorkerAlerts.testSound(),false);
  next.listeners[0].next({docs:[{id:'still-visible',data:()=>record}],metadata:{fromCache:false}});
  assert.equal(next.b.c.ntWorkerAlerts.state().rows.length,1);assert.equal(next.b.c.ntWorkerAlerts.state().error,'');
});
