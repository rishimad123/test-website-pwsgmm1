const fs = require('fs');
let d = fs.readFileSync('dashboard.html', 'utf8');

// Structure to fix:
//   Line 3624:     await deLoadMyEntries();
//   Line 3625:     } else {                           <-- broken: else block opens here
//   ...             [vde* code injected inside else]  <-- BAD: 20568 chars of code
//   Line 3872:     async function deLoadMyEntries() { await vdeLoad(); }
//                                                      <-- VDE BLOCK ENDS HERE
//   Line 3876+:    // Year Filter ... (remaining good code)
// 
// Fix:
//   Line 3624:     await deLoadMyEntries();
//   Line 3625:     } else {
//                      deShowStatus('❌ ' + (data.message || 'Could not save entry.'), 'error');
//                  }                                  <-- close else
//               } catch (err) {
//                   deShowStatus('❌ Server error: ' + err.message, 'error');
//               } finally {
//                   if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"...'; }
//               }
//           });    <-- close form submit
//   Then the vde* functions as top-level
//   Then Year Filter etc.

// Let's check what the original submit handler looked like in git to get the proper else block
// For now, we know from context the else needs to:
// 1) Show an error status
// 2) Close the else
// 3) Then there should be catch and finally blocks

// Let's look at what git shows us for the original code around line 3625
// by restoring git version and checking

// APPROACH: surgically cut the vde block out of the else, 
// close the else properly, and append vde* at the right place

const ELSE_OPEN = '                await deLoadMyEntries();\r\n            } else {\r\n';
const ELSE_OPEN_IDX = d.indexOf(ELSE_OPEN);
console.log('else open at:', ELSE_OPEN_IDX);

const VDE_START_MARKER = '        // ── Volunteer Entries Table (Mirrored from Admin) ────────────────────────\n';
const VDE_END_MARKER = '    // Call vdeLoad when section is displayed\n    async function deLoadMyEntries() {\n        await vdeLoad();\n    }\n';

const vdeStart = d.indexOf(VDE_START_MARKER, ELSE_OPEN_IDX);
const vdeEnd = d.indexOf(VDE_END_MARKER, vdeStart) + VDE_END_MARKER.length;
console.log('vde starts:', vdeStart, 'vde ends:', vdeEnd);

// Extract the vde code (we'll re-insert it later outside the else block)
const vdeCode = d.substring(vdeStart, vdeEnd);
console.log('VDE code length:', vdeCode.length);

// Check what was originally in the else block by checking git
// The else block should have had error handling. Let's get it from git history
// Actually, looking at the patch_vol_ui.js script:
// the original else block in the form submit should just show an error and continue.
// Let's look at what the original else block had before our patch messed it up.
// From git: dfe4ed1 (before our volunteer table changes)

// For now let's reconstruct the correct else block content.
// The form submit handler structure is:
//   if (res.ok && data.success) {
//       ... success handling ...
//       await deLoadMyEntries();
//   } else {
//       deShowStatus('❌ ' + (data.message || 'Could not save entry.'), 'error');
//   }
// } catch (err) {
//       console.error('[DE Form] Error:', err);
//       deShowStatus('❌ Server error: ' + err.message, 'error');
// } finally {
//       if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry'; }
// }

// Build the replacement:
// Replace:
//   [ELSE_OPEN][vdeCode]
// With:
//   } else {
//       deShowStatus('\u274c ' + (data.message || 'Could not save entry.'), 'error');
//   }
//   } catch (err) {
//       console.error('[DE Form] Error:', err);
//       deShowStatus('\u274c Server error: ' + err.message, 'error');
//   } finally {
//       if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry'; }
//   }
// });    <- close addEventListener

// Then insert vde code as top-level

// Let's look at what comes after vdeCode in the original file
const afterVde = d.substring(vdeEnd, vdeEnd + 200);
console.log('\nCode after vde:');
console.log(JSON.stringify(afterVde));
