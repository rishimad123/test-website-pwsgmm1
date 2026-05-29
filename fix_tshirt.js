const fs = require('fs');

// ============================================================
// FIX 1: dashboard.html
// The tshirtSection div is nested INSIDE balanceRecovery div.
// balanceRecovery starts with display:none, so tshirtSection
// is always hidden even when showSection('tshirtSection') is called.
// Fix: Move tshirtSection OUT of balanceRecovery.
// ============================================================
let dashboard = fs.readFileSync('dashboard.html', 'utf8');

// The problem: after balanceRecovery's page-title, the tshirtSection starts
// We need to:
// 1. Remove the tshirtSection opening from inside balanceRecovery 
//    (the comment + the <div id="tshirtSection"> tag)
// 2. Close balanceRecovery properly before tshirtSection's big hardcoded block
// 3. The existing tshirt hardcoded block (with coordinators etc.) already ends with </div></div>
//    That block needs to be wrapped in a proper tshirtSection div OUTSIDE balanceRecovery

// The exact string that wrongly nests tshirt inside balance recovery
const wrongNesting = `                </div>

                <!-- ══════════ T-SHIRT SECTION ══════════ -->
                <div id="tshirtSection" class="content-section">
    <div style="padding:24px;">`;

const correctFixed = `                </div>
`;

if (!dashboard.includes(wrongNesting)) {
    console.log('ERROR: wrongNesting string not found in dashboard.html');
    console.log('Looking for the string around line 1488...');
    // Show the area
    const lines = dashboard.split('\n');
    for (let i = 1483; i < 1500; i++) {
        console.log(`${i+1}: ${JSON.stringify(lines[i])}`);
    }
    process.exit(1);
}

dashboard = dashboard.replace(wrongNesting, correctFixed);
console.log('Step 1 done: removed wrong tshirtSection nesting from inside balanceRecovery');

// Now find the end of the tshirt section hardcoded block and check if it's proper
// The tshirt block ends with:
// </div>
// </div>  <- closes the outer padding div
// </div>  <- closes tshirtSection
// Then immediately the balanceRecovery content continues
// We need to add a proper tshirtSection wrapper around the hardcoded block

// Find the hardcoded tshirt block - it starts with padding:24px after some LF
const tshirtBlockStart = `    <div style="padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px;">
            <div>
                <h2 style="color:#2c3e50;margin:0 0 4px;font-size:1.5rem;">&#128248; T-shirt Section</h2>
                <p style="color:#777;margin:0;font-size:.9rem;">Manage T-shirt applications and size summaries</p>
            </div>
        </div>`;

if (!dashboard.includes(tshirtBlockStart)) {
    console.log('ERROR: tshirtBlockStart not found');
    process.exit(1);
}

// Replace just the start to add the wrapper div
const tshirtBlockStartFixed = `                <!-- ══════════ T-SHIRT SECTION ══════════ -->
                <div id="tshirtSection" class="content-section" style="display:none;">
    <div style="padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px;">
            <div>
                <h2 style="color:#2c3e50;margin:0 0 4px;font-size:1.5rem;">&#128248; T-shirt Section</h2>
                <p style="color:#777;margin:0;font-size:.9rem;">Manage T-shirt applications and size summaries</p>
            </div>
        </div>`;

dashboard = dashboard.replace(tshirtBlockStart, tshirtBlockStartFixed);
console.log('Step 2 done: added tshirtSection wrapper div with display:none around the hardcoded block');

fs.writeFileSync('dashboard.html', dashboard, 'utf8');
console.log('dashboard.html saved successfully');

// ============================================================
// FIX 2: admin.html
// The tshirtSection div is nested INSIDE the events div.
// events is hidden by showSection, so tshirtSection is always hidden.
// Fix: The events div needs to be properly closed before tshirtSection.
// ============================================================
let admin = fs.readFileSync('admin.html', 'utf8');

// In admin.html, the events div ends with </div></div> (table-wrap + admin-card)
// but the events content-section itself is not closed before tshirtSection.
// The pattern is:
//   </div>          <- closes admin-card
//   <!-- T-SHIRT --> 
//   <div id="tshirtSection">

const adminWrongNesting = `                    </div>
\n                <!-- ══════════ T-SHIRT SECTION ══════════ -->
                <div id="tshirtSection" class="content-section">`;

const adminCorrectFixed = `                    </div>
                </div>

                <!-- ══════════ T-SHIRT SECTION ══════════ -->
                <div id="tshirtSection" class="content-section" style="display:none;">`;

if (!admin.includes(adminWrongNesting)) {
    console.log('ERROR: adminWrongNesting not found in admin.html');
    // Try to show context
    const idx = admin.indexOf('<!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 T-SHIRT SECTION');
    if (idx > -1) {
        console.log('Found T-SHIRT comment at index', idx);
        console.log('Context before:', JSON.stringify(admin.substring(idx - 100, idx)));
    }
    process.exit(1);
}

admin = admin.replace(adminWrongNesting, adminCorrectFixed);
fs.writeFileSync('admin.html', admin, 'utf8');
console.log('admin.html saved successfully - events div now properly closed before tshirtSection');

// ============================================================
// FIX 3: server.js - verify POST /api/tshirts accepts "phone"
// ============================================================
const server = fs.readFileSync('server.js', 'utf8');
if (server.includes("const { name, size, phone, quantity, userId } = body;")) {
    console.log('server.js OK: POST /api/tshirts correctly expects phone field');
} else {
    console.log('WARNING: server.js may have wrong field name for phone!');
}

console.log('\n=== ALL FIXES APPLIED SUCCESSFULLY ===');
