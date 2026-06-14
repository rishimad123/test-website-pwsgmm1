const fs = require('fs');

// ──────────────────────────────────────────────────────────
// Step 1: Remove the broken <script> block from admin.html
// ──────────────────────────────────────────────────────────
let html = fs.readFileSync('admin.html', 'utf8');

// Remove the standalone <script> block that contains adminLoadYears
const scriptStart = '<script>\n    // ─── Manage Donation Years Logic ─────';
const scriptEnd   = '</script>\n\n</body>';

const si = html.indexOf(scriptStart);
const se = html.indexOf(scriptEnd, si > -1 ? si : 0);

if (si > -1 && se > -1) {
    // Keep the </body> but remove the script block
    html = html.slice(0, si).trimEnd() + '\n\n</body>' + html.slice(se + scriptEnd.length);
    console.log('✅ Removed broken <script> block from admin.html');
} else {
    // Try alternate approach - find by function name
    const altStart = '<script>\n    // ─── Manage Donation Years';
    const altSi = html.lastIndexOf('<script>');
    const altSe = html.lastIndexOf('</script>');
    
    if (altSi > altSe - 100 || (html.substring(altSi, altSi+200).includes('adminLoadYears'))) {
        // The last <script> block contains our functions, remove it
        const beforeScript = html.slice(0, altSi).trimEnd();
        const afterScript = html.slice(altSe + '</script>'.length);
        html = beforeScript + afterScript;
        console.log('✅ Removed last <script> block (adminLoadYears) from admin.html via fallback');
    } else {
        console.log('⏭ No broken script block found in admin.html (already clean)');
    }
}

fs.writeFileSync('admin.html', html);

// ──────────────────────────────────────────────────────────
// Step 2: Append functions to admin.js  (if not already there)
// ──────────────────────────────────────────────────────────
let js = fs.readFileSync('admin.js', 'utf8');

if (!js.includes('async function adminLoadYears()')) {
    const newFunctions = `

// ─── Manage Donation Years ────────────────────────────────────────────────────
async function adminLoadYears() {
    const tbody = document.getElementById('adminYearsTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    try {
        const r = await fetch('/api/donation-years', { credentials: 'include' });
        const data = await r.json();
        if (!data.years || data.years.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:20px;">No years found.</td></tr>';
            return;
        }
        const active = data.activeYear || '';
        let html = '';
        data.years.forEach(y => {
            const isActive = (y === active);
            const statusBadge = isActive
                ? '<span style="background:#E8F5E9;color:#2E7D32;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:700;">Active</span>'
                : '<span style="background:#F5F5F5;color:#777;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:700;">Inactive</span>';
            const deleteBtn = isActive
                ? '<button class="btn btn-small" style="background:#ccc;cursor:not-allowed;" disabled title="Cannot delete active year"><i class="fas fa-trash"></i></button>'
                : \`<button class="btn btn-small" style="background:#e74c3c;color:#fff;" onclick="adminDeleteYear('\${y}')" title="Delete Year & All Entries"><i class="fas fa-trash"></i> Delete</button>\`;
            html += \`<tr>
                <td style="font-weight:600;font-size:1rem;">\${y}</td>
                <td>\${statusBadge}</td>
                <td>\${deleteBtn}</td>
            </tr>\`;
        });
        tbody.innerHTML = html;
    } catch (e) {
        console.error('adminLoadYears error:', e);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#e74c3c;padding:20px;">Error loading years. Check console.</td></tr>';
    }
}

async function adminAddYear() {
    const input = document.getElementById('adminNewYearInput');
    const year  = (input ? input.value : '').trim();
    if (!year) return alert('Please enter a year (e.g. 2024-25)');
    try {
        const r    = await fetch('/api/donation-years', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year })
        });
        const data = await r.json();
        if (r.ok) {
            if (input) input.value = '';
            adminLoadYears();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        alert('Failed to add year: ' + e.message);
    }
}

async function adminDeleteYear(year) {
    if (!confirm('WARNING: Deleting "' + year + '" will permanently remove ALL donation entries for that year.\\n\\nContinue?')) return;
    try {
        const r    = await fetch('/api/donation-years/' + encodeURIComponent(year), {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await r.json();
        if (r.ok) {
            alert(data.message || 'Year deleted successfully.');
            adminLoadYears();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        alert('Failed to delete year: ' + e.message);
    }
}
`;
    js += newFunctions;
    fs.writeFileSync('admin.js', js);
    console.log('✅ Appended adminLoadYears / adminAddYear / adminDeleteYear to admin.js');
} else {
    console.log('⏭ Functions already in admin.js');
}

console.log('\n✅ All done. Commit and push.');
