const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// 1. Line 248 defaults
content = content.replace(
    /if \(settingsDoc\) \{\r?\n\s*globalSettings = \{ \.\.\.globalSettings, \.\.\.stripId\(settingsDoc\) \};\r?\n/,
    `if (settingsDoc) {
        globalSettings = { ...globalSettings, ...stripId(settingsDoc) };
        if (globalSettings.maxNewBooks === undefined) globalSettings.maxNewBooks = 50;
        if (globalSettings.maxOldBooks === undefined) globalSettings.maxOldBooks = 30;
`
);

// 2. Line 1693 sendJSON totalBooks -> maxNewBooks & maxOldBooks
content = content.replace(
    /return sendJSON\(res, 200, \{ entries: result, total: result\.length, slipsPerBook: SLIPS_PER_BOOK_DE, totalBooks: TOTAL_BOOKS_DE \}\);/g,
    `return sendJSON(res, 200, { entries: result, total: result.length, slipsPerBook: SLIPS_PER_BOOK_DE, maxNewBooks: globalSettings.maxNewBooks, maxOldBooks: globalSettings.maxOldBooks });`
);

// 3. Line 2785 POST /api/settings
content = content.replace(
    /if \(body\.eventDate !== undefined\) globalSettings\.eventDate = body\.eventDate;\r?\n\s*if \(body\.eventName !== undefined\) globalSettings\.eventName = body\.eventName;/,
    `if (body.eventDate !== undefined) globalSettings.eventDate = body.eventDate;
            if (body.eventName !== undefined) globalSettings.eventName = body.eventName;
            if (body.maxNewBooks !== undefined) globalSettings.maxNewBooks = Number(body.maxNewBooks);
            if (body.maxOldBooks !== undefined) globalSettings.maxOldBooks = Number(body.maxOldBooks);`
);

// 4. Line 1716
content = content.replace(
    /const maxBooks = bType === 'Old' \? 30 : TOTAL_BOOKS_DE;/g,
    `const maxBooks = bType === 'Old' ? globalSettings.maxOldBooks : globalSettings.maxNewBooks;`
);

// 5. Line 1906
content = content.replace(
    /const maxBooks = newType === 'Old' \? 30 : TOTAL_BOOKS_DE;/g,
    `const maxBooks = newType === 'Old' ? globalSettings.maxOldBooks : globalSettings.maxNewBooks;`
);

// 6. Line 2171
content = content.replace(
    /const maxBooks = bType === 'Old' \? 30 : 50;/g,
    `const maxBooks = bType === 'Old' ? globalSettings.maxOldBooks : globalSettings.maxNewBooks;`
);

// 7. Any remaining TOTAL_BOOKS_DE (just in case)
content = content.replace(/TOTAL_BOOKS_DE/g, 'globalSettings.maxNewBooks');

fs.writeFileSync('server.js', content, 'utf8');
console.log('server.js updated successfully.');
