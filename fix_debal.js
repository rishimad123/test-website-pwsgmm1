const fs = require('fs');

let adminJs = fs.readFileSync('admin.js', 'utf8');

// The replacement for deBal
const targetStart = "const deBal = (deData.entries || []).filter(e =>";
const targetEnd = ").map(e => {";
const startIdx = adminJs.indexOf(targetStart);
const endIdx = adminJs.indexOf(targetEnd, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const originalBlock = adminJs.substring(startIdx, endIdx + targetEnd.length);
    console.log("Found block to replace");
    
    const newBlock = `const deBal = (deData.entries || []).filter(e => {
            const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
            return e.paymentMode && String(e.paymentMode).toLowerCase() === 'balance' && !e.deleted && getStatus(e) !== 'received';
        }).map(e => {`;
    
    adminJs = adminJs.replace(originalBlock, newBlock);
    fs.writeFileSync('admin.js', adminJs);
    console.log("admin.js deBal fixed.");
} else {
    console.log("Block not found.");
}
