const fs = require('fs');
const html = fs.readFileSync('dashboard.html', 'utf8');

const regex = /<div id="([^"]+)" class="content-section"/g;
let match;
while ((match = regex.exec(html)) !== null) {
    console.log('Found section:', match[1]);
}
