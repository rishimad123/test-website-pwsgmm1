const fs = require('fs');
const content = fs.readFileSync('admin.js', 'utf8');
const searchString = 'tbody.innerHTML = list.map(r => {';
let firstIndex = content.indexOf(searchString);
let secondIndex = content.indexOf(searchString, firstIndex + 1);

let endMarker = '}).join(\'\');';
let endIndex = content.indexOf(endMarker, secondIndex);

if (secondIndex !== -1 && endIndex !== -1) {
    const replacement = `        const grouped = {};
        list.forEach(r => {
            const bn = r._bookNum || r._bookNumber || r.bookNumber || 'Unknown';
            if(!grouped[bn]) grouped[bn] = [];
            grouped[bn].push(r);
        });

        const bookNumbers = Object.keys(grouped).sort((a, b) => {
            const na = parseInt(a);
            const nb = parseInt(b);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return String(a).localeCompare(String(b));
        });

        let html = '';
        bookNumbers.forEach(bn => {
            html += \\\`<tr><td colspan="8" style="background:#F4F6FB;color:#1A237E;font-weight:700;font-size:1.05rem;padding:12px 16px;">Book Number \\\${bn}</td></tr>\\\`;
            html += grouped[bn].map(r => {
                const dt = new Date(r.submittedAt);
                const dateStr = dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase()
                              + ', ' + dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                const amtCell  = r.amount && Number(r.amount) > 0
                    ? '₹' + Number(r.amount).toLocaleString('en-IN')
                    : '<span style="color:#ccc;font-style:italic;">No amount</span>';
                const hasFile  = !!r.passbookUrl;
                const photoBtn = hasFile
                    ? \\\`<button class="btn-icon btn-edit" title="View Photo" onclick="openAdminPbLightbox(fixUrl('\\\${r.passbookUrl}'))"><i class="fas fa-image"></i></button>\\\`
                    : '<span style="color:#ccc;font-size:.8rem">—</span>';
                const isReceived  = (r.status || '').toLowerCase() === 'received';
                const statusBadge = isReceived
                    ? '<span class="badge badge-success">Received</span>'
                    : '<span class="badge badge-warning">Balance</span>';
                const isPauti = r.type === 'pauti-slip';
                const isDonEntry = r.type === 'donation-entry';
                
                const recNumDisplay = r._recNum || r._slipNum || r._receiptNumber || r.receiptNumber || 'N/A';

                const safeId   = r.receiptId.replace(/'/g, "\\\\' ");
                const safeName = (r.name || '').replace(/'/g, "\\\\'");
                const safePhoto = (r.passbookUrl||'').replace(/'/g,"\\\\'");
                if (r.editHistory && r.editHistory.length > 0) window._brHistoryStore[r.receiptId] = r.editHistory;
                else if (r.nameHistory && r.nameHistory.length > 0) window._brHistoryStore[r.receiptId] = r.nameHistory;
                const editBtn = \\\`<button class="btn-icon btn-edit" title="Edit Entry" onclick="openBrEditModal('\\\${safeId}','\\\${safeName}',\\\${r.amount||0},'\\\${r.paymentMode||'cash'}','\\\${r.status||'pending'}',\\\${r._bookNumber||r._bookNum||0},\\\${r._receiptNumber||r._recNum||r._slipNum||0},'\\\${safePhoto}','\\\${r.type}','\\\${r._bookId||''}')"><i class="fas fa-edit"></i></button>\\\`;
                const markBtn  = (!isPauti && !isDonEntry && !isReceived)
                    ? \\\`<button class="btn-icon btn-edit" style="background:#E8F5E9;color:#1B5E20;" title="Mark as Received" onclick="markBalanceReceived('\\\${safeId}')"><i class="fas fa-check"></i></button>\\\`
                    : '';
                const delBtn = (!isPauti && !isDonEntry)
                    ? \\\`<button class="btn-icon btn-delete" title="Soft Delete" onclick="softDeleteReceipt('\\\${safeId}','\\\${safeName}')"><i class="fas fa-trash"></i></button>\\\`
                    : '';
                return \\\`
                <tr>
                    <td style="font-size:.85rem;color:#555;white-space:nowrap;padding-left:24px;font-weight:600;">Receipt Number \\\${recNumDisplay}</td>
                    <td>\\\${escHtml(r.name || '—')}</td>
                    <td>\\\${amtCell}</td>
                    <td>\\\${photoBtn}</td>
                    <td style="font-size:.85rem;color:#3949AB;font-weight:600;">\\\${escHtml(r.userId || '—')}</td>
                    <td style="font-size:.82rem;color:#555;white-space:nowrap;">\\\${dateStr}</td>
                    <td>\\\${statusBadge}</td>
                    <td><div class="action-btns">\\\${editBtn}\\\${markBtn}\\\${delBtn}</div></td>
                </tr>\\\`;
            }).join('');
        });
        tbody.innerHTML = html;\`;
    
    let endOfReplaced = endIndex + endMarker.length;
    let newContent = content.substring(0, secondIndex) + replacement + content.substring(endOfReplaced);
    fs.writeFileSync('admin.js', newContent, 'utf8');
    console.log('Successfully updated admin.js!');
} else {
    console.log('Could not find the target indices. secondIndex:', secondIndex, 'endIndex:', endIndex);
}
