const fs = require('fs');

const file = 'admin.html';
let content = fs.readFileSync(file, 'utf8');

// Use literal strings, or encode them so there is no mismatch
const map = {
    'ðŸ“…': '📅',
    'â­ ': '⭐',
    'â— ': '●',
    'ðŸ’°': '💰',
    'âœ…': '✅',
    'ðŸ”\x8D': '🔍',
    'ðŸ™\x8F': '🙏',
    'ðŸ“‹': '📋',
    'ðŸ‘¤': '👤',
    'ðŸ’³': '💳',
    'â†\x92': '→',
    'â€\x94': '—',
    'â”€': '─',
    'â‚¹': '&#x20B9;',
    'â˜\x91': '☑',
    'â•\x90': '═',
    'âœ\x8F': '✏',
    'âˆ\x92': '−',
    'â\x9D\x8C': '❌',
    'âš\xA0': '⚠',
    'â€”': '—',
    'â€“': '–'
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
