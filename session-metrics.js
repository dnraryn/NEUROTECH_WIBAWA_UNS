// Personal monitoring totals and self-reported sleep. No EEG samples or cloud writes.
(function () {
  "use strict";
  var owner = null, store = null, saveTimer = null, persisted = true;
  function dayKey() {
    var d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  }
  function identity() {
    var session = window.ntSession?.get?.();
    return session?.code && session?.memberId ? session.code + ":" + session.memberId : null;
  }
  function valid(value, min, max) { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max; }
  function load() {
    var next = identity();
    if (store && next === owner) return;
    if (store) flush();
    owner = next; persisted = true;
    store = { targetMinutes: 60, sleepTargetHours: 8, days: {} };
    if (owner) try {
      var saved = JSON.parse(localStorage.getItem("nt-session-metrics-v1:" + owner) || "null");
      if (saved) {
        if (valid(saved.targetMinutes, 1, 1440)) store.targetMinutes = saved.targetMinutes;
        if (valid(saved.sleepTargetHours, 1, 16)) store.sleepTargetHours = saved.sleepTargetHours;
        Object.keys(saved.days || {}).sort().slice(-14).forEach(function (date) {
          var row = saved.days[date];
          if (/^\d{4}-\d{2}-\d{2}$/.test(date) && row && valid(row.samples, 0, 4 * 256 * 86400)) {
            store.days[date] = { samples: row.samples, sleptHours: valid(row.sleptHours, 0, 24) ? row.sleptHours : null };
          }
        });
      }
    } catch (ignore) { persisted = false; }
  }
  function today() {
    var key = dayKey();
    if (!store.days[key]) store.days[key] = { samples: 0, sleptHours: null };
    Object.keys(store.days).sort().slice(0, -14).forEach(function (date) { delete store.days[date]; });
    return store.days[key];
  }
  function flush() {
    clearTimeout(saveTimer); saveTimer = null;
    if (owner && store) try { localStorage.setItem("nt-session-metrics-v1:" + owner, JSON.stringify(store)); persisted = true; }
    catch (ignore) { persisted = false; }
  }
  function get() {
    load(); var row = today(), minutes = row.samples / (4 * 256 * 60);
    return { date: dayKey(), targetMinutes: store.targetMinutes, sleepTargetHours: store.sleepTargetHours,
      sleptHours: row.sleptHours, receivedMinutes: minutes,
      compliance: Math.min(100, minutes / store.targetMinutes * 100),
      sleepDebt: row.sleptHours === null ? null : Math.max(0, store.sleepTargetHours - row.sleptHours),
      persisted: !!owner && persisted, personal: !!owner };
  }
  function update(input) {
    load();
    if (!valid(input.targetMinutes, 1, 1440)) throw new Error("Target pantau harus 1–1440 menit.");
    if (!valid(input.sleepTargetHours, 1, 16)) throw new Error("Target tidur harus 1–16 jam.");
    if (input.sleptHours !== null && !valid(input.sleptHours, 0, 24)) throw new Error("Durasi tidur harus 0–24 jam atau dikosongkan.");
    store.targetMinutes = input.targetMinutes; store.sleepTargetHours = input.sleepTargetHours;
    today().sleptHours = input.sleptHours;
    flush(); window.dispatchEvent(new CustomEvent("nt-metrics"));
    return get();
  }
  window.addEventListener("nt-muse-eeg", function (event) {
    var detail = event.detail;
    if (!window.ntMuseConnected || !detail || ["TP9", "AF7", "AF8", "TP10"].indexOf(detail.channel) < 0 ||
        !detail.samples || !Number.isInteger(detail.samples.length) || detail.samples.length < 1 || detail.samples.length > 4096) return;
    load(); var row = today();
    row.samples = Math.min(4 * 256 * 86400, row.samples + detail.samples.length);
    if (!saveTimer) saveTimer = setTimeout(function () { flush(); window.dispatchEvent(new CustomEvent("nt-metrics")); }, 2000);
  });
  window.addEventListener("nt-session", function () { load(); window.dispatchEvent(new CustomEvent("nt-metrics")); });
  window.addEventListener("pagehide", flush);
  window.ntSessionMetrics = { get: get, update: update };
})();
