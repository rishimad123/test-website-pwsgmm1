const fs = require('fs');

// Fix dashboard.html - completely different approach
// 1. Remove the current incorrect tshirtSection placement 
// 2. Add a CORRECT sidebar link using showSection (dashboard uses showSection not showVolunteerSection)
// 3. Add tshirtSection div right BEFORE </body>  ... but wait, it needs to be inside .content-area
//    Let's find the last content-section div and add after it.

let content = fs.readFileSync('dashboard.html', 'utf8');

// ---- STEP 1: Remove current broken tshirtSection ----
// It appears embedded in the template literal mess. Remove it cleanly.
content = content.replace(/\s*<!--\s*T-Shirt Section\s*-->\s*\n?\s*<div id="tshirtSection" class="content-section"><\/div>\s*\n?/g, '\n');
content = content.replace(/<div id="tshirtSection" class="content-section"><\/div>/g, '');

console.log('After cleanup, tshirtSection present?', content.includes('id="tshirtSection"'));

// ---- STEP 2: Find a good anchor - the balanceRecovery section closing </div> ----
// We know balanceRecovery is the last real content-section in dashboard.html
// Find: id="balanceRecovery" class="content-section"
const brStart = content.indexOf('id="balanceRecovery" class="content-section"');
if (brStart === -1) {
    console.error('Could not find balanceRecovery section!');
    process.exit(1);
}

// Walk forward counting divs to find the closing </div> of balanceRecovery
let depth = 0;
let i = brStart;
let foundClose = -1;
while (i < content.length) {
    if (content[i] === '<') {
        if (content.startsWith('<div', i)) {
            depth++;
            i += 4;
            continue;
        } else if (content.startsWith('</div>', i)) {
            depth--;
            if (depth === 0) {
                foundClose = i + 6;
                break;
            }
            i += 6;
            continue;
        }
    }
    i++;
}

if (foundClose === -1) {
    console.error('Could not find closing tag of balanceRecovery');
    process.exit(1);
}

// Insert tshirtSection after balanceRecovery closing div
const tshirtDiv = `

                <!-- ══════════ T-SHIRT SECTION ══════════ -->
                <div id="tshirtSection" class="content-section"></div>
`;
content = content.substring(0, foundClose) + tshirtDiv + content.substring(foundClose);
console.log('Inserted tshirtSection after balanceRecovery');

// ---- STEP 3: Add sidebar link if missing ----
if (!content.includes("showSection('tshirtSection')")) {
    // Find the balanceRecovery link in sidebar
    const brLink = content.indexOf("showSection('balanceRecovery')");
    if (brLink !== -1) {
        // Find the <li> start before this
        const liStart = content.lastIndexOf('<li>', brLink);
        // Find the </li> end
        const liEnd = content.indexOf('</li>', brLink) + 5;
        const tshirtLink = `
                <li><a href="#tshirtSection" onclick="showSection('tshirtSection');closeSidebar()">
                    <i class="fas fa-tshirt"></i> T-shirt Section
                </a></li>`;
        content = content.substring(0, liEnd) + tshirtLink + content.substring(liEnd);
        console.log('Added T-shirt sidebar link after balanceRecovery link');
    }
}

fs.writeFileSync('dashboard.html', content, 'utf8');

// ---- STEP 4: Verify ----
const final = fs.readFileSync('dashboard.html', 'utf8');
const tsIdx = final.indexOf('id="tshirtSection"');
console.log('tshirtSection found?', tsIdx !== -1);
console.log('Sidebar link added?', final.includes("showSection('tshirtSection')"));
