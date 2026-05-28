const fs = require('fs');
let styleCss = fs.readFileSync('style.css', 'utf8');

const btnPrimaryRegex = /\.btn-primary\s*\{[^}]*\}/;
const newBtnPrimary = `.btn-primary {
    background: var(--primary-color);
    color: var(--white);
    box-shadow: 0 4px 15px rgba(255, 179, 0, 0.4);
    border: 1px solid var(--secondary-color);
}`;

const btnPrimaryHoverRegex = /\.btn-primary:hover\s*\{[^}]*\}/;
const newBtnPrimaryHover = `.btn-primary:hover {
    background: var(--secondary-color);
    color: var(--dark-color);
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(255, 179, 0, 0.6);
}`;

styleCss = styleCss.replace(btnPrimaryRegex, newBtnPrimary);
styleCss = styleCss.replace(btnPrimaryHoverRegex, newBtnPrimaryHover);

fs.writeFileSync('style.css', styleCss);
console.log('Updated button styles');
