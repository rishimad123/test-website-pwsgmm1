/**
 * server.js — Local development server for Patelwadi Ganesh Mitramandal
 *
 * Serves the static site files AND provides:
 *   POST /api/submit-passbook  — accepts { name, amount, userId, submittedAt }
 *   GET  /api/receipts         — lists all submitted receipts
 *
 * Run:  node server.js
 * URL:  http://localhost:3000
 *
 * Storage: MongoDB (process.env.MONGODB_URI)
 */

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const url     = require('url');
const os      = require('os');
const { MongoClient } = require('mongodb');

/** Return the first non-loopback IPv4 address (LAN IP). */
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return '127.0.0.1';
}

const PORT        = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME     = 'patelwadi';

// ─── MongoDB client & collections ────────────────────────────────────────────
const mongoClient = new MongoClient(MONGODB_URI);
let db;
let colReceipts, colExpenses, colFinancials, colPautiBooks;
let colDonations, colDonationEntries, colBuildings, colAreas;
let colLandmarks, colCommitteeMembers;

// ─── In-memory stores (populated from MongoDB at startup) ───────────────────
const SLIPS_PER_BOOK_DE = 50;
const TOTAL_BOOKS_DE    = 50;
const SLIPS_PER_BOOK    = 50;
const TOTAL_SLIPS       = 2500;
const MAX_BOOKS         = TOTAL_SLIPS / SLIPS_PER_BOOK; // 50

let donationsStore    = { columns: [], records: [] };
let donationEntries   = [];
let buildings         = [];
let areas             = [];
let landmarks         = [];
let committeeMembers  = [];
let financials        = [];
let pautiBooks        = [];
let receipts          = [];
let expenses          = [];

// ─── SSE (Server-Sent Events) for Live Updates ───────────
const sseClients = [];
function broadcastLiveEvent(type, payload = {}) {
    const data = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
    sseClients.forEach(client => {
        try { client.res.write(data); } catch (e) {}
    });
}

// ─── Save helpers (write in-memory array back to MongoDB) ────────────────────

async function saveDonations() {
    await colDonations.deleteMany({});
    await colDonations.insertOne({ _storeKey: 'donationsStore', ...donationsStore });
}

async function saveDonationEntries() {
    await colDonationEntries.deleteMany({});
    if (donationEntries.length > 0) await colDonationEntries.insertMany(donationEntries.map(e => ({ ...e })));
    broadcastLiveEvent('donations_updated');
}

async function saveBuildings() {
    await colBuildings.deleteMany({});
    if (buildings.length > 0) await colBuildings.insertMany(buildings.map(b => ({ ...b })));
}

async function saveAreas() {
    await colAreas.deleteMany({});
    if (areas.length > 0) await colAreas.insertMany(areas.map(a => ({ ...a })));
}

async function saveLandmarks() {
    await colLandmarks.deleteMany({});
    if (landmarks.length > 0) await colLandmarks.insertMany(landmarks.map(l => ({ ...l })));
}

async function saveCommitteeMembers() {
    await colCommitteeMembers.deleteMany({});
    if (committeeMembers.length > 0) await colCommitteeMembers.insertMany(committeeMembers.map(m => ({ ...m })));
}

async function saveFinancials() {
    await colFinancials.deleteMany({});
    if (financials.length > 0) await colFinancials.insertMany(financials.map(f => ({ ...f })));
}

async function savePautiBooks() {
    await colPautiBooks.deleteMany({});
    if (pautiBooks.length > 0) await colPautiBooks.insertMany(pautiBooks.map(b => ({ ...b })));
}

async function saveReceipts() {
    await colReceipts.deleteMany({});
    if (receipts.length > 0) await colReceipts.insertMany(receipts.map(r => ({ ...r })));
}

async function saveExpenses() {
    await colExpenses.deleteMany({});
    if (expenses.length > 0) await colExpenses.insertMany(expenses.map(e => ({ ...e })));
}

// ─── Strip MongoDB _id fields from returned objects ──────────────────────────
function stripId(obj) {
    if (!obj) return obj;
    const { _id, ...rest } = obj;
    return rest;
}

// ─── Connect to MongoDB and seed in-memory stores ────────────────────────────
async function connectDB() {
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);

    colReceipts         = db.collection('receipts');
    colExpenses         = db.collection('expenses');
    colFinancials       = db.collection('financials');
    colPautiBooks       = db.collection('pautiBooks');
    colDonations        = db.collection('donations');
    colDonationEntries  = db.collection('donationEntries');
    colBuildings        = db.collection('buildings');
    colAreas            = db.collection('areas');
    colLandmarks        = db.collection('landmarks');
    colCommitteeMembers = db.collection('committeeMembers');

    // ── Load donations store ──────────────────────────────────────────────────
    const donDoc = await colDonations.findOne({ _storeKey: 'donationsStore' });
    if (donDoc) {
        donationsStore = { columns: donDoc.columns || [], records: donDoc.records || [] };
        console.log(`📂 Loaded ${donationsStore.records.length} donation record(s) from MongoDB`);
    }

    // ── Load donation entries ─────────────────────────────────────────────────
    donationEntries = (await colDonationEntries.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${donationEntries.length} donation entry/entries from MongoDB`);

    // ── Load buildings ────────────────────────────────────────────────────────
    buildings = (await colBuildings.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${buildings.length} building(s) from MongoDB`);

    // ── Load areas ────────────────────────────────────────────────────────────
    areas = (await colAreas.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${areas.length} area(s) from MongoDB`);

    // ── Load landmarks ────────────────────────────────────────────────────────
    landmarks = (await colLandmarks.find({}).toArray()).map(stripId);

    // ── Load committee members ────────────────────────────────────────────────
    committeeMembers = (await colCommitteeMembers.find({}).toArray()).map(stripId);

    // ── Load financials ───────────────────────────────────────────────────────
    financials = (await colFinancials.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${financials.length} financial record(s) from MongoDB`);

    // ── Load pauti books ──────────────────────────────────────────────────────
    pautiBooks = (await colPautiBooks.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${pautiBooks.length} Pauti Book(s) from MongoDB`);

    // ── Load receipts ─────────────────────────────────────────────────────────
    receipts = (await colReceipts.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${receipts.length} existing receipt(s) from MongoDB`);

    // ── Load expenses ─────────────────────────────────────────────────────────
    expenses = (await colExpenses.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${expenses.length} existing expense(s) from MongoDB`);

    console.log('✅ MongoDB connected:', MONGODB_URI);
}

// Create uploads directory if it doesn't exist (skipped silently on read-only filesystems like Render)
try {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        console.log('📁 Created uploads/ directory');
    }
} catch (e) {
    console.warn('⚠️  Could not create uploads/ directory (read-only FS — expected on Render):', e.message);
}

// ─── MIME type map ───────────────────────────────────────────────────────────
const MIME = {
    '.html': 'text/html',
    '.css' : 'text/css',
    '.js'  : 'text/javascript',
    '.json': 'application/json',
    '.png' : 'image/png',
    '.jpg' : 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf' : 'application/pdf',
    '.ico' : 'image/x-icon',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sendJSON(res, statusCode, data) {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type' : 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Connection'   : 'close',
    });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end',  ()    => {
            try { resolve(JSON.parse(raw)); }
            catch (e) { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

/**
 * Read raw request body as a Buffer (needed for binary file data).
 */
function readRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end',  ()    => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

/**
 * Pure-Node multipart/form-data parser.
 * Returns an array of: { name, filename, contentType, data (Buffer) }
 */
function parseMultipart(bodyBuffer, boundary) {
    const parts = [];
    const boundaryBuf  = Buffer.from('--' + boundary);
    const CRLF         = Buffer.from('\r\n');
    const CRLFCRLF     = Buffer.from('\r\n\r\n');

    let pos = bodyBuffer.indexOf(boundaryBuf);
    if (pos === -1) return parts;

    while (true) {
        pos += boundaryBuf.length;          // move past boundary marker

        // Check for final boundary (ends with '--')
        if (bodyBuffer[pos] === 0x2D && bodyBuffer[pos + 1] === 0x2D) break;

        // Skip the \r\n after the boundary line
        if (bodyBuffer[pos] === 0x0D && bodyBuffer[pos + 1] === 0x0A) pos += 2;

        // Find the header/body separator (\r\n\r\n)
        const headerEnd = bodyBuffer.indexOf(CRLFCRLF, pos);
        if (headerEnd === -1) break;

        const headerStr = bodyBuffer.slice(pos, headerEnd).toString('utf8');
        pos = headerEnd + 4;                // skip \r\n\r\n

        // Find the next boundary
        const nextBoundary = bodyBuffer.indexOf(boundaryBuf, pos);
        if (nextBoundary === -1) break;

        // Part data ends 2 bytes before the next boundary (trailing \r\n)
        const dataEnd = nextBoundary - 2;
        const data    = bodyBuffer.slice(pos, dataEnd);
        pos           = nextBoundary;

        // Parse headers
        const nameMatch     = headerStr.match(/name="([^"]+)"/i);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
        const ctMatch       = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

        parts.push({
            name       : nameMatch        ? nameMatch[1]        : null,
            filename   : filenameMatch    ? filenameMatch[1]    : null,
            contentType: ctMatch          ? ctMatch[1].trim()   : 'application/octet-stream',
            data,
        });
    }
    return parts;
}

// ─── Server ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const parsed  = url.parse(req.url, true);
    const pathname = parsed.pathname;

    // CORS pre-flight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
        });
        return res.end();
    }

    // ── POST /api/submit-passbook ──────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/submit-passbook') {
        try {
            const body = await readBody(req);
            const { name, amount, userId, submittedAt, paymentMode, checkNumber, type } = body;

            // Validate required fields
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return sendJSON(res, 400, { message: 'Donor name is required.' });
            }
            // Amount required for non-balance types
            const rType = type === 'balance' ? 'balance' : 'slip';
            if (rType !== 'balance' && (!amount || isNaN(Number(amount)) || Number(amount) <= 0)) {
                return sendJSON(res, 400, { message: 'A positive donation amount is required.' });
            }

            // Build receipt record
            const receipt = {
                receiptId  : `RCP-${Date.now()}`,
                name       : name.trim(),
                amount     : amount ? Number(amount) : null,
                userId     : userId || null,
                submittedAt: submittedAt || new Date().toISOString(),
                status     : 'pending_review',
                paymentMode: paymentMode || 'cash',
                checkNumber: checkNumber || null,
                type       : rType,
                deleted    : false,
            };

            receipts.push(receipt);
            await saveReceipts();

            console.log(`✅ Receipt saved: ${receipt.receiptId} | ${receipt.name} | ₹${receipt.amount} | ${receipt.paymentMode}`);
            return sendJSON(res, 200, {
                success  : true,
                receiptId: receipt.receiptId,
                message  : 'Receipt submitted successfully.',
            });

        } catch (err) {
            console.error('Receipt submission error:', err.message);
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    
    // ── GET /api/live-updates (SSE) ──────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/live-updates') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write('data: {"type":"connected"}\n\n');
        const client = { id: Date.now(), res };
        sseClients.push(client);
        req.on('close', () => {
            const idx = sseClients.indexOf(client);
            if (idx !== -1) sseClients.splice(idx, 1);
        });
        return;
    }

    // ── GET /api/receipts ─────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/receipts') {
        return sendJSON(res, 200, { receipts });
    }

    // ── GET /api/check-block?username=X ──────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/check-block') {
        const username = parsed.query.username || '';
        if (!username) return sendJSON(res, 400, { message: 'username is required.' });
        try {
            const colUsers = db.collection('users');
            const user = await colUsers.findOne({ username });
            return sendJSON(res, 200, { blocked: !!(user && user.blocked === true) });
        } catch (err) {
            console.error('check-block error:', err.message);
            return sendJSON(res, 500, { message: 'Server error.' });
        }
    }

    // ── POST /api/users/block  ────────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/users/block') {
        try {
            const body = await readBody(req);
            const { username, blocked } = body;
            if (!username) return sendJSON(res, 400, { message: 'username is required.' });
            const colUsers = db.collection('users');
            await colUsers.updateOne(
                { username },
                { $set: { username, blocked: blocked === true } },
                { upsert: true }
            );
            console.log(`🔒 User "${username}" blocked=${blocked === true}`);
            return sendJSON(res, 200, { success: true, username, blocked: blocked === true });
        } catch (err) {
            console.error('users/block error:', err.message);
            return sendJSON(res, 500, { message: 'Server error.' });
        }
    }
    // ── POST /api/login  (validate credentials against MongoDB users) ─────────
    if (req.method === 'POST' && pathname === '/api/login') {
        try {
            const body = await readBody(req);
            const { username, password } = body;
            if (!username || !password) return sendJSON(res, 400, { message: 'username and password required.' });
            const colUsers = db.collection('users');
            // First check if user exists at all
            const existing = await colUsers.findOne({ $or: [{ username }, { email: username }] });
            if (!existing) return sendJSON(res, 404, { success: false, message: 'User not found.' });
            // Check if blocked
            if (existing.blocked === true) return sendJSON(res, 401, { success: false, message: 'Account is blocked.' });
            // Check password
            if (existing.password !== password) return sendJSON(res, 401, { success: false, message: 'Invalid password.' });
            return sendJSON(res, 200, { success: true, user: {
                id        : existing.id || existing._id?.toString(),
                username  : existing.username,
                name      : existing.name || existing.username,
                role      : existing.role || 'volunteer',
                email     : existing.email || '',
                department: existing.department || '',
            }});
        } catch (err) {
            console.error('POST /api/login error:', err.message);
            return sendJSON(res, 500, { message: 'Server error.' });
        }
    }

    // ── GET /api/users  (admin: list all users with blocked status) ──────────

    if (req.method === 'GET' && pathname === '/api/users') {
        try {
            const colUsers = db.collection('users');
            const users = await colUsers.find({}).toArray();
            return sendJSON(res, 200, {
                users: users.map(u => ({
                    id       : u.id || u._id?.toString(),
                    username : u.username,
                    name     : u.name || u.username,
                    role     : u.role || 'volunteer',
                    email    : u.email || '',
                    department: u.department || '',
                    blocked  : u.blocked === true,
                }))
            });
        } catch (err) {
            console.error('GET /api/users error:', err.message);
            return sendJSON(res, 500, { message: 'Server error.' });
        }
    }

    // ── POST /api/users  (admin: create new user) ─────────────────────────────
    if (req.method === 'POST' && pathname === '/api/users') {
        try {
            const body = await readBody(req);
            const { username, name, email, role, password, department } = body;
            if (!username || !username.trim()) return sendJSON(res, 400, { message: 'Username is required.' });
            if (!password || !password.trim()) return sendJSON(res, 400, { message: 'Password is required.' });
            if (!role    || !role.trim())     return sendJSON(res, 400, { message: 'Role is required.' });
            const colUsers = db.collection('users');
            const existing = await colUsers.findOne({ username: username.trim() });
            if (existing) return sendJSON(res, 400, { message: `Username "${username.trim()}" already exists.` });
            const newUser = {
                username  : username.trim(),
                name      : (name || username).trim(),
                email     : (email || '').trim(),
                role      : role.trim(),
                password  : password.trim(),
                department: (department || '').trim(),
                blocked   : false,
                createdAt : new Date().toISOString(),
            };
            await colUsers.insertOne(newUser);
            console.log(`👤 New user created: ${newUser.username} (${newUser.role})`);
            return sendJSON(res, 200, { success: true, username: newUser.username });
        } catch (err) {
            console.error('POST /api/users error:', err.message);
            return sendJSON(res, 500, { message: 'Server error.' });
        }
    }

    // ── PUT /api/users/:username  (admin: update user) ────────────────────────
    if (req.method === 'PUT' && pathname.startsWith('/api/users/') && !pathname.includes('/block')) {
        const urlUsername = decodeURIComponent(pathname.replace('/api/users/', ''));
        try {
            const body = await readBody(req);
            const { name, username, email, role, department, password } = body;
            const colUsers = db.collection('users');
            
            const existing = await colUsers.findOne({ username: urlUsername });
            if (!existing) return sendJSON(res, 404, { message: 'User not found.' });
            
            let newUsername = urlUsername;
            if (username && username.trim() !== urlUsername) {
                newUsername = username.trim();
                const clash = await colUsers.findOne({ username: newUsername });
                if (clash) return sendJSON(res, 400, { message: `Username "${newUsername}" is already taken.` });
            }
            
            const updateFields = {
                username: newUsername,
                name: (name || newUsername).trim(),
                email: (email || '').trim(),
                role: (role || existing.role).trim(),
                department: (department || '').trim()
            };
            
            if (password && password.trim().length > 0) {
                updateFields.password = password.trim();
            }
            
            await colUsers.updateOne({ username: urlUsername }, { $set: updateFields });
            console.log(`✏️  User updated: ${urlUsername}`);
            return sendJSON(res, 200, { success: true });
        } catch (err) {
            console.error('PUT /api/users error:', err.message);
            return sendJSON(res, 500, { message: 'Server error.' });
        }
    }

    // ── DELETE /api/users/:username  (admin: remove user) ────────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/users/') && !pathname.includes('/block')) {
        const username = decodeURIComponent(pathname.replace('/api/users/', ''));
        try {
            const colUsers = db.collection('users');
            const result = await colUsers.deleteOne({ username });
            if (result.deletedCount === 0) return sendJSON(res, 404, { message: 'User not found.' });
            console.log(`🗑️  User deleted: ${username}`);
            return sendJSON(res, 200, { success: true });
        } catch (err) {
            console.error('DELETE /api/users error:', err.message);
            return sendJSON(res, 500, { message: 'Server error.' });
        }
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/receipts/') && !pathname.includes('/mark-received') && !pathname.includes('/soft-delete') && !pathname.includes('/clear-amount')) {

        const id  = decodeURIComponent(pathname.replace('/api/receipts/', ''));
        const idx = receipts.findIndex(r => r.receiptId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Receipt not found.' });
        try {
            const body = await readBody(req);
            if (body.name         !== undefined) receipts[idx].name         = String(body.name).trim();
            if (body.amount       !== undefined) receipts[idx].amount       = Number(body.amount);
            if (body.status       !== undefined) receipts[idx].status       = String(body.status);
            if (body.paymentMode  !== undefined) receipts[idx].paymentMode  = String(body.paymentMode);
            if (body.checkNumber  !== undefined) receipts[idx].checkNumber  = body.checkNumber || null;
            if (body.bookNumber   !== undefined && body.bookNumber) receipts[idx].bookNumber   = Number(body.bookNumber);
            if (body.receiptNumber !== undefined && body.receiptNumber) receipts[idx].receiptNumber = Number(body.receiptNumber);
            if (body.passbookFile !== undefined) {
                receipts[idx].passbookFile = body.passbookFile;
                receipts[idx].passbookUrl  = body.passbookFile ? `/uploads/${body.passbookFile}` : null;
            }
            receipts[idx].updatedAt = new Date().toISOString();

            await saveReceipts();
            console.log(`✏️  Receipt updated: ${receipts[idx].receiptId}`);
            return sendJSON(res, 200, { success: true, receipt: receipts[idx] });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── PATCH /api/receipts/:id/soft-delete  (no permanent deletion) ────────
    if (req.method === 'PATCH' && pathname.startsWith('/api/receipts/') && pathname.endsWith('/soft-delete')) {
        const id  = decodeURIComponent(pathname.replace('/api/receipts/', '').replace('/soft-delete', ''));
        const idx = receipts.findIndex(r => r.receiptId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Receipt not found.' });
        receipts[idx].deleted   = true;
        receipts[idx].updatedAt = new Date().toISOString();
        await saveReceipts();
        console.log(`🗑️  Receipt soft-deleted: ${receipts[idx].receiptId} (data retained)`);
        return sendJSON(res, 200, { success: true });
    }

    // ── PATCH /api/receipts/:id/mark-received  (balance recovery complete) ───
    if (req.method === 'PATCH' && pathname.startsWith('/api/receipts/') && pathname.endsWith('/mark-received')) {
        const id  = decodeURIComponent(pathname.replace('/api/receipts/', '').replace('/mark-received', ''));
        const idx = receipts.findIndex(r => r.receiptId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Receipt not found.' });
        receipts[idx].status    = 'received';
        receipts[idx].updatedAt = new Date().toISOString();
        await saveReceipts();
        console.log(`✅  Balance marked received: ${receipts[idx].receiptId}`);
        return sendJSON(res, 200, { success: true, receipt: receipts[idx] });
    }

    // ── PATCH /api/receipts/:id/clear-amount  (wipe only the amount) ─────────
    if (req.method === 'PATCH' && pathname.startsWith('/api/receipts/') && pathname.endsWith('/clear-amount')) {
        const id  = decodeURIComponent(pathname.replace('/api/receipts/', '').replace('/clear-amount', ''));
        const idx = receipts.findIndex(r => r.receiptId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Receipt not found.' });
        receipts[idx].amount    = null;
        receipts[idx].updatedAt = new Date().toISOString();
        await saveReceipts();
        console.log(`🧹  Amount cleared for: ${receipts[idx].receiptId} (record kept)`);
        return sendJSON(res, 200, { success: true, receipt: receipts[idx] });
    }

    // ── POST /api/upload-passbook ─────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/upload-passbook') {
        try {
            const contentType = req.headers['content-type'] || '';
            const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
            if (!boundaryMatch) {
                return sendJSON(res, 400, { message: 'Missing multipart boundary.' });
            }
            const boundary = boundaryMatch[1].trim();

            const rawBody = await readRawBody(req);
            const parts   = parseMultipart(rawBody, boundary);

            // Find the file part (field name: 'passbook')
            const filePart = parts.find(p => p.name === 'passbook' && p.filename);
            if (!filePart) {
                return sendJSON(res, 400, { message: 'No file received. Please select a passbook file.' });
            }

            // Validate size (5 MB)
            if (filePart.data.length > 5 * 1024 * 1024) {
                return sendJSON(res, 400, { message: 'File exceeds the 5 MB limit.' });
            }

            // Sanitise filename and make it unique
            const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `${Date.now()}_${safeName}`;
            const savePath   = path.join(UPLOADS_DIR, uniqueName);

            try {
                fs.writeFileSync(savePath, filePart.data);
                console.log(`📎 File saved: uploads/${uniqueName} (${(filePart.data.length / 1024).toFixed(1)} KB)`);
            } catch (fsErr) {
                console.warn('⚠️  Could not write file to disk (read-only FS — expected on Render):', fsErr.message);
            }

            // Link to receipt if receiptId was supplied as a form field
            const receiptIdPart = parts.find(p => p.name === 'receiptId' && !p.filename);
            const receiptId     = receiptIdPart ? receiptIdPart.data.toString('utf8').trim() : null;
            let linkedReceiptId = null;
            if (receiptId) {
                const idx = receipts.findIndex(r => r.receiptId === receiptId);
                if (idx !== -1) {
                    receipts[idx].passbookFile = uniqueName;
                    receipts[idx].passbookUrl  = `/uploads/${uniqueName}`;
                    receipts[idx].updatedAt    = new Date().toISOString();
                    await saveReceipts();
                    linkedReceiptId = receiptId;
                    console.log(`🔗 Passbook linked to receipt: ${receiptId}`);
                }
            }

            // ── Link photo to a Donation Entry if entryId was supplied ──────────
            const entryIdPart = parts.find(p => p.name === 'entryId' && !p.filename);
            const entryId     = entryIdPart ? entryIdPart.data.toString('utf8').trim() : null;
            let linkedEntryId = null;
            if (entryId) {
                const eidx = donationEntries.findIndex(e => e.entryId === entryId);
                if (eidx !== -1) {
                    donationEntries[eidx].photoFile = uniqueName;
                    donationEntries[eidx].photoUrl  = `/uploads/${uniqueName}`;
                    donationEntries[eidx].updatedAt = new Date().toISOString();
                    await saveDonationEntries();
                    linkedEntryId = entryId;
                    console.log(`🖼  Photo linked to donation entry: ${entryId}`);
                }
            }

            // ── Link photo to a Pauti Slip if bookId and slipNum are supplied ────
            const bookIdPart = parts.find(p => p.name === 'bookId' && !p.filename);
            const slipNumPart = parts.find(p => p.name === 'slipNum' && !p.filename);
            const bookId = bookIdPart ? bookIdPart.data.toString('utf8').trim() : null;
            const slipNum = slipNumPart ? Number(slipNumPart.data.toString('utf8').trim()) : null;
            if (bookId && slipNum) {
                const bidx = pautiBooks.findIndex(b => b.pautiBookId === bookId);
                if (bidx !== -1) {
                    const sidx = pautiBooks[bidx].slips.findIndex(s => s.slipNumber === slipNum);
                    if (sidx !== -1) {
                        pautiBooks[bidx].slips[sidx].photoFile = uniqueName;
                        pautiBooks[bidx].slips[sidx].photoUrl  = `/uploads/${uniqueName}`;
                        await savePautiBooks();
                        console.log(`🖼  Photo linked to pauti book slip: Book ${bookId}, Slip #${slipNum}`);
                    }
                }
            }

            return sendJSON(res, 200, {
                success         : true,
                fileName        : uniqueName,
                size            : filePart.data.length,
                linkedReceiptId : linkedReceiptId,
                message         : 'File uploaded successfully.',
            });
        } catch (err) {
            console.error('File upload error:', err.message);
            return sendJSON(res, 500, { message: 'Server error during upload: ' + err.message });
        }
    }

    // ── GET /api/uploads ─────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/uploads') {
        try {
            const files = fs.readdirSync(UPLOADS_DIR).map(name => {
                const stat = fs.statSync(path.join(UPLOADS_DIR, name));
                return { name, size: stat.size, uploadedAt: stat.mtime };
            });
            return sendJSON(res, 200, { files });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Could not list uploads.' });
        }
    }

    // ── GET /api/expenses ─────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/expenses') {
        return sendJSON(res, 200, { expenses });
    }

    // ── POST /api/expenses ──────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/expenses') {
        try {
            const body = await readBody(req);
            const { date, serialNumber, particulars, commonHeader,
                    referenceNumber, category, subcategory,
                    soundEvent, reason, amount } = body;
            if (!date)         return sendJSON(res, 400, { message: 'Date is required.' });
            if (!serialNumber) return sendJSON(res, 400, { message: 'Serial Number is required.' });
            if (!category)     return sendJSON(res, 400, { message: 'Category is required.' });
            if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0)
                return sendJSON(res, 400, { message: 'A valid amount is required.' });
            const record = {
                expenseId    : `EXP-${Date.now()}`,
                date, serialNumber,
                particulars  : (particulars || '').trim(),
                commonHeader : (commonHeader || '').trim(),
                referenceNumber: (referenceNumber || '').trim(),
                category, subcategory: subcategory || '',
                soundEvent   : soundEvent || null,
                reason       : (reason || '').trim(),
                amount       : Number(amount),
                createdAt    : new Date().toISOString(),
                updatedAt    : null,
            };
            expenses.push(record);
            await saveExpenses();
            console.log(`✅ Expense saved: ${record.expenseId} | ${record.category} | ₹${record.amount}`);
            return sendJSON(res, 200, { success: true, expense: record });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── PUT /api/expenses/:id ────────────────────────────────────────
    if (req.method === 'PUT' && pathname.startsWith('/api/expenses/')) {
        const id  = decodeURIComponent(pathname.replace('/api/expenses/', ''));
        const idx = expenses.findIndex(e => e.expenseId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Expense not found.' });
        try {
            const body = await readBody(req);
            const fields = ['date','serialNumber','particulars','commonHeader',
                            'referenceNumber','category','subcategory',
                            'soundEvent','reason','amount'];
            fields.forEach(f => {
                if (body[f] !== undefined)
                    expenses[idx][f] = f === 'amount' ? Number(body[f]) : body[f];
            });
            expenses[idx].updatedAt = new Date().toISOString();
            await saveExpenses();
            console.log(`✏️  Expense updated: ${expenses[idx].expenseId}`);
            return sendJSON(res, 200, { success: true, expense: expenses[idx] });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── DELETE /api/expenses/:id ──────────────────────────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/expenses/')) {
        const id  = decodeURIComponent(pathname.replace('/api/expenses/', ''));
        const idx = expenses.findIndex(e => e.expenseId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Expense not found.' });
        const [removed] = expenses.splice(idx, 1);
        await saveExpenses();
        console.log(`🗑️  Expense deleted: ${removed.expenseId}`);
        return sendJSON(res, 200, { success: true });
    }

    // ── GET /api/financials ──────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/financials') {
        return sendJSON(res, 200, { financials });
    }

    // ── POST /api/financials ─────────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/financials') {
        try {
            const body = await readBody(req);
            const { year, lastYearBalance, currentYearDonations, cashInHand,
                    cashAtBank, cashWithdrawnFromBank, totalCollection,
                    currentYearExpenses, notes } = body;
            if (!year) return sendJSON(res, 400, { message: 'Year is required.' });
            if (financials.find(f => f.year === year))
                return sendJSON(res, 400, { message: `A record for year ${year} already exists. Edit that record instead.` });
            const record = {
                financialId          : `FIN-${Date.now()}`,
                year                 : String(year),
                lastYearBalance      : Number(lastYearBalance      || 0),
                currentYearDonations : Number(currentYearDonations || 0),
                cashInHand           : Number(cashInHand           || 0),
                cashAtBank           : Number(cashAtBank           || 0),
                cashWithdrawnFromBank: Number(cashWithdrawnFromBank|| 0),
                totalCollection      : Number(totalCollection      || 0),
                currentYearExpenses  : Number(currentYearExpenses  || 0),
                notes                : (notes || '').trim(),
                createdAt            : new Date().toISOString(),
                updatedAt            : null,
            };
            financials.push(record);
            await saveFinancials();
            console.log(`✅ Financial record saved: ${record.financialId} | Year ${record.year}`);
            return sendJSON(res, 200, { success: true, financial: record });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── PUT /api/financials/:id ──────────────────────────────────────────
    if (req.method === 'PUT' && pathname.startsWith('/api/financials/')) {
        const id  = decodeURIComponent(pathname.replace('/api/financials/', ''));
        const idx = financials.findIndex(f => f.financialId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Financial record not found.' });
        try {
            const body = await readBody(req);
            const numFields = ['lastYearBalance','currentYearDonations','cashInHand',
                               'cashAtBank','cashWithdrawnFromBank','totalCollection','currentYearExpenses'];
            numFields.forEach(f => { if (body[f] !== undefined) financials[idx][f] = Number(body[f]); });
            if (body.year  !== undefined) financials[idx].year  = String(body.year);
            if (body.notes !== undefined) financials[idx].notes = String(body.notes).trim();
            financials[idx].updatedAt = new Date().toISOString();
            await saveFinancials();
            console.log(`✏️  Financial record updated: ${financials[idx].financialId}`);
            return sendJSON(res, 200, { success: true, financial: financials[idx] });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── DELETE /api/financials/:id ───────────────────────────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/financials/')) {
        const id  = decodeURIComponent(pathname.replace('/api/financials/', ''));
        const idx = financials.findIndex(f => f.financialId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Financial record not found.' });
        const [removed] = financials.splice(idx, 1);
        await saveFinancials();
        console.log(`🗑️  Financial record deleted: ${removed.financialId} | Year ${removed.year}`);
        return sendJSON(res, 200, { success: true });
    }

    // ── GET /api/pauti-books ────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/pauti-books') {
        const userId = new URL(`http://x${req.url}`).searchParams.get('userId');
        const books  = userId
            ? pautiBooks.filter(b => String(b.assignedUserId) === String(userId))
            : pautiBooks;
        return sendJSON(res, 200, { pautiBooks: books, totalSlips: TOTAL_SLIPS, slipsPerBook: SLIPS_PER_BOOK, maxBooks: MAX_BOOKS });
    }

    // ── POST /api/pauti-books/assign  (admin assigns a book to a volunteer) ──
    if (req.method === 'POST' && pathname === '/api/pauti-books/assign') {
        try {
            const body = await readBody(req);
            const { bookNumber, assignedTo, assignedUserId } = body;
            if (!bookNumber || isNaN(Number(bookNumber))) return sendJSON(res, 400, { message: 'Book number required.' });
            const bn = Number(bookNumber);
            if (bn < 1 || bn > MAX_BOOKS) return sendJSON(res, 400, { message: `Book number must be 1–${MAX_BOOKS}.` });
            if (pautiBooks.find(b => b.bookNumber === bn)) return sendJSON(res, 400, { message: `Book ${bn} already assigned.` });
            const slipsFrom = (bn - 1) * SLIPS_PER_BOOK + 1;
            const slipsTo   = bn * SLIPS_PER_BOOK;
            const slips = [];
            for (let i = slipsFrom; i <= slipsTo; i++) {
                slips.push({ slipNumber: i, donorName: null, amount: null, paymentMode: null, checkNumber: null, photoFile: null, photoUrl: null, uploadedAt: null, deleted: false });
            }
            const book = {
                pautiBookId   : `PB-${String(bn).padStart(3,'0')}`,
                bookNumber    : bn,
                assignedTo    : assignedTo || 'Unassigned',
                assignedUserId: assignedUserId || null,
                assignedAt    : new Date().toISOString(),
                slipsFrom, slipsTo,
                slips,
            };
            pautiBooks.push(book);
            await savePautiBooks();
            console.log(`📗 Pauti Book ${bn} assigned to: ${book.assignedTo}`);
            return sendJSON(res, 200, { success: true, book });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── POST /api/pauti-books/next-slip  (auto-claim the next available slip) ────
    if (req.method === 'POST' && pathname === '/api/pauti-books/next-slip') {
        try {
            const body = await readBody(req);
            const { donorName, amount, paymentMode, checkNumber, uploadedBy, uploadedByUserId } = body;

            // Find the highest slip number that has been claimed (uploadedAt set)
            let maxClaimed = 0;
            pautiBooks.forEach(book => {
                book.slips.forEach(slip => {
                    if (slip.uploadedAt && !slip.deleted && slip.slipNumber > maxClaimed)
                        maxClaimed = slip.slipNumber;
                });
            });
            const nextSlipNum = maxClaimed + 1;

            if (nextSlipNum > TOTAL_SLIPS)
                return sendJSON(res, 400, { message: `All ${TOTAL_SLIPS} slips have been filled.` });

            // Determine which book this slip belongs to
            const bookNumber = Math.ceil(nextSlipNum / SLIPS_PER_BOOK);
            const slipsFrom  = (bookNumber - 1) * SLIPS_PER_BOOK + 1;
            const slipsTo    = bookNumber * SLIPS_PER_BOOK;

            // Auto-create the book if it doesn't exist yet
            let bookIdx = pautiBooks.findIndex(b => b.bookNumber === bookNumber);
            if (bookIdx === -1) {
                const slips = [];
                for (let i = slipsFrom; i <= slipsTo; i++) {
                    slips.push({
                        slipNumber: i, donorName: null, amount: null,
                        paymentMode: null, checkNumber: null,
                        photoFile: null, photoUrl: null,
                        uploadedBy: null, uploadedByUserId: null,
                        uploadedAt: null, deleted: false
                    });
                }
                pautiBooks.push({
                    pautiBookId   : `PB-${String(bookNumber).padStart(3,'0')}`,
                    bookNumber, assignedTo: 'Auto', assignedUserId: null,
                    assignedAt: new Date().toISOString(),
                    slipsFrom, slipsTo, slips,
                });
                pautiBooks.sort((a, b) => a.bookNumber - b.bookNumber);
                bookIdx = pautiBooks.findIndex(b => b.bookNumber === bookNumber);
            }

            // Locate and fill the slip
            const slipIdx = pautiBooks[bookIdx].slips.findIndex(s => s.slipNumber === nextSlipNum);
            if (slipIdx === -1) return sendJSON(res, 500, { message: 'Slip not found in book.' });

            const slip = pautiBooks[bookIdx].slips[slipIdx];
            slip.donorName        = (donorName  || '').trim() || null;
            slip.amount           = amount && Number(amount) > 0 ? Number(amount) : null;
            slip.paymentMode      = paymentMode || 'cash';
            slip.checkNumber      = checkNumber || null;
            slip.uploadedBy       = uploadedBy       || null;
            slip.uploadedByUserId = uploadedByUserId || null;
            slip.uploadedAt       = new Date().toISOString();

            await savePautiBooks();
            console.log(`📑 Slip #${nextSlipNum} (Book #${bookNumber}) claimed by ${uploadedBy || 'Unknown'}`);
            return sendJSON(res, 200, {
                success: true, slipNumber: nextSlipNum,
                bookNumber, slipsFrom, slipsTo, slip,
            });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── POST /api/pauti-books/upload-slip  (multipart: book+slip number, photo) ──
    if (req.method === 'POST' && pathname === '/api/pauti-books/upload-slip') {
        try {
            const parts       = await parseMultipart(req);
            const bookNum     = Number(parts.find(p => p.name === 'bookNumber')?.value  || 0);
            const slipNum     = Number(parts.find(p => p.name === 'slipNumber')?.value  || 0);
            const donorName   = (parts.find(p => p.name === 'donorName')?.value   || '').trim();
            const amount      = Number(parts.find(p => p.name === 'amount')?.value || 0);
            const paymentMode = (parts.find(p => p.name === 'paymentMode')?.value || 'cash').trim();
            const checkNumber = (parts.find(p => p.name === 'checkNumber')?.value || '').trim() || null;
            const filePart    = parts.find(p => p.name === 'photo' && p.filename);

            const bookIdx = pautiBooks.findIndex(b => b.bookNumber === bookNum);
            if (bookIdx === -1) return sendJSON(res, 404, { message: `Pauti Book ${bookNum} not found.` });
            const slipIdx = pautiBooks[bookIdx].slips.findIndex(s => s.slipNumber === slipNum);
            if (slipIdx === -1) return sendJSON(res, 404, { message: `Slip ${slipNum} not found.` });

            let photoFile = null, photoUrl = null;
            if (filePart) {
                const ext        = path.extname(filePart.filename).toLowerCase();
                const uniqueName = `pauti-${bookNum}-${slipNum}-${Date.now()}${ext}`;
                try {
                    fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data);
                } catch (fsErr) {
                    console.warn('⚠️  Could not write pauti slip photo to disk:', fsErr.message);
                }
                photoFile = uniqueName;
                photoUrl  = `/uploads/${uniqueName}`;
            }

            const slip = pautiBooks[bookIdx].slips[slipIdx];
            slip.donorName   = donorName || slip.donorName;
            slip.amount      = amount > 0 ? amount : slip.amount;
            slip.paymentMode = paymentMode;
            slip.checkNumber = checkNumber;
            if (photoFile) { slip.photoFile = photoFile; slip.photoUrl = photoUrl; }
            slip.uploadedAt  = new Date().toISOString();
            await savePautiBooks();
            console.log(`📑 Slip ${slipNum} (Book ${bookNum}) uploaded by ${donorName}`);
            return sendJSON(res, 200, { success: true, slip });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── PUT /api/pauti-books/:bookId/slips/:slipNum  (admin edit) ──────────
    if (req.method === 'PUT' && /^\/api\/pauti-books\/[^/]+\/slips\/\d+$/.test(pathname)) {
        const parts    = pathname.split('/');
        const bookId   = parts[3];
        const slipNum  = Number(parts[5]);
        const bookIdx  = pautiBooks.findIndex(b => b.pautiBookId === bookId);
        if (bookIdx === -1) return sendJSON(res, 404, { message: 'Book not found.' });
        const slipIdx  = pautiBooks[bookIdx].slips.findIndex(s => s.slipNumber === slipNum);
        if (slipIdx === -1) return sendJSON(res, 404, { message: 'Slip not found.' });
        try {
            const body = await readBody(req);
            const slip = pautiBooks[bookIdx].slips[slipIdx];
            if (body.donorName        !== undefined) slip.donorName        = String(body.donorName).trim();
            if (body.amount           !== undefined) slip.amount           = Number(body.amount);
            if (body.paymentMode      !== undefined) slip.paymentMode      = String(body.paymentMode);
            if (body.checkNumber      !== undefined) slip.checkNumber      = body.checkNumber || null;
            if (body.uploadedBy       !== undefined) slip.uploadedBy       = body.uploadedBy || null;
            if (body.uploadedByUserId !== undefined) slip.uploadedByUserId = body.uploadedByUserId || null;
            if (body.status           !== undefined) slip.status           = String(body.status);
            await savePautiBooks();
            return sendJSON(res, 200, { success: true, slip });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── PATCH /api/pauti-books/:bookId/slips/:slipNum/soft-delete ──────────
    if (req.method === 'PATCH' && /^\/api\/pauti-books\/[^/]+\/slips\/\d+\/soft-delete$/.test(pathname)) {
        const parts    = pathname.split('/');
        const bookId   = parts[3];
        const slipNum  = Number(parts[5]);
        const bookIdx  = pautiBooks.findIndex(b => b.pautiBookId === bookId);
        if (bookIdx === -1) return sendJSON(res, 404, { message: 'Book not found.' });
        const slipIdx  = pautiBooks[bookIdx].slips.findIndex(s => s.slipNumber === slipNum);
        if (slipIdx === -1) return sendJSON(res, 404, { message: 'Slip not found.' });
        pautiBooks[bookIdx].slips[slipIdx].deleted = true;
        await savePautiBooks();
        return sendJSON(res, 200, { success: true });
    }

    // ── GET /api/donations ────────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/donations') {
        const visible = donationsStore.records.filter(r => !r._deleted);
        return sendJSON(res, 200, { columns: donationsStore.columns, records: visible, total: visible.length });
    }

    // ── POST /api/donations/upload  (append rows from client-parsed Excel) ────
    if (req.method === 'POST' && pathname === '/api/donations/upload') {
        try {
            const body = await readBody(req);
            const { records } = body;
            if (!Array.isArray(records) || records.length === 0)
                return sendJSON(res, 400, { message: 'No records received.' });
            const detectedCols = Object.keys(records[0]).filter(k => !k.startsWith('_'));
            const stamped = records.map((r, i) => ({ _id: `DON-${Date.now()}-${i}`, _deleted: false, ...r }));
            const mergedCols = [...new Set([...donationsStore.columns, ...detectedCols])];
            donationsStore.columns = mergedCols;
            donationsStore.records.push(...stamped);
            await saveDonations();
            console.log(`📅 Appended ${stamped.length} donation records. Total: ${donationsStore.records.filter(r=>!r._deleted).length}`);
            return sendJSON(res, 200, { success: true, uploaded: stamped.length, total: donationsStore.records.filter(r=>!r._deleted).length, columns: mergedCols });
        } catch (err) { return sendJSON(res, 400, { message: err.message || 'Upload failed.' }); }
    }

    // ── POST /api/donations/replace  (clear all + upload fresh) ──────────────
    if (req.method === 'POST' && pathname === '/api/donations/replace') {
        try {
            const body = await readBody(req);
            const { records } = body;
            if (!Array.isArray(records) || records.length === 0)
                return sendJSON(res, 400, { message: 'No records received.' });
            const detectedCols = Object.keys(records[0]).filter(k => !k.startsWith('_'));
            const stamped = records.map((r, i) => ({ _id: `DON-${Date.now()}-${i}`, _deleted: false, ...r }));
            donationsStore = { columns: detectedCols, records: stamped };
            await saveDonations();
            console.log(`📅 Replaced donation data: ${stamped.length} records.`);
            return sendJSON(res, 200, { success: true, uploaded: stamped.length, columns: detectedCols });
        } catch (err) { return sendJSON(res, 400, { message: err.message || 'Replace failed.' }); }
    }

    // ── PUT /api/donations/:id  (admin edit) ──────────────────────────────────
    if (req.method === 'PUT' && pathname.startsWith('/api/donations/')) {
        const id  = decodeURIComponent(pathname.replace('/api/donations/', ''));
        const idx = donationsStore.records.findIndex(r => r._id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Donation record not found.' });
        try {
            const body = await readBody(req);
            Object.keys(body).forEach(k => { if (!k.startsWith('_')) donationsStore.records[idx][k] = body[k]; });
            donationsStore.records[idx]._updatedAt = new Date().toISOString();
            await saveDonations();
            return sendJSON(res, 200, { success: true, record: donationsStore.records[idx] });
        } catch (err) { return sendJSON(res, 400, { message: err.message || 'Update failed.' }); }
    }

    // ── DELETE /api/donations  (clear ALL records — admin) ────────────────────
    if (req.method === 'DELETE' && pathname === '/api/donations') {
        const prev = donationsStore.records.length;
        donationsStore = { columns: [], records: [] };
        await saveDonations();
        console.log(`🗑️  All ${prev} donation record(s) cleared by admin.`);
        return sendJSON(res, 200, { success: true, deleted: prev });
    }

    // ── DELETE /api/donations/:id  (soft-delete, data kept) ──────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/donations/')) {
        const id  = decodeURIComponent(pathname.replace('/api/donations/', ''));
        const idx = donationsStore.records.findIndex(r => r._id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Donation record not found.' });
        donationsStore.records[idx]._deleted   = true;
        donationsStore.records[idx]._deletedAt = new Date().toISOString();
        await saveDonations();
        console.log(`🗑️  Donation soft-deleted: ${id} (data retained)`);
        return sendJSON(res, 200, { success: true });
    }


    // ══════════════════════════════════════════════════════════════
    // ─── DONATION ENTRIES API ──────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    // ── GET /api/donation-entries  ─────────────────────────────────────────
    // Query params: ?bookNumber=N, ?area=X
    if (req.method === 'GET' && pathname === '/api/donation-entries') {
        const qp = new URL(`http://x${req.url}`).searchParams;
        const bookFilter = qp.get('bookNumber');
        const areaFilter = qp.get('area');
        let result = donationEntries.filter(e => !e.deleted);
        
        // Merge Received slips from Pauti Books
        pautiBooks.forEach(book => {
            if (bookFilter && String(book.bookNumber) !== String(bookFilter)) return;
            (book.slips || []).forEach(slip => {
                if (slip.uploadedAt && !slip.deleted && (slip.status||'').toLowerCase() === 'received' && slip.paymentMode !== 'balance' && slip.amount && Number(slip.amount) > 0) {
                    result.push({
                        ...slip,
                        entryId: `PB-${book.pautiBookId}-${slip.slipNumber}`,
                        bookNumber: book.bookNumber,
                        receiptNumber: slip.slipNumber,
                        donorType: 'Individual',
                        firstName: slip.firstName || slip.donorName || '',
                        middleName: slip.middleName || '',
                        lastName: slip.lastName || '',
                        amount: slip.amount,
                        paymentMode: slip.paymentMode || 'Cash',
                        status: slip.status || 'Received',
                        photoUrl: slip.photoUrl || null,
                        submittedAt: slip.uploadedAt,
                        submittedBy: slip.uploadedBy || 'Auto',
                        submittedByUserId: slip.uploadedByUserId || null,
                        area: slip.area || null,
                        referenceNumber: slip.referenceNumber || slip.checkNumber || null
                    });
                }
            });
        });

        // Merge Received slips from Receipts
        receipts.forEach(r => {
            if (bookFilter && String(r.bookNumber) !== String(bookFilter)) return;
            if (!r.deleted && (r.status||'').toLowerCase() === 'received' && r.type !== 'balance') {
                result.push({
                    ...r,
                    entryId: r.receiptId || `RC-${r.receiptNumber}`,
                    bookNumber: r.bookNumber || 0,
                    receiptNumber: r.receiptNumber || 0,
                    donorType: 'Individual',
                    firstName: r.firstName || r.name || '',
                    middleName: r.middleName || '',
                    lastName: r.lastName || '',
                    amount: r.amount,
                    paymentMode: r.paymentMode || 'Cash',
                    status: r.status || 'Received',
                    photoUrl: r.photoUrl || null,
                    submittedAt: r.date || r.createdAt || new Date().toISOString(),
                    submittedBy: 'Admin',
                    area: r.area || null,
                    referenceNumber: r.referenceNumber || null
                });
            }
        });

        if (areaFilter) result = result.filter(e => e.area === areaFilter);
        
        // Sort chronologically so they appear in correct order
        result.sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));

        return sendJSON(res, 200, { entries: result, total: result.length, slipsPerBook: SLIPS_PER_BOOK_DE, totalBooks: TOTAL_BOOKS_DE });
    }

    // ── POST /api/donation-entries  (create new entry) ────────────────────
    if (req.method === 'POST' && pathname === '/api/donation-entries') {
        try {
            const body = await readBody(req);
            const {
                bookNumber, receiptNumber, donorType,
                firstName, middleName, lastName, businessName,
                whatsappNumber, mobileNumber, mailId,
                buildingName, area, landmark,
                amount, paymentMode, referenceNumber,
                submittedBy, submittedByUserId
            } = body;

            // ── Validation ──────────────────────────────────────────────
            const bn = Number(bookNumber);
            const rn = Number(receiptNumber);
            if (!bn || bn < 1 || bn > TOTAL_BOOKS_DE)
                return sendJSON(res, 400, { message: `Book number must be 1–${TOTAL_BOOKS_DE}.` });
            const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;
            const expectedTo   = bn * SLIPS_PER_BOOK_DE;
            if (!rn || rn < expectedFrom || rn > expectedTo)
                return sendJSON(res, 400, { message: `Receipt number for Book ${bn} must be ${expectedFrom}–${expectedTo}.` });

            // Check receipt number not already used
            const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn);
            if (dup) return sendJSON(res, 400, { message: `Receipt #${rn} in Book ${bn} is already used.` });

            if (!donorType || !['Individual', 'Business'].includes(donorType))
                return sendJSON(res, 400, { message: 'Donor type must be Individual or Business.' });

            if (donorType === 'Individual') {
                if (!firstName || !firstName.trim()) return sendJSON(res, 400, { message: 'First Name is required.' });
                if (!middleName || !middleName.trim()) return sendJSON(res, 400, { message: 'Middle Name is required.' });
                if (!lastName || !lastName.trim()) return sendJSON(res, 400, { message: 'Last Name is required.' });
            } else {
                if (!businessName || !businessName.trim()) return sendJSON(res, 400, { message: 'Business Name is required.' });
            }

            if (!paymentMode || !['Cash', 'Cheque', 'UPI', 'RTGS', 'Balance'].includes(paymentMode))
                return sendJSON(res, 400, { message: 'Payment mode must be Cash, Cheque, UPI, RTGS, or Balance.' });

            const entry = {
                entryId          : `DE-${Date.now()}`,
                bookNumber       : bn,
                receiptNumber    : rn,
                donorType        : donorType,
                firstName        : donorType === 'Individual' ? String(firstName).trim().toUpperCase() : null,
                middleName       : donorType === 'Individual' ? String(middleName).trim().toUpperCase() : null,
                lastName         : donorType === 'Individual' ? String(lastName).trim().toUpperCase() : null,
                businessName     : donorType === 'Business'   ? String(businessName).trim().toUpperCase() : null,
                whatsappNumber   : (whatsappNumber || '').trim() || null,
                mobileNumber     : (mobileNumber   || '').trim() || null,
                mailId           : (mailId          || '').trim() || null,
                buildingName     : (buildingName    || '').trim() || null,
                area             : (area            || '').trim() || null,
                landmark         : (landmark         || '').trim() || null,
                amount           : amount != null && !isNaN(Number(amount)) ? Number(amount) : null,
                paymentMode      : paymentMode,
                status           : paymentMode === 'Balance' ? 'Balance' : 'Received',
                referenceNumber  : (referenceNumber || '').trim() || null,
                submittedAt      : new Date().toISOString(),
                submittedBy      : (submittedBy || '').trim() || null,
                submittedByUserId: submittedByUserId || null,
                deleted          : false,
                updatedAt        : null,
            };

            donationEntries.push(entry);
            await saveDonationEntries();
            console.log(`✅ Donation entry saved: ${entry.entryId} | Book ${bn} | Receipt ${rn} | ${paymentMode}`);
            return sendJSON(res, 200, { success: true, entry });
        } catch (err) {
            console.error('Donation entry error:', err.message);
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── PUT /api/donation-entries/:id  (edit — admin: all fields; volunteer: name+amount) ──
    if (req.method === 'PUT' && pathname.startsWith('/api/donation-entries/')) {
        const id  = decodeURIComponent(pathname.replace('/api/donation-entries/', ''));
        
        // --- INTERCEPT PB- and RC- ---
        if (id.startsWith('PB-')) {
            const parts = id.split('-');
            const bookId = `PB-${parts[1]}`;
            const slipNum = Number(parts[2]);
            const bookIdx = pautiBooks.findIndex(b => b.pautiBookId === bookId);
            if (bookIdx === -1) return sendJSON(res, 404, { message: 'Pauti book not found.' });
            const slipIdx = pautiBooks[bookIdx].slips.findIndex(s => s.slipNumber === slipNum);
            if (slipIdx === -1) return sendJSON(res, 404, { message: 'Slip not found.' });
            try {
                const body = await readBody(req);
                const slip = pautiBooks[bookIdx].slips[slipIdx];
                Object.keys(body).forEach(k => {
                    if (!k.startsWith('_')) slip[k] = body[k];
                });
                await savePautiBooks();
                return sendJSON(res, 200, { success: true, entry: slip });
            } catch(e) { return sendJSON(res, 400, { message: e.message }); }
        }
        
        if (id.startsWith('RC-')) {
            const rId = id.substring(3);
            const idx = receipts.findIndex(r => r.receiptId === rId || r.receiptId === `RC-${rId}` || r.receiptId === id);
            if (idx === -1) return sendJSON(res, 404, { message: 'Receipt not found.' });
            try {
                const body = await readBody(req);
                Object.keys(body).forEach(k => {
                    if (!k.startsWith('_')) receipts[idx][k] = body[k];
                });
                await saveReceipts();
                return sendJSON(res, 200, { success: true, entry: receipts[idx] });
            } catch(e) { return sendJSON(res, 400, { message: e.message }); }
        }
        // --- END INTERCEPT ---

        const idx = donationEntries.findIndex(e => e.entryId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Entry not found.' });
        try {
            const body = await readBody(req);
            const isAdmin = body._isAdmin === true;
            const e = donationEntries[idx];

            if (isAdmin) {
                // Admin: all editable fields
                const fields = ['bookNumber','receiptNumber','donorType','firstName','middleName','lastName',
                                'businessName','whatsappNumber','mobileNumber','mailId','buildingName',
                                'area','amount','paymentMode','referenceNumber','status'];
                fields.forEach(f => {
                    if (body[f] !== undefined) {
                        if (['firstName','middleName','lastName','businessName'].includes(f) && body[f])
                            e[f] = String(body[f]).trim().toUpperCase();
                        else if (['bookNumber','receiptNumber','amount'].includes(f))
                            e[f] = Number(body[f]);
                        else
                            e[f] = body[f];
                    }
                });
                // Allow admin to update photo link
                if (body.photoFile !== undefined) {
                    e.photoFile = body.photoFile || null;
                    e.photoUrl  = body.photoFile ? `/uploads/${body.photoFile}` : null;
                }
            } else {
                // Volunteer: standard editable fields
                if (body.amount        !== undefined) e.amount        = Number(body.amount);
                if (body.paymentMode   !== undefined) e.paymentMode   = String(body.paymentMode);
                if (body.status        !== undefined) e.status        = String(body.status);
                if (body.bookNumber    !== undefined) e.bookNumber    = Number(body.bookNumber);
                if (body.receiptNumber !== undefined) e.receiptNumber = Number(body.receiptNumber);
                if (body.area          !== undefined) e.area          = String(body.area);
                if (body.buildingName  !== undefined) e.buildingName  = String(body.buildingName);
                if (body.referenceNumber !== undefined) e.referenceNumber = String(body.referenceNumber);
                if (body.landmark       !== undefined) e.landmark       = String(body.landmark);
                // Volunteer name, amount, book, receipt, mode, or status change — requires changeReason for donor details, but we track all
                const nameFields = ['firstName','middleName','lastName','businessName'];
                const hasNameChange = nameFields.some(f => body[f] !== undefined);
                const hasAmountChange = body.amount !== undefined && Number(body.amount) !== Number(e.amount);
                const hasBookChange = body.bookNumber !== undefined && Number(body.bookNumber) !== Number(e.bookNumber);
                const hasReceiptChange = body.receiptNumber !== undefined && Number(body.receiptNumber) !== Number(e.receiptNumber);
                const hasModeChange = body.paymentMode !== undefined && String(body.paymentMode) !== String(e.paymentMode);
                const hasStatusChange = body.status !== undefined && String(body.status) !== String(e.status);

                if (hasNameChange || hasAmountChange || hasBookChange || hasReceiptChange || hasModeChange || hasStatusChange) {
                    if ((hasNameChange || hasAmountChange || hasBookChange || hasReceiptChange) && (!body.changeReason || !String(body.changeReason).trim())) {
                        return sendJSON(res, 400, { message: 'A reason is required when changing donor details (Name, Amount, Book, or Receipt).' });
                    }
                    const oldName = e.donorType === 'Business'
                        ? (e.businessName || '')
                        : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
                    const oldAmount = e.amount;
                    const oldBook = e.bookNumber;
                    const oldReceipt = e.receiptNumber;
                    const oldMode = e.paymentMode;
                    const oldStatus = e.status;

                    if (hasNameChange) {
                        nameFields.forEach(f => {
                            if (body[f] !== undefined) e[f] = String(body[f]).trim().toUpperCase();
                        });
                    }
                    if (hasAmountChange) e.amount = Number(body.amount);
                    if (hasBookChange) e.bookNumber = Number(body.bookNumber);
                    if (hasReceiptChange) e.receiptNumber = Number(body.receiptNumber);
                    if (hasModeChange) e.paymentMode = String(body.paymentMode);
                    if (hasStatusChange) e.status = String(body.status);

                    const newName = e.donorType === 'Business'
                        ? (e.businessName || '')
                        : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
                    
                    if (!e.editHistory) e.editHistory = [];
                    // Track everything
                    e.editHistory.push({
                        from: oldName, to: newName,
                        fromAmount: oldAmount, toAmount: e.amount,
                        fromBook: oldBook, toBook: e.bookNumber,
                        fromReceipt: oldReceipt, toReceipt: e.receiptNumber,
                        fromMode: oldMode, toMode: e.paymentMode,
                        fromStatus: oldStatus, toStatus: e.status,
                        reason: String(body.changeReason || 'Status/Mode Updated').trim(),
                        changedAt: new Date().toISOString(),
                        changedBy: body.changedBy || 'Volunteer'
                    });
                } else {
                    // No tracked fields changed, but maybe we fallback update them? (Already handled above since we track them all now)
                }
            }

            e.updatedAt = new Date().toISOString();
            await saveDonationEntries();
            console.log(`✏️  Donation entry updated: ${e.entryId}`);
            return sendJSON(res, 200, { success: true, entry: e });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── POST /api/donation-entries/edit-multipart  (volunteer/admin edit with photo) ──
    if (req.method === 'POST' && pathname === '/api/donation-entries/edit-multipart') {
        try {
            const ct = req.headers['content-type'] || '';
            const match = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
            if (!match) return sendJSON(res, 400, { message: 'Missing boundary.' });
            const boundary = match[1] || match[2];
            const rawBody = await readRawBody(req);
            const parts = parseMultipart(rawBody, boundary);

            const getValue = name => {
                const p = parts.find(p => p.name === name);
                return p ? p.data.toString('utf8').trim() : undefined;
            };

            const id = getValue('entryId');
            const idx = donationEntries.findIndex(e => e.entryId === id);
            if (idx === -1) return sendJSON(res, 404, { message: 'Entry not found.' });
            
            const e = donationEntries[idx];
            const isAdmin = getValue('_isAdmin') === 'true';

            // Volunteer checks
            const newDonorName = getValue('donorName');
            const newAmount = getValue('amount');
            const changeReason = getValue('changeReason');
            const changedBy = getValue('changedBy') || 'Volunteer';

            const bookNumber = getValue('bookNumber');
            const receiptNumber = getValue('receiptNumber');
            const area = getValue('area');
            const paymentMode = getValue('paymentMode');
            const statusVal = getValue('status');

            let hasNameChange = false;
            let hasAmountChange = false;
            let hasBookChange = false;
            let hasReceiptChange = false;
            let hasModeChange = false;
            let hasStatusChange = false;

            const oldName = e.donorType === 'Business' ? (e.businessName || '') : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
            
            if (newDonorName !== undefined && newDonorName !== oldName) hasNameChange = true;
            if (newAmount !== undefined && Number(newAmount) !== Number(e.amount)) hasAmountChange = true;
            if (bookNumber !== undefined && Number(bookNumber) !== Number(e.bookNumber)) hasBookChange = true;
            if (receiptNumber !== undefined && Number(receiptNumber) !== Number(e.receiptNumber)) hasReceiptChange = true;
            if (paymentMode !== undefined && String(paymentMode) !== String(e.paymentMode)) hasModeChange = true;
            if (statusVal !== undefined && String(statusVal) !== String(e.status)) hasStatusChange = true;

            if (hasNameChange || hasAmountChange || hasBookChange || hasReceiptChange || hasModeChange || hasStatusChange) {
                if (!isAdmin && (hasNameChange || hasAmountChange || hasBookChange || hasReceiptChange) && !changeReason) {
                    return sendJSON(res, 400, { message: 'A reason is required when changing donor details (Name, Amount, Book, or Receipt).' });
                }
                
                if (!e.editHistory) e.editHistory = [];
                e.editHistory.push({
                    from: oldName, to: newDonorName !== undefined ? newDonorName : oldName,
                    fromAmount: e.amount, toAmount: newAmount !== undefined ? Number(newAmount) : e.amount,
                    fromBook: e.bookNumber, toBook: bookNumber !== undefined ? Number(bookNumber) : e.bookNumber,
                    fromReceipt: e.receiptNumber, toReceipt: receiptNumber !== undefined ? Number(receiptNumber) : e.receiptNumber,
                    fromMode: e.paymentMode, toMode: paymentMode !== undefined ? String(paymentMode) : e.paymentMode,
                    fromStatus: e.status, toStatus: statusVal !== undefined ? String(statusVal) : e.status,
                    reason: changeReason || 'Status/Mode/Photo Updated',
                    changedAt: new Date().toISOString(),
                    changedBy
                });
            }

            // Update fields
            if (newDonorName !== undefined) {
                if (e.donorType === 'Business') {
                    e.businessName = newDonorName.toUpperCase();
                } else {
                    const nameParts = newDonorName.toUpperCase().split(' ');
                    e.firstName = nameParts[0] || '';
                    e.middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
                    e.lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                }
            }
            if (newAmount !== undefined) e.amount = Number(newAmount);
            if (bookNumber !== undefined) e.bookNumber = Number(bookNumber);
            if (receiptNumber !== undefined) e.receiptNumber = Number(receiptNumber);
            if (area !== undefined) e.area = area;
            if (paymentMode !== undefined) e.paymentMode = paymentMode;
            if (statusVal !== undefined) e.status = statusVal;

            // Handle Photo Upload
            const filePart = parts.find(p => p.name === 'photo' && p.filename);
            if (filePart) {
                const ext = path.extname(filePart.filename).toLowerCase();
                const uniqueName = `pauti-${e.bookNumber}-${e.receiptNumber}-${Date.now()}${ext}`;
                try {
                    fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data);
                    e.photoFile = uniqueName;
                    e.photoUrl = `/uploads/${uniqueName}`;
                } catch (fsErr) {
                    console.warn('⚠️ Could not write updated photo to disk:', fsErr.message);
                }
            }

            e.updatedAt = new Date().toISOString();
            await saveDonationEntries();
            console.log(`✏️ Donation entry updated (multipart): ${e.entryId}`);
            return sendJSON(res, 200, { success: true, entry: e });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── DELETE /api/donation-entries/:id  (admin hard delete) ────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/donation-entries/')) {
        const id  = decodeURIComponent(pathname.replace('/api/donation-entries/', ''));
        
        // --- INTERCEPT PB- and RC- ---
        if (id.startsWith('PB-')) {
            const parts = id.split('-');
            const bookId = `PB-${parts[1]}`;
            const slipNum = Number(parts[2]);
            const bookIdx = pautiBooks.findIndex(b => b.pautiBookId === bookId);
            if (bookIdx > -1) {
                const slipIdx = pautiBooks[bookIdx].slips.findIndex(s => s.slipNumber === slipNum);
                if (slipIdx > -1) {
                    pautiBooks[bookIdx].slips[slipIdx].deleted = true;
                    await savePautiBooks();
                    return sendJSON(res, 200, { success: true });
                }
            }
            return sendJSON(res, 404, { message: 'Entry not found.' });
        }
        if (id.startsWith('RC-')) {
            const rId = id.substring(3);
            const idx = receipts.findIndex(r => r.receiptId === rId || r.receiptId === `RC-${rId}` || r.receiptId === id);
            if (idx > -1) {
                receipts[idx].deleted = true;
                await saveReceipts();
                return sendJSON(res, 200, { success: true });
            }
            return sendJSON(res, 404, { message: 'Entry not found.' });
        }
        // --- END INTERCEPT ---

        const idx = donationEntries.findIndex(e => e.entryId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Entry not found.' });
        donationEntries[idx].deleted   = true;
        donationEntries[idx].updatedAt = new Date().toISOString();
        await saveDonationEntries();
        console.log(`🗑️  Donation entry deleted: ${id}`);
        return sendJSON(res, 200, { success: true });
    }

    // ── GET /api/donation-entries/next-receipt  (auto-assign next free slot) ───────────
    if (req.method === 'GET' && pathname === '/api/donation-entries/next-receipt') {
        const BOOKS = 50, SLIPS = 50;
        for (let b = 1; b <= BOOKS; b++) {
            const used = donationEntries.filter(e => !e.deleted && e.bookNumber === b).map(e => e.receiptNumber);
            const from = (b-1)*SLIPS+1, to = b*SLIPS;
            for (let r = from; r <= to; r++) {
                if (!used.includes(r)) return sendJSON(res, 200, { bookNumber: b, receiptNumber: r });
            }
        }
        return sendJSON(res, 200, { bookNumber: null, receiptNumber: null, message: 'All receipt numbers are used.' });
    }

    // ── GET /api/donation-entries/used-receipts/:bookNumber  (check which are used) ──
    if (req.method === 'GET' && pathname.startsWith('/api/donation-entries/used-receipts/')) {
        const bn  = Number(pathname.replace('/api/donation-entries/used-receipts/', ''));
        const used = donationEntries
            .filter(e => !e.deleted && e.bookNumber === bn)
            .map(e => e.receiptNumber);
        return sendJSON(res, 200, { bookNumber: bn, usedReceipts: used });
    }

    // ══════════════════════════════════════════════════════════════
    // ─── BUILDINGS API ────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    // ── GET /api/buildings ───────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/buildings') {
        return sendJSON(res, 200, { buildings });
    }

    // ── POST /api/buildings ──────────────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/buildings') {
        try {
            const body = await readBody(req);
            const name = (body.name || '').trim();
            if (!name) return sendJSON(res, 400, { message: 'Building name is required.' });
            if (buildings.find(b => b.name.toLowerCase() === name.toLowerCase()))
                return sendJSON(res, 400, { message: `Building "${name}" already exists.` });
            const building = { id: `BLD-${Date.now()}`, name };
            buildings.push(building);
            await saveBuildings();
            console.log(`🏢 Building added: ${name}`);
            return sendJSON(res, 200, { success: true, building });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── DELETE /api/buildings/:id ────────────────────────────────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/buildings/')) {
        const id  = decodeURIComponent(pathname.replace('/api/buildings/', ''));
        const idx = buildings.findIndex(b => b.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Building not found.' });
        const [removed] = buildings.splice(idx, 1);
        await saveBuildings();
        console.log(`🗑️  Building removed: ${removed.name}`);
        return sendJSON(res, 200, { success: true });
    }

    // ══════════════════════════════════════════════════════════════
    // ─── AREAS API ────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    // ── GET /api/areas ───────────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/areas') {
        return sendJSON(res, 200, { areas });
    }

    // ── POST /api/areas ──────────────────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/areas') {
        try {
            const body = await readBody(req);
            const name = (body.name || '').trim();
            if (!name) return sendJSON(res, 400, { message: 'Area name is required.' });
            if (areas.find(a => a.name.toLowerCase() === name.toLowerCase()))
                return sendJSON(res, 400, { message: `Area "${name}" already exists.` });
            const area = { id: `AREA-${Date.now()}`, name };
            areas.push(area);
            await saveAreas();
            console.log(`📍 Area added: ${name}`);
            return sendJSON(res, 200, { success: true, area });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── DELETE /api/areas/:id ────────────────────────────────────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/areas/')) {
        const id  = decodeURIComponent(pathname.replace('/api/areas/', ''));
        const idx = areas.findIndex(a => a.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Area not found.' });
        const [removed] = areas.splice(idx, 1);
        await saveAreas();
        console.log(`🗑️  Area removed: ${removed.name}`);
        return sendJSON(res, 200, { success: true });
    }

    // ══════════════════════════════════════════════════════════════
    // ─── LANDMARKS API ────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    if (req.method === 'GET' && pathname === '/api/landmarks') {
        return sendJSON(res, 200, { landmarks });
    }
    if (req.method === 'POST' && pathname === '/api/landmarks') {
        try {
            const body = await readBody(req);
            const name = (body.name || '').trim();
            if (!name) return sendJSON(res, 400, { message: 'Landmark name is required.' });
            if (landmarks.find(l => l.name.toLowerCase() === name.toLowerCase()))
                return sendJSON(res, 400, { message: `Landmark "${name}" already exists.` });
            const lm = { id: `LM-${Date.now()}`, name };
            landmarks.push(lm);
            await saveLandmarks();
            return sendJSON(res, 200, { success: true, landmark: lm });
        } catch(err) { return sendJSON(res, 400, { message: err.message }); }
    }
    if (req.method === 'DELETE' && pathname.startsWith('/api/landmarks/')) {
        const id = decodeURIComponent(pathname.replace('/api/landmarks/', ''));
        const idx = landmarks.findIndex(l => l.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Landmark not found.' });
        landmarks.splice(idx, 1);
        await saveLandmarks();
        return sendJSON(res, 200, { success: true });
    }

    // ══════════════════════════════════════════════════════════════
    // ─── COMMITTEE MEMBERS API ────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    if (req.method === 'GET' && pathname === '/api/committee-members') {
        return sendJSON(res, 200, { members: committeeMembers });
    }
    if (req.method === 'POST' && pathname === '/api/committee-members') {
        try {
            const body = await readBody(req);
            const { name, memberId, phone, department, role } = body;
            if (!name || !name.trim()) return sendJSON(res, 400, { message: 'Member name is required.' });
            const member = {
                id: `CM-${Date.now()}`,
                name: name.trim(), memberId: (memberId||'').trim(), phone: (phone||'').trim(),
                department: (department||'').trim(), role: (role||'').trim(),
                photoFile: null, photoUrl: null,
                createdAt: new Date().toISOString()
            };
            committeeMembers.push(member);
            await saveCommitteeMembers();
            return sendJSON(res, 200, { success: true, member });
        } catch(err) { return sendJSON(res, 400, { message: err.message }); }
    }
    if (req.method === 'PUT' && pathname.startsWith('/api/committee-members/')) {
        const id = decodeURIComponent(pathname.replace('/api/committee-members/', ''));
        const idx = committeeMembers.findIndex(m => m.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Member not found.' });
        try {
            const body = await readBody(req);
            const m = committeeMembers[idx];
            if (body.name       !== undefined) m.name       = String(body.name).trim();
            if (body.memberId   !== undefined) m.memberId   = String(body.memberId).trim();
            if (body.phone      !== undefined) m.phone      = String(body.phone).trim();
            if (body.department !== undefined) m.department = String(body.department).trim();
            if (body.role       !== undefined) m.role       = String(body.role).trim();
            if (body.photoFile  !== undefined) { m.photoFile = body.photoFile||null; m.photoUrl = body.photoFile ? `/uploads/${body.photoFile}` : null; }
            m.updatedAt = new Date().toISOString();
            await saveCommitteeMembers();
            return sendJSON(res, 200, { success: true, member: m });
        } catch(err) { return sendJSON(res, 400, { message: err.message }); }
    }
    if (req.method === 'DELETE' && pathname.startsWith('/api/committee-members/')) {
        const id = decodeURIComponent(pathname.replace('/api/committee-members/', ''));
        const idx = committeeMembers.findIndex(m => m.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Member not found.' });
        committeeMembers.splice(idx, 1);
        await saveCommitteeMembers();
        return sendJSON(res, 200, { success: true });
    }

    // ── POST /api/upload-committee-photo ─────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/upload-committee-photo') {
        try {
            const ct = req.headers['content-type'] || '';
            const bm = ct.match(/boundary=([^;]+)/i);
            if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
            const rawBody = await readRawBody(req);
            const parts   = parseMultipart(rawBody, bm[1].trim());
            const filePart = parts.find(p => p.name === 'photo' && p.filename);
            if (!filePart) return sendJSON(res, 400, { message: 'No photo received.' });
            if (filePart.data.length > 5 * 1024 * 1024) return sendJSON(res, 400, { message: 'File exceeds 5 MB.' });
            const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `cm_${Date.now()}_${safeName}`;
            try {
                fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data);
            } catch (fsErr) {
                console.warn('⚠️  Could not write committee photo to disk:', fsErr.message);
            }
            const memberIdPart = parts.find(p => p.name === 'memberId' && !p.filename);
            const memberId = memberIdPart ? memberIdPart.data.toString('utf8').trim() : null;
            if (memberId) {
                const midx = committeeMembers.findIndex(m => m.id === memberId);
                if (midx !== -1) {
                    committeeMembers[midx].photoFile = uniqueName;
                    committeeMembers[midx].photoUrl  = `/uploads/${uniqueName}`;
                    committeeMembers[midx].updatedAt = new Date().toISOString();
                    await saveCommitteeMembers();
                }
            }
            return sendJSON(res, 200, { success: true, fileName: uniqueName });
        } catch(err) { return sendJSON(res, 500, { message: 'Upload error: ' + err.message }); }
    }

    // ── Static file serving ───────────────────────────────────────────────
    // Only serve static files for GET/HEAD — all other methods should have
    // been handled by an API route above.  If we reach here with POST/PUT/DELETE
    // it means no route matched → return 404 JSON immediately instead of hanging.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendJSON(res, 404, { message: `No API route for ${req.method} ${pathname}` });
    }

    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);


    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Try appending .html
            const withHtml = filePath + '.html';
            fs.readFile(withHtml, (err2, data2) => {
                if (err2) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    return res.end('404 Not Found');
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data2);
            });
            return;
        }

        const ext      = path.extname(filePath).toLowerCase();
        const mimeType = MIME[ext] || 'application/octet-stream';
        const isUpload = filePath.startsWith(UPLOADS_DIR);
        const headers  = {
            'Content-Type'               : mimeType,
            'Access-Control-Allow-Origin': '*',
        };
        // Cache uploaded images for 1 hour; client busts with ?t=timestamp
        if (isUpload) headers['Cache-Control'] = 'public, max-age=3600';
        res.writeHead(200, headers);
        res.end(data);
    });
});

// ─── Connect to MongoDB, then start HTTP server ───────────────────────────────
connectDB().then(() => {
    // Bind to 0.0.0.0 so the site is reachable on the local network (mobile, tablet, etc.)
    server.listen(PORT, '0.0.0.0', () => {
        const LAN = getLocalIP();
        console.log('');
        console.log('🕩️  Patelwadi Ganesh Mitramandal — Local Server');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🌐  PC / Browser:  http://localhost:${PORT}`);
        console.log(`📱  Phone / LAN:   http://${LAN}:${PORT}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📋  Receipts:      http://localhost:${PORT}/api/receipts`);
        console.log(`💾  Files dir:     ${UPLOADS_DIR}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
    });
}).catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
});