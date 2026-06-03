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
const translate = require('translate-google');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// ── Cloudinary Upload Helper ─────────────────────────────
async function uploadToCloudinary(buffer, filename) {
    const config = globalSettings.cloudinaryConfig || {};
    const cloudName = config.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = config.apiKey    || process.env.CLOUDINARY_API_KEY;
    const apiSecret = config.apiSecret || process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        console.error('[Cloudinary] Upload skipped — missing credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET).');
        return null;
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

    console.log(`[Cloudinary] Uploading "${filename}" to folder "website-uploads"...`);

    try {
        // Use data URI upload — more reliable than upload_stream for arbitrary buffers
        const dataUri = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
        const result = await cloudinary.uploader.upload(dataUri, {
            public_id: filename,
            resource_type: 'auto',
            folder: 'website-uploads'
        });
        console.log(`[Cloudinary] Upload SUCCESS — URL: ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.error(`[Cloudinary] Upload FAILED for "${filename}"`);
        console.error(`[Cloudinary] Error message : ${error.message}`);
        console.error(`[Cloudinary] Error HTTP status: ${error.http_code}`);
        console.error(`[Cloudinary] Full error:`, JSON.stringify(error, null, 2));
        return null;
    }
}

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
let colSettings;
let globalSettings = { eventDate: '2026-09-07T00:00:00.000Z', tshirtPhotos: [null, null, null, null] };
let colReceipts, colExpenses, colFinancials, colPautiBooks;
let colDonations, colDonationEntries, colBuildings, colAreas, colSubAreas;
let colLandmarks, colCommitteeMembers, colGallery, colEvents;
let colTshirts, colTshirtSettings;
let colVolunteerCards;

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
let subAreas          = [];
let landmarks         = [];
let committeeMembers  = [];
let financials        = [];
let pautiBooks        = [];
let receipts          = [];
let expenses          = [];
let tshirts           = [];
let tshirtSettings    = { price: 350 };
let galleryPhotos     = [];
let events            = [];
let volunteerCards    = [];


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

async function saveSubAreas() {
    await colSubAreas.deleteMany({});
    if (subAreas.length > 0) await colSubAreas.insertMany(subAreas.map(s => ({ ...s })));
}

async function saveLandmarks() {
    await colLandmarks.deleteMany({});
    if (landmarks.length > 0) await colLandmarks.insertMany(landmarks.map(l => ({ ...l })));
}

async function saveCommitteeMembers() {
    await colCommitteeMembers.deleteMany({});
    if (committeeMembers.length > 0) await colCommitteeMembers.insertMany(committeeMembers.map(m => ({ ...m })));
}

async function saveVolunteerCards() {
    await colVolunteerCards.deleteMany({});
    if (volunteerCards.length > 0) await colVolunteerCards.insertMany(volunteerCards.map(v => ({ ...v })));
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

async function saveGallery() {
    await colGallery.deleteMany({});
    if (galleryPhotos.length > 0) await colGallery.insertMany(galleryPhotos.map(p => ({ ...p })));
    broadcastLiveEvent('gallery_updated');
}

async function saveEvents() {
    await colEvents.deleteMany({});
    if (events.length > 0) await colEvents.insertMany(events.map(e => ({ ...e })));
    broadcastLiveEvent('events_updated');
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
    colSettings         = db.collection('settings');
    colDonations        = db.collection('donations');
    colDonationEntries  = db.collection('donationEntries');
    colBuildings        = db.collection('buildings');
    colAreas            = db.collection('areas');
    colSubAreas         = db.collection('subAreas');
    colLandmarks        = db.collection('landmarks');
    colCommitteeMembers = db.collection('committeeMembers');
    colGallery          = db.collection('gallery');
    colEvents           = db.collection('events');
    colTshirts          = db.collection('tshirts');
    colTshirtSettings   = db.collection('tshirtSettings');
    colVolunteerCards   = db.collection('volunteerCards');
    

    const settingsDoc = await colSettings.findOne({});
    if (settingsDoc) {
        globalSettings = { ...globalSettings, ...stripId(settingsDoc) };
        console.log(`✅ Loaded global settings from MongoDB`);
    }

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

    // ── Seed fixed areas if absent ────────────────────────────────────────────
    const FIXED_AREAS = [
        { id: 'AREA-001', name: 'Patelwadi' },
        { id: 'AREA-002', name: 'Shindewadi' },
        { id: 'AREA-003', name: 'Gurkhawadi' }
    ];
    let areasDirty = false;
    for (const fa of FIXED_AREAS) {
        if (!areas.find(a => a.name.toLowerCase() === fa.name.toLowerCase())) {
            areas.push(fa);
            areasDirty = true;
        }
    }
    if (areasDirty) {
        await saveAreas();
        console.log('📍 Seeded missing fixed areas into MongoDB');
    }

    // ── Load sub-areas ────────────────────────────────────────────────────────
    subAreas = (await colSubAreas.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${subAreas.length} sub-area(s) from MongoDB`);

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

    // ── Load gallery photos ───────────────────────────────────────────────────
    galleryPhotos = (await colGallery.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${galleryPhotos.length} gallery photo(s) from MongoDB`);

    // ── Load events ───────────────────────────────────────────────────────────
    events = (await colEvents.find({}).toArray()).map(stripId);
    console.log(`📂 Loaded ${events.length} event(s) from MongoDB`);

    // ── Load volunteer cards ──────────────────────────────────────────────────
    const vcArr = (await colVolunteerCards.find({}).toArray()).map(stripId);
    if (vcArr.length > 0) volunteerCards = vcArr;



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

    // ── Request logger (POST only, for debugging) ──────────────────
    if (req.method === 'POST') {
        console.log(`[REQ] POST ${pathname}`);
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

    

    // ── GET /api/tshirts/settings ──────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/tshirts/settings') {
        try {
            const settings = await db.collection('tshirtSettings').findOne({}) || { price: 350 };
            return sendJSON(res, 200, { price: settings.price, coordinators: settings.coordinators });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Server error' });
        }
    }

    // ── POST /api/tshirts/settings ─────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/tshirts/settings') {
        try {
            const body = await readBody(req);
            const updateDoc = {};
            if (body.price !== undefined && !isNaN(Number(body.price))) {
                updateDoc.price = Number(body.price);
            }
            if (Array.isArray(body.coordinators)) {
                updateDoc.coordinators = body.coordinators;
            }
            if (Object.keys(updateDoc).length === 0) {
                return sendJSON(res, 400, { message: 'Valid price or coordinators required' });
            }
            await db.collection('tshirtSettings').updateOne({}, { $set: updateDoc }, { upsert: true });
            return sendJSON(res, 200, { success: true, ...updateDoc });
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
                id: `TSH-${Date.now()}`,
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


    // ── PUT /api/profile (Admin and Volunteer update profile) ────────
    if (req.method === 'PUT' && pathname === '/api/profile') {
        try {
            const body = await readBody(req);
            const { username, name, contactNumber, email, password, photoBase64, photoExt, idProofBase64, idProofExt } = body;
            
            if (!username) return sendJSON(res, 400, { message: 'Username is required' });
            
            const colUsers = db.collection('users');
            let user = await colUsers.findOne({ username });
            
            const updateFields = {};
            if (name !== undefined) updateFields.name = String(name);
            if (contactNumber !== undefined) updateFields.contactNumber = String(contactNumber);
            if (email !== undefined) updateFields.email = String(email);
            if (password) updateFields.password = String(password); // Simple update since system stores plain text
            
            // Handle Photo upload — store as base64 data URL in MongoDB so it
            // survives Render's ephemeral filesystem (no disk writes needed).
            if (photoBase64) {
                const pExt = (photoExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
                const mime = pExt === 'png' ? 'image/png' : (pExt === 'gif' ? 'image/gif' : 'image/jpeg');
                updateFields.photoUrl = `data:${mime};base64,${photoBase64}`;
                // Also attempt disk write for local dev (silently ignore errors on Render)
                try {
                    const filename = `profile_${username}_${Date.now()}.${pExt}`;
                    const filepath = path.join(__dirname, 'uploads', filename);
                    fs.writeFileSync(filepath, Buffer.from(photoBase64, 'base64'));
                } catch (_e) { /* read-only FS on Render — data URL is the source of truth */ }
            }
            
            // Handle ID Proof upload — same approach: store as base64 data URL in MongoDB
            if (idProofBase64) {
                const iExt = (idProofExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
                const mime = iExt === 'png' ? 'image/png' : (iExt === 'gif' ? 'image/gif' : 'image/jpeg');
                updateFields.idProofUrl = `data:${mime};base64,${idProofBase64}`;
                try {
                    const filename = `idproof_${username}_${Date.now()}.${iExt}`;
                    const filepath = path.join(__dirname, 'uploads', filename);
                    fs.writeFileSync(filepath, Buffer.from(idProofBase64, 'base64'));
                } catch (_e) { /* read-only FS on Render — data URL is the source of truth */ }
            }
            
            if (user) {
                await colUsers.updateOne({ username }, { $set: updateFields });
            } else {
                // E.g. mastercontrol or built-in volunteer updating profile for the first time
                updateFields.username = username;
                updateFields.role = (username === process.env.MASTER_USERNAME || username === 'mastercontrol') ? 'admin' : 'volunteer';
                await colUsers.insertOne(updateFields);
            }
            
            const updatedUser = await colUsers.findOne({ username });
            
            return sendJSON(res, 200, { success: true, message: 'Profile updated successfully.', user: updatedUser });
        } catch (err) {
            console.error('PUT /api/profile error:', err.message);
            return sendJSON(res, 500, { message: 'Server error' });
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

            // ── Master control check (env-only, never touches DB, never visible in user list) ──
            const MASTER_USER = process.env.MASTER_USERNAME || 'mastercontrol';
            const MASTER_PASS = process.env.MASTER_PASSWORD || 'M@sterC0ntrol#2025!';
            const colUsers = db.collection('users');
            
            if (username === MASTER_USER && password === MASTER_PASS) {
                const masterProfile = await colUsers.findOne({ username: MASTER_USER });
                return sendJSON(res, 200, { success: true, isMaster: true, user: {
                    id        : '__master__',
                    username  : MASTER_USER,
                    name      : masterProfile?.name || 'Master Control',
                    role      : 'admin',
                    email     : masterProfile?.email || '',
                    department: '',
                    contactNumber: masterProfile?.contactNumber || '',
                    photoUrl  : masterProfile?.photoUrl || '',
                    idProofUrl: masterProfile?.idProofUrl || ''
                }});
            }

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
                contactNumber: existing.contactNumber || '',
                photoUrl  : existing.photoUrl || '',
                idProofUrl: existing.idProofUrl || ''
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
            const MASTER_USER = process.env.MASTER_USERNAME || 'mastercontrol';
            const users = await colUsers.find({}).toArray();
            return sendJSON(res, 200, {
                users: users
                    .filter(u => u.username !== MASTER_USER) // never expose master in user list
                    .map(u => ({
                        id       : u.id || u._id?.toString(),
                        username : u.username,
                        name     : u.name || u.username,
                        role     : u.role || 'volunteer',
                        email    : u.email || '',
                        department: u.department || '',
                        contactNumber: u.contactNumber || '',
                        photoUrl : u.photoUrl || '',
                        idProofUrl: u.idProofUrl || '',
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
        const qp  = new URL(`http://x${req.url}`).searchParams;
        const by  = qp.get('by') || 'Unknown';
        
        // 1. Check Receipts
        const rIdx = receipts.findIndex(r => r.receiptId === id);
        if (rIdx !== -1) {
            receipts[rIdx].status = 'received';
            receipts[rIdx].paymentMode = 'Cash';
            receipts[rIdx].markedReceivedBy = by;
            receipts[rIdx].updatedAt = new Date().toISOString();
            await saveReceipts();
            console.log(`✅  Balance marked received (Receipt): ${receipts[rIdx].receiptId}`);
            return sendJSON(res, 200, { success: true, receipt: receipts[rIdx] });
        }

        // 2. Check Donation Entries
        const dIdx = donationEntries.findIndex(e => e.entryId === id);
        if (dIdx !== -1) {
            donationEntries[dIdx].status = 'Received';
            donationEntries[dIdx].paymentMode = 'Cash';
            donationEntries[dIdx].markedReceivedBy = by;
            donationEntries[dIdx].updatedAt = new Date().toISOString();
            await saveDonationEntries();
            console.log(`✅  Balance marked received (Donation): ${donationEntries[dIdx].entryId}`);
            return sendJSON(res, 200, { success: true, receipt: donationEntries[dIdx] });
        }

        // 3. Check Pauti Books
        let foundSlip = null;
        if (id.startsWith('SLIP-')) {
            const slipNum = id.replace('SLIP-', '');
            for (const book of pautiBooks) {
                const sIdx = (book.slips || []).findIndex(s => String(s.slipNumber) === slipNum);
                if (sIdx !== -1) {
                    book.slips[sIdx].status = 'Received';
                    book.slips[sIdx].paymentMode = 'Cash';
                    book.slips[sIdx].markedReceivedBy = by;
                    book.slips[sIdx].updatedAt = new Date().toISOString();
                    foundSlip = book.slips[sIdx];
                    break;
                }
            }
        }
        if (foundSlip) {
            await savePautiBooks();
            console.log(`✅  Balance marked received (Pauti): ${foundSlip.slipNumber}`);
            return sendJSON(res, 200, { success: true, receipt: foundSlip });
        }

        return sendJSON(res, 404, { message: 'Receipt not found.' });
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
            const uniqueName = `passbook_${Date.now()}_${safeName}`;

            // Try Cloudinary first, fall back to local disk
            let fileUrl = null;
            const cloudUrl = await uploadToCloudinary(filePart.data, uniqueName);
            if (cloudUrl) {
                fileUrl = cloudUrl;
            } else {
                try {
                    fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data);
                    fileUrl = `/uploads/${uniqueName}`;
                    console.log(`📎 File saved locally: uploads/${uniqueName} (${(filePart.data.length / 1024).toFixed(1)} KB)`);
                } catch (fsErr) {
                    console.warn('⚠️  Could not write file to disk:', fsErr.message);
                }
            }

            // Link to receipt if receiptId was supplied as a form field
            const receiptIdPart = parts.find(p => p.name === 'receiptId' && !p.filename);
            const receiptId     = receiptIdPart ? receiptIdPart.data.toString('utf8').trim() : null;
            let linkedReceiptId = null;
            if (receiptId) {
                const idx = receipts.findIndex(r => r.receiptId === receiptId);
                if (idx !== -1) {
                    receipts[idx].passbookFile = uniqueName;
                    receipts[idx].passbookUrl  = fileUrl;
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
                    donationEntries[eidx].photoUrl  = fileUrl;
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
                        pautiBooks[bidx].slips[sidx].photoUrl  = fileUrl;
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
            if (!referenceNumber) return sendJSON(res, 400, { message: 'Reference Number is required.' });
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
                _bsData              : body._bsData || null,
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
            if (body.year    !== undefined) financials[idx].year    = String(body.year);
            if (body.notes   !== undefined) financials[idx].notes   = String(body.notes).trim();
            if (body._bsData !== undefined) financials[idx]._bsData = body._bsData || null;
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
        function normalizeStatus(st, pm) {
            let s = String(st || '').toLowerCase().trim();
            if (s === 'undefined' || s === 'null' || s === '') {
                return String(pm || '').toLowerCase().trim() === 'balance' ? 'Balance' : 'Received';
            }
            return s.charAt(0).toUpperCase() + s.slice(1);
        }

        let result = donationEntries.filter(e => !e.deleted).map(e => ({
            ...e,
            status: normalizeStatus(e.status, e.paymentMode)
        }));
        
        // Merge Received slips from Pauti Books
        pautiBooks.forEach(book => {
            if (bookFilter && String(book.bookNumber) !== String(bookFilter)) return;
            (book.slips || []).forEach(slip => {
                const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
                if (slip.uploadedAt && !slip.deleted && getStatus(slip) === 'received' && slip.amount && Number(slip.amount) > 0) {
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
                        status: normalizeStatus(slip.status, slip.paymentMode),
                        photoUrl: slip.photoUrl || null,
                        submittedAt: slip.uploadedAt,
                        submittedBy: slip.uploadedBy || 'Auto',
                        submittedByUserId: slip.uploadedByUserId || null,
                        area: slip.area || null,
                        referenceNumber: slip.referenceNumber || slip.checkNumber || null,
                        markedReceivedBy: slip.markedReceivedBy || null
                    });
                }
            });
        });

        // Merge Received slips from Receipts
        receipts.forEach(r => {
            if (bookFilter && String(r.bookNumber) !== String(bookFilter)) return;
            const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
            if (!r.deleted && getStatus(r) === 'received') {
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
                    status: normalizeStatus(r.status, r.paymentMode),
                    photoUrl: r.photoUrl || null,
                    submittedAt: r.date || r.createdAt || new Date().toISOString(),
                    submittedBy: 'Admin',
                    area: r.area || null,
                    referenceNumber: r.referenceNumber || null,
                    markedReceivedBy: r.markedReceivedBy || null
                });
            }
        });

        const userIdFilter = qp.get('userId');
        if (areaFilter) result = result.filter(e => e.area === areaFilter);
        if (userIdFilter) result = result.filter(e =>
            String(e.submittedByUserId || e.userId || '') === String(userIdFilter)
        );
        
        // Sort chronologically so they appear in correct order
        result.sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));

        return sendJSON(res, 200, { entries: result, total: result.length, slipsPerBook: SLIPS_PER_BOOK_DE, totalBooks: TOTAL_BOOKS_DE });
    }

    // ── POST /api/donation-entries  (create new entry) ────────────────────
    if (req.method === 'POST' && pathname === '/api/donation-entries') {
        try {
            const body = await readBody(req);
            const {
                bookNumber, receiptNumber, donorType, bookType,
                firstName, middleName, lastName, businessName,
                whatsappNumber, mobileNumber, mailId,
                buildingName, flatNumber, area, subArea, landmark,
                amount, paymentMode, referenceNumber,
                submittedBy, submittedByUserId
            } = body;

            // ── Validation ──────────────────────────────────────────────
            const bn = Number(bookNumber);
            const rn = Number(receiptNumber);
            const bType = bookType === 'Old' ? 'Old' : 'New';
            const maxBooks = bType === 'Old' ? 30 : TOTAL_BOOKS_DE;
            if (!bn || bn < 1 || bn > maxBooks)
                return sendJSON(res, 400, { message: `Book number must be 1–${maxBooks}.` });
            const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;
            const expectedTo   = bn * SLIPS_PER_BOOK_DE;
            if (!rn || rn < expectedFrom || rn > expectedTo)
                return sendJSON(res, 400, { message: `Receipt number for Book ${bn} must be ${expectedFrom}–${expectedTo}.` });

            // Check receipt number not already used
            const dup = donationEntries.find(e => !e.deleted && e.bookNumber === bn && e.receiptNumber === rn && (e.bookType || 'New') === bType);
            if (dup) return sendJSON(res, 400, { message: `Receipt #${rn} in Book ${bn} (${bType}) is already used.` });

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
                bookType         : bType,
                donorType        : donorType,
                firstName        : donorType === 'Individual' ? String(firstName).trim().toUpperCase() : null,
                middleName       : donorType === 'Individual' ? String(middleName).trim().toUpperCase() : null,
                lastName         : donorType === 'Individual' ? String(lastName).trim().toUpperCase() : null,
                businessName     : donorType === 'Business'   ? String(businessName).trim().toUpperCase() : null,
                whatsappNumber   : (whatsappNumber || '').trim() || null,
                mobileNumber     : (mobileNumber   || '').trim() || null,
                mailId           : (mailId          || '').trim() || null,
                buildingName     : (buildingName    || '').trim() || null,
                flatNumber       : (flatNumber      || '').trim() || null,
                area             : (area            || '').trim() || null,
                subArea          : (subArea         || '').trim() || null,
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

            // Common Validation for Edit: Ensure book/receipt aren't duplicated and bounds are valid
            const newBook = body.bookNumber !== undefined ? Number(body.bookNumber) : e.bookNumber;
            const newReceipt = body.receiptNumber !== undefined ? Number(body.receiptNumber) : e.receiptNumber;
            const newType = body.bookType !== undefined ? body.bookType : (e.bookType || 'New');

            if (newBook !== e.bookNumber || newReceipt !== e.receiptNumber || newType !== (e.bookType || 'New')) {
                const maxBooks = newType === 'Old' ? 30 : TOTAL_BOOKS_DE;
                if (!newBook || newBook < 1 || newBook > maxBooks) {
                    return sendJSON(res, 400, { message: `Book number must be 1–${maxBooks}.` });
                }
                const dup = donationEntries.find(x => !x.deleted && x.entryId !== id && x.bookNumber === newBook && x.receiptNumber === newReceipt && (x.bookType || 'New') === newType);
                if (dup) return sendJSON(res, 400, { message: `Receipt #${newReceipt} in Book ${newBook} (${newType}) is already used.` });
                
                const expectedFrom = (newBook - 1) * SLIPS_PER_BOOK_DE + 1;
                const expectedTo   = newBook * SLIPS_PER_BOOK_DE;
                if (newReceipt < expectedFrom || newReceipt > expectedTo)
                    return sendJSON(res, 400, { message: `Receipt number for Book ${newBook} must be ${expectedFrom}–${expectedTo}.` });
            }

            if (isAdmin) {
                // Admin: all editable fields
                const fields = ['bookNumber','receiptNumber','bookType','donorType','firstName','middleName','lastName',
                                'businessName','whatsappNumber','mobileNumber','mailId','buildingName',
                                'flatNumber','area','subArea','amount','paymentMode','referenceNumber','status'];
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
                if (body.subArea       !== undefined) e.subArea       = String(body.subArea);
                if (body.buildingName  !== undefined) e.buildingName  = String(body.buildingName);
                if (body.flatNumber    !== undefined) e.flatNumber    = String(body.flatNumber);
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
        const qp = new URL(`http://x${req.url}`).searchParams;
        const bType = qp.get('type') || 'New';
        const maxBooks = bType === 'Old' ? 30 : 50;
        const SLIPS = 50;
        for (let b = 1; b <= maxBooks; b++) {
            const used = donationEntries.filter(e => !e.deleted && e.bookNumber === b && (e.bookType || 'New') === bType).map(e => e.receiptNumber);
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
        const qp = new URL(`http://x${req.url}`).searchParams;
        const bType = qp.get('type') || 'New';
        const used = donationEntries
            .filter(e => !e.deleted && e.bookNumber === bn && (e.bookType || 'New') === bType)
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
        // Cascade-delete any sub-areas that belong to this area
        const beforeCount = subAreas.length;
        subAreas = subAreas.filter(s => s.areaId !== id);
        if (subAreas.length !== beforeCount) await saveSubAreas();
        console.log(`🗑️  Area removed: ${removed.name}`);
        return sendJSON(res, 200, { success: true });
    }

    // ══════════════════════════════════════════════════════════════
    // ─── SUB-AREAS API ────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    // ── GET /api/sub-areas ───────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/sub-areas') {
        return sendJSON(res, 200, { subAreas });
    }

    // ── POST /api/sub-areas ──────────────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/sub-areas') {
        try {
            const body = await readBody(req);
            const name   = (body.name   || '').trim();
            const areaId = (body.areaId || '').trim();
            if (!name)   return sendJSON(res, 400, { message: 'Sub-area name is required.' });
            if (!areaId) return sendJSON(res, 400, { message: 'areaId is required.' });
            if (!areas.find(a => a.id === areaId))
                return sendJSON(res, 400, { message: 'Parent area not found.' });
            if (subAreas.find(s => s.areaId === areaId && s.name.toLowerCase() === name.toLowerCase()))
                return sendJSON(res, 400, { message: `Sub-area "${name}" already exists in this area.` });
            const subArea = { id: `SA-${Date.now()}`, name, areaId };
            subAreas.push(subArea);
            await saveSubAreas();
            console.log(`📍 Sub-area added: ${name} (area: ${areaId})`);
            return sendJSON(res, 200, { success: true, subArea });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── PUT /api/sub-areas/:id ───────────────────────────────────────────────
    if (req.method === 'PUT' && pathname.startsWith('/api/sub-areas/')) {
        const id  = decodeURIComponent(pathname.replace('/api/sub-areas/', ''));
        const idx = subAreas.findIndex(s => s.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Sub-area not found.' });
        try {
            const body = await readBody(req);
            const name = (body.name || '').trim();
            if (!name) return sendJSON(res, 400, { message: 'Sub-area name is required.' });
            subAreas[idx].name = name;
            await saveSubAreas();
            return sendJSON(res, 200, { success: true, subArea: subAreas[idx] });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── DELETE /api/sub-areas/:id ────────────────────────────────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/sub-areas/')) {
        const id  = decodeURIComponent(pathname.replace('/api/sub-areas/', ''));
        const idx = subAreas.findIndex(s => s.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Sub-area not found.' });
        const [removed] = subAreas.splice(idx, 1);
        await saveSubAreas();
        console.log(`🗑️  Sub-area removed: ${removed.name}`);
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
            const { name, memberId, phone, whatsapp, department, role } = body;
            if (!name || !name.trim()) return sendJSON(res, 400, { message: 'Member name is required.' });
            const member = {
                id: `CM-${Date.now()}`,
                name: name.trim(),
                memberId: (memberId||'').trim(),
                phone: (phone||'').trim(),
                whatsapp: (whatsapp||'').trim(),
                department: (department||'').trim(),
                role: (role||'').trim(),
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
            if (body.whatsapp   !== undefined) m.whatsapp   = String(body.whatsapp).trim();
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
            const ext  = path.extname(safeName).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : (ext === '.gif' ? 'image/gif' : 'image/jpeg');
            // Store as base64 data URL — survives server restarts & ephemeral filesystems
            const dataUrl = `data:${mime};base64,${filePart.data.toString('base64')}`;
            // Also attempt disk write for fast local serving (silently ignore errors)
            try { fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data); } catch (_) {}
            const memberIdPart = parts.find(p => p.name === 'memberId' && !p.filename);
            const memberId = memberIdPart ? memberIdPart.data.toString('utf8').trim() : null;
            if (memberId) {
                const midx = committeeMembers.findIndex(m => m.id === memberId);
                if (midx !== -1) {
                    committeeMembers[midx].photoFile = uniqueName;
                    committeeMembers[midx].photoUrl  = dataUrl;
                    committeeMembers[midx].updatedAt = new Date().toISOString();
                    await saveCommitteeMembers();
                }
            }
            return sendJSON(res, 200, { success: true, fileName: uniqueName });
        } catch(err) { return sendJSON(res, 500, { message: 'Upload error: ' + err.message }); }
    }

    // ══════════════════════════════════════════════════════════════
    // ─── VOLUNTEER CARDS API ──────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    if (req.method === 'GET' && pathname === '/api/volunteer-cards') {
        return sendJSON(res, 200, { cards: volunteerCards });
    }
    if (req.method === 'POST' && pathname === '/api/volunteer-cards') {
        try {
            const body = await readBody(req);
            const { name, position, phone } = body;
            if (!name || !name.trim()) return sendJSON(res, 400, { message: 'Volunteer name is required.' });
            const card = {
                id: `VC-${Date.now()}`,
                name: name.trim(),
                position: (position || '').trim(),
                phone: (phone || '').trim(),
                photoFile: null, photoUrl: null,
                createdAt: new Date().toISOString()
            };
            volunteerCards.push(card);
            await saveVolunteerCards();
            return sendJSON(res, 200, { success: true, card });
        } catch(err) { return sendJSON(res, 400, { message: err.message }); }
    }
    if (req.method === 'PUT' && pathname.startsWith('/api/volunteer-cards/')) {
        const id = decodeURIComponent(pathname.replace('/api/volunteer-cards/', ''));
        const idx = volunteerCards.findIndex(v => v.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Volunteer card not found.' });
        try {
            const body = await readBody(req);
            const v = volunteerCards[idx];
            if (body.name     !== undefined) v.name     = String(body.name).trim();
            if (body.position !== undefined) v.position = String(body.position).trim();
            if (body.phone    !== undefined) v.phone    = String(body.phone).trim();
            if (body.photoFile !== undefined) {
                v.photoFile = body.photoFile || null;
                v.photoUrl = body.photoFile ? `/uploads/${body.photoFile}` : null;
            }
            v.updatedAt = new Date().toISOString();
            await saveVolunteerCards();
            return sendJSON(res, 200, { success: true, card: v });
        } catch(err) { return sendJSON(res, 400, { message: err.message }); }
    }
    if (req.method === 'DELETE' && pathname.startsWith('/api/volunteer-cards/')) {
        const id = decodeURIComponent(pathname.replace('/api/volunteer-cards/', ''));
        const idx = volunteerCards.findIndex(v => v.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Volunteer card not found.' });
        volunteerCards.splice(idx, 1);
        await saveVolunteerCards();
        return sendJSON(res, 200, { success: true });
    }
    if (req.method === 'POST' && pathname === '/api/upload-volunteer-photo') {
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
            const uniqueName = `vc_${Date.now()}_${safeName}`;
            const ext  = path.extname(safeName).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : (ext === '.gif' ? 'image/gif' : 'image/jpeg');
            // Store as base64 data URL — survives server restarts & ephemeral filesystems
            const dataUrl = `data:${mime};base64,${filePart.data.toString('base64')}`;
            // Also attempt disk write for fast local serving (silently ignore errors)
            try { fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data); } catch (_) {}
            const cardIdPart = parts.find(p => p.name === 'volunteerId' && !p.filename);
            const cardId = cardIdPart ? cardIdPart.data.toString('utf8').trim() : null;
            if (cardId) {
                const vidx = volunteerCards.findIndex(v => v.id === cardId);
                if (vidx !== -1) {
                    volunteerCards[vidx].photoFile = uniqueName;
                    volunteerCards[vidx].photoUrl  = dataUrl;
                    volunteerCards[vidx].updatedAt = new Date().toISOString();
                    await saveVolunteerCards();
                }
            }
            return sendJSON(res, 200, { success: true, fileName: uniqueName });
        } catch(err) { return sendJSON(res, 500, { message: 'Upload error: ' + err.message }); }
    }

    // ══════════════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════════════
    // ─── GALLERY API ──────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    if (req.method === 'GET' && pathname === '/api/gallery') {
        return sendJSON(res, 200, { photos: galleryPhotos });
    }
    if (req.method === 'POST' && pathname === '/api/gallery') {
        console.log(`[GALLERY] POST /api/gallery hit — Content-Type: ${req.headers['content-type']}`);
        try {
            const ct = req.headers['content-type'] || '';
            const bm = ct.match(/boundary=([^;]+)/i);
            if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
            const rawBody = await readRawBody(req);
            const parts   = parseMultipart(rawBody, bm[1].trim());
            const filePart = parts.find(p => p.name === 'photo' && p.filename);
            if (!filePart) return sendJSON(res, 400, { message: 'No photo received.' });

            const descPart = parts.find(p => p.name === 'description' && !p.filename);
            const description = descPart ? descPart.data.toString('utf8').trim() : '';

            const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `gallery_${Date.now()}_${safeName}`;

            // Try Cloudinary first, fall back to local disk
            let photoUrl = null;
            const cloudUrl = await uploadToCloudinary(filePart.data, uniqueName);
            if (cloudUrl) {
                photoUrl = cloudUrl;
            } else {
                try {
                    fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data);
                    photoUrl = '/uploads/' + uniqueName;
                } catch (fsErr) {
                    console.warn('⚠️  Could not write gallery photo to disk:', fsErr.message);
                    return sendJSON(res, 500, { message: 'Failed to save photo.' });
                }
            }

            const photo = {
                id: `GAL-${Date.now()}`,
                description: description,
                photoFile: uniqueName,
                photoUrl: photoUrl,
                createdAt: new Date().toISOString()
            };
            galleryPhotos.push(photo);
            await saveGallery();

            return sendJSON(res, 200, { success: true, photo });
        } catch(err) { return sendJSON(res, 500, { message: 'Upload error: ' + err.message }); }
    }
    if (req.method === 'PUT' && pathname.startsWith('/api/gallery/')) {
        const id = decodeURIComponent(pathname.replace('/api/gallery/', ''));
        const idx = galleryPhotos.findIndex(p => p.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Photo not found.' });
        try {
            const body = await readBody(req);
            if (body.description !== undefined) {
                galleryPhotos[idx].description = String(body.description).trim();
            }
            galleryPhotos[idx].updatedAt = new Date().toISOString();
            await saveGallery();
            return sendJSON(res, 200, { success: true, photo: galleryPhotos[idx] });
        } catch(err) { return sendJSON(res, 400, { message: err.message }); }
    }
    if (req.method === 'DELETE' && pathname.startsWith('/api/gallery/')) {
        const id = decodeURIComponent(pathname.replace('/api/gallery/', ''));
        const idx = galleryPhotos.findIndex(p => p.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Photo not found.' });
        galleryPhotos.splice(idx, 1);
        await saveGallery();
        return sendJSON(res, 200, { success: true });
    }

    // ══════════════════════════════════════════════════════════════
    // ─── EVENTS API ───────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    if (req.method === 'GET' && pathname === '/api/events') {
        return sendJSON(res, 200, { events });
    }
    if (req.method === 'POST' && pathname === '/api/events') {
        try {
            const body = await readBody(req);
            const { title, date, time, location, description } = body;
            if (!title || !title.trim()) return sendJSON(res, 400, { message: 'Event title is required.' });
            if (!date || !date.trim()) return sendJSON(res, 400, { message: 'Event date is required.' });
            
            const event = {
                id: `EVT-${Date.now()}`,
                title: title.trim(),
                date: date.trim(),
                time: (time || '').trim(),
                location: (location || '').trim(),
                description: (description || '').trim(),
                createdAt: new Date().toISOString()
            };
            events.push(event);
            await saveEvents();
            return sendJSON(res, 200, { success: true, event });
        } catch(err) { return sendJSON(res, 400, { message: err.message }); }
    }
    if (req.method === 'PUT' && pathname.startsWith('/api/events/')) {
        const id = decodeURIComponent(pathname.replace('/api/events/', ''));
        const idx = events.findIndex(e => e.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Event not found.' });
        try {
            const body = await readBody(req);
            const e = events[idx];
            if (body.title !== undefined) e.title = String(body.title).trim();
            if (body.date !== undefined) e.date = String(body.date).trim();
            if (body.time !== undefined) e.time = String(body.time).trim();
            if (body.location !== undefined) e.location = String(body.location).trim();
            if (body.description !== undefined) e.description = String(body.description).trim();
            e.updatedAt = new Date().toISOString();
            await saveEvents();
            return sendJSON(res, 200, { success: true, event: e });
        } catch(err) { return sendJSON(res, 400, { message: err.message }); }
    }
    if (req.method === 'DELETE' && pathname.startsWith('/api/events/')) {
        const id = decodeURIComponent(pathname.replace('/api/events/', ''));
        const idx = events.findIndex(e => e.id === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Event not found.' });
        events.splice(idx, 1);
        await saveEvents();
        return sendJSON(res, 200, { success: true });
    }

    // ══════════════════════════════════════════════════════════════
    // ─── SETTINGS API ─────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    if (req.method === 'GET' && pathname === '/api/settings') {
        return sendJSON(res, 200, globalSettings);
    }

    // ── Cloudinary Diagnostic Endpoint ─────────────────────────────
    if (req.method === 'GET' && pathname === '/api/cloudinary-test') {
        const config = globalSettings.cloudinaryConfig || {};
        const cloudName = config.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey    = config.apiKey    || process.env.CLOUDINARY_API_KEY;
        const apiSecret = config.apiSecret || process.env.CLOUDINARY_API_SECRET;

        const diag = {
            env_CLOUDINARY_CLOUD_NAME:   process.env.CLOUDINARY_CLOUD_NAME ? '✅ set' : '❌ missing',
            env_CLOUDINARY_API_KEY:      process.env.CLOUDINARY_API_KEY    ? '✅ set' : '❌ missing',
            env_CLOUDINARY_API_SECRET:   process.env.CLOUDINARY_API_SECRET ? '✅ set' : '❌ missing',
            db_cloudName:  config.cloudName  ? '✅ set' : '❌ missing',
            db_apiKey:     config.apiKey     ? '✅ set' : '❌ missing',
            db_apiSecret:  config.apiSecret  ? '✅ set' : '❌ missing',
            resolved_cloudName: cloudName || '❌ MISSING',
            resolved_apiKey:    apiKey    ? '✅ present' : '❌ MISSING',
            resolved_apiSecret: apiSecret ? '✅ present' : '❌ MISSING',
        };

        if (!cloudName || !apiKey || !apiSecret) {
            return sendJSON(res, 200, { ok: false, message: 'Missing Cloudinary credentials', diag });
        }

        try {
            cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

            // Step 1: Ping
            const pingResult = await cloudinary.api.ping();

            // Step 2: Try an actual upload_stream with a tiny 1x1 red PNG
            const tinyPng = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const uploadResult = await new Promise((resolve) => {
                const stream = cloudinary.uploader.upload_stream(
                    { public_id: 'test_upload_probe', resource_type: 'image', folder: 'website-uploads' },
                    (err, result) => {
                        if (err) return resolve({ ok: false, error: err.message, http_code: err.http_code });
                        resolve({ ok: true, url: result.secure_url });
                    }
                );
                stream.end(tinyPng);
            });

            return sendJSON(res, 200, {
                ok: true,
                message: uploadResult.ok ? 'Cloudinary ping AND upload_stream both work!' : 'Ping OK but upload_stream FAILED',
                ping: pingResult,
                upload_test: uploadResult,
                diag
            });
        } catch (err) {
            return sendJSON(res, 200, { ok: false, message: 'Cloudinary error: ' + err.message, error: String(err), diag });
        }
    }
    
    if (req.method === 'POST' && pathname === '/api/settings') {
        try {
            const body = await readBody(req);
            if (body.eventDate !== undefined) globalSettings.eventDate = body.eventDate;
            if (body.eventName !== undefined) globalSettings.eventName = body.eventName;
            if (body.eventDesc !== undefined) globalSettings.eventDesc = body.eventDesc;
            if (body.countdownDate !== undefined) globalSettings.countdownDate = body.countdownDate;
            if (body.yearsOfService !== undefined) globalSettings.yearsOfService = body.yearsOfService;
            if (body.activeVolunteers !== undefined) globalSettings.activeVolunteers = body.activeVolunteers;
            if (body.aboutText !== undefined) globalSettings.aboutText = body.aboutText;
            if (body.aboutPageText !== undefined) globalSettings.aboutPageText = body.aboutPageText;
            if (body.cloudinaryConfig !== undefined) globalSettings.cloudinaryConfig = body.cloudinaryConfig;
            
            // Footer & Social Settings
            if (body.footerAboutText !== undefined) globalSettings.footerAboutText = body.footerAboutText;
            if (body.contactAddress !== undefined) globalSettings.contactAddress = body.contactAddress;
            if (body.contactPhone !== undefined) globalSettings.contactPhone = body.contactPhone;
            if (body.contactEmail !== undefined) globalSettings.contactEmail = body.contactEmail;
            if (body.socialFacebook !== undefined) globalSettings.socialFacebook = body.socialFacebook;
            if (body.socialInstagram !== undefined) globalSettings.socialInstagram = body.socialInstagram;
            if (body.socialYoutube !== undefined) globalSettings.socialYoutube = body.socialYoutube;
            if (body.socialTwitter !== undefined) globalSettings.socialTwitter = body.socialTwitter;
            
            if (colSettings) {
                await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            }

            // Sync with global events for the landing page
            if (body.eventName && body.eventDate) {
                let gEvent = events.find(e => e.isGlobalEvent === true);
                if (!gEvent) {
                    gEvent = { id: `EVT-GLOBAL`, isGlobalEvent: true };
                    events.push(gEvent);
                }
                gEvent.title = body.eventName.trim();
                gEvent.date = body.eventDate.split('T')[0];
                gEvent.description = (body.eventDesc || '').trim();
                gEvent.updatedAt = new Date().toISOString();
                await saveEvents();
            }

            // Broadcast the update so frontend logic can re-fetch
            broadcastLiveEvent('events_updated', { timestamp: Date.now() });

            return sendJSON(res, 200, { success: true, settings: globalSettings });
        } catch(err) {
            return sendJSON(res, 400, { message: err.message });
        }
    }
    // ══════════════════════════════════════════════════════════════
    // ─── BANNER API ───────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════

    if (req.method === 'POST' && pathname === '/api/banner') {
        try {
            const ct = req.headers['content-type'] || '';
            const bm = ct.match(/boundary=([^;]+)/i);
            if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
            const rawBody = await readRawBody(req);
            const parts = parseMultipart(rawBody, bm[1]);
            const filePart = parts.find(p => p.filename && p.data);
            if (!filePart) return sendJSON(res, 400, { message: 'No file uploaded.' });

            const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `banner_${Date.now()}_${safeName}`;

            // Try Cloudinary first, fall back to local disk
            let bannerUrl = null;
            const cloudUrl = await uploadToCloudinary(filePart.data, uniqueName);
            if (cloudUrl) {
                bannerUrl = cloudUrl;
            } else {
                try {
                    fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data);
                    bannerUrl = '/uploads/' + uniqueName;
                } catch (fsErr) {
                    console.warn('⚠️ Could not write banner to disk:', fsErr.message);
                    return sendJSON(res, 500, { message: 'Failed to save banner.' });
                }
            }

            globalSettings.dashboardBanner = bannerUrl;
            if (colSettings) {
                await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            }
            broadcastLiveEvent('events_updated', { timestamp: Date.now() });

            return sendJSON(res, 200, { success: true, url: globalSettings.dashboardBanner });
        } catch(err) { return sendJSON(res, 500, { message: 'Upload error: ' + err.message }); }
    }

    if (req.method === 'DELETE' && pathname === '/api/banner') {
        globalSettings.dashboardBanner = null;
        if (colSettings) {
            await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
        }
        broadcastLiveEvent('events_updated', { timestamp: Date.now() });
        return sendJSON(res, 200, { success: true });
    }

    // ── About Section Photo Upload ──────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/about-photo') {
        try {
            const ct = req.headers['content-type'] || '';
            const bm = ct.match(/boundary=([^;]+)/i);
            if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
            const rawBody = await readRawBody(req);
            const parts = parseMultipart(rawBody, bm[1]);
            const filePart = parts.find(p => p.filename && p.data);
            if (!filePart) return sendJSON(res, 400, { message: 'No file uploaded.' });
            const safeName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `about_${Date.now()}_${safeName}`;
            let aboutUrl = null;
            const cloudUrl = await uploadToCloudinary(filePart.data, uniqueName);
            if (cloudUrl) {
                aboutUrl = cloudUrl;
            } else {
                try { fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data); aboutUrl = '/uploads/' + uniqueName; }
                catch (fsErr) { return sendJSON(res, 500, { message: 'Failed to save file: ' + fsErr.message }); }
            }
            globalSettings.aboutPhoto = aboutUrl;
            if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            return sendJSON(res, 200, { success: true, url: globalSettings.aboutPhoto });
        } catch(err) { return sendJSON(res, 500, { message: 'Upload error: ' + err.message }); }
    }

    // ── About Page Photo Upload ─────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/about-page-photo') {
        try {
            const ct = req.headers['content-type'] || '';
            const bm = ct.match(/boundary=([^;]+)/i);
            if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
            const rawBody = await readRawBody(req);
            const parts = parseMultipart(rawBody, bm[1]);
            const filePart = parts.find(p => p.filename && p.data);
            if (!filePart) return sendJSON(res, 400, { message: 'No file uploaded.' });
            const safeName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `aboutpage_${Date.now()}_${safeName}`;
            let aboutPageUrl = null;
            const cloudUrl = await uploadToCloudinary(filePart.data, uniqueName);
            if (cloudUrl) {
                aboutPageUrl = cloudUrl;
            } else {
                try { fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data); aboutPageUrl = '/uploads/' + uniqueName; }
                catch (fsErr) { return sendJSON(res, 500, { message: 'Failed to save file: ' + fsErr.message }); }
            }
            globalSettings.aboutPagePhoto = aboutPageUrl;
            if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            return sendJSON(res, 200, { success: true, url: globalSettings.aboutPagePhoto });
        } catch(err) { return sendJSON(res, 500, { message: 'Upload error: ' + err.message }); }
    }

    // ── T-shirt Showcase Photo API ──────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/tshirt-showcase-photo') {
        try {
            const ct = req.headers['content-type'] || '';
            const bm = ct.match(/boundary=([^;]+)/i);
            if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
            const rawBody = await readRawBody(req);
            const parts = parseMultipart(rawBody, bm[1]);
            const filePart = parts.find(p => p.filename && p.data);
            if (!filePart) return sendJSON(res, 400, { message: 'No file uploaded.' });

            const slotPart = parts.find(p => p.name === 'slot' && !p.filename);
            const slot = slotPart ? parseInt(slotPart.data.toString('utf8').trim(), 10) : 0;
            if (slot < 0 || slot > 3) return sendJSON(res, 400, { message: 'Invalid slot (must be 0-3).' });

            const safeName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `tshirt_${slot}_${Date.now()}_${safeName}`;

            // Try Cloudinary first, fall back to local disk
            let tshirtUrl = null;
            const cloudUrl = await uploadToCloudinary(filePart.data, uniqueName);
            if (cloudUrl) {
                tshirtUrl = cloudUrl;
            } else {
                try { fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data); tshirtUrl = '/uploads/' + uniqueName; }
                catch (fsErr) { return sendJSON(res, 500, { message: 'Failed to save file: ' + fsErr.message }); }
            }

            if (!globalSettings.tshirtPhotos) globalSettings.tshirtPhotos = [null, null, null, null];
            globalSettings.tshirtPhotos[slot] = tshirtUrl;

            if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });

            broadcastLiveEvent('settings_updated', { timestamp: Date.now() });
            return sendJSON(res, 200, { success: true, url: globalSettings.tshirtPhotos[slot], slot: slot });
        } catch(err) { return sendJSON(res, 500, { message: 'Upload error: ' + err.message }); }
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/tshirt-showcase-photo/')) {
        const slotStr = decodeURIComponent(pathname.replace('/api/tshirt-showcase-photo/', ''));
        const slot = parseInt(slotStr, 10);
        
        if (isNaN(slot) || slot < 0 || slot > 3) return sendJSON(res, 400, { message: 'Invalid slot.' });
        
        if (!globalSettings.tshirtPhotos) globalSettings.tshirtPhotos = [null, null, null, null];
        globalSettings.tshirtPhotos[slot] = null;
        
        if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
        
        broadcastLiveEvent('settings_updated', { timestamp: Date.now() });
        return sendJSON(res, 200, { success: true, slot: slot });
    }

    // 📸 Generic Image Upload API (for coordinators, etc)
    if (req.method === 'POST' && pathname === '/api/upload-image') {
        try {
            const ct = req.headers['content-type'] || '';
            const bm = ct.match(/boundary=([^;]+)/i);
            if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
            const rawBody = await readRawBody(req);
            const parts = parseMultipart(rawBody, bm[1]);
            const filePart = parts.find(p => p.filename && p.data);
            if (!filePart) return sendJSON(res, 400, { message: 'No file uploaded.' });

            const safeName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `img_${Date.now()}_${safeName}`;

            // Try Cloudinary first, fall back to local disk
            let imgUrl = null;
            const cloudUrl = await uploadToCloudinary(filePart.data, uniqueName);
            if (cloudUrl) {
                imgUrl = cloudUrl;
            } else {
                try { fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), filePart.data); imgUrl = '/uploads/' + uniqueName; }
                catch (fsErr) { return sendJSON(res, 500, { message: 'Failed to save file: ' + fsErr.message }); }
            }

            return sendJSON(res, 200, { success: true, url: imgUrl });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Internal error: ' + err.message });
        }
    }

    // 🌐 Translation Proxy API 🌐──────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/translate') {
        try {
            const body = await readBody(req);
            if (!body || !Array.isArray(body.strings)) {
                return sendJSON(res, 400, { message: 'Payload must contain a strings array' });
            }
            // Filter out empty strings to avoid translation API errors
            // And chunk the array if it's too large? translate-google handles arrays but let's be safe.
            const result = [];
            const delay = ms => new Promise(r => setTimeout(r, ms));
            const chunkSize = 100;

            for (let i = 0; i < body.strings.length; i += chunkSize) {
                const chunk = body.strings.slice(i, i + chunkSize);
                try {
                    const translated = await translate(chunk, { to: 'mr' });
                    if (Array.isArray(translated)) {
                        result.push(...translated);
                    } else {
                        // Unlikely edge case where it returns a string for a multiple element array
                        result.push(...chunk);
                    }
                } catch (trErr) {
                    console.error("Translation Chunk Error:", trErr);
                    // Fallback to original if translation fails
                    result.push(...chunk);
                }
                // Sleep to avoid rate limiting
                if (i + chunkSize < body.strings.length) {
                    await delay(1000);
                }
            }
            
            // Ensure exact length match
            while (result.length < body.strings.length) {
                result.push(body.strings[result.length]);
            }
            
            return sendJSON(res, 200, { success: true, translated: result });
        } catch (err) {
            console.error('Translation error:', err);
            return sendJSON(res, 500, { message: 'Translation failed', error: err.message });
        }
    }

    // ── Developers API ────────────────────────────────────────────────────────
    // GET /api/developers — public: list all developers and message
    if (req.method === 'GET' && pathname === '/api/developers') {
        return sendJSON(res, 200, { 
            developers: globalSettings.developers || [],
            developerMessage: globalSettings.developerMessage || '',
            footerDeveloper: globalSettings.footerDeveloper || null
        });
    }

    // POST /api/developers/footer — master-only: update the footer developer profile
    if (req.method === 'POST' && pathname === '/api/developers/footer') {
        try {
            const ct = req.headers['content-type'] || '';
            let fDev = globalSettings.footerDeveloper || {};
            
            if (ct.includes('multipart/form-data')) {
                const bm = ct.match(/boundary=([^;]+)/i);
                if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
                const rawBody = await readRawBody(req);
                const parts = parseMultipart(rawBody, bm[1].trim());

                for (const part of parts) {
                    if (!part.filename && part.name) {
                        fDev[part.name] = part.data.toString('utf8').trim();
                    }
                }

                const photoPart = parts.find(p => p.filename && p.name === 'photo');
                if (photoPart) {
                    const safeName = photoPart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const uniqueName = `footer_dev_${Date.now()}_${safeName}`;
                    // Convert image to Base64 for permanent MongoDB storage on Render
                    try {
                        const mime = photoPart.filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                        const b64 = photoPart.data.toString('base64');
                        fDev.photoUrl = `data:${mime};base64,${b64}`;
                    } catch(e) {
                        console.error('Base64 photo save failed:', e);
                    }
                }
            } else {
                return sendJSON(res, 400, { message: 'Invalid content type' });
            }

            globalSettings.footerDeveloper = fDev;
            if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            return sendJSON(res, 200, { success: true, footerDeveloper: fDev });
        } catch (err) {
            return sendJSON(res, 500, { message: err.message });
        }
    }

    // POST /api/developers/message — master-only: update the developer message
    if (req.method === 'POST' && pathname === '/api/developers/message') {
        try {
            const bodyStr = await readRawBody(req);
            const { message } = JSON.parse(bodyStr);
            globalSettings.developerMessage = message || '';
            if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            return sendJSON(res, 200, { success: true });
        } catch (err) {
            return sendJSON(res, 500, { message: err.message });
        }
    }

    // POST /api/developers — master-only: add or update a developer
    if (req.method === 'POST' && pathname === '/api/developers') {
        try {
            const ct = req.headers['content-type'] || '';
            let devData = {};
            let photoUrl = null;

            if (ct.includes('multipart/form-data')) {
                const bm = ct.match(/boundary=([^;]+)/i);
                if (!bm) return sendJSON(res, 400, { message: 'Missing boundary.' });
                const rawBody = await readRawBody(req);
                const parts = parseMultipart(rawBody, bm[1].trim());

                // Extract text fields
                for (const part of parts) {
                    if (!part.filename && part.name) {
                        devData[part.name] = part.data.toString('utf8').trim();
                    }
                }

                // Extract photo
                const photoPart = parts.find(p => p.filename && (p.name === 'photo' || p.name === 'devPhoto'));
                if (photoPart) {
                    const safeName = photoPart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const uniqueName = `dev_${Date.now()}_${safeName}`;
                    let finalUrl = '/uploads/' + uniqueName;
                    const cloudUrl = await uploadToCloudinary(photoPart.data, uniqueName);
                    if (cloudUrl) finalUrl = cloudUrl;
                    else { try { fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), photoPart.data); } catch(e){} }
                    photoUrl = finalUrl;
                }
            } else {
                devData = await readBody(req);
            }

            const { name, bio, whatsapp, id } = devData;
            if (!name) return sendJSON(res, 400, { message: 'Developer name is required.' });

            if (!globalSettings.developers) globalSettings.developers = [];

            if (id) {
                // Update existing
                const idx = globalSettings.developers.findIndex(d => d.id === id);
                if (idx >= 0) {
                    globalSettings.developers[idx] = {
                        ...globalSettings.developers[idx],
                        name: name || globalSettings.developers[idx].name,
                        bio: bio !== undefined ? bio : globalSettings.developers[idx].bio,
                        whatsapp: whatsapp !== undefined ? whatsapp : globalSettings.developers[idx].whatsapp,
                        ...(photoUrl ? { photoUrl } : {}),
                        updatedAt: new Date().toISOString()
                    };
                } else {
                    return sendJSON(res, 404, { message: 'Developer not found.' });
                }
            } else {
                // Add new
                const newDev = {
                    id: `DEV-${Date.now()}`,
                    name,
                    bio: bio || '',
                    whatsapp: whatsapp || '',
                    photoUrl: photoUrl || '',
                    createdAt: new Date().toISOString()
                };
                globalSettings.developers.push(newDev);
            }

            if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            return sendJSON(res, 200, { success: true, developers: globalSettings.developers });
        } catch (err) {
            console.error('POST /api/developers error:', err.message);
            return sendJSON(res, 500, { message: err.message });
        }
    }

    // DELETE /api/developers/:id — master-only: remove a developer
    if (req.method === 'DELETE' && pathname.startsWith('/api/developers/')) {
        try {
            const devId = decodeURIComponent(pathname.split('/api/developers/')[1]);
            if (!devId) return sendJSON(res, 400, { message: 'Developer ID required.' });
            if (!globalSettings.developers) globalSettings.developers = [];
            const prevLen = globalSettings.developers.length;
            globalSettings.developers = globalSettings.developers.filter(d => d.id !== devId);
            if (globalSettings.developers.length === prevLen) return sendJSON(res, 404, { message: 'Developer not found.' });
            if (colSettings) await colSettings.updateOne({}, { $set: globalSettings }, { upsert: true });
            return sendJSON(res, 200, { success: true, developers: globalSettings.developers });
        } catch (err) {
            return sendJSON(res, 500, { message: err.message });
        }
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