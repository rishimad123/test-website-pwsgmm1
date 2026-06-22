const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

for (let f of files) {
    let c = fs.readFileSync(f, 'utf8');
    if (!c.includes('rel="icon"')) {
        c = c.replace(/<\/head>/i, '    <link rel="icon" href="logo.png" type="image/png">\n</head>');
        fs.writeFileSync(f, c);
        console.log('Added favicon to ' + f);
    }
}
