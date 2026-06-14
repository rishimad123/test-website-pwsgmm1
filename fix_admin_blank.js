const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

// The broken line has a literal backslash-n instead of a real newline
// Fix: replace the literal \n text with actual newline
content = content.replace(
    /        <\/div>`;\s*\\n\s*document\.querySelector\('\.admin-content'\)\?\.appendChild\(section\);/,
    "        </div>`;\n        document.querySelector('.admin-content')?.appendChild(section);"
);

fs.writeFileSync('admin.html', content, 'utf8');
console.log('Fixed. Line count:', content.split('\n').length);
