const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// 1. Collections and In-memory stores
content = content.replace(
    /let colLandmarks, colCommitteeMembers, colGallery, colEvents;/,
    `let colLandmarks, colCommitteeMembers, colGallery, colEvents;\nlet colTshirts, colTshirtSettings;`
);

content = content.replace(
    /let expenses          = \[\];/,
    `let expenses          = [];\nlet tshirts           = [];\nlet tshirtSettings    = { price: 350 };`
);

// 2. Save functions
const saveEventsStr = `async function saveEvents() {
    await colEvents.deleteMany({});
    if (events.length > 0) await colEvents.insertMany(events.map(e => ({ ...e })));
    broadcastLiveEvent('events_updated');
}`;

const saveTshirtsStr = `
async function saveTshirts() {
    await colTshirts.deleteMany({});
    if (tshirts.length > 0) await colTshirts.insertMany(tshirts.map(t => ({ ...t })));
    broadcastLiveEvent('tshirts_updated');
}
async function saveTshirtSettings() {
    await colTshirtSettings.deleteMany({});
    await colTshirtSettings.insertOne({ ...tshirtSettings });
}
`;

content = content.replace(saveEventsStr, saveEventsStr + saveTshirtsStr);

// 3. Connect DB
content = content.replace(
    /colEvents           = db\.collection\('events'\);/,
    `colEvents           = db.collection('events');\n    colTshirts          = db.collection('tshirts');\n    colTshirtSettings   = db.collection('tshirtSettings');`
);

// 4. Load from DB
const loadEventsStr = `    events = (await colEvents.find({}).toArray()).map(stripId);
    console.log(\`✅ Loaded \${events.length} event(s) from MongoDB\`);`;

const loadTshirtsStr = `
    // 👕 Load T-shirts & Settings
    tshirts = (await colTshirts.find({}).toArray()).map(stripId);
    console.log(\`✅ Loaded \${tshirts.length} T-shirt application(s) from MongoDB\`);
    
    let tsDb = await colTshirtSettings.findOne({});
    if (tsDb) {
        tshirtSettings = stripId(tsDb);
        console.log(\`✅ Loaded T-shirt settings from MongoDB\`);
    }
`;

content = content.replace(loadEventsStr, loadEventsStr + loadTshirtsStr);

// 5. API Routes
const apiEventsStr = `    // 🟢🟢🟢 EVENTS API 🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢`;

const apiTshirtsStr = `
    // 🟢🟢🟢 T-SHIRTS API 🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢
    
    if (req.method === 'GET' && pathname === '/api/tshirts/settings') {
        return sendJSON(res, 200, { ...tshirtSettings });
    }
    
    if (req.method === 'POST' && pathname === '/api/tshirts/settings') {
        try {
            const body = await readBody(req);
            if (typeof body.price === 'number') {
                tshirtSettings.price = body.price;
                await saveTshirtSettings();
                return sendJSON(res, 200, { success: true, price: tshirtSettings.price });
            }
            return sendJSON(res, 400, { message: 'Invalid price.' });
        } catch(e) { return sendJSON(res, 500, { message: e.message }); }
    }
    
    if (req.method === 'GET' && pathname === '/api/tshirts') {
        return sendJSON(res, 200, { tshirts });
    }
    
    if (req.method === 'POST' && pathname === '/api/tshirts') {
        try {
            const body = await readBody(req);
            const { name, number, size, quantity } = body;
            if (!name || !number || !size || !quantity) return sendJSON(res, 400, { message: 'All fields are required.' });
            
            const newTshirt = {
                id: 'TS-' + Date.now() + '-' + Math.floor(Math.random()*1000),
                name: name.trim(),
                number: number.trim(),
                size: parseInt(size),
                quantity: parseInt(quantity),
                totalAmount: parseInt(quantity) * tshirtSettings.price,
                status: 'Pending',
                createdAt: new Date().toISOString()
            };
            
            tshirts.push(newTshirt);
            await saveTshirts();
            return sendJSON(res, 201, { success: true, entry: newTshirt });
        } catch(e) { return sendJSON(res, 500, { message: e.message }); }
    }
    
    if (req.method === 'PUT' && pathname.startsWith('/api/tshirts/')) {
        try {
            const id = pathname.split('/').pop();
            const body = await readBody(req);
            const entry = tshirts.find(t => t.id === id);
            if (!entry) return sendJSON(res, 404, { message: 'Not found' });
            
            if (body.status) entry.status = body.status;
            
            await saveTshirts();
            return sendJSON(res, 200, { success: true, entry });
        } catch(e) { return sendJSON(res, 500, { message: e.message }); }
    }

`;

content = content.replace(apiEventsStr, apiTshirtsStr + apiEventsStr);

fs.writeFileSync('server.js', content, 'utf8');
console.log('server.js patched successfully for T-shirts feature.');
