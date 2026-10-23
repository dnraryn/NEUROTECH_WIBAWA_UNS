(function () {
  "use strict";
  var promptEvent = null, registration = null, refreshing = false, ready = false;
  var media = window.matchMedia?.("(display-mode: standalone)");
  var installed = !!media?.matches || window.navigator.standalone === true;
  function emit() { window.dispatchEvent(new CustomEvent("nt-pwa")); }
  function busySession() {
    return !!window.ntDeviceStatus?.().connected || !!window.ntSessionArchive?.state?.().activeId;
  }
  window.ntPWA = {
    state: function () {
      return { installed: installed, standalone: !!media?.matches || window.navigator.standalone === true, canInstall: !!promptEvent && !installed, ready: ready,
        updateAvailable: !!registration?.waiting, canUpdate: !busySession() };
    },
    install: async function () {
      var current = promptEvent;
      if (!current || installed) return "manual";
      promptEvent = null; emit();
      try {
        await current.prompt();
        var choice = await current.userChoice;
        return choice.outcome;
      } catch (_) { return "manual"; }
      finally { emit(); }
    },
    update: function () {
      if (!registration?.waiting) return false;
      if (busySession()) throw new Error("Akhiri sesi dan putuskan Muse sebelum memperbarui aplikasi.");
      refreshing = true;
      registration.waiting.postMessage({ type: "NT_APPLY_UPDATE" });
      return true;
    },
  };
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault(); promptEvent = event; emit();
  });
  window.addEventListener("appinstalled", function () { installed = true; promptEvent = null; emit(); });
  media?.addEventListener?.("change", function (event) { installed = event.matches || window.navigator.standalone === true; emit(); });
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (refreshing) { refreshing = false; window.location.reload(); }
    });
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/service-worker.js", { scope: "/", updateViaCache: "none" }).then(function (reg) {
        registration = reg; ready = !!reg.active; emit();
        reg.addEventListener("updatefound", function () {
          var worker = reg.installing;
          worker?.addEventListener("statechange", function () {
            ready = !!reg.active;
            if (worker.state === "installed" || worker.state === "activated") emit();
          });
        });
      }).catch(function () { /* Normal website access still works if installation is unavailable. */ });
    }, { once: true });
  }
})();
