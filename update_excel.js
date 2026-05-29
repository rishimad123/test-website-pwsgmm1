const fs = require('fs');

function addExcelBookType(file) {
    let content = fs.readFileSync(file, 'utf8');
    const oldExport = /'Book Number': e\.bookNumber \|\| '',\r?\n\s*'Receipt Number': e\.receiptNumber \|\| '',/;
    const newExport = `'Book Number': e.bookNumber || '',\n            'Book Type': e.bookType || 'New',\n            'Receipt Number': e.receiptNumber || '',`;
    content = content.replace(oldExport, newExport);
    fs.writeFileSync(file, content, 'utf8');
}

addExcelBookType('admin.js');
addExcelBookType('dashboard.html');
console.log('Excel export updated!');
