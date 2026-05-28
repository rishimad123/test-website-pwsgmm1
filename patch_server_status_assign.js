const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// For PautiBooks
serverJs = serverJs.replace(/paymentMode: slip\.paymentMode \|\| 'Cash',\s*status: slip\.status \|\| 'Received',/g, "paymentMode: slip.paymentMode || 'Cash',\n                        status: st,");

// For Receipts
serverJs = serverJs.replace(/paymentMode: r\.paymentMode \|\| 'Cash',\s*status: r\.status \|\| 'Received',/g, "paymentMode: r.paymentMode || 'Cash',\n                    status: st,");

fs.writeFileSync('server.js', serverJs);
console.log("Patched status assignments in merges");
