const fs = require('fs');

// ── PATCH admin.html ───────────────────────────────────────────────────────
let admin = fs.readFileSync('admin.html', 'utf8');

// ── 1. Admin Card View (adeRenderCards) ───────────────────────────────────
// Replace the single-image photoSection with dual-image version
const cardOld = `            const photoUrl = e.photoUrl || e.receiptPreviewUrl || '';
            const photoSection = photoUrl
                ? \`<div style="margin-top:12px;border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="adeOpenLightbox('\${photoUrl}')">
                       <img src="\${photoUrl}?t=\${Date.now()}" loading="lazy" alt="Receipt photo" style="width:100%;max-height:180px;object-fit:cover;display:block;">
                       <div style="background:#fff8f5;padding:5px 10px;font-size:.72rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;">
                           <i class="fas fa-expand-alt"></i> Tap to view full receipt
                       </div>
                   </div>\`
                : \`<div style="margin-top:12px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:12px;text-align:center;background:#fffaf8;">
                       <i class="fas fa-camera" style="font-size:1.3rem;color:#ddd;display:block;margin-bottom:5px;"></i>
                       <span style="font-size:.73rem;color:#ccc;font-weight:600;">No Receipt Photo</span>
                   </div>\`;`;

const cardNew = `            // Show BOTH uploaded photo AND digital receipt preview
            const _hp = !!e.photoUrl, _hpv = !!e.receiptPreviewUrl, _ts = Date.now();
            const photoSection = (_hp || _hpv)
                ? \`<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                       \${_hp ? \`<div style="border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="adeOpenLightbox('\${e.photoUrl}')">
                           <div style="background:#FFF3E0;padding:3px 10px;font-size:.68rem;color:#E65100;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fas fa-camera"></i>&nbsp;Uploaded Receipt Photo</div>
                           <img src="\${e.photoUrl}?t=\${_ts}" loading="lazy" alt="Receipt photo" style="width:100%;max-height:180px;object-fit:cover;display:block;">
                           <div style="background:#fff8f5;padding:3px 10px;font-size:.68rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;"><i class="fas fa-expand-alt"></i>&nbsp;Tap to view full image</div>
                       </div>\` : ''}
                       \${_hpv ? \`<div style="border-radius:10px;overflow:hidden;border:1.5px solid #90CAF9;cursor:pointer;" onclick="adeOpenLightbox('\${e.receiptPreviewUrl}')">
                           <div style="background:#E3F2FD;padding:3px 10px;font-size:.68rem;color:#1565C0;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fas fa-file-invoice"></i>&nbsp;Digital Receipt Preview</div>
                           <img src="\${e.receiptPreviewUrl}?t=\${_ts}" loading="lazy" alt="Digital receipt" style="width:100%;max-height:180px;object-fit:cover;display:block;">
                           <div style="background:#EBF5FF;padding:3px 10px;font-size:.68rem;color:#1565C0;font-weight:600;display:flex;align-items:center;gap:5px;"><i class="fas fa-expand-alt"></i>&nbsp;Tap to view full preview</div>
                       </div>\` : ''}
                   </div>\`
                : \`<div style="margin-top:12px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:12px;text-align:center;background:#fffaf8;">
                       <i class="fas fa-camera" style="font-size:1.3rem;color:#ddd;display:block;margin-bottom:5px;"></i>
                       <span style="font-size:.73rem;color:#ccc;font-weight:600;">No Receipt Photo</span>
                   </div>\`;`;

if (admin.includes(cardOld)) {
    admin = admin.replace(cardOld, cardNew);
    console.log('✅ Admin card view updated');
} else {
    console.log('⚠  Admin card view: pattern not found');
}

// ── 2. Admin Table View (adeRender) ───────────────────────────────────────
const tableOld = `                const photoUrl = e.photoUrl || e.receiptPreviewUrl || '';
                const photoCell = photoUrl
                    ? '<img src=\"' + fixUrl(photoUrl) + '?t=' + Date.now() + '\" style=\"width:50px;height:50px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;\" onclick=\"openAdminLightbox(fixUrl(\\'' + photoUrl + '\\')))" title=\"View photo\">'
                    : '<span style=\"font-size:.72rem;color:#aaa;font-style:italic;\">No Image</span>';`;

const tableNew = `                // Show BOTH uploaded photo AND digital preview in table
                const _tHp  = !!e.photoUrl;
                const _tHpv = !!e.receiptPreviewUrl;
                const _tTs  = Date.now();
                const photoCell = (_tHp || _tHpv)
                    ? (
                        (_tHp  ? '<div style=\\"margin-bottom:3px;\\"><img src=\\"' + fixUrl(e.photoUrl)          + '?t=' + _tTs + '\\" style=\\"width:46px;height:46px;object-fit:cover;border-radius:6px;border:2px solid #E65100;cursor:pointer;\\" onclick=\\"openAdminLightbox(fixUrl(\\\\'' + e.photoUrl + '\\\\'))\\" title=\\"📷 Photo\\"></div>' : '') +
                        (_tHpv ? '<div><img src=\\"' + fixUrl(e.receiptPreviewUrl) + '?t=' + _tTs + '\\" style=\\"width:46px;height:46px;object-fit:cover;border-radius:6px;border:2px solid #1565C0;cursor:pointer;\\" onclick=\\"openAdminLightbox(fixUrl(\\\\'' + e.receiptPreviewUrl + '\\\\'))\\" title=\\"🧾 Preview\\"></div>' : '')
                      )
                    : '<span style=\\"font-size:.72rem;color:#aaa;font-style:italic;\\">No Image</span>';`;

if (admin.includes(tableOld)) {
    admin = admin.replace(tableOld, tableNew);
    console.log('✅ Admin table view updated');
} else {
    console.log('⚠  Admin table view: pattern not found - trying fallback');
    // Try finding just the photoCell line
    const fallbackOld = "                const photoUrl = e.photoUrl || e.receiptPreviewUrl || '';\r\n                const photoCell = photoUrl\r\n                    ? '<img src=\\\"' + fixUrl(photoUrl) + '?t=' + Date.now() + '\\\" style=\\\"width:50px;height:50px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;\\\" onclick=\\\"openAdminLightbox(fixUrl(\\'' + photoUrl + '\\')))\\\" title=\\\"View photo\\\">'\r\n                    : '<span style=\\\"font-size:.72rem;color:#aaa;font-style:italic;\\\">No Image</span>';";
    if (admin.includes(fallbackOld)) {
        const fallbackNew = "                // Show BOTH uploaded photo AND digital preview in table\r\n                const _tHp  = !!e.photoUrl;\r\n                const _tHpv = !!e.receiptPreviewUrl;\r\n                const _tTs  = Date.now();\r\n                const photoCell = (_tHp || _tHpv)\r\n                    ? (\r\n                        (_tHp  ? '<div style=\\\\\\\"margin-bottom:3px;\\\\\\\"><img src=\\\\\\\"' + fixUrl(e.photoUrl)          + '?t=' + _tTs + '\\\\\\\" style=\\\\\\\"width:46px;height:46px;object-fit:cover;border-radius:6px;border:2px solid #E65100;cursor:pointer;\\\\\\\" onclick=\\\\\\\"openAdminLightbox(fixUrl(\\\\\\\\\\'' + e.photoUrl + '\\\\\\\\\\'))\\\\\\\" title=\\\\\\\"📷 Photo\\\\\\\"><\\/div>' : '') +\r\n                        (_tHpv ? '<div><img src=\\\\\\\"' + fixUrl(e.receiptPreviewUrl) + '?t=' + _tTs + '\\\\\\\" style=\\\\\\\"width:46px;height:46px;object-fit:cover;border-radius:6px;border:2px solid #1565C0;cursor:pointer;\\\\\\\" onclick=\\\\\\\"openAdminLightbox(fixUrl(\\\\\\\\\\'' + e.receiptPreviewUrl + '\\\\\\\\\\'))\\\\\\\" title=\\\\\\\"🧾 Preview\\\\\\\"><\\/div>' : '')\r\n                      )\r\n                    : '<span style=\\\\\\\"font-size:.72rem;color:#aaa;font-style:italic;\\\\\\\">No Image<\\/span>';";
        admin = admin.replace(fallbackOld, fallbackNew);
        console.log('✅ Admin table view updated (fallback)');
    } else {
        console.log('❌ Admin table view: both patterns failed');
    }
}

fs.writeFileSync('admin.html', admin, 'utf8');
console.log('\nadmin.html saved');
