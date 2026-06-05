const fs = require('fs');
const file = 'admin.html';
const c = fs.readFileSync(file, 'utf8');
const lines = c.split('\n');
const start = 4643; // 0-based
const end = 4647; // 0-based
lines.splice(start, end - start + 1);
fs.writeFileSync(file, lines.join('\n'));
console.log('Removed lines 4644 to 4648.');
