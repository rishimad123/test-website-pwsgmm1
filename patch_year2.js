const fs = require('fs');

// --- Patch admin.js ---
let adminJs = fs.readFileSync('admin.js', 'utf8');

// In applyReceiptFormat, when prefix is 'ade_rcg', store the year globally
const oldApply = `function applyReceiptFormat(rf, prefix) {
    if (!rf) return;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerHTML = val; };
    const setInput = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };`;

const newApply = `function applyReceiptFormat(rf, prefix) {
    if (!rf) return;
    // Store year globally so ade_rcg_liveSync and _uploadReceiptPreview use it
    if (rf.receiptYear !== undefined) window._receiptYear = rf.receiptYear;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerHTML = val; };
    const setInput = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };`;

if (adminJs.includes(oldApply)) {
    adminJs = adminJs.split(oldApply).join(newApply);
    console.log('admin.js applyReceiptFormat patched');
} else {
    const oldApplyR = oldApply.replace(/\n/g, '\r\n');
    const newApplyR = newApply.replace(/\n/g, '\r\n');
    if (adminJs.includes(oldApplyR)) {
        adminJs = adminJs.split(oldApplyR).join(newApplyR);
        console.log('admin.js applyReceiptFormat patched (CRLF)');
    } else {
        console.error('admin.js patch FAILED');
    }
}

fs.writeFileSync('admin.js', adminJs);

// --- Patch dashboard.html ---
let dash = fs.readFileSync('dashboard.html', 'utf8');

const oldDashApply = `function applyReceiptFormat(rf, prefix) {
    if (!rf) return;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerHTML = val; };`;

const newDashApply = `function applyReceiptFormat(rf, prefix) {
    if (!rf) return;
    // Store year globally so receipt liveSync functions use it
    if (rf.receiptYear !== undefined) window._receiptYear = rf.receiptYear;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerHTML = val; };`;

if (dash.includes(oldDashApply)) {
    dash = dash.split(oldDashApply).join(newDashApply);
    console.log('dashboard.html applyReceiptFormat patched');
} else {
    const oldR = oldDashApply.replace(/\n/g, '\r\n');
    const newR = newDashApply.replace(/\n/g, '\r\n');
    if (dash.includes(oldR)) {
        dash = dash.split(oldR).join(newR);
        console.log('dashboard.html applyReceiptFormat patched (CRLF)');
    } else {
        console.error('dashboard.html patch FAILED');
    }
}

// Also patch volunteer panel's yearStr logic in de_rcg_liveSync
const oldVolYear = `        // Year from date`;
const checkVolPatch = `window._receiptYear`;

// Find the yearStr blocks in dashboard.html that need patching
const yearBlocks = [];
let idx = 0;
while ((idx = dash.indexOf('// Year from date', idx)) !== -1) {
    yearBlocks.push(idx);
    idx++;
}
console.log(`Found ${yearBlocks.length} yearStr blocks in dashboard.html`);

// Patch: replace auto-calc with _receiptYear check
const volOld1 = `                if (mo >= 4) {\r\n                    yearStr = yr + '-' + String(yr + 1).slice(2);\r\n                } else {\r\n                    yearStr = (yr - 1) + '-' + String(yr).slice(2);\r\n                }`;
const volNew1 = `                if (window._receiptYear) {\r\n                    yearStr = window._receiptYear;\r\n                } else if (mo >= 4) {\r\n                    yearStr = yr + '-' + String(yr + 1).slice(2);\r\n                } else {\r\n                    yearStr = (yr - 1) + '-' + String(yr).slice(2);\r\n                }`;

const volOld1b = `                if (mo >= 4) {\n                    yearStr = yr + '-' + String(yr + 1).slice(2);\n                } else {\n                    yearStr = (yr - 1) + '-' + String(yr).slice(2);\n                }`;
const volNew1b = `                if (window._receiptYear) {\n                    yearStr = window._receiptYear;\n                } else if (mo >= 4) {\n                    yearStr = yr + '-' + String(yr + 1).slice(2);\n                } else {\n                    yearStr = (yr - 1) + '-' + String(yr).slice(2);\n                }`;

if (dash.includes(volOld1)) {
    dash = dash.split(volOld1).join(volNew1);
    console.log('dashboard.html yearStr blocks patched (CRLF)');
} else if (dash.includes(volOld1b)) {
    dash = dash.split(volOld1b).join(volNew1b);
    console.log('dashboard.html yearStr blocks patched (LF)');
} else {
    console.warn('dashboard.html yearStr auto-calc block not found - will skip');
}

// Patch the _deUploadReceiptPreview yearStr too
const volOld2 = `        yearStr = mo >= 4 ? yr + '-' + String(yr+1).slice(2) : (yr-1) + '-' + String(yr).slice(2);`;
const volNew2 = `        yearStr = window._receiptYear || (mo >= 4 ? yr + '-' + String(yr+1).slice(2) : (yr-1) + '-' + String(yr).slice(2));`;

if (dash.includes(volOld2)) {
    dash = dash.split(volOld2).join(volNew2);
    console.log('dashboard.html _deUploadReceiptPreview yearStr patched');
} else {
    console.warn('dashboard.html _deUploadReceiptPreview yearStr not found');
}

fs.writeFileSync('dashboard.html', dash);
console.log('All patches done.');
