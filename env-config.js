/**
 * env-config.js
 * Global API Interceptor — Firebase Backend
 *
 * All /api/ calls are served by Firebase Functions via Firebase Hosting rewrites.
 * Relative URLs (/api/...) work natively on Firebase Hosting — no proxy needed.
 *
 * Migration completed: 2026-06-26
 * Backend: Firebase Functions (Cloud Firestore) — project patelwadichasukhakarta1
 */
(function() {
    // Provide the fixUrl helper (used in some inline HTML templates)
    window.fixUrl = function(url) { return url || ''; };
})();
