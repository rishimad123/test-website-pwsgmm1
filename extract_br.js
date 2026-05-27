const fs = require('fs');
const h = fs.readFileSync('admin.html', 'utf8');
const start = h.indexOf('<div id="balanceRecovery"');
fs.writeFileSync('temp2_br.html', h.substring(start, start + 3000));
