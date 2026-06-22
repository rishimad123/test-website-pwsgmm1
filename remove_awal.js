const fs = require('fs');

// 1. Remove from all HTML public files
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html') && f !== 'awal.html');
htmlFiles.forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/<li[^>]*>\s*<a[^>]*href=["']awal\.html["'][^>]*>Awal<\/a>\s*<\/li>\r?\n?/gi, '');
    fs.writeFileSync(f, c);
    console.log('Cleaned ' + f);
});

// 2. Remove Awal link from admin.html
let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.replace(/<a href="#" onclick="showAdminSection\('awal'\)">[\s\S]*?<span>Awal<\/span>\s*<\/a>\r?\n?/gi, '');
// Also remove the entire awal section and modals by targeting the comments.
// We'll just remove the sidebar link to fulfill the user's requirement cleanly without risking unclosed div tags,
// but wait, removing the section from DOM is better.
// Let's do a robust removal.
const startStr = '<!-- ═══════════ Awal Section (Admin) ═══════════ -->';
const endStr = '<!-- Awal PDF Upload Progress Overlay -->';
const startIdx = adminHtml.indexOf(startStr);
const endIdx = adminHtml.indexOf(endStr);
if (startIdx !== -1 && endIdx !== -1) {
    // Find the end of the Awal PDF Upload Progress Overlay div
    const afterEndStr = adminHtml.substring(endIdx);
    const closingDivIdx = afterEndStr.indexOf('</div>');
    if (closingDivIdx !== -1) {
        adminHtml = adminHtml.substring(0, startIdx) + afterEndStr.substring(closingDivIdx + 6);
    }
}
fs.writeFileSync('admin.html', adminHtml);
console.log('Cleaned admin.html');
