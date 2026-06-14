const fs = require('fs');

let content = fs.readFileSync('c:/Users/admin/Desktop/test-website-pwsgmm1/dashboard.html', 'utf8');

const applyFuncStr = `
function applyReceiptFormat(rf, prefix) {
    if (!rf) return;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerHTML = val; };
    setVal(prefix + '_f_receiptTopLeft', rf.receiptTopLeft);
    setVal(prefix + '_f_receiptTopCenter', rf.receiptTopCenter);
    setVal(prefix + '_f_receiptTopRightPrefix', rf.receiptTopRightPrefix);
    setVal(prefix + '_r_year', rf.receiptYear);
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
`;

// Insert it somewhere at the bottom of the script section before closing
content = content.replace('// --- Helpers ---', applyFuncStr + '\n// --- Helpers ---');

// Inject into loadEventCountdown
content = content.replace(
    /(const data = await res\.json\(\);)/,
    `$1\n\n                                if (data && data.receiptFormat) { applyReceiptFormat(data.receiptFormat, 'de_rcg'); }`
);

fs.writeFileSync('c:/Users/admin/Desktop/test-website-pwsgmm1/dashboard.html', content);
console.log("dashboard.html patched for receipt config sync.");
