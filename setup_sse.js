const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Add SSE variables and broadcast function right after MIME map or before save helpers
const sseStr = `// ─── SSE (Server-Sent Events) for Live Updates ───────────
const sseClients = [];
function broadcastLiveEvent(type, payload = {}) {
    const data = \`data: \${JSON.stringify({ type, ...payload })}\\n\\n\`;
    sseClients.forEach(client => {
        try { client.res.write(data); } catch (e) {}
    });
}
`;

if (!content.includes('const sseClients')) {
    content = content.replace('// ─── Save helpers (write in-memory array back to MongoDB) ────────────────────', sseStr + '\n// ─── Save helpers (write in-memory array back to MongoDB) ────────────────────');
}

// 2. Add broadcast call inside saveDonationEntries
const saveDonationsOriginal = `async function saveDonationEntries() {
    await colDonationEntries.deleteMany({});
    if (donationEntries.length > 0) await colDonationEntries.insertMany(donationEntries.map(e => ({ ...e })));
}`;
const saveDonationsModified = `async function saveDonationEntries() {
    await colDonationEntries.deleteMany({});
    if (donationEntries.length > 0) await colDonationEntries.insertMany(donationEntries.map(e => ({ ...e })));
    broadcastLiveEvent('donations_updated');
}`;
if (content.includes(saveDonationsOriginal)) {
    content = content.replace(saveDonationsOriginal, saveDonationsModified);
}

// 3. Add GET /api/live-updates endpoint inside the request handler.
// I will look for GET /api/receipts to insert it before or after.
const liveUpdatesEndpoint = `
    // ── GET /api/live-updates (SSE) ──────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/live-updates') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write('data: {"type":"connected"}\\n\\n');
        const client = { id: Date.now(), res };
        sseClients.push(client);
        req.on('close', () => {
            const idx = sseClients.indexOf(client);
            if (idx !== -1) sseClients.splice(idx, 1);
        });
        return;
    }
`;

if (!content.includes('/api/live-updates')) {
    const anchor = `// ── GET /api/receipts ─────────────────────────────────────────────────`;
    content = content.replace(anchor, liveUpdatesEndpoint + '\n    ' + anchor);
}

fs.writeFileSync('server.js', content, 'utf8');
console.log('Successfully patched server.js for SSE live updates.');
