const fs = require('fs');
const d = fs.readFileSync('dashboard.html','utf8');
console.log('vdeTable HTML:', d.includes('vdeTable'));
console.log('vdeTbody:', d.includes('vdeTbody'));
console.log('vdeCardGrid:', d.includes('vdeCardGrid'));
