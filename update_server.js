const fs = require('fs');

function applyServerChanges() {
    let content = fs.readFileSync('server.js', 'utf8');
    // Normalize newlines for matching
    content = content.replace(/\\r\\n/g, '\\n');

    // 1. POST API - body destructuring
    const postBodyOld = `            const {
                bookNumber, receiptNumber, donorType,
                firstName, middleName, lastName, businessName,`;
    const postBodyNew = `            const {
                bookNumber, receiptNumber, donorType, bookType,
                firstName, middleName, lastName, businessName,`;
    content = content.replace(postBodyOld, postBodyNew);

    // 2. POST API - validation
    const postValidOld = `            const bn = Number(bookNumber);
            const rn = Number(receiptNumber);
            if (!bn || bn < 1 || bn > TOTAL_BOOKS_DE)
                return sendJSON(res, 400, { message: \`Book number must be 1–\${TOTAL_BOOKS_DE}.\` });
            const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;
            const expectedTo   = bn * SLIPS_PER_BOOK_DE;
            if (!rn || rn < expectedFrom || rn > expectedTo)
                return sendJSON(res, 400, { message: \`Receipt number for Book \${bn} must be \${expectedFrom}–\${expectedTo}.\` });

            // Check receipt number not already used
            const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn);
            if (dup) return sendJSON(res, 400, { message: \`Receipt #\${rn} in Book \${bn} is already used.\` });`;
            
    const postValidNew = `            const bn = Number(bookNumber);
            const rn = Number(receiptNumber);
            const bType = bookType === 'Old' ? 'Old' : 'New';
            const maxBooks = bType === 'Old' ? 30 : TOTAL_BOOKS_DE;
            if (!bn || bn < 1 || bn > maxBooks)
                return sendJSON(res, 400, { message: \`Book number must be 1–\${maxBooks}.\` });
            const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;
            const expectedTo   = bn * SLIPS_PER_BOOK_DE;
            if (!rn || rn < expectedFrom || rn > expectedTo)
                return sendJSON(res, 400, { message: \`Receipt number for Book \${bn} must be \${expectedFrom}–\${expectedTo}.\` });

            // Check receipt number not already used
            const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn && (e.bookType || 'New') === bType);
            if (dup) return sendJSON(res, 400, { message: \`Receipt #\${rn} in Book \${bn} (\${bType}) is already used.\` });`;
    content = content.replace(postValidOld, postValidNew);

    // 3. POST API - entry object
    const postEntryOld = `            const entry = {
                entryId          : \`DE-\${Date.now()}\`,
                bookNumber       : bn,
                receiptNumber    : rn,
                donorType        : donorType,`;
    const postEntryNew = `            const entry = {
                entryId          : \`DE-\${Date.now()}\`,
                bookNumber       : bn,
                receiptNumber    : rn,
                bookType         : bType,
                donorType        : donorType,`;
    content = content.replace(postEntryOld, postEntryNew);

    // 4. PUT API - body destructuring
    const putBodyOld = `            const {
                bookNumber, receiptNumber, donorType,
                firstName, middleName, lastName, businessName,`;
    const putBodyNew = `            const {
                bookNumber, receiptNumber, donorType, bookType,
                firstName, middleName, lastName, businessName,`;
    content = content.replace(putBodyOld, putBodyNew);

    // 5. PUT API - validation (admin logic)
    const putValidOld = `                const bn = Number(bookNumber);
                const rn = Number(receiptNumber);
                if (!bn || bn < 1 || bn > TOTAL_BOOKS_DE)
                    return sendJSON(res, 400, { message: \`Book number must be 1–\${TOTAL_BOOKS_DE}.\` });
                const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;
                const expectedTo   = bn * SLIPS_PER_BOOK_DE;
                if (!rn || rn < expectedFrom || rn > expectedTo)
                    return sendJSON(res, 400, { message: \`Receipt number for Book \${bn} must be \${expectedFrom}–\${expectedTo}.\` });

                const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn && e.entryId !== id);
                if (dup) return sendJSON(res, 400, { message: \`Receipt #\${rn} in Book \${bn} is already used.\` });`;
    
    const putValidNew = `                const bn = Number(bookNumber);
                const rn = Number(receiptNumber);
                const bType = bookType === 'Old' ? 'Old' : 'New';
                const maxBooks = bType === 'Old' ? 30 : TOTAL_BOOKS_DE;
                if (!bn || bn < 1 || bn > maxBooks)
                    return sendJSON(res, 400, { message: \`Book number must be 1–\${maxBooks}.\` });
                const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;
                const expectedTo   = bn * SLIPS_PER_BOOK_DE;
                if (!rn || rn < expectedFrom || rn > expectedTo)
                    return sendJSON(res, 400, { message: \`Receipt number for Book \${bn} must be \${expectedFrom}–\${expectedTo}.\` });

                const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn && (e.bookType || 'New') === bType && e.entryId !== id);
                if (dup) return sendJSON(res, 400, { message: \`Receipt #\${rn} in Book \${bn} (\${bType}) is already used.\` });`;
    content = content.replace(putValidOld, putValidNew);

    // 6. PUT API - entry update
    const putEntryOld = `                entry.bookNumber       = bn;
                entry.receiptNumber    = rn;
                entry.donorType        = donorType;`;
    const putEntryNew = `                entry.bookNumber       = bn;
                entry.receiptNumber    = rn;
                entry.bookType         = bType;
                entry.donorType        = donorType;`;
    content = content.replace(putEntryOld, putEntryNew);

    // 7. GET /api/donation-entries/next-receipt
    const nextReceiptOld = `    if (req.method === 'GET' && pathname === '/api/donation-entries/next-receipt') {
        const BOOKS = 50, SLIPS = 50;
        for (let b = 1; b <= BOOKS; b++) {
            const used = donationEntries.filter(e => !e.deleted && e.bookNumber === b).map(e => e.receiptNumber);
            const from = (b-1)*SLIPS+1, to = b*SLIPS;
            for (let r = from; r <= to; r++) {
                if (!used.includes(r)) return sendJSON(res, 200, { bookNumber: b, receiptNumber: r });
            }
        }`;
    const nextReceiptNew = `    if (req.method === 'GET' && pathname === '/api/donation-entries/next-receipt') {
        const qp = new URL(\`http://x\${req.url}\`).searchParams;
        const bType = qp.get('type') || 'New';
        const BOOKS = bType === 'Old' ? 30 : 50;
        const SLIPS = 50;
        for (let b = 1; b <= BOOKS; b++) {
            const used = donationEntries.filter(e => !e.deleted && e.bookNumber === b && (e.bookType || 'New') === bType).map(e => e.receiptNumber);
            const from = (b-1)*SLIPS+1, to = b*SLIPS;
            for (let r = from; r <= to; r++) {
                if (!used.includes(r)) return sendJSON(res, 200, { bookNumber: b, receiptNumber: r });
            }
        }`;
    content = content.replace(nextReceiptOld, nextReceiptNew);

    // 8. GET /api/donation-entries/used-receipts
    const usedReceiptsOld = `    if (req.method === 'GET' && pathname.startsWith('/api/donation-entries/used-receipts/')) {
        const bn  = Number(pathname.replace('/api/donation-entries/used-receipts/', ''));
        const used = donationEntries
            .filter(e => !e.deleted && e.bookNumber === bn)
            .map(e => e.receiptNumber);`;
    const usedReceiptsNew = `    if (req.method === 'GET' && pathname.startsWith('/api/donation-entries/used-receipts/')) {
        const bn  = Number(pathname.replace('/api/donation-entries/used-receipts/', ''));
        const qp = new URL(\`http://x\${req.url}\`).searchParams;
        const bType = qp.get('type') || 'New';
        const used = donationEntries
            .filter(e => !e.deleted && e.bookNumber === bn && (e.bookType || 'New') === bType)
            .map(e => e.receiptNumber);`;
    content = content.replace(usedReceiptsOld, usedReceiptsNew);

    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Server changes applied');
}
applyServerChanges();
