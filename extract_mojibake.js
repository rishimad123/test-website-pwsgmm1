const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');

// Extract the receipt template section and show each line's exact content
const lines = content.split('\n');
console.log('=== EXACT MOJIBAKE STRINGS IN RECEIPT TEMPLATE ===\n');
for (let i = 3668; i <= 3740; i++) {
    const l = lines[i];
    if (l && (l.includes('\u00e0') || l.includes('\u00c3'))) {
        // Extract text between > and <
        const matches = l.match(/>([^<]+)</g);
        if (matches) {
            matches.forEach(m => {
                const text = m.slice(1, -1).trim();
                if (text && (text.includes('\u00e0') || text.includes('\u00c3') || text.includes('\u00a4'))) {
                    console.log('Line', i+1, ':', JSON.stringify(text));
                }
            });
        }
    }
}

// Also check form labels
console.log('\n=== FORM LABEL MOJIBAKE ===\n');
for (let i = 3598; i <= 3640; i++) {
    const l = lines[i];
    if (l && l.includes('\u00e0')) {
        const matches = l.match(/>([^<]+)</g);
        if (matches) {
            matches.forEach(m => {
                const text = m.slice(1, -1).trim();
                if (text && text.includes('\u00e0')) {
                    console.log('Line', i+1, ':', JSON.stringify(text));
                }
            });
        }
    }
}
