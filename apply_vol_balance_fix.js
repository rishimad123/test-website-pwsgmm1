const fs = require('fs');
const content = fs.readFileSync('dashboard.html', 'utf8');

const searchStr = 'async function loadVolBalanceRecovery() {';
const startIndex = content.indexOf(searchStr);
if (startIndex === -1) { console.error('Start string not found'); process.exit(1); }

const endStr = 'Error loading balance data.</td></tr>';
let endIndex = content.indexOf(endStr, startIndex);
if (endIndex === -1) { console.error('End string not found'); process.exit(1); }
endIndex = content.indexOf('}', endIndex) + 1; // find the closing brace of the catch block

const newContent = `async function loadVolBalanceRecovery() {
            const tbody = document.getElementById('volBalTbody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:24px;">Loading...</td></tr>';
            try {
                // Fetch all donation entries and Pauti books (across entire website)
                const [deRes, pbRes] = await Promise.all([
                    fetch('/api/donation-entries'),
                    fetch('/api/pauti-books')
                ]);
                const deData = await deRes.json();
                const pbData = await pbRes.json();

                const pautiPending = [];
                (pbData.pautiBooks || []).forEach(book => {
                    (book.slips || []).forEach(slip => {
                        if (!slip.deleted && slip.uploadedAt &&
                            (slip.paymentMode === 'balance' || !slip.amount || Number(slip.amount) <= 0)) {
                            pautiPending.push({
                                receiptId: \`SLIP-\${slip.slipNumber}\`,
                                name: slip.donorName || '—',
                                amount: slip.amount || 0,
                                photoUrl: slip.photoUrl || null,
                                submittedAt: slip.uploadedAt,
                                status: 'pending',
                                type: 'pauti-slip',
                                bookNumber: book.bookNumber,
                                receiptNumber: slip.slipNumber,
                                area: '—'
                            });
                        }
                    });
                });

                const dePending = (deData.entries || []).filter(e =>
                    e.paymentMode && e.paymentMode.toLowerCase() === 'balance' && !e.deleted
                ).map(e => {
                    const donor = e.donorType === 'Business'
                        ? (e.businessName || '—')
                        : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
                    return {
                        receiptId: e.entryId,
                        name: donor,
                        amount: e.amount || 0,
                        photoUrl: e.photoUrl || null,
                        submittedAt: e.submittedAt,
                        status: e.status || 'Balance',
                        type: 'donation-entry',
                        bookNumber: e.bookNumber,
                        receiptNumber: e.receiptNumber,
                        area: e.area || '—'
                    };
                });

                const list = [...pautiPending, ...dePending];

                if (list.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:24px;">No pending balance slips found.</td></tr>';
                    return;
                }

                const grouped = {};
                list.forEach(r => {
                    const bn = r.bookNumber || 'Unknown';
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
                    html += \`<tr><td colspan="8" style="background:#F4F6FB;color:#1A237E;font-weight:700;font-size:1.05rem;padding:12px 16px;">Book Number \${bn}</td></tr>\`;
                    html += grouped[bn].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map(r => {
                        const dt = new Date(r.submittedAt);
                        const dateStr = dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase()
                                      + ', ' + dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                        const amtCell = r.amount && Number(r.amount) > 0
                            ? '₹' + Number(r.amount).toLocaleString('en-IN')
                            : '<span style="color:#ccc;font-style:italic;">No amount</span>';
                        const photoCell = r.photoUrl
                            ? \`<img src="\${r.photoUrl}?t=\${Date.now()}" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="openPbLightbox('\${r.photoUrl}')" title="Click to enlarge">\`
                            : '<span style="color:#ccc;">—</span>';
                        
                        const isReceived  = (r.status || '').toLowerCase() === 'received';
                        const statusBadge = isReceived 
                            ? '<span class="badge badge-success" style="background:#E8F5E9;color:#1B5E20;">Received</span>'
                            : '<span class="badge badge-warning" style="background:#FFF8E1;color:#F57F17;">Balance</span>';

                        const safeId = r.receiptId.replace(/'/g, "\\\\'");
                        const markBtn = (!isReceived)
                            ? \`<button class="btn-icon btn-edit" style="background:#E8F5E9;color:#1B5E20;padding:6px 10px;margin-right:5px;" title="Mark as Received" onclick="markBalanceReceived('\${safeId}')"><i class="fas fa-check"></i></button>\`
                            : '';
                        const editBtn = r.type === 'donation-entry'
                            ? \`<button class="btn btn-sm" style="background:#E3F2FD;color:#1565C0;padding:6px 10px;" onclick="deOpenVolEdit('\${safeId}')"><i class="fas fa-edit"></i> Edit</button>\`
                            : '<span style="font-size:0.8rem;color:#999;">-</span>';

                        return \`<tr>
                            <td style="font-weight:700;">Bk \${r.bookNumber} #\${r.receiptNumber}</td>
                            <td style="font-weight:600;">\${r.name}</td>
                            <td>\${r.area}</td>
                            <td style="color:#2E7D32;font-weight:700;">\${amtCell}</td>
                            <td style="color:#777;font-size:.82rem;">\${dateStr}</td>
                            <td>\${statusBadge}</td>
                            <td style="text-align:center;">\${photoCell}</td>
                            <td style="text-align:center;white-space:nowrap;">\${markBtn}\${editBtn}</td>
                        </tr>\`;
                    }).join('');
                });
                tbody.innerHTML = html;
            } catch(e) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#c00;padding:24px;">Error loading balance data.</td></tr>';
            }
        }

        async function markBalanceReceived(id) {
            if (!confirm('Mark this balance recovery slip as Received?')) return;
            try {
                const res  = await fetch(\`/api/receipts/\${encodeURIComponent(id)}/mark-received\`, { method: 'PATCH' });
                const data = await res.json();
                if (res.ok && data.success) {
                    showNotification('Balance slip marked as received!', 'success');
                    loadVolBalanceRecovery();
                } else {
                    showNotification('Error: ' + (data.message || 'Could not update.'), 'error');
                }
            } catch (e) {
                showNotification('Cannot reach server.', 'error');
            }
        }`;

const replacedContent = content.substring(0, startIndex) + newContent + content.substring(endIndex);
fs.writeFileSync('dashboard.html', replacedContent, 'utf8');
console.log('Successfully updated loadVolBalanceRecovery in dashboard.html');
