const fs = require('fs');
const h = fs.readFileSync('admin.html', 'utf8');
const start = h.indexOf('<div id="balanceRecovery"');
const end = h.indexOf('<!-- Donation Data Entry Section -->');
fs.writeFileSync('temp3_br.html', h.substring(start, end));
console.log('Saved temp3_br.html');
