const fs = require('fs');

// 1. admin.js
let adminJs = fs.readFileSync('admin.js', 'utf8');

adminJs = adminJs.replace(
    "const withAmt = allSlips.filter(s => s.status === 'Received');\n        const withoutAmt = allSlips.filter(s => s.status !== 'Received' && (s.status === 'Balance' || s.paymentMode === 'Balance' || s.status === 'Pending'));",
    "const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n        const withAmt = allSlips.filter(s => getStatus(s) === 'received');\n        const withoutAmt = allSlips.filter(s => getStatus(s) !== 'received' && (getStatus(s) === 'balance' || String(s.paymentMode).toLowerCase() === 'balance' || getStatus(s) === 'pending'));"
);

adminJs = adminJs.replace(
    "if (slip.uploadedAt && !slip.deleted && (slip.status||'').toLowerCase() === 'received' && slip.paymentMode !== 'balance' && slip.amount && Number(slip.amount) > 0) {",
    "const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n                if (slip.uploadedAt && !slip.deleted && getStatus(slip) === 'received' && slip.amount && Number(slip.amount) > 0) {"
);

adminJs = adminJs.replace(
    "if (!r.deleted && (r.status||'').toLowerCase() === 'received' && r.type !== 'balance') {",
    "const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n            if (!r.deleted && getStatus(r) === 'received') {"
);

adminJs = adminJs.replace(
    "if (!e.deleted && (e.status||'').toLowerCase() === 'received' && (e.paymentMode||'').toLowerCase() !== 'balance') {",
    "const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n            if (!e.deleted && getStatus(e) === 'received') {"
);

adminJs = adminJs.replace(
    "if (!slip.deleted && slip.uploadedAt &&\n                    (slip.status || '').toLowerCase() !== 'received' &&\n                    (slip.paymentMode === 'balance' || !slip.amount || Number(slip.amount) <= 0)) {",
    "const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n                if (!slip.deleted && slip.uploadedAt &&\n                    getStatus(slip) !== 'received' &&\n                    (String(slip.paymentMode).toLowerCase() === 'balance' || !slip.amount || Number(slip.amount) <= 0)) {"
);

adminJs = adminJs.replace(
    "const receiptBal = (rcData.receipts || []).filter(r => r.type === 'balance' && !r.deleted && (r.status || '').toLowerCase() !== 'received');",
    "const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n        const receiptBal = (rcData.receipts || []).filter(r => String(r.type).toLowerCase() === 'balance' && !r.deleted && getStatus(r) !== 'received');"
);

adminJs = adminJs.replace(
    "const deBal = (deData.entries || []).filter(e =>\n            e.paymentMode && e.paymentMode.toLowerCase() === 'balance' && !e.deleted && (e.status || '').toLowerCase() !== 'received'\n        ).map(e => {",
    "const deBal = (deData.entries || []).filter(e => {\n            const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n            return e.paymentMode && String(e.paymentMode).toLowerCase() === 'balance' && !e.deleted && getStatus(e) !== 'received';\n        }).map(e => {"
);

fs.writeFileSync('admin.js', adminJs);
console.log('admin.js updated');


// 2. dashboard.html
let dashboardHtml = fs.readFileSync('dashboard.html', 'utf8');

dashboardHtml = dashboardHtml.replace(
    "const withAmt = allSlips.filter(s => s.status === 'Received');\n        const withoutAmt = allSlips.filter(s => s.status !== 'Received' && (s.status === 'Balance' || s.paymentMode === 'Balance'));",
    "const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n        const withAmt = allSlips.filter(s => getStatus(s) === 'received');\n        const withoutAmt = allSlips.filter(s => getStatus(s) !== 'received' && (getStatus(s) === 'balance' || String(s.paymentMode).toLowerCase() === 'balance'));"
);

fs.writeFileSync('dashboard.html', dashboardHtml);
console.log('dashboard.html updated');


// 3. server.js
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    "if (slip.uploadedAt && !slip.deleted && (slip.status||'').toLowerCase() === 'received' && slip.paymentMode !== 'balance' && slip.amount && Number(slip.amount) > 0) {",
    "const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n                if (slip.uploadedAt && !slip.deleted && getStatus(slip) === 'received' && slip.amount && Number(slip.amount) > 0) {"
);

serverJs = serverJs.replace(
    "if (!r.deleted && (r.status||'').toLowerCase() === 'received' && r.type !== 'balance') {",
    "const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n            if (!r.deleted && getStatus(r) === 'received') {"
);

fs.writeFileSync('server.js', serverJs);
console.log('server.js updated');

// 4. inject_tracking4.js
if (fs.existsSync('inject_tracking4.js')) {
    let trackingJs = fs.readFileSync('inject_tracking4.js', 'utf8');
    trackingJs = trackingJs.replace(
        "const withAmt = allSlips.filter(s => s.status === 'Received');\n        const withoutAmt = allSlips.filter(s => s.status !== 'Received' && (s.status === 'Balance' || s.paymentMode === 'Balance'));",
        "const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\n        const withAmt = allSlips.filter(s => getStatus(s) === 'received');\n        const withoutAmt = allSlips.filter(s => getStatus(s) !== 'received' && (getStatus(s) === 'balance' || String(s.paymentMode).toLowerCase() === 'balance'));"
    );
    fs.writeFileSync('inject_tracking4.js', trackingJs);
    console.log('inject_tracking4.js updated');
}
