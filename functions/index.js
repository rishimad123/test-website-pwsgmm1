'use strict';
// ═══════════════════════════════════════════════════════════════════════════
//  Firebase Functions API — Shree Patelwadi Sarvjanik Ganesh Utsav Mandal
//  All backend routes ported from server.js (MongoDB → Cloud Firestore)
//  Images: Cloudinary (unchanged). Auth: username/password in Firestore.
//  Live updates: Firestore _liveUpdates collection (replaces SSE).
// ═══════════════════════════════════════════════════════════════════════════

const express    = require('express');
const cors       = require('cors');
const admin      = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const cloudinary = require('cloudinary').v2;
const translate  = require('translate-google');
const Busboy     = require('busboy');

// ─── Firebase Admin Init ─────────────────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// ─── Constants ───────────────────────────────────────────────────────────────
const SLIPS_PER_BOOK_DE = 50;
const SLIPS_PER_BOOK    = 50;
const TOTAL_SLIPS       = 2500;
const MAX_BOOKS         = TOTAL_SLIPS / SLIPS_PER_BOOK; // 50

const DEFAULT_SETTINGS = {
    eventDate: '2026-09-07T00:00:00.000Z',
    tshirtPhotos: [null, null, null, null],
    maxNewBooks: 50,
    maxOldBooks: 30,
    activeDonationYear: '2026-27',
    receiptFormat: {
        receiptTopLeft: 'स्थापना १९९१',
        receiptTopCenter: '॥ श्री गजानन प्रसन्न ॥',
        receiptTopRightPrefix: 'वर्ष :',
        receiptYear: '२०२६-२७',
        receiptTitle: 'श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ',
        receiptAddress: 'पटेलवाडी, क्लासिक हॉटेलच्या मागे, जुना नागरदास रोड, अंधेरी (पूर्व), मुंबई - ४०००६९',
        receiptDonorPrefix: 'श्री/श्रीमती',
        receiptDonorSuffix: 'यांचकडून',
        receiptAmountWordsPrefix: 'अक्षरी रुपये',
        receiptThankYouText: 'रोख/चेक मिळाले, धन्यवाद !',
        receiptSign1Role: 'अध्यक्ष',
        receiptSign1Name: 'जयेश शिंदे',
        receiptSign2Role: 'सरचिटणीस',
        receiptSign2Name: '<span class="sg-marathi" translate="no">ध्रुव चीटालीय</span><span class="sg-english" translate="no" style="display:none;">Dhruv Chotaliya</span>',
        receiptSign3Role: 'खजिनदार',
        receiptSign3Name: 'रणजीत राजपूत',
        receiptSign4Role: 'वसुल करणार',
        receiptSign4Name: '&nbsp;'
    }
};

// ─── Settings Cache ───────────────────────────────────────────────────────────
let _settingsCache = null;
let _settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getSettings() {
    const now = Date.now();
    if (_settingsCache && (now - _settingsCacheTime) < SETTINGS_CACHE_TTL) return _settingsCache;
    const doc = await db.collection('settings').doc('global').get();
    _settingsCache = doc.exists ? { ...DEFAULT_SETTINGS, ...doc.data() } : { ...DEFAULT_SETTINGS };
    _settingsCacheTime = now;
    return _settingsCache;
}

async function saveSettings(data) {
    _settingsCache = data;
    _settingsCacheTime = Date.now();
    await db.collection('settings').doc('global').set(data, { merge: false });
}

function invalidateSettingsCache() {
    _settingsCache = null;
    _settingsCacheTime = 0;
}

// ─── Cloudinary Helper ────────────────────────────────────────────────────────
async function uploadToCloudinary(buffer, filename, settings) {
    const cfg = (settings && settings.cloudinaryConfig) || {};
    const cloudName = cfg.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = cfg.apiKey    || process.env.CLOUDINARY_API_KEY;
    const apiSecret = cfg.apiSecret || process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return null;
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    try {
        const dataUri = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
        const result  = await cloudinary.uploader.upload(dataUri, {
            public_id: filename, resource_type: 'auto', folder: 'website-uploads'
        });
        return result.secure_url;
    } catch (e) {
        console.error('[Cloudinary] Upload failed:', e.message);
        return null;
    }
}

// ─── Multipart Parser (Busboy) ────────────────────────────────────────────────
function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const parts = [];
        try {
            const bb = Busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } });
            bb.on('file', (name, file, info) => {
                const chunks = [];
                file.on('data', d => chunks.push(d));
                file.on('close', () => {
                    parts.push({ name, filename: info.filename, contentType: info.mimeType, data: Buffer.concat(chunks) });
                });
            });
            bb.on('field', (name, value) => {
                parts.push({ name, filename: null, contentType: 'text/plain', data: Buffer.from(value, 'utf8') });
            });
            bb.on('close', () => resolve(parts));
            bb.on('error', reject);
            if (req.rawBody) {
                bb.end(req.rawBody);
            } else {
                req.pipe(bb);
            }
        } catch (e) { reject(e); }
    });
}

function getPartValue(parts, name) {
    const p = parts.find(p => p.name === name && !p.filename);
    return p ? p.data.toString('utf8').trim() : undefined;
}

// ─── Live Updates Broadcast (replaces SSE) ────────────────────────────────────
async function broadcastLiveEvent(type, payload = {}) {
    try {
        await db.collection('_liveUpdates').doc(type).set({
            type, payload, timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.warn('broadcastLiveEvent failed:', e.message); }
}

// ─── Firestore Batch Helper (handles >500 doc batches) ───────────────────────
async function batchDelete(refs) {
    for (let i = 0; i < refs.length; i += 499) {
        const batch = db.batch();
        refs.slice(i, i + 499).forEach(ref => batch.delete(ref));
        await batch.commit();
    }
}

async function batchSet(entries) {
    // entries: [{ref, data}]
    for (let i = 0; i < entries.length; i += 499) {
        const batch = db.batch();
        entries.slice(i, i + 499).forEach(({ ref, data }) => batch.set(ref, data));
        await batch.commit();
    }
}

// ─── Fixed Landmarks seed ─────────────────────────────────────────────────────
const FIXED_LANDMARKS = [
    { id: 'LANDMARK-001', name: 'Patelwadi' },
    { id: 'LANDMARK-002', name: 'Shindewadi' },
    { id: 'LANDMARK-003', name: 'Gurkhawadi' },
];

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Master credentials (from environment) ────────────────────────────────────
function getMasterCreds() {
    return {
        username: (process.env.MASTER_USERNAME || '').trim(),
        password: (process.env.MASTER_PASSWORD || '').trim()
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 1 — SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/settings', async (req, res) => {
    try {
        const settings = await getSettings();
        return res.json(settings);
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    try {
        const body     = req.body;
        const settings = await getSettings();
        const fields   = [
            'eventDate','eventName','maxNewBooks','maxOldBooks','eventDesc','countdownDate',
            'yearsOfService','activeVolunteers','aboutText','aboutPageText','cloudinaryConfig',
            'receiptFormat','footerAboutText','contactAddress','contactPhone','contactEmail',
            'socialFacebook','socialInstagram','socialYoutube','socialTwitter','youtubeLiveLink'
        ];
        fields.forEach(f => { if (body[f] !== undefined) settings[f] = body[f]; });
        await saveSettings(settings);

        // Sync global event
        if (body.eventName && body.eventDate) {
            const eventRef = db.collection('events').doc('EVT-GLOBAL');
            await eventRef.set({
                id: 'EVT-GLOBAL', isGlobalEvent: true,
                title: body.eventName.trim(),
                date: body.eventDate.split('T')[0],
                description: (body.eventDesc || '').trim(),
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }
        await broadcastLiveEvent('events_updated', { timestamp: Date.now() });
        return res.json({ success: true, settings });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/settings/active-year', async (req, res) => {
    try {
        if (!req.body.year) return res.status(400).json({ message: 'Year is required' });
        const settings = await getSettings();
        settings.activeDonationYear = String(req.body.year).trim();
        if (!settings.receiptFormat) settings.receiptFormat = {};
        settings.receiptFormat.receiptYear = settings.activeDonationYear;
        await saveSettings(settings);
        await broadcastLiveEvent('settings_updated', settings);
        return res.json({ success: true, settings });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.get('/api/cloudinary-test', async (req, res) => {
    const settings  = await getSettings();
    const cfg       = settings.cloudinaryConfig || {};
    const cloudName = cfg.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = cfg.apiKey    || process.env.CLOUDINARY_API_KEY;
    const apiSecret = cfg.apiSecret || process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret)
        return res.json({ ok: false, message: 'Missing Cloudinary credentials' });
    try {
        cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
        const ping = await cloudinary.api.ping();
        return res.json({ ok: true, message: 'Cloudinary connected', ping });
    } catch (e) { return res.json({ ok: false, message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 2 — AUTHENTICATION & USERS
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'username and password required.' });

        const { username: MASTER_USER, password: MASTER_PASS } = getMasterCreds();

        // Master control — never touches DB
        if (username === MASTER_USER && password === MASTER_PASS) {
            const masterSnap = await db.collection('users').doc(MASTER_USER).get();
            const masterProfile = masterSnap.exists ? masterSnap.data() : {};
            return res.json({ success: true, isMaster: true, user: {
                id: '__master__', username: MASTER_USER,
                name: masterProfile.name || 'Master Control',
                role: 'admin', email: masterProfile.email || '',
                department: '', contactNumber: masterProfile.contactNumber || '',
                photoUrl: masterProfile.photoUrl || '', idProofUrl: masterProfile.idProofUrl || ''
            }});
        }

        // Look up user by username or email
        let snap = await db.collection('users').where('username', '==', username).limit(1).get();
        if (snap.empty) snap = await db.collection('users').where('email', '==', username).limit(1).get();
        if (snap.empty) return res.status(404).json({ success: false, message: 'User not found.' });

        const userData = snap.docs[0].data();
        if (userData.blocked === true) return res.status(401).json({ success: false, message: 'Account is blocked.' });
        if (userData.password !== password) return res.status(401).json({ success: false, message: 'Invalid password.' });

        return res.json({ success: true, user: {
            id: userData.id || userData.username,
            username: userData.username,
            name: userData.name || userData.username,
            role: userData.role || 'volunteer',
            email: userData.email || '',
            department: userData.department || '',
            contactNumber: userData.contactNumber || '',
            photoUrl: userData.photoUrl || '',
            idProofUrl: userData.idProofUrl || ''
        }});
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.get('/api/check-block', async (req, res) => {
    try {
        const username = req.query.username || '';
        if (!username) return res.status(400).json({ message: 'username is required.' });
        const snap = await db.collection('users').where('username', '==', username).limit(1).get();
        const blocked = !snap.empty && snap.docs[0].data().blocked === true;
        return res.json({ blocked });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const { username: MASTER_USER } = getMasterCreds();
        const snap = await db.collection('users').get();
        const users = snap.docs
            .map(d => d.data())
            .filter(u => u.username !== MASTER_USER)
            .map(u => ({
                id: u.id || u.username, username: u.username,
                name: u.name || u.username, role: u.role || 'volunteer',
                email: u.email || '', department: u.department || '',
                contactNumber: u.contactNumber || '',
                photoUrl: u.photoUrl || '', idProofUrl: u.idProofUrl || '',
                blocked: u.blocked === true
            }));
        return res.json({ users });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, name, email, role, password, department } = req.body;
        if (!username || !username.trim()) return res.status(400).json({ message: 'Username is required.' });
        if (!password || !password.trim()) return res.status(400).json({ message: 'Password is required.' });
        if (!role || !role.trim()) return res.status(400).json({ message: 'Role is required.' });

        const docRef = db.collection('users').doc(username.trim());
        const existing = await docRef.get();
        if (existing.exists) return res.status(400).json({ message: `Username "${username.trim()}" already exists.` });

        const newUser = {
            username: username.trim(), name: (name || username).trim(),
            email: (email || '').trim(), role: role.trim(),
            password: password.trim(), department: (department || '').trim(),
            blocked: false, createdAt: new Date().toISOString()
        };
        await docRef.set(newUser);
        return res.json({ success: true, username: newUser.username });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.put('/api/users/:username', async (req, res) => {
    try {
        const urlUsername = req.params.username;
        const { name, username, email, role, department, password } = req.body;
        const docRef = db.collection('users').doc(urlUsername);
        const existing = await docRef.get();
        if (!existing.exists) return res.status(404).json({ message: 'User not found.' });

        let newUsername = urlUsername;
        if (username && username.trim() !== urlUsername) {
            newUsername = username.trim();
            const clash = await db.collection('users').doc(newUsername).get();
            if (clash.exists) return res.status(400).json({ message: `Username "${newUsername}" is already taken.` });
        }

        const updateFields = {
            username: newUsername, name: (name || newUsername).trim(),
            email: (email || '').trim(), role: (role || existing.data().role || 'volunteer').trim(),
            department: (department || '').trim()
        };
        if (password && password.trim().length > 0) updateFields.password = password.trim();

        if (newUsername !== urlUsername) {
            const newRef = db.collection('users').doc(newUsername);
            await newRef.set({ ...existing.data(), ...updateFields });
            await docRef.delete();
        } else {
            await docRef.update(updateFields);
        }
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.delete('/api/users/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const docRef = db.collection('users').doc(username);
        const existing = await docRef.get();
        if (!existing.exists) return res.status(404).json({ message: 'User not found.' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/users/block', async (req, res) => {
    try {
        const { username, blocked } = req.body;
        if (!username) return res.status(400).json({ message: 'username is required.' });
        const docRef = db.collection('users').doc(username);
        await docRef.set({ username, blocked: blocked === true }, { merge: true });
        return res.json({ success: true, username, blocked: blocked === true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.put('/api/profile', async (req, res) => {
    try {
        const { username, name, contactNumber, email, password, photoBase64, photoExt, idProofBase64, idProofExt } = req.body;
        if (!username) return res.status(400).json({ message: 'Username is required' });

        const settings  = await getSettings();
        const docRef    = db.collection('users').doc(username);
        const existing  = await docRef.get();
        const updateFields = {};

        if (name !== undefined)          updateFields.name          = String(name);
        if (contactNumber !== undefined) updateFields.contactNumber = String(contactNumber);
        if (email !== undefined)         updateFields.email         = String(email);
        if (password)                    updateFields.password      = String(password);

        if (photoBase64) {
            const pExt  = (photoExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
            const pBuf  = Buffer.from(photoBase64, 'base64');
            const pName = `profile_${username}_${Date.now()}.${pExt}`;
            const pUrl  = await uploadToCloudinary(pBuf, pName, settings);
            const mime  = pExt === 'png' ? 'image/png' : (pExt === 'gif' ? 'image/gif' : 'image/jpeg');
            updateFields.photoUrl = pUrl || `data:${mime};base64,${photoBase64}`;
        }
        if (idProofBase64) {
            const iExt  = (idProofExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
            const iBuf  = Buffer.from(idProofBase64, 'base64');
            const iName = `idproof_${username}_${Date.now()}.${iExt}`;
            const iUrl  = await uploadToCloudinary(iBuf, iName, settings);
            const mime  = iExt === 'png' ? 'image/png' : (iExt === 'gif' ? 'image/gif' : 'image/jpeg');
            updateFields.idProofUrl = iUrl || `data:${mime};base64,${idProofBase64}`;
        }

        if (existing.exists) {
            await docRef.update(updateFields);
        } else {
            updateFields.username = username;
            const { username: MASTER_USER } = getMasterCreds();
            updateFields.role = (username === MASTER_USER) ? 'admin' : 'volunteer';
            await docRef.set(updateFields, { merge: true });
        }
        const updated = await docRef.get();
        return res.json({ success: true, message: 'Profile updated successfully.', user: updated.data() });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 3 — RECEIPTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/receipts', async (req, res) => {
    try {
        const snap = await db.collection('receipts').get();
        const receipts = snap.docs.map(d => d.data());
        return res.json({ receipts });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/submit-passbook', async (req, res) => {
    try {
        const { name, amount, userId, submittedAt, paymentMode, checkNumber, type } = req.body;
        if (!name || typeof name !== 'string' || name.trim() === '')
            return res.status(400).json({ message: 'Donor name is required.' });
        const rType = type === 'balance' ? 'balance' : 'slip';
        if (rType !== 'balance' && (!amount || isNaN(Number(amount)) || Number(amount) <= 0))
            return res.status(400).json({ message: 'A positive donation amount is required.' });

        const receipt = {
            receiptId: `RCP-${Date.now()}`,
            name: name.trim(), amount: amount ? Number(amount) : null,
            userId: userId || null, submittedAt: submittedAt || new Date().toISOString(),
            status: 'pending_review', paymentMode: paymentMode || 'cash',
            checkNumber: checkNumber || null, type: rType, deleted: false
        };
        await db.collection('receipts').doc(receipt.receiptId).set(receipt);
        return res.json({ success: true, receiptId: receipt.receiptId, message: 'Receipt submitted successfully.' });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/receipts/:id', async (req, res) => {
    // Exclude sub-paths handled separately
    if (req.params.id === 'mark-received' || req.params.id === 'soft-delete' || req.params.id === 'clear-amount')
        return res.status(404).json({ message: 'Not found' });
    try {
        const id     = req.params.id;
        const docRef = db.collection('receipts').doc(id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Receipt not found.' });
        const body   = req.body;
        const update = { updatedAt: new Date().toISOString() };
        if (body.name         !== undefined) update.name         = String(body.name).trim();
        if (body.amount       !== undefined) update.amount       = Number(body.amount);
        if (body.status       !== undefined) update.status       = String(body.status);
        if (body.paymentMode  !== undefined) update.paymentMode  = String(body.paymentMode);
        if (body.checkNumber  !== undefined) update.checkNumber  = body.checkNumber || null;
        if (body.bookNumber   !== undefined && body.bookNumber)   update.bookNumber   = Number(body.bookNumber);
        if (body.receiptNumber !== undefined && body.receiptNumber) update.receiptNumber = Number(body.receiptNumber);
        if (body.passbookFile !== undefined) {
            update.passbookFile = body.passbookFile;
            update.passbookUrl  = body.passbookFile ? `/uploads/${body.passbookFile}` : null;
        }
        await docRef.update(update);
        const updated = await docRef.get();
        return res.json({ success: true, receipt: updated.data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.patch('/api/receipts/:id/soft-delete', async (req, res) => {
    try {
        const docRef = db.collection('receipts').doc(req.params.id);
        const snap = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Receipt not found.' });
        await docRef.update({ deleted: true, updatedAt: new Date().toISOString() });
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.patch('/api/receipts/:id/mark-received', async (req, res) => {
    try {
        const id = req.params.id;
        const by = req.query.by || 'Unknown';
        const now = new Date().toISOString();

        // 1. Check receipts
        const rRef = db.collection('receipts').doc(id);
        const rSnap = await rRef.get();
        if (rSnap.exists) {
            await rRef.update({ status: 'received', paymentMode: 'Cash', markedReceivedBy: by, updatedAt: now });
            return res.json({ success: true, receipt: { ...rSnap.data(), status: 'received' } });
        }

        // 2. Check donation entries
        const deRef = db.collection('donationEntries').doc(id);
        const deSnap = await deRef.get();
        if (deSnap.exists) {
            await deRef.update({ status: 'Received', paymentMode: 'Cash', markedReceivedBy: by, updatedAt: now });
            return res.json({ success: true, receipt: deSnap.data() });
        }

        // 3. Check pauti book slips
        if (id.startsWith('SLIP-')) {
            const slipNum = Number(id.replace('SLIP-', ''));
            const pbSnap = await db.collection('pautiBooks').get();
            for (const pbDoc of pbSnap.docs) {
                const book = pbDoc.data();
                const slips = book.slips || [];
                const sIdx = slips.findIndex(s => s.slipNumber === slipNum);
                if (sIdx !== -1) {
                    slips[sIdx].status = 'Received';
                    slips[sIdx].paymentMode = 'Cash';
                    slips[sIdx].markedReceivedBy = by;
                    slips[sIdx].updatedAt = now;
                    await pbDoc.ref.update({ slips });
                    return res.json({ success: true, receipt: slips[sIdx] });
                }
            }
        }

        return res.status(404).json({ message: 'Receipt not found.' });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.patch('/api/receipts/:id/clear-amount', async (req, res) => {
    try {
        const docRef = db.collection('receipts').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Receipt not found.' });
        await docRef.update({ amount: null, updatedAt: new Date().toISOString() });
        const updated = await docRef.get();
        return res.json({ success: true, receipt: updated.data() });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 4 — TSHIRTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/tshirts/settings', async (req, res) => {
    try {
        const snap = await db.collection('tshirtSettings').doc('global').get();
        const s    = snap.exists ? snap.data() : { price: 350 };
        return res.json({ price: s.price || 350, coordinators: s.coordinators });
    } catch (e) { return res.status(500).json({ message: 'Server error' }); }
});

// Alias for frontend compatibility
app.get('/api/tshirt-settings', async (req, res) => {
    try {
        const snap = await db.collection('tshirtSettings').doc('global').get();
        const s    = snap.exists ? snap.data() : { price: 350 };
        return res.json({ price: s.price || 350, coordinators: s.coordinators });
    } catch (e) { return res.status(500).json({ message: 'Server error' }); }
});

app.post('/api/tshirts/settings', async (req, res) => {
    try {
        const body = req.body;
        const update = {};
        if (body.price !== undefined && !isNaN(Number(body.price))) update.price = Number(body.price);
        if (Array.isArray(body.coordinators)) update.coordinators = body.coordinators;
        if (Object.keys(update).length === 0) return res.status(400).json({ message: 'Valid price or coordinators required' });
        await db.collection('tshirtSettings').doc('global').set(update, { merge: true });
        return res.json({ success: true, ...update });
    } catch (e) { return res.status(500).json({ message: 'Server error' }); }
});

// Alias for frontend compatibility
app.post('/api/tshirt-settings', async (req, res) => {
    try {
        const body = req.body;
        const update = {};
        if (body.price !== undefined && !isNaN(Number(body.price))) update.price = Number(body.price);
        if (Array.isArray(body.coordinators)) update.coordinators = body.coordinators;
        if (Object.keys(update).length === 0) return res.status(400).json({ message: 'Valid price or coordinators required' });
        await db.collection('tshirtSettings').doc('global').set(update, { merge: true });
        return res.json({ success: true, ...update });
    } catch (e) { return res.status(500).json({ message: 'Server error' }); }
});

app.get('/api/tshirts', async (req, res) => {
    try {
        const snap    = await db.collection('tshirts').get();
        const tshirts = snap.docs.map(d => d.data());
        return res.json({ tshirts });
    } catch (e) { return res.status(500).json({ message: 'Server error' }); }
});

app.post('/api/tshirts', async (req, res) => {
    try {
        const { name, size, phone, quantity, userId } = req.body;
        if (!name || !size || !phone) return res.status(400).json({ message: 'Missing fields' });
        const application = {
            id: `TSH-${Date.now()}`, name, size, phone,
            quantity: Number(quantity) || 1, userId: userId || null,
            status: 'Pending', submittedAt: new Date().toISOString()
        };
        await db.collection('tshirts').doc(application.id).set(application);
        return res.json({ success: true, application });
    } catch (e) { return res.status(500).json({ message: 'Server error' }); }
});

app.put('/api/tshirts/:id', async (req, res) => {
    try {
        const id     = req.params.id;
        const docRef = db.collection('tshirts').doc(id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Not found' });
        const body   = req.body;
        const update = { updatedAt: new Date().toISOString() };
        if (body.status)   update.status   = body.status;
        if (body.name)     update.name     = body.name;
        if (body.phone)    update.phone    = body.phone;
        if (body.quantity !== undefined) update.quantity = Number(body.quantity);
        await docRef.update(update);
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: 'Server error' }); }
});

app.delete('/api/tshirts/:id', async (req, res) => {
    try {
        const docRef = db.collection('tshirts').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Not found' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 5 — EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/expenses', async (req, res) => {
    try {
        const snap     = await db.collection('expenses').get();
        const expenses = snap.docs.map(d => d.data());
        return res.json({ expenses });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const { date, serialNumber, particulars, commonHeader, referenceNumber,
                category, subcategory, soundEvent, reason, amount } = req.body;
        if (!date)            return res.status(400).json({ message: 'Date is required.' });
        if (!serialNumber)    return res.status(400).json({ message: 'Serial Number is required.' });
        if (!category)        return res.status(400).json({ message: 'Category is required.' });
        if (!referenceNumber) return res.status(400).json({ message: 'Reference Number is required.' });
        if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0)
            return res.status(400).json({ message: 'A valid amount is required.' });

        const record = {
            expenseId: `EXP-${Date.now()}`, date, serialNumber,
            particulars: (particulars || '').trim(),
            commonHeader: (commonHeader || '').trim(),
            referenceNumber: (referenceNumber || '').trim(),
            category, subcategory: subcategory || '',
            soundEvent: soundEvent || null,
            reason: (reason || '').trim(),
            amount: Number(amount),
            createdAt: new Date().toISOString(), updatedAt: null
        };
        await db.collection('expenses').doc(record.expenseId).set(record);
        return res.json({ success: true, expense: record });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/expenses/:id', async (req, res) => {
    try {
        const docRef = db.collection('expenses').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Expense not found.' });
        const body  = req.body;
        const update = { updatedAt: new Date().toISOString() };
        const strFields = ['date','serialNumber','particulars','commonHeader','referenceNumber','category','subcategory','soundEvent','reason'];
        strFields.forEach(f => { if (body[f] !== undefined) update[f] = body[f]; });
        if (body.amount !== undefined) update.amount = Number(body.amount);
        await docRef.update(update);
        const updated = await docRef.get();
        return res.json({ success: true, expense: updated.data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const docRef = db.collection('expenses').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Expense not found.' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 6 — FINANCIALS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/financials', async (req, res) => {
    try {
        const snap       = await db.collection('financials').get();
        const financials = snap.docs.map(d => d.data());
        return res.json({ financials });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/financials', async (req, res) => {
    try {
        const { year, lastYearBalance, currentYearDonations, cashInHand, cashAtBank,
                cashWithdrawnFromBank, totalCollection, currentYearExpenses, notes } = req.body;
        if (!year) return res.status(400).json({ message: 'Year is required.' });

        const existing = await db.collection('financials').where('year', '==', String(year)).limit(1).get();
        if (!existing.empty) return res.status(400).json({ message: `A record for year ${year} already exists.` });

        const record = {
            financialId: `FIN-${Date.now()}`, year: String(year),
            lastYearBalance: Number(lastYearBalance || 0),
            currentYearDonations: Number(currentYearDonations || 0),
            cashInHand: Number(cashInHand || 0), cashAtBank: Number(cashAtBank || 0),
            cashWithdrawnFromBank: Number(cashWithdrawnFromBank || 0),
            totalCollection: Number(totalCollection || 0),
            currentYearExpenses: Number(currentYearExpenses || 0),
            notes: (notes || '').trim(), _bsData: req.body._bsData || null,
            createdAt: new Date().toISOString(), updatedAt: null
        };
        await db.collection('financials').doc(record.financialId).set(record);
        return res.json({ success: true, financial: record });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/financials/:id', async (req, res) => {
    try {
        const docRef = db.collection('financials').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Financial record not found.' });
        const body   = req.body;
        const update = { updatedAt: new Date().toISOString() };
        const numFields = ['lastYearBalance','currentYearDonations','cashInHand','cashAtBank','cashWithdrawnFromBank','totalCollection','currentYearExpenses'];
        numFields.forEach(f => { if (body[f] !== undefined) update[f] = Number(body[f]); });
        if (body.year    !== undefined) update.year    = String(body.year);
        if (body.notes   !== undefined) update.notes   = String(body.notes).trim();
        if (body._bsData !== undefined) update._bsData = body._bsData || null;
        await docRef.update(update);
        const updated = await docRef.get();
        return res.json({ success: true, financial: updated.data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/financials/:id', async (req, res) => {
    try {
        const docRef = db.collection('financials').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Financial record not found.' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 7 — PAUTI BOOKS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/pauti-books', async (req, res) => {
    try {
        const userId = req.query.userId;
        let query = db.collection('pautiBooks');
        if (userId) query = query.where('assignedUserId', '==', userId);
        const snap = await query.get();
        const pautiBooks = snap.docs.map(d => d.data());
        return res.json({ pautiBooks, totalSlips: TOTAL_SLIPS, slipsPerBook: SLIPS_PER_BOOK, maxBooks: MAX_BOOKS });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/pauti-books/assign', async (req, res) => {
    try {
        const { bookNumber, assignedTo, assignedUserId } = req.body;
        if (!bookNumber || isNaN(Number(bookNumber))) return res.status(400).json({ message: 'Book number required.' });
        const bn = Number(bookNumber);
        if (bn < 1 || bn > MAX_BOOKS) return res.status(400).json({ message: `Book number must be 1–${MAX_BOOKS}.` });

        const pautiBookId = `PB-${String(bn).padStart(3,'0')}`;
        const existing    = await db.collection('pautiBooks').doc(pautiBookId).get();
        if (existing.exists) return res.status(400).json({ message: `Book ${bn} already assigned.` });

        const slipsFrom = (bn - 1) * SLIPS_PER_BOOK + 1;
        const slipsTo   = bn * SLIPS_PER_BOOK;
        const slips     = [];
        for (let i = slipsFrom; i <= slipsTo; i++) {
            slips.push({ slipNumber: i, donorName: null, amount: null, paymentMode: null,
                         checkNumber: null, photoFile: null, photoUrl: null, uploadedAt: null, deleted: false });
        }
        const book = {
            pautiBookId, bookNumber: bn, assignedTo: assignedTo || 'Unassigned',
            assignedUserId: assignedUserId || null, assignedAt: new Date().toISOString(),
            slipsFrom, slipsTo, slips
        };
        await db.collection('pautiBooks').doc(pautiBookId).set(book);
        return res.json({ success: true, book });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.post('/api/pauti-books/next-slip', async (req, res) => {
    try {
        const { donorName, amount, paymentMode, checkNumber, uploadedBy, uploadedByUserId } = req.body;
        const snap = await db.collection('pautiBooks').orderBy('bookNumber').get();
        const pautiBooks = snap.docs.map(d => d.data());

        let maxClaimed = 0;
        pautiBooks.forEach(book => {
            (book.slips || []).forEach(slip => {
                if (slip.uploadedAt && !slip.deleted && slip.slipNumber > maxClaimed)
                    maxClaimed = slip.slipNumber;
            });
        });
        const nextSlipNum = maxClaimed + 1;
        if (nextSlipNum > TOTAL_SLIPS) return res.status(400).json({ message: `All ${TOTAL_SLIPS} slips have been filled.` });

        const bookNumber = Math.ceil(nextSlipNum / SLIPS_PER_BOOK);
        const slipsFrom  = (bookNumber - 1) * SLIPS_PER_BOOK + 1;
        const slipsTo    = bookNumber * SLIPS_PER_BOOK;
        const pautiBookId = `PB-${String(bookNumber).padStart(3,'0')}`;
        const bookRef     = db.collection('pautiBooks').doc(pautiBookId);
        let bookSnap      = await bookRef.get();
        let bookData;

        if (!bookSnap.exists) {
            const slips = [];
            for (let i = slipsFrom; i <= slipsTo; i++) {
                slips.push({ slipNumber: i, donorName: null, amount: null, paymentMode: null,
                             checkNumber: null, photoFile: null, photoUrl: null,
                             uploadedBy: null, uploadedByUserId: null, uploadedAt: null, deleted: false });
            }
            bookData = { pautiBookId, bookNumber, assignedTo: 'Auto', assignedUserId: null,
                         assignedAt: new Date().toISOString(), slipsFrom, slipsTo, slips };
            await bookRef.set(bookData);
        } else {
            bookData = bookSnap.data();
        }

        const slips = bookData.slips || [];
        const slipIdx = slips.findIndex(s => s.slipNumber === nextSlipNum);
        if (slipIdx === -1) return res.status(500).json({ message: 'Slip not found in book.' });

        slips[slipIdx] = {
            ...slips[slipIdx],
            donorName: (donorName || '').trim() || null,
            amount: amount && Number(amount) > 0 ? Number(amount) : null,
            paymentMode: paymentMode || 'cash', checkNumber: checkNumber || null,
            uploadedBy: uploadedBy || null, uploadedByUserId: uploadedByUserId || null,
            uploadedAt: new Date().toISOString()
        };
        await bookRef.update({ slips });
        return res.json({ success: true, slipNumber: nextSlipNum, bookNumber, slipsFrom, slipsTo, slip: slips[slipIdx] });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/pauti-books/:bookId/slips/:slipNum', async (req, res) => {
    try {
        const { bookId, slipNum } = req.params;
        const slipNumber = Number(slipNum);
        const bookRef = db.collection('pautiBooks').doc(bookId);
        const snap    = await bookRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Book not found.' });
        const book  = snap.data();
        const slips = book.slips || [];
        const sIdx  = slips.findIndex(s => s.slipNumber === slipNumber);
        if (sIdx === -1) return res.status(404).json({ message: 'Slip not found.' });
        const body = req.body;
        const slip = slips[sIdx];
        if (body.donorName        !== undefined) slip.donorName        = String(body.donorName).trim();
        if (body.amount           !== undefined) slip.amount           = Number(body.amount);
        if (body.paymentMode      !== undefined) slip.paymentMode      = String(body.paymentMode);
        if (body.checkNumber      !== undefined) slip.checkNumber      = body.checkNumber || null;
        if (body.uploadedBy       !== undefined) slip.uploadedBy       = body.uploadedBy || null;
        if (body.uploadedByUserId !== undefined) slip.uploadedByUserId = body.uploadedByUserId || null;
        if (body.status           !== undefined) slip.status           = String(body.status);
        await bookRef.update({ slips });
        return res.json({ success: true, slip });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.patch('/api/pauti-books/:bookId/slips/:slipNum/soft-delete', async (req, res) => {
    try {
        const { bookId, slipNum } = req.params;
        const slipNumber = Number(slipNum);
        const bookRef = db.collection('pautiBooks').doc(bookId);
        const snap    = await bookRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Book not found.' });
        const slips = snap.data().slips || [];
        const sIdx  = slips.findIndex(s => s.slipNumber === slipNumber);
        if (sIdx === -1) return res.status(404).json({ message: 'Slip not found.' });
        slips[sIdx].deleted = true;
        await bookRef.update({ slips });
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 8 — DONATIONS (Excel upload store)
// ═══════════════════════════════════════════════════════════════════════════════
//  Storage: Firestore `donations` collection
//    doc `metadata` → { columns: [] }
//    doc `{_id}`    → individual records

const DONATION_META_ID = 'metadata';


async function getDonationColumns() {
    const meta = await db.collection('donations').doc(DONATION_META_ID).get();
    return meta.exists ? (meta.data().columns || []) : [];
}

async function setDonationColumns(columns) {
    await db.collection('donations').doc(DONATION_META_ID).set({ columns }, { merge: false });
}

app.get('/api/donations', async (req, res) => {
    try {
        const CANONICAL = [
            'Receipt Book','Date','Receipt No','Receipt Type','Name','Location/ Area',
            'Current Year Amount','Balance Pending','Balance Receipt Amount',
            'Balance Recovered','Balance Received Date','Comments',
            'Balance Difference','Common Location'
        ];
        const [columns, snap] = await Promise.all([
            getDonationColumns(),
            db.collection('donations').get()
        ]);
        const records = snap.docs
            .filter(d => d.id !== DONATION_META_ID)
            .map(d => d.data())
            .filter(r => !r._deleted);
        const ordered = [
            ...CANONICAL.filter(c => columns.includes(c)),
            ...columns.filter(c => !CANONICAL.includes(c) && !c.startsWith('_'))
        ];
        return res.json({ columns: ordered, records, total: records.length });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/donations/upload', async (req, res) => {
    try {
        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ message: 'No records received.' });
        const existingColumns = await getDonationColumns();
        const detectedCols    = Object.keys(records[0]).filter(k => !k.startsWith('_'));
        const mergedCols      = [...new Set([...existingColumns, ...detectedCols])];
        await setDonationColumns(mergedCols);
        const stamped = records.map((r, i) => ({ _id: `DON-${Date.now()}-${i}`, _deleted: false, ...r }));
        await batchSet(stamped.map(r => ({ ref: db.collection('donations').doc(r._id), data: r })));
        return res.json({ success: true, uploaded: stamped.length, columns: mergedCols });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.post('/api/donations/replace', async (req, res) => {
    try {
        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ message: 'No records received.' });
        // Delete all existing records (except the metadata doc)
        const snap = await db.collection('donations').get();
        const toDelete = snap.docs.filter(d => d.id !== DONATION_META_ID).map(d => d.ref);
        await batchDelete(toDelete);
        const detectedCols = Object.keys(records[0]).filter(k => !k.startsWith('_'));
        await setDonationColumns(detectedCols);
        const stamped = records.map((r, i) => ({ _id: `DON-${Date.now()}-${i}`, _deleted: false, ...r }));
        await batchSet(stamped.map(r => ({ ref: db.collection('donations').doc(r._id), data: r })));
        return res.json({ success: true, uploaded: stamped.length, columns: detectedCols });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/donations/:id', async (req, res) => {
    try {
        const docRef = db.collection('donations').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Donation record not found.' });
        const body   = req.body;
        const update = { _updatedAt: new Date().toISOString() };
        Object.keys(body).forEach(k => { if (!k.startsWith('_')) update[k] = body[k]; });
        await docRef.update(update);
        const updated = await docRef.get();
        return res.json({ success: true, record: updated.data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/donations', async (req, res) => {
    try {
        const snap = await db.collection('donations').get();
        const toDelete = snap.docs.filter(d => d.id !== DONATION_META_ID).map(d => d.ref);
        const prev = toDelete.length;
        await batchDelete(toDelete);
        await setDonationColumns([]);
        return res.json({ success: true, deleted: prev });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.delete('/api/donations/:id', async (req, res) => {
    try {
        const docRef = db.collection('donations').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Donation record not found.' });
        await docRef.update({ _deleted: true, _deletedAt: new Date().toISOString() });
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 9 — DONATION ENTRIES
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeStatus(st, pm) {
    let s = String(st || '').toLowerCase().trim();
    if (s === 'undefined' || s === 'null' || s === '') {
        return String(pm || '').toLowerCase().trim() === 'balance' ? 'Balance' : 'Received';
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
}

app.get('/api/donation-entries', async (req, res) => {
    try {
        const { bookNumber: bookFilter, landmark: landmarkFilter, userId: userIdFilter, year: yearFilter } = req.query;
        const settings = await getSettings();
        const activeYear = settings.activeDonationYear || '2026-27';

        // Fetch all three sources in parallel
        const [deSnap, pbSnap, rcSnap] = await Promise.all([
            db.collection('donationEntries').where('deleted', '==', false).get(),
            db.collection('pautiBooks').get(),
            db.collection('receipts').get()
        ]);

        let result = deSnap.docs.map(d => {
            const e = d.data();
            return { ...e, status: normalizeStatus(e.status, e.paymentMode) };
        });

        // Merge pauti book slips
        pbSnap.docs.forEach(pbDoc => {
            const book = pbDoc.data();
            if (bookFilter && String(book.bookNumber) !== String(bookFilter)) return;
            (book.slips || []).forEach(slip => {
                const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
                if (slip.uploadedAt && !slip.deleted && getStatus(slip) === 'received' && slip.amount && Number(slip.amount) > 0) {
                    result.push({
                        ...slip,
                        entryId: `PB-${book.pautiBookId}-${slip.slipNumber}`,
                        bookNumber: book.bookNumber, receiptNumber: slip.slipNumber,
                        donorType: 'Individual',
                        firstName: slip.firstName || slip.donorName || '',
                        middleName: slip.middleName || '', lastName: slip.lastName || '',
                        amount: slip.amount, paymentMode: slip.paymentMode || 'Cash',
                        status: normalizeStatus(slip.status, slip.paymentMode),
                        photoUrl: slip.photoUrl || null,
                        submittedAt: slip.uploadedAt, submittedBy: slip.uploadedBy || 'Auto',
                        submittedByUserId: slip.uploadedByUserId || null,
                        landmark: slip.landmark || null,
                        referenceNumber: slip.referenceNumber || slip.checkNumber || null,
                        markedReceivedBy: slip.markedReceivedBy || null
                    });
                }
            });
        });

        // Merge received receipts
        rcSnap.docs.forEach(rcDoc => {
            const r = rcDoc.data();
            if (bookFilter && String(r.bookNumber) !== String(bookFilter)) return;
            const getStatus = s => (s.status || (String(s.paymentMode || s.type || '').toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
            if (!r.deleted && getStatus(r) === 'received') {
                result.push({
                    ...r,
                    entryId: r.receiptId || `RC-${r.receiptNumber}`,
                    bookNumber: r.bookNumber || 0, receiptNumber: r.receiptNumber || 0,
                    donorType: 'Individual',
                    firstName: r.firstName || r.name || '', middleName: r.middleName || '', lastName: r.lastName || '',
                    amount: r.amount, paymentMode: r.paymentMode || 'Cash',
                    status: normalizeStatus(r.status, r.paymentMode),
                    photoUrl: r.photoUrl || null,
                    submittedAt: r.date || r.createdAt || new Date().toISOString(),
                    submittedBy: 'Admin', landmark: r.landmark || null,
                    referenceNumber: r.referenceNumber || null, markedReceivedBy: r.markedReceivedBy || null
                });
            }
        });

        // Filters
        if (bookFilter)      result = result.filter(e => String(e.bookNumber) === String(bookFilter));
        if (landmarkFilter)  result = result.filter(e => e.landmark === landmarkFilter);
        if (userIdFilter)    result = result.filter(e => String(e.submittedByUserId || e.userId || '') === String(userIdFilter));
        if (yearFilter && String(yearFilter).toLowerCase() !== 'all') {
            const targetYear = String(yearFilter).toLowerCase() === 'active' ? activeYear : yearFilter;
            result = result.filter(e => e.year === targetYear);
        }

        result.sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
        return res.json({
            entries: result, total: result.length,
            slipsPerBook: SLIPS_PER_BOOK_DE,
            maxNewBooks: settings.maxNewBooks,
            maxOldBooks: settings.maxOldBooks
        });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.get('/api/donation-entries/next-receipt', async (req, res) => {
    try {
        const bType   = req.query.type || 'New';
        const settings = await getSettings();
        const maxBooks = bType === 'Old' ? settings.maxOldBooks : settings.maxNewBooks;
        const activeYear = settings.activeDonationYear || '2026-27';
        const SLIPS = 50;
        const snap  = await db.collection('donationEntries')
            .where('deleted', '==', false)
            .where('year', '==', activeYear)
            .get();
        const usedByBook = {};
        snap.docs.forEach(d => {
            const e = d.data();
            if ((e.bookType || 'New') === bType) {
                if (!usedByBook[e.bookNumber]) usedByBook[e.bookNumber] = new Set();
                usedByBook[e.bookNumber].add(e.receiptNumber);
            }
        });
        for (let b = 1; b <= maxBooks; b++) {
            const from = (b-1)*SLIPS+1, to = b*SLIPS;
            const used = usedByBook[b] || new Set();
            for (let r = from; r <= to; r++) {
                if (!used.has(r)) return res.json({ bookNumber: b, receiptNumber: r });
            }
        }
        return res.json({ bookNumber: null, receiptNumber: null, message: 'All receipt numbers are used.' });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.get('/api/donation-entries/used-receipts/:bookNumber', async (req, res) => {
    try {
        const bn     = Number(req.params.bookNumber);
        const bType  = req.query.type || 'New';
        const settings = await getSettings();
        const activeYear = settings.activeDonationYear || '2026-27';
        const yearFilter = req.query.year || activeYear;
        const snap = await db.collection('donationEntries')
            .where('deleted', '==', false)
            .where('bookNumber', '==', bn)
            .where('year', '==', yearFilter)
            .get();
        const used = snap.docs
            .filter(d => (d.data().bookType || 'New') === bType)
            .map(d => d.data().receiptNumber);
        return res.json({ bookNumber: bn, usedReceipts: used });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/donation-entries', async (req, res) => {
    try {
        const {
            bookNumber, receiptNumber, donorType, bookType,
            firstName, middleName, lastName, businessName,
            whatsappNumber, mobileNumber, mailId,
            buildingName, flatNumber, landmark, area,
            amount, paymentMode, referenceNumber,
            submittedBy, submittedByUserId, receiptDate, receiptSnapshot
        } = req.body;

        const settings   = await getSettings();
        const activeYear = settings.activeDonationYear || '2026-27';
        const bn   = Number(bookNumber);
        const rn   = Number(receiptNumber);
        const bType = bookType === 'Old' ? 'Old' : 'New';
        const maxBooks = bType === 'Old' ? settings.maxOldBooks : settings.maxNewBooks;

        if (!bn || bn < 1 || bn > maxBooks) return res.status(400).json({ message: `Book number must be 1–${maxBooks}.` });
        const expectedFrom = (bn - 1) * SLIPS_PER_BOOK_DE + 1;
        const expectedTo   = bn * SLIPS_PER_BOOK_DE;
        if (!rn || rn < expectedFrom || rn > expectedTo)
            return res.status(400).json({ message: `Receipt number for Book ${bn} must be ${expectedFrom}–${expectedTo}.` });

        // Check duplicate
        const dupSnap = await db.collection('donationEntries')
            .where('bookNumber', '==', bn)
            .where('receiptNumber', '==', rn)
            .where('year', '==', activeYear)
            .where('deleted', '==', false)
            .limit(1).get();
        const dupEntry = dupSnap.docs.find(d => (d.data().bookType || 'New') === bType);
        if (dupEntry) return res.status(400).json({ message: `Receipt #${rn} in Book ${bn} (${bType}) is already used.` });

        if (!donorType || !['Individual', 'Business'].includes(donorType))
            return res.status(400).json({ message: 'Donor type must be Individual or Business.' });
        if (donorType === 'Individual') {
            if (!firstName || !firstName.trim()) return res.status(400).json({ message: 'First Name is required.' });
            if (!lastName  || !lastName.trim())  return res.status(400).json({ message: 'Last Name is required.' });
        } else {
            if (!businessName || !businessName.trim()) return res.status(400).json({ message: 'Business Name is required.' });
        }
        if (!landmark || !landmark.trim()) return res.status(400).json({ message: 'Landmark is required.' });
        if (!paymentMode || !['Cash','Cheque','UPI','RTGS','Balance'].includes(paymentMode))
            return res.status(400).json({ message: 'Payment mode must be Cash, Cheque, UPI, RTGS, or Balance.' });

        const entry = {
            entryId: `DE-${Date.now()}`, year: activeYear,
            bookNumber: bn, receiptNumber: rn, bookType: bType,
            donorType,
            firstName: donorType === 'Individual' ? String(firstName).trim().toUpperCase() : null,
            middleName: donorType === 'Individual' ? String(middleName || '').trim().toUpperCase() : null,
            lastName: donorType === 'Individual' ? String(lastName).trim().toUpperCase() : null,
            businessName: donorType === 'Business' ? String(businessName).trim().toUpperCase() : null,
            whatsappNumber: (whatsappNumber || '').trim() || null,
            mobileNumber:   (mobileNumber   || '').trim() || null,
            mailId:         (mailId          || '').trim() || null,
            buildingName:   (buildingName    || '').trim() || null,
            flatNumber:     (flatNumber      || '').trim() || null,
            landmark:       (landmark        || '').trim() || null,
            area:           (area            || '').trim() || null,
            amount: amount != null && !isNaN(Number(amount)) ? Number(amount) : null,
            paymentMode,
            status: paymentMode === 'Balance' ? 'Balance' : 'Received',
            referenceNumber: (referenceNumber || '').trim() || null,
            submittedAt: new Date().toISOString(),
            submittedBy: (submittedBy || '').trim() || null,
            submittedByUserId: submittedByUserId || null,
            deleted: false, updatedAt: null,
            receiptDate: (receiptDate || '').trim() || null,
            receiptSnapshot: receiptSnapshot || null,
            receiptHistory: []
        };
        await db.collection('donationEntries').doc(entry.entryId).set(entry);
        await broadcastLiveEvent('donations_updated');
        return res.json({ success: true, entry });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/donation-entries/:id/receipt', async (req, res) => {
    try {
        const id     = req.params.id;
        const docRef = db.collection('donationEntries').doc(id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Entry not found.' });
        const { donorName, amount, receiptDate, status, reason, editedBy } = req.body;
        if (!donorName || !donorName.trim()) return res.status(400).json({ message: 'Donor name is required.' });

        const e = snap.data();
        const newSnapshot = {
            donorName: donorName.trim().toUpperCase(),
            amount: amount != null && !isNaN(Number(amount)) ? Number(amount) : (e.amount || null),
            receiptDate: (receiptDate || '').trim() || e.receiptDate || null,
            receiptNo: e.receiptNumber, bookNo: e.bookNumber,
            paymentMode: e.paymentMode,
            savedAt: new Date().toISOString(), savedBy: (editedBy || 'Unknown').trim()
        };

        const update = {
            receiptSnapshot: newSnapshot,
            updatedAt: new Date().toISOString(),
            receiptHistory: admin.firestore.FieldValue.arrayUnion({
                editedAt: new Date().toISOString(),
                editedBy: (editedBy || 'Unknown').trim(),
                reason: (reason || '').trim() || 'Manual edit',
                changes: {}
            })
        };
        if (newSnapshot.amount !== null) update.amount = newSnapshot.amount;
        if (newSnapshot.receiptDate) update.receiptDate = newSnapshot.receiptDate;
        if (status && ['Received','Balance','Cash','Cheque','UPI','RTGS'].includes(status)) update.status = status;

        const parts = newSnapshot.donorName.split(' ').filter(Boolean);
        if (parts.length >= 1) update.firstName  = parts[0];
        if (parts.length >= 2) update.lastName   = parts[parts.length - 1];
        if (parts.length >= 3) update.middleName = parts.slice(1,-1).join(' ');
        if (e.donorType === 'Business') update.businessName = newSnapshot.donorName;

        await docRef.update(update);
        await broadcastLiveEvent('donations_updated');
        const updated = await docRef.get();
        return res.json({ success: true, entry: updated.data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/donation-entries/:id', async (req, res) => {
    try {
        const id   = req.params.id;
        const body = req.body;

        // PB- intercept: pauti book slip
        if (id.startsWith('PB-')) {
            const parts  = id.split('-');
            const bookId = `PB-${parts[1]}`;
            const slipNum = Number(parts[2]);
            const bookRef = db.collection('pautiBooks').doc(bookId);
            const snap    = await bookRef.get();
            if (!snap.exists) return res.status(404).json({ message: 'Pauti book not found.' });
            const slips = snap.data().slips || [];
            const sIdx  = slips.findIndex(s => s.slipNumber === slipNum);
            if (sIdx === -1) return res.status(404).json({ message: 'Slip not found.' });
            Object.keys(body).forEach(k => { if (!k.startsWith('_')) slips[sIdx][k] = body[k]; });
            await bookRef.update({ slips });
            return res.json({ success: true, entry: slips[sIdx] });
        }

        // RC- intercept: receipt
        if (id.startsWith('RC-')) {
            const rId    = id.substring(3);
            const docRef = db.collection('receipts').doc(rId);
            const snap   = await docRef.get();
            if (!snap.exists) {
                const docRef2 = db.collection('receipts').doc(id);
                const snap2   = await docRef2.get();
                if (!snap2.exists) return res.status(404).json({ message: 'Receipt not found.' });
                const update = {};
                Object.keys(body).forEach(k => { if (!k.startsWith('_')) update[k] = body[k]; });
                await docRef2.update(update);
                return res.json({ success: true, entry: (await docRef2.get()).data() });
            }
            const update = {};
            Object.keys(body).forEach(k => { if (!k.startsWith('_')) update[k] = body[k]; });
            await docRef.update(update);
            return res.json({ success: true, entry: (await docRef.get()).data() });
        }

        const docRef = db.collection('donationEntries').doc(id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Entry not found.' });
        const e      = snap.data();
        const isAdmin = body._isAdmin === true;
        const settings = await getSettings();

        const newBook    = body.bookNumber    !== undefined ? Number(body.bookNumber)    : e.bookNumber;
        const newReceipt = body.receiptNumber !== undefined ? Number(body.receiptNumber) : e.receiptNumber;
        const newType    = body.bookType      !== undefined ? body.bookType              : (e.bookType || 'New');

        if (newBook !== e.bookNumber || newReceipt !== e.receiptNumber || newType !== (e.bookType || 'New')) {
            const maxBooks = newType === 'Old' ? settings.maxOldBooks : settings.maxNewBooks;
            if (!newBook || newBook < 1 || newBook > maxBooks)
                return res.status(400).json({ message: `Book number must be 1–${maxBooks}.` });
            const dupSnap = await db.collection('donationEntries')
                .where('bookNumber', '==', newBook)
                .where('receiptNumber', '==', newReceipt)
                .where('year', '==', e.year || (settings.activeDonationYear || '2026-27'))
                .where('deleted', '==', false).limit(2).get();
            const dup = dupSnap.docs.find(d => d.id !== id && (d.data().bookType || 'New') === newType);
            if (dup) return res.status(400).json({ message: `Receipt #${newReceipt} in Book ${newBook} (${newType}) is already used.` });
            const expectedFrom = (newBook - 1) * SLIPS_PER_BOOK_DE + 1;
            const expectedTo   = newBook * SLIPS_PER_BOOK_DE;
            if (newReceipt < expectedFrom || newReceipt > expectedTo)
                return res.status(400).json({ message: `Receipt number for Book ${newBook} must be ${expectedFrom}–${expectedTo}.` });
        }

        const update = { updatedAt: new Date().toISOString() };
        if (body.receiptSnapshot !== undefined) update.receiptSnapshot = body.receiptSnapshot;
        if (body.receiptDate     !== undefined) update.receiptDate     = body.receiptDate;

        if (isAdmin) {
            const fields = ['bookNumber','receiptNumber','bookType','donorType','firstName','middleName','lastName',
                            'businessName','whatsappNumber','mobileNumber','mailId','buildingName',
                            'flatNumber','landmark','area','amount','paymentMode','referenceNumber','status','amountReceived'];
            fields.forEach(f => {
                if (body[f] === undefined) return;
                if (['firstName','middleName','lastName','businessName'].includes(f) && body[f])
                    update[f] = String(body[f]).trim().toUpperCase();
                else if (['bookNumber','receiptNumber','amount'].includes(f))
                    update[f] = Number(body[f]);
                else if (f === 'amountReceived')
                    update[f] = (body[f] !== '' && body[f] != null) ? Number(body[f]) : null;
                else
                    update[f] = body[f];
            });
            if (body.photoFile !== undefined) {
                update.photoFile = body.photoFile || null;
                update.photoUrl  = body.photoFile ? `/uploads/${body.photoFile}` : null;
            }
        } else {
            const nonTracked = ['landmark','area','buildingName','flatNumber','referenceNumber'];
            nonTracked.forEach(f => { if (body[f] !== undefined) update[f] = String(body[f]); });
            if (Object.prototype.hasOwnProperty.call(body, 'amountReceived')) {
                update.amountReceived = body.amountReceived != null && body.amountReceived !== '' ? Number(body.amountReceived) : null;
            }
            const hasNameChange    = ['firstName','middleName','lastName','businessName'].some(f => body[f] !== undefined);
            const hasAmountChange  = body.amount        !== undefined && Number(body.amount)        !== Number(e.amount);
            const hasBookChange    = body.bookNumber    !== undefined && Number(body.bookNumber)    !== Number(e.bookNumber);
            const hasReceiptChange = body.receiptNumber !== undefined && Number(body.receiptNumber) !== Number(e.receiptNumber);
            const hasModeChange    = body.paymentMode   !== undefined && String(body.paymentMode)   !== String(e.paymentMode);
            const hasStatusChange  = body.status        !== undefined && String(body.status)        !== String(e.status);

            if ((hasNameChange || hasAmountChange || hasBookChange || hasReceiptChange) && (!body.changeReason || !String(body.changeReason).trim()))
                return res.status(400).json({ message: 'A reason is required when changing donor details (Name, Amount, Book, or Receipt).' });

            if (hasNameChange)    ['firstName','middleName','lastName','businessName'].forEach(f => { if (body[f] !== undefined) update[f] = String(body[f]).trim().toUpperCase(); });
            if (hasAmountChange)  update.amount        = Number(body.amount);
            if (hasBookChange)    update.bookNumber    = Number(body.bookNumber);
            if (hasReceiptChange) update.receiptNumber = Number(body.receiptNumber);
            if (hasModeChange)    update.paymentMode   = String(body.paymentMode);
            if (hasStatusChange)  update.status        = String(body.status);

            if (hasNameChange || hasAmountChange || hasBookChange || hasReceiptChange || hasModeChange || hasStatusChange) {
                update.editHistory = admin.firestore.FieldValue.arrayUnion({
                    from: e.donorType === 'Business' ? (e.businessName || '') : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' '),
                    fromAmount: e.amount, toAmount: update.amount || e.amount,
                    fromBook: e.bookNumber, toBook: update.bookNumber || e.bookNumber,
                    fromReceipt: e.receiptNumber, toReceipt: update.receiptNumber || e.receiptNumber,
                    fromMode: e.paymentMode, toMode: update.paymentMode || e.paymentMode,
                    fromStatus: e.status, toStatus: update.status || e.status,
                    reason: String(body.changeReason || 'Status/Mode Updated').trim(),
                    changedAt: new Date().toISOString(), changedBy: body.changedBy || 'Volunteer'
                });
            }
        }

        await docRef.update(update);
        await broadcastLiveEvent('donations_updated');
        const updated = await docRef.get();
        return res.json({ success: true, entry: updated.data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.post('/api/donation-entries/edit-multipart', async (req, res) => {
    try {
        const parts   = await parseMultipart(req);
        const settings = await getSettings();
        const id      = getPartValue(parts, 'entryId');
        if (!id) return res.status(400).json({ message: 'entryId required.' });
        const docRef  = db.collection('donationEntries').doc(id);
        const snap    = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Entry not found.' });

        const e        = snap.data();
        const isAdmin  = getPartValue(parts, '_isAdmin') === 'true';
        const newDonorName = getPartValue(parts, 'donorName');
        const newAmount    = getPartValue(parts, 'amount');
        const changeReason = getPartValue(parts, 'changeReason');
        const changedBy    = getPartValue(parts, 'changedBy') || 'Volunteer';
        const bookNumber   = getPartValue(parts, 'bookNumber');
        const receiptNumber = getPartValue(parts, 'receiptNumber');
        const landmark     = getPartValue(parts, 'landmark');
        const paymentMode  = getPartValue(parts, 'paymentMode');
        const statusVal    = getPartValue(parts, 'status');

        const oldName = e.donorType === 'Business' ? (e.businessName||'') : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
        const hasNameChange    = newDonorName !== undefined && newDonorName !== oldName;
        const hasAmountChange  = newAmount !== undefined && Number(newAmount) !== Number(e.amount);
        const hasBookChange    = bookNumber !== undefined && Number(bookNumber) !== Number(e.bookNumber);
        const hasReceiptChange = receiptNumber !== undefined && Number(receiptNumber) !== Number(e.receiptNumber);
        const hasModeChange    = paymentMode !== undefined && String(paymentMode) !== String(e.paymentMode);
        const hasStatusChange  = statusVal !== undefined && String(statusVal) !== String(e.status);

        if (!isAdmin && (hasNameChange || hasAmountChange || hasBookChange || hasReceiptChange) && !changeReason)
            return res.status(400).json({ message: 'A reason is required when changing donor details.' });

        const update = { updatedAt: new Date().toISOString() };
        if (newDonorName !== undefined) {
            const n = newDonorName.toUpperCase().split(' ');
            if (e.donorType === 'Business') { update.businessName = newDonorName.toUpperCase(); }
            else {
                update.firstName  = n[0] || '';
                update.middleName = n.length > 2 ? n.slice(1,-1).join(' ') : '';
                update.lastName   = n.length > 1 ? n[n.length-1] : '';
            }
        }
        if (newAmount    !== undefined) update.amount        = Number(newAmount);
        if (bookNumber   !== undefined) update.bookNumber    = Number(bookNumber);
        if (receiptNumber !== undefined) update.receiptNumber = Number(receiptNumber);
        if (landmark     !== undefined) update.landmark      = landmark;
        if (paymentMode  !== undefined) update.paymentMode   = paymentMode;
        if (statusVal    !== undefined) update.status        = statusVal;

        if (hasNameChange || hasAmountChange || hasBookChange || hasReceiptChange || hasModeChange || hasStatusChange) {
            update.editHistory = admin.firestore.FieldValue.arrayUnion({
                from: oldName, to: newDonorName || oldName,
                fromAmount: e.amount, toAmount: newAmount !== undefined ? Number(newAmount) : e.amount,
                fromBook: e.bookNumber, toBook: bookNumber !== undefined ? Number(bookNumber) : e.bookNumber,
                fromReceipt: e.receiptNumber, toReceipt: receiptNumber !== undefined ? Number(receiptNumber) : e.receiptNumber,
                fromMode: e.paymentMode, toMode: paymentMode || e.paymentMode,
                fromStatus: e.status, toStatus: statusVal || e.status,
                reason: changeReason || 'Status/Mode/Photo Updated',
                changedAt: new Date().toISOString(), changedBy
            });
        }

        // Photo upload
        const filePart = parts.find(p => p.name === 'photo' && p.filename);
        if (filePart) {
            const ext = (filePart.filename.split('.').pop() || 'jpg').toLowerCase();
            const uniqueName = `edit-${e.bookNumber || 0}-${e.receiptNumber || 0}-${Date.now()}.${ext}`;
            const cloudUrl   = await uploadToCloudinary(filePart.data, uniqueName, settings);
            if (cloudUrl) {
                update.photoFile = uniqueName;
                update.photoUrl  = cloudUrl;
            }
        }

        await docRef.update(update);
        await broadcastLiveEvent('donations_updated');
        const updated = await docRef.get();
        return res.json({ success: true, entry: updated.data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/donation-entries/:id', async (req, res) => {
    try {
        const id = req.params.id;

        if (id.startsWith('PB-')) {
            const parts  = id.split('-');
            const bookId = `PB-${parts[1]}`;
            const slipNum = Number(parts[2]);
            const bookRef = db.collection('pautiBooks').doc(bookId);
            const snap    = await bookRef.get();
            if (!snap.exists) return res.status(404).json({ message: 'Entry not found.' });
            const slips = snap.data().slips || [];
            const sIdx  = slips.findIndex(s => s.slipNumber === slipNum);
            if (sIdx === -1) return res.status(404).json({ message: 'Entry not found.' });
            slips[sIdx].deleted = true;
            await bookRef.update({ slips });
            return res.json({ success: true });
        }

        if (id.startsWith('RC-')) {
            const rId    = id.substring(3);
            const docRef = db.collection('receipts').doc(rId);
            const snap   = await docRef.get();
            if (!snap.exists) {
                const docRef2 = db.collection('receipts').doc(id);
                const snap2   = await docRef2.get();
                if (!snap2.exists) return res.status(404).json({ message: 'Entry not found.' });
                await docRef2.update({ deleted: true });
                return res.json({ success: true });
            }
            await docRef.update({ deleted: true });
            return res.json({ success: true });
        }

        const docRef = db.collection('donationEntries').doc(id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Entry not found.' });
        await docRef.update({ deleted: true, updatedAt: new Date().toISOString() });
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 10 — DONATION YEARS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/donation-years', async (req, res) => {
    try {
        const settings   = await getSettings();
        const allowed    = Array.isArray(settings.allowedYears) ? settings.allowedYears : [];
        const activeYear = settings.activeDonationYear || '2026-27';
        const years      = new Set(allowed);
        years.add(activeYear);
        const snap = await db.collection('donationEntries').where('deleted', '==', false).get();
        snap.docs.forEach(d => { const y = d.data().year; if (y) years.add(y); });
        const sorted = Array.from(years).sort().reverse();
        return res.json({ success: true, years: sorted, activeYear });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/donation-years', async (req, res) => {
    try {
        if (!req.body.year) return res.status(400).json({ message: 'Year is required.' });
        const newYear = String(req.body.year).trim();
        const settings = await getSettings();
        if (!Array.isArray(settings.allowedYears)) settings.allowedYears = [];
        if (!settings.allowedYears.includes(newYear)) {
            settings.allowedYears.push(newYear);
            await saveSettings(settings);
        }
        return res.json({ success: true, message: 'Year added successfully.' });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.delete('/api/donation-years/:year', async (req, res) => {
    try {
        const yearToDelete = decodeURIComponent(req.params.year);
        if (!yearToDelete) return res.status(400).json({ message: 'Year is required.' });
        const settings = await getSettings();
        if (yearToDelete === settings.activeDonationYear)
            return res.status(400).json({ message: 'Cannot delete the active donation year.' });

        let entriesDeleted = 0;
        const nowStr = new Date().toISOString();

        // 1. Remove from allowedYears
        if (Array.isArray(settings.allowedYears)) {
            settings.allowedYears = settings.allowedYears.filter(y => y !== yearToDelete);
            await saveSettings(settings);
        }

        // 2. Soft-delete donation entries
        const deSnap = await db.collection('donationEntries').where('year', '==', yearToDelete).where('deleted', '==', false).get();
        if (!deSnap.empty) {
            const batch = db.batch();
            deSnap.docs.forEach(d => { batch.update(d.ref, { deleted: true, deletedAt: nowStr }); entriesDeleted++; });
            await batch.commit();
        }

        // 3. Soft-delete pauti book slips
        const pbSnap = await db.collection('pautiBooks').where('year', '==', yearToDelete).get();
        for (const pbDoc of pbSnap.docs) {
            const book  = pbDoc.data();
            const slips = (book.slips || []).map(s => {
                if (!s.deleted) { entriesDeleted++; return { ...s, deleted: true, deletedAt: nowStr }; }
                return s;
            });
            await pbDoc.ref.update({ deleted: true, deletedAt: nowStr, slips });
        }

        // 4. Soft-delete receipts
        const rcSnap = await db.collection('receipts').where('year', '==', yearToDelete).where('deleted', '==', false).get();
        if (!rcSnap.empty) {
            const batch = db.batch();
            rcSnap.docs.forEach(d => { batch.update(d.ref, { deleted: true, deletedAt: nowStr }); entriesDeleted++; });
            await batch.commit();
        }

        return res.json({ success: true, message: `Year deleted. ${entriesDeleted} entries removed.` });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.put('/api/donation-years/:year', async (req, res) => {
    try {
        const oldYear = decodeURIComponent(req.params.year);
        const newYear = String(req.body.newYear || '').trim();
        if (!oldYear)  return res.status(400).json({ message: 'Old year is required.' });
        if (!newYear)  return res.status(400).json({ message: 'newYear is required.' });
        if (newYear === oldYear) return res.json({ success: true, message: 'No change.' });

        const settings = await getSettings();
        if (!settings.allowedYears) settings.allowedYears = [];
        const idx = settings.allowedYears.indexOf(oldYear);
        if (idx !== -1) settings.allowedYears[idx] = newYear;
        if (settings.activeDonationYear === oldYear) {
            settings.activeDonationYear = newYear;
            if (settings.receiptFormat) settings.receiptFormat.receiptYear = newYear;
        }
        await saveSettings(settings);

        // Rename in donation entries
        const deSnap = await db.collection('donationEntries').where('year', '==', oldYear).get();
        if (!deSnap.empty) {
            const batch = db.batch();
            deSnap.docs.forEach(d => batch.update(d.ref, { year: newYear }));
            await batch.commit();
        }

        // Rename in pauti books
        const pbSnap = await db.collection('pautiBooks').where('year', '==', oldYear).get();
        if (!pbSnap.empty) {
            const batch = db.batch();
            pbSnap.docs.forEach(d => batch.update(d.ref, { year: newYear }));
            await batch.commit();
        }

        // Rename in receipts
        const rcSnap = await db.collection('receipts').where('year', '==', oldYear).get();
        if (!rcSnap.empty) {
            const batch = db.batch();
            rcSnap.docs.forEach(d => batch.update(d.ref, { year: newYear }));
            await batch.commit();
        }

        return res.json({ success: true, message: `Year renamed to ${newYear}.` });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 11 — BUILDINGS, LANDMARKS, AREAS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/buildings', async (req, res) => {
    try {
        const areaIdFilter = req.query.areaId;
        let query = db.collection('buildings');
        if (areaIdFilter) query = query.where('areaId', '==', areaIdFilter);
        const snap = await query.get();
        return res.json({ buildings: snap.docs.map(d => d.data()) });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/buildings', async (req, res) => {
    try {
        const name       = (req.body.name || '').trim();
        const areaId     = (req.body.areaId || '').trim() || null;
        const landmarkId = (req.body.landmarkId || '').trim() || null;
        if (!name) return res.status(400).json({ message: 'Building name is required.' });
        const snap = await db.collection('buildings').where('name', '==', name).limit(1).get();
        if (!snap.empty) return res.status(400).json({ message: `Building "${name}" already exists.` });
        const building = { id: `BLD-${Date.now()}`, name };
        if (areaId)     building.areaId     = areaId;
        if (landmarkId) building.landmarkId = landmarkId;
        await db.collection('buildings').doc(building.id).set(building);
        return res.json({ success: true, building });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/buildings/:id', async (req, res) => {
    try {
        const docRef = db.collection('buildings').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Building not found.' });
        const name       = (req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'Building name is required.' });
        const update = { name };
        if (Object.prototype.hasOwnProperty.call(req.body, 'landmarkId'))
            update.landmarkId = (req.body.landmarkId || '').trim() || null;
        if (Object.prototype.hasOwnProperty.call(req.body, 'areaId'))
            update.areaId = (req.body.areaId || '').trim() || null;
        await docRef.update(update);
        return res.json({ success: true, building: (await docRef.get()).data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/buildings/:id', async (req, res) => {
    try {
        const docRef = db.collection('buildings').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Building not found.' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.get('/api/landmarks', async (req, res) => {
    try {
        const snap = await db.collection('landmarks').get();
        let landmarks = snap.docs.map(d => d.data());
        // Ensure fixed landmarks exist
        const needsSeed = FIXED_LANDMARKS.filter(fl => !landmarks.find(l => l.name.toLowerCase() === fl.name.toLowerCase()));
        if (needsSeed.length > 0) {
            const batch = db.batch();
            needsSeed.forEach(fl => {
                batch.set(db.collection('landmarks').doc(fl.id), fl);
                landmarks.push(fl);
            });
            await batch.commit();
        }
        const landmarkIdFilter = req.query.landmarkId;
        if (landmarkIdFilter) landmarks = landmarks.filter(l => !l.landmarkId || l.landmarkId === landmarkIdFilter);
        return res.json({ landmarks });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/landmarks', async (req, res) => {
    try {
        const name       = (req.body.name || '').trim();
        const landmarkId = (req.body.landmarkId || '').trim() || null;
        if (!name) return res.status(400).json({ message: 'Landmark name is required.' });
        const snap = await db.collection('landmarks').where('name', '==', name).limit(1).get();
        if (!snap.empty) return res.status(400).json({ message: `Landmark "${name}" already exists.` });
        const landmark = { id: `LANDMARK-${Date.now()}`, name };
        if (landmarkId) landmark.landmarkId = landmarkId;
        await db.collection('landmarks').doc(landmark.id).set(landmark);
        return res.json({ success: true, landmark });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/landmarks/:id', async (req, res) => {
    try {
        const docRef = db.collection('landmarks').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Landmark not found.' });
        const name = (req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'Landmark name is required.' });
        await docRef.update({ name });
        return res.json({ success: true, landmark: (await docRef.get()).data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/landmarks/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = db.collection('landmarks').doc(id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Landmark not found.' });
        await docRef.delete();
        // Cascade delete areas with this landmarkId
        const areasSnap = await db.collection('areas').where('landmarkId', '==', id).get();
        if (!areasSnap.empty) {
            const batch = db.batch();
            areasSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.get('/api/areas', async (req, res) => {
    try {
        const snap = await db.collection('areas').get();
        return res.json({ areas: snap.docs.map(d => d.data()) });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/areas', async (req, res) => {
    try {
        const name       = (req.body.name || '').trim();
        const landmarkId = (req.body.landmarkId || '').trim();
        if (!name)       return res.status(400).json({ message: 'Sub-landmark name is required.' });
        if (!landmarkId) return res.status(400).json({ message: 'landmarkId is required.' });
        const lmSnap = await db.collection('landmarks').doc(landmarkId).get();
        if (!lmSnap.exists) return res.status(400).json({ message: 'Parent landmark not found.' });
        const dupSnap = await db.collection('areas').where('landmarkId','==', landmarkId).where('name','==', name).limit(1).get();
        if (!dupSnap.empty) return res.status(400).json({ message: `Sub-landmark "${name}" already exists in this landmark.` });
        const area = { id: `SA-${Date.now()}`, name, landmarkId };
        await db.collection('areas').doc(area.id).set(area);
        return res.json({ success: true, area });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/areas/:id', async (req, res) => {
    try {
        const docRef = db.collection('areas').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Sub-landmark not found.' });
        const name = (req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'Sub-landmark name is required.' });
        await docRef.update({ name });
        return res.json({ success: true, area: (await docRef.get()).data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/areas/:id', async (req, res) => {
    try {
        const docRef = db.collection('areas').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Sub-landmark not found.' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 12 — COMMITTEE MEMBERS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/committee-members', async (req, res) => {
    try {
        const snap = await db.collection('committeeMembers').get();
        const members = snap.docs.map(d => d.data()).sort((a,b) => {
            const sa = (a.sequence != null && a.sequence !== '') ? Number(a.sequence) : 999999;
            const sb = (b.sequence != null && b.sequence !== '') ? Number(b.sequence) : 999999;
            return sa - sb;
        });
        return res.json({ members });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/committee-members', async (req, res) => {
    try {
        const { name, memberId, phone, whatsapp, department, role, sequence } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: 'Member name is required.' });
        const member = {
            id: `CM-${Date.now()}`, name: name.trim(),
            memberId: (memberId||'').trim(), phone: (phone||'').trim(),
            whatsapp: (whatsapp||'').trim(), department: (department||'').trim(),
            role: (role||'').trim(),
            sequence: sequence !== undefined && sequence !== '' ? Number(sequence) : null,
            photoFile: null, photoUrl: null, createdAt: new Date().toISOString()
        };
        await db.collection('committeeMembers').doc(member.id).set(member);
        return res.json({ success: true, member });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/committee-members/:id', async (req, res) => {
    try {
        const docRef = db.collection('committeeMembers').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Member not found.' });
        const body = req.body;
        const update = { updatedAt: new Date().toISOString() };
        if (body.name       !== undefined) update.name       = String(body.name).trim();
        if (body.memberId   !== undefined) update.memberId   = String(body.memberId).trim();
        if (body.phone      !== undefined) update.phone      = String(body.phone).trim();
        if (body.whatsapp   !== undefined) update.whatsapp   = String(body.whatsapp).trim();
        if (body.department !== undefined) update.department = String(body.department).trim();
        if (body.role       !== undefined) update.role       = String(body.role).trim();
        if (body.sequence   !== undefined) update.sequence   = body.sequence !== '' && body.sequence !== null ? Number(body.sequence) : null;
        if (body.photoFile  !== undefined) { update.photoFile = body.photoFile||null; update.photoUrl = body.photoUrl||null; }
        await docRef.update(update);
        return res.json({ success: true, member: (await docRef.get()).data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/committee-members/:id', async (req, res) => {
    try {
        const docRef = db.collection('committeeMembers').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Member not found.' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 13 — VOLUNTEER CARDS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/volunteer-cards', async (req, res) => {
    try {
        const snap  = await db.collection('volunteerCards').get();
        const cards = snap.docs.map(d => d.data()).sort((a,b) => {
            const sa = (a.sequence != null && a.sequence !== '') ? Number(a.sequence) : 999999;
            const sb = (b.sequence != null && b.sequence !== '') ? Number(b.sequence) : 999999;
            return sa - sb;
        });
        return res.json({ cards });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/volunteer-cards', async (req, res) => {
    try {
        const { name, position, phone, sequence } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: 'Volunteer name is required.' });
        const card = {
            id: `VC-${Date.now()}`, name: name.trim(),
            position: (position||'').trim(), phone: (phone||'').trim(),
            sequence: sequence !== undefined && sequence !== '' ? Number(sequence) : null,
            photoFile: null, photoUrl: null, createdAt: new Date().toISOString()
        };
        await db.collection('volunteerCards').doc(card.id).set(card);
        return res.json({ success: true, card });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/volunteer-cards/:id', async (req, res) => {
    try {
        const docRef = db.collection('volunteerCards').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Volunteer card not found.' });
        const body   = req.body;
        const update = { updatedAt: new Date().toISOString() };
        if (body.name     !== undefined) update.name     = String(body.name).trim();
        if (body.position !== undefined) update.position = String(body.position).trim();
        if (body.phone    !== undefined) update.phone    = String(body.phone).trim();
        if (body.sequence !== undefined) update.sequence = body.sequence !== '' && body.sequence !== null ? Number(body.sequence) : null;
        if (body.photoFile !== undefined) { update.photoFile = body.photoFile||null; update.photoUrl = body.photoUrl||null; }
        await docRef.update(update);
        return res.json({ success: true, card: (await docRef.get()).data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/volunteer-cards/:id', async (req, res) => {
    try {
        const docRef = db.collection('volunteerCards').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Volunteer card not found.' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 14 — GALLERY
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/gallery', async (req, res) => {
    try {
        const snap   = await db.collection('gallery').get();
        const photos = snap.docs.map(d => d.data()).sort((a,b) => {
            const sa = (a.sequence != null && a.sequence !== '') ? Number(a.sequence) : 999999;
            const sb = (b.sequence != null && b.sequence !== '') ? Number(b.sequence) : 999999;
            return sa - sb;
        });
        return res.json({ photos });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/gallery', async (req, res) => {
    try {
        const settings = await getSettings();
        const parts    = await parseMultipart(req);
        const filePart = parts.find(p => p.name === 'photo' && p.filename);
        if (!filePart) return res.status(400).json({ message: 'No photo received.' });
        const description = getPartValue(parts, 'description') || '';
        const sequence    = getPartValue(parts, 'sequence') || '';
        const safeName    = filePart.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
        const uniqueName  = `gallery_${Date.now()}_${safeName}`;
        const photoUrl    = await uploadToCloudinary(filePart.data, uniqueName, settings);
        if (!photoUrl) return res.status(500).json({ message: 'Failed to upload photo to Cloudinary.' });
        const photo = {
            id: `GAL-${Date.now()}`, description, sequence,
            photoFile: uniqueName, photoUrl, createdAt: new Date().toISOString()
        };
        await db.collection('gallery').doc(photo.id).set(photo);
        await broadcastLiveEvent('gallery_updated');
        return res.json({ success: true, photo });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.put('/api/gallery/:id', async (req, res) => {
    try {
        const docRef = db.collection('gallery').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Photo not found.' });
        const update = { updatedAt: new Date().toISOString() };
        if (req.body.description !== undefined) update.description = String(req.body.description).trim();
        if (req.body.sequence    !== undefined) update.sequence    = String(req.body.sequence).trim();
        await docRef.update(update);
        await broadcastLiveEvent('gallery_updated');
        return res.json({ success: true, photo: (await docRef.get()).data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/gallery/:id', async (req, res) => {
    try {
        const docRef = db.collection('gallery').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Photo not found.' });
        await docRef.delete();
        await broadcastLiveEvent('gallery_updated');
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 15 — AWAL
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/awal', async (req, res) => {
    try {
        const snap  = await db.collection('awal').get();
        const awals = snap.docs.map(d => d.data()).sort((a,b) => (a.order||0) - (b.order||0));
        return res.json({ awals });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/awal', async (req, res) => {
    try {
        const data     = req.body;
        const settings = await getSettings();
        const snap     = await db.collection('awal').get();
        const maxOrder = snap.empty ? 0 : Math.max(...snap.docs.map(d => d.data().order || 0));
        const awal = { id: Date.now().toString(), description: data.description || '', active: data.active !== false, order: maxOrder + 1, photoUrl: null };
        if (data.photoBase64 && data.photoExt) {
            const filename = `awal_${awal.id}.${data.photoExt}`;
            const buf      = Buffer.from(data.photoBase64, 'base64');
            const url      = await uploadToCloudinary(buf, filename, settings);
            awal.photoUrl  = url || null;
        }
        await db.collection('awal').doc(awal.id).set(awal);
        await broadcastLiveEvent('awal_updated');
        return res.json({ success: true, awal });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.put('/api/awal/:id', async (req, res) => {
    try {
        const docRef = db.collection('awal').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Awal photo not found.' });
        const data   = req.body;
        const settings = await getSettings();
        const update = {};
        if (data.description !== undefined) update.description = data.description;
        if (data.active      !== undefined) update.active      = data.active;
        if (data.order       !== undefined) update.order       = parseInt(data.order, 10);
        if (data.photoBase64 && data.photoExt) {
            const a        = snap.data();
            const filename = `awal_${a.id}_${Date.now()}.${data.photoExt}`;
            const buf      = Buffer.from(data.photoBase64, 'base64');
            const url      = await uploadToCloudinary(buf, filename, settings);
            update.photoUrl = url || a.photoUrl;
        }
        await docRef.update(update);
        await broadcastLiveEvent('awal_updated');
        return res.json({ success: true, awal: (await docRef.get()).data() });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.delete('/api/awal/:id', async (req, res) => {
    try {
        const docRef = db.collection('awal').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Not found.' });
        await docRef.delete();
        await broadcastLiveEvent('awal_updated');
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 16 — SPONSORS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/sponsors', async (req, res) => {
    try {
        const snap     = await db.collection('sponsors').get();
        const sponsors = snap.docs.map(d => d.data()).sort((a,b) => (a.order||0) - (b.order||0));
        return res.json({ sponsors });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/sponsors', async (req, res) => {
    try {
        const { name, tagline, description, websiteUrl, photoBase64, photoExt, bannerBase64, bannerExt, active } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: 'Sponsor name is required.' });
        let photoUrl = null, bannerUrl = null;
        if (photoBase64) {
            const pExt = (photoExt||'jpg').replace(/[^a-zA-Z0-9]/g,'');
            const mime = pExt === 'png' ? 'image/png' : (pExt === 'gif' ? 'image/gif' : 'image/jpeg');
            photoUrl   = `data:${mime};base64,${photoBase64}`;
        }
        if (bannerBase64) {
            const bExt = (bannerExt||'jpg').replace(/[^a-zA-Z0-9]/g,'');
            const mime = bExt === 'png' ? 'image/png' : (bExt === 'gif' ? 'image/gif' : 'image/jpeg');
            bannerUrl  = `data:${mime};base64,${bannerBase64}`;
        }
        const snap     = await db.collection('sponsors').get();
        const maxOrder = snap.empty ? 0 : Math.max(...snap.docs.map(d => d.data().order||0));
        const sponsor  = {
            id: `SPO-${Date.now()}`, name: String(name).trim(),
            tagline: tagline ? String(tagline).trim() : '',
            description: description ? String(description).trim() : '',
            websiteUrl: websiteUrl ? String(websiteUrl).trim() : '',
            photoUrl, bannerUrl, order: maxOrder + 1,
            active: active !== false, createdAt: new Date().toISOString()
        };
        await db.collection('sponsors').doc(sponsor.id).set(sponsor);
        await broadcastLiveEvent('sponsors_updated');
        return res.json({ success: true, sponsor });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/sponsors/:id', async (req, res) => {
    try {
        const docRef = db.collection('sponsors').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Sponsor not found.' });
        const body   = req.body;
        const update = { updatedAt: new Date().toISOString() };
        if (body.name        !== undefined) update.name        = String(body.name).trim();
        if (body.tagline     !== undefined) update.tagline     = String(body.tagline).trim();
        if (body.description !== undefined) update.description = String(body.description).trim();
        if (body.websiteUrl  !== undefined) update.websiteUrl  = String(body.websiteUrl).trim();
        if (body.active      !== undefined) update.active      = body.active !== false && body.active !== 'false';
        if (body.order       !== undefined) update.order       = Number(body.order);
        if (body.photoBase64) {
            const pExt = (body.photoExt||'jpg').replace(/[^a-zA-Z0-9]/g,'');
            const mime = pExt === 'png' ? 'image/png' : (pExt === 'gif' ? 'image/gif' : 'image/jpeg');
            update.photoUrl = `data:${mime};base64,${body.photoBase64}`;
        }
        if (body.bannerBase64) {
            const bExt = (body.bannerExt||'jpg').replace(/[^a-zA-Z0-9]/g,'');
            const mime = bExt === 'png' ? 'image/png' : (bExt === 'gif' ? 'image/gif' : 'image/jpeg');
            update.bannerUrl = `data:${mime};base64,${body.bannerBase64}`;
        }
        await docRef.update(update);
        await broadcastLiveEvent('sponsors_updated');
        return res.json({ success: true, sponsor: (await docRef.get()).data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/sponsors/:id', async (req, res) => {
    try {
        const docRef = db.collection('sponsors').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Sponsor not found.' });
        await docRef.delete();
        await broadcastLiveEvent('sponsors_updated');
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 17 — EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/events', async (req, res) => {
    try {
        const snap   = await db.collection('events').get();
        const events = snap.docs.map(d => d.data());
        return res.json({ events });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/events', async (req, res) => {
    try {
        const { title, date, time, location, description } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ message: 'Event title is required.' });
        if (!date  || !date.trim())  return res.status(400).json({ message: 'Event date is required.' });
        const event = {
            id: `EVT-${Date.now()}`, title: title.trim(), date: date.trim(),
            time: (time||'').trim(), location: (location||'').trim(),
            description: (description||'').trim(), createdAt: new Date().toISOString()
        };
        await db.collection('events').doc(event.id).set(event);
        await broadcastLiveEvent('events_updated');
        return res.json({ success: true, event });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.put('/api/events/:id', async (req, res) => {
    try {
        const docRef = db.collection('events').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Event not found.' });
        const body   = req.body;
        const update = { updatedAt: new Date().toISOString() };
        if (body.title       !== undefined) update.title       = String(body.title).trim();
        if (body.date        !== undefined) update.date        = String(body.date).trim();
        if (body.time        !== undefined) update.time        = String(body.time).trim();
        if (body.location    !== undefined) update.location    = String(body.location).trim();
        if (body.description !== undefined) update.description = String(body.description).trim();
        await docRef.update(update);
        await broadcastLiveEvent('events_updated');
        return res.json({ success: true, event: (await docRef.get()).data() });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        const docRef = db.collection('events').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Event not found.' });
        await docRef.delete();
        await broadcastLiveEvent('events_updated');
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 18 — NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/notifications', async (req, res) => {
    try {
        const { username: MASTER_USER } = getMasterCreds();
        const snap = await db.collection('notifications')
            .orderBy('timestamp', 'desc').limit(50).get();
        const notifs = snap.docs.map(d => d.data())
            .filter(n => !n.isMaster &&
                !new RegExp(`(${MASTER_USER}|Master Control|mastercontrol|__master__)`, 'i').test(n.message || ''));
        return res.json({ notifications: notifs });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/notifications/login', async (req, res) => {
    try {
        const body = req.body;
        const { username: MASTER_USER } = getMasterCreds();
        if (body.isMaster === true || body.id === '__master__' ||
            (body.username && body.username === MASTER_USER)) {
            return res.json({ success: true, suppressed: true });
        }
        const name = body.name || 'Unknown';
        const role = body.role || 'volunteer';
        await db.collection('notifications').add({
            message: `${name} (${role}) logged in.`,
            timestamp: new Date().toISOString(),
            type: 'login'
        });
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/notifications/test', async (req, res) => {
    try {
        await db.collection('notifications').add({
            message: 'Test notification inserted successfully.',
            timestamp: new Date().toISOString(), type: 'test'
        });
        return res.json({ success: true, message: 'Test notification written.' });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 19 — QR CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/qr-config', async (req, res) => {
    try {
        const snap = await db.collection('qrConfig').doc('global').get();
        return res.json(snap.exists ? snap.data() : {});
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/qr-config', async (req, res) => {
    try {
        const { mapsUrl = '', placeId = '', reviewTemplates = [] } = req.body;
        await db.collection('qrConfig').doc('global').set({ mapsUrl, placeId, reviewTemplates, updatedAt: new Date().toISOString() });
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 20 — CONTRIBUTORS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/contributors', async (req, res) => {
    try {
        const snap = await db.collection('contributors').get();
        return res.json({ contributors: snap.docs.map(d => d.data()) });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/contributors', async (req, res) => {
    try {
        const { name, amount, date, note } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: 'Contributor name is required.' });
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ message: 'A positive contribution amount is required.' });
        if (!date) return res.status(400).json({ message: 'Contribution date is required.' });
        const entry = {
            id: `CONT-${Date.now()}`, name: name.trim(),
            amount: Number(amount), date,
            note: (note||'').trim(), createdAt: new Date().toISOString()
        };
        await db.collection('contributors').doc(entry.id).set(entry);
        return res.json({ success: true, entry });
    } catch (e) { return res.status(400).json({ message: e.message }); }
});

app.delete('/api/contributors/:id', async (req, res) => {
    try {
        const docRef = db.collection('contributors').doc(req.params.id);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(404).json({ message: 'Contributor entry not found.' });
        await docRef.delete();
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.put('/api/contributors-bulk', async (req, res) => {
    try {
        const { originalName, newName, monthlyAmounts } = req.body;
        if (!originalName || !originalName.trim()) return res.status(400).json({ message: 'Original name is required.' });
        const finalName = (newName || originalName).trim();
        if (!finalName) return res.status(400).json({ message: 'Contributor name cannot be empty.' });

        // Delete existing records for originalName
        const snap = await db.collection('contributors').where('name', '==', originalName.trim()).get();
        if (!snap.empty) {
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }

        // Insert new records
        const now  = new Date();
        const year = now.getFullYear();
        const inserts = [];
        for (let i = 1; i <= 12; i++) {
            const monthKey = `${year}-${String(i).padStart(2,'0')}`;
            const amt = Number((monthlyAmounts || {})[String(i).padStart(2,'0')] || 0);
            if (amt > 0) inserts.push({ id: `CONT-${Date.now()}-${i}`, name: finalName, amount: amt, date: `${monthKey}-01`, note: '', createdAt: new Date().toISOString() });
        }
        if (inserts.length > 0) {
            await batchSet(inserts.map(r => ({ ref: db.collection('contributors').doc(r.id), data: r })));
        }
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 21 — DEVELOPERS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/developers', async (req, res) => {
    try {
        const settings = await getSettings();
        return res.json({
            developers: settings.developers || [],
            developerMessage: settings.developerMessage || '',
            footerDeveloper: settings.footerDeveloper || null
        });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/developers/message', async (req, res) => {
    try {
        const { message } = req.body;
        const settings = await getSettings();
        settings.developerMessage = message || '';
        await saveSettings(settings);
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/developers/footer', async (req, res) => {
    try {
        const settings = await getSettings();
        const ct  = req.headers['content-type'] || '';
        let fDev  = settings.footerDeveloper || {};
        if (ct.includes('multipart/form-data')) {
            const parts = await parseMultipart(req);
            parts.filter(p => !p.filename && p.name).forEach(p => { fDev[p.name] = p.data.toString('utf8').trim(); });
            const photoPart = parts.find(p => p.filename && p.name === 'photo');
            if (photoPart) {
                const safeName   = photoPart.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
                const uniqueName = `footer_dev_${Date.now()}_${safeName}`;
                const url = await uploadToCloudinary(photoPart.data, uniqueName, settings);
                if (url) fDev.photoUrl = url;
                else {
                    const mime = photoPart.filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                    fDev.photoUrl = `data:${mime};base64,${photoPart.data.toString('base64')}`;
                }
            }
        } else { return res.status(400).json({ message: 'Invalid content type' }); }
        settings.footerDeveloper = fDev;
        await saveSettings(settings);
        return res.json({ success: true, footerDeveloper: fDev });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/developers', async (req, res) => {
    try {
        const settings = await getSettings();
        const ct       = req.headers['content-type'] || '';
        let devData    = {};
        let photoUrl   = null;
        if (ct.includes('multipart/form-data')) {
            const parts = await parseMultipart(req);
            parts.filter(p => !p.filename && p.name).forEach(p => { devData[p.name] = p.data.toString('utf8').trim(); });
            const photoPart = parts.find(p => p.filename && (p.name === 'photo' || p.name === 'devPhoto'));
            if (photoPart) {
                const safeName   = photoPart.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
                const uniqueName = `dev_${Date.now()}_${safeName}`;
                photoUrl = await uploadToCloudinary(photoPart.data, uniqueName, settings) || '';
            }
        } else { devData = req.body; }
        const { name, bio, whatsapp, id } = devData;
        if (!name) return res.status(400).json({ message: 'Developer name is required.' });
        if (!settings.developers) settings.developers = [];
        if (id) {
            const idx = settings.developers.findIndex(d => d.id === id);
            if (idx >= 0) {
                settings.developers[idx] = { ...settings.developers[idx], name: name || settings.developers[idx].name,
                    bio: bio !== undefined ? bio : settings.developers[idx].bio,
                    whatsapp: whatsapp !== undefined ? whatsapp : settings.developers[idx].whatsapp,
                    ...(photoUrl ? { photoUrl } : {}), updatedAt: new Date().toISOString() };
            } else { return res.status(404).json({ message: 'Developer not found.' }); }
        } else {
            settings.developers.push({ id: `DEV-${Date.now()}`, name, bio: bio||'', whatsapp: whatsapp||'', photoUrl: photoUrl||'', createdAt: new Date().toISOString() });
        }
        await saveSettings(settings);
        return res.json({ success: true, developers: settings.developers });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.delete('/api/developers/:id', async (req, res) => {
    try {
        const devId    = decodeURIComponent(req.params.id);
        const settings = await getSettings();
        if (!settings.developers) settings.developers = [];
        const prevLen = settings.developers.length;
        settings.developers = settings.developers.filter(d => d.id !== devId);
        if (settings.developers.length === prevLen) return res.status(404).json({ message: 'Developer not found.' });
        await saveSettings(settings);
        return res.json({ success: true, developers: settings.developers });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 22 — PHOTO UPLOADS
// ═══════════════════════════════════════════════════════════════════════════════

async function handlePhotoUpload(req, res, opts) {
    try {
        const settings = await getSettings();
        const parts    = await parseMultipart(req);
        const filePart = parts.find(p => p.filename && p.data);
        if (!filePart) return res.status(400).json({ message: 'No file uploaded.' });
        const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
        const uniqueName = `${opts.prefix}_${Date.now()}_${safeName}`;
        const url        = await uploadToCloudinary(filePart.data, uniqueName, settings);
        if (!url) return res.status(500).json({ message: 'Cloudinary upload failed. Please configure credentials.' });
        if (opts.onSuccess) await opts.onSuccess(url, parts, settings);
        return res.json({ success: true, url, ...(opts.extra || {}) });
    } catch (e) { return res.status(500).json({ message: 'Upload error: ' + e.message }); }
}

app.post('/api/upload-passbook', async (req, res) => {
    try {
        const settings = await getSettings();
        const parts    = await parseMultipart(req);
        const filePart = parts.find(p => p.name === 'passbook' && p.filename);
        if (!filePart)  return res.status(400).json({ message: 'No file received.' });
        if (filePart.data.length > 5 * 1024 * 1024) return res.status(400).json({ message: 'File exceeds 5 MB limit.' });
        const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
        const uniqueName = `passbook_${Date.now()}_${safeName}`;
        const fileUrl    = await uploadToCloudinary(filePart.data, uniqueName, settings);
        if (!fileUrl)    return res.status(500).json({ message: 'Upload failed. Please configure Cloudinary.' });

        const receiptIdPart = getPartValue(parts, 'receiptId');
        const entryIdPart   = getPartValue(parts, 'entryId');
        const bookIdPart    = getPartValue(parts, 'bookId');
        const slipNumPart   = getPartValue(parts, 'slipNum');
        let linkedReceiptId = null;

        if (receiptIdPart) {
            const rRef = db.collection('receipts').doc(receiptIdPart);
            const rSnap = await rRef.get();
            if (rSnap.exists) { await rRef.update({ passbookFile: uniqueName, passbookUrl: fileUrl, updatedAt: new Date().toISOString() }); linkedReceiptId = receiptIdPart; }
        }
        if (entryIdPart) {
            const eRef = db.collection('donationEntries').doc(entryIdPart);
            const eSnap = await eRef.get();
            if (eSnap.exists) { await eRef.update({ photoFile: uniqueName, photoUrl: fileUrl, updatedAt: new Date().toISOString() }); }
        }
        if (bookIdPart && slipNumPart) {
            const bRef  = db.collection('pautiBooks').doc(bookIdPart);
            const bSnap = await bRef.get();
            if (bSnap.exists) {
                const slips = bSnap.data().slips || [];
                const sIdx  = slips.findIndex(s => s.slipNumber === Number(slipNumPart));
                if (sIdx !== -1) { slips[sIdx].photoFile = uniqueName; slips[sIdx].photoUrl = fileUrl; await bRef.update({ slips }); }
            }
        }
        return res.json({ success: true, fileName: uniqueName, size: filePart.data.length, linkedReceiptId, message: 'File uploaded successfully.' });
    } catch (e) { return res.status(500).json({ message: 'Upload error: ' + e.message }); }
});

app.post('/api/upload-receipt-preview', async (req, res) => {
    try {
        const settings = await getSettings();
        const parts    = await parseMultipart(req);
        const filePart = parts.find(p => p.name === 'receiptImage' && p.filename);
        const entryId  = getPartValue(parts, 'entryId');
        if (!filePart || !entryId) return res.status(400).json({ message: 'Missing receiptImage or entryId.' });
        const eRef  = db.collection('donationEntries').doc(entryId);
        const eSnap = await eRef.get();
        if (!eSnap.exists) return res.status(404).json({ message: 'Entry not found.' });
        const uniqueName = `preview_${Date.now()}_${entryId}.png`;
        const fileUrl    = await uploadToCloudinary(filePart.data, uniqueName, settings);
        if (fileUrl) { await eRef.update({ receiptPreviewFile: uniqueName, receiptPreviewUrl: fileUrl, updatedAt: new Date().toISOString() }); }
        return res.json({ success: true, fileUrl });
    } catch (e) { return res.status(500).json({ message: 'Upload failed: ' + e.message }); }
});

app.post('/api/upload-committee-photo', async (req, res) => {
    try {
        const settings = await getSettings();
        const parts    = await parseMultipart(req);
        const filePart = parts.find(p => p.name === 'photo' && p.filename);
        if (!filePart) return res.status(400).json({ message: 'No photo received.' });
        if (filePart.data.length > 5 * 1024 * 1024) return res.status(400).json({ message: 'File exceeds 5 MB.' });
        const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
        const uniqueName = `cm_${Date.now()}_${safeName}`;
        const url        = await uploadToCloudinary(filePart.data, uniqueName, settings);
        const ext  = safeName.toLowerCase().split('.').pop();
        const mime = ext === 'png' ? 'image/png' : (ext === 'gif' ? 'image/gif' : 'image/jpeg');
        const finalUrl = url || `data:${mime};base64,${filePart.data.toString('base64')}`;
        const memberId = getPartValue(parts, 'memberId');
        if (memberId) {
            const mRef  = db.collection('committeeMembers').doc(memberId);
            const mSnap = await mRef.get();
            if (mSnap.exists) await mRef.update({ photoFile: uniqueName, photoUrl: finalUrl, updatedAt: new Date().toISOString() });
        }
        return res.json({ success: true, fileName: uniqueName });
    } catch (e) { return res.status(500).json({ message: 'Upload error: ' + e.message }); }
});

app.post('/api/upload-volunteer-photo', async (req, res) => {
    try {
        const settings = await getSettings();
        const parts    = await parseMultipart(req);
        const filePart = parts.find(p => p.name === 'photo' && p.filename);
        if (!filePart) return res.status(400).json({ message: 'No photo received.' });
        if (filePart.data.length > 5 * 1024 * 1024) return res.status(400).json({ message: 'File exceeds 5 MB.' });
        const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
        const uniqueName = `vc_${Date.now()}_${safeName}`;
        const url        = await uploadToCloudinary(filePart.data, uniqueName, settings);
        const ext  = safeName.toLowerCase().split('.').pop();
        const mime = ext === 'png' ? 'image/png' : (ext === 'gif' ? 'image/gif' : 'image/jpeg');
        const finalUrl = url || `data:${mime};base64,${filePart.data.toString('base64')}`;
        const cardId = getPartValue(parts, 'volunteerId');
        if (cardId) {
            const vRef  = db.collection('volunteerCards').doc(cardId);
            const vSnap = await vRef.get();
            if (vSnap.exists) await vRef.update({ photoFile: uniqueName, photoUrl: finalUrl, updatedAt: new Date().toISOString() });
        }
        return res.json({ success: true, fileName: uniqueName });
    } catch (e) { return res.status(500).json({ message: 'Upload error: ' + e.message }); }
});

app.post('/api/banner', async (req, res) => {
    await handlePhotoUpload(req, res, {
        prefix: 'banner',
        onSuccess: async (url) => {
            const settings = await getSettings();
            settings.dashboardBanner = url;
            await saveSettings(settings);
            await broadcastLiveEvent('events_updated', { timestamp: Date.now() });
        }
    });
});

app.delete('/api/banner', async (req, res) => {
    try {
        const settings = await getSettings();
        settings.dashboardBanner = null;
        await saveSettings(settings);
        await broadcastLiveEvent('events_updated', { timestamp: Date.now() });
        return res.json({ success: true });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/about-photo', async (req, res) => {
    await handlePhotoUpload(req, res, {
        prefix: 'about',
        onSuccess: async (url) => {
            const settings = await getSettings();
            settings.aboutPhoto = url;
            await saveSettings(settings);
        }
    });
});

app.post('/api/about-page-photo', async (req, res) => {
    await handlePhotoUpload(req, res, {
        prefix: 'aboutpage',
        onSuccess: async (url) => {
            const settings = await getSettings();
            settings.aboutPagePhoto = url;
            await saveSettings(settings);
        }
    });
});

app.post('/api/tshirt-showcase-photo', async (req, res) => {
    try {
        const settings = await getSettings();
        const parts    = await parseMultipart(req);
        const filePart = parts.find(p => p.filename && p.data);
        if (!filePart) return res.status(400).json({ message: 'No file uploaded.' });
        const slotStr  = getPartValue(parts, 'slot') || '0';
        const slot     = parseInt(slotStr, 10);
        if (slot < 0 || slot > 3) return res.status(400).json({ message: 'Invalid slot (must be 0-3).' });
        const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
        const uniqueName = `tshirt_${slot}_${Date.now()}_${safeName}`;
        const url        = await uploadToCloudinary(filePart.data, uniqueName, settings);
        if (!url) return res.status(500).json({ message: 'Cloudinary upload failed.' });
        if (!settings.tshirtPhotos) settings.tshirtPhotos = [null,null,null,null];
        settings.tshirtPhotos[slot] = url;
        await saveSettings(settings);
        await broadcastLiveEvent('settings_updated', { timestamp: Date.now() });
        return res.json({ success: true, url, slot });
    } catch (e) { return res.status(500).json({ message: 'Upload error: ' + e.message }); }
});

app.delete('/api/tshirt-showcase-photo/:slot', async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        if (isNaN(slot) || slot < 0 || slot > 3) return res.status(400).json({ message: 'Invalid slot.' });
        const settings = await getSettings();
        if (!settings.tshirtPhotos) settings.tshirtPhotos = [null,null,null,null];
        settings.tshirtPhotos[slot] = null;
        await saveSettings(settings);
        await broadcastLiveEvent('settings_updated', { timestamp: Date.now() });
        return res.json({ success: true, slot });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

app.post('/api/upload-image', async (req, res) => {
    await handlePhotoUpload(req, res, { prefix: 'img' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 23 — TRANSLATION
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/translate', async (req, res) => {
    try {
        if (!Array.isArray(req.body.strings)) return res.status(400).json({ message: 'Payload must contain a strings array' });
        const result    = [];
        const delay     = ms => new Promise(r => setTimeout(r, ms));
        const chunkSize = 100;
        for (let i = 0; i < req.body.strings.length; i += chunkSize) {
            const chunk = req.body.strings.slice(i, i + chunkSize);
            try {
                const translated = await translate(chunk, { to: 'mr' });
                result.push(...(Array.isArray(translated) ? translated : chunk));
            } catch (_) { result.push(...chunk); }
            if (i + chunkSize < req.body.strings.length) await delay(1000);
        }
        while (result.length < req.body.strings.length) result.push(req.body.strings[result.length]);
        return res.json({ success: true, translated: result });
    } catch (e) { return res.status(500).json({ message: 'Translation failed', error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 24 — LIVE UPDATES (SSE compatibility endpoint)
//  Real-time updates are provided via Firestore _liveUpdates collection.
//  firebase-realtime.js intercepts EventSource on the client side.
//  This endpoint exists for backwards compatibility only.
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/live-updates', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write('data: {"type":"connected"}\n\n');
    // Close immediately — real updates come from Firestore via firebase-realtime.js
    res.end();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 25 — UPLOADS (list)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/uploads', async (req, res) => {
    // In Firestore/Cloudinary architecture, uploads are tracked per-document.
    // Return an empty list for backwards compatibility.
    return res.json({ files: [] });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

exports.api = onRequest({
    cors: true,
    timeoutSeconds: 300,
    memory: '512MiB',
    region: 'us-central1'
}, app);
