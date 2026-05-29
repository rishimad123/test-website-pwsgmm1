const fs = require('fs');

// DASHBOARD
let dashContent = fs.readFileSync('dashboard.html', 'utf8');

const dashPayloadRegex = /const getTrim = id => getVal\(id\)\.trim\(\);\s+payload = \{/;
const dashPayloadReplacement = `const getTrim = id => getVal(id).trim();

            const pMode = getVal('dePaymentMode') || 'Cash';
            const refNum = getTrim('deReference');
            if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
            if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

            payload = {`;

if (dashPayloadRegex.test(dashContent)) {
    dashContent = dashContent.replace(dashPayloadRegex, dashPayloadReplacement);
    console.log('Replaced payload in dashboard.html');
} else {
    console.log('Regex failed in dashboard.html');
}

fs.writeFileSync('dashboard.html', dashContent, 'utf8');

// ADMIN
let adminContent = fs.readFileSync('admin.html', 'utf8');

const adminLabelRegex = /const lbl = document\.getElementById\('adeRefLabel'\);\s+if \(lbl\) lbl\.innerHTML = `\$\\{_adeRefLabels\[mode\] \|\| 'Reference Number'\\} <span style="color:#aaa;font-weight:400;font-size:\.85rem;">\(optional\)<\/span>`;/;
const adminLabelReplacement = `const lbl = document.getElementById('adeRefLabel');
        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = \`\${_adeRefLabels[mode] || 'Reference Number'} \${reqHtml}\`;
        }`;

if (adminLabelRegex.test(adminContent)) {
    adminContent = adminContent.replace(adminLabelRegex, adminLabelReplacement);
    console.log('Replaced label in admin.html');
} else {
    console.log('Label regex failed in admin.html');
}

const adminPayloadRegex = /const getTrim = id => getVal\(id\)\.trim\(\);\s+payload = \{/;
const adminPayloadReplacement = `const getTrim = id => getVal(id).trim();

                const pMode = getVal('adePaymentMode') || 'Cash';
                const refNum = getTrim('adeReference');
                if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
                if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

                payload = {`;

if (adminPayloadRegex.test(adminContent)) {
    adminContent = adminContent.replace(adminPayloadRegex, adminPayloadReplacement);
    console.log('Replaced payload in admin.html');
} else {
    console.log('Payload regex failed in admin.html');
}

fs.writeFileSync('admin.html', adminContent, 'utf8');
