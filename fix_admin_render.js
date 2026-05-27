const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

const targetStr = `        document.getElementById('adeSummaryAmt')      && (document.getElementById('adeSummaryAmt').textContent      = '₹' + totalAmt.toLocaleString('en-IN'));\n        if (!_adeFiltered.length) { tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#999;padding:30px;">No entries found.</td></tr>'; return; }`;
const replaceStr = `        document.getElementById('adeSummaryAmt')      && (document.getElementById('adeSummaryAmt').textContent      = '₹' + totalAmt.toLocaleString('en-IN'));
        
        // Instantly update donation tracking section when data changes
        if (typeof loadDonationTrackingCards === 'function') {
            loadDonationTrackingCards();
        }

        if (!_adeFiltered.length) { tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#999;padding:30px;">No entries found.</td></tr>'; return; }`;

if (content.indexOf(targetStr) !== -1) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync('admin.html', content, 'utf8');
    console.log('Success (exact match)');
} else {
    // try regex with wildcard spacing
    const rgx = /document\.getElementById\('adeSummaryAmt'\)\s*&&\s*\(document\.getElementById\('adeSummaryAmt'\)\.textContent\s*=\s*'₹'\s*\+\s*totalAmt\.toLocaleString\('en-IN'\)\);\s*if \(!_adeFiltered\.length\)\s*\{\s*tbody\.innerHTML\s*=\s*'<tr><td colspan="17" style="text-align:center;color:#999;padding:30px;">No entries found\.<\/td><\/tr>';\s*return;\s*\}/g;
    if (rgx.test(content)) {
        content = content.replace(rgx, replaceStr);
        fs.writeFileSync('admin.html', content, 'utf8');
        console.log('Success (regex match)');
    } else {
        console.log('Failed to match');
    }
}
