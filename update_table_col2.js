const fs = require('fs');
let adminJs = fs.readFileSync('admin.js', 'utf8');

const regex = /return `<tr>\s*<td>\$\{r\.bookNumber \|\| '—'\}<\/td>\s*<td>\$\{r\.receiptNumber \|\| '—'\}<\/td>\s*<td><strong style="color:#1B5E20;">\$\{fmt\(r\.amount\)\}<\/strong><\/td>\s*<td><div class="action-btns">\$\{editBtn\}\$\{delBtn\}<\/div><\/td>\s*<\/tr>`;/g;

const replacementStr = `return \`<tr>
                <td style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${safeName || '—'}">\${safeName || '—'}</td>
                <td>\${r.bookNumber || '—'}</td>
                <td>\${r.receiptNumber || '—'}</td>
                <td><strong style="color:#1B5E20;">\${fmt(r.amount)}</strong></td>
                <td><div class="action-btns">\${editBtn}\${delBtn}</div></td>
            </tr>\`;`;

if (regex.test(adminJs)) {
    adminJs = adminJs.replace(regex, replacementStr);
    fs.writeFileSync('admin.js', adminJs);
    console.log('Successfully added Donor Name to Received Breakdown table.');
} else {
    console.log('Regex did not match in admin.js');
}
