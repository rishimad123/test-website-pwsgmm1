const fs = require('fs');

// 1. Fix index.html
let html = fs.readFileSync('index.html', 'utf8');

const regex = /<div class="countdown" id="countdown">([\s\S]*?)<div class="hero-scroll">/;
const replacement = `<div class="countdown" id="countdown">$1<div class="hero-buttons">
                <a href="gallery.html" class="hero-btn-primary">
                    <i class="fas fa-images"></i> View Gallery
                </a>
                <a id="socialInstagramLink" href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" class="hero-btn-secondary">
                    <i class="fab fa-instagram"></i> Instagram
                </a>
            </div>
        </div>

        <!-- Scroll indicator -->
        <div class="hero-scroll">`;

html = html.replace(regex, replacement);
fs.writeFileSync('index.html', html);
console.log('index.html fixed');

// 2. Patch main.js to update all instances of the same ID
let js = fs.readFileSync('main.js', 'utf8');

const oldJs = `        const applySocialLink = (id, url) => {
            const formattedUrl = formatUrl(url);
            if (!formattedUrl) return;
            // Try by ID first (fastest, most reliable)
            let el = document.getElementById(id);
            if (!el) {
                // Fallback: find by icon class inside .social-links
                const iconClass = {
                    socialFacebookLink: 'fa-facebook',
                    socialInstagramLink: 'fa-instagram',
                    socialYoutubeLink: 'fa-youtube',
                    socialTwitterLink: 'fa-twitter'
                }[id];
                const icon = document.querySelector(\`.social-links a i.\${iconClass}\`);
                el = icon ? icon.parentElement : null;
            }
            if (el) {
                el.href = formattedUrl;
                el.target = '_blank';
                el.rel = 'noopener noreferrer';
            }
        };`;

const newJs = `        const applySocialLink = (id, url) => {
            const formattedUrl = formatUrl(url);
            if (!formattedUrl) return;
            
            // Try by ID attribute selector to get multiple matching elements
            const els = document.querySelectorAll(\`[id="\${id}"]\`);
            els.forEach(el => {
                el.href = formattedUrl;
                el.target = '_blank';
                el.rel = 'noopener noreferrer';
            });
            
            // Fallback if none found by ID
            if (els.length === 0) {
                const iconClass = {
                    socialFacebookLink: 'fa-facebook',
                    socialInstagramLink: 'fa-instagram',
                    socialYoutubeLink: 'fa-youtube',
                    socialTwitterLink: 'fa-twitter'
                }[id];
                const icon = document.querySelector(\`.social-links a i.\${iconClass}\`);
                const el = icon ? icon.parentElement : null;
                if (el) {
                    el.href = formattedUrl;
                    el.target = '_blank';
                    el.rel = 'noopener noreferrer';
                }
            }
        };`;

if (js.includes(oldJs)) {
    js = js.replace(oldJs, newJs);
    fs.writeFileSync('main.js', js);
    console.log('main.js patched (CRLF/LF match)');
} else {
    // Try without exact whitespace
    const oldJsR = oldJs.replace(/\r\n/g, '\n');
    if (js.includes(oldJsR)) {
        js = js.replace(oldJsR, newJs);
        fs.writeFileSync('main.js', js);
        console.log('main.js patched (LF match)');
    } else {
        console.error('Could not find applySocialLink block in main.js');
    }
}
