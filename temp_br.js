CE RECOVERY MODULE
// =====================================================================
async function loadBalanceRecovery() {
    const tbody = document.getElementById('balRecTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:24px;">Loading…</td></tr>';
    try {
        // Merge: Pauti slips (mode=balance or no amount) + balance-type receipts + donation entries with Balance mode
        const [pbRes, rcRes, deRes] = await Promise.all([
            fetch('/api/pauti-books'),
            fetch('/api/receipts'),
            fetch('/api/donation-entries')
        ]);
        const pbData = await pbRes.json();
        const rcData = await rcRes.json();
        const deData = await deRes.json();

        // Pauti slips with payment mode = balance (these are pending collections)
        const pautiPending = [];
        (pbData.pautiBooks || []).forEach(book => {
            (book.slips || []).forEach(slip => {
                if (!slip.deleted && slip.uploadedAt &&
                    (slip.paymentMode === 'balance' || !slip.amount || Number(slip.amount) <= 0)) {
                    pautiPending.push({
                        receiptId  : `SLIP-${slip.slipNumber}`,
                        name       : slip.donorName || '—',
                        amount     : slip.amount || 0,
                        passbookUrl: slip.photoUrl || null,
                        userId     : slip.uploadedBy || '—',
                        submittedAt: slip.uploadedAt,
                        status     : slip.status || 'pending',
                        type       : 'pauti-slip',
                        paymentMode: slip.paymentMode || 'balance',
                        _slipNum   : slip.slipNumber,
                        _bookId    : book.pautiBookId,
                    });
                }
            });
        });

        // Regular balance receipts
        const receiptBal = (rcData.receipts || []).filter(r => r.type === 'balance' && !r.deleted);

        // Donation entries with paymentMode = 'Balance' (from any volunteer or admin)
        const deBal = (deData.entries || []).filter(e =>
            e.paymentMode && e.paymentMode.toLowerCase() === 'balance' && !e.deleted
        ).map(e => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '—')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
            return {
                receiptId  : e.entryId || ('DE-' + e.receiptNumber),
                name       : donor,
                amount     : e.amount || 0,
                passbookUrl: e.photoUrl || null,
                userId     : e.submittedBy || '—',
                submittedAt: e.submittedAt || new Date().toISOString(),
                status     : e.status || 'pending',
                type       : 'donation-entry',
                paymentMode: e.paymentMode,
                _bookNum   : e.bookNumber,
                _recNum    : e.receiptNumber,
                editHistory: e.editHistory || [],
                nameHistory: e.nameHistory || []
            };
        });
        
        window._brHistoryStore = {};

        const list = [...pautiPending, ...receiptBal, ...deBal].sort((a, b) =>
            new Date(b.submittedAt) - new Date(a.submittedAt));

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:30px;">No pending balance slips found. All slips have amounts recorded.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(r => {
            const dt = new Date(r.submittedAt);
            const dateStr = dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase()
                          + ', ' + dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
            const amtCell  = r.amount && Number(r.amount) > 0
                ? '₹' + Number(r.amount).toLocaleString('en-IN')
                : '<span style="color:#ccc;font-style:italic;">No amount</span>';
            const hasFile  = !!r.passbookUrl;
            const photoBtn = hasFile
                ? `<button class="btn-icon btn-edit" title="View Photo" onclick="openAdminPbLightbox(fixUrl('${r.passbookUrl}'))"><i class="fas fa-image"></i></button>`
                : '<span style="color:#ccc;font-size:.8rem">—</span>';
            const isReceived  = (r.status || '').toLowerCase() === 'received';
            const statusBadge = isReceived
                ? '<span class="badge badge-success">Received</span>'
                : '<span class="badge badge-warning">Balance</span>';
            const isPauti = r.type === 'pauti-slip';
            const isDonEntry = r.type === 'donation-entry';
            const sourceTag = isPauti
                ? `<span style="font-size:.7rem;background:#EEF2FF;color:#3730A3;padding:1px 7px;border-radius:10px;margin-left:4px;">Pauti #${r._slipNum}</span>`
                : isDonEntry
                ? `<span style="font-size:.7rem;background:#E0F2F1;color:#00695C;padding:1px 7px;border-radius:10px;margin-left:4px;">Bk${r._bookNum} #${r._recNum}</span>`
                : '';
            const safeId   = r.receiptId.replace(/'/g, "\\'");
            const safeName = (r.name || '').replace(/'/g, "\\'");
            const safePhoto = (r.passbookUrl||'').replace(/'/g,"\\'");
            if (r.editHistory && r.editHistory.length > 0) window._brHistoryStore[r.receiptId] = r.editHistory;
            else if (r.nameHistory && r.nameHistory.length > 0) window._brHistoryStore[r.receiptId] = r.nameHistory;
            const editBtn = `<button class="btn-icon btn-edit" title="Edit Entry" onclick="openBrEditModal('${safeId}','${safeName}',${r.amount||0},'${r.paymentMode||'cash'}','${r.status||'pending'}',${r._bookNumber||r._bookNum||0},${r._receiptNumber||r._recNum||r._slipNum||0},'${safePhoto}','${r.type}','${r._bookId||''}')"><i class="fas fa-edit"></i></button>`;
            const markBtn  = (!isPauti && !isDonEntry && !isReceived)
                ? `<button class="btn-icon btn-edit" style="background:#E8F5E9;color:#1B5E20;" title="Mark as Received" onclick="markBalanceReceived('${safeId}')"><i class="fas fa-check"></i></button>`
                : '';
            const delBtn = (!isPauti && !isDonEntry)
                ? `<button class="btn-icon btn-delete" title="Soft Delete" onclick="softDeleteReceipt('${safeId}','${safeName}')"><i class="fas fa-trash"></i></button>`
                : '';
            return `
            <tr>
                <td style="font-size:.8rem;color:#888;white-space:nowrap;">${r.receiptId}${sourceTag}</td>
                <td>${escHtml(r.name || '—')}</td>
                <td>${amtCell}</td>
                <td>${photoBtn}</td>
                <td style="font-size:.85rem;color:#3949AB;font-weight:600;">${escHtml(r.userId || '—')}</td>
                <td style="font-size:.82rem;color:#555;white-space:nowrap;">${dateStr}</td>
                <td>${statusBadge}</td>
                <td><div class="action-btns">${editBtn}${markBtn}${delBtn}</div></td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#c0392b;padding:24px;">⚠ Cannot reach server.</td></tr>';
    }
}

async function markBalanceReceived(id) {
    if (!confirm('Mark this balance recovery slip as Received?')) return;
    try {
        const res  = await fetch(`/api/receipts/${encodeURIComponent(id)}/mark-received`, { method: 'PATCH' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification('Balance slip marked as received!', 'success');
            loadBalanceRecovery();
        } else {
            showNotification('Error: ' + (data.message || 'Could not update.'), 'error');
        }
    } catch (e