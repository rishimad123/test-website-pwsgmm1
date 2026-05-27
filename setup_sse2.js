const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const saveReceiptsOriginal = `async function saveReceipts() {
    await colReceipts.deleteMany({});
    if (receipts.length > 0) await colReceipts.insertMany(receipts.map(r => ({ ...r })));
}`;
const saveReceiptsModified = `async function saveReceipts() {
    await colReceipts.deleteMany({});
    if (receipts.length > 0) await colReceipts.insertMany(receipts.map(r => ({ ...r })));
    broadcastLiveEvent('donations_updated');
}`;
if (content.includes(saveReceiptsOriginal)) {
    content = content.replace(saveReceiptsOriginal, saveReceiptsModified);
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Successfully patched saveReceipts.');
} else {
    console.log('saveReceipts not found or already patched.');
}
