const fs = require('fs');
const lines = fs.readFileSync('admin.js', 'utf8').split('\n');

// Lines 3709..3857 are the duplicate old styleWorksheet + old build code (0-indexed: 3708..3856)
// Keep lines 0..3706 (up to blank line before duplicate) and 3857..end
const before = lines.slice(0, 3707);
const after = lines.slice(3857);

const newContent = [...before, ...after].join('\n');
fs.writeFileSync('admin.js', newContent, 'utf8');
console.log('Removed duplicate. New line count:', newContent.split('\n').length);
