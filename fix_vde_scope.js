const fs = require('fs');
let d = fs.readFileSync('dashboard.html', 'utf8');

// ── What's broken ──────────────────────────────────────────────────────────
// The vde* code was injected INSIDE the else{} of the form submit handler.
// The else{ block was never closed, so the form submit handler is broken,
// and vde* functions are inaccessible (scoped inside the else).
//
// Current broken structure (line ~3625):
//   await deLoadMyEntries();
//   } else {
//       // ── Volunteer Entries Table ...  <-- vde* code starts here (WRONG)
//       let _vdeAll = [];
//       ...20,576 chars of vde* functions...
//       async function deLoadMyEntries() { await vdeLoad(); }
//                                          <-- vde* code ends here
//   // ─── Year Filter ...  <-- good code continues here
//
// Fix: remove vde* from inside else, close else with error handling,
//       close the try/catch/finally, close the addEventListener,
//       then insert vde* code as TOP-LEVEL functions.

// ── Step 1: Extract the vde block ─────────────────────────────────────────
const VDE_START = '        // ── Volunteer Entries Table (Mirrored from Admin) ────────────────────────\n';
const VDE_END =   '    // Call vdeLoad when section is displayed\n    async function deLoadMyEntries() {\n        await vdeLoad();\n    }\n';

const vdeStartIdx = d.indexOf(VDE_START);
const vdeEndIdx   = d.indexOf(VDE_END, vdeStartIdx);

if (vdeStartIdx === -1 || vdeEndIdx === -1) {
    console.error('Could not find VDE block markers:', vdeStartIdx, vdeEndIdx);
    process.exit(1);
}

const vdeCode = d.substring(vdeStartIdx, vdeEndIdx + VDE_END.length);
console.log('Extracted VDE block, length:', vdeCode.length);

// ── Step 2: Find the else{ opener that comes right before vde block ────────
// The broken else block is: "            } else {\r\n" then the vde code
const ELSE_OPENER_END = vdeStartIdx; // vde code starts right after the else{
// Find "} else {" backwards from vdeStartIdx
const elseSearch = d.lastIndexOf('            } else {\r\n', vdeStartIdx);
console.log('else opener at:', elseSearch);

// ── Step 3: Find where good code resumes after the vde block ──────────────
const afterVdeStart = vdeEndIdx + VDE_END.length;
const afterVdeSample = d.substring(afterVdeStart, afterVdeStart + 100);
console.log('Code after VDE:', JSON.stringify(afterVdeSample));

// ── Step 4: Build the replacement ─────────────────────────────────────────
// Replace from elseSearch to afterVdeStart with:
//   1) Proper else block (show error)  
//   2) Close the try catch finally and the addEventListener
//   3) vde* functions as top-level
const PROPER_ELSE_AND_CLOSE = `            } else {
                deShowStatus('\\u274c ' + (data.message || 'Could not save entry.'), 'error');
            }
        } catch (err) {
            console.error('[DE Form] Error:', err);
            deShowStatus('\\u274c Server error: ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry'; }
        }
    });

    // ── Volunteer Entries Table (admin layout mirrored) ───────────────────
    let _vdeAll = [];
    let _vdeFiltered = [];

`;

// Get just the function bodies (strip the let _vdeAll/Filtered declarations and the outer comment from vdeCode)
// vdeCode starts with "        // ── Volunteer Entries Table ...\n    let _vdeAll = [];\n    let _vdeFiltered = [];\n\n    async function vdeLoad..."
// We want everything from "async function vdeLoad" onwards, plus deLoadMyEntries
const vdeFnStart = vdeCode.indexOf('    async function vdeLoad');
if (vdeFnStart === -1) { console.error('Cannot find vdeLoad in block'); process.exit(1); }
const vdeFunctions = vdeCode.substring(vdeFnStart);
console.log('VDE functions length:', vdeFunctions.length);

// ── Step 5: Assemble the new content ──────────────────────────────────────
const before = d.substring(0, elseSearch);
const after  = d.substring(afterVdeStart);

const newDash = before + PROPER_ELSE_AND_CLOSE + vdeFunctions + after;

console.log('Original length:', d.length);
console.log('New length:', newDash.length);

// ── Step 6: Verify key parts are in place ─────────────────────────────────
const checks = {
    'vdeLoad top-level after });':  newDash.includes('});\n\n    // ── Volunteer Entries Table'),
    'async function vdeLoad':       newDash.includes('async function vdeLoad'),
    'function vdeRender':           newDash.includes('function vdeRender'),
    'function vdeRenderCards':      newDash.includes('function vdeRenderCards'),
    'deLoadMyEntries -> vdeLoad':   newDash.includes('async function deLoadMyEntries() {\n        await vdeLoad();\n    }'),
    'else properly closed':         newDash.includes("deShowStatus('\\u274c ' + (data.message || 'Could not save entry.'), 'error');\n            }"),
    'Year Filter still present':    newDash.includes('Year Filter for Donation'),
    'Volunteer Edit Modal':         newDash.includes('deOpenVolEdit'),
};

let allOk = true;
for (const [k, v] of Object.entries(checks)) {
    console.log((v ? '✅' : '❌'), k);
    if (!v) allOk = false;
}

if (allOk) {
    fs.writeFileSync('dashboard.html', newDash, 'utf8');
    console.log('\n✅ Fixed dashboard.html successfully!');
} else {
    console.error('\n❌ Some checks failed. NOT writing file.');
}
