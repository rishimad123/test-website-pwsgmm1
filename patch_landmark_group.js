const fs = require('fs');
let content = fs.readFileSync('admin.js', 'utf8');

// ── FIX 1: Sort entries by landmark on load ──────────────────────────────────
const oldLoad = `        _deAdmAllEntries = (data.entries || []).slice().reverse();`;
const newLoad = `        // Sort by landmark first, then by book number, then by receipt number
        _deAdmAllEntries = (data.entries || []).slice().sort((a, b) => {
            const lmA = String(a.landmark || a.area || '').toLowerCase();
            const lmB = String(b.landmark || b.area || '').toLowerCase();
            if (lmA < lmB) return -1;
            if (lmA > lmB) return 1;
            const bkDiff = (Number(a.bookNumber) || 0) - (Number(b.bookNumber) || 0);
            if (bkDiff !== 0) return bkDiff;
            return (Number(a.receiptNumber) || 0) - (Number(b.receiptNumber) || 0);
        });`;

if (content.includes(oldLoad)) {
    content = content.replace(oldLoad, newLoad);
    console.log('✅ Fix 1 applied: sort by landmark on load');
} else {
    console.log('❌ Fix 1 NOT applied: pattern not found');
}

// ── FIX 2: Replace the flat tbody.innerHTML = list.map() with grouped render ──
// Find the exact section in deAdmApplyFilter that renders the rows
const oldRenderStart = `    tbody.innerHTML = list.map(e => {
        const donor   = e.donorType === 'Business' ? (e.businessName||'—') : [e.firstName,e.middleName,e.lastName].filter(Boolean).join(' ') || '—';
        const amt     = e.amount != null ? '\\u20B9' + Number(e.amount).toLocaleString('en-IN') : '<span style="color:#ccc;">—</span>';
        const dtObj   = new Date(e.submittedAt);
        const dtTime  = dtObj.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase();
        const dtDate  = dtObj.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
        const photoCell = e.photoUrl
            ? \`<img src="\${e.photoUrl}?t=\${Date.now()}" loading="lazy" onclick="openAdminPbLightbox('\${e.photoUrl}')" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;" title="Click to enlarge">\`
            : '<span style="color:#ccc;font-size:.8rem;">—</span>';
        let modeBadge = \`<span style="padding:3px 9px;border-radius:10px;background:#E3F2FD;color:#1565C0;font-size:.76rem;font-weight:700;">\${e.paymentMode||'—'}</span>\`;
        if (e.markedReceivedBy) {
            modeBadge = \`<span style="padding:3px 9px;border-radius:10px;background:#E8F5E9;color:#2E7D32;font-size:.76rem;font-weight:700;">Received</span>
                         <div style="font-size:0.75rem;color:#E65100;font-weight:700;margin-top:6px;line-height:1.2;">Marked received by \${escHtml(e.markedReceivedBy)}</div>\`;
        }
        const safeId  = (e.entryId||'').replace(/'/g,"\\\\'");
        return \`<tr>
            <td style="vertical-align:middle;"><strong>Bk\${e.bookNumber}</strong> \${ (e.bookType||'New')==='Old' ? '<span style="background:#FFF3E0;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>' : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>' }<br><span style="font-size:.8rem;color:#888;">#\${e.receiptNumber}</span></td>
            <td>\${escHtml(donor)}</td>
            <td>\${escHtml(e.area||'—')}</td>
            <td style="color:#2E7D32;font-weight:600;">\${amt}</td>
            <td>\${modeBadge}</td>
            <td style="text-align:center;">\${photoCell}</td>
            <td style="font-size:.82rem;color:#3949AB;">\${escHtml(e.submittedBy||'—')}</td>
            <td style="font-size:.78rem;color:#888;white-space:nowrap;">\${dtTime}<br>\${dtDate}</td>
            <td>
                <button class="btn-icon btn-delete" title="Delete entry" onclick="deAdmDelete('\${safeId}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>\`;
    }).join('');`;

const newRender = `    // Group entries by landmark for structured display
    const lmOrder = [];
    const lmGroups = {};
    list.forEach(e => {
        const lm = String(e.landmark || e.area || '(No Landmark)').trim();
        if (!lmGroups[lm]) { lmGroups[lm] = []; lmOrder.push(lm); }
        lmGroups[lm].push(e);
    });

    let htmlRows = '';
    lmOrder.forEach(lm => {
        // Landmark group header row
        htmlRows += '<tr>' +
            '<td colspan="9" style="background:linear-gradient(90deg,#FFF3E0,#FFF8F5);color:#BF360C;font-weight:700;font-size:.85rem;padding:8px 14px;border-left:4px solid #E65100;border-top:2px solid #FFCC80;">' +
            '<i class="fas fa-map-marker-alt" style="margin-right:6px;color:#E65100;"></i>' + escHtml(lm) +
            '<span style="font-weight:400;color:#888;font-size:.78rem;margin-left:8px;">(' + lmGroups[lm].length + ' entr' + (lmGroups[lm].length===1?'y':'ies') + ')</span>' +
            '</td></tr>';
        // Entries for this landmark
        lmGroups[lm].forEach(e => {
            const donor   = e.donorType === 'Business' ? (e.businessName||'\\u2014') : [e.firstName,e.middleName,e.lastName].filter(Boolean).join(' ') || '\\u2014';
            const amt     = e.amount != null ? '\\u20B9' + Number(e.amount).toLocaleString('en-IN') : '<span style="color:#ccc;">\\u2014</span>';
            const dtObj   = new Date(e.submittedAt);
            const dtTime  = dtObj.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase();
            const dtDate  = dtObj.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
            const photoCell = e.photoUrl
                ? '<img src="' + e.photoUrl + '?t=' + Date.now() + '" loading="lazy" onclick="openAdminPbLightbox(\\'' + e.photoUrl + '\\')" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;" title="Click to enlarge">'
                : '<span style="color:#ccc;font-size:.8rem;">\\u2014</span>';
            let modeBadge = '<span style="padding:3px 9px;border-radius:10px;background:#E3F2FD;color:#1565C0;font-size:.76rem;font-weight:700;">' + (e.paymentMode||'\\u2014') + '</span>';
            if (e.markedReceivedBy) {
                modeBadge = '<span style="padding:3px 9px;border-radius:10px;background:#E8F5E9;color:#2E7D32;font-size:.76rem;font-weight:700;">Received</span>' +
                    '<div style="font-size:0.75rem;color:#E65100;font-weight:700;margin-top:6px;line-height:1.2;">Marked received by ' + escHtml(e.markedReceivedBy) + '</div>';
            }
            const safeId = (e.entryId||'').replace(/'/g, "\\\\'");
            const bkTypeBadge = (e.bookType||'New')==='Old'
                ? '<span style="background:#FFF3E0;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>'
                : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>';
            htmlRows += '<tr style="background:#FFFDF9;">' +
                '<td style="vertical-align:middle;"><strong>Bk' + e.bookNumber + '</strong> ' + bkTypeBadge + '<br><span style="font-size:.8rem;color:#888;">#' + e.receiptNumber + '</span></td>' +
                '<td>' + escHtml(donor) + '</td>' +
                '<td>' + escHtml(e.area||'\\u2014') + '</td>' +
                '<td style="color:#2E7D32;font-weight:600;">' + amt + '</td>' +
                '<td>' + modeBadge + '</td>' +
                '<td style="text-align:center;">' + photoCell + '</td>' +
                '<td style="font-size:.82rem;color:#3949AB;">' + escHtml(e.submittedBy||'\\u2014') + '</td>' +
                '<td style="font-size:.78rem;color:#888;white-space:nowrap;">' + dtTime + '<br>' + dtDate + '</td>' +
                '<td><button class="btn-icon btn-delete" title="Delete entry" onclick="deAdmDelete(\\'' + safeId + '\\')"><i class="fas fa-trash"></i></button></td>' +
                '</tr>';
        });
    });
    tbody.innerHTML = htmlRows;`;

if (content.includes(oldRenderStart)) {
    content = content.replace(oldRenderStart, newRender);
    console.log('✅ Fix 2 applied: landmark-grouped render in deAdmApplyFilter');
} else {
    console.log('❌ Fix 2 NOT applied: pattern not found');
    // Try to find what we have
    const idx = content.indexOf('tbody.innerHTML = list.map(e => {');
    if (idx >= 0) {
        const line = content.slice(0, idx).split('\n').length;
        console.log('Found tbody.innerHTML = list.map at line:', line);
    }
}

// ── FIX 3: Use only landmark field (not area+landmark join) in export ─────────
const oldCommonLoc = `        // Location/Area: use area field directly (NOT joined with landmark)\n        const locationArea = e.area || e.location || '';\n        // Common Location: combine area + landmark for full path\n        const commonLoc = [e.area, e.landmark].filter(Boolean).join(' / ') || e.commonLandmark || e.buildingName || '';`;
const newCommonLoc = `        // Location/Area: use area field directly\n        const locationArea = e.area || e.location || '';\n        // Common Location: use ONLY the landmark field for consistent grouping\n        const commonLoc = String(e.landmark || e.commonLandmark || e.buildingName || '').trim();`;

if (content.includes(oldCommonLoc)) {
    content = content.replace(oldCommonLoc, newCommonLoc);
    console.log('✅ Fix 3 applied: export uses landmark-only for Common Location');
} else {
    console.log('❌ Fix 3 NOT applied: pattern not found');
}

fs.writeFileSync('admin.js', content, 'utf8');
console.log('\nDone. Total lines:', content.split('\n').length);
