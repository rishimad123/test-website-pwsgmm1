const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const tshirtsCode = `
    // ── GET /api/tshirts/settings ──────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/tshirts/settings') {
        try {
            const settings = await db.collection('tshirtSettings').findOne({}) || { price: 350 };
            return sendJSON(res, 200, { price: settings.price });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Server error' });
        }
    }

    // ── POST /api/tshirts/settings ─────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/tshirts/settings') {
        try {
            const body = await readBody(req);
            if (body.price === undefined || isNaN(Number(body.price))) {
                return sendJSON(res, 400, { message: 'Valid price required' });
            }
            const price = Number(body.price);
            await db.collection('tshirtSettings').updateOne({}, { $set: { price } }, { upsert: true });
            return sendJSON(res, 200, { success: true, price });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Server error' });
        }
    }

    // ── POST /api/tshirts ──────────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/tshirts') {
        try {
            const body = await readBody(req);
            const { name, size, phone, quantity, userId } = body;
            if (!name || !size || !phone) return sendJSON(res, 400, { message: 'Missing fields' });
            
            const application = {
                id: \`TSH-\${Date.now()}\`,
                name, size, phone, 
                quantity: Number(quantity) || 1,
                userId: userId || null,
                status: 'Pending',
                submittedAt: new Date().toISOString()
            };
            
            await db.collection('tshirts').insertOne(application);
            return sendJSON(res, 200, { success: true, application });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Server error' });
        }
    }

    // ── GET /api/tshirts ───────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/tshirts') {
        try {
            const tshirts = await db.collection('tshirts').find({}).toArray();
            return sendJSON(res, 200, { tshirts });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Server error' });
        }
    }

    // ── PUT /api/tshirts/:id ───────────────────────────────────────────
    if (req.method === 'PUT' && pathname.startsWith('/api/tshirts/') && !pathname.includes('/settings')) {
        const id = decodeURIComponent(pathname.replace('/api/tshirts/', ''));
        try {
            const body = await readBody(req);
            if (!body.status) return sendJSON(res, 400, { message: 'Status is required' });
            const result = await db.collection('tshirts').updateOne(
                { $or: [{ id }, { _id: id }] },
                { $set: { status: body.status, updatedAt: new Date().toISOString() } }
            );
            if (result.matchedCount === 0) return sendJSON(res, 404, { message: 'Not found' });
            return sendJSON(res, 200, { success: true });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Server error' });
        }
    }
`;

const target = '    // ── GET /api/live-updates (SSE) ──────────────────────────────────────────';
if (code.includes(target)) {
  code = code.replace(target, tshirtsCode + '\n' + target);
  fs.writeFileSync('server.js', code, 'utf8');
  console.log('Successfully injected tshirts API routes into server.js');
} else {
  console.log('Target not found in server.js');
}
