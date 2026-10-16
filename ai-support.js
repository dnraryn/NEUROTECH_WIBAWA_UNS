(function () {
  "use strict";
  function ready() { return typeof window.ntGemini === "function"; }
  function wait() {
    if (ready()) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { cleanup(); reject(new Error("Modul AI belum dimuat.")); }, 10000);
      function cleanup() { clearTimeout(timer); window.removeEventListener("nt-gemini-ready", loaded); }
      function loaded() { cleanup(); resolve(); }
      window.addEventListener("nt-gemini-ready", loaded);
    });
  }
  function errorMessage(error) {
    var text = String(error?.code || "") + " " + String(error?.message || "");
    if (/app.?check|deactivated|403|permission.denied/i.test(text)) return "Verifikasi keamanan AI belum berhasil. Muat ulang website, izinkan pemeriksaan keamanan browser, lalu coba lagi.";
    if (/429|quota|resource.exhausted/i.test(text)) return "Batas penggunaan AI sedang tercapai. Coba kembali beberapa saat lagi.";
    if (/emulator/i.test(text)) return "Chat AI cloud dinonaktifkan pada emulator lokal. Gunakan website untuk mencoba AI.";
    if (/timeout|batas waktu|network|fetch|offline/i.test(text)) return "Koneksi ke AI belum berhasil. Periksa internet lalu coba lagi.";
    if (/modul|dimuat|aktif/i.test(text)) return "Modul AI belum siap. Muat ulang halaman dan coba kembali.";
    if (/404|model.*not.found/i.test(text)) return "Model AI belum tersedia. Coba kembali setelah konfigurasi layanan diperiksa.";
    return "AI belum dapat menghasilkan jawaban. Coba pertanyaan yang lebih singkat.";
  }
  window.ntAI = { ready: ready, wait: wait, errorMessage: errorMessage };
})();
