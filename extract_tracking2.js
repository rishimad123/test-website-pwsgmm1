const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');
const start = html.indexOf('<div id="donationTracking"');
const end = html.indexOf('<div id="balanceRecovery"');
fs.writeFileSync('tracking_section.html', html.substring(start, end));
console.log('Extracted to tracking_section.html');
