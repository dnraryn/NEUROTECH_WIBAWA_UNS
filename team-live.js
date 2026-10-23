// Latest worker readings only. Clean report aggregates remain in session-archive.
(function () {
  "use strict";
  var rows=[], traces={}, unsubscribe=null, key="", generation=0, confirmed=false, ready=false;
  var error="", sending=false, sent=false, lastAttempt=-Infinity, lastSentAt=null, lastStatus="", queued=false;
  var blockedConnection=null;
  var INTERVAL=10000, STALE=30000;
  function session(){return window.ntSession?.get?.() || null;}
  function enabled(){return !!window.NT_FIREBASE?.emulators || ["neurotech-id.web.app","neurotech-id.firebaseapp.com"].includes(window.location?.hostname);}
  function emit(){window.dispatchEvent(new CustomEvent("nt-team-live"));}
  function collection(s){return window.NT_FIREBASE.db.collection("companies").doc(s.code).collection("liveReadings");}
  function index(v){return typeof v==="number" && Number.isFinite(v) && v>=0 && v<=100 ? v : null;}
  function message(e){return e?.code==="permission-denied" ? "Akses Live ditolak. Masuk kembali dengan akun perusahaan yang benar."
    : "Live belum tersinkron. Periksa internet dan coba lagi.";}
  function payload(s){
    var device=window.ntMuse?.status?.() || {}, dsp=window.ntMuseDSP || {}, now=Date.now();
    var connected=!!window.ntMuseConnected && !!device.connected && !window.NT_DEMO_DEVICE;
    var archive=window.ntSessionArchive?.state?.();
    var stopped=connected && archive?.ready && !archive.activeId;
    var live=window.ntManagement.snapshot({now:now,device:device,dsp:dsp,history:[]});
    var remaining=connected && Number.isFinite(dsp.calibration?.startedAt) ? Math.max(0,Math.min(60,Math.ceil((dsp.calibration.startedAt+60000-now)/1000))) : 0;
    var status=!connected ? "disconnected" : stopped ? "stopped" : remaining ? "preparing" : live.valid ? "live" : "waiting";
    var value=status==="live" ? live.latest : null;
    return {schemaVersion:1,companyCode:s.code,ownerUid:s.uid,memberId:s.memberId,source:"muse",status:status,
      receivedSamples:Math.min(4*256*3600*13,Math.max(0,Math.floor(device.samples || 0))),preparationRemaining:remaining,
      measurement:value ? {fi:index(value.fi),cli:index(value.cli),ei:index(value.ei),measuredAt:value.ts,
        quality:value.qualityLevel==="good" ? "good" : "limited",scope:value.outputScope,
        provisional:!dsp.baseline || value.classificationProvisional===true,
        classification:index(value.fi)===null ? "unavailable" : ["normal","waspada","berisiko","kritis"].includes(value.instantStatus || value.status) ? value.instantStatus || value.status : "unavailable"} : null,
      updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()};
  }
  async function publish(force){
    var s=session();
    if(!enabled() || !s?.uid || s.role!=="pekerja" || !window.NT_FIREBASE?.db || !window.ntManagement || window.navigator.onLine===false)return;
    var radio=window.ntMuse?.status?.() || {};
    if(blockedConnection && radio.connected && blockedConnection.at===radio.connectedAt)return;
    if(!radio.connected || (blockedConnection && blockedConnection.at!==radio.connectedAt))blockedConnection=null;
    var connected=!!window.ntMuseConnected && !!window.ntMuse?.status?.().connected && !window.NT_DEMO_DEVICE;
    if(sending){if(force)queued=true;return;}
    if(!connected && !sent)return;
    if(!force && Date.now()-lastAttempt<INTERVAL)return;
    var data=payload(s);
    if(!force && ["disconnected","stopped"].includes(data.status) && data.status===lastStatus && !error)return;
    var ticket=generation;
    lastAttempt=Date.now();sending=true;error="";emit();
    try{
      await collection(s).doc(s.uid).set(data);
      if(ticket!==generation)return;
      sent=true;lastStatus=data.status;lastSentAt=Date.now();error="";
    }catch(e){if(ticket===generation)error=message(e);}
    finally{if(ticket===generation){sending=false;emit();if(queued){queued=false;publish(true);}}}
  }
  function accept(snapshot,s,ticket){
    if(ticket!==generation)return;
    var docs=Array.isArray(snapshot.docs) ? snapshot.docs : snapshot.exists ? [snapshot] : [];
    confirmed=snapshot.metadata?.fromCache===false && snapshot.metadata?.hasPendingWrites!==true;
    rows=docs.map(function(doc){var d=doc.data();return Object.assign({},d,{updatedAt:d.updatedAt?.toMillis?.() || null});})
      .filter(function(r){return r.schemaVersion===1 && r.companyCode===s.code && r.source==="muse" && (s.role!=="pekerja" || r.ownerUid===s.uid);});
    if(confirmed)rows.forEach(function(r){
      if(r.status!=="live" || !r.measurement || index(r.measurement.fi)===null || !r.updatedAt || Math.abs(Date.now()-r.updatedAt)>STALE
        || !Number.isFinite(r.measurement.measuredAt) || Date.now()-r.measurement.measuredAt < -5000 || Date.now()-r.measurement.measuredAt>=STALE)return;
      var points=traces[r.ownerUid] || [], last=points[points.length-1];
      if(!last || last.measuredAt!==r.measurement.measuredAt)points.push({ts:r.updatedAt,measuredAt:r.measurement.measuredAt,fi:r.measurement.fi,provisional:r.measurement.provisional});
      traces[r.ownerUid]=points.filter(function(p){return p.ts>=Date.now()-300000;}).slice(-31);
    });
    ready=true;if(!sending && s.role!=="pekerja")error="";emit();
  }
  function start(force){
    var s=session(),next=s?.uid && s?.code ? [s.code,s.uid,s.role].join(":") : "";
    if(!force && next===key && (unsubscribe || ready))return;
    var device=window.ntMuse?.status?.() || {};
    if(key && next!==key && device.connected)blockedConnection={at:device.connectedAt};
    key=next;var ticket=++generation;
    if(unsubscribe)unsubscribe();unsubscribe=null;
    rows=[];traces={};confirmed=false;ready=false;error="";sending=false;sent=false;lastAttempt=-Infinity;lastSentAt=null;lastStatus="";queued=false;emit();
    if(!next || !enabled() || !window.NT_FIREBASE?.db){ready=true;emit();return;}
    var query=s.role==="pekerja" ? collection(s).doc(s.uid) : collection(s).orderBy("updatedAt","desc").limit(150);
    try{unsubscribe=query.onSnapshot({includeMetadataChanges:true},function(snapshot){accept(snapshot,s,ticket);},function(e){
      if(ticket!==generation)return;unsubscribe=null;confirmed=false;ready=true;error=message(e);emit();
    });}catch(e){ready=true;error=message(e);emit();}
    publish(false);
  }
  function state(){return {rows:rows.slice(),ready:ready,confirmed:confirmed,online:window.navigator.onLine!==false,
    enabled:enabled(),sending:sending,error:error,lastSentAt:lastSentAt,intervalMs:INTERVAL,staleMs:STALE};}
  function view(member,now){
    now=now ?? Date.now();var s=session();
    var row=rows.find(function(r){return r.companyCode===s?.code && r.ownerUid===member.uid && r.memberId===member.id;});
    var age=row?.updatedAt ? now-row.updatedAt : Infinity;
    var fresh=!!row && confirmed && window.navigator.onLine!==false && age>=-5000 && age<STALE;
    var measuredAge=row?.measurement ? now-row.measurement.measuredAt : Infinity;
    var live=fresh && row.status==="live" && Number.isFinite(measuredAge) && measuredAge>=-5000 && measuredAge<STALE;
    var labels={live:"Live",preparing:"Persiapan",waiting:"Menunggu sinyal",disconnected:"Muse terputus",stopped:"Sesi selesai"};
    return {row:row || null,fresh:fresh,live:live,measurement:live ? row.measurement : null,
      label:!row ? "Belum ada sesi Live" : !confirmed || window.navigator.onLine===false ? "Koneksi diperiksa" : !fresh ? "Pembaruan terhenti" : row.status==="live" && !live ? "Menunggu hasil baru" : labels[row.status] || "Menunggu",
      ageSeconds:Number.isFinite(age) ? Math.max(0,Math.floor(age/1000)) : null,
      trace:live ? (traces[member.uid] || []).filter(function(p){return p.ts>=now-300000;}) : []};
  }
  window.ntTeamLive={state:state,view:view,retry:function(){start(true);},publish:publish};
  window.addEventListener("nt-session",function(){start(false);});
  window.addEventListener("nt-auth",function(){start(false);});
  window.addEventListener("nt-data",function(){publish(false);});
  window.addEventListener("nt-muse",function(event){if(event.detail?.connected)blockedConnection=null;Promise.resolve().then(function(){publish(true);});});
  window.addEventListener("online",function(){start(true);});
  window.addEventListener("offline",function(){confirmed=false;emit();});
  window.document?.addEventListener("visibilitychange",function(){if(window.document.visibilityState==="visible"){if(!unsubscribe)start(true);else publish(true);}});
  setInterval(function(){if(key && enabled()){if(!unsubscribe && !sending && Date.now()-lastAttempt>=30000)start(true);else publish(false);emit();}},10000);
  start(false);
})();
