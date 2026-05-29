const fs = require('fs');

function fixSyntax(filename) {
    let content = fs.readFileSync(filename, 'utf8');
    
    // Replace \` with `
    content = content.replace(/\\`/g, '`');
    // Replace \${ with ${
    content = content.replace(/\\\$\{/g, '${');
    
    fs.writeFileSync(filename, content, 'utf8');
    console.log(`Fixed syntax in ${filename}`);
}

fixSyntax('dashboard.html');
fixSyntax('admin.html');
