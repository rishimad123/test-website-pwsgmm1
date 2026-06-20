const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const lines = content.split('\n');

// Show exact char codes for key lines
const checkLines = [3669, 3670, 3671, 3675, 3686, 3692, 3699, 3706, 3718, 3723, 3725, 3728, 3733];
checkLines.forEach(idx => {
    const l = lines[idx];
    if (!l) return;
    // Find text between > and <
    const m = l.match(/>([^<]+)</);
    if (m && m[1].trim()) {
        const txt = m[1].trim();
        console.log('Line', idx+1, ': chars =', [...txt].map(c => c.codePointAt(0).toString(16)).join(' '));
        console.log('       text =', JSON.stringify(txt));
        console.log();
    }
});
