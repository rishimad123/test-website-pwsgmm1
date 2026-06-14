const fs = require('fs');

let c = fs.readFileSync('admin.html', 'utf8');

// Patch 1: liveSync yearStr (ade_rcg_liveSync function)
const old1 = `        // Year from date
        var yearStr = '';
        var formattedDate = '';
        if (dateRaw) {
            var parts = dateRaw.split('-');
            if (parts.length === 3) {
                var yy = parts[0], mm = parts[1], dd = parts[2];
                formattedDate = dd + '/' + mm + '/' + yy;
                // Fiscal year e.g. 2025-26
                var yr = parseInt(yy, 10);
                var mo = parseInt(mm, 10);
                if (mo >= 4) {
                    yearStr = yr + '-' + String(yr + 1).slice(2);
                } else {
                    yearStr = (yr - 1) + '-' + String(yr).slice(2);
                }
            }
        }`;

const new1 = `        // Year from date (overridden by admin receipt format setting if set)
        var yearStr = '';
        var formattedDate = '';
        if (dateRaw) {
            var parts = dateRaw.split('-');
            if (parts.length === 3) {
                var yy = parts[0], mm = parts[1], dd = parts[2];
                formattedDate = dd + '/' + mm + '/' + yy;
                if (window._receiptYear) {
                    yearStr = window._receiptYear;
                } else {
                    // Fiscal year e.g. 2025-26
                    var yr = parseInt(yy, 10);
                    var mo = parseInt(mm, 10);
                    if (mo >= 4) {
                        yearStr = yr + '-' + String(yr + 1).slice(2);
                    } else {
                        yearStr = (yr - 1) + '-' + String(yr).slice(2);
                    }
                }
            }
        }`;

if (c.includes(old1)) {
    c = c.split(old1).join(new1);
    console.log('Patch 1 applied');
} else {
    console.log('Patch 1: target not found - trying normalised search...');
    // Try with \r\n
    const old1r = old1.replace(/\n/g, '\r\n');
    const new1r = new1.replace(/\n/g, '\r\n');
    if (c.includes(old1r)) {
        c = c.split(old1r).join(new1r);
        console.log('Patch 1 applied (CRLF)');
    } else {
        console.error('Patch 1 FAILED');
    }
}

// Patch 2: _uploadReceiptPreview yearStr
const old2 = `      var dateStr = '', yearStr = '';\r\n      if (dateRaw) {\r\n          var dp = dateRaw.split('-');\r\n          dateStr = (dp[2]||'') + '/' + (dp[1]||'') + '/' + (dp[0]||'');\r\n          var yr = parseInt(dp[0], 10), mo = parseInt(dp[1], 10);\r\n          yearStr = mo >= 4 ? yr + '-' + String(yr+1).slice(2) : (yr-1) + '-' + String(yr).slice(2);\r\n      }`;
const new2 = `      var dateStr = '', yearStr = '';\r\n      if (dateRaw) {\r\n          var dp = dateRaw.split('-');\r\n          dateStr = (dp[2]||'') + '/' + (dp[1]||'') + '/' + (dp[0]||'');\r\n          if (window._receiptYear) {\r\n              yearStr = window._receiptYear;\r\n          } else {\r\n              var yr = parseInt(dp[0], 10), mo = parseInt(dp[1], 10);\r\n              yearStr = mo >= 4 ? yr + '-' + String(yr+1).slice(2) : (yr-1) + '-' + String(yr).slice(2);\r\n          }\r\n      }`;

const old2b = `      var dateStr = '', yearStr = '';\n      if (dateRaw) {\n          var dp = dateRaw.split('-');\n          dateStr = (dp[2]||'') + '/' + (dp[1]||'') + '/' + (dp[0]||'');\n          var yr = parseInt(dp[0], 10), mo = parseInt(dp[1], 10);\n          yearStr = mo >= 4 ? yr + '-' + String(yr+1).slice(2) : (yr-1) + '-' + String(yr).slice(2);\n      }`;
const new2b = `      var dateStr = '', yearStr = '';\n      if (dateRaw) {\n          var dp = dateRaw.split('-');\n          dateStr = (dp[2]||'') + '/' + (dp[1]||'') + '/' + (dp[0]||'');\n          if (window._receiptYear) {\n              yearStr = window._receiptYear;\n          } else {\n              var yr = parseInt(dp[0], 10), mo = parseInt(dp[1], 10);\n              yearStr = mo >= 4 ? yr + '-' + String(yr+1).slice(2) : (yr-1) + '-' + String(yr).slice(2);\n          }\n      }`;

if (c.includes(old2)) {
    c = c.split(old2).join(new2);
    console.log('Patch 2 applied (CRLF)');
} else if (c.includes(old2b)) {
    c = c.split(old2b).join(new2b);
    console.log('Patch 2 applied (LF)');
} else {
    console.error('Patch 2 FAILED - target not found');
}

fs.writeFileSync('admin.html', c);
console.log('Done.');
