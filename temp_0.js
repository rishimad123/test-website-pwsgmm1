/* Portable API base: strip hardcoded localhost:3000 → relative URL on any host */
(function() {
  var _f = window.fetch.bind(window);
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.startsWith('http://localhost:3000'))
      url = url.slice('http://localhost:3000'.length);
    return _f(url, opts);
  };
})();
/* Fix any absolute photo URL so it works on mobile (LAN IP, not localhost) */
window.fixUrl = function(url) {
  if (!url) return '';
  if (url.startsWith('http://localhost:3000')) return url.slice('http://localhost:3000'.length);
  return url;
};