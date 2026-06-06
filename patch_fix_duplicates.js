const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// ══════════════════════════════════════════════════════════════
// FIX 1: Remove the duplicate old adeLandmarkModal (line ~5309)
// This old one overrides the good one at line 4606
// ══════════════════════════════════════════════════════════════
const OLD_LM_MODAL = [
'    async function adeLandmarkModal() {',
'        const res = await fetch(\'/api/landmarks\');',
'        const data = await res.json();',
'        const modal = document.createElement(\'div\');',
'        modal.id = \'adeLmModal\';',
'        modal.style.cssText = \'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;\';',
'        modal.innerHTML = `<div style="background:var(--white);border-radius:16px;padding:28px;max-width:440px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.2);">',
'            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">',
'                <h3 style="margin:0;"><i class="fas fa-flag" style="color:#6A1B9A;margin-right:8px;"></i>Manage Landmarks</h3>',
'                <span onclick="document.getElementById(\'adeLmModal\').remove()" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>',
'            </div>',
'            <div style="display:flex;gap:8px;margin-bottom:16px;">',
'                <input type="text" id="adeLmInput" class="form-control" placeholder="New landmark name" style="flex:1;">',
'                <button onclick="adeAddLandmark()" class="btn btn-primary btn-small">Add</button>',
'            </div>',
'            <div id="adeLmList" style="display:flex;flex-direction:column;gap:8px;">',
'                ${(data.landmarks||[]).map(l => `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8f9fa;border-radius:8px;">',
'                    <span style="flex:1;font-weight:600;">${l.name}</span>',
'                    <button onclick="adeDeleteLandmark(\'${l.id}\',this)" style="border:none;background:#FFEBEE;color:#c0392b;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.8rem;"><i class="fas fa-trash"></i></button>',
'                </div>`).join(\'\')}',
'            </div>',
'        </div>`;',
'        document.body.appendChild(modal);',
'        modal.addEventListener(\'click\', ev => { if(ev.target===modal) modal.remove(); });',
'    }',
'    async function adeAddLandmark() {',
'        const name = document.getElementById(\'adeLmInput\')?.value.trim(); if(!name) return;',
'        const res = await fetch(\'/api/landmarks\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({name})});',
'        const d = await res.json();',
'        if(res.ok&&d.success){document.getElementById(\'adeLmModal\')?.remove();adeLandmarkModal();}',
'        else alert(d.message||\'Could not add.\');',
'    }',
'    async function adeDeleteLandmark(id, btn) {',
'        if(!confirm(\'Remove this landmark?\')) return;',
'        const res = await fetch(`/api/landmarks/${encodeURIComponent(id)}`,{method:\'DELETE\'});',
'        if(res.ok) btn.closest(\'div\').remove(); else alert(\'Could not delete.\');',
'    }'
].join('\r\n');

if (html.includes(OLD_LM_MODAL)) {
    html = html.replace(OLD_LM_MODAL, '    // (duplicate adeLandmarkModal removed — using the full 3-column version above)');
    console.log('FIX 1: Duplicate adeLandmarkModal removed');
} else {
    // Try to find and remove it by known unique strings within it
    const UNIQUE1 = '        modal.id = \'adeLmModal\';\r\n        modal.style.cssText = \'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;\';\r\n        modal.innerHTML = `<div style="background:var(--white);border-radius:16px;padding:28px;max-width:440px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.2);">';
    const startMarker = '    async function adeLandmarkModal() {\r\n        const res = await fetch(\'/api/landmarks\');';
    const endMarker   = '    async function adeDeleteLandmark(id, btn) {';
    const endEnd      = '        if(res.ok) btn.closest(\'div\').remove(); else alert(\'Could not delete.\');\r\n    }';
    
    const si = html.indexOf(startMarker);
    const ei = html.indexOf(endEnd, si);
    if (si !== -1 && ei !== -1) {
        html = html.slice(0, si) + '    // (duplicate adeLandmarkModal removed)' + html.slice(ei + endEnd.length);
        console.log('FIX 1: Duplicate adeLandmarkModal removed (fallback)');
    } else {
        console.warn('FIX 1: Could not find duplicate — skipping');
    }
}

// ══════════════════════════════════════════════════════════════
// FIX 2: Fix the "Link to Area" dropdown in adeBuildingModal
// — fetch both landmarks + areas, group them with optgroups
// — no duplicate entries
// ══════════════════════════════════════════════════════════════
const OLD_BLDG_FETCH = [
'    async function adeBuildingModal() {',
'        const [rB, rS] = await Promise.all([fetch(\'/api/buildings\'), fetch(\'/api/areas\')]);',
'        const [dB, dS] = await Promise.all([rB.json(), rS.json()]);',
'        const allBldgs    = dB.buildings || [];',
'        const allAreas = dS.areas  || [];',
'        const modal = document.createElement(\'div\');',
'        modal.id = \'adeBldgModal\';',
'        modal.style.cssText = \'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;\';',
'        modal.innerHTML = \'<div style="background:var(--white);border-radius:16px;padding:28px;max-width:480px;width:92%;max-height:82vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.2);">\' +',
"            '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;\">' +",
"                '<h3 style=\"margin:0;\"><i class=\"fas fa-building\" style=\"color:#3949AB;margin-right:8px;\"></i>Manage Buildings</h3>' +",
"                '<span onclick=\"document.getElementById(\\'adeBldgModal\\').remove()\" style=\"font-size:1.5rem;cursor:pointer;color:#999;\">&times;</span>' +",
"            '</div>' +",
"            '<div style=\"display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:16px;\">' +",
"                '<input type=\"text\" id=\"adeBldgInput\" class=\"form-control\" placeholder=\"Building name\" style=\"font-size:.85rem;\">' +",
"                '<select id=\"adeBldgArea\" class=\"form-control\" style=\"font-size:.85rem;\">' +",
"                    '<option value=\"\">— Link to Area (optional) —</option>' +",
'                    allAreas.map(function(s){ return \'<option value=\"\'+s.id+\'">\'+s.name+\'</option>\'; }).join(\'\') +',
"                '</select>' +",
"                '<button onclick=\"amAddBuilding()\" class=\"btn btn-primary\">Add Building</button>' +",
"            '</div>' +"
].join('\r\n');

const NEW_BLDG_FETCH = [
'    async function adeBuildingModal() {',
'        const [rB, rL, rA] = await Promise.all([fetch(\'/api/buildings\'), fetch(\'/api/landmarks\'), fetch(\'/api/areas\')]);',
'        const [dB, dL, dA] = await Promise.all([rB.json(), rL.json(), rA.json()]);',
'        const allBldgs    = dB.buildings || [];',
'        const allLandmarks = dL.landmarks || [];',
'        const allAreas     = dA.areas     || [];',
'        // Build grouped area options: group by landmark, then ungrouped areas',
'        var areaOpts = \'<option value="">— Link to Area (optional) —</option>\';',
'        if (allLandmarks.length > 0) {',
'            allLandmarks.forEach(function(lm) {',
'                var lmAreas = allAreas.filter(function(a){ return a.landmarkId === lm.id; });',
'                if (lmAreas.length > 0) {',
'                    areaOpts += \'<optgroup label="\' + lm.name.replace(/"/g,\'&quot;\') + \'">\';',
'                    lmAreas.forEach(function(a) {',
'                        areaOpts += \'<option value="\' + a.id + \'">\' + a.name + \'</option>\';',
'                    });',
'                    areaOpts += \'</optgroup>\';',
'                }',
'            });',
'            // Ungrouped areas (no landmarkId)',
'            var ungrouped = allAreas.filter(function(a){ return !a.landmarkId; });',
'            if (ungrouped.length > 0) {',
'                areaOpts += \'<optgroup label="Other">\';',
'                ungrouped.forEach(function(a) {',
'                    areaOpts += \'<option value="\' + a.id + \'">\' + a.name + \'</option>\';',
'                });',
'                areaOpts += \'</optgroup>\';',
'            }',
'        } else {',
'            // No landmarks — flat list',
'            allAreas.forEach(function(a) {',
'                areaOpts += \'<option value="\' + a.id + \'">\' + a.name + \'</option>\';',
'            });',
'        }',
'        const modal = document.createElement(\'div\');',
'        modal.id = \'adeBldgModal\';',
'        modal.style.cssText = \'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;\';',
'        modal.innerHTML = \'<div style="background:var(--white);border-radius:16px;padding:28px;max-width:480px;width:92%;max-height:82vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.2);">\' +',
"            '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;\">' +",
"                '<h3 style=\"margin:0;\"><i class=\"fas fa-building\" style=\"color:#3949AB;margin-right:8px;\"></i>Manage Buildings</h3>' +",
"                '<span onclick=\"document.getElementById(\\'adeBldgModal\\').remove()\" style=\"font-size:1.5rem;cursor:pointer;color:#999;\">&times;</span>' +",
"            '</div>' +",
"            '<div style=\"display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:16px;\">' +",
"                '<input type=\"text\" id=\"adeBldgInput\" class=\"form-control\" placeholder=\"Building name\" style=\"font-size:.85rem;\">' +",
"                '<select id=\"adeBldgArea\" class=\"form-control\" style=\"font-size:.85rem;\">' +",
'                    areaOpts +',
"                '</select>' +",
"                '<button onclick=\"amAddBuilding()\" class=\"btn btn-primary\">Add Building</button>' +",
"            '</div>' +"
].join('\r\n');

const OLD_BLDG_CRLF = OLD_BLDG_FETCH.replace(/\n/g, '\r\n');
const NEW_BLDG_CRLF = NEW_BLDG_FETCH.replace(/\n/g, '\r\n');
if (html.includes(OLD_BLDG_CRLF)) {
    html = html.replace(OLD_BLDG_CRLF, NEW_BLDG_CRLF);
    console.log('FIX 2: adeBuildingModal area dropdown fixed (CRLF)');
} else if (html.includes(OLD_BLDG_FETCH)) {
    html = html.replace(OLD_BLDG_FETCH, NEW_BLDG_FETCH);
    console.log('FIX 2: adeBuildingModal area dropdown fixed (LF)');
} else {
    console.error('FIX 2: adeBuildingModal NOT FOUND');
    process.exit(1);
}

// ══════════════════════════════════════════════════════════════
// FIX 3: Fix old adeLoadLandmarks (line ~3800) that uses
// FIXED_LANDMARKS and then appends API results — causing duplicates
// Replace it to use only API results
// ══════════════════════════════════════════════════════════════
const OLD_FIXED_LM = [
'    async function adeLoadLandmarks() {',
'        const FIXED_LANDMARKS = [\'Patelwadi\', \'Shindewadi\', \'Gurkhawadi\'];',
'        const sel = document.getElementById(\'adeLandmarkSelect\');',
'        if (!sel) return;',
'        const cur = sel.value;',
'        sel.innerHTML = \'<option value="">— Select Landmark —</option>\' +',
'            FIXED_LANDMARKS.map(n => `<option value="${n}" ${n === cur ? \'selected\' : \'\'}>${n}</option>`).join(\'\');',
'        try {',
'            const r = await fetch(\'/api/landmarks\');',
'            const d = await r.json();',
'            (d.landmarks || []).forEach(a => {',
'                if (!FIXED_LANDMARKS.includes(a.name)) {',
'                    sel.innerHTML += `<option value="${a.name}" ${a.name === cur ? \'selected\' : \'\'}>${a.name}</option>`;',
'                }',
'            });',
'            adeOnLandmarkChange();',
'        } catch (e) {}',
'    }'
].join('\r\n');

const NEW_FIXED_LM = [
'    async function adeLoadLandmarks() {',
'        var sel = document.getElementById(\'adeLandmarkSelect\');',
'        if (!sel) return;',
'        var cur = sel.value;',
'        try {',
'            var r = await fetch(\'/api/landmarks\');',
'            var d = await r.json();',
'            sel.innerHTML = \'<option value="">\u2014 Select Landmark \u2014</option>\';',
'            (d.landmarks || []).forEach(function(l) {',
'                sel.innerHTML += \'<option value="\' + l.name + \'"\' + (l.name === cur ? \' selected\' : \'\') + \'>\' + l.name + \'</option>\';',
'            });',
'            _adeAllLandmarks = d.landmarks || [];',
'        } catch (e) {}',
'    }'
].join('\r\n');

const OLD_FIXED_CRLF = OLD_FIXED_LM.replace(/\n/g, '\r\n');
if (html.includes(OLD_FIXED_CRLF)) {
    html = html.replace(OLD_FIXED_CRLF, NEW_FIXED_LM.replace(/\n/g, '\r\n'));
    console.log('FIX 3: Old adeLoadLandmarks with FIXED_LANDMARKS removed (CRLF)');
} else if (html.includes(OLD_FIXED_LM)) {
    html = html.replace(OLD_FIXED_LM, NEW_FIXED_LM);
    console.log('FIX 3: Old adeLoadLandmarks with FIXED_LANDMARKS removed (LF)');
} else {
    console.warn('FIX 3: FIXED_LANDMARKS version NOT FOUND (may already be fixed)');
}

fs.writeFileSync('admin.html', html);
console.log('\nDone — admin.html patched.');
