const fs = require('fs');
let c = fs.readFileSync('dashboard.html', 'utf8');

// Detect line ending
const CRLF = c.includes('\r\n');
const NL = CRLF ? '\r\n' : '\n';
console.log('Line ending:', CRLF ? 'CRLF' : 'LF');

// Add dropdown before the search input
// The pattern we are looking for is the search input line
const SEARCH_INPUT_TAG = '<input type="text" id="deAllEntriesSearch"';

if (!c.includes('id="deYearFilter"') && c.includes(SEARCH_INPUT_TAG)) {
    const YEAR_SELECT = `<select id="deYearFilter" style="display:none;padding:6px 10px;border:1.5px solid var(--primary-color);border-radius:8px;font-size:.82rem;font-weight:600;color:var(--primary-color);background:#fff;cursor:pointer;" onchange="window._deSelectedYear=this.value; deLoadMyEntries();" title="Filter by year"><option value="active">Active Year</option></select>${NL}                                `;
    // Insert before the search input
    c = c.replace(SEARCH_INPUT_TAG, YEAR_SELECT + SEARCH_INPUT_TAG);
    console.log('✅ Year filter dropdown inserted before search input');
} else if (c.includes('id="deYearFilter"')) {
    console.log('⏭ Year filter already present, skipping HTML insert');
} else {
    console.log('❌ Could not find deAllEntriesSearch input tag');
}

fs.writeFileSync('dashboard.html', c);
console.log('Done.');
