const fs = require('fs');
let c = fs.readFileSync('admin.html', 'utf8');
let changed = 0;

// 1. Insert HTML UI
const END_EVENTS = '<!-- ══════════ END EVENTS SECTION ══════════ -->';
const NEW_UI = `
                <!-- ══════════ MANAGE DONATION YEARS ══════════ -->
                <div class="admin-card" style="margin-top:20px; border-left:4px solid #f39c12;">
                    <div class="card-header">
                        <h3><i class="fas fa-calendar-check" style="color:#f39c12;margin-right:8px;"></i>Manage Donation Years</h3>
                    </div>
                    <p style="color:#666;font-size:0.9rem;margin:8px 0 16px;">Add new financial years for donation entries or delete existing ones. <strong>Warning: Deleting a year will remove ALL donation entries associated with that year.</strong></p>
                    
                    <div style="display:flex;gap:15px;align-items:flex-end;margin-bottom:20px;">
                        <div>
                            <label for="adminNewYearInput" style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">New Year (e.g. 2024-25)</label>
                            <input type="text" id="adminNewYearInput" class="form-control" placeholder="YYYY-YY" style="width:200px;">
                        </div>
                        <button class="btn btn-primary" onclick="adminAddYear()" style="background:#f39c12;border:none;">
                            <i class="fas fa-plus"></i> Add Year
                        </button>
                    </div>

                    <div style="overflow-x:auto;">
                        <table class="admin-table" id="adminYearsTable">
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="adminYearsTbody">
                                <tr><td colspan="3" style="text-align:center;color:#aaa;padding:30px;">Loading…</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                ${END_EVENTS}`;

if (c.includes(END_EVENTS) && !c.includes('MANAGE DONATION YEARS')) {
    c = c.replace(END_EVENTS, NEW_UI);
    changed++;
    console.log('✅ Injected Manage Donation Years UI');
} else {
    console.log('⏭ Manage Donation Years UI already present or anchor missing');
}

// 2. Insert JS logic
const JS_LOGIC = `
    // ─── Manage Donation Years Logic ──────────────────────────────────────────
    async function adminLoadYears() {
        const tbody = document.getElementById('adminYearsTbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:20px;">Loading...</td></tr>';
        try {
            const r = await fetch('/api/donation-years');
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
                    ? '<span style="background:#E8F5E9;color:#2E7D32;padding:3px 8px;border-radius:12px;font-size:0.75rem;font-weight:700;">Active</span>' 
                    : '<span style="background:#F5F5F5;color:#777;padding:3px 8px;border-radius:12px;font-size:0.75rem;font-weight:700;">Inactive</span>';
                
                const deleteBtn = isActive 
                    ? '<button class="btn btn-small" style="background:#ccc;cursor:not-allowed;" title="Cannot delete active year" disabled><i class="fas fa-trash"></i></button>'
                    : \`<button class="btn btn-small" style="background:#e74c3c;color:#fff;" onclick="adminDeleteYear('\${y}')" title="Delete Year & All Entries"><i class="fas fa-trash"></i></button>\`;
                
                html += \`<tr>
                    <td style="font-weight:600;">\${y}</td>
                    <td>\${statusBadge}</td>
                    <td>\${deleteBtn}</td>
                </tr>\`;
            });
            tbody.innerHTML = html;
        } catch (e) {
            console.error('Error loading years:', e);
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#e74c3c;padding:20px;">Error loading years.</td></tr>';
        }
    }

    async function adminAddYear() {
        const input = document.getElementById('adminNewYearInput');
        const year = input.value.trim();
        if (!year) return alert('Please enter a year (e.g. 2024-25)');
        
        try {
            const r = await fetch('/api/donation-years', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year })
            });
            const data = await r.json();
            if (r.ok) {
                input.value = '';
                adminLoadYears();
            } else {
                alert('Error adding year: ' + data.message);
            }
        } catch (e) {
            console.error('Add year error:', e);
            alert('Failed to add year.');
        }
    }

    async function adminDeleteYear(year) {
        const confirmMsg = \`WARNING: You are about to delete the year "\${year}".\\n\\nThis will REMOVE ALL donation entries associated with this year.\\nAre you absolutely sure you want to proceed?\`;
        if (!confirm(confirmMsg)) return;
        
        try {
            const r = await fetch('/api/donation-years/' + encodeURIComponent(year), {
                method: 'DELETE'
            });
            const data = await r.json();
            if (r.ok) {
                alert(data.message || 'Year deleted successfully.');
                adminLoadYears();
            } else {
                alert('Error deleting year: ' + data.message);
            }
        } catch (e) {
            console.error('Delete year error:', e);
            alert('Failed to delete year.');
        }
    }
`;

const SCRIPT_ANCHOR = 'function logoutAdmin() {';
if (c.includes(SCRIPT_ANCHOR) && !c.includes('function adminLoadYears()')) {
    c = c.replace(SCRIPT_ANCHOR, JS_LOGIC + '\n    ' + SCRIPT_ANCHOR);
    changed++;
    console.log('✅ Injected JS Logic');
} else {
    console.log('⏭ JS Logic already present or anchor missing');
}

// 3. Load years when Events section opens
const SECTION_HOOK_ANCHOR = `if (id === 'events') {`;
const NEW_SECTION_HOOK = `if (id === 'events') { adminLoadEvents(); adminLoadYears(); }`;
if (c.includes(SECTION_HOOK_ANCHOR)) {
    // If it's `if (id === 'events') adminLoadEvents();`
    c = c.replace(/if\s*\(id\s*===\s*'events'\)\s*adminLoadEvents\(\);/g, NEW_SECTION_HOOK);
    changed++;
    console.log('✅ Updated section hook');
}

fs.writeFileSync('admin.html', c);
console.log(`\nDone – ${changed} fix(es) applied.`);
