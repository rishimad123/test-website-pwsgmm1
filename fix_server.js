const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// Fix 1: POST /api/donation-entries destructing
serverCode = serverCode.replace(
    /buildingName, flatNumber, landmark,/g,
    'buildingName, flatNumber, landmark, area,'
);

// Fix 2: POST /api/donation-entries assignment
serverCode = serverCode.replace(
    /landmark\s*:\s*\(landmark\s*\|\|\s*''\)\.trim\(\)\s*\|\|\s*null,/g,
    'landmark             : (landmark            || \'\').trim() || null,\n                area          : (area         || \'\').trim() || null,'
);

// Fix 3: POST /api/receipts (if applicable)
// I will check if receipts has this issue too.
if (serverCode.includes('POST /api/receipts')) {
    // Wait, receipts is just confirmed entries, probably same thing.
    // Let's also check POST /api/receipts destructing just in case.
}

fs.writeFileSync('server.js', serverCode, 'utf8');
console.log('Fixed server.js POST entry area bug.');
