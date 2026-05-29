const fs = require('fs');

let adminContent = fs.readFileSync('admin.html', 'utf8');

const targetStr = `        const lbl = document.getElementById('adeRefLabel');
        if (lbl) lbl.innerHTML = \`\${_adeRefLabels[mode] || 'Reference Number'} <span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>\`;`;

const replaceStr = `        const lbl = document.getElementById('adeRefLabel');
        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = \`\${_adeRefLabels[mode] || 'Reference Number'} \${reqHtml}\`;
        }`;

if (adminContent.includes(targetStr)) {
    adminContent = adminContent.replace(targetStr, replaceStr);
    fs.writeFileSync('admin.html', adminContent, 'utf8');
    console.log('Successfully updated adeRefLabel logic in admin.html');
} else {
    console.log('Failed to find target string in admin.html');
}
