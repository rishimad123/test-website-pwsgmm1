const fs = require('fs');
let c = fs.readFileSync('admin.js', 'utf8');

const OLD = `async function loadAdminEvents() {\r\n    const tbody = document.getElementById('adminEventsTbody');\r\n    if (!tbody) return;\r\n    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading\u2026</td></tr>';\r\n    \r\n    try {`;

const NEW = `async function loadAdminEvents() {\r\n    const tbody = document.getElementById('adminEventsTbody');\r\n    if (!tbody) return;\r\n    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading\u2026</td></tr>';\r\n    \r\n    // Also refresh the Manage Donation Years table in the same section\r\n    if (typeof adminLoadYears === 'function') adminLoadYears();\r\n\r\n    try {`;

// Also try with LF
const OLD_LF = OLD.replace(/\r\n/g, '\n');
const NEW_LF = NEW.replace(/\r\n/g, '\n');

let changed = false;
if (c.includes(OLD)) {
    c = c.replace(OLD, NEW);
    changed = true;
    console.log('✅ Patched (CRLF)');
} else if (c.includes(OLD_LF)) {
    c = c.replace(OLD_LF, NEW_LF);
    changed = true;
    console.log('✅ Patched (LF)');
} else {
    // Fallback: simple string search at line boundary
    const marker = 'async function loadAdminEvents()';
    const idx = c.indexOf(marker);
    if (idx !== -1) {
        // Find the first `try {` after the function start
        const tryIdx = c.indexOf('try {', idx);
        if (tryIdx !== -1) {
            const insert = '\n    // Also refresh the Manage Donation Years table in the same section\n    if (typeof adminLoadYears === \'function\') adminLoadYears();\n\n    ';
            c = c.slice(0, tryIdx) + insert + c.slice(tryIdx);
            changed = true;
            console.log('✅ Patched (fallback insertion before try)');
        }
    }
}

if (changed) {
    fs.writeFileSync('admin.js', c);
    console.log('Done.');
} else {
    console.log('❌ Could not find anchor to patch.');
}
