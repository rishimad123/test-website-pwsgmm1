const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// ══════════════════════════════════════════════════════════════
// PATCH 1: Replace the Location Section HTML (lines ~1328–1349)
// New design:
//   1. Landmark dropdown (always visible) + Manage button (admin only)
//   2. Area chips/dropdown appears after landmark selected (locks in)
//   3. Building Name dropdown appears after area selected (pre-filled)
//   4. Flat number field (optional, after building)
// ══════════════════════════════════════════════════════════════

const OLD_HTML = `                            <!-- Section D: Location Cascade -->
                            <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:18px;"><i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>Location</div>
                            
                            <div class="form-group" id="deLandmarkGroup" style="margin-bottom:16px;">
                                <label for="deLandmark" style="font-weight:600;font-size:.85rem;color:#333;"><i class="fas fa-map-pin" style="color:#3949AB;margin-right:5px;font-size:.8rem;"></i> Landmark <span style="font-size:.75rem;color:#888;font-weight:400;margin-left:6px;">within landmark</span></label>
                                <select id="deLandmark" class="form-control" onchange="deOnLandmarkChange()"><option value="">&#x2014; Select Landmark &#x2014;</option></select>
                            </div>
                            <div class="form-group" id="deAreaGroup" style="margin-bottom:16px;display:none;">
                                <label for="deArea" style="font-weight:600;font-size:.85rem;color:#333;"><i class="fas fa-map" style="color:#2E7D32;margin-right:5px;font-size:.8rem;"></i> Area</label>
                                <select id="deArea" class="form-control" onchange="deOnAreaChange()"><option value="">&#x2014; Select Area &#x2014;</option></select>
                            </div>
                            <div class="form-group" id="deBuildingGroup" style="margin-bottom:16px;display:none;">
                                <label for="deBuildingName" style="font-weight:600;font-size:.85rem;color:#333;"><i class="fas fa-building" style="color:#5C6BC0;margin-right:5px;font-size:.8rem;"></i> Building Name</label>
                                <div style="display:flex;gap:8px;align-items:stretch;">
                                    <select id="deBuildingName" class="form-control" style="flex:1;" onchange="deOnBuildingChange()"><option value="">&#x2014; Select Building &#x2014;</option></select>
                                    <button type="button" id="deAddBldgBtn" onclick="deAddBuilding()" style="display:none;padding:0 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#1a237e,#3949ab);color:#fff;cursor:pointer;font-size:.82rem;font-weight:700;white-space:nowrap;">&#x271a; Add</button>
                                </div>
                            </div>
                            <div class="form-group" id="deFlatNumberGroup" style="margin-bottom:16px;display:none;">
                                <label for="deFlatNumber" style="font-weight:600;font-size:.85rem;color:#333;"><i class="fas fa-door-open" style="color:#E67E22;margin-right:5px;font-size:.8rem;"></i> Flat / Unit Number</label>
                                <input type="text" id="deFlatNumber" class="form-control" placeholder="e.g. A-201, Flat 3B">
                            </div>`;

const NEW_HTML = `                            <!-- Section D: Location Cascade -->
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;flex:1;"><i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>Location</div>
                                <button type="button" id="deManageLocBtn" onclick="deOpenManageModal()" style="display:none;margin-left:12px;padding:5px 14px;border:none;border-radius:8px;background:linear-gradient(135deg,#1a237e,#3949ab);color:#fff;cursor:pointer;font-size:.78rem;font-weight:700;white-space:nowrap;"><i class="fas fa-cog" style="margin-right:5px;"></i>Manage</button>
                            </div>

                            <!-- Step 1: Landmark -->
                            <div class="form-group" id="deLandmarkGroup" style="margin-bottom:16px;">
                                <label for="deLandmark" style="font-weight:700;font-size:.85rem;color:#333;display:flex;align-items:center;gap:6px;">
                                    <i class="fas fa-map-marker-alt" style="color:#E65100;font-size:.85rem;"></i>
                                    Landmark <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 1 of 3</span>
                                </label>
                                <select id="deLandmark" class="form-control" onchange="deOnLandmarkChange()" style="font-weight:600;">
                                    <option value="">— Select Landmark —</option>
                                </select>
                                <div id="deLandmarkHint" style="display:none;font-size:.75rem;color:#E65100;margin-top:5px;"><i class="fas fa-info-circle"></i> No landmarks configured yet. Ask admin to add some.</div>
                            </div>

                            <!-- Step 2: Area (slides in after landmark) -->
                            <div class="form-group" id="deAreaGroup" style="margin-bottom:16px;display:none;">
                                <label style="font-weight:700;font-size:.85rem;color:#333;display:flex;align-items:center;gap:6px;">
                                    <i class="fas fa-map" style="color:#2E7D32;font-size:.85rem;"></i>
                                    Area <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 2 of 3</span>
                                </label>
                                <!-- Area chips + dropdown -->
                                <div id="deAreaChips" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;"></div>
                                <select id="deArea" class="form-control" onchange="deOnAreaChange()" style="font-weight:600;">
                                    <option value="">— Select Area —</option>
                                </select>
                                <!-- Locked-in area badge (shown after area selected) -->
                                <div id="deAreaLocked" style="display:none;margin-top:8px;padding:8px 14px;background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border:1.5px solid #66BB6A;border-radius:8px;display:none;align-items:center;gap:10px;">
                                    <i class="fas fa-check-circle" style="color:#2E7D32;font-size:1rem;"></i>
                                    <span id="deAreaLockedName" style="font-weight:700;color:#1B5E20;font-size:.88rem;"></span>
                                    <button type="button" onclick="deUnlockArea()" style="margin-left:auto;border:none;background:transparent;color:#888;cursor:pointer;font-size:.75rem;padding:2px 6px;border-radius:4px;"><i class="fas fa-times"></i> Change</button>
                                </div>
                            </div>

                            <!-- Step 3: Building (slides in after area) -->
                            <div class="form-group" id="deBuildingGroup" style="margin-bottom:16px;display:none;">
                                <label for="deBuildingName" style="font-weight:700;font-size:.85rem;color:#333;display:flex;align-items:center;gap:6px;">
                                    <i class="fas fa-building" style="color:#5C6BC0;font-size:.85rem;"></i>
                                    Building Name <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 3 of 3 (optional)</span>
                                </label>
                                <select id="deBuildingName" class="form-control" onchange="deOnBuildingChange()" style="font-weight:600;">
                                    <option value="">— Select Building (optional) —</option>
                                </select>
                                <div id="deBuildingHint" style="display:none;font-size:.75rem;color:#888;margin-top:4px;"><i class="fas fa-info-circle"></i> No buildings linked to this area yet.</div>
                            </div>

                            <!-- Flat / Unit Number (optional, after building) -->
                            <div class="form-group" id="deFlatNumberGroup" style="margin-bottom:16px;display:none;">
                                <label for="deFlatNumber" style="font-weight:600;font-size:.85rem;color:#333;"><i class="fas fa-door-open" style="color:#E67E22;margin-right:5px;font-size:.8rem;"></i> Flat / Unit Number <span style="font-weight:400;color:#aaa;font-size:.75rem;">(optional)</span></label>
                                <input type="text" id="deFlatNumber" class="form-control" placeholder="e.g. A-201, Flat 3B, Shop 5">
                            </div>`;

// Normalize line endings for matching
const OLD_HTML_CRLF = OLD_HTML.replace(/\n/g, '\r\n');
if (html.includes(OLD_HTML_CRLF)) {
    html = html.replace(OLD_HTML_CRLF, NEW_HTML.replace(/\n/g, '\r\n'));
    console.log('PATCH 1: Location HTML replaced (CRLF)');
} else if (html.includes(OLD_HTML)) {
    html = html.replace(OLD_HTML, NEW_HTML);
    console.log('PATCH 1: Location HTML replaced (LF)');
} else {
    console.error('PATCH 1: HTML section NOT FOUND');
    process.exit(1);
}

// ══════════════════════════════════════════════════════════════
// PATCH 2: Replace the full JS cascade block
// ══════════════════════════════════════════════════════════════
const OLD_JS_START = '    // ── Hierarchical Location Cascade ─────────────────────────────────────────────\r\n    let _deLandmarks = [], _deAreas = [], _deBuildings = [];';
const OLD_JS_END   = '\r\n    async function deAddLandmark() {';

const si = html.indexOf(OLD_JS_START);
const ei = html.indexOf(OLD_JS_END, si);
if (si === -1 || ei === -1) { console.error('PATCH 2: JS block not found', si, ei); process.exit(1); }

const NEW_JS = [
'    // ── Hierarchical Location Cascade ─────────────────────────────────────────────',
'    let _deLandmarks = [], _deAreas = [], _deBuildings = [];',
'',
'    async function deLoadDropdowns() {',
'        try {',
'            const [aRes, saRes, bRes] = await Promise.all([',
'                fetch(\'/api/landmarks\'),',
'                fetch(\'/api/areas\'), fetch(\'/api/buildings\')',
'            ]);',
'            const [aData, saData, bData] = await Promise.all([',
'                aRes.json(), saRes.json(), bRes.json()',
'            ]);',
'            _deLandmarks = aData.landmarks || [];',
'            _deAreas     = saData.areas    || [];',
'            _deBuildings = bData.buildings || [];',
'        } catch(e) {',
'            _deLandmarks = []; _deAreas = []; _deBuildings = [];',
'        }',
'        // Populate landmark dropdown',
'        var lSel = document.getElementById(\'deLandmark\');',
'        if (lSel) {',
'            var cur = lSel.value;',
'            lSel.innerHTML = \'<option value="">\u2014 Select Landmark \u2014</option>\';',
'            _deLandmarks.forEach(function(l) {',
'                lSel.innerHTML += \'<option value="\' + l.name + \'"\' + (l.name === cur ? \' selected\' : \'\') + \'>\' + l.name + \'</option>\';',
'            });',
'            var hint = document.getElementById(\'deLandmarkHint\');',
'            if (hint) hint.style.display = _deLandmarks.length === 0 ? \'\' : \'none\';',
'        }',
'        // Show Manage button to admin only',
'        var isAdmin = currentUser && currentUser.role === \'admin\';',
'        var manBtn = document.getElementById(\'deManageLocBtn\');',
'        if (manBtn) manBtn.style.display = isAdmin ? \'\' : \'none\';',
'        // Show landmark group, hide everything else',
'        var lmGrp = document.getElementById(\'deLandmarkGroup\');',
'        if (lmGrp) lmGrp.style.display = \'\';',
'        [\'deAreaGroup\',\'deBuildingGroup\',\'deFlatNumberGroup\'].forEach(function(id) {',
'            var el = document.getElementById(id); if (el) el.style.display = \'none\';',
'        });',
'        dePopulateBooks();',
'    }',
'',
'    function deOnLandmarkChange() {',
'        var landmarkName = (document.getElementById(\'deLandmark\') || {}).value || \'\';',
'        // Reset area + building',
'        [\'deArea\',\'deBuildingName\',\'deFlatNumber\'].forEach(function(id) {',
'            var el = document.getElementById(id); if (el) el.value = \'\';',
'        });',
'        [\'deAreaGroup\',\'deBuildingGroup\',\'deFlatNumberGroup\'].forEach(function(id) {',
'            var el = document.getElementById(id); if (el) el.style.display = \'none\';',
'        });',
'        // Reset locked area badge',
'        deUnlockArea(true);',
'        if (!landmarkName) return;',
'        var landmarkObj = _deLandmarks.find(function(a) { return a.name === landmarkName; });',
'',
'        // Populate Areas for this Landmark',
'        var subs = landmarkObj',
'            ? _deAreas.filter(function(s) { return s.landmarkId === landmarkObj.id; })',
'            : [];',
'        var subSel = document.getElementById(\'deArea\');',
'        if (subSel) {',
'            subSel.innerHTML = \'<option value="">\u2014 Select Area \u2014</option>\';',
'            subs.forEach(function(s) {',
'                subSel.innerHTML += \'<option value="\' + s.name + \'" data-id="\' + s.id + \'">\' + s.name + \'</option>\';',
'            });',
'        }',
'        if (subs.length > 0) {',
'            var aGrp = document.getElementById(\'deAreaGroup\');',
'            if (aGrp) { aGrp.style.display = \'\'; aGrp.style.animation = \'deSlideDown .25s ease\'; }',
'            // Hide the "select" and show it (the locked badge is hidden by default)',
'            var locked = document.getElementById(\'deAreaLocked\');',
'            if (locked) locked.style.display = \'none\';',
'            if (subSel) subSel.style.display = \'\';',
'        }',
'',
'        // Pre-populate buildings linked directly to this Landmark',
'        dePopulateBuildingsForLandmark(landmarkObj);',
'    }',
'',
'    function deOnAreaChange() {',
'        var areaName = (document.getElementById(\'deArea\') || {}).value || \'\';',
'        // Reset building',
'        [\'deBuildingName\',\'deFlatNumber\'].forEach(function(id) {',
'            var el = document.getElementById(id); if (el) el.value = \'\';',
'        });',
'        [\'deBuildingGroup\',\'deFlatNumberGroup\'].forEach(function(id) {',
'            var el = document.getElementById(id); if (el) el.style.display = \'none\';',
'        });',
'        if (!areaName) {',
'            deUnlockArea(true);',
'            return;',
'        }',
'        // LOCK the area in — show badge, hide dropdown',
'        var lockedDiv  = document.getElementById(\'deAreaLocked\');',
'        var lockedName = document.getElementById(\'deAreaLockedName\');',
'        var areaSel    = document.getElementById(\'deArea\');',
'        if (lockedName) lockedName.textContent = areaName;',
'        if (lockedDiv)  { lockedDiv.style.display = \'flex\'; }',
'        if (areaSel)    areaSel.style.display = \'none\';',
'',
'        // Populate buildings for this area',
'        var landmarkName = (document.getElementById(\'deLandmark\') || {}).value || \'\';',
'        var landmarkObj  = _deLandmarks.find(function(l) { return l.name === landmarkName; });',
'        var saObj = _deAreas.find(function(s) { return s.name === areaName; });',
'        var bldgs = _deBuildings.filter(function(b) {',
'            return (saObj && b.areaId === saObj.id) ||',
'                   (landmarkObj && b.landmarkId === landmarkObj.id && !b.areaId);',
'        });',
'        deShowBuildings(bldgs);',
'    }',
'',
'    function deUnlockArea(silent) {',
'        var lockedDiv = document.getElementById(\'deAreaLocked\');',
'        var areaSel   = document.getElementById(\'deArea\');',
'        if (lockedDiv) lockedDiv.style.display = \'none\';',
'        if (areaSel)  { areaSel.style.display = \'\'; areaSel.value = \'\'; }',
'        if (!silent) {',
'            // reset buildings too',
'            [\'deBuildingName\',\'deFlatNumber\'].forEach(function(id) {',
'                var el = document.getElementById(id); if (el) el.value = \'\';',
'            });',
'            [\'deBuildingGroup\',\'deFlatNumberGroup\'].forEach(function(id) {',
'                var el = document.getElementById(id); if (el) el.style.display = \'none\';',
'            });',
'        }',
'    }',
'',
'    function dePopulateBuildingsForLandmark(landmarkObj) {',
'        var bldgs = landmarkObj',
'            ? _deBuildings.filter(function(b) { return b.landmarkId === landmarkObj.id; })',
'            : [];',
'        // Show building group whether or not there are results',
'        deShowBuildings(bldgs);',
'    }',
'',
'    function deShowBuildings(bldgs) {',
'        var bSel  = document.getElementById(\'deBuildingName\');',
'        var bHint = document.getElementById(\'deBuildingHint\');',
'        var bGrp  = document.getElementById(\'deBuildingGroup\');',
'        if (!bSel) return;',
'        bSel.innerHTML = \'<option value="">\u2014 Select Building (optional) \u2014</option>\';',
'        bldgs.forEach(function(b) {',
'            bSel.innerHTML += \'<option value="\' + b.name + \'" data-id="\' + b.id + \'">\' + b.name + \'</option>\';',
'        });',
'        if (bHint) bHint.style.display = bldgs.length === 0 ? \'\' : \'none\';',
'        if (bGrp) { bGrp.style.display = \'\'; bGrp.style.animation = \'deSlideDown .25s ease\'; }',
'    }',
'',
'    function deOnBuildingChange() {',
'        var building  = (document.getElementById(\'deBuildingName\') || {}).value || \'\';',
'        var flatGroup = document.getElementById(\'deFlatNumberGroup\');',
'        if (!flatGroup) return;',
'        if (building) { flatGroup.style.display = \'\'; flatGroup.style.animation = \'deSlideDown .25s ease\'; }',
'        else flatGroup.style.display = \'none\';',
'    }',
'',
'    // ── Admin: Open the Manage Locations modal ───────────────────────────────',
'    async function deOpenManageModal() {',
'        if (typeof adeLandmarkModal === \'function\') {',
'            adeLandmarkModal();',
'        } else {',
'            // Self-contained lightweight modal for dashboard context',
'            const [rL, rA] = await Promise.all([fetch(\'/api/landmarks\'), fetch(\'/api/areas\')]);',
'            const [dL, dA] = await Promise.all([rL.json(), rA.json()]);',
'            let lms   = dL.landmarks || [];',
'            let areas = dA.areas     || [];',
'            let selLm = lms.length ? lms[0].id : null;',
'',
'            var existing = document.getElementById(\'deMgmtModal\');',
'            if (existing) existing.remove();',
'            var modal = document.createElement(\'div\');',
'            modal.id = \'deMgmtModal\';',
'            modal.style.cssText = \'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto;\';',
'',
'            function renderMgmt() {',
'                var lmObj = lms.find(function(l){ return l.id === selLm; });',
'                var lmAreas = selLm ? areas.filter(function(a){ return a.landmarkId === selLm; }) : [];',
'                var html = \'<div style="background:#fff;border-radius:16px;padding:26px;width:94%;max-width:780px;box-shadow:0 8px 40px rgba(0,0,0,.24);margin-bottom:40px;">\';',
'                html += \'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:2px solid #f0f0f0;padding-bottom:12px;">\';',
'                html += \'<h3 style="margin:0;font-size:1.1rem;color:#1a237e;"><i class="fas fa-sitemap" style="color:#F59E0B;margin-right:8px;"></i>Manage Locations</h3>\';',
'                html += \'<span onclick="document.getElementById(\\\'deMgmtModal\\\').remove()" style="font-size:1.4rem;cursor:pointer;color:#999;">&times;</span>\';',
'                html += \'</div>\';',
'                html += \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">\';',
'',
'                // Col 1: Landmarks',
'                html += \'<div style="border-right:2px solid #f0f0f0;padding-right:18px;">\';',
'                html += \'<div style="font-size:.72rem;font-weight:800;text-transform:uppercase;color:#E65100;margin-bottom:10px;"><i class="fas fa-map-marker-alt" style="margin-right:5px;"></i>Landmarks</div>\';',
'                html += \'<div style="display:flex;gap:6px;margin-bottom:10px;">\';',
'                html += \'<input type="text" id="deMgmtLmInput" class="form-control" placeholder="New landmark" style="flex:1;font-size:.82rem;">\';',
'                html += \'<button onclick="deMgmtAddLm()" style="padding:0 12px;border:none;border-radius:8px;background:#E65100;color:#fff;font-weight:700;cursor:pointer;">+ Add</button>\';',
'                html += \'</div>\';',
'                html += \'<div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">\';',
'                lms.forEach(function(l) {',
'                    var isSel = l.id === selLm;',
'                    html += \'<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:\' + (isSel?\'#FFF3E0\':\'#f8f9fa\') + \';border:2px solid \' + (isSel?\'#F59E0B\':\'transparent\') + \';border-radius:8px;cursor:pointer;" onclick="deMgmtSelLm(this)" data-lid="\' + l.id + \'">\';',
'                    html += \'<span style="flex:1;font-weight:700;font-size:.85rem;color:\' + (isSel?\'#E65100\':\'#333\') + \'">\' + l.name + \'</span>\';',
'                    html += \'<button onclick="event.stopPropagation();deMgmtRenLm(this)" data-lid="\' + l.id + \'" data-lname="\' + l.name.replace(/"/g,\'&quot;\') + \'" style="border:none;background:#E3F2FD;color:#1565C0;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:.72rem;" title="Rename"><i class="fas fa-pen"></i></button>\';',
'                    html += \'<button onclick="event.stopPropagation();deMgmtDelLm(this)" data-lid="\' + l.id + \'" style="border:none;background:#FFEBEE;color:#c0392b;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:.72rem;" title="Delete"><i class="fas fa-trash"></i></button>\';',
'                    html += \'</div>\';',
'                });',
'                if (!lms.length) html += \'<div style="color:#aaa;text-align:center;padding:16px;font-size:.83rem;">No landmarks yet.</div>\';',
'                html += \'</div></div>\';',
'',
'                // Col 2: Areas',
'                html += \'<div>\';',
'                html += \'<div style="font-size:.72rem;font-weight:800;text-transform:uppercase;color:#2E7D32;margin-bottom:10px;"><i class="fas fa-map" style="margin-right:5px;"></i>Areas\' + (lmObj ? \' <span style="font-weight:400;text-transform:none;color:#888;">under \' + lmObj.name + \'</span>\' : \'\') + \'</div>\';',
'                if (selLm) {',
'                    html += \'<div style="display:flex;gap:6px;margin-bottom:10px;">\';',
'                    html += \'<input type="text" id="deMgmtAreaInput" class="form-control" placeholder="New area" style="flex:1;font-size:.82rem;">\';',
'                    html += \'<button onclick="deMgmtAddArea(this)" data-lmid="\' + selLm + \'" style="padding:0 12px;border:none;border-radius:8px;background:#2E7D32;color:#fff;font-weight:700;cursor:pointer;">+ Add</button>\';',
'                    html += \'</div>\';',
'                }',
'                html += \'<div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">\';',
'                lmAreas.forEach(function(a) {',
'                    html += \'<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#f0fff4;border-radius:8px;">\';',
'                    html += \'<span style="flex:1;font-weight:600;font-size:.85rem;">\' + a.name + \'</span>\';',
'                    html += \'<button onclick="deMgmtRenArea(this)" data-aid="\' + a.id + \'" data-aname="\' + a.name.replace(/"/g,\'&quot;\') + \'" style="border:none;background:#E3F2FD;color:#1565C0;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:.72rem;" title="Rename"><i class="fas fa-pen"></i></button>\';',
'                    html += \'<button onclick="deMgmtDelArea(this)" data-aid="\' + a.id + \'" style="border:none;background:#FFEBEE;color:#c0392b;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:.72rem;" title="Delete"><i class="fas fa-trash"></i></button>\';',
'                    html += \'</div>\';',
'                });',
'                if (!lmAreas.length && selLm) html += \'<div style="color:#aaa;text-align:center;padding:16px;font-size:.83rem;">No areas yet. Add one above.</div>\';',
'                if (!selLm) html += \'<div style="color:#aaa;text-align:center;padding:16px;font-size:.83rem;">Select a landmark first.</div>\';',
'                html += \'</div></div>\';',
'',
'                html += \'</div>\';',
'                html += \'<div style="margin-top:16px;font-size:.75rem;color:#888;text-align:center;"><i class="fas fa-info-circle" style="margin-right:4px;"></i>Changes take effect immediately across all volunteer forms.</div>\';',
'                html += \'</div>\';',
'                modal.innerHTML = html;',
'            }',
'',
'            window.deMgmtSelLm = function(el) { selLm = el.dataset.lid; renderMgmt(); };',
'            window.deMgmtAddLm = async function() {',
'                var name = ((document.getElementById(\'deMgmtLmInput\')||{}).value||\'\').trim(); if(!name) return;',
'                var r = await fetch(\'/api/landmarks\', { method:\'POST\', headers:{\'Content-Type\':\'application/json\'}, body:JSON.stringify({ name: name }) });',
'                var d = await r.json();',
'                if (r.ok && d.success) { lms.push(d.landmark); selLm = d.landmark.id; deLoadDropdowns(); renderMgmt(); }',
'                else alert(d.message||\'Could not add.\');',
'            };',
'            window.deMgmtRenLm = async function(btn) {',
'                var id = btn.dataset.lid; var nm = prompt(\'Rename landmark:\', btn.dataset.lname); if(!nm||!nm.trim()) return;',
'                var r = await fetch(\'/api/landmarks/\'+encodeURIComponent(id), { method:\'PUT\', headers:{\'Content-Type\':\'application/json\'}, body:JSON.stringify({ name: nm.trim() }) });',
'                var d = await r.json();',
'                if (r.ok && d.success) { var i=lms.findIndex(function(l){return l.id===id;}); if(i>=0) lms[i].name=nm.trim(); deLoadDropdowns(); renderMgmt(); }',
'                else alert(d.message||\'Rename failed.\');',
'            };',
'            window.deMgmtDelLm = async function(btn) {',
'                var id = btn.dataset.lid;',
'                if (!confirm(\'Delete this landmark and all its areas?\')) return;',
'                var r = await fetch(\'/api/landmarks/\'+encodeURIComponent(id), { method:\'DELETE\' });',
'                if (r.ok) { lms=lms.filter(function(l){return l.id!==id;}); areas=areas.filter(function(a){return a.landmarkId!==id;}); if(selLm===id) selLm=lms.length?lms[0].id:null; deLoadDropdowns(); renderMgmt(); }',
'                else alert(\'Could not delete.\');',
'            };',
'            window.deMgmtAddArea = async function(btn) {',
'                var lmid = btn.dataset.lmid;',
'                var name = ((document.getElementById(\'deMgmtAreaInput\')||{}).value||\'\').trim(); if(!name) return;',
'                var r = await fetch(\'/api/areas\', { method:\'POST\', headers:{\'Content-Type\':\'application/json\'}, body:JSON.stringify({ name: name, landmarkId: lmid }) });',
'                var d = await r.json();',
'                if (r.ok && d.success) { areas.push(d.area); deLoadDropdowns(); renderMgmt(); }',
'                else alert(d.message||\'Could not add.\');',
'            };',
'            window.deMgmtRenArea = async function(btn) {',
'                var id = btn.dataset.aid; var nm = prompt(\'Rename area:\', btn.dataset.aname); if(!nm||!nm.trim()) return;',
'                var r = await fetch(\'/api/areas/\'+encodeURIComponent(id), { method:\'PUT\', headers:{\'Content-Type\':\'application/json\'}, body:JSON.stringify({ name: nm.trim() }) });',
'                var d = await r.json();',
'                if (r.ok && d.success) { var i=areas.findIndex(function(a){return a.id===id;}); if(i>=0) areas[i].name=nm.trim(); deLoadDropdowns(); renderMgmt(); }',
'                else alert(d.message||\'Rename failed.\');',
'            };',
'            window.deMgmtDelArea = async function(btn) {',
'                var id = btn.dataset.aid;',
'                if (!confirm(\'Delete this area?\')) return;',
'                var r = await fetch(\'/api/areas/\'+encodeURIComponent(id), { method:\'DELETE\' });',
'                if (r.ok) { areas=areas.filter(function(a){return a.id!==id;}); deLoadDropdowns(); renderMgmt(); }',
'                else alert(\'Could not delete.\');',
'            };',
'',
'            renderMgmt();',
'            document.body.appendChild(modal);',
'            modal.addEventListener(\'click\', function(ev) { if (ev.target === modal) modal.remove(); });',
'        }',
'    }',
'',
'    async function deAddLandmark() {'
].join('\r\n');

html = html.slice(0, si) + NEW_JS + html.slice(ei + OLD_JS_END.length);
console.log('PATCH 2: Cascade JS replaced');

fs.writeFileSync('dashboard.html', html);
console.log('Done — dashboard.html patched.');
