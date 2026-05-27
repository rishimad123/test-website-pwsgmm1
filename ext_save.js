const fs = require('fs');
const j = fs.readFileSync('admin.js', 'utf8');
const start = j.indexOf('async function saveBrEditEntry');
console.log(j.substring(start, start + 3000));
