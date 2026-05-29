const fs = require('fs');

let adminContent = fs.readFileSync('admin.html', 'utf8');

const adminLabelRegex = /const lbl = document\.getElementById\('adeRefLabel'\);\s+if \(lbl\) lbl\.innerHTML = `\$\\{_adeRefLabels\[mode\] \|\| 'Reference Number'\\} <span style="color:#aaa;font-weight:400;font-size:\.85rem;">\(optional\)<\/span>`;/;
const adminLabelReplacement = `const lbl = document.getElementById('adeRefLabel');
        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = \\\`\\\${\\_adeRefLabels[mode] || 'Reference Number'} \\\${reqHtml}\\\`;
        }`;

// Let's just do a simple substring replacement to avoid regex interpolation issues
const lines = adminContent.split('\\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("lbl.innerHTML = `${_adeRefLabels[mode] || 'Reference Number'} <span style=\"color:#aaa;font-weight:400;font-size:.85rem;\">(optional)</span>`;")) {
        lines[i] = `        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = \\\`\\\${\\_adeRefLabels[mode] || 'Reference Number'} \\\${reqHtml}\\\`;
        }`.replace(/\\\\/g, '');
        console.log('Successfully found and replaced label in admin.html');
        // also remove the preceding 'if (lbl) ' if it's on a separate line, wait it's on the same line in the file:
        // '        if (lbl) lbl.innerHTML = ...'
        break;
    }
}
fs.writeFileSync('admin.html', lines.join('\\n'), 'utf8');
