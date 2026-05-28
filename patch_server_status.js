const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const targetStr = "        let result = donationEntries.filter(e => !e.deleted);";
const replacementStr = `        function normalizeStatus(st, pm) {
            let s = String(st || '').toLowerCase().trim();
            if (s === 'undefined' || s === 'null' || s === '') {
                return String(pm || '').toLowerCase().trim() === 'balance' ? 'Balance' : 'Received';
            }
            return s.charAt(0).toUpperCase() + s.slice(1);
        }

        let result = donationEntries.filter(e => !e.deleted).map(e => ({
            ...e,
            status: normalizeStatus(e.status, e.paymentMode)
        }));`;

if (serverJs.includes(targetStr)) {
    serverJs = serverJs.replace(targetStr, replacementStr);
    
    // Also patch the pautiBooks merge logic so it also uses normalizeStatus safely
    const targetStr2 = "                const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();\\n                if (slip.uploadedAt && !slip.deleted && getStatus(slip) === 'received' && slip.amount && Number(slip.amount) > 0) {";
    
    // Actually let's just make the whole response normalized!
    
    fs.writeFileSync('server.js', serverJs);
    console.log('Patched server.js with normalizeStatus');
} else {
    console.log('Target string not found');
}
