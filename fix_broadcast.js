const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const anchor = 'if (donationEntries.length > 0) await colDonationEntries.insertMany(donationEntries.map(e => ({ ...e })));';
if (s.includes(anchor) && !s.includes("broadcastLiveEvent('donations_updated');", s.indexOf(anchor))) {
    s = s.replace(anchor, anchor + "\n    broadcastLiveEvent('donations_updated');");
    fs.writeFileSync('server.js', s, 'utf8');
    console.log('Appended broadcast to saveDonationEntries');
} else {
    console.log('Failed or already appended');
}
