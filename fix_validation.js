const fs = require('fs');

function fixServerJs() {
    let content = fs.readFileSync('server.js', 'utf8');

    // 1. Add Duplicate Check logic in PUT API for both volunteer and admin
    // In server.js, the PUT block has this right before assigning new values:
    const putTarget = `                if (body.landmark          !== undefined) e.landmark          = String(body.landmark);
                if (body.buildingName  !== undefined) e.buildingName  = String(body.buildingName);
                if (body.referenceNumber !== undefined) e.referenceNumber = String(body.referenceNumber);
                if (body.landmark       !== undefined) e.landmark       = String(body.landmark);`;
    
    // BUT WAIT, the admin block is before that!
    // The easiest way is to insert the duplicate validation at the very beginning of the PUT request before "if (isAdmin)"
    const putStart = `        try {
            const body = await readBody(req);
            const isAdmin = body._isAdmin === true;
            const e = donationEntries[idx];`;
            
    const newPutStart = `        try {
            const body = await readBody(req);
            const isAdmin = body._isAdmin === true;
            const e = donationEntries[idx];

            // Common Validation for Edit: Ensure book/receipt aren't duplicated and bounds are valid
            const newBook = body.bookNumber !== undefined ? Number(body.bookNumber) : e.bookNumber;
            const newReceipt = body.receiptNumber !== undefined ? Number(body.receiptNumber) : e.receiptNumber;
            const newType = body.bookType !== undefined ? body.bookType : (e.bookType || 'New');

            if (newBook !== e.bookNumber || newReceipt !== e.receiptNumber || newType !== (e.bookType || 'New')) {
                const maxBooks = newType === 'Old' ? 30 : TOTAL_BOOKS_DE;
                if (!newBook || newBook < 1 || newBook > maxBooks) {
                    return sendJSON(res, 400, { message: \`Book number must be 1–\${maxBooks}.\` });
                }
                const dup = donationEntries.find(x => !x.deleted && x.entryId !== id && x.bookNumber === newBook && x.receiptNumber === newReceipt && (x.bookType || 'New') === newType);
                if (dup) return sendJSON(res, 400, { message: \`Receipt #\${newReceipt} in Book \${newBook} (\${newType}) is already used.\` });
                
                const expectedFrom = (newBook - 1) * SLIPS_PER_BOOK_DE + 1;
                const expectedTo   = newBook * SLIPS_PER_BOOK_DE;
                if (newReceipt < expectedFrom || newReceipt > expectedTo)
                    return sendJSON(res, 400, { message: \`Receipt number for Book \${newBook} must be \${expectedFrom}–\${expectedTo}.\` });
            }`;

    content = content.replace(putStart, newPutStart);
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('server.js validation fixed');
}

function fixDashboardHtml() {
    let content = fs.readFileSync('dashboard.html', 'utf8');
    
    // Add _deVolEditBookType variable
    const varTarget = `    let _deVolEditBlob = null;`;
    const varNew = `    let _deVolEditBlob = null;\n    let _deVolEditBookType = 'New';`;
    content = content.replace(varTarget, varNew);

    // Set _deVolEditBookType
    const setTarget = `            _deVolEditBlob = null;
            document.getElementById('deVolEditId').value     = id;`;
    const setNew = `            _deVolEditBlob = null;
            _deVolEditBookType = e.bookType || 'New';
            document.getElementById('deVolEditId').value     = id;`;
    content = content.replace(setTarget, setNew);

    // Fetch using _deVolEditBookType
    const fetchTarget = `const r = await fetch(\`/api/donation-entries/used-receipts/\${bookNum}\`);`;
    const fetchNew = `const r = await fetch(\`/api/donation-entries/used-receipts/\${bookNum}?type=\${_deVolEditBookType}\`);`;
    content = content.replace(fetchTarget, fetchNew);

    fs.writeFileSync('dashboard.html', content, 'utf8');
    console.log('dashboard.html validation fixed');
}

fixServerJs();
fixDashboardHtml();
