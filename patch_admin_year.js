const fs = require('fs');
let c = fs.readFileSync('admin.html', 'utf8');
let changed = 0;

// 1. Insert Dropdown HTML
const OLD_SEARCH = '<input type="text" id="adeCardSearch" placeholder="🔍 Search donor, landmark…"';
const NEW_SELECT = `<select id="adeYearFilter" style="display:inline-block;padding:7px 10px;border:1.5px solid var(--primary-color);border-radius:8px;font-size:.85rem;font-weight:700;color:#fff;background:var(--primary-color);cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.12);" onchange="window._adeSelectedYear=this.value; adeLoad();" title="Filter by year"><option value="active">Active Year</option></select>\n                    `;

if (c.includes(OLD_SEARCH) && !c.includes('id="adeYearFilter"')) {
    c = c.replace(OLD_SEARCH, NEW_SELECT + OLD_SEARCH);
    changed++;
    console.log('✅ Inserted adeYearFilter HTML');
} else {
    console.log('⏭ adeYearFilter already exists or anchor not found');
}

// 2. Update adeLoad fetch
const OLD_FETCH = `fetch('/api/donation-entries'),`;
const NEW_FETCH = `fetch('/api/donation-entries?year=' + (window._adeSelectedYear || 'active')),`;

if (c.includes(OLD_FETCH)) {
    c = c.replace(OLD_FETCH, NEW_FETCH);
    changed++;
    console.log('✅ Updated adeLoad fetch');
} else {
    console.log('⏭ adeLoad fetch already updated or not found');
}

// 3. Add adeLoadYearFilter function
const YEAR_FILTER_JS = `
    // ─── Year Filter for Admin Data Entry ────────────────────────────────
    async function adeLoadYearFilter() {
        const sel = document.getElementById('adeYearFilter');
        if (!sel) return;
        sel.style.display = 'inline-block';
        try {
            const r = await fetch('/api/donation-years');
            const data = await r.json();
            if (!data.years || !data.years.length) return;
            sel.innerHTML = '';
            const activeYear = data.activeYear;
            // Add "All Years" option
            const allOpt = document.createElement('option');
            allOpt.value = 'all';
            allOpt.textContent = '📅 All Years';
            sel.appendChild(allOpt);
            
            data.years.forEach(yr => {
                const opt = document.createElement('option');
                opt.value = yr;
                opt.textContent = yr === activeYear ? '⭐ ' + yr + ' (Active)' : yr;
                if (!window._adeSelectedYear && yr === activeYear) opt.selected = true;
                if (window._adeSelectedYear === yr) opt.selected = true;
                sel.appendChild(opt);
            });
            if (!window._adeSelectedYear) window._adeSelectedYear = activeYear;
        } catch(e) {
            console.warn('Could not load donation years from API:', e);
            if (!window._adeSelectedYear) window._adeSelectedYear = 'active';
        }
    }
`;

const LOAD_FN_ANCHOR = `async function adeLoad() {`;
if (c.includes(LOAD_FN_ANCHOR) && !c.includes('async function adeLoadYearFilter()')) {
    c = c.replace(LOAD_FN_ANCHOR, YEAR_FILTER_JS + '\n    ' + LOAD_FN_ANCHOR);
    changed++;
    console.log('✅ Inserted adeLoadYearFilter function');
} else {
    console.log('⏭ adeLoadYearFilter already exists or anchor not found');
}

// 4. Update section hook
const OLD_HOOK = `if (id === 'donationEntries') adeLoad();`;
const NEW_HOOK = `if (id === 'donationEntries') { adeLoadYearFilter().then(() => adeLoad()); }`;

if (c.includes(OLD_HOOK)) {
    c = c.replace(OLD_HOOK, NEW_HOOK);
    changed++;
    console.log('✅ Updated section hook');
} else if (c.includes(`if (id === 'donationEntries') { adeLoadYearFilter()`)) {
    console.log('⏭ Section hook already updated');
} else {
    console.log('❌ Section hook anchor not found');
}

fs.writeFileSync('admin.html', c);
console.log(`\nDone – ${changed} fix(es) applied.`);
