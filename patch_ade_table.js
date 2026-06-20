const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');
let fixes = 0;

// ──────────────────────────────────────────────────────────────────────────────
// FIX 1: Remove duplicate Landmark column header
// Before: <th>WhatsApp</th><th>Mobile</th><th>Building</th><th>Landmark</th><th>Area</th>
//         <th>Amount</th><th>Mode</th><th>Ref No.</th><th>Landmark</th><th>Image</th>...
// After:  Remove the second <th>Landmark</th>, keep the first one
// ──────────────────────────────────────────────────────────────────────────────
const oldHeaders = `                            <th>WhatsApp</th><th>Mobile</th><th>Building</th><th>Landmark</th><th>Area</th>
                            <th>Amount</th><th>Mode</th><th>Ref No.</th><th>Landmark</th><th>Image</th><th>Submitted By</th><th>Date</th><th>Actions</th>`;
const newHeaders = `                            <th>WhatsApp</th><th>Mobile</th><th>Building</th><th>Landmark</th><th>Area</th>
                            <th>Amount</th><th>Mode</th><th>Ref No.</th><th>Image</th><th>Submitted By</th><th>Date</th><th>Actions</th>`;

if (html.includes(oldHeaders)) {
    html = html.replace(oldHeaders, newHeaders);
    console.log('✅ Fix 1: Removed duplicate Landmark column header (18→17 cols)');
    fixes++;
} else {
    console.log('❌ Fix 1: header pattern not found, trying line-based approach');
    // try just removing the duplicate <th>Landmark</th> after Ref No.
    const alt = `><th>Ref No.</th><th>Landmark</th><th>Image</th>`;
    const altNew = `><th>Ref No.</th><th>Image</th>`;
    if (html.includes(alt)) {
        html = html.replace(alt, altNew);
        console.log('✅ Fix 1 (alt): Removed duplicate Landmark after Ref No.');
        fixes++;
    } else {
        console.log('  Still not found - please check manually');
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// FIX 2: Fix colspan references from 18 to 17 in adeRender-related elements
// ──────────────────────────────────────────────────────────────────────────────
// colspan="18" in loading row and empty row
html = html.replace(/colspan="18"/g, 'colspan="17"');
console.log('✅ Fix 2: Updated colspan 18→17');
fixes++;

// ──────────────────────────────────────────────────────────────────────────────
// FIX 3: Remove the duplicate landmark <td> from the row render in adeRender()
// Line: <td style="font-size:.82rem;color:#555;">${e.landmark||''}</td>
// which comes AFTER Ref No. td and BEFORE the image td
// ──────────────────────────────────────────────────────────────────────────────
const oldRefRow = `                <td style="font-size:.82rem;color:#777;">\${e.referenceNumber||''}</td>
                <td style="font-size:.82rem;color:#555;">\${e.landmark||''}</td>
                <td style="text-align:center;">`;
const newRefRow = `                <td style="font-size:.82rem;color:#777;">\${e.referenceNumber||''}</td>
                <td style="text-align:center;">`;

if (html.includes(oldRefRow)) {
    html = html.replace(oldRefRow, newRefRow);
    console.log('✅ Fix 3: Removed duplicate landmark <td> from row render');
    fixes++;
} else {
    console.log('❌ Fix 3: duplicate td pattern not found, trying alternative...');
    // try escaped version
    const altOld = `<td style="font-size:.82rem;color:#555;">\${e.landmark||''}</td>\n                <td style="text-align:center;">`;
    const altNew = `<td style="text-align:center;">`;
    if (html.includes(altOld)) {
        html = html.replace(altOld, altNew);
        console.log('✅ Fix 3 (alt): Removed duplicate landmark td');
        fixes++;
    } else {
        // Manual line-by-line approach
        const lines = html.split('\n');
        let removed = 0;
        // Find the line with font-size:.82rem;color:#555 that has e.landmark
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('color:#555') && lines[i].includes('e.landmark||') && lines[i].includes('<td')) {
                lines.splice(i, 1);
                removed++;
                console.log('✅ Fix 3 (line splice): Removed duplicate landmark td at line', i+1);
                break;
            }
        }
        if (removed > 0) { html = lines.join('\n'); fixes++; }
        else console.log('  Fix 3 still not found');
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// FIX 4: Replace flat _adeFiltered.slice().reverse().map() render with 
//        landmark-grouped render
// ──────────────────────────────────────────────────────────────────────────────
const lines = html.split('\n');
let mapStart = -1, mapEnd = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('_adeFiltered.slice().reverse().map(') && lines[i].includes('{')) {
        mapStart = i;
        break;
    }
}

if (mapStart >= 0) {
    // Find closing }).join('');
    for (let i = mapStart; i < Math.min(lines.length, mapStart + 50); i++) {
        if (lines[i].includes(".join('')") && lines[i].trim().startsWith('}')) {
            mapEnd = i;
            break;
        }
    }
}

console.log('Fix 4 locate: mapStart=' + (mapStart+1) + ', mapEnd=' + (mapEnd+1));

if (mapStart >= 0 && mapEnd > mapStart) {
    // Extract the single row template (lines mapStart+1 to mapEnd-1)
    const rowLines = lines.slice(mapStart + 1, mapEnd);
    const rowTemplate = rowLines.join('\n');

    // Build the new grouped render code
    const groupedCode = `        // ── Group entries by Landmark ──────────────────────────────────────
        const _adeLmOrder = [];
        const _adeLmGroups = {};
        _adeFiltered.forEach(e => {
            const lm = String(e.landmark || '(No Landmark)').trim();
            if (!_adeLmGroups[lm]) { _adeLmGroups[lm] = []; _adeLmOrder.push(lm); }
            _adeLmGroups[lm].push(e);
        });

        let _adeHtml = '';
        let _adeRowNum = 0;
        _adeLmOrder.forEach(lm => {
            const cnt = _adeLmGroups[lm].length;
            // Landmark group header spanning all 17 columns
            _adeHtml += '<tr>' +
                '<td colspan="17" style="background:linear-gradient(90deg,#FFF3E0,#FFF8F5);color:#BF360C;font-weight:700;font-size:.88rem;padding:9px 16px;border-left:4px solid #E65100;border-top:2px solid #FFCC80;">' +
                '<i class=\\"fas fa-map-marker-alt\\" style=\\"margin-right:7px;color:#E65100;\\"></i>' + lm +
                '<span style=\\"font-weight:400;color:#888;font-size:.78rem;margin-left:10px;\\">(' + cnt + ' entr' + (cnt === 1 ? 'y' : 'ies') + ')</span>' +
                '</td></tr>';
            _adeLmGroups[lm].forEach(e => {
                _adeRowNum++;
                const i = _adeRowNum - 1;
                const donor = e.donorType === 'Business'
                    ? (e.businessName || '\u2014')
                    : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '\u2014';
                const dtObj = new Date(e.submittedAt);
                const dtTime = dtObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
                const dtDate = dtObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                const dt = '<span style=\\"font-size:.8rem;white-space:nowrap;\\">' + dtTime + '<br><span style=\\"color:#aaa;\\">' + dtDate + '</span></span>';
                const amt = e.amount != null ? '&#x20B9;' + Number(e.amount).toLocaleString('en-IN') : '\u2014';
                const photoUrl = e.photoUrl || e.receiptPreviewUrl || '';
                const photoCell = photoUrl
                    ? '<img src=\\"' + fixUrl(photoUrl) + '?t=' + Date.now() + '\\" style=\\"width:50px;height:50px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;\\" onclick=\\"openAdminLightbox(fixUrl(\\'' + photoUrl + '\\')))\\" title=\\"View photo\\">'
                    : '<span style=\\"font-size:.72rem;color:#aaa;font-style:italic;\\">No Image</span>';
                _adeHtml += '<tr id=\\"ade-row-' + e.entryId + '\\">' +
                    '<td style=\\"color:#aaa;font-size:.8rem;\\">' + (i+1) + '</td>' +
                    '<td style=\\"font-weight:700;vertical-align:middle;\\">Bk ' + e.bookNumber + ' ' + ((e.bookType||'New')==='Old' ? '<span style=\\"background:#FFF8F1;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;\\">Old</span>' : '<span style=\\"background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;\\">New</span>') + '</td>' +
                    '<td>#' + e.receiptNumber + '</td>' +
                    '<td style=\\"font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\\" title=\\"' + donor + '\\">' + donor + '</td>' +
                    '<td><span style=\\"padding:2px 9px;border-radius:10px;font-size:.75rem;font-weight:700;background:' + (e.donorType==='Business'?'#E3F2FD':'#E8F5E9') + ';color:' + (e.donorType==='Business'?'#1565C0':'#1B5E20') + ';\\">' + e.donorType + '</span></td>' +
                    '<td style=\\"color:#555;font-size:.85rem;\\">' + (e.whatsappNumber||'') + '</td>' +
                    '<td style=\\"color:#555;font-size:.85rem;\\">' + (e.mobileNumber||'') + '</td>' +
                    '<td style=\\"font-size:.85rem;\\">' + (e.buildingName||'') + (e.flatNumber ? '<br><span style=\\"font-size:0.75rem;color:#777;\\">Flat: ' + e.flatNumber + '</span>' : '') + '</td>' +
                    '<td style=\\"font-size:.85rem;\\">' + (e.landmark||'') + '</td>' +
                    '<td style=\\"font-size:.85rem;\\">' + (e.area||'') + '</td>' +
                    '<td style=\\"color:#2E7D32;font-weight:700;\\">' + amt + '</td>' +
                    '<td><span style=\\"padding:3px 10px;border-radius:12px;background:#FFF8F1;color:#E65100;font-size:.75rem;font-weight:700;\\">' + e.paymentMode + '</span></td>' +
                    '<td style=\\"font-size:.82rem;color:#777;\\">' + (e.referenceNumber||'') + '</td>' +
                    '<td style=\\"text-align:center;\\">' + photoCell + '</td>' +
                    '<td style=\\"font-size:.82rem;color:#888;\\">' + (e.submittedBy||'') + '</td>' +
                    '<td style=\\"color:#888;font-size:.82rem;\\">' + dt + '</td>' +
                    '<td><div class=\\"action-btns\\"><button class=\\"btn-icon btn-edit\\" title=\\"Edit\\" onclick=\\"adeOpenEdit(\\'' + e.entryId + '\\')\\"><i class=\\"fas fa-edit\\"></i></button><button class=\\"btn-icon btn-delete\\" title=\\"Delete\\" onclick=\\"adeDelete(\\'' + e.entryId + '\\')\\"><i class=\\"fas fa-trash\\"></i></button></div></td>' +
                    '</tr>';
            });
        });
        tbody.innerHTML = _adeHtml;`;

    const before = lines.slice(0, mapStart);
    const after = lines.slice(mapEnd + 1);
    html = [...before, groupedCode, ...after].join('\n');
    console.log('✅ Fix 4: Replaced flat map with landmark-grouped render');
    fixes++;
} else {
    console.log('❌ Fix 4: could not locate _adeFiltered.slice().reverse().map block');
}

// Write result
fs.writeFileSync('admin.html', html, 'utf8');
console.log('\nTotal fixes: ' + fixes + ' / 4');
