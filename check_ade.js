const fs = require('fs');
const h = fs.readFileSync('admin.html', 'utf8');
const lmHeaders = (h.split('<th>Landmark</th>').length - 1);
const colspan18 = (h.split('colspan="18"').length - 1);
const hasGrouped = h.indexOf('_adeLmOrder') >= 0;
console.log('Landmark th count:', lmHeaders);
console.log('colspan 18 remaining:', colspan18);
console.log('Has grouped render:', hasGrouped);
