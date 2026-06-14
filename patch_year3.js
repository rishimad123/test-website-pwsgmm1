const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// 1. Add activeDonationYear to globalSettings default
serverCode = serverCode.replace(
    /let globalSettings = \{ \n    eventDate: '2026-09-07T00:00:00\.000Z',/,
    "let globalSettings = { \n    activeDonationYear: '2026-27',\n    eventDate: '2026-09-07T00:00:00.000Z',"
);

// 2. Ensure settings fallback and migration
serverCode = serverCode.replace(
    /        console\.log\(`✅ Loaded global settings from MongoDB`\);\n    \}/,
    `        if (!globalSettings.activeDonationYear) globalSettings.activeDonationYear = globalSettings.receiptFormat?.receiptYear || '2026-27';
        console.log(\`✅ Loaded global settings from MongoDB\`);
    }`
);

// 3. Migrate donationEntries
serverCode = serverCode.replace(
    /    donationEntries = \(await colDonationEntries\.find\(\{\}\)\.toArray\(\)\)\.map\(stripId\);\n    console\.log\(`📂 Loaded \$\{donationEntries\.length\} donation entry\/entries from MongoDB`\);/,
    `    donationEntries = (await colDonationEntries.find({}).toArray()).map(stripId);
    let migratedCount = 0;
    const defaultYear = globalSettings.activeDonationYear || '2026-27';
    donationEntries.forEach(e => {
        if (!e.year) {
            e.year = defaultYear;
            migratedCount++;
        }
    });
    if (migratedCount > 0) {
        await saveDonationEntries();
        console.log(\`✅ Migrated \${migratedCount} donation entries to year \${defaultYear}\`);
    }
    console.log(\`📂 Loaded \${donationEntries.length} donation entry/entries from MongoDB\`);`
);

// 4. Update GET /api/donation-entries filter
serverCode = serverCode.replace(
    /        const userIdFilter = qp\.get\('userId'\);\n        if \(landmarkFilter\) result = result\.filter\(e => e\.landmark === landmarkFilter\);\n        if \(userIdFilter\) result = result\.filter\(e =>\n            String\(e\.submittedByUserId \|\| e\.userId \|\| ''\) === String\(userIdFilter\)\n        \);/,
    `        const userIdFilter = qp.get('userId');
        const yearFilter = qp.get('year');
        if (landmarkFilter) result = result.filter(e => e.landmark === landmarkFilter);
        if (userIdFilter) result = result.filter(e => String(e.submittedByUserId || e.userId || '') === String(userIdFilter));
        if (yearFilter && yearFilter !== 'all') {
            const targetYear = yearFilter === 'active' ? globalSettings.activeDonationYear : yearFilter;
            result = result.filter(e => e.year === targetYear);
        }`
);

// 5. Update POST /api/donation-entries duplicate check and payload
serverCode = serverCode.replace(
    /            const dup = donationEntries\.find\(e => !e\.deleted && e\.bookNumber === bn && e\.receiptNumber === rn && \(e\.bookType \|\| 'New'\) === bType\);/,
    `            const activeYear = globalSettings.activeDonationYear || '2026-27';
            const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn && (e.bookType || 'New') === bType && e.year === activeYear);`
);

serverCode = serverCode.replace(
    /                entryId          : `DE-\$\{Date\.now\(\)\}`,/,
    `                entryId          : \`DE-\${Date.now()}\`,
                year             : activeYear,`
);

// 6. Update GET /api/donation-entries/next-receipt
serverCode = serverCode.replace(
    /            const used = donationEntries\.filter\(e => !e\.deleted && e\.bookNumber === b && \(e\.bookType \|\| 'New'\) === bType\)\.map\(e => e\.receiptNumber\);/,
    `            const activeYear = globalSettings.activeDonationYear || '2026-27';
            const used = donationEntries.filter(e => !e.deleted && e.bookNumber === b && (e.bookType || 'New') === bType && e.year === activeYear).map(e => e.receiptNumber);`
);

// 7. Update GET /api/donation-entries/used-receipts
serverCode = serverCode.replace(
    /        const used = donationEntries\n            \.filter\(e => !e\.deleted && e\.bookNumber === bn && \(e\.bookType \|\| 'New'\) === bType\)\n            \.map\(e => e\.receiptNumber\);/,
    `        const activeYear = globalSettings.activeDonationYear || '2026-27';
        const used = donationEntries
            .filter(e => !e.deleted && e.bookNumber === bn && (e.bookType || 'New') === bType && e.year === activeYear)
            .map(e => e.receiptNumber);`
);

// 8. Add PUT /api/settings/active-year
const saveSettingsRoute = `    if (req.method === 'PUT' && pathname === '/api/settings/active-year') {
        try {
            const body = await readBody(req);
            if (!body.year) return sendJSON(res, 400, { message: 'Year is required' });
            globalSettings.activeDonationYear = String(body.year).trim();
            // Automatically sync receipt print year
            if (!globalSettings.receiptFormat) globalSettings.receiptFormat = {};
            globalSettings.receiptFormat.receiptYear = globalSettings.activeDonationYear;
            await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            broadcastLiveEvent('settings_updated', globalSettings);
            console.log(\`✅ Active Donation Year updated to \${globalSettings.activeDonationYear}\`);
            return sendJSON(res, 200, { success: true, settings: globalSettings });
        } catch (e) {
            return sendJSON(res, 500, { message: e.message });
        }
    }`;

serverCode = serverCode.replace(
    /    \/\/ ── PUT \/api\/settings ──────────────────────────────────────────────────/,
    saveSettingsRoute + '\n\n    // ── PUT /api/settings ──────────────────────────────────────────────────'
);

fs.writeFileSync('server.js', serverCode);
console.log("Patched server.js successfully.");
