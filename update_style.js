const fs = require('fs');
let styleCss = fs.readFileSync('style.css', 'utf8');

// 1. Add Google Fonts Import
if (!styleCss.includes('@import url')) {
    styleCss = "@import url('https://fonts.googleapis.com/css2?family=Rozha+One&family=Poppins:wght@300;400;500;600;700&display=swap');\n" + styleCss;
}

// 2. Add SVG Pattern to body
// A simple traditional mandala/flower pattern
const svgPattern = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e65100' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

const bodyRegex = /body\s*\{[^}]*\}/;
const newBody = `body {
    font-family: 'Poppins', sans-serif;
    line-height: 1.6;
    color: var(--dark-color);
    background-color: var(--bg-color);
    background-image: url("${svgPattern}");
    overflow-x: hidden;
}`;
styleCss = styleCss.replace(bodyRegex, newBody);

// 3. Add Heading Font
const headingRules = `
h1, h2, h3, .logo {
    font-family: 'Rozha One', serif;
}
`;
if (!styleCss.includes('Rozha One')) {
    styleCss += headingRules;
}

// 4. Update Hero Section Gradient
const heroRegex = /background: linear-gradient\(135deg,\s*var\(--primary-color\),\s*var\(--accent-color\)\);/;
const newHero = `background: radial-gradient(circle at center, var(--primary-color) 0%, var(--accent-color) 100%);`;
styleCss = styleCss.replace(heroRegex, newHero);

fs.writeFileSync('style.css', styleCss);
console.log('Updated style.css with typography, background pattern, and rich hero section');
