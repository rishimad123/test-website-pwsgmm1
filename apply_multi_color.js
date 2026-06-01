const fs = require('fs');
const path = require('path');

// 1. Update style.css
let css = fs.readFileSync('style.css', 'utf8');

if (!css.includes('--theme-hero-1')) {
    css = css.replace(/:root\s*\{([\s\S]*?)\}/, `:root {$1
    /* Rich Sectional Colors */
    --theme-hero-1: #E86100;
    --theme-hero-2: #FF8C00;
    --theme-about-1: #1D4ED8;
    --theme-about-2: #3B82F6;
    --theme-events-1: #6D28D9;
    --theme-events-2: #8B5CF6;
    --theme-volunteers-1: #059669;
    --theme-volunteers-2: #10B981;
    --theme-admin-primary: #E11D48;
    --theme-admin-dark: #1E293B;
    --theme-vol-primary: #2563EB;
    --theme-vol-accent: #F97316;
}`);
}

// Add dynamic theme classes for sections to style.css
const themeClasses = `
/* --- Theme Classes --- */
.theme-hero { --primary-color: var(--theme-hero-1); --accent-color: var(--theme-hero-2); }
.theme-about { --primary-color: var(--theme-about-1); --accent-color: var(--theme-about-2); }
.theme-events { --primary-color: var(--theme-events-1); --accent-color: var(--theme-events-2); }
.theme-volunteers { --primary-color: var(--theme-volunteers-1); --accent-color: var(--theme-volunteers-2); }

.bg-gradient-hero { background: linear-gradient(135deg, var(--theme-hero-1), var(--theme-hero-2)); }
.bg-gradient-about { background: linear-gradient(135deg, var(--theme-about-1), var(--theme-about-2)); }
.bg-gradient-events { background: linear-gradient(135deg, var(--theme-events-1), var(--theme-events-2)); }
.bg-gradient-volunteers { background: linear-gradient(135deg, var(--theme-volunteers-1), var(--theme-volunteers-2)); }
`;

if (!css.includes('.theme-hero')) {
    css += '\n' + themeClasses;
}

fs.writeFileSync('style.css', css, 'utf8');
console.log('style.css updated with multi-color themes.');

// Helper to inject classes into specific HTML pages
function addClassToBodyOrSection(filename, themeClass) {
    if (fs.existsSync(filename)) {
        let content = fs.readFileSync(filename, 'utf8');
        if (!content.includes(themeClass)) {
            content = content.replace(/<body>/, `<body class="${themeClass}">`);
            // Specific fixes for inline hardcoded gradients
            content = content.replace(/background:\s*linear-gradient\(135deg,\s*var\(--primary-color\),\s*var\(--accent-color\)\);/g, `background: linear-gradient(135deg, var(--primary-color), var(--accent-color));`);
            fs.writeFileSync(filename, content, 'utf8');
            console.log(`Updated ${filename} with ${themeClass}`);
        }
    }
}

// 2. Standalone pages
addClassToBodyOrSection('about.html', 'theme-about');
addClassToBodyOrSection('committee.html', 'theme-about');
addClassToBodyOrSection('gallery.html', 'theme-events');
addClassToBodyOrSection('volunteers.html', 'theme-volunteers');
addClassToBodyOrSection('contact.html', 'theme-volunteers');
addClassToBodyOrSection('login.html', 'theme-hero'); // Default

// 3. index.html sections
if (fs.existsSync('index.html')) {
    let indexHtml = fs.readFileSync('index.html', 'utf8');
    
    // Add classes to sections if they don't have them
    indexHtml = indexHtml.replace(/<section class="stats">/, '<section class="stats theme-about">');
    indexHtml = indexHtml.replace(/<section class="about-preview container">/, '<section class="about-preview container theme-about">');
    indexHtml = indexHtml.replace(/<section class="events">/, '<section class="events theme-events">');
    indexHtml = indexHtml.replace(/<section class="gallery-preview container">/, '<section class="gallery-preview container theme-events">');
    
    // The hero section in index.html already uses var(--primary-color), var(--accent-color).
    // By wrapping body in theme-hero, it uses those. Or we just leave the root variables as hero colors.
    
    fs.writeFileSync('index.html', indexHtml, 'utf8');
    console.log('index.html sectional themes applied.');
}
