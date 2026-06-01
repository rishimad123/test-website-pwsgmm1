const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// Update border radius of buttons
css = css.replace(/border-radius: 50px;/g, 'border-radius: 12px;');

// Update stat card border radius and shadow to be more refined
css = css.replace(/border-radius: 15px;/g, 'border-radius: 16px;');

// Update card shadows to be softer
css = css.replace(/box-shadow: 0 5px 15px rgba\(0,0,0,0\.1\);/g, 'box-shadow: var(--shadow);');
css = css.replace(/box-shadow: 0 10px 30px rgba\(0,0,0,0\.15\);/g, 'box-shadow: var(--shadow-lg);');

// The about image box shadow
css = css.replace(/box-shadow: var\(--shadow-lg\);/g, 'box-shadow: var(--shadow-lg); border-radius: 16px;');

// Also fix any hardcoded #FF6B35 or #2C3E50 or #8B0000 in inline HTML files
fs.writeFileSync('style.css', css, 'utf8');
console.log('style.css updated.');
