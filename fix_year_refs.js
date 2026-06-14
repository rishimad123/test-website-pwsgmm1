const fs = require('fs');
let c = fs.readFileSync('dashboard.html', 'utf8');

let changed = 0;

// Fix 1: deLoadMyEntries fetch uses wrong variable (_adminSelectedYear -> _deSelectedYear)
const OLD_FETCH = `const res  = await fetch('/api/donation-entries?year=' + (window._adminSelectedYear || 'active'));`;
const NEW_FETCH = `const res  = await fetch('/api/donation-entries?year=' + (window._deSelectedYear || 'active'));`;
if (c.includes(OLD_FETCH)) {
    c = c.replace(OLD_FETCH, NEW_FETCH);
    changed++;
    console.log('✅ Fixed deLoadMyEntries fetch to use _deSelectedYear');
} else {
    console.log('⏭ deLoadMyEntries already using correct variable or not found');
}

// Fix 2: Call deLoadYearFilter when donationEntry section is opened
const OLD_SECTION_HOOK = `if (sectionId === 'donationEntry') { deLoadDropdowns(); deLoadMyEntries(); }`;
const NEW_SECTION_HOOK = `if (sectionId === 'donationEntry') { deLoadDropdowns(); deLoadYearFilter().then(() => deLoadMyEntries()); }`;
if (c.includes(OLD_SECTION_HOOK)) {
    c = c.replace(OLD_SECTION_HOOK, NEW_SECTION_HOOK);
    changed++;
    console.log('✅ Section hook updated to also call deLoadYearFilter');
} else {
    console.log('⏭ Section hook not found or already updated');
}

// Fix 3: Also fix the volunteer edit modal fetch (may still reference _adminSelectedYear)
const OLD_MODAL_FETCH = `fetch('/api/donation-entries?year=' + (window._adminSelectedYear || 'active')).then(r => r.json()).then(data => {`;
const NEW_MODAL_FETCH = `fetch('/api/donation-entries?year=' + (window._deSelectedYear || 'active')).then(r => r.json()).then(data => {`;
if (c.includes(OLD_MODAL_FETCH)) {
    c = c.replace(OLD_MODAL_FETCH, NEW_MODAL_FETCH);
    changed++;
    console.log('✅ Fixed volunteer edit modal fetch');
}

// Fix 4: The deLoadYearFilter login hook - it referenced volunteer_view check
// In patch_year_filter.js we inserted: deLoadYearFilter();\n before if (currentUser.role === 'volunteer_view')
// Let's confirm it's there
if (c.includes('deLoadYearFilter();')) {
    console.log('✅ deLoadYearFilter() call found in login hook');
} else {
    console.log('❌ deLoadYearFilter() call NOT found in login hook - attempting to add');
    const VOLUNTEER_VIEW_CHECK = `if (currentUser.role === 'volunteer_view') {`;
    if (c.includes(VOLUNTEER_VIEW_CHECK)) {
        c = c.replace(VOLUNTEER_VIEW_CHECK, `deLoadYearFilter();\n            if (currentUser.role === 'volunteer_view') {`);
        changed++;
        console.log('✅ Added deLoadYearFilter() call before volunteer_view check');
    }
}

fs.writeFileSync('dashboard.html', c);
console.log(`\nDone - ${changed} fix(es) applied.`);
