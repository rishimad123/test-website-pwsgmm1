const fs = require('fs');

let adminHtml = fs.readFileSync('admin.html', 'utf8');

// Remove sidebar link
adminHtml = adminHtml.replace(/<a href="#" onclick="showAdminSection\('awal'\)">[\s\S]*?<span>Awal<\/span>\s*<\/a>\r?\n?/gi, '');

// Remove Awal Section
const startStr = '<!-- ═══════════ Awal Section (Admin) ═══════════ -->';
const endStr = '<!-- ═══════════ Events Section (Admin) ═══════════ -->';

const startIdx = adminHtml.indexOf(startStr);
const endIdx = adminHtml.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    adminHtml = adminHtml.substring(0, startIdx) + adminHtml.substring(endIdx);
}

// Remove Awal PDF Overlay
const pdfStartStr = '<!-- Awal PDF Upload Progress Overlay -->';
const pdfStartIdx = adminHtml.indexOf(pdfStartStr);
if (pdfStartIdx !== -1) {
    const nextDivIdx = adminHtml.indexOf('</div>', pdfStartIdx);
    if (nextDivIdx !== -1) {
        adminHtml = adminHtml.substring(0, pdfStartIdx) + adminHtml.substring(nextDivIdx + 6);
    }
}

fs.writeFileSync('admin.html', adminHtml);
console.log('Cleaned admin.html');
