const fs = require('fs');
let d = fs.readFileSync('dashboard.html', 'utf8');

// Remove the block that filters to only this volunteer's entries
const OLD = `            // Filter to only this volunteer's entries
            if (uid && (typeof currentUser !== 'undefined') && currentUser.role !== 'admin') {
                entries = entries.filter(e =>
                    String(e.submittedByUserId) === String(uid) ||
                    String(e.userId) === String(uid)
                );
            }`;

if (!d.includes(OLD)) {
    console.error('❌ Filter block not found');
    process.exit(1);
}

d = d.replace(OLD, '            // Show all entries (same as admin view)');
fs.writeFileSync('dashboard.html', d, 'utf8');
console.log('✅ Removed volunteer-only filter — all entries now visible');
