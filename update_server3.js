const fs = require('fs');

function applyServerChanges() {
    let lines = fs.readFileSync('server.js', 'utf8').split('\\n');
    let modified = false;

    for (let i = 0; i < lines.length - 15; i++) {
        // POST API: body destructuring
        if (lines[i].includes('bookNumber, receiptNumber, donorType,')) {
            lines[i] = lines[i].replace('bookNumber, receiptNumber, donorType,', 'bookNumber, receiptNumber, donorType, bookType,');
            modified = true;
        }

        // POST API: validation
        if (lines[i].includes('const bn = Number(bookNumber);') && lines[i+1].includes('const rn = Number(receiptNumber);')) {
            if (lines[i+2].includes('if (!bn || bn < 1 || bn > TOTAL_BOOKS_DE)')) {
                // POST API Block
                lines[i+2] = lines[i+2].replace('if (!bn || bn < 1 || bn > TOTAL_BOOKS_DE)', `const bType = bookType === 'Old' ? 'Old' : 'New';\\r\\n            const maxBooks = bType === 'Old' ? 30 : TOTAL_BOOKS_DE;\\r\\n            if (!bn || bn < 1 || bn > maxBooks)`);
                lines[i+3] = lines[i+3].replace('TOTAL_BOOKS_DE', 'maxBooks');
                
                // Jump ahead to find 'const dup = '
                for (let j = i+5; j < i+15; j++) {
                    if (lines[j] && lines[j].includes('const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn);')) {
                        lines[j] = lines[j].replace('&& e.receiptNumber === rn);', '&& e.receiptNumber === rn && (e.bookType || \\\'New\\\') === bType);');
                        lines[j+1] = lines[j+1].replace('is already used.`', '(${bType}) is already used.`');
                        break;
                    }
                }
            }
        }

        // PUT API specific validation block (indentation is different)
        if (lines[i].includes('const bn = Number(bookNumber);') && lines[i].startsWith('                ')) {
            if (lines[i+2].includes('if (!bn || bn < 1 || bn > TOTAL_BOOKS_DE)')) {
                lines[i+2] = lines[i+2].replace('if (!bn || bn < 1 || bn > TOTAL_BOOKS_DE)', `const bType = bookType === 'Old' ? 'Old' : 'New';\\r\\n                const maxBooks = bType === 'Old' ? 30 : TOTAL_BOOKS_DE;\\r\\n                if (!bn || bn < 1 || bn > maxBooks)`);
                lines[i+3] = lines[i+3].replace('TOTAL_BOOKS_DE', 'maxBooks');
                
                for (let j = i+5; j < i+15; j++) {
                    if (lines[j] && lines[j].includes('const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn && e.entryId !== id);')) {
                        lines[j] = lines[j].replace('&& e.receiptNumber === rn', '&& e.receiptNumber === rn && (e.bookType || \\\'New\\\') === bType');
                        lines[j+1] = lines[j+1].replace('is already used.`', '(${bType}) is already used.`');
                        break;
                    }
                }
            }
        }

        // POST API: entry object
        if (lines[i].includes('receiptNumber    : rn,')) {
            if (lines[i+1].includes('donorType        : donorType,')) {
                lines[i+1] = lines[i+1].replace('donorType        : donorType,', `bookType         : bType,\\r\\n                donorType        : donorType,`);
            }
        }

        // PUT API: entry update
        if (lines[i].includes('entry.receiptNumber    = rn;')) {
            if (lines[i+1].includes('entry.donorType        = donorType;')) {
                lines[i+1] = lines[i+1].replace('entry.donorType        = donorType;', `entry.bookType         = bType,\\r\\n                entry.donorType        = donorType;`);
            }
        }

        // GET /api/donation-entries/next-receipt
        if (lines[i].includes("if (req.method === 'GET' && pathname === '/api/donation-entries/next-receipt') {")) {
            lines[i+1] = lines[i+1].replace('const BOOKS = 50, SLIPS = 50;', `const qp = new URL(\\\`http://x\\\${req.url}\\\`).searchParams;\\r\\n        const bType = qp.get('type') || 'New';\\r\\n        const BOOKS = bType === 'Old' ? 30 : 50;\\r\\n        const SLIPS = 50;`);
            lines[i+3] = lines[i+3].replace('&& e.bookNumber === b)', '&& e.bookNumber === b && (e.bookType || \\\'New\\\') === bType)');
        }

        // GET /api/donation-entries/used-receipts
        if (lines[i].includes("if (req.method === 'GET' && pathname.startsWith('/api/donation-entries/used-receipts/')) {")) {
            // Need to change the next few lines
            if (lines[i+3].includes('.filter(e => !e.deleted && e.bookNumber === bn)')) {
                lines[i+2] = lines[i+2].replace('const used = donationEntries', `const qp = new URL(\\\`http://x\\\${req.url}\\\`).searchParams;\\r\\n        const bType = qp.get('type') || 'New';\\r\\n        const used = donationEntries`);
                lines[i+3] = lines[i+3].replace('&& e.bookNumber === bn)', '&& e.bookNumber === bn && (e.bookType || \\\'New\\\') === bType)');
            }
        }
    }

    if (modified) {
        // preserve original \r\n line endings correctly!
        // wait, I used split('\n'). If the file had \r\n, lines will have \r at the end.
        // So I join with \n. The lines already contain \r at the end.
        fs.writeFileSync('server.js', lines.join('\\n'), 'utf8');
        console.log('Server changes applied');
    } else {
        console.log('Nothing matched');
    }
}

applyServerChanges();
