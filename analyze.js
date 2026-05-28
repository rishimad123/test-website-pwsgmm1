const fs = require('fs');
const c = fs.readFileSync('admin.html', 'utf8');

// Show the 600 chars before </main> to see the full context
const mainCloseIdx = c.lastIndexOf('</main>');
console.log('=== Context before </main> ===');
console.log(c.substring(mainCloseIdx - 600, mainCloseIdx + 10));
