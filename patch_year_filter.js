const fs = require('fs');
let c = fs.readFileSync('dashboard.html', 'utf8');

// ─── 1. Insert year filter dropdown before the search input ───────────────────
// Target: the search bar in the "All Donation Entries" card header
const OLD_SEARCH_DIV = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                <input type="text" id="deAllEntriesSearch" placeholder="🔍 Search donor, book, receipt…" oninput="deFilterAllEntries()" style="padding:6px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.82rem;width:200px;">
                                <button onclick="deLoadMyEntries()" class="btn btn-small" style="background:var(--light-color);color:#555;font-size:.8rem;"><i class="fas fa-sync-alt"></i> Refresh</button>
                            </div>`;

const NEW_SEARCH_DIV = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                <select id="deYearFilter" style="display:none;padding:6px 10px;border:1.5px solid var(--primary-color);border-radius:8px;font-size:.82rem;font-weight:600;color:var(--primary-color);background:#fff;cursor:pointer;" onchange="window._deSelectedYear=this.value; deLoadMyEntries();" title="Filter by year">
                                    <option value="active">Active Year</option>
                                </select>
                                <input type="text" id="deAllEntriesSearch" placeholder="🔍 Search donor, book, receipt…" oninput="deFilterAllEntries()" style="padding:6px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.82rem;width:200px;">
                                <button onclick="deLoadMyEntries()" class="btn btn-small" style="background:var(--light-color);color:#555;font-size:.8rem;"><i class="fas fa-sync-alt"></i> Refresh</button>
                            </div>`;

if (c.includes(OLD_SEARCH_DIV)) {
    c = c.replace(OLD_SEARCH_DIV, NEW_SEARCH_DIV);
    console.log('✅ Added year filter dropdown next to search bar');
} else {
    console.log('❌ FAILED to find search div - will try line-based search');
    // Try without whitespace normalization
    if (c.includes('id="deAllEntriesSearch"')) {
        console.log('   Found deAllEntriesSearch; search div format may differ');
    }
}

// ─── 2. Update fetch calls to use selected year ───────────────────────────────
// Replace bare '/api/donation-entries' fetches that load the full list (not specific ones by ID)
// Fetch in deLoadMyEntries (returns all for the user)
c = c.replace(
    `const res  = await fetch('/api/donation-entries');`,
    `const res  = await fetch('/api/donation-entries?year=' + (window._deSelectedYear || 'active'));`
);
console.log('✅ Updated deLoadMyEntries fetch');

// fetch used for volunteer edit modal
c = c.replace(
    `fetch('/api/donation-entries').then(r => r.json()).then(data => {`,
    `fetch('/api/donation-entries?year=' + (window._deSelectedYear || 'active')).then(r => r.json()).then(data => {`
);
console.log('✅ Updated volunteer edit modal fetch');

// fetch in Promise.all for admin dashboard (line 2143 area)
c = c.replace(
    `fetch('/api/donation-entries'),`,
    `fetch('/api/donation-entries?year=' + (window._deSelectedYear || 'active')),`
);
console.log('✅ Updated admin Promise.all fetch');

// Fetch for history/summary with userId filter
c = c.replace(
    `const url = uid ? \`/api/donation-entries?userId=\${encodeURIComponent(uid)}\` : '/api/donation-entries';`,
    `const _yearParam = 'year=' + (window._deSelectedYear || 'active');
            const url = uid ? \`/api/donation-entries?userId=\${encodeURIComponent(uid)}&\${_yearParam}\` : \`/api/donation-entries?\${_yearParam}\`;`
);
console.log('✅ Updated history/summary fetch');

// Volunteer summary fetch
c = c.replace(
    `fetch("/api/donation-entries?userId="+(currentUser?currentUser.id:"")).then`,
    `fetch("/api/donation-entries?year="+(window._deSelectedYear || 'active')+"&userId="+(currentUser?currentUser.id:"")).then`
);
console.log('✅ Updated volunteer summary fetch');

// ─── 3. Insert JS: load years on login and show dropdown for allowed roles ────
const YEAR_FILTER_JS = `
    // ─── Year Filter for Donation Data Entry ────────────────────────────────
    async function deLoadYearFilter() {
        const roles = ['admin', 'volunteer_full', 'volunteer_full_tshirt'];
        const sel = document.getElementById('deYearFilter');
        if (!sel) return;
        if (!currentUser || !roles.includes(currentUser.role)) {
            sel.style.display = 'none';
            return;
        }
        try {
            const r = await fetch('/api/donation-years');
            const data = await r.json();
            if (!data.years) return;
            sel.innerHTML = '';
            const activeYear = data.activeYear;
            data.years.forEach(yr => {
                const opt = document.createElement('option');
                opt.value = yr;
                opt.textContent = yr === activeYear ? yr + ' (Active)' : yr;
                if (!window._deSelectedYear && yr === activeYear) opt.selected = true;
                if (window._deSelectedYear === yr) opt.selected = true;
                sel.appendChild(opt);
            });
            if (!window._deSelectedYear) window._deSelectedYear = activeYear;
            sel.style.display = 'inline-block';
        } catch(e) {
            console.warn('Could not load donation years:', e);
        }
    }
`;

// Insert just before the closing </script> of the main script block
// Find the deLoadMyEntries function and insert before it
const LOAD_FN_MARKER = `    async function deLoadMyEntries() {`;
if (c.includes(LOAD_FN_MARKER)) {
    c = c.replace(LOAD_FN_MARKER, YEAR_FILTER_JS + '\n' + LOAD_FN_MARKER);
    console.log('✅ Inserted deLoadYearFilter function');
} else {
    console.log('❌ FAILED to find deLoadMyEntries function');
}

// ─── 4. Call deLoadYearFilter after login ─────────────────────────────────────
// Find where sections are shown after login / where deLoadMyEntries is first called on section show
const REFRESH_CALL = `        deLoadMyEntries();`;
// We need to call deLoadYearFilter() whenever the donation section is opened
// Find showSection or the place where donationEntry section is shown
const SECTION_SHOW_MARKER = `if (currentUser.role === 'volunteer_view') {`;
if (c.includes(SECTION_SHOW_MARKER)) {
    c = c.replace(
        SECTION_SHOW_MARKER,
        `deLoadYearFilter();\n            if (currentUser.role === 'volunteer_view') {`
    );
    console.log('✅ Added deLoadYearFilter() call after login');
} else {
    console.log('❌ FAILED to find volunteer_view role check for login hook');
}

fs.writeFileSync('dashboard.html', c);
console.log('\nDone patching dashboard.html');
