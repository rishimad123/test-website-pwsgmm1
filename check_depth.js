const fs = require('fs');
const c = fs.readFileSync('dashboard.html', 'utf8');
const lines = c.split('\n');
let start = -1;
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('id="donationEntry"')) { start = i; break; }
}
if(start !== -1) {
    let depth = 0;
    for(let i=start; i<lines.length; i++) {
        let divOpens = (lines[i].match(/<div[^>]*>/g) || []).length;
        let divCloses = (lines[i].match(/<\/div>/g) || []).length;
        depth += divOpens;
        depth -= divCloses;
        if(depth <= 0 && i > start) {
            console.log('donationEntry div closed at line', i+1);
            console.log('Line content:', lines[i].substring(0, 100));
            break;
        }
    }
}
