const fs = require('fs');

// ── Patch dashboard.html volunteer card photo section ─────────────────────
let content = fs.readFileSync('dashboard.html', 'utf8');

// Find and replace the single-image photoSection in the volunteer card view.
// The pattern is multi-line with CRLF endings.
// We'll replace starting from "const photoSection = (e.photoUrl || e.receiptPreviewUrl)"

const OLD = [
    "                    const photoSection = (e.photoUrl || e.receiptPreviewUrl)",
    "                        ? `<div style=\"margin-top:10px;border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;\" onclick=\"openPbLightbox('${fixUrl(e.photoUrl || e.receiptPreviewUrl)}')\">\r\n                               <img src=\"${fixUrl(e.photoUrl || e.receiptPreviewUrl)}?t=${Date.now()}\" loading=\"lazy\" alt=\"Receipt photo\"\r\n                                   style=\"width:100%;max-height:200px;object-fit:cover;display:block;\">\r\n                               <div style=\"background:#fff8f5;padding:5px 10px;font-size:.72rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;\">\r\n                                   <i class=\"fas fa-expand-alt\"></i> Tap to view full receipt\r\n                               </div>\r\n                           </div>`\r\n                        : `<div style=\"margin-top:10px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:14px;text-align:center;background:#fffaf8;\">\r\n                               <i class=\"fas fa-camera\" style=\"font-size:1.4rem;color:#ddd;display:block;margin-bottom:6px;\"></i>\r\n                               <span style=\"font-size:.75rem;color:#ccc;font-weight:600;\">No Receipt Photo</span>\r\n                           </div>`;"
].join('\r\n');

// Build the replacement — show BOTH images
const NEW = `                    // Show BOTH uploaded photo AND digital receipt preview\r\n                    const _vHp = !!e.photoUrl, _vHpv = !!e.receiptPreviewUrl, _vTs = Date.now();\r\n                    const photoSection = (_vHp || _vHpv)\r\n                        ? \`<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">\r\n                               \${_vHp ? \`<div style="border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="openPbLightbox('\${fixUrl(e.photoUrl)}')">\r\n                                   <div style="background:#FFF3E0;padding:3px 10px;font-size:.68rem;color:#E65100;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fas fa-camera"></i>&nbsp;Uploaded Receipt Photo</div>\r\n                                   <img src="\${fixUrl(e.photoUrl)}?t=\${_vTs}" loading="lazy" alt="Receipt photo" style="width:100%;max-height:200px;object-fit:cover;display:block;">\r\n                                   <div style="background:#fff8f5;padding:3px 10px;font-size:.68rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;"><i class="fas fa-expand-alt"></i>&nbsp;Tap to view full image</div>\r\n                               </div>\` : ''}\r\n                               \${_vHpv ? \`<div style="border-radius:10px;overflow:hidden;border:1.5px solid #90CAF9;cursor:pointer;" onclick="openPbLightbox('\${fixUrl(e.receiptPreviewUrl)}')">\r\n                                   <div style="background:#E3F2FD;padding:3px 10px;font-size:.68rem;color:#1565C0;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fas fa-file-invoice"></i>&nbsp;Digital Receipt Preview</div>\r\n                                   <img src="\${fixUrl(e.receiptPreviewUrl)}?t=\${_vTs}" loading="lazy" alt="Digital receipt" style="width:100%;max-height:200px;object-fit:cover;display:block;">\r\n                                   <div style="background:#EBF5FF;padding:3px 10px;font-size:.68rem;color:#1565C0;font-weight:600;display:flex;align-items:center;gap:5px;"><i class="fas fa-expand-alt"></i>&nbsp;Tap to view full preview</div>\r\n                               </div>\` : ''}\r\n                           </div>\`\r\n                        : \`<div style="margin-top:10px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:14px;text-align:center;background:#fffaf8;">\r\n                               <i class="fas fa-camera" style="font-size:1.4rem;color:#ddd;display:block;margin-bottom:6px;"></i>\r\n                               <span style="font-size:.75rem;color:#ccc;font-weight:600;">No Receipt Photo</span>\r\n                           </div>\`;`;

// Find the exact start marker
const MARKER = '                    const photoSection = (e.photoUrl || e.receiptPreviewUrl)';
const idx = content.indexOf(MARKER);
if (idx === -1) {
    console.log('❌ Marker not found in dashboard.html');
    process.exit(1);
}

// Find the end: after the backtick+semicolon closing the ternary 
// The block ends with:  </div>\`;    (with CRLF)
const END_MARKER = "                           </div>`;\r\n";
const endIdx = content.indexOf(END_MARKER, idx);
if (endIdx === -1) {
    console.log('❌ End marker not found');
    process.exit(1);
}
const endPos = endIdx + END_MARKER.length;

const before = content.slice(0, idx);
const after  = content.slice(endPos);
const result = before + NEW + '\r\n' + after;

fs.writeFileSync('dashboard.html', result, 'utf8');

// Verify
const check = fs.readFileSync('dashboard.html', 'utf8');
if (check.includes('_vHp') && check.includes('Digital Receipt Preview')) {
    console.log('✅ dashboard.html volunteer card updated - both images shown');
} else {
    console.log('❌ Verification failed');
}
