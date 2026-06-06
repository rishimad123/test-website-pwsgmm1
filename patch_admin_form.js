const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// ═══════════════════════════════════════════════════════════════
// FIX 1: Replace duplicate "Manage Landmarks" button with "Manage Areas"
// ═══════════════════════════════════════════════════════════════
const OLD_DUP_BTN = `                <button onclick="adeLandmarkModal()" class="btn btn-small" style="background:#6A1B9A;color:#fff;"><i class="fas fa-flag" style="margin-right:6px;"></i>Manage Landmarks</button>`;
const NEW_DUP_BTN = `                <button onclick="adeManageAreasModal()" class="btn btn-small" style="background:#6A1B9A;color:#fff;"><i class="fas fa-map" style="margin-right:6px;"></i>Manage Areas</button>`;

const OLD_DUP_CRLF = OLD_DUP_BTN.replace(/\n/g, '\r\n');
if (html.includes(OLD_DUP_CRLF)) {
    html = html.replace(OLD_DUP_CRLF, NEW_DUP_BTN.replace(/\n/g, '\r\n'));
    console.log('FIX 1: Duplicate button replaced');
} else if (html.includes(OLD_DUP_BTN)) {
    html = html.replace(OLD_DUP_BTN, NEW_DUP_BTN);
    console.log('FIX 1: Duplicate button replaced (LF)');
} else { console.error('FIX 1: NOT FOUND'); process.exit(1); }


// ═══════════════════════════════════════════════════════════════
// FIX 2: Replace the admin form Location section HTML
// Old: 2-column grid with Building+Landmark+Area
// New: Landmark → Area (lock-in badge) → Building (pre-filled)
// ═══════════════════════════════════════════════════════════════
const OLD_LOC_HTML = `                <!-- ── Section D: Landmark ── -->
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                    <i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>Landmark
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
                    <div class="form-group" style="margin:0;">
                        <label for="adeBuildingNameSelect">Building Name</label>
                        <div style="display:flex;gap:8px;">
                            <select id="adeBuildingNameSelect" class="form-control" style="flex:1;" onchange="document.getElementById('adeFlatNumberGroup').style.display = this.value ? 'block' : 'none';"></select>
                            <button type="button" onclick="adeAddBuildingPrompt()" style="padding:0 14px;border:none;border-radius:8px;background:var(--primary-color);color:#fff;cursor:pointer;font-size:.85rem;white-space:nowrap;">＋ Add</button>
                        </div>
                    </div>
                    <div class="form-group" id="adeFlatNumberGroup" style="margin:0; display:none;">
                        <label for="adeFlatNumber">Enter Flat Number</label>
                        <input type="text" id="adeFlatNumber" class="form-control" placeholder="Flat No.">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label for="adeLandmarkSelect">Landmark</label>
                        <div style="display:flex;gap:8px;">
                            <select id="adeLandmarkSelect" class="form-control" style="flex:1;" onchange="adeOnLandmarkChange()"></select>
                            <button type="button" onclick="adeLandmarkModal()" style="padding:0 14px;border:none;border-radius:8px;background:var(--primary-color);color:#fff;cursor:pointer;font-size:.85rem;white-space:nowrap;">Manage Landmarks</button>
                        </div>
                    </div>
                    <div class="form-group" id="adeAreaGroup" style="margin:0;display:none;">
                        <label for="adeAreaSelect">Area</label>
                        <div style="display:flex;gap:8px;">
                            <select id="adeAreaSelect" class="form-control" style="flex:1;">
                                <option value="">— Select Area —</option>
                            </select>
                        </div>
                    </div>

                </div>`;

const NEW_LOC_HTML = `                <!-- ── Section D: Location Cascade ── -->
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;flex:1;">
                        <i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>Location
                    </div>
                </div>

                <!-- Step 1: Landmark (always visible) -->
                <div class="form-group" id="adeLandmarkGroup" style="margin-bottom:16px;">
                    <label for="adeLandmarkSelect" style="font-weight:700;font-size:.85rem;color:#333;display:flex;align-items:center;gap:6px;">
                        <i class="fas fa-map-marker-alt" style="color:#E65100;font-size:.85rem;"></i>
                        Landmark <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 1 of 3</span>
                    </label>
                    <select id="adeLandmarkSelect" class="form-control" onchange="adeOnLandmarkChange()" style="font-weight:600;">
                        <option value="">— Select Landmark —</option>
                    </select>
                </div>

                <!-- Step 2: Area (slides in after landmark) -->
                <div class="form-group" id="adeAreaGroup" style="margin-bottom:16px;display:none;">
                    <label style="font-weight:700;font-size:.85rem;color:#333;display:flex;align-items:center;gap:6px;">
                        <i class="fas fa-map" style="color:#2E7D32;font-size:.85rem;"></i>
                        Area <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 2 of 3</span>
                    </label>
                    <select id="adeAreaSelect" class="form-control" onchange="adeOnAreaChange()" style="font-weight:600;">
                        <option value="">— Select Area —</option>
                    </select>
                    <!-- Locked area badge -->
                    <div id="adeAreaLocked" style="display:none;margin-top:8px;padding:8px 14px;background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border:1.5px solid #66BB6A;border-radius:8px;align-items:center;gap:10px;">
                        <i class="fas fa-check-circle" style="color:#2E7D32;font-size:1rem;"></i>
                        <span id="adeAreaLockedName" style="font-weight:700;color:#1B5E20;font-size:.88rem;"></span>
                        <button type="button" onclick="adeUnlockArea()" style="margin-left:auto;border:none;background:transparent;color:#888;cursor:pointer;font-size:.75rem;padding:2px 6px;border-radius:4px;"><i class="fas fa-times"></i> Change</button>
                    </div>
                </div>

                <!-- Step 3: Building (slides in after area) -->
                <div class="form-group" id="adeBuildingGroup" style="margin-bottom:16px;display:none;">
                    <label for="adeBuildingNameSelect" style="font-weight:700;font-size:.85rem;color:#333;display:flex;align-items:center;gap:6px;">
                        <i class="fas fa-building" style="color:#5C6BC0;font-size:.85rem;"></i>
                        Building Name <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 3 of 3 (optional)</span>
                    </label>
                    <select id="adeBuildingNameSelect" class="form-control" onchange="adeOnBuildingChange()" style="font-weight:600;">
                        <option value="">— Select Building (optional) —</option>
                    </select>
                    <div id="adeBuildingHint" style="display:none;font-size:.75rem;color:#888;margin-top:4px;"><i class="fas fa-info-circle"></i> No buildings linked to this area yet.</div>
                </div>

                <!-- Flat / Unit Number -->
                <div class="form-group" id="adeFlatNumberGroup" style="margin-bottom:16px;display:none;">
                    <label for="adeFlatNumber" style="font-weight:600;font-size:.85rem;color:#333;">
                        <i class="fas fa-door-open" style="color:#E67E22;margin-right:5px;font-size:.8rem;"></i>
                        Flat / Unit Number <span style="font-weight:400;color:#aaa;font-size:.75rem;">(optional)</span>
                    </label>
                    <input type="text" id="adeFlatNumber" class="form-control" placeholder="e.g. A-201, Flat 3B, Shop 5">
                </div>`;

const OLD_LOC_CRLF = OLD_LOC_HTML.replace(/\n/g, '\r\n');
if (html.includes(OLD_LOC_CRLF)) {
    html = html.replace(OLD_LOC_CRLF, NEW_LOC_HTML.replace(/\n/g, '\r\n'));
    console.log('FIX 2: Admin location HTML replaced (CRLF)');
} else if (html.includes(OLD_LOC_HTML)) {
    html = html.replace(OLD_LOC_HTML, NEW_LOC_HTML);
    console.log('FIX 2: Admin location HTML replaced (LF)');
} else { console.error('FIX 2: Location HTML NOT FOUND'); process.exit(1); }


// ═══════════════════════════════════════════════════════════════
// FIX 3: Replace adeOnLandmarkChange with full cascade + lock
// ═══════════════════════════════════════════════════════════════
const OLD_CASCADE = `    function adeOnLandmarkChange() {
        const landmarkName = document.getElementById('adeLandmarkSelect')?.value || '';
        const group = document.getElementById('adeAreaGroup');
        if (landmarkName) {
            if (group) group.style.display = 'block';
            adeLoadAreas(landmarkName);
        } else {
            if (group) group.style.display = 'none';
        }
        const lmObj = _adeAllLandmarks.find(function(l) { return l.name === landmarkName; });
        adePopulateBuildingSelect(lmObj ? lmObj.id : null);
    }`;

const NEW_CASCADE = `    function adeOnLandmarkChange() {
        var landmarkName = document.getElementById('adeLandmarkSelect')?.value || '';
        // Reset area + building
        ['adeAreaSelect','adeBuildingNameSelect','adeFlatNumber'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        ['adeAreaGroup','adeBuildingGroup','adeFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        adeUnlockArea(true);
        if (!landmarkName) return;
        adeLoadAreas(landmarkName);
        // Pre-fill buildings linked directly to this landmark
        var lmObj = _adeAllLandmarks.find(function(l) { return l.name === landmarkName; });
        adePopulateBuildingSelect(lmObj ? lmObj.id : null);
    }

    function adeOnAreaChange() {
        var areaName = (document.getElementById('adeAreaSelect') || {}).value || '';
        ['adeBuildingNameSelect','adeFlatNumber'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        ['adeBuildingGroup','adeFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        if (!areaName) { adeUnlockArea(true); return; }
        // LOCK the area
        var lockedDiv  = document.getElementById('adeAreaLocked');
        var lockedName = document.getElementById('adeAreaLockedName');
        var areaSel    = document.getElementById('adeAreaSelect');
        if (lockedName) lockedName.textContent = areaName;
        if (lockedDiv)  { lockedDiv.style.display = 'flex'; }
        if (areaSel)    areaSel.style.display = 'none';
        // Populate buildings
        var landmarkName = (document.getElementById('adeLandmarkSelect') || {}).value || '';
        var lmObj  = _adeAllLandmarks.find(function(l) { return l.name === landmarkName; });
        var saObj  = _adeAllAreas.find(function(a) { return a.name === areaName; });
        var bldgs  = _adeAllBuildings.filter(function(b) {
            return (saObj && b.areaId === saObj.id) ||
                   (lmObj && b.landmarkId === lmObj.id && !b.areaId);
        });
        adeShowBuildings(bldgs);
    }

    function adeUnlockArea(silent) {
        var lockedDiv = document.getElementById('adeAreaLocked');
        var areaSel   = document.getElementById('adeAreaSelect');
        if (lockedDiv) lockedDiv.style.display = 'none';
        if (areaSel)  { areaSel.style.display = ''; areaSel.value = ''; }
        if (!silent) {
            ['adeBuildingNameSelect','adeFlatNumber'].forEach(function(id) {
                var el = document.getElementById(id); if (el) el.value = '';
            });
            ['adeBuildingGroup','adeFlatNumberGroup'].forEach(function(id) {
                var el = document.getElementById(id); if (el) el.style.display = 'none';
            });
        }
    }

    function adeOnBuildingChange() {
        var building  = (document.getElementById('adeBuildingNameSelect') || {}).value || '';
        var flatGroup = document.getElementById('adeFlatNumberGroup');
        if (!flatGroup) return;
        if (building) { flatGroup.style.display = 'block'; }
        else flatGroup.style.display = 'none';
    }

    function adeShowBuildings(bldgs) {
        var bSel  = document.getElementById('adeBuildingNameSelect');
        var bHint = document.getElementById('adeBuildingHint');
        var bGrp  = document.getElementById('adeBuildingGroup');
        if (!bSel) return;
        bSel.innerHTML = '<option value="">\u2014 Select Building (optional) \u2014</option>';
        bldgs.forEach(function(b) {
            bSel.innerHTML += '<option value="' + b.name + '" data-id="' + b.id + '">' + b.name + '</option>';
        });
        if (bHint) bHint.style.display = bldgs.length === 0 ? '' : 'none';
        if (bGrp)  { bGrp.style.display = ''; }
    }`;

const OLD_CASCADE_CRLF = OLD_CASCADE.replace(/\n/g, '\r\n');
if (html.includes(OLD_CASCADE_CRLF)) {
    html = html.replace(OLD_CASCADE_CRLF, NEW_CASCADE.replace(/\n/g, '\r\n'));
    console.log('FIX 3: adeOnLandmarkChange cascade updated (CRLF)');
} else if (html.includes(OLD_CASCADE)) {
    html = html.replace(OLD_CASCADE, NEW_CASCADE);
    console.log('FIX 3: adeOnLandmarkChange cascade updated (LF)');
} else { console.error('FIX 3: Cascade JS NOT FOUND'); process.exit(1); }


// ═══════════════════════════════════════════════════════════════
// FIX 4: Update adeLoadAreas to show area group correctly
// ═══════════════════════════════════════════════════════════════
const OLD_LOAD_AREAS_START = '    async function adeLoadAreas(landmarkName) {';
const OLD_LOAD_AREAS_END   = '    function adeOnLandmarkChange() {';
const laStart = html.indexOf(OLD_LOAD_AREAS_START);
const laEnd   = html.indexOf(OLD_LOAD_AREAS_END, laStart);
if (laStart === -1 || laEnd === -1) { console.error('FIX 4: adeLoadAreas bounds not found'); process.exit(1); }

const NEW_LOAD_AREAS = [
'    async function adeLoadAreas(landmarkName) {',
'        var sel = document.getElementById(\'adeAreaSelect\');',
'        if (!sel) return;',
'        sel.innerHTML = \'<option value="">\u2014 Select Area \u2014</option>\';',
'        var areaGroup = document.getElementById(\'adeAreaGroup\');',
'        if (!landmarkName) { if (areaGroup) areaGroup.style.display = \'none\'; return; }',
'        try {',
'            var r1 = await fetch(\'/api/landmarks\');',
'            var d1 = await r1.json();',
'            var landmarkObj = (d1.landmarks || []).find(function(a) { return a.name === landmarkName; });',
'            if (!landmarkObj) { if (areaGroup) areaGroup.style.display = \'none\'; return; }',
'            var r2 = await fetch(\'/api/areas\');',
'            var d2 = await r2.json();',
'            var subs = (d2.areas || []).filter(function(s) { return s.landmarkId === landmarkObj.id; });',
'            subs.forEach(function(s) {',
'                sel.innerHTML += \'<option value="\' + s.name + \'">\' + s.name + \'</option>\';',
'            });',
'            if (areaGroup) { areaGroup.style.display = \'\'; areaGroup.style.animation = \'deSlideDown .25s ease\'; }',
'            // Reset locked state',
'            adeUnlockArea(true);',
'            sel.style.display = \'\';',
'        } catch (e) {',
'            console.error(e);',
'        }',
'    }',
'',
'    '
].join('\r\n');

html = html.slice(0, laStart) + NEW_LOAD_AREAS + html.slice(laEnd);
console.log('FIX 4: adeLoadAreas updated');


// ═══════════════════════════════════════════════════════════════
// FIX 5: Add adeManageAreasModal function (quick area manager)
// Insert before the adeShowStatus function
// ═══════════════════════════════════════════════════════════════
const AREA_MODAL_MARKER = '    function adeShowStatus(msg, type) {';
const amiIdx = html.indexOf(AREA_MODAL_MARKER);
if (amiIdx === -1) { console.error('FIX 5: marker not found'); process.exit(1); }

const NEW_AREA_MODAL = [
'    // ── Manage Areas quick modal (admin header button) ──────────────────────',
'    async function adeManageAreasModal() {',
'        // Delegate to the full location modal if available',
'        if (typeof adeLandmarkModal === \'function\') { adeLandmarkModal(); return; }',
'    }',
'',
'    '
].join('\r\n');

html = html.slice(0, amiIdx) + NEW_AREA_MODAL + html.slice(amiIdx);
console.log('FIX 5: adeManageAreasModal added');


// ═══════════════════════════════════════════════════════════════
// FIX 6: Make sure adeLoadLandmarks populates with placeholder
// ═══════════════════════════════════════════════════════════════
const OLD_LOAD_LM = [
'    async function adeLoadLandmarks() {',
'        try {',
'            const r = await fetch(\'/api/landmarks\');',
'            const data = await r.json();',
'            const sel = document.getElementById(\'adeLandmarkSelect\');',
'            if (!sel) return;',
'            const cur = sel.value;',
'            while (sel.options.length > 1) sel.remove(1);',
'            (data.landmarks || []).forEach(l => {',
'                const o = document.createElement(\'option\');',
'                o.value = l.name;',
'                o.textContent = l.name;',
'                if (l.name === cur) o.selected = true;',
'                sel.appendChild(o);',
'            });',
'        } catch (e) {}',
'    }'
].join('\r\n');

const NEW_LOAD_LM = [
'    async function adeLoadLandmarks() {',
'        try {',
'            var r = await fetch(\'/api/landmarks\');',
'            var data = await r.json();',
'            var sel = document.getElementById(\'adeLandmarkSelect\');',
'            if (!sel) return;',
'            var cur = sel.value;',
'            sel.innerHTML = \'<option value="">\u2014 Select Landmark \u2014</option>\';',
'            (data.landmarks || []).forEach(function(l) {',
'                var o = document.createElement(\'option\');',
'                o.value = l.name;',
'                o.textContent = l.name;',
'                if (l.name === cur) o.selected = true;',
'                sel.appendChild(o);',
'            });',
'            // Sync cache',
'            _adeAllLandmarks = data.landmarks || [];',
'        } catch (e) {}',
'    }'
].join('\r\n');

const OLD_LOAD_LM_CRLF = OLD_LOAD_LM.replace(/\n/g, '\r\n');
if (html.includes(OLD_LOAD_LM_CRLF)) {
    html = html.replace(OLD_LOAD_LM_CRLF, NEW_LOAD_LM.replace(/\n/g, '\r\n'));
    console.log('FIX 6: adeLoadLandmarks updated (CRLF)');
} else if (html.includes(OLD_LOAD_LM)) {
    html = html.replace(OLD_LOAD_LM, NEW_LOAD_LM);
    console.log('FIX 6: adeLoadLandmarks updated (LF)');
} else {
    console.warn('FIX 6: adeLoadLandmarks NOT FOUND (skipped — may already be updated)');
}

fs.writeFileSync('admin.html', html);
console.log('\nDone — admin.html patched.');
