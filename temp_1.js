/* Canvas image compressor — used by all admin photo upload handlers */
window._compressImage = function(file, targetKB, callback) {
  var MAX_BYTES = (targetKB || 950) * 1024;
  var img = new Image();
  var blobUrl = URL.createObjectURL(file);
  img.onload = function() {
    URL.revokeObjectURL(blobUrl);
    var w = img.naturalWidth, h = img.naturalHeight;
    if (w > 1920) { h = Math.round(h * 1920 / w); w = 1920; }
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    if (file.size <= MAX_BYTES) {
      canvas.toBlob(function(b) { callback(b); }, 'image/jpeg', 0.9);
      return;
    }
    var lo = 0.1, hi = 0.92, q = 0.82;
    function tryQ(quality) {
      canvas.toBlob(function(b) {
        if (b.size <= MAX_BYTES || (hi - lo) < 0.03) { callback(b); }
        else { hi = quality; q = (lo + hi) / 2; tryQ(q); }
      }, 'image/jpeg', quality);
    }
    tryQ(q);
  };
  img.onerror = function() { callback(null); };
  img.src = blobUrl;
};
window._fmtBytesA = function(b) {
  return b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(2) + ' MB';
};