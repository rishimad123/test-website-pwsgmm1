const fs = require('fs');

let content = fs.readFileSync('c:/Users/admin/Desktop/test-website-pwsgmm1/admin.js', 'utf8');

// The JS functions to save and populate receipt format UI
const newFunctions = `
// ==================== RECEIPT FORMAT SETTINGS ====================
async function saveReceiptFormat() {
    const rf = {
        receiptTopLeft: document.getElementById('rfTopLeft')?.value || '',
        receiptTopCenter: document.getElementById('rfTopCenter')?.value || '',
        receiptTopRightPrefix: document.getElementById('rfTopRight')?.value || '',
        receiptYear: document.getElementById('rfYear')?.value || '',
        receiptTitle: document.getElementById('rfTitle')?.value || '',
        receiptAddress: document.getElementById('rfAddress')?.value || '',
        receiptDonorPrefix: document.getElementById('rfDonorPrefix')?.value || '',
        receiptDonorSuffix: document.getElementById('rfDonorSuffix')?.value || '',
        receiptAmountWordsPrefix: document.getElementById('rfAmountWords')?.value || '',
        receiptThankYouText: document.getElementById('rfThankYou')?.value || '',
        receiptSign1Role: document.getElementById('rfSign1Role')?.value || '',
        receiptSign1Name: document.getElementById('rfSign1Name')?.value || '',
        receiptSign2Role: document.getElementById('rfSign2Role')?.value || '',
        receiptSign2Name: document.getElementById('rfSign2Name')?.value || '',
        receiptSign3Role: document.getElementById('rfSign3Role')?.value || '',
        receiptSign3Name: document.getElementById('rfSign3Name')?.value || '',
        receiptSign4Role: document.getElementById('rfSign4Role')?.value || '',
        receiptSign4Name: document.getElementById('rfSign4Name')?.value || ''
    };

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiptFormat: rf })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            const statusEl = document.getElementById('rfStatus');
            if (statusEl) {
                statusEl.style.opacity = '1';
                setTimeout(() => { statusEl.style.opacity = '0'; }, 3000);
            }
            // Sync live preview
            applyReceiptFormat(rf, 'ade_rcg');
        } else {
            alert('Error saving receipt format: ' + (data.message || 'Unknown'));
        }
    } catch (e) {
        alert('Server connection error.');
    }
}

function applyReceiptFormat(rf, prefix) {
    if (!rf) return;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerHTML = val; };
    const setInput = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    
    // Apply to UI fields if this is admin side loading
    if (prefix === 'ui') {
        setInput('rfTopLeft', rf.receiptTopLeft);
        setInput('rfTopCenter', rf.receiptTopCenter);
        setInput('rfTopRight', rf.receiptTopRightPrefix);
        setInput('rfYear', rf.receiptYear);
        setInput('rfTitle', rf.receiptTitle);
        setInput('rfAddress', rf.receiptAddress);
        setInput('rfDonorPrefix', rf.receiptDonorPrefix);
        setInput('rfDonorSuffix', rf.receiptDonorSuffix);
        setInput('rfAmountWords', rf.receiptAmountWordsPrefix);
        setInput('rfThankYou', rf.receiptThankYouText);
        setInput('rfSign1Role', rf.receiptSign1Role);
        setInput('rfSign1Name', rf.receiptSign1Name);
        setInput('rfSign2Role', rf.receiptSign2Role);
        setInput('rfSign2Name', rf.receiptSign2Name);
        setInput('rfSign3Role', rf.receiptSign3Role);
        setInput('rfSign3Name', rf.receiptSign3Name);
        setInput('rfSign4Role', rf.receiptSign4Role);
        setInput('rfSign4Name', rf.receiptSign4Name);
    } else {
        // Apply to receipt preview
        setVal(prefix + '_f_receiptTopLeft', rf.receiptTopLeft);
        setVal(prefix + '_f_receiptTopCenter', rf.receiptTopCenter);
        setVal(prefix + '_f_receiptTopRightPrefix', rf.receiptTopRightPrefix);
        setVal(prefix + '_r_year', rf.receiptYear); // specific for year
        setVal(prefix + '_f_receiptTitle', rf.receiptTitle);
        setVal(prefix + '_f_receiptAddress', rf.receiptAddress);
        setVal(prefix + '_f_receiptDonorPrefix', rf.receiptDonorPrefix);
        setVal(prefix + '_f_receiptDonorSuffix', rf.receiptDonorSuffix);
        setVal(prefix + '_f_receiptAmountWordsPrefix', rf.receiptAmountWordsPrefix);
        setVal(prefix + '_f_receiptThankYouText', rf.receiptThankYouText);
        setVal(prefix + '_f_receiptSign1Role', rf.receiptSign1Role);
        setVal(prefix + '_f_receiptSign1Name', rf.receiptSign1Name);
        setVal(prefix + '_f_receiptSign2Role', rf.receiptSign2Role);
        setVal(prefix + '_f_receiptSign2Name', rf.receiptSign2Name);
        setVal(prefix + '_f_receiptSign3Role', rf.receiptSign3Role);
        setVal(prefix + '_f_receiptSign3Name', rf.receiptSign3Name);
        setVal(prefix + '_f_receiptSign4Role', rf.receiptSign4Role);
        setVal(prefix + '_f_receiptSign4Name', rf.receiptSign4Name);
    }
}
`;

// Insert the new functions
content = content.replace('// ==================== GLOBAL EVENT SETTINGS ====================', newFunctions + '\n// ==================== GLOBAL EVENT SETTINGS ====================');

// In loadAdminEventDate, where it loads settings:
const patchSettingsLoad = `
        if (data && data.receiptFormat) {
            applyReceiptFormat(data.receiptFormat, 'ui');
            applyReceiptFormat(data.receiptFormat, 'ade_rcg');
        }
`;
content = content.replace(/(document\.getElementById\('adminEventDate'\)\.value = dateStr;\n\s*\})/, `$1\n${patchSettingsLoad}`);

fs.writeFileSync('c:/Users/admin/Desktop/test-website-pwsgmm1/admin.js', content);
console.log("admin.js patched successfully.");
