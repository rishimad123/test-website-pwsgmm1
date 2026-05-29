const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// POST API Replace
let regex1 = /const body = await readBody\(req\);\r?\n\s*const \{\r?\n\s*bookNumber, receiptNumber, donorType,\r?\n\s*firstName, middleName, lastName, businessName,/m;
let repl1 = `const body = await readBody(req);\r\n            const {\r\n                bookNumber, receiptNumber, donorType, bookType,\r\n                firstName, middleName, lastName, businessName,`;
content = content.replace(regex1, repl1);

let regex2 = /const bn = Number\(bookNumber\);\r?\n\s*const rn = Number\(receiptNumber\);\r?\n\s*if \(!bn \|\| bn < 1 \|\| bn > TOTAL_BOOKS_DE\)\r?\n\s*return sendJSON\(res, 400, \{ message: `Book number must be 1–\$\{TOTAL_BOOKS_DE\}\.` \}\);\r?\n\s*const expectedFrom = \(bn - 1\) \* SLIPS_PER_BOOK_DE \+ 1;\r?\n\s*const expectedTo   = bn \* SLIPS_PER_BOOK_DE;\r?\n\s*if \(!rn \|\| rn < expectedFrom \|\| rn > expectedTo\)\r?\n\s*return sendJSON\(res, 400, \{ message: `Receipt number for Book \$\{bn\} must be \$\{expectedFrom\}–\$\{expectedTo\}\.` \}\);\r?\n\r?\n\s*\/\/ Check receipt number not already used\r?\n\s*const dup = donationEntries\.find\(e => !e\.deleted && e\.bookNumber === bn && e\.receiptNumber === rn\);\r?\n\s*if \(dup\) return sendJSON\(res, 400, \{ message: `Receipt #\$\{rn\} in Book \$\{bn\} is already used\.` \}\);/m;
let repl2 = `const bn = Number(bookNumber);\r\n            const rn = Number(receiptNumber);\r\n            const bType = bookType === 'Old' ? 'Old' : 'New';\r\n            const maxBooks = bType === 'Old' ? 30 : TOTAL_BOOKS_DE;\r\n            if (!bn || bn < 1 || bn > maxBooks)\r\n                return sendJSON(res, 400, { message: \`Book number must be 1–\${maxBooks}.\` });\r\n            const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;\r\n            const expectedTo   = bn * SLIPS_PER_BOOK_DE;\r\n            if (!rn || rn < expectedFrom || rn > expectedTo)\r\n                return sendJSON(res, 400, { message: \`Receipt number for Book \${bn} must be \${expectedFrom}–\${expectedTo}.\` });\r\n\r\n            // Check receipt number not already used\r\n            const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn && (e.bookType || 'New') === bType);\r\n            if (dup) return sendJSON(res, 400, { message: \`Receipt #\${rn} in Book \${bn} (\${bType}) is already used.\` });`;
content = content.replace(regex2, repl2);

let regex3 = /const entry = \{\r?\n\s*entryId          : `DE-\$\{Date\.now\(\)\}`,\r?\n\s*bookNumber       : bn,\r?\n\s*receiptNumber    : rn,\r?\n\s*donorType        : donorType,/m;
let repl3 = `const entry = {\r\n                entryId          : \`DE-\${Date.now()}\`,\r\n                bookNumber       : bn,\r\n                receiptNumber    : rn,\r\n                bookType         : bType,\r\n                donorType        : donorType,`;
content = content.replace(regex3, repl3);

// PUT API Replace
let regex4 = /const id  = decodeURIComponent\(pathname\.replace\('\/api\/donation-entries\/', ''\)\);\r?\n[\s\S]*?const body = await readBody\(req\);\r?\n\s*const \{\r?\n\s*bookNumber, receiptNumber, donorType,\r?\n\s*firstName, middleName, lastName, businessName,/m;
let repl4 = match => match.replace('bookNumber, receiptNumber, donorType,', 'bookNumber, receiptNumber, donorType, bookType,');
content = content.replace(regex4, repl4);

let regex5 = /const bn = Number\(bookNumber\);\r?\n\s*const rn = Number\(receiptNumber\);\r?\n\s*if \(!bn \|\| bn < 1 \|\| bn > TOTAL_BOOKS_DE\)\r?\n\s*return sendJSON\(res, 400, \{ message: `Book number must be 1–\$\{TOTAL_BOOKS_DE\}\.` \}\);\r?\n\s*const expectedFrom = \(bn - 1\) \* SLIPS_PER_BOOK_DE \+ 1;\r?\n\s*const expectedTo   = bn \* SLIPS_PER_BOOK_DE;\r?\n\s*if \(!rn \|\| rn < expectedFrom \|\| rn > expectedTo\)\r?\n\s*return sendJSON\(res, 400, \{ message: `Receipt number for Book \$\{bn\} must be \$\{expectedFrom\}–\$\{expectedTo\}\.` \}\);\r?\n\r?\n\s*const dup = donationEntries\.find\(e => !e\.deleted && e\.bookNumber === bn && e\.receiptNumber === rn && e\.entryId !== id\);\r?\n\s*if \(dup\) return sendJSON\(res, 400, \{ message: `Receipt #\$\{rn\} in Book \$\{bn\} is already used\.` \}\);/m;
let repl5 = `const bn = Number(bookNumber);\r\n                const rn = Number(receiptNumber);\r\n                const bType = bookType === 'Old' ? 'Old' : 'New';\r\n                const maxBooks = bType === 'Old' ? 30 : TOTAL_BOOKS_DE;\r\n                if (!bn || bn < 1 || bn > maxBooks)\r\n                    return sendJSON(res, 400, { message: \`Book number must be 1–\${maxBooks}.\` });\r\n                const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;\r\n                const expectedTo   = bn * SLIPS_PER_BOOK_DE;\r\n                if (!rn || rn < expectedFrom || rn > expectedTo)\r\n                    return sendJSON(res, 400, { message: \`Receipt number for Book \${bn} must be \${expectedFrom}–\${expectedTo}.\` });\r\n\r\n                const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn && (e.bookType || 'New') === bType && e.entryId !== id);\r\n                if (dup) return sendJSON(res, 400, { message: \`Receipt #\${rn} in Book \${bn} (\${bType}) is already used.\` });`;
content = content.replace(regex5, repl5);

let regex6 = /entry\.bookNumber       = bn;\r?\n\s*entry\.receiptNumber    = rn;\r?\n\s*entry\.donorType        = donorType;/m;
let repl6 = `entry.bookNumber       = bn;\r\n                entry.receiptNumber    = rn;\r\n                entry.bookType         = bType;\r\n                entry.donorType        = donorType;`;
content = content.replace(regex6, repl6);

// Next Receipt
let regex7 = /const BOOKS = 50, SLIPS = 50;\r?\n\s*for \(let b = 1; b <= BOOKS; b\+\+\) \{\r?\n\s*const used = donationEntries\.filter\(e => !e\.deleted && e\.bookNumber === b\)\.map\(e => e\.receiptNumber\);/m;
let repl7 = `const qp = new URL(\`http://x\${req.url}\`).searchParams;\r\n        const bType = qp.get('type') || 'New';\r\n        const BOOKS = bType === 'Old' ? 30 : 50;\r\n        const SLIPS = 50;\r\n        for (let b = 1; b <= BOOKS; b++) {\r\n            const used = donationEntries.filter(e => !e.deleted && e.bookNumber === b && (e.bookType || 'New') === bType).map(e => e.receiptNumber);`;
content = content.replace(regex7, repl7);

// Used Receipts
let regex8 = /const bn  = Number\(pathname\.replace\('\/api\/donation-entries\/used-receipts\/', ''\)\);\r?\n\s*const used = donationEntries\r?\n\s*\.filter\(e => !e\.deleted && e\.bookNumber === bn\)/m;
let repl8 = `const bn  = Number(pathname.replace('/api/donation-entries/used-receipts/', ''));\r\n        const qp = new URL(\`http://x\${req.url}\`).searchParams;\r\n        const bType = qp.get('type') || 'New';\r\n        const used = donationEntries\r\n            .filter(e => !e.deleted && e.bookNumber === bn && (e.bookType || 'New') === bType)`;
content = content.replace(regex8, repl8);

fs.writeFileSync('server.js', content, 'utf8');
console.log('Done!');
