const fs = require('fs');
const d = fs.readFileSync('admin.js', 'utf8');
const i = d.indexOf("fetch('/api/donations')");
console.log('api/donations at:', i);
if (i > 0) console.log(d.substring(i - 80, i + 150));
