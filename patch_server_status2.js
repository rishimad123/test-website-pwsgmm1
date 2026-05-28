const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const targetStr = `        // Merge Received slips from Pauti Books
        pautiBooks.forEach(book => {
            if (bookFilter && String(book.bookNumber) !== String(bookFilter)) return;
            (book.slips || []).forEach(slip => {
                const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
                if (slip.uploadedAt && !slip.deleted && getStatus(slip) === 'received' && slip.amount && Number(slip.amount) > 0) {
                    result.push({
                        ...slip,
                        entryId: \`PB-\${book.pautiBookId}-\${slip.slipNumber}\`,
                        bookNumber: book.bookNumber,
                        receiptNumber: slip.slipNumber,
                        donorType: 'Individual',
                        firstName: slip.firstName || slip.donorName || '',
                        middleName: slip.middleName || '',
                        lastName: slip.lastName || '',
                        amount: slip.amount,
                        paymentMode: slip.paymentMode || 'Cash',
                        status: slip.status || 'Received',
                        photoUrl: slip.photoUrl || null,
                        submittedAt: slip.uploadedAt,
                        submittedBy: slip.uploadedBy || 'Auto',
                        submittedByUserId: slip.uploadedByUserId || null,
                        area: slip.area || null,
                        referenceNumber: slip.referenceNumber || slip.checkNumber || null
                    });
                }
            });
        });

        // Merge Received slips from Receipts
        receipts.forEach(r => {
            if (bookFilter && String(r.bookNumber) !== String(bookFilter)) return;
            const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
            if (!r.deleted && getStatus(r) === 'received') {
                result.push({
                    ...r,
                    entryId: r.receiptId || \`RC-\${r.receiptNumber}\`,
                    bookNumber: r.bookNumber || 0,
                    receiptNumber: r.receiptNumber || 0,
                    donorType: 'Individual',
                    firstName: r.firstName || r.name || '',
                    middleName: r.middleName || '',
                    lastName: r.lastName || '',
                    amount: r.amount,
                    paymentMode: r.paymentMode || 'Cash',
                    status: r.status || 'Received',
                    photoUrl: r.photoUrl || null,
                    submittedAt: r.date || r.createdAt || new Date().toISOString(),
                    submittedBy: r.submittedBy || 'Auto',
                    submittedByUserId: r.submittedByUserId || null,
                    area: r.area || null,
                    referenceNumber: r.referenceNumber || null
                });
            }
        });`;

const replacementStr = `        // Merge Received slips from Pauti Books
        pautiBooks.forEach(book => {
            if (bookFilter && String(book.bookNumber) !== String(bookFilter)) return;
            (book.slips || []).forEach(slip => {
                const st = normalizeStatus(slip.status, slip.paymentMode);
                if (slip.uploadedAt && !slip.deleted && st.toLowerCase() === 'received' && slip.amount && Number(slip.amount) > 0) {
                    result.push({
                        ...slip,
                        entryId: \`PB-\${book.pautiBookId}-\${slip.slipNumber}\`,
                        bookNumber: book.bookNumber,
                        receiptNumber: slip.slipNumber,
                        donorType: 'Individual',
                        firstName: slip.firstName || slip.donorName || '',
                        middleName: slip.middleName || '',
                        lastName: slip.lastName || '',
                        amount: slip.amount,
                        paymentMode: slip.paymentMode || 'Cash',
                        status: st,
                        photoUrl: slip.photoUrl || null,
                        submittedAt: slip.uploadedAt,
                        submittedBy: slip.uploadedBy || 'Auto',
                        submittedByUserId: slip.uploadedByUserId || null,
                        area: slip.area || null,
                        referenceNumber: slip.referenceNumber || slip.checkNumber || null
                    });
                }
            });
        });

        // Merge Received slips from Receipts
        receipts.forEach(r => {
            if (bookFilter && String(r.bookNumber) !== String(bookFilter)) return;
            const st = normalizeStatus(r.status, r.paymentMode || r.type);
            if (!r.deleted && st.toLowerCase() === 'received') {
                result.push({
                    ...r,
                    entryId: r.receiptId || \`RC-\${r.receiptNumber}\`,
                    bookNumber: r.bookNumber || 0,
                    receiptNumber: r.receiptNumber || 0,
                    donorType: 'Individual',
                    firstName: r.firstName || r.name || '',
                    middleName: r.middleName || '',
                    lastName: r.lastName || '',
                    amount: r.amount,
                    paymentMode: r.paymentMode || 'Cash',
                    status: st,
                    photoUrl: r.photoUrl || null,
                    submittedAt: r.date || r.createdAt || new Date().toISOString(),
                    submittedBy: r.submittedBy || 'Auto',
                    submittedByUserId: r.submittedByUserId || null,
                    area: r.area || null,
                    referenceNumber: r.referenceNumber || null
                });
            }
        });`;

if (serverJs.includes(targetStr)) {
    serverJs = serverJs.replace(targetStr, replacementStr);
    fs.writeFileSync('server.js', serverJs);
    console.log('Successfully patched pautiBooks and receipts merge in server.js');
} else {
    console.log('Target string 2 not found');
}
