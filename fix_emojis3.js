const fs = require('fs');

const file = 'admin.html';
let content = fs.readFileSync(file, 'utf8');

const map = {
    'â†’': '→',
    'â†\x90': '←',
    'â€\x9D': '"',
    'â€œ': '"',
    'â˜°': '☰',
    'â€¦': '...',
    'âˆ’': '−',
    'â\x9DŒ': '❌',
    'â­\x90': '⭐',
    'â”\x81': '━',
    'â‚¹': '&#x20B9;'
};

let count = 0;
for (const [bad, good] of Object.entries(map)) {
    if (content.includes(bad)) {
        const c = content.split(bad).length - 1;
        content = content.split(bad).join(good);
        console.log(`Replaced ${c} of [${bad}] with ${good}`);
        count += c;
    }
}

if (count > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed ' + file);
} else {
    console.log('No targets found in ' + file);
}
