const fs = require('fs');
let content = fs.readFileSync('admin.js', 'utf8');
let fixes = 0;

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Sort entries by landmark when loaded from server
// ─────────────────────────────────────────────────────────────────────────────
const f1old = `        _deAdmAllEntries = (data.entries || []).slice().reverse();`;
const f1new = `        // Sort by landmark first, then book number, then receipt number
        _deAdmAllEntries = (data.entries || []).slice().sort((a, b) => {
            const lmA = String(a.landmark || a.area || '').toLowerCase();
            const lmB = String(b.landmark || b.area || '').toLowerCase();
            if (lmA < lmB) return -1;
            if (lmA > lmB) return 1;
            const bkDiff = (Number(a.bookNumber)||0) - (Number(b.bookNumber)||0);
            if (bkDiff !== 0) return bkDiff;
            return (Number(a.receiptNumber)||0) - (Number(b.receiptNumber)||0);
        });`;

if (content.includes(f1old)) {
    content = content.replace(f1old, f1new);
    console.log('✅ Fix 1: sort entries by landmark on load');
    fixes++;
} else {
    console.log('❌ Fix 1 not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: Replace flat tbody.innerHTML = list.map() with landmark-grouped render
// We do a line-by-line approach to be precise
// ─────────────────────────────────────────────────────────────────────────────
const lines = content.split('\n');
let mapStartLine = -1, mapEndLine = -1;

// Find "tbody.innerHTML = list.map(e => {" inside deAdmApplyFilter
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('tbody.innerHTML = list.map(e =>') && 
        lines[i].includes('{')) {
        mapStartLine = i;
        break;
    }
}

if (mapStartLine >= 0) {
    // Find the matching "}).join('');" that closes this map
    let depth = 0;
    let inMap = false;
    for (let i = mapStartLine; i < lines.length; i++) {
        const l = lines[i];
        for (const ch of l) {
            if (ch === '{') depth++;
            if (ch === '}') { depth--; if (depth === 0 && inMap) { mapEndLine = i; break; } }
        }
        if (!inMap && depth > 0) inMap = true;
        if (mapEndLine >= 0) break;
    }
    // The line after mapEndLine should have "}).join('');"
    if (mapEndLine >= 0 && lines[mapEndLine + 1] && lines[mapEndLine + 1].includes(".join('')")) {
        mapEndLine = mapEndLine + 1;
    }
}

console.log(`Fix 2 search: mapStartLine=${mapStartLine}, mapEndLine=${mapEndLine}`);

if (mapStartLine >= 0 && mapEndLine > mapStartLine) {
    const indent = '    ';
    const groupedRender = `${indent}// Group entries by landmark for structured display
${indent}const lmOrder = [];
${indent}const lmGroups = {};
${indent}list.forEach(e => {
${indent}    const lm = String(e.landmark || e.area || '(No Landmark)').trim();
${indent}    if (!lmGroups[lm]) { lmGroups[lm] = []; lmOrder.push(lm); }
${indent}    lmGroups[lm].push(e);
${indent}});
${indent}
${indent}let htmlRows = '';
${indent}lmOrder.forEach(lm => {
${indent}    const cnt = lmGroups[lm].length;
${indent}    htmlRows += '<tr><td colspan="9" style="background:linear-gradient(90deg,#FFF3E0,#FFF8F5);color:#BF360C;font-weight:700;font-size:.85rem;padding:8px 14px;border-left:4px solid #E65100;border-top:2px solid #FFCC80;">' +
${indent}        '<i class="fas fa-map-marker-alt" style="margin-right:6px;color:#E65100;"></i>' + escHtml(lm) +
${indent}        '<span style="font-weight:400;color:#888;font-size:.78rem;margin-left:8px;">(' + cnt + ' entr' + (cnt===1?'y':'ies') + ')</span>' +
${indent}        '</td></tr>';
${indent}    lmGroups[lm].forEach(e => {
${indent}        const donor = e.donorType==='Business'?(e.businessName||'\\u2014'):[e.firstName,e.middleName,e.lastName].filter(Boolean).join(' ')||'\\u2014';
${indent}        const amt = e.amount!=null?'\\u20B9'+Number(e.amount).toLocaleString('en-IN'):'<span style="color:#ccc;">\\u2014</span>';
${indent}        const dtObj = new Date(e.submittedAt);
${indent}        const dtTime = dtObj.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase();
${indent}        const dtDate = dtObj.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
${indent}        const photoCell = e.photoUrl
${indent}            ? '<img src="'+e.photoUrl+'?t='+Date.now()+'" loading="lazy" onclick="openAdminPbLightbox(\\''+e.photoUrl+'\\')" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;" title="Click to enlarge">'
${indent}            : '<span style="color:#ccc;font-size:.8rem;">\\u2014</span>';
${indent}        let modeBadge = '<span style="padding:3px 9px;border-radius:10px;background:#E3F2FD;color:#1565C0;font-size:.76rem;font-weight:700;">'+(e.paymentMode||'\\u2014')+'</span>';
${indent}        if (e.markedReceivedBy) {
${indent}            modeBadge = '<span style="padding:3px 9px;border-radius:10px;background:#E8F5E9;color:#2E7D32;font-size:.76rem;font-weight:700;">Received</span>'+
${indent}                '<div style="font-size:0.75rem;color:#E65100;font-weight:700;margin-top:6px;line-height:1.2;">Marked received by '+escHtml(e.markedReceivedBy)+'</div>';
${indent}        }
${indent}        const safeId = (e.entryId||'').replace(/'/g,"\\\\'");
${indent}        const bkBadge = (e.bookType||'New')==='Old'
${indent}            ? '<span style="background:#FFF3E0;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>'
${indent}            : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>';
${indent}        htmlRows += '<tr>' +
${indent}            '<td style="vertical-align:middle;"><strong>Bk'+e.bookNumber+'</strong> '+bkBadge+'<br><span style="font-size:.8rem;color:#888;">#'+e.receiptNumber+'</span></td>' +
${indent}            '<td>'+escHtml(donor)+'</td>' +
${indent}            '<td>'+escHtml(e.area||'\\u2014')+'</td>' +
${indent}            '<td style="color:#2E7D32;font-weight:600;">'+amt+'</td>' +
${indent}            '<td>'+modeBadge+'</td>' +
${indent}            '<td style="text-align:center;">'+photoCell+'</td>' +
${indent}            '<td style="font-size:.82rem;color:#3949AB;">'+escHtml(e.submittedBy||'\\u2014')+'</td>' +
${indent}            '<td style="font-size:.78rem;color:#888;white-space:nowrap;">'+dtTime+'<br>'+dtDate+'</td>' +
${indent}            '<td><button class="btn-icon btn-delete" title="Delete entry" onclick="deAdmDelete(\\''+safeId+'\\')"><i class="fas fa-trash"></i></button></td>' +
${indent}            '</tr>';
${indent}    });
${indent}});
${indent}tbody.innerHTML = htmlRows;`;

    const before = lines.slice(0, mapStartLine);
    const after = lines.slice(mapEndLine + 1);
    content = [...before, groupedRender, ...after].join('\n');
    console.log('✅ Fix 2: landmark-grouped table render in deAdmApplyFilter');
    fixes++;
} else {
    console.log('❌ Fix 2: could not locate tbody.innerHTML = list.map block');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3: Export — use only landmark field for grouping key (not area+landmark)
// ─────────────────────────────────────────────────────────────────────────────
const f3old = `        // Common Location: combine area + landmark for full path
        const commonLoc = [e.area, e.landmark].filter(Boolean).join(' / ') || e.commonLandmark || e.buildingName || '';`;
const f3new = `        // Common Location: use ONLY the landmark field so grouping is consistent
        const commonLoc = String(e.landmark || e.commonLandmark || e.buildingName || '').trim();`;

if (content.includes(f3old)) {
    content = content.replace(f3old, f3new);
    console.log('✅ Fix 3: export uses landmark-only for Common Location grouping');
    fixes++;
} else {
    console.log('❌ Fix 3: pattern not found, checking alternatives...');
    // Try to find any nearby pattern
    const idx = content.indexOf('commonLoc = [e.area, e.landmark]');
    if (idx >= 0) {
        const lineNum = content.slice(0, idx).split('\n').length;
        console.log('  Found commonLoc at line:', lineNum);
    }
}

fs.writeFileSync('admin.js', content, 'utf8');
console.log('\nTotal fixes applied:', fixes, '/ 3');
console.log('Total lines:', content.split('\n').length);
