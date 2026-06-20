const fs = require('fs');
const lines = fs.readFileSync('admin.js', 'utf8').split('\n');

// Lines 3640-3803 (0-indexed: 3639-3802) are the leftover old duplicate function body
// We keep lines 0..3638 and 3803..end
const before = lines.slice(0, 3639); // up to and including line 3639 (the blank line after the new function's closing })
const after = lines.slice(3803);    // from line 3804 onwards (Gallery Management section)

const newContent = [...before, ...after].join('\n');
fs.writeFileSync('admin.js', newContent, 'utf8');
console.log('Removed duplicate lines 3640-3803. New line count:', newContent.split('\n').length);
