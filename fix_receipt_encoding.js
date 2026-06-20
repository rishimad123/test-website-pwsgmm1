const fs = require('fs');

// The file contains triple-encoded UTF-8 Marathi
// Strategy: read as latin1, then convert each pair of latin1 chars back to original UTF-8 bytes
// The pattern: file bytes are the UTF-8 encoding of the mojibake string itself
// i.e. the original UTF-8 bytes for Marathi were treated as latin1, 
// then each byte was stored as UTF-8 chars of that byte value

// Read raw bytes
const raw = fs.readFileSync('admin.html');
const utf8str = raw.toString('utf8');

// The mojibake chars in the UTF-8 string are themselves latin1-encoded bytes of the original UTF-8
// We need to find the receipt section (lines 3666-3738) and fix only that section

// Approach: convert the bad section's chars back to bytes by treating each char as latin1,
// then decode the resulting bytes as utf8

function fixMojibake(str) {
    // Convert each character back to its byte value (latin1), then decode resulting byte array as utf8
    try {
        const bytes = Buffer.from(str, 'latin1');
        return bytes.toString('utf8');
    } catch(e) {
        return str; // return original if can't decode
    }
}

// We'll do this specifically for the receipt template section only
// Find the receipt template div and fix text nodes
// The bad strings all appear between lines 3666 and 3738

const lines = utf8str.split('\n');
let fixCount = 0;

// Lines that need fixing (0-indexed, so line 3666 = index 3665)
// We need to fix lines 3670-3738 (the receipt template)
// Plus label lines in the form (3602, 3607, 3612, 3622, 3627, 3634, 3635)

const RECEIPT_START = 3665; // 0-indexed (line 3666)
const RECEIPT_END   = 3740; // 0-indexed (line 3739)
const FORM_LINES    = [3601, 3606, 3611, 3621, 3626, 3633, 3634]; // form label lines

const targetLines = new Set();
for (let i = RECEIPT_START; i <= RECEIPT_END; i++) targetLines.add(i);
FORM_LINES.forEach(l => targetLines.add(l));

lines.forEach((line, idx) => {
    if (!targetLines.has(idx)) return;
    
    // Check if this line contains mojibake (contains à or Ã patterns)
    // Mojibake Marathi looks like: à¤ or à¥ sequences in utf8
    if (!line.includes('à¤') && !line.includes('à¥')) return;
    
    // Extract text content between > and < tags and fix them
    const fixed = line.replace(/(?<=>)([^<]+)(?=<)/g, (match) => {
        if (!match.includes('à¤') && !match.includes('à¥')) return match;
        // This text is mojibake: treat each char as latin1 byte, decode as utf8
        const decoded = fixMojibake(match.trim());
        // Only replace if decoding produced valid Marathi (contains Devanagari range U+0900-U+097F)
        if (/[\u0900-\u097F\u0966-\u096F]/.test(decoded)) {
            fixCount++;
            return match.replace(match.trim(), decoded);
        }
        return match;
    });
    
    if (fixed !== line) {
        lines[idx] = fixed;
    }
});

// Also fix the other receipt area (line 4512 area)
for (let idx = 4505; idx < 4525; idx++) {
    if (idx >= lines.length) break;
    const line = lines[idx];
    if (!line.includes('à¤') && !line.includes('à¥')) continue;
    const fixed = line.replace(/(?<=>)([^<]+)(?=<)/g, (match) => {
        if (!match.includes('à¤') && !match.includes('à¥')) return match;
        const decoded = fixMojibake(match.trim());
        if (/[\u0900-\u097F\u0966-\u096F]/.test(decoded)) {
            fixCount++;
            return match.replace(match.trim(), decoded);
        }
        return match;
    });
    if (fixed !== line) lines[idx] = fixed;
}

const result = lines.join('\n');
fs.writeFileSync('admin.html', result, 'utf8');
console.log('Fixed', fixCount, 'text segments');

// Verify: show what the lines look like now
console.log('\nSample lines after fix:');
[3669, 3670, 3675, 3676, 3686, 3687, 3692, 3699].forEach(lineNo => {
    console.log('Line', lineNo+1, ':', lines[lineNo].trim().substring(0, 100));
});
