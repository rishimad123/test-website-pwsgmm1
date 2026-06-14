const fs = require('fs');

let c = fs.readFileSync('dashboard.html', 'utf8');

// Update line 2143 (Admin data refresh)
// fetch('/api/donation-entries'), -> fetch('/api/donation-entries?year=active'),
c = c.replace(/fetch\('\/api\/donation-entries'\),/g, "fetch('/api/donation-entries?year=' + (window._adminSelectedYear || 'active')),");

// Update line 3686 (Volunteer load my entries)
// const res  = await fetch('/api/donation-entries');
c = c.replace(/const res  = await fetch\('\/api\/donation-entries'\);/g, "const res  = await fetch('/api/donation-entries?year=' + (window._adminSelectedYear || 'active'));");

// Update line 3702 (Volunteer Edit Modal load)
// fetch('/api/donation-entries').then
c = c.replace(/fetch\('\/api\/donation-entries'\)\.then/g, "fetch('/api/donation-entries?year=' + (window._adminSelectedYear || 'active')).then");

// Update line 4191 (Volunteer load all entries for history)
// const url = uid ? `/api/donation-entries?userId=${encodeURIComponent(uid)}` : '/api/donation-entries';
c = c.replace(/const url = uid \? `\/api\/donation-entries\?userId=\$\{encodeURIComponent\(uid\)\}` : '\/api\/donation-entries';/g, "const activeParam = 'year=' + (window._adminSelectedYear || 'active');\n            const url = uid ? `/api/donation-entries?userId=${encodeURIComponent(uid)}&${activeParam}` : `/api/donation-entries?${activeParam}`;");

// Update line 4974 (Volunteer print summary)
// fetch("/api/donation-entries?userId="+(currentUser?currentUser.id:"")).then
c = c.replace(/fetch\("\/api\/donation-entries\?userId="\+\(currentUser\?currentUser\.id:""\)\)\.then/g, "fetch(\"/api/donation-entries?year=\"+(window._adminSelectedYear || 'active')+\"&userId=\"+(currentUser?currentUser.id:\"\")).then");


// ADD ADMIN YEAR SELECTOR UI
// We will add it inside the search bar container for Admin Donation Entries.
// "deSearchContainer" -> <select id="adminYearFilter" class="admin-input" style="margin-right:10px; padding:8px;" onchange="window._adminSelectedYear=this.value; deLoadMyEntries();"><option value="active">Active Year</option><option value="all">All Years</option></select>
if (!c.includes('adminYearFilter')) {
    c = c.replace(
        /<input type="text" id="deAllEntriesSearch" placeholder="Search entries..." class="search-input">/,
        `<select id="adminYearFilter" class="admin-input" style="margin-right:10px; padding:8px; border-radius:4px; border:1px solid #ddd; max-width:150px; display:none;" onchange="window._adminSelectedYear=this.value; deLoadMyEntries();">
            <option value="active">Active Year</option>
            <option value="all">All Years</option>
        </select>
        <input type="text" id="deAllEntriesSearch" placeholder="Search entries..." class="search-input">`
    );
    
    // Un-hide the dropdown if the user is admin
    // Inside deLoadMyEntries or login function, we can check.
    // We can add it to toggleAdminFeatures
    c = c.replace(
        /function toggleAdminFeatures\(isAdmin\) \{/,
        `function toggleAdminFeatures(isAdmin) {
        const yf = document.getElementById('adminYearFilter');
        if (yf) yf.style.display = isAdmin ? 'inline-block' : 'none';`
    );
}

fs.writeFileSync('dashboard.html', c);
console.log('Patched dashboard.html');
