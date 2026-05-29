const fs = require('fs');

function applyAdminJsChanges() {
    let content = fs.readFileSync('admin.js', 'utf8');

    // 1. Balance Recovery Grouping
    const grpOld = /const bn = r\._bookNum \|\| r\._bookNumber \|\| r\.bookNumber \|\| 'Unknown';/;
    const grpNew = `const bn = r._bookNum || r._bookNumber || r.bookNumber || 'Unknown';\r\n            const bt = r._bookType || r.bookType || 'New';\r\n            const groupKey = bn === 'Unknown' ? bn : \`\${bn} (\${bt})\`;`;
    content = content.replace(grpOld, grpNew);
    
    const grpPushOld = /if\(!grouped\[bn\]\) grouped\[bn\] = \[\];\r?\n\s*grouped\[bn\]\.push\(r\);/;
    const grpPushNew = `if(!grouped[groupKey]) grouped[groupKey] = [];\r\n            grouped[groupKey].push(r);`;
    content = content.replace(grpPushOld, grpPushNew);

    const tblHdrOld = /html \+= `<<?tr><td colspan="8" style="background:#F4F6FB;color:#1A237E;font-weight:700;font-size:1\.05rem;padding:12px 16px;">Book Number \$\{bn\}<\/td><\/tr>`;/;
    const tblHdrNew = `html += \`<tr><td colspan="8" style="background:#F4F6FB;color:#1A237E;font-weight:700;font-size:1.05rem;padding:12px 16px;">Book Number \${bn}</td></tr>\`;`;
    content = content.replace(tblHdrOld, tblHdrNew);

    // 2. dsRenderTable (Admin equivalent) - check line 2819
    const rowOld = /<td><strong>Bk\$\{e\.bookNumber\}<\/strong><br><span style="font-size:\.8rem;color:#888;">#\$\{e\.receiptNumber\}<\/span><\/td>/;
    const rowNew = `<td><strong>Bk\${e.bookNumber}</strong> <span style="font-size:0.75rem;color:#888;">(\${e.bookType || 'New'})</span><br><span style="font-size:.8rem;color:#888;">#\${e.receiptNumber}</span></td>`;
    content = content.replace(rowOld, rowNew);

    fs.writeFileSync('admin.js', content, 'utf8');
    console.log('Admin JS updated!');
}

applyAdminJsChanges();
