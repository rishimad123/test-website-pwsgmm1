const fs = require('fs');
let c = fs.readFileSync('dashboard.html', 'utf8');
let changed = 0;

// ─── Fix deLoadYearFilter to show the dropdown even if API returns only 1 year ───
const OLD_FN = `    // ─── Year Filter for Donation Data Entry ────────────────────────────────
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
    }`;

const NEW_FN = `    // ─── Year Filter for Donation Data Entry ────────────────────────────────
    async function deLoadYearFilter() {
        const roles = ['admin', 'volunteer_full', 'volunteer_full_tshirt'];
        const sel = document.getElementById('deYearFilter');
        if (!sel) return;
        if (!currentUser || !roles.includes(currentUser.role)) {
            sel.style.display = 'none';
            return;
        }
        // Always show the dropdown for eligible roles – even before API response
        sel.style.display = 'inline-block';
        try {
            const r = await fetch('/api/donation-years');
            const data = await r.json();
            if (!data.years || !data.years.length) return;
            sel.innerHTML = '';
            const activeYear = data.activeYear;
            // Add an "All Years" option at the top for admins
            if (currentUser.role === 'admin') {
                const allOpt = document.createElement('option');
                allOpt.value = 'all';
                allOpt.textContent = '📅 All Years';
                sel.appendChild(allOpt);
            }
            data.years.forEach(yr => {
                const opt = document.createElement('option');
                opt.value = yr;
                opt.textContent = yr === activeYear ? '⭐ ' + yr + ' (Active)' : yr;
                if (!window._deSelectedYear && yr === activeYear) opt.selected = true;
                if (window._deSelectedYear === yr) opt.selected = true;
                sel.appendChild(opt);
            });
            if (!window._deSelectedYear) window._deSelectedYear = activeYear;
        } catch(e) {
            // Even if API fails, keep showing with default "Active Year" option
            console.warn('Could not load donation years from API:', e);
            if (!window._deSelectedYear) window._deSelectedYear = 'active';
        }
    }`;

if (c.includes(OLD_FN)) {
    c = c.replace(OLD_FN, NEW_FN);
    changed++;
    console.log('✅ Replaced deLoadYearFilter with robust version');
} else {
    console.log('⚠️  Could not find exact deLoadYearFilter – attempting partial match');
    if (c.includes('async function deLoadYearFilter()')) {
        // Try to replace just the function body
        const start = c.indexOf('async function deLoadYearFilter()');
        const end = c.indexOf('\n    }', start) + '\n    }'.length;
        c = c.substring(0, c.indexOf('// ─── Year Filter')) + NEW_FN + c.substring(end);
        changed++;
        console.log('✅ Replaced via partial match');
    }
}

// ─── Also make sure the select is styled better ───
const OLD_SELECT = 'style="display:none;padding:6px 10px;border:1.5px solid var(--primary-color);border-radius:8px;font-size:.82rem;font-weight:600;color:var(--primary-color);background:#fff;cursor:pointer;"';
const NEW_SELECT = 'style="display:none;padding:6px 10px;border:1.5px solid var(--primary-color);border-radius:8px;font-size:.82rem;font-weight:700;color:#fff;background:var(--primary-color);cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.12);"';

if (c.includes(OLD_SELECT)) {
    c = c.replace(OLD_SELECT, NEW_SELECT);
    changed++;
    console.log('✅ Updated dropdown styling to be more prominent');
}

fs.writeFileSync('dashboard.html', c);
console.log(`\nDone – ${changed} fix(es) applied.`);
