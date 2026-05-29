const fs = require('fs');

function applyValidation(filename, getTrimStr, replacementStr) {
    let content = fs.readFileSync(filename, 'utf8');
    const idx = content.indexOf(getTrimStr);
    if (idx !== -1) {
        content = content.replace(getTrimStr, replacementStr);
        fs.writeFileSync(filename, content, 'utf8');
        console.log(`Applied validation to ${filename}`);
    } else {
        console.log(`Could not find target in ${filename}`);
    }
}

// dashboard.html
applyValidation('dashboard.html',
    `            const getTrim = id => getVal(id).trim();\n\n            payload = {`,
    `            const getTrim = id => getVal(id).trim();\n\n            const pMode = getVal('dePaymentMode') || 'Cash';\n            const refNum = getTrim('deReference');\n            if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');\n            if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');\n\n            payload = {`
);

// admin.html
// Also apply the label update for admin.html since I didn't do it yet!
let adminContent = fs.readFileSync('admin.html', 'utf8');
const oldLabel = `        const lbl = document.getElementById('adeRefLabel');\n        if (lbl) lbl.innerHTML = \`\${_adeRefLabels[mode] || 'Reference Number'} <span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>\`;`;
const newLabel = `        const lbl = document.getElementById('adeRefLabel');\n        if (lbl) {\n            const isReq = (mode === 'Cheque' || mode === 'RTGS');\n            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';\n            lbl.innerHTML = \`\${_adeRefLabels[mode] || 'Reference Number'} \${reqHtml}\`;\n        }`;
if (adminContent.includes(oldLabel)) {
    adminContent = adminContent.replace(oldLabel, newLabel);
    fs.writeFileSync('admin.html', adminContent, 'utf8');
    console.log('Applied label update to admin.html');
} else {
    console.log('Could not find label target in admin.html');
}

applyValidation('admin.html',
    `                const getTrim = id => getVal(id).trim();\n\n                payload = {`,
    `                const getTrim = id => getVal(id).trim();\n\n                const pMode = getVal('adePaymentMode') || 'Cash';\n                const refNum = getTrim('adeReference');\n                if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');\n                if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');\n\n                payload = {`
);
