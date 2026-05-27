const fs = require('fs');

// 1. Fix admin.js
let adminJs = fs.readFileSync('admin.js', 'utf8');

adminJs = adminJs.replace(
    "const withAmt = allSlips.filter(s => s.status === 'Received' && s.paymentMode !== 'Balance');",
    "const withAmt = allSlips.filter(s => s.status === 'Received');"
);
adminJs = adminJs.replace(
    "const withoutAmt = allSlips.filter(s => s.status === 'Balance' || s.paymentMode === 'Balance');",
    "const withoutAmt = allSlips.filter(s => s.status !== 'Received' && (s.status === 'Balance' || s.paymentMode === 'Balance' || s.status === 'Pending'));"
);

adminJs = adminJs.replace(
    "if (!slip.deleted && slip.uploadedAt &&\n                    (slip.paymentMode === 'balance' || !slip.amount || Number(slip.amount) <= 0)) {",
    "if (!slip.deleted && slip.uploadedAt &&\n                    (slip.status || '').toLowerCase() !== 'received' &&\n                    (slip.paymentMode === 'balance' || !slip.amount || Number(slip.amount) <= 0)) {"
);

adminJs = adminJs.replace(
    "const receiptBal = (rcData.receipts || []).filter(r => r.type === 'balance' && !r.deleted);",
    "const receiptBal = (rcData.receipts || []).filter(r => r.type === 'balance' && !r.deleted && (r.status || '').toLowerCase() !== 'received');"
);

adminJs = adminJs.replace(
    "const deBal = (deData.entries || []).filter(e =>\n            e.paymentMode && e.paymentMode.toLowerCase() === 'balance' && !e.deleted\n        )",
    "const deBal = (deData.entries || []).filter(e =>\n            e.paymentMode && e.paymentMode.toLowerCase() === 'balance' && !e.deleted && (e.status || '').toLowerCase() !== 'received'\n        )"
);

fs.writeFileSync('admin.js', adminJs);
console.log("admin.js fixed.");

// 2. Fix server.js (upload-passbook intercept)
let serverJs = fs.readFileSync('server.js', 'utf8');

const uploadIntercept = `
            if (entryId && entryId.startsWith('PB-')) {
                const partsId = entryId.split('-');
                const bId = \`PB-\${partsId[1]}\`;
                const sNum = Number(partsId[2]);
                const bidx = pautiBooks.findIndex(b => b.pautiBookId === bId);
                if (bidx !== -1) {
                    const sidx = pautiBooks[bidx].slips.findIndex(s => s.slipNumber === sNum);
                    if (sidx !== -1) {
                        pautiBooks[bidx].slips[sidx].photoFile = uniqueName;
                        pautiBooks[bidx].slips[sidx].photoUrl  = \`/uploads/\${uniqueName}\`;
                        await savePautiBooks();
                        linkedEntryId = entryId;
                        console.log(\`🖼  Photo linked to pauti book slip: Book \${bId}, Slip #\${sNum}\`);
                    }
                }
            } else if (entryId && entryId.startsWith('RC-')) {
                const rId = entryId.substring(3);
                const idx = receipts.findIndex(r => r.receiptId === rId || r.receiptId === \`RC-\${rId}\` || r.receiptId === entryId);
                if (idx !== -1) {
                    receipts[idx].passbookFile = uniqueName;
                    receipts[idx].passbookUrl  = \`/uploads/\${uniqueName}\`;
                    receipts[idx].updatedAt    = new Date().toISOString();
                    await saveReceipts();
                    linkedEntryId = entryId;
                    console.log(\`🔗 Passbook linked to receipt: \${entryId}\`);
                }
            } else if (entryId) {
`;

serverJs = serverJs.replace(
    "if (entryId) {\n                const eidx = donationEntries.findIndex(e => e.entryId === entryId);",
    uploadIntercept + "\n                const eidx = donationEntries.findIndex(e => e.entryId === entryId);"
);

fs.writeFileSync('server.js', serverJs);
console.log("server.js fixed.");
