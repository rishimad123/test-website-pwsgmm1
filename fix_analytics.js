const fs = require('fs');
let d = fs.readFileSync('admin.js', 'utf8');

// There are TWO separate uses of fetch('/api/donations'):
// 1. Around index 38928 — this is the contributions counter, legitimate use
// 2. The orphan from the old chart code (at index ~20163 in orphan block)
// 
// The orphan code runs from index 20163 (if (r._deleted)) to index 26693 (end of .catch)
// Let's just directly cut that range out

const orphanStart = d.indexOf('if (r._deleted) return;');
const catchMarker = 'Analytics load error:';
const catchPos    = d.indexOf(catchMarker, orphanStart);
const catchLineEnd = d.indexOf('\r\n', catchPos) + 2;

console.log('Removing chars', orphanStart - 20, 'to', catchLineEnd);
console.log('Block being removed (first 200 chars):');
console.log(JSON.stringify(d.substring(orphanStart - 20, orphanStart + 200)));

// Stitch: everything before orphan (up to 20 chars before which is the \r\n after });)
// then the proper .catch() closer for the new chart
// then everything after the old .catch line
const before = d.substring(0, orphanStart - 20); // cuts off "\r\n                    "
const after  = d.substring(catchLineEnd);

const newD = before + '\r\n        }).catch(e => console.error(\'Analytics load error:\', e));\r\n        \r\n' + after;

// Check the second api/donations (for contributions counter) is still there
const remaining = newD.indexOf("fetch('/api/donations')");
console.log('Remaining api/donations at:', remaining, '(should be >0 for the contributions counter)');

const countCatch = (newD.match(/Analytics load error/g)||[]).length;
console.log('Catch blocks:', countCatch, '(should be 1)');

if (countCatch === 1) {
    fs.writeFileSync('admin.js', newD, 'utf8');
    console.log('SUCCESS - admin.js fixed!');
} else {
    console.log('FAIL');
}
