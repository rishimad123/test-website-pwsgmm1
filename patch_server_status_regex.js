const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

let pautiRegex = /const getStatus = s => \(s\.status \|\| \(String\(s\.paymentMode\)\.toLowerCase\(\) === 'balance' \? 'Balance' : 'Received'\)\)\.toLowerCase\(\);\s*if \(slip\.uploadedAt && !slip\.deleted && getStatus\(slip\) === 'received' && slip\.amount && Number\(slip\.amount\) > 0\) \{/g;
let pautiReplacement = `const st = normalizeStatus(slip.status, slip.paymentMode);
                if (slip.uploadedAt && !slip.deleted && st.toLowerCase() === 'received' && slip.amount && Number(slip.amount) > 0) {`;

if (pautiRegex.test(serverJs)) {
    serverJs = serverJs.replace(pautiRegex, pautiReplacement);
    console.log("Patched pautiBooks getStatus");
} else {
    console.log("Failed to find pautiBooks getStatus");
}

let rcRegex = /const getStatus = s => \(s\.status \|\| \(String\(s\.paymentMode\|\|s\.type\)\.toLowerCase\(\) === 'balance' \? 'Balance' : 'Received'\)\)\.toLowerCase\(\);\s*if \(!r\.deleted && getStatus\(r\) === 'received'\) \{/g;
let rcReplacement = `const st = normalizeStatus(r.status, r.paymentMode || r.type);
            if (!r.deleted && st.toLowerCase() === 'received') {`;

if (rcRegex.test(serverJs)) {
    serverJs = serverJs.replace(rcRegex, rcReplacement);
    console.log("Patched receipts getStatus");
} else {
    console.log("Failed to find receipts getStatus");
}

let slipStatusRegex = /status: slip\.status \|\| 'Received',/g;
let slipStatusReplacement = `status: st,`;
if (slipStatusRegex.test(serverJs)) {
    // Only replace the one inside the pautiBooks block we just modified
    // So let's use a more targeted approach.
}

// Actually, I can just write a script that injects the function and modifies the result map.
// I will just re-run the FIRST patch script which worked perfectly.
