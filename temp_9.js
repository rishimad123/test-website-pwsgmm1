// ── Helpers ──────────────────────────────────────────────────────────
    /** Convert any UTC ISO string to IST (UTC+5:30) and return
     *  a date-label like "30 May 2026" and a sort-key "2026-05-30". */
    function myDonISTLabel(isoStr) {
        const d = new Date(isoStr);
        // IST offset = +330 minutes
        const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
        const day   = ist.getUTCDate();
        const month = ist.toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' });
        const year  = ist.getUTCFullYear();
        const mm    = String(ist.getUTCMonth() + 1).padStart(2,'0');
        const dd    = String(day).padStart(2,'0');
        return { label: `${day} ${month} ${year}`, key: `${year}-${mm}-${dd}` };
    }

    function myDonFmtAmt(n) {
        if (n == null) return '—';
        return '₹' + Number(n).toLocaleString('en-IN');
    }

    function myDonFmtTime(isoStr) {
        const d = new Date(isoStr);
        const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
        const h = ist.getUTCHours(), m = ist.getUTCMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hh = h % 12 || 12;
        return hh + ':' + String(m).padStart(2,'0') + ' ' + ampm;
    }

    // ── Main Load ─────────────────────────────────────────────────────────
    async function myDonLoad() {
        const grp = document.getElementById('myDonGroups');
        if (!grp) return;
        grp.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;margin-bottom:12px;display:block;color:#E65100;opacity:.5;"></i>Loading&hellip;</div>';

        try {
            const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null;
            const url = uid ? `/api/donation-entries?userId=${encodeURIComponent(uid)}` : '/api/donation-entries';
            const res = await fetch(url);
            const data = await res.json();
            let entries = (data.entries || []).filter(e => !e.deleted);

            // Filter to only this volunteer's entries (double-check client-side)
            if (uid && (typeof currentUser !== 'undefined') && currentUser.role !== 'admin') {
                entries = entries.filter(e =>
                    String(e.submittedByUserId) === String(uid) ||
                    String(e.userId) === String(uid)
                );
            }

            // Sort newest first
            entries.sort((a,b) => new Date(b.submittedAt||0) - new Date(a.submittedAt||0));

            // ── Summary stats ─────────────────────────────────────────────
            const totalEntries = entries.length;
            const totalAmount  = entries.reduce((s,e) => s + (Number(e.amount)||0), 0);
            const uniqueDays   = new Set(entries.map(e => myDonISTLabel(e.submittedAt).key)).size;
            const uniqueBooks  = new Set(entries.map(e => e.bookNumber)).size;

            const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            safeSet('myDonTotalEntries', totalEntries);
            safeSet('myDonTotalAmount',  myDonFmtAmt(totalAmount));
            safeSet('myDonTotalDays',    uniqueDays);
            safeSet('myDonTotalBooks',   uniqueBooks);

            if (!totalEntries) {
                grp.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:#bbb;">
                        <i class="fas fa-hand-holding-heart" style="font-size:3rem;display:block;margin-bottom:16px;opacity:.2;color:#E65100;"></i>
                        <div style="font-size:1.05rem;font-weight:600;color:#ccc;">No donation entries yet</div>
                        <div style="font-size:.85rem;margin-top:6px;">Entries you submit in <strong>Donation Data Entry</strong> will appear here.</div>
                    </div>`;
                return;
            }

            // ── Group by IST date ─────────────────────────────────────────
            const dayMap = {};
            entries.forEach(e => {
                const { label, key } = myDonISTLabel(e.submittedAt);
                if (!dayMap[key]) dayMap[key] = { label, key, entries: [] };
                dayMap[key].entries.push(e);
            });

            // Sort days descending
            const days = Object.values(dayMap).sort((a,b) => b.key.localeCompare(a.key));

            grp.innerHTML = days.map(day => {
                const dayTotal = day.entries.reduce((s,e) => s + (Number(e.amount)||0), 0);
                const today    = myDonISTLabel(new Date().toISOString()).key === day.key;

                const rows = day.entries.map(e => {
                    const donor = e.donorType === 'Business'
                        ? (e.businessName || '—')
                        : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
                    const bookBadge = (e.bookType||'New') === 'Old'
                        ? '<span style="background:#FFF8F1;color:#E65100;font-size:.68rem;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>'
                        : '<span style="background:#E3F2FD;color:#1565C0;font-size:.68rem;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>';
                    const time = myDonFmtTime(e.submittedAt);
                    const safeId = (e.entryId||'').replace(/'/g,"\'");
                    const canEdit = !e.entryId?.startsWith('PB-') && !e.entryId?.startsWith('RC-');

                    const dtObj = new Date(e.submittedAt);
                    const dtStr = dtObj.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase()
                                + '\n' + dtObj.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
                    const dtParts = dtStr.split('\n');
                    const photoSection = e.photoUrl
                        ? `<div style="margin-top:10px;border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="openPbLightbox('${fixUrl(e.photoUrl)}')">
                               <img src="${fixUrl(e.photoUrl)}?t=${Date.now()}" loading="lazy" alt="Receipt photo"
                                   style="width:100%;max-height:200px;object-fit:cover;display:block;">
                               <div style="background:#fff8f5;padding:5px 10px;font-size:.72rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;">
                                   <i class="fas fa-expand-alt"></i> Tap to view full receipt
                               </div>
                           </div>`
                        : `<div style="margin-top:10px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:14px;text-align:center;background:#fffaf8;">
                               <i class="fas fa-camera" style="font-size:1.4rem;color:#ddd;display:block;margin-bottom:6px;"></i>
                               <span style="font-size:.75rem;color:#ccc;font-weight:600;">No Receipt Photo</span>
                           </div>`;
                    
                    const paymentModeColor = (e.paymentMode||'').toLowerCase() === 'balance' ? 'background:#FFF8F1;color:#E65100;' : 'background:#E8F5E9;color:#2E7D32;';

                    return `<div style="border:1px solid #f0e8e0;border-radius:14px;padding:14px;margin:0 0 12px;background:var(--white);box-shadow:0 2px 8px rgba(0,0,0,.06);">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;font-size:.97rem;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${donor}</div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center;">
                                    <span style="background:#F3E5F5;color:#6A1B9A;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;">
                                        <i class="fas fa-book" style="font-size:.65rem;margin-right:3px;"></i>Bk ${e.bookNumber} / #${e.receiptNumber} ${bookBadge}
                                    </span>
                                    ${(e.landmark || e.area || e.buildingName || e.landmark) ? `<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;"><i class="fas fa-map-marker-alt" style="font-size:.65rem;margin-right:3px;"></i>${[e.landmark, e.area, e.buildingName ? `${e.buildingName}${e.flatNumber ? ` (Flat: ${e.flatNumber})` : ''}` : null, e.landmark].filter(Boolean).join(' &middot; ')}</span>` : ''}
                                    ${e.paymentMode ? `<span style="${paymentModeColor}padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;">${e.paymentMode}</span>` : ''}
                                </div>
                                <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                                    <span style="color:#2E7D32;font-weight:700;font-size:1.05rem;">${myDonFmtAmt(e.amount)}</span>
                                    <span style="font-size:.72rem;color:#aaa;text-align:right;">${dtParts[0]}<br><span style="color:#bbb;">${dtParts[1]}</span></span>
                                </div>
                            </div>
                        </div>
                        ${photoSection}
                    </div>`;
                }).join('');

                return `
                <div style="background:var(--white);border-radius:16px;box-shadow:0 2px 14px rgba(0,0,0,.07);margin-bottom:20px;overflow:hidden;">
                    <!-- Day header -->
                    <div style="background:${today ? 'linear-gradient(135deg,#E65100,#ff8c42)' : 'linear-gradient(135deg,#f5f5f5,#eeeeee)'};padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            ${today ? '<span style="background:rgba(255,255,255,.25);color:#fff;font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:16px;letter-spacing:.04em;">TODAY</span>' : ''}
                            <span style="font-weight:700;font-size:1rem;color:${today ? '#fff' : '#333'};">${day.label}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:14px;">
                            <span style="font-size:.82rem;color:${today ? 'rgba(255,255,255,.85)' : '#888'};">${day.entries.length} entr${day.entries.length===1?'y':'ies'}</span>
                            <span style="font-weight:700;font-size:.95rem;color:${today ? '#fff' : '#E65100'};">${myDonFmtAmt(dayTotal)}</span>
                        </div>
                    </div>
                    <!-- Entries -->
                    <div style="padding:14px;">
                        ${rows}
                    </div>
                    <!-- Day footer total -->
                    <div style="background:#fafafa;border-top:1px solid #f0f0f0;padding:10px 20px;display:flex;justify-content:flex-end;align-items:center;gap:8px;">
                        <span style="font-size:.82rem;color:#999;">Day Total:</span>
                        <span style="font-weight:700;color:#2E7D32;font-size:.95rem;">${myDonFmtAmt(dayTotal)}</span>
                    </div>
                </div>`;
            }).join('');

        } catch (err) {
            if (grp) grp.innerHTML = `<div style="text-align:center;padding:40px;color:#e74c3c;font-size:.88rem;"><i class="fas fa-exclamation-triangle" style="font-size:1.5rem;display:block;margin-bottom:10px;"></i>Failed to load donations: ${err.message}</div>`;
        }
    }

        // ── Auto-load when section shown ──────────────────────────────────────
    (function() {
        const originalShowSection = window.showSection;
        if (typeof originalShowSection === 'function') {
            window.showSection = function(id) {
                originalShowSection(id);
                if (id === 'donations') {
                    setTimeout(myDonLoad, 50);
                }
            };
        }
    })();

    // SSE handled by existing evtSource connection in the page

    // ── CSS animations (pulse dot) ────────────────────────────────────────
    (function() {
        if (document.getElementById('myDonStyles')) return;
        const s = document.createElement('style');
        s.id = 'myDonStyles';
        s.textContent = `
            @keyframes deSlideDown {
            from { opacity:0; transform:translateY(-6px); }
            to   { opacity:1; transform:translateY(0); }
        }
        @keyframes myDonPulse {
                0%   { transform: scale(1);   opacity: 1; }
                50%  { transform: scale(1.5); opacity: 0.5; }
                100% { transform: scale(1);   opacity: 1; }
            }
            #myDonGroups tbody tr:hover { background:#fffaf8; }
            #myDonGroups tbody td { padding: 10px 16px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
            @media(max-width:600px) {
                #myDonGroups table thead { display:none; }
                #myDonGroups table tbody tr { display:block; border-bottom:2px solid #f0f0f0; padding:10px 0; }
                #myDonGroups table tbody td { display:flex; justify-content:space-between; padding:5px 16px; border:none; font-size:.82rem; }
                #myDonGroups table tbody td::before { content: attr(data-label); font-weight:600; color:#999; font-size:.74rem; }
            }
        `;
        document.head.appendChild(s);
    })();