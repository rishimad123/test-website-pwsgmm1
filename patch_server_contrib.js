const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const bulkRoute = `
    // \u2500\u2500 PUT /api/contributors-bulk \u2500\u2500
    if (req.method === 'PUT' && pathname === '/api/contributors-bulk') {
        try {
            const body = await readBody(req);
            const { originalName, newName, monthlyAmounts } = body;
            
            if (!originalName || !originalName.trim()) return sendJSON(res, 400, { message: 'Original name is required.' });
            const finalName = (newName || originalName).trim();
            if (!finalName) return sendJSON(res, 400, { message: 'Contributor name cannot be empty.' });

            // 1. Delete all existing records for the original name (case-insensitive)
            await colContributors.deleteMany({ name: new RegExp('^' + originalName.trim() + '$', 'i') });

            // 2. Re-insert records for months that have an amount > 0
            const now = new Date();
            const year = now.getFullYear();
            const inserts = [];
            
            for (let i = 1; i <= 12; i++) {
                const monthKey = \`\${year}-\${String(i).padStart(2, '0')}\`;
                const amt = Number(monthlyAmounts[String(i).padStart(2, '0')] || 0);
                if (amt > 0) {
                    inserts.push({
                        id          : \`CONT-\${Date.now()}-\${i}\`,
                        name        : finalName,
                        amount      : amt,
                        date        : \`\${monthKey}-01\`,
                        note        : '',
                        createdAt   : new Date().toISOString()
                    });
                }
            }

            if (inserts.length > 0) {
                await colContributors.insertMany(inserts);
            }
            
            console.log(\`\u270f\ufe0f Contributor bulk updated: \${originalName} -> \${finalName} (\${inserts.length} records)\`);
            return sendJSON(res, 200, { success: true });
        } catch (err) {
            console.error('PUT /api/contributors-bulk error:', err.message);
            return sendJSON(res, 500, { message: 'Server error.' });
        }
    }
`;

if (!serverJs.includes('/api/contributors-bulk')) {
    serverJs = serverJs.replace(
        "    // \u2500\u2500 Static file serving \u2500\u2500",
        bulkRoute + "\n    // \u2500\u2500 Static file serving \u2500\u2500"
    );
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("server.js updated with /api/contributors-bulk route.");
} else {
    console.log("server.js already contains the route.");
}
