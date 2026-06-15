const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// ------------------------------------------------------------------
// 1. Find and fix the broken @media (max-width: 380px) block.
//    The block is missing its closing brace and several rules.
//    It currently looks like:
//      @media (max-width: 380px) {
//          .stat-card { padding: 14px 10px; }
//      [blank lines]
//    [next content: /* --- Theme Classes --- */]
// ------------------------------------------------------------------

const MARKER = '    .stat-card        { padding: 14px 10px; }';
const idx = css.indexOf(MARKER);
if (idx === -1) {
    console.error('ERROR: Could not find the marker in style.css');
    process.exit(1);
}

// Find what comes right after the marker
const afterMarker = css.slice(idx + MARKER.length);
console.log('Content after marker (first 120 chars):', JSON.stringify(afterMarker.slice(0, 120)));

// Insert the missing rules + closing brace right after the marker,
// then clip out all the blank lines before /* --- Theme Classes --- */
const missingRules = '\r\n    .btn              { padding: 12px 20px; font-size: 0.88rem; }\r\n    .logo span        { max-width: 140px; font-size: 0.78rem; }\r\n    .gallery-grid     { grid-template-columns: repeat(2, 1fr); gap: 6px; }\r\n}\r\n\r\n/* ==================== ANIMATIONS ==================== */\r\n@keyframes fadeInUp {\r\n    from { opacity: 0; transform: translateY(30px); }\r\n    to   { opacity: 1; transform: translateY(0); }\r\n}\r\n\r\n@media (max-width: 768px) {\r\n    .hero { height: 70vh; }\r\n    .logo span { font-size: 1rem; }\r\n    .section-header h2 { font-size: 2rem; }\r\n    .stats { padding: 40px 0; }\r\n}\r\n\r\n';

// Rebuild: everything up-to-and-including the marker, + missingRules,
// + strip the blank-lines junk up to /* --- Theme Classes ---
const themeIdx = css.indexOf('/* --- Theme Classes ---');
if (themeIdx === -1) {
    console.error('ERROR: Could not find Theme Classes comment');
    process.exit(1);
}

const before = css.slice(0, idx + MARKER.length);
const after  = css.slice(themeIdx); // everything from /* --- Theme Classes onwards

const newCss = before + missingRules + after;
fs.writeFileSync('style.css', newCss);
console.log('Done! style.css rewritten. Size:', newCss.length);

// Quick sanity check
const check = newCss.indexOf('@media (max-width: 380px)');
const closing = newCss.indexOf('}', newCss.indexOf('.gallery-grid     { grid-template-columns: repeat(2, 1fr); gap: 6px; }'));
console.log('380px block present:', check !== -1);
console.log('Closing brace found after gallery-grid:', closing !== -1);
