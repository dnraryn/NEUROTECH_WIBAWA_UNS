// Company-scoped in-app messages. No background push or simulated delivery.
(function () {
  "use strict";
  var rows = [], error = "", ready = false, unsubscribe = null, generation = 0, key = "";
  var confirmed = false, notified = new Set(), vibrationResult = "";
  var hapticsPreferences = new Map();
  var soundPreferences = new Map(), audio = null, soundResult = "";
  function session() { return window.ntSession?.get?.(); }
  function emit() { window.dispatchEvent(new CustomEvent("nt-worker-alerts")); }
  function enabled() { return !!window.NT_FIREBASE?.emulators || ["neurotech-id.web.app", "neurotech-id.firebaseapp.com"].includes(window.location?.hostname); }
  function collection(s) { return window.NT_FIREBASE.db.collection("companies").doc(s.code).collection("workerAlerts"); }
  function hapticsEnabled() { var s = session(); if (!s) return false; if(hapticsPreferences.has(s.uid))return hapticsPreferences.get(s.uid);try { return localStorage.getItem("nt-alert-haptics:" + s.uid) !== "0"; } catch (_) { return true; } }
  function foreground() { return window.document?.visibilityState !== "hidden"; }
  function soundEnabled() { var s=session();if(!s)return false;if(soundPreferences.has(s.uid))return soundPreferences.get(s.uid);try{return localStorage.getItem("nt-alert-sound:"+s.uid)==="1";}catch(_){return false;} }
  function state() { return { rows: rows.slice(), ready: ready, error: error, enabled: enabled(), confirmed: confirmed, foreground: foreground(),
    haptics: { supported: typeof navigator.vibrate === "function", enabled: hapticsEnabled(), result: vibrationResult },
    sound: { supported: typeof (window.AudioContext || window.webkitAudioContext) === "function", enabled:soundEnabled(), ready:audio?.state==="running", result:soundResult } }; }
  function buzzer(urgent) {
    if(!soundEnabled())return false;
    if(!audio || audio.state!=="running"){soundResult="blocked";return false;}
    try {
      var t=audio.currentTime;
      (urgent?[0,0.32,0.64]:[0,0.32]).forEach(function(offset,i){
        var oscillator=audio.createOscillator(),gain=audio.createGain();
        oscillator.type="sine";oscillator.frequency.value=i%2?660:880;
        gain.gain.setValueAtTime(0,t+offset);gain.gain.linearRampToValueAtTime(0.16,t+offset+0.02);gain.gain.linearRampToValueAtTime(0,t+offset+0.23);
        oscillator.connect(gain);gain.connect(audio.destination);oscillator.onended=function(){oscillator.disconnect();gain.disconnect();};
        oscillator.start(t+offset);oscillator.stop(t+offset+0.25);
      });
      soundResult="requested";return true;
    } catch(_){soundResult="blocked";return false;}
  }
  async function setSound(value, test) {
    var s=session(),ticket=generation;if(s?.role!=="pekerja" || !foreground())return false;
    soundPreferences.set(s.uid,!!value);try{localStorage.setItem("nt-alert-sound:"+s.uid,value?"1":"0");}catch(_){}
    if(!value){soundResult="";emit();return false;}
    var Audio=window.AudioContext || window.webkitAudioContext;
    if(!Audio){soundResult="unsupported";emit();return false;}
    try{if(!audio || audio.state==="closed")audio=new Audio();await audio.resume();if(ticket!==generation)return false;soundResult=audio.state==="running"?"ready":"blocked";if(test)buzzer(false);}
    catch(_){if(ticket!==generation)return false;soundResult="blocked";}
    emit();return audio?.state==="running";
  }
  function vibrate(pattern) {
    if (typeof navigator.vibrate !== "function") { vibrationResult = "unsupported"; return false; }
    try { var accepted = navigator.vibrate(pattern); vibrationResult = accepted ? "requested" : "blocked"; return accepted; }
    catch (_) { vibrationResult = "blocked"; return false; }
  }
  function notifyForeground() {
    var s = session();
    if (s?.role !== "pekerja" || !confirmed || !foreground()) return;
    var fresh = rows.filter(function (r) {
      if (r.pending || r.acknowledgedAt || r.resolvedAt || r.recipientUid !== s.uid) return false;
      var id = s.uid + ":" + r.id;
      if (notified.has(id)) return false;
      try { if (sessionStorage.getItem("nt-alert-vibrated:" + id) === "1") return false; } catch (_) {}
      return true;
    });
    if (!fresh.length) return;
    fresh.forEach(function (r) { var id = s.uid + ":" + r.id; notified.add(id); try { sessionStorage.setItem("nt-alert-vibrated:" + id, "1"); } catch (_) {} });
    if (hapticsEnabled()) vibrate(fresh.some(function (r) { return r.severity === "urgent"; }) ? [250,100,250,100,400] : [200,100,200]);
    if(soundEnabled())buzzer(fresh.some(function(r){return r.severity==="urgent";}));
  }
  function timestamp(value) { return typeof value?.toMillis === "function" ? value.toMillis() : null; }
  function start(force) {
    var s = session(), next = s?.uid && s?.code ? [s.code,s.uid,s.role].join(":") : "";
    if (!force && next === key && (unsubscribe || ready)) return;
    if(next!==key){try{audio?.close()?.catch?.(function(){});}catch(_){}audio=null;soundResult="";}
    key = next; var token = ++generation;
    if (unsubscribe) unsubscribe(); unsubscribe = null;
    rows = []; error = ""; ready = false; confirmed = false; notified = new Set(); vibrationResult = ""; emit();
    if (!next || !enabled() || !window.NT_FIREBASE?.db) { ready = true; emit(); return; }
    var query = collection(s);
    if (s.role === "pekerja") query = query.where("recipientUid", "==", s.uid);
    query = query.orderBy("createdAt", "desc").limit(100);
    try { unsubscribe = query.onSnapshot({ includeMetadataChanges: true }, function (snapshot) {
      if (token !== generation) return;
      confirmed = snapshot.metadata?.fromCache === false && snapshot.metadata?.hasPendingWrites !== true;
      rows = snapshot.docs.map(function (doc) { var r = doc.data(); return {
        id: doc.id, recipientUid:r.recipientUid, memberId:r.memberId, senderUid:r.senderUid,
        title:r.title, message:r.message, severity:r.severity,
        createdAt:timestamp(r.createdAt), acknowledgedAt:timestamp(r.acknowledgedAt), resolvedAt:timestamp(r.resolvedAt),
        pending:doc.metadata ? doc.metadata.hasPendingWrites === true : snapshot.metadata?.hasPendingWrites === true,
      }; }).filter(function (r) { return r.recipientUid && (s.role !== "pekerja" || r.recipientUid === s.uid); });
      ready = true; error = ""; notifyForeground(); emit();
    }, function () { if (token !== generation) return; unsubscribe = null; confirmed = false; rows = []; error = "Pesan belum tersinkron. Periksa koneksi lalu coba lagi."; ready = true; emit(); });
    } catch (ignore) { ready = true; error = "Pesan belum dapat dimuat."; emit(); }
  }
  async function send(input) {
    var s = session();
    if (!s || !["supervisor", "management"].includes(s.role)) throw new Error("Hanya petugas perusahaan yang dapat mengirim alert.");
    if (!enabled() || !window.NT_FIREBASE?.db) throw new Error("Pengiriman tersedia pada aplikasi online atau emulator.");
    if (window.navigator.onLine === false) throw new Error("Alert belum dikirim. Hubungkan internet lalu coba lagi.");
    var member = s.members?.find(function (m) { return m.id === input.memberId && m.role === "pekerja" && m.uid && m.status === "active"; });
    if (!member) throw new Error("Pilih pekerja yang sudah mengaktifkan akun.");
    var title = typeof input.title === "string" ? input.title.trim() : "";
    var message = typeof input.message === "string" ? input.message.trim() : "";
    if (!title || title.length > 100 || !message || message.length > 1000 || !["info","attention","urgent"].includes(input.severity)) throw new Error("Lengkapi judul, pesan, dan prioritas alert.");
    try { var doc = await collection(s).add({schemaVersion:1,recipientUid:member.uid,memberId:member.id,senderUid:s.uid,
      title:title,message:message,severity:input.severity,createdAt:window.firebase.firestore.FieldValue.serverTimestamp(),
      acknowledgedAt:null,resolvedAt:null,resolvedBy:null}); return doc?.id || null; }
    catch (ignore) { throw new Error("Alert belum berhasil dikirim. Periksa koneksi dan akses akun."); }
  }
  async function update(id, resolve) {
    var s = session(), row = rows.find(function (r) { return r.id === id; });
    if (!s || !row || row.resolvedAt || !enabled()) throw new Error("Alert tidak tersedia untuk tindakan ini.");
    if (resolve ? !["supervisor","management"].includes(s.role) : row.recipientUid !== s.uid) throw new Error("Tindakan tidak diizinkan untuk akun ini.");
    var time = window.firebase.firestore.FieldValue.serverTimestamp();
    try { await collection(s).doc(id).update(resolve ? {resolvedAt:time,resolvedBy:s.uid} : {acknowledgedAt:time}); }
    catch (ignore) { throw new Error("Perubahan belum tersimpan. Periksa koneksi lalu coba lagi."); }
  }
  window.ntWorkerAlerts = { state:state, send:send, acknowledge:function(id){return update(id,false);}, resolve:function(id){return update(id,true);}, retry:function(){start(true);},
    setSound:function(value){return setSound(value,false);},testSound:function(){return setSound(true,true);},
    setHaptics:function(value){var s=session();if(s?.role!=="pekerja")return;hapticsPreferences.set(s.uid,!!value);try{localStorage.setItem("nt-alert-haptics:"+s.uid,value?"1":"0");}catch(_){}vibrationResult="";emit();},
    testHaptics:function(){if(session()?.role!=="pekerja" || !foreground())return false;var ok=vibrate([100,60,100]);emit();return ok;} };
  window.addEventListener("nt-session", function(){start(false);});
  window.addEventListener("nt-auth", function(){start(false);});
  window.addEventListener("online", function(){start(true);});
  window.document?.addEventListener("visibilitychange", function(){if(foreground()){if(!unsubscribe)start(true);else{notifyForeground();emit();}}});
  start(false);
})();
