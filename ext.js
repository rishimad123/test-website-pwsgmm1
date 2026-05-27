const fs = require('fs');
const h = fs.readFileSync('admin.html', 'utf8');
const start = h.indexOf('id="balanceRecovery"');
console.log(h.substring(Math.max(0, start - 100), start + 3000));
