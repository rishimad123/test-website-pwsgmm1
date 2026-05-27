const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');

// Find the Donation Tracking section HTML
const start = content.indexOf('<h4 style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">');
const end = content.indexOf('<!-- Balance Recovery & Soft Deletes Section -->');
if (start !== -1 && end !== -1) {
    let sectionHtml = content.substring(content.lastIndexOf('<div style="background:#fff;', start), end);
    fs.writeFileSync('tracking_section.html', sectionHtml, 'utf8');
    console.log('Extracted tracking section.');
} else {
    console.log('Failed to extract tracking section.');
}
