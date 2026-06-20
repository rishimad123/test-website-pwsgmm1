const fs = require('fs');
const raw = fs.readFileSync('admin.html');

// Read as latin1 to see raw byte values
const latin = raw.toString('latin1');
const start = latin.indexOf('ade_rcg_f_receiptTopLeft');
const chunk = latin.slice(start, start + 800);
console.log('RAW LATIN1:');
console.log(JSON.stringify(chunk));

// Also read as utf8
const utf8 = raw.toString('utf8');
const start2 = utf8.indexOf('ade_rcg_f_receiptTopLeft');
const chunk2 = utf8.slice(start2, start2 + 800);
console.log('\nRAW UTF8:');
console.log(JSON.stringify(chunk2));
