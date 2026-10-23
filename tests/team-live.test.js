const test=require('node:test');
const assert=require('node:assert/strict');
const {browser}=require('./helpers');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup(role='pekerja',host='neurotech-id.web.app'){
 const b=browser(),c=b.c,writes=[],listeners=[];c.location={hostname:host};
 c.ntSession.set({uid:role==='pekerja'?'worker':'staff',code:'A',memberId:role==='pekerja'?'member':'staff',role});
 c.ntMuseConnected=role==='pekerja';
 c.ntMuse={status:()=>({connected:c.ntMuseConnected,samples:1200,lastEEGAt:c.Date.now(),connectedAt:1000})};
 c.ntMuseDSP={baselineTarget:40,baseline:null,calibration:{startedAt:1000},signalState:'limited'};
 c.ntSessionArchive={state:()=>({ready:true,activeId:'session'})};
 c.firebase={firestore:{FieldValue:{serverTimestamp:()=>({server:true})}}};
 let setter=async data=>{writes.push(data);};
 const ref=path=>({collection:name=>ref(path+'/'+name),doc:id=>ref(path+'/'+id),orderBy:()=>ref(path),limit:()=>ref(path),
   set:data=>setter(data),onSnapshot(options,accept,failure){const listener={path,accept,failure,stopped:false};listeners.push(listener);return()=>{listener.stopped=true;};}});
 c.NT_FIREBASE={db:{collection:name=>ref(name)}};b.load('management-data.js');b.load('team-live.js');
 return {b,c,writes,listeners,setter:fn=>{setter=fn;}};
}
function measured(c,ts,changes={}){
 c.ntMuseDSP.last={ts,fi:80,cli:60,ei:20,outputScope:'full',qualityLevel:'good',classificationProvisional:true,status:'kritis',instantStatus:'kritis',...changes};
}
function row(ts,changes={}){return {schemaVersion:1,ownerUid:'worker',memberId:'member',companyCode:'A',source:'muse',status:'live',
 receivedSamples:1200,preparationRemaining:0,measurement:{fi:0,cli:20,ei:60,quality:'limited',provisional:true,scope:'full',classification:'normal',measuredAt:ts},updatedAt:{toMillis:()=>ts},...changes};}
function snapshot(listener,data,cache=false){listener.accept({docs:data.map(d=>({data:()=>d})),metadata:{fromCache:cache,hasPendingWrites:false}});}

test('worker publishes preparation then exactly the provisional phone results after one minute without a complete baseline',async()=>{
 const {b,c,writes}=setup();await settle();assert.equal(writes[0].status,'preparing');assert.equal(writes[0].measurement,null);
 b.setClock(65000);measured(c,65000);await c.ntTeamLive.publish(true);
 const sent=writes.at(-1);assert.equal(sent.status,'live');assert.equal(sent.measurement.fi,80);assert.equal(sent.measurement.provisional,true);
 assert.equal(c.ntMuseDSP.baseline,null);assert.equal(sent.measurement.cli,60);assert.equal(JSON.stringify(sent).includes('hrv'),false);
 assert.deepEqual(Object.keys(sent).sort(),['schemaVersion','ownerUid','memberId','companyCode','source','status','receivedSamples','preparationRemaining','measurement','updatedAt'].sort());
 assert.equal(c.ntTeamLive.state().lastSentAt,65000);
 await c.ntTeamLive.publish(false);assert.equal(writes.length,2,'results do not trigger a write on every EEG window');
 b.setClock(75000);measured(c,75000,{fi:70,cli:null,outputScope:'frontal-only',qualityLevel:'limited'});await c.ntTeamLive.publish(false);
 assert.equal(writes.at(-1).measurement.cli,null);assert.equal(writes.at(-1).measurement.fi,70);
 b.setClock(85000);await c.ntTeamLive.publish(false);assert.equal(writes.at(-1).status,'waiting');assert.equal(writes.at(-1).measurement,null);
 c.ntMuseConnected=false;await c.ntTeamLive.publish(true);assert.equal(writes.at(-1).status,'disconnected');assert.equal(writes.at(-1).measurement,null);
});

test('staff shows confirmed fresh values including zero, excludes other identities and hides stale or cache-only results',()=>{
 const {b,c,listeners}=setup('supervisor'),member={uid:'worker',id:'member'};
 snapshot(listeners[0],[row(1000)],true);assert.equal(c.ntTeamLive.view(member).measurement,null);
 snapshot(listeners[0],[row(1000)]);assert.equal(c.ntTeamLive.view(member).measurement.fi,0);assert.equal(c.ntTeamLive.view(member).trace.length,1);
 assert.equal(c.ntTeamLive.view({uid:'other',id:'member'}).measurement,null);
 b.setClock(31000);assert.equal(c.ntTeamLive.view(member).measurement,null);assert.equal(c.ntTeamLive.view(member).label,'Pembaruan terhenti');
 b.setClock(32000);snapshot(listeners[0],[row(32000)]);assert.equal(c.ntTeamLive.view(member).live,true);
 snapshot(listeners[0],[row(1000,{updatedAt:{toMillis:()=>32000}})]);assert.equal(c.ntTeamLive.view(member).measurement,null,'an offline queued measurement must not become fresh just because the server acknowledges it later');
 assert.equal(c.ntTeamLive.view(member).label,'Menunggu hasil baru');
 c.navigator.onLine=false;b.emit('offline');assert.equal(c.ntTeamLive.view(member).measurement,null);
 const old=listeners[0];c.ntSession.set({uid:'foreign-staff',code:'B',memberId:'staff',role:'management'});
 snapshot(old,[row(32000)]);assert.equal(c.ntTeamLive.state().rows.length,0);
});

test('a failed write never reports delivery, late acknowledgements cannot leak across accounts, and previews never publish',async()=>{
 const {b,c,writes,listeners,setter}=setup();await settle();b.setClock(65000);measured(c,65000);
 setter(async()=>{throw {code:'permission-denied'};});await c.ntTeamLive.publish(true);
 assert.match(c.ntTeamLive.state().error,/Akses Live/);assert.equal(c.ntTeamLive.state().lastSentAt,1000);
 snapshot(listeners[0],[]);assert.match(c.ntTeamLive.state().error,/Akses Live/);
 let resolve;setter(()=>new Promise(r=>{resolve=r;}));const sending=c.ntTeamLive.publish(true);
 c.ntSession.set({uid:'next',memberId:'next',code:'B',role:'supervisor'});resolve();await sending;
 assert.equal(c.ntTeamLive.state().lastSentAt,null);assert.equal(c.ntTeamLive.state().sending,false);
 const preview=setup('pekerja','localhost');await settle();assert.equal(preview.writes.length,0);assert.equal(preview.c.ntTeamLive.state().enabled,false);
 assert.ok(writes.length>0);
});

test('a disconnect during the first in-flight upload queues a final disconnected status',async()=>{
 const {b,c,writes,setter}=setup('supervisor');c.ntSession.set({uid:'worker',memberId:'member',code:'A',role:'pekerja'});
 await settle();c.ntMuseConnected=true;let resolve;setter(data=>{writes.push(data);return new Promise(r=>{resolve=r;});});
 const sending=c.ntTeamLive.publish(true);c.ntMuseConnected=false;await c.ntTeamLive.publish(true);
 setter(async data=>{writes.push(data);});resolve();await sending;await settle();
 assert.equal(writes.at(-1).status,'disconnected');
});

test('switching workers cannot publish the previous worker EEG under the new account',async()=>{
 const {b,c,writes}=setup();await settle();
 const before=writes.length;c.ntSession.set({uid:'new-worker',memberId:'new-member',code:'B',role:'pekerja'});
 await c.ntTeamLive.publish(true);assert.equal(writes.length,before);
 c.ntMuseConnected=false;b.emit('nt-muse',{connected:false});await settle();
 c.ntMuseConnected=true;b.emit('nt-muse',{connected:true});await settle();
 assert.equal(writes.at(-1).ownerUid,'new-worker');assert.equal(writes.at(-1).measurement,null);
});
