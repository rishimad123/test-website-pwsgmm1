const fs = require('fs');

function replaceInFile(filename, oldStr, newStr) {
    let content = fs.readFileSync(filename, 'utf8');
    // normalize newlines
    content = content.replace(/\\r\\n/g, '\\n');
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        // optional: convert back to crlf if needed, but modern browsers/git handle \n just fine
        fs.writeFileSync(filename, content, 'utf8');
        console.log(`Success: Replaced string in ${filename}`);
    } else {
        console.log(`Error: Target string not found in ${filename}`);
    }
}

const dashboardLabelOld = `        const lbl = document.getElementById('deRefLabel');
        if (lbl) lbl.innerHTML = \`\${_deRefLabels[mode] || 'Reference Number'} <span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>\`;`;

const dashboardLabelNew = `        const lbl = document.getElementById('deRefLabel');
        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = \`\${_deRefLabels[mode] || 'Reference Number'} \${reqHtml}\`;
        }`;

replaceInFile('dashboard.html', dashboardLabelOld, dashboardLabelNew);


const adminLabelOld = `        const lbl = document.getElementById('adeRefLabel');
        if (lbl) lbl.innerHTML = \`\${_adeRefLabels[mode] || 'Reference Number'} <span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>\`;`;

const adminLabelNew = `        const lbl = document.getElementById('adeRefLabel');
        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = \`\${_adeRefLabels[mode] || 'Reference Number'} \${reqHtml}\`;
        }`;

replaceInFile('admin.html', adminLabelOld, adminLabelNew);


const adminPayloadOld = `                const getTrim = id => getVal(id).trim();

                payload = {`;

const adminPayloadNew = `                const getTrim = id => getVal(id).trim();

                const pMode = getVal('adePaymentMode') || 'Cash';
                const refNum = getTrim('adeReference');
                if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
                if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

                payload = {`;

replaceInFile('admin.html', adminPayloadOld, adminPayloadNew);
