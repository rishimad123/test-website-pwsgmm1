const fs = require('fs');
let content = fs.readFileSync('admin.js', 'utf8');
const lines = content.split('\n');
let fixes = 0;

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Sort entries by landmark when loaded
// ─────────────────────────────────────────────────────────────────────────────
{
    const target = `        _deAdmAllEntries = (data.entries || []).slice().reverse();`;
    const replacement = `        // Sort by landmark first, then book number, then receipt number
        _deAdmAllEntries = (data.entries || []).slice().sort((a, b) => {
            const lmA = String(a.landmark || a.area || '').toLowerCase();
            const lmB = String(b.landmark || b.area || '').toLowerCase();
            if (lmA < lmB) return -1;
            if (lmA > lmB) return 1;
            const bkDiff = (Number(a.bookNumber)||0) - (Number(b.bookNumber)||0);
            if (bkDiff !== 0) return bkDiff;
            return (Number(a.receiptNumber)||0) - (Number(b.receiptNumber)||0);
        });`;
    if (content.includes(target)) {
        content = content.replace(target, replacement);
        console.log('✅ Fix 1: sort by landmark on load');
        fixes++;
    } else { console.log('❌ Fix 1: not found'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: Replace tbody.innerHTML = list.map() with landmark-grouped render
// Find exact line range then splice
// ─────────────────────────────────────────────────────────────────────────────
{
    const freshLines = content.split('\n');
    let startIdx = -1, endIdx = -1;
    for (let i = 0; i < freshLines.length; i++) {
        if (freshLines[i].includes("tbody.innerHTML = list.map(e =>") && freshLines[i].includes('{')) {
            startIdx = i;
            break;
        }
    }
    if (startIdx >= 0) {
        // Find end: the line that has }).join('');
        for (let i = startIdx; i < Math.min(freshLines.length, startIdx + 40); i++) {
            if (freshLines[i].includes(".join('')") && freshLines[i].trim().startsWith('}')) {
                endIdx = i;
                break;
            }
        }
    }
    console.log(`Fix 2: start=${startIdx+1}, end=${endIdx+1}`);

    if (startIdx >= 0 && endIdx > startIdx) {
        const groupedCode = `    // Group entries by landmark for a structured, clear display
    const lmOrder = [];
    const lmGroups = {};
    list.forEach(e => {
        const lm = String(e.landmark || e.area || '(No Landmark)').trim();
        if (!lmGroups[lm]) { lmGroups[lm] = []; lmOrder.push(lm); }
        lmGroups[lm].push(e);
    });
    let htmlRows = '';
    lmOrder.forEach(lm => {
        const cnt = lmGroups[lm].length;
        htmlRows += '<tr><td colspan="9" style="background:linear-gradient(90deg,#FFF3E0,#FFF8F5);color:#BF360C;font-weight:700;font-size:.85rem;padding:8px 14px;border-left:4px solid #E65100;border-top:2px solid #FFCC80;"><i class="fas fa-map-marker-alt" style="margin-right:6px;color:#E65100;"></i>' + escHtml(lm) + '<span style="font-weight:400;color:#888;font-size:.78rem;margin-left:8px;">(' + cnt + ' entr' + (cnt===1?'y':'ies') + ')</span></td></tr>';
        lmGroups[lm].forEach(e => {
            const donor = e.donorType==='Business' ? (e.businessName||'\u2014') : [e.firstName,e.middleName,e.lastName].filter(Boolean).join(' ')||'\u2014';
            const amt = e.amount!=null ? '\u20B9'+Number(e.amount).toLocaleString('en-IN') : '<span style="color:#ccc;">\u2014</span>';
            const dtObj = new Date(e.submittedAt);
            const dtTime = dtObj.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase();
            const dtDate = dtObj.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
            const photoCell = e.photoUrl
                ? '<img src="'+e.photoUrl+'?t='+Date.now()+'" loading="lazy" onclick="openAdminPbLightbox(\''+e.photoUrl+'\')" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;" title="Click to enlarge">'
                : '<span style="color:#ccc;font-size:.8rem;">\u2014</span>';
            let modeBadge = '<span style="padding:3px 9px;border-radius:10px;background:#E3F2FD;color:#1565C0;font-size:.76rem;font-weight:700;">'+(e.paymentMode||'\u2014')+'</span>';
            if (e.markedReceivedBy) {
                modeBadge = '<span style="padding:3px 9px;border-radius:10px;background:#E8F5E9;color:#2E7D32;font-size:.76rem;font-weight:700;">Received</span><div style="font-size:0.75rem;color:#E65100;font-weight:700;margin-top:6px;line-height:1.2;">Marked received by '+escHtml(e.markedReceivedBy)+'</div>';
            }
            const safeId = (e.entryId||'').replace(/'/g,"\\'");
            const bkBadge = (e.bookType||'New')==='Old'
                ? '<span style="background:#FFF3E0;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>'
                : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>';
            htmlRows += '<tr>' +
                '<td style="vertical-align:middle;"><strong>Bk'+e.bookNumber+'</strong> '+bkBadge+'<br><span style="font-size:.8rem;color:#888;">#'+e.receiptNumber+'</span></td>' +
                '<td>'+escHtml(donor)+'</td>' +
                '<td>'+escHtml(e.area||'\u2014')+'</td>' +
                '<td style="color:#2E7D32;font-weight:600;">'+amt+'</td>' +
                '<td>'+modeBadge+'</td>' +
                '<td style="text-align:center;">'+photoCell+'</td>' +
                '<td style="font-size:.82rem;color:#3949AB;">'+escHtml(e.submittedBy||'\u2014')+'</td>' +
                '<td style="font-size:.78rem;color:#888;white-space:nowrap;">'+dtTime+'<br>'+dtDate+'</td>' +
                '<td><button class="btn-icon btn-delete" title="Delete entry" onclick="deAdmDelete(\''+safeId+'\')"><i class="fas fa-trash"></i></button></td>' +
                '</tr>';
        });
    });
    tbody.innerHTML = htmlRows;`;

        const before = freshLines.slice(0, startIdx);
        const after = freshLines.slice(endIdx + 1);
        content = [...before, groupedCode, ...after].join('\n');
        console.log('✅ Fix 2: landmark-grouped table render inserted');
        fixes++;
    } else {
        console.log('❌ Fix 2: could not locate tbody.innerHTML = list.map block');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3: Export — use only landmark field for Common Location grouping key
// ─────────────────────────────────────────────────────────────────────────────
{
    // Find the line with commonLoc = [e.area, e.landmark] in the export function
    const lines3 = content.split('\n');
    let fixLine = -1;
    for (let i = 0; i < lines3.length; i++) {
        if (lines3[i].includes('commonLoc = [e.area, e.landmark]') || 
            lines3[i].includes("commonLoc = [e.area, e.landmark].filter(Boolean).join(' / ')")) {
            fixLine = i;
            break;
        }
    }
    console.log('Fix 3: commonLoc line =', fixLine + 1);
    if (fixLine >= 0) {
        // Also check if previous line is a comment to replace too
        const prevLine = lines3[fixLine - 1];
        const hasPrevComment = prevLine && (prevLine.includes('// Common Location') || prevLine.includes('combine area'));
        if (hasPrevComment) {
            lines3.splice(fixLine - 1, 2,
                `        // Common Location: use ONLY the landmark field so all entries for same landmark group together`,
                `        const commonLoc = String(e.landmark || e.commonLandmark || e.buildingName || '').trim();`
            );
        } else {
            lines3.splice(fixLine, 1,
                `        const commonLoc = String(e.landmark || e.commonLandmark || e.buildingName || '').trim();`
            );
        }
        content = lines3.join('\n');
        console.log('✅ Fix 3: export uses landmark-only for Common Location');
        fixes++;
    } else {
        console.log('❌ Fix 3: commonLoc line not found');
    }
}

fs.writeFileSync('admin.js', content, 'utf8');
console.log('\n✅ Total fixes applied:', fixes, '/ 3');
console.log('File lines:', content.split('\n').length);
