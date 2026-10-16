// Foreground monitoring helpers. A screen lock never promises background BLE.
(function () {
  "use strict";
  var wanted = false, lock = null, pending = false, generation = 0, message = "";
  var doc = window.document;
  function connected() { return !!window.ntMuseConnected && !!window.ntMuse?.status?.().connected; }
  function visible() { return !doc || doc.visibilityState !== "hidden"; }
  function state() {
    return { bluetooth: !!window.ntMuse?.supported?.(), secure: window.isSecureContext === true,
      online: window.navigator.onLine !== false, connected: connected(), visible: visible(),
      wakeSupported: typeof window.navigator.wakeLock?.request === "function", keepAwake: wanted,
      awake: !!lock && !lock.released, pending: pending, message: message };
  }
  function emit() { window.dispatchEvent(new CustomEvent("nt-mobile-monitor")); }
  function release() {
    generation++; pending = false;
    var previous = lock; lock = null;
    if (previous) Promise.resolve(previous.release()).catch(function () {});
    emit();
  }
  async function acquire() {
    if (!wanted || !connected() || !visible() || lock || pending || !state().wakeSupported) return;
    var ticket = ++generation;
    pending = true; message = ""; emit();
    try {
      var result = await window.navigator.wakeLock.request("screen");
      if (ticket !== generation || !wanted || !connected() || !visible()) { await result.release(); return; }
      lock = result;
      result.addEventListener("release", function () {
        if (lock === result) { lock = null; emit(); }
      });
    } catch (ignore) {
      if (ticket === generation) message = "Layar belum dapat dijaga menyala. Periksa mode hemat baterai dan tetap buka halaman ini.";
    } finally { if (ticket === generation) { pending = false; emit(); } }
  }
  window.ntMobileMonitor = { state: state, setKeepAwake: function (enabled) {
    wanted = enabled === true; message = "";
    if (!wanted) release(); else { emit(); return acquire(); }
  } };
  window.addEventListener("nt-device", function () { if (connected()) acquire(); else release(); emit(); });
  window.addEventListener("nt-session", function () { wanted = false; message = ""; release(); });
  window.addEventListener("online", emit);
  window.addEventListener("offline", emit);
  window.addEventListener("pagehide", release);
  window.addEventListener("pageshow", function () { acquire(); emit(); });
  doc?.addEventListener("visibilitychange", function () { if (visible()) acquire(); else release(); emit(); });
})();
