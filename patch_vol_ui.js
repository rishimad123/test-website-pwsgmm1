const fs = require('fs');

let admin = fs.readFileSync('admin.html', 'utf8');
let dash = fs.readFileSync('dashboard.html', 'utf8');

// 1. EXTRACT ADMIN UI
const cardsStart = admin.indexOf('<!-- All Submitted Entries cards -->');
const tableEnd = admin.indexOf('<!-- Manage Books Modal -->', cardsStart);
if (cardsStart === -1 || tableEnd === -1) {
    console.error('Could not find admin UI boundaries');
    process.exit(1);
}
let adminUI = admin.substring(cardsStart, tableEnd);

// Replace "ade" with "vde" in the UI to prevent conflicts
let vdeUI = adminUI
    .replace(/id="ade/g, 'id="vde')
    .replace(/id='ade/g, "id='vde")
    .replace(/oninput="ade/g, 'oninput="vde')
    .replace(/onclick="ade/g, 'onclick="vde')
    .replace(/onchange="ade/g, 'onchange="vde')
    .replace(/class="ade/g, 'class="vde')
    .replace(/adeTable/g, 'vdeTable')
    .replace(/adeTbody/g, 'vdeTbody')
    .replace(/adeCardGrid/g, 'vdeCardGrid');

// "All Submitted Entries" -> "All Donation Entries"
vdeUI = vdeUI.replace('All Submitted Entries', 'All Donation Entries');

// Fix year filter variable
vdeUI = vdeUI.replace('window._adeSelectedYear', 'window._vdeSelectedYear');


// 2. EXTRACT DASHBOARD UI BOUNDARIES
// First, restore dashboard.html to its original state by doing a git checkout
// Wait, I should just use the current dashboard.html because my previous patch didn't change the UI since vdeUI was empty!
// Wait, let's verify if my previous patch corrupted it. 
// Ah, the previous patch might have inserted empty UI. Let's run a git checkout dashboard.html just in case.

// (I will run git checkout in the terminal before this script)

const oldUiStart = dash.indexOf('<!-- All Entries by Book Number -->');
const oldUiEndMarker = '<!-- ══════════ END DONATION DATA ENTRY SECTION ══════════ -->';
const oldUiEnd = dash.indexOf(oldUiEndMarker, oldUiStart);

if (oldUiStart === -1 || oldUiEnd === -1) {
    console.error('Could not find dashboard UI boundaries');
    process.exit(1);
}

// 3. EXTRACT DASHBOARD JS BOUNDARIES
const jsStartStr = '// ── My entries table ─────────────────────────────────────────';
const jsStart = dash.indexOf(jsStartStr);
const jsEndStr = '// ── Volunteer Edit Modal ────────────────────────────────';
const jsEnd = dash.indexOf(jsEndStr, jsStart);

if (jsStart === -1 || jsEnd === -1) {
    console.error('Could not find dashboard JS boundaries');
    process.exit(1);
}


// 4. PREPARE THE NEW VOLUNTEER JS
const newJS = `// ── Volunteer Entries Table (Mirrored from Admin) ────────────────────────
    let _vdeAll = [];
    let _vdeFiltered = [];

    async function vdeLoad() {
        const tbody = document.getElementById('vdeTbody');
        const grid = document.getElementById('vdeCardGrid');
        if(tbody) tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#999;padding:30px;">Loading...</td></tr>';
        if(grid) grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px;grid-column:1/-1;">Loading...</div>';
        
        try {
            const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null;
            const res = await fetch('/api/donation-entries?year=' + (window._vdeSelectedYear || 'active'));
            const data = await res.json();
            let entries = (data.entries || []).filter(e => !e.deleted);
            
            // Filter to only this volunteer's entries
            if (uid && (typeof currentUser !== 'undefined') && currentUser.role !== 'admin') {
                entries = entries.filter(e =>
                    String(e.submittedByUserId) === String(uid) ||
                    String(e.userId) === String(uid)
                );
            }
            
            entries.sort((a,b) => new Date(b.submittedAt||0) - new Date(a.submittedAt||0));
            _vdeAll = entries;

            // Populate filter options dynamically based on available data
            const lmSet = new Set(), modeSet = new Set();
            _vdeAll.forEach(e => {
                if (e.landmark) lmSet.add(e.landmark);
                if (e.paymentMode) modeSet.add(e.paymentMode);
            });
            const selLm = document.getElementById('vdeFilterLandmark');
            if (selLm) {
                const currentVal = selLm.value;
                selLm.innerHTML = '<option value="">All Landmarks</option>' + 
                    Array.from(lmSet).sort().map(l => '<option value="'+l+'">'+l+'</option>').join('');
                selLm.value = currentVal;
            }
            const selMode = document.getElementById('vdeFilterMode');
            if (selMode) {
                const currentVal = selMode.value;
                selMode.innerHTML = '<option value="">All Modes</option>' + 
                    Array.from(modeSet).sort().map(m => '<option value="'+m+'">'+m+'</option>').join('');
                selMode.value = currentVal;
            }

            vdeFilter();
        } catch(err) {
            console.error('vdeLoad err:', err);
            if(tbody) tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#c00;padding:30px;">Error loading entries.</td></tr>';
            if(grid) grid.innerHTML = '<div style="text-align:center;color:#c00;padding:30px;grid-column:1/-1;">Error loading entries.</div>';
        }
    }

    function vdeFilter() {
        const name = (document.getElementById('vdeSearchName')?.value || '').toLowerCase();
        const book = document.getElementById('vdeFilterBook')?.value;
        const landmark = document.getElementById('vdeFilterLandmark')?.value;
        const mode = document.getElementById('vdeFilterMode')?.value;
        const type = document.getElementById('vdeFilterType')?.value;
        
        _vdeFiltered = _vdeAll.filter(e => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
            if (name && !donor.toLowerCase().includes(name)) return false;
            if (book && String(e.bookNumber) !== String(book)) return false;
            if (landmark && e.landmark !== landmark) return false;
            if (mode && e.paymentMode !== mode) return false;
            if (type && e.donorType !== type) return false;
            return true;
        });
        vdeRender();
        vdeRenderCards();
    }

    function vdeClearFilters() {
        ['vdeSearchName','vdeFilterBook','vdeFilterLandmark','vdeFilterMode','vdeFilterType','vdeCardSearch'].forEach(id => { 
            const el = document.getElementById(id); 
            if(el) el.value = ''; 
        });
        vdeFilter();
    }

    function vdeRender() {
        const tbody = document.getElementById('vdeTbody');
        if (!tbody) return;
        const totalAmt = _vdeFiltered.reduce((s,e) => s + (e.amount||0), 0);
        document.getElementById('vdeSummaryTotal')    && (document.getElementById('vdeSummaryTotal').textContent    = _vdeAll.length);
        document.getElementById('vdeSummaryFiltered') && (document.getElementById('vdeSummaryFiltered').textContent = _vdeFiltered.length);
        document.getElementById('vdeSummaryAmt')      && (document.getElementById('vdeSummaryAmt').innerHTML        = '&#x20B9;' + totalAmt.toLocaleString('en-IN'));
        
        if (!_vdeFiltered.length) { tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#999;padding:30px;">No entries found.</td></tr>'; return; }
        
        // Group entries by Landmark
        const _vdeLmOrder = [];
        const _vdeLmGroups = {};
        _vdeFiltered.forEach(e => {
            const lm = String(e.landmark || '(No Landmark)').trim();
            if (!_vdeLmGroups[lm]) { _vdeLmGroups[lm] = []; _vdeLmOrder.push(lm); }
            _vdeLmGroups[lm].push(e);
        });

        let _vdeHtml = '';
        let _vdeRowNum = 0;
        _vdeLmOrder.forEach(lm => {
            const cnt = _vdeLmGroups[lm].length;
            _vdeHtml += '<tr>' +
                '<td colspan="17" style="background:linear-gradient(90deg,#FFF3E0,#FFF8F5);color:#BF360C;font-weight:700;font-size:.88rem;padding:9px 16px;border-left:4px solid #E65100;border-top:2px solid #FFCC80;">' +
                '<i class="fas fa-map-marker-alt" style="margin-right:7px;color:#E65100;"></i>' + lm +
                '<span style="font-weight:400;color:#888;font-size:.78rem;margin-left:10px;">(' + cnt + ' entr' + (cnt === 1 ? 'y' : 'ies') + ')</span>' +
                '</td></tr>';
            _vdeLmGroups[lm].forEach(e => {
                _vdeRowNum++;
                const i = _vdeRowNum - 1;
                const donor = e.donorType === 'Business'
                    ? (e.businessName || '—')
                    : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
                const dtObj = new Date(e.submittedAt);
                const dtTime = dtObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
                const dtDate = dtObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                const dt = '<span style="font-size:.8rem;white-space:nowrap;">' + dtTime + '<br><span style="color:#aaa;">' + dtDate + '</span></span>';
                const amt = e.amount != null ? '&#x20B9;' + Number(e.amount).toLocaleString('en-IN') : '—';
                
                const _tHp  = !!e.photoUrl;
                const _tHpv = !!e.receiptPreviewUrl;
                const _tTs  = Date.now();
                const photoCell = (_tHp || _tHpv)
                    ? (
                        (_tHp  ? '<div style="margin-bottom:3px;"><img src="' + fixUrl(e.photoUrl) + '?t=' + _tTs + '" style="width:46px;height:46px;object-fit:cover;border-radius:6px;border:2px solid #E65100;cursor:pointer;" onclick="openPbLightbox(\\'' + fixUrl(e.photoUrl) + '\\')" title="📷 Photo"></div>' : '') +
                        (_tHpv ? '<div><img src="' + fixUrl(e.receiptPreviewUrl) + '?t=' + _tTs + '" style="width:46px;height:46px;object-fit:cover;border-radius:6px;border:2px solid #1565C0;cursor:pointer;" onclick="openPbLightbox(\\'' + fixUrl(e.receiptPreviewUrl) + '\\')" title="🧾 Preview"></div>' : '')
                      )
                    : '<span style="font-size:.72rem;color:#aaa;font-style:italic;">No Image</span>';

                // Volunteer Edit buttons (No delete!)
                const editBtn = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'volunteer_view') ? ''
                    : \`<button class="btn-icon btn-edit" title="Edit" onclick="deOpenVolEdit('\${e.entryId}')"><i class="fas fa-edit"></i></button>\`;

                _vdeHtml += '<tr id="vde-row-' + e.entryId + '">' +
                    '<td style="color:#aaa;font-size:.8rem;">' + (i+1) + '</td>' +
                    '<td style="font-weight:700;vertical-align:middle;">Bk ' + e.bookNumber + ' ' + ((e.bookType||'New')==='Old' ? '<span style="background:#FFF8F1;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>' : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>') + '</td>' +
                    '<td>#' + e.receiptNumber + '</td>' +
                    '<td style="font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + donor + '">' + donor + '</td>' +
                    '<td><span style="padding:2px 9px;border-radius:10px;font-size:.75rem;font-weight:700;background:' + (e.donorType==='Business'?'#E3F2FD':'#E8F5E9') + ';color:' + (e.donorType==='Business'?'#1565C0':'#1B5E20') + ';">' + e.donorType + '</span></td>' +
                    '<td style="color:#555;font-size:.85rem;">' + (e.whatsappNumber||'') + '</td>' +
                    '<td style="color:#555;font-size:.85rem;">' + (e.mobileNumber||'') + '</td>' +
                    '<td style="font-size:.85rem;">' + (e.buildingName||'') + (e.flatNumber ? '<br><span style="font-size:0.75rem;color:#777;">Flat: ' + e.flatNumber + '</span>' : '') + '</td>' +
                    '<td style="font-size:.85rem;">' + (e.landmark||'') + '</td>' +
                    '<td style="font-size:.85rem;">' + (e.area||'') + '</td>' +
                    '<td style="color:#2E7D32;font-weight:700;">' + amt + '</td>' +
                    '<td><span style="padding:3px 10px;border-radius:12px;background:#FFF8F1;color:#E65100;font-size:.75rem;font-weight:700;">' + e.paymentMode + '</span></td>' +
                    '<td style="font-size:.82rem;color:#777;">' + (e.referenceNumber||'') + '</td>' +
                    '<td style="text-align:center;vertical-align:middle;">' + photoCell + '</td>' +
                    '<td style="font-size:.82rem;color:#888;">' + (e.submittedBy||'') + '</td>' +
                    '<td style="color:#888;font-size:.82rem;">' + dt + '</td>' +
                    '<td><div class="action-btns">' + editBtn + '</div></td>' +
                    '</tr>';
            });
        });
        tbody.innerHTML = _vdeHtml;
    }

    function vdeRenderCards() {
        const grid = document.getElementById('vdeCardGrid');
        if (!grid) return;
        const q = (document.getElementById('vdeCardSearch')?.value || '').toLowerCase();
        let list = _vdeFiltered;
        if (q) {
            list = list.filter(e => {
                const donor = e.donorType === 'Business'
                    ? (e.businessName || '')
                    : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
                return donor.toLowerCase().includes(q) || 
                       String(e.landmark||'').toLowerCase().includes(q) ||
                       String(e.bookNumber).includes(q) ||
                       String(e.receiptNumber).includes(q);
            });
        }
        document.getElementById('vdeCardCount') && (document.getElementById('vdeCardCount').textContent = list.length + ' cards');
        if (!list.length) { grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px;grid-column:1/-1;">No entries match your search.</div>'; return; }

        grid.innerHTML = list.map(e => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '—')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
            const amt = e.amount != null ? '&#x20B9;' + Number(e.amount).toLocaleString('en-IN') : '—';
            const mode = e.paymentMode || '—';
            const modeClr = (mode === 'Cash' ? '#2E7D32' : mode === 'Cheque' ? '#1565C0' : mode === 'UPI' ? '#6A1B9A' : mode === 'RTGS' ? '#0277BD' : mode === 'Balance' ? '#E65100' : '#555');
            const dtObj = new Date(e.submittedAt);
            const dateStr = isNaN(dtObj) ? '—' : dtObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
            const timeStr = isNaN(dtObj) ? '' : dtObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
            
            const _hp = !!e.photoUrl, _hpv = !!e.receiptPreviewUrl, _ts = Date.now();
            const photoSection = (_hp || _hpv)
                ? \`<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                       \${_hp ? \`<div style="border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="openPbLightbox('\${fixUrl(e.photoUrl)}')">
                           <div style="background:#FFF3E0;padding:3px 10px;font-size:.68rem;color:#E65100;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fas fa-camera"></i>&nbsp;Uploaded Receipt Photo</div>
                           <img src="\${fixUrl(e.photoUrl)}?t=\${_ts}" loading="lazy" alt="Receipt photo" style="width:100%;max-height:180px;object-fit:cover;display:block;">
                           <div style="background:#fff8f5;padding:3px 10px;font-size:.68rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;"><i class="fas fa-expand-alt"></i>&nbsp;Tap to view full image</div>
                       </div>\` : ''}
                       \${_hpv ? \`<div style="border-radius:10px;overflow:hidden;border:1.5px solid #90CAF9;cursor:pointer;" onclick="openPbLightbox('\${fixUrl(e.receiptPreviewUrl)}')">
                           <div style="background:#E3F2FD;padding:3px 10px;font-size:.68rem;color:#1565C0;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fas fa-file-invoice"></i>&nbsp;Digital Receipt Preview</div>
                           <img src="\${fixUrl(e.receiptPreviewUrl)}?t=\${_ts}" loading="lazy" alt="Digital receipt" style="width:100%;max-height:180px;object-fit:cover;display:block;">
                           <div style="background:#EBF5FF;padding:3px 10px;font-size:.68rem;color:#1565C0;font-weight:600;display:flex;align-items:center;gap:5px;"><i class="fas fa-expand-alt"></i>&nbsp;Tap to view full preview</div>
                       </div>\` : ''}
                   </div>\`
                : \`<div style="margin-top:12px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:12px;text-align:center;background:#fffaf8;">
                       <i class="fas fa-camera" style="font-size:1.3rem;color:#ddd;display:block;margin-bottom:5px;"></i>
                       <span style="font-size:.73rem;color:#ccc;font-weight:600;">No Receipt Photo</span>
                   </div>\`;

            // Volunteer Edit button
            const editBtn = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'volunteer_view') ? ''
                : \`<button onclick="deOpenVolEdit('\${e.entryId}')" title="Edit" style="border:none;background:#E3F2FD;color:#1565C0;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.8rem;flex-shrink:0;"><i class="fas fa-edit"></i></button>\`;

            return \`<div style="background:var(--white);border:1.5px solid #F0F0F0;border-radius:14px;padding:18px 16px;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:box-shadow .2s;" onmouseover="this.style.boxShadow='0 4px 18px rgba(0,0,0,.11)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,.06)'">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">
                    <div style="font-weight:700;font-size:.97rem;color:var(--dark-color);line-height:1.3;">\${donor}</div>
                    \${editBtn}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px;">
                    <span style="background:#F3E5F5;color:#6A1B9A;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;vertical-align:middle;"><i class="fas fa-book" style="margin-right:4px;"></i>Bk \${e.bookNumber} / #\${e.receiptNumber}</span> \${ (e.bookType||'New')==='Old' ? '<span style="background:#FFF8F1;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:2px;vertical-align:middle;">Old</span>' : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:2px;vertical-align:middle;">New</span>' }
                    \${(e.landmark || e.area) ? \`<span style="background:#E8F5E9;color:#1B5E20;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>\${[e.landmark, e.area].filter(Boolean).join(' - ')}</span>\` : ''}
                    \${e.buildingName ? \`<span style="background:#F3E5F5;color:#6A1B9A;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;"><i class="fas fa-building" style="margin-right:4px;"></i>\${e.buildingName}\${e.flatNumber ? \` (Flat: \${e.flatNumber})\` : ''}</span>\` : ''}
                    <span style="background:#FFF8E1;color:\${modeClr};font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;">\${mode}</span>
                </div>
                
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                    \${(e.editHistory && e.editHistory.length) || (e.nameHistory && e.nameHistory.length) ? \`<span onclick="deOpenVolEdit('\${e.entryId}')" style="cursor:pointer;font-size:.7rem;font-weight:700;color:#c0392b;background:#FFEBEE;padding:3px 8px;border-radius:12px;border:1px solid #f5b7b1;"><i class="fas fa-pencil-alt" style="margin-right:4px;"></i>Edited</span>\` : '<span></span>'}
                    \${(e.status || (e.paymentMode === 'Balance' ? 'Balance' : 'Received')).toLowerCase() === 'received' ? \`<span style="background:#E8F5E9;color:#1B5E20;font-size:.73rem;font-weight:800;padding:3px 9px;border-radius:16px;border:1px solid #c8e6c9;">STATUS: RECEIVED</span>\` : \`<span style="background:#FFF8E1;color:#F57F17;font-size:.73rem;font-weight:800;padding:3px 9px;border-radius:16px;border:1px solid #ffe0b2;">STATUS: BALANCE</span>\`}
                         \${(e.status || (e.paymentMode === 'Balance' ? 'Balance' : 'Received')).toLowerCase() === 'received' ? \`<div style="display:flex;gap:4px;"><button onclick="de_rcg_openEditModal('\${e.entryId}')" title="Edit Receipt" style="border:none;background:linear-gradient(135deg,#8B1A1A,#B71C1C);color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.78rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;"><i class="fas fa-file-invoice"></i> Edit</button>\` + (e.receiptPreviewUrl ? \`<button onclick="window.open('\${e.receiptPreviewUrl}', '_blank')" title="View HD Receipt" style="border:none;background:#FFEBEE;color:#C62828;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.78rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;"><i class="fas fa-eye"></i> View</button>\` : '') + \`</div>\` : ''}
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="font-size:1.1rem;font-weight:800;color:#2E7D32;">\${amt}</div>
                    <div style="font-size:.76rem;color:#aaa;text-align:right;line-height:1.4;">\${timeStr}<br>\${dateStr}</div>
                </div>
                \${e.submittedBy ? \`<div style="font-size:.75rem;color:#bbb;margin-top:7px;"><i class="fas fa-user" style="margin-right:4px;"></i>\${e.submittedBy}</div>\` : ''}
                \${e.markedReceivedBy ? \`<div style="font-size:.76rem;font-weight:700;color:#E65100;margin-top:6px;padding:5px 10px;background:#FFF8F1;border-radius:8px;border:1px solid #ffe0b2;"><i class="fas fa-check-circle" style="color:#2E7D32;margin-right:5px;"></i>Marked received by <strong>\${e.markedReceivedBy}</strong></div>\` : ''}
                \${photoSection}
            </div>\`;
        }).join('');
    }

    // Call vdeLoad when section is displayed
    async function deLoadMyEntries() {
        await vdeLoad();
    }
\n`;


// Apply the replacements to dashboard HTML
let newDash = dash.substring(0, oldUiStart) + 
              vdeUI + '\n' +
              oldUiEndMarker + 
              dash.substring(oldUiEnd + oldUiEndMarker.length);

// Apply JS replacements
newDash = newDash.substring(0, jsStart) + newJS + newDash.substring(jsEnd);

fs.writeFileSync('dashboard.html', newDash, 'utf8');
console.log('✅ Updated dashboard.html with admin table layout and volunteer JS.');
