const fs = require('fs');
let c = fs.readFileSync('admin.js', 'utf8');

if (c.includes('applyReceiptFormat(data.receiptFormat')) {
    console.log('ALREADY PRESENT - no changes needed');
} else {
    c = c.replace('// About Section text', [
        '// Receipt Format',
        '        if (data && data.receiptFormat) {',
        '            applyReceiptFormat(data.receiptFormat, \'ui\');',
        '            applyReceiptFormat(data.receiptFormat, \'ade_rcg\');',
        '        }',
        '',
        '        // About Section text'
    ].join('\n'));
    fs.writeFileSync('admin.js', c);
    console.log('Patched admin.js successfully');
}
