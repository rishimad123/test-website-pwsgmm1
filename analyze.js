const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');

// Find where sidebar overlay is (this is outside the main content div)
const sidebarIdx = content.indexOf('<!-- Sidebar overlay for mobile -->');
console.log('Sidebar overlay at char:', sidebarIdx);

// Find the last content section before the sidebar overlay
const beforeSidebar = content.substring(0, sidebarIdx);
const sectionMatches = [...beforeSidebar.matchAll(/id="(\w+)" class="content-section"/g)];
console.log('Last 3 content sections before sidebar:', sectionMatches.slice(-3).map(m => m[1]));

// Check the current incorrect placement of tshirtSection
const tsIdx = content.indexOf('id="tshirtSection"');
console.log('tshirtSection at char:', tsIdx, '(sidebar at:', sidebarIdx, ')');
console.log('tshirtSection is AFTER sidebar:', tsIdx > sidebarIdx);
