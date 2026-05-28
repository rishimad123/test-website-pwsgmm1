const fs = require('fs');
let adminJs = fs.readFileSync('admin.js', 'utf8');

const targetStr = "            return `<tr>\n                <td>${r.bookNumber || '—'}</td>\n                <td>${r.receiptNumber || '—'}</td>\n                <td><strong style=\"color:#1B5E20;\">${fmt(r.amount)}</strong></td>\n                <td><div class=\"action-btns\">${editBtn}${delBtn}</div></td>\n            </tr>`;";

const replacementStr = "            return `<tr>\n                <td style=\"font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\" title=\"${safeName || '—'}\">${safeName || '—'}</td>\n                <td>${r.bookNumber || '—'}</td>\n                <td>${r.receiptNumber || '—'}</td>\n                <td><strong style=\"color:#1B5E20;\">${fmt(r.amount)}</strong></td>\n                <td><div class=\"action-btns\">${editBtn}${delBtn}</div></td>\n            </tr>`;";

if (adminJs.includes(targetStr)) {
    adminJs = adminJs.replace(targetStr, replacementStr);
    fs.writeFileSync('admin.js', adminJs);
    console.log('Successfully added Donor Name to Received Breakdown table.');
} else {
    console.log('Target string not found in admin.js');
}
