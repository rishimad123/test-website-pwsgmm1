const fs = require('fs');
const h = fs.readFileSync('admin.html', 'utf8');
const start = h.indexOf('<div id="brPanelReceived"');
fs.writeFileSync('temp_r.html', h.substring(start, start + 3500));
