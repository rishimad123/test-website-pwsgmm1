const cp = require('child_process');
const out = cp.execSync('git log -p -n 3 dashboard.html').toString();
const lines = out.split('\n');
let capture = false;
let capturedLines = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("document.getElementById('donationEntryForm')?.addEventListener('submit'")) {
        capture = true;
    }
    if (capture) {
        capturedLines.push(lines[i]);
        if (lines[i].includes('// ── Filter donor search data')) {
            break;
        }
    }
}
console.log(capturedLines.slice(0, 200).join('\n'));
