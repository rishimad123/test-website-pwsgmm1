const fs = require('fs');
let js = fs.readFileSync('admin.js', 'utf8');

const newFunc = `async function loadBrReceivedBreakdown() {
    const totalEl   = document.getElementById('brReceivedTotal');
    const countEl   = document.getElementById('brReceivedSlipCount');
    const tbodyEl   = document.getElementById('brReceivedBreakdownTbody');
    if (!tbodyEl) return;
    tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px;">Loading&hellip;</td></tr>';
    try {
        // Fetch all receipts and donation entries to find "Received" slips
        const [pbRes, rcRes, deRes] = await Promise.all([
            fetch('/api/pauti-books').catch(()=>({json:()=>({pautiBooks:[]})})),
            fetch('/api/receipts').catch(()=>({json:()=>({receipts:[]})})),
            fetch('/api/donation-entries').catch(()=>({json:()=>({entries:[]})}))
        ]);
        const pbData = await pbRes.json();
        const rcData = await rcRes.json();
        const deData = await deRes.json();

        const allSlips = [];
        
        // Pauti Slips
        (pbData.pautiBooks || []).forEach(book => {
            (book.slips || []).forEach(slip => {
                if (slip.uploadedAt && !slip.deleted && (slip.status||'').toLowerCase() === 'received' && slip.paymentMode !== 'balance' && slip.amount && Number(slip.amount) > 0) {
                    allSlips.push({
                        receiptId  : \`SLIP-\${slip.slipNumber}\`,
                        name       : slip.donorName || '—',
                        amount     : slip.amount || 0,
                        passbookUrl: slip.photoUrl || null,
                        status     : slip.status || 'received',
                        type       : 'pauti-slip',
                        paymentMode: slip.paymentMode || 'cash',
                        _slipNum   : slip.slipNumber,
                        _bookId    : book.pautiBookId,
                        bookNumber : book.bookNumber,
                        receiptNumber: slip.slipNumber
                    });
                }
            });
        });

        // Regular Receipts
        (rcData.receipts || []).forEach(r => {
            if (!r.deleted && (r.status||'').toLowerCase() === 'received' && r.type !== 'balance') {
                allSlips.push({
                    ...r,
                    receiptNumber: r.receiptNumber,
                    bookNumber: r.bookNumber
                });
            }
        });

        // Donation Entries
        (deData.entries || []).forEach(e => {
            if (!e.deleted && (e.status||'').toLowerCase() === 'received' && (e.paymentMode||'').toLowerCase() !== 'balance') {
                const donor = e.donorType === 'Business' ? (e.businessName || '—') : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
                allSlips.push({
                    receiptId  : e.entryId || ('DE-' + e.receiptNumber),
                    name       : donor,
                    amount     : e.amount || 0,
                    passbookUrl: e.photoUrl || null,
                    status     : e.status || 'received',
                    type       : 'donation-entry',
                    paymentMode: e.paymentMode,
                    _bookNum   : e.bookNumber,
                    _recNum    : e.receiptNumber,
                    bookNumber : e.bookNumber,
                    receiptNumber: e.receiptNumber
                });
            }
        });

        // Sort by Book Number then Receipt Number
        allSlips.sort((a, b) => {
            if (a.bookNumber !== b.bookNumber) return (a.bookNumber || 0) - (b.bookNumber || 0);
            return (a.receiptNumber || 0) - (b.receiptNumber || 0);
        });

        const total = allSlips.reduce((s, x) => s + Number(x.amount), 0);
        const fmt   = n => '₹' + Number(n).toLocaleString('en-IN');
        if (totalEl) totalEl.textContent = fmt(total);
        if (countEl) countEl.textContent = allSlips.length;

        if (allSlips.length === 0) {
            tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px;">No received slips found.</td></tr>';
            return;
        }

        window._brHistoryStore = window._brHistoryStore || {};

        tbodyEl.innerHTML = allSlips.map(r => {
            const safeId   = (r.receiptId||'').replace(/'/g, "\\\\'");
            const safeName = (r.name || '').replace(/'/g, "\\\\'");
            const safePhoto = (r.passbookUrl||'').replace(/'/g,"\\\\'");
            const editBtn = \`<button class="btn-icon btn-edit" title="Edit Entry" onclick="openBrEditModal('\${safeId}','\${safeName}',\${r.amount||0},'\${r.paymentMode||'cash'}','\${r.status||'received'}',\${r.bookNumber||r._bookNum||0},\${r.receiptNumber||r._recNum||r._slipNum||0},'\${safePhoto}','\${r.type}','\${r._bookId||''}')"><i class="fas fa-edit"></i></button>\`;
            const delBtn = \`<button class="btn-icon btn-delete" title="Delete" onclick="softDeleteReceipt('\${safeId}','\${safeName}')"><i class="fas fa-trash"></i></button>\`;
            
            return \`<tr>
                <td>\${r.bookNumber || '—'}</td>
                <td>\${r.receiptNumber || '—'}</td>
                <td><strong style="color:#1B5E20;">\${fmt(r.amount)}</strong></td>
                <td><div class="action-btns">\${editBtn}\${delBtn}</div></td>
            </tr>\`;
        }).join('');
    } catch (e) {
        console.error(e);
        if (tbodyEl) tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#c0392b;padding:20px;">⚠ Cannot reach server.</td></tr>';
    }
}
`;

const startIdx = js.indexOf('async function loadBrReceivedBreakdown() {');
if(startIdx !== -1) {
    const endIdx = js.indexOf('function saveBrOverride() {', startIdx);
    if(endIdx !== -1) {
        js = js.substring(0, startIdx) + newFunc + js.substring(endIdx);
        fs.writeFileSync('admin.js', js, 'utf8');
        console.log('Successfully updated loadBrReceivedBreakdown in admin.js');
    } else {
        console.log('Could not find end of loadBrReceivedBreakdown');
    }
} else {
    console.log('Could not find loadBrReceivedBreakdown function');
}
