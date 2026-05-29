const fs = require('fs');
const lines = fs.readFileSync('admin.html', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('id="aneForm"'));
console.log(lines.slice(idx - 15, idx + 15).join('\n'));
