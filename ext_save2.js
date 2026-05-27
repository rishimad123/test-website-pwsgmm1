const fs = require('fs');
const j = fs.readFileSync('admin.js', 'utf8');
const start = j.indexOf('async function saveBrEditEntry');
const end = j.indexOf('function openAdminPbLightbox', start);
console.log(j.substring(start, end));
