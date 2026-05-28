const fs = require('fs');

function fixPlacement(filename) {
    let content = fs.readFileSync(filename, 'utf8');

    // 1. Remove ALL existing incorrectly-placed tshirtSection divs
    //    They appear after the <!-- Sidebar overlay for mobile --> comment
    content = content.replace(/\s*<!--\s*T-Shirt Section\s*-->\s*\n\s*<div id="tshirtSection" class="content-section"><\/div>\s*\n/g, '\n');
    content = content.replace(/\s*<div id="tshirtSection" class="content-section"><\/div>\s*\n/g, '\n');

    // 2. Verify tshirtSection is gone
    if (content.includes('id="tshirtSection"')) {
        console.error(filename + ': WARNING - tshirtSection still found after removal attempt');
    } else {
        console.log(filename + ': tshirtSection successfully removed from incorrect position');
    }

    // 3. Find the closing </div> of the 'events' content section
    //    The events section starts with: id="events" class="content-section"
    //    We need to find its closing </div> and insert our new section after it.
    //    Since sections are siblings at the same level, we find the events section div
    //    and append after the next top-level closing </div>

    const eventsStart = content.indexOf('id="events" class="content-section"');
    if (eventsStart === -1) {
        console.error(filename + ': Could not find events section!');
        return;
    }

    // Walk forward counting div opens/closes to find closing of the events section
    let depth = 0;
    let i = eventsStart;
    let foundClose = -1;
    while (i < content.length) {
        if (content.startsWith('<div', i)) {
            depth++;
            i += 4;
        } else if (content.startsWith('</div>', i)) {
            depth--;
            if (depth === 0) {
                foundClose = i + 6; // position after the closing </div>
                break;
            }
            i += 6;
        } else {
            i++;
        }
    }

    if (foundClose === -1) {
        console.error(filename + ': Could not find closing of events section');
        return;
    }

    const newSectionHTML = `\n\n                <!-- ══════════ T-SHIRT SECTION ══════════ -->\n                <div id="tshirtSection" class="content-section"></div>\n`;

    content = content.substring(0, foundClose) + newSectionHTML + content.substring(foundClose);
    console.log(filename + ': Inserted tshirtSection correctly after events section');

    fs.writeFileSync(filename, content, 'utf8');
}

fixPlacement('admin.html');
fixPlacement('dashboard.html');

console.log('\nDone! Verifying...');

['admin.html', 'dashboard.html'].forEach(f => {
    const c = fs.readFileSync(f, 'utf8');
    const sidebarIdx = c.indexOf('<!-- Sidebar overlay for mobile -->');
    const tsIdx = c.indexOf('id="tshirtSection"');
    if (tsIdx === -1) {
        console.log(f + ': ERROR - tshirtSection not found!');
    } else if (sidebarIdx !== -1 && tsIdx > sidebarIdx) {
        console.log(f + ': ERROR - tshirtSection is still AFTER sidebar overlay!');
    } else {
        console.log(f + ': OK - tshirtSection is correctly placed inside content area');
    }
});
