const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// ── PATCH 1: Replace deOnLandmarkChange ──────────────────────────────────────
const OLD_LANDMARK = `    function deOnLandmarkChange() {
        var landmarkName = (document.getElementById('deLandmark') || {}).value || '';
        ['deArea','deBuildingName','deFlatNumber'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        ['deAreaGroup','deBuildingGroup','deFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        if (!landmarkName) return;
        var landmarkObj = _deLandmarks.find(function(a) { return a.name === landmarkName; });
        var subs = landmarkObj ? _deAreas.filter(function(s) { return s.landmarkId === landmarkObj.id; }) : [];
        var subSel = document.getElementById('deArea');
        if (!subSel) return;
        subSel.innerHTML = '<option value="">\u2014 Select Area \u2014</option>';
        subs.forEach(function(s) {
            subSel.innerHTML += '<option value="' + s.name + '" data-id="' + s.id + '">' + s.name + '</option>';
        });
        var subGroup = document.getElementById('deAreaGroup');
        if (subGroup) { subGroup.style.display = ''; subGroup.style.animation = 'deSlideDown .25s ease'; }
    }`;

const NEW_LANDMARK = `    function deOnLandmarkChange() {
        var landmarkName = (document.getElementById('deLandmark') || {}).value || '';
        ['deArea','deBuildingName','deFlatNumber'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        ['deAreaGroup','deBuildingGroup','deFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        if (!landmarkName) return;
        var landmarkObj = _deLandmarks.find(function(a) { return a.name === landmarkName; });

        // Populate Areas linked to this Landmark
        var subs = landmarkObj ? _deAreas.filter(function(s) { return s.landmarkId === landmarkObj.id; }) : [];
        if (subs.length > 0) {
            var subSel = document.getElementById('deArea');
            if (subSel) {
                subSel.innerHTML = '<option value="">\u2014 Select Area \u2014</option>';
                subs.forEach(function(s) {
                    subSel.innerHTML += '<option value="' + s.name + '" data-id="' + s.id + '">' + s.name + '</option>';
                });
            }
            var subGroup = document.getElementById('deAreaGroup');
            if (subGroup) { subGroup.style.display = ''; subGroup.style.animation = 'deSlideDown .25s ease'; }
        }

        // Populate Buildings directly linked to this Landmark (no area needed)
        var directBldgs = landmarkObj
            ? _deBuildings.filter(function(b) { return b.landmarkId === landmarkObj.id; })
            : [];
        if (directBldgs.length > 0) {
            var bSel2 = document.getElementById('deBuildingName');
            if (bSel2) {
                bSel2.innerHTML = '<option value="">\u2014 Select Building \u2014</option>';
                directBldgs.forEach(function(b) {
                    bSel2.innerHTML += '<option value="' + b.name + '" data-id="' + b.id + '">' + b.name + '</option>';
                });
                var bGrp2 = document.getElementById('deBuildingGroup');
                if (bGrp2) { bGrp2.style.display = ''; bGrp2.style.animation = 'deSlideDown .25s ease'; }
            }
        }
    }`;

if (!html.includes(OLD_LANDMARK.replace(/\r\n/g, '\n'))) {
    // try CRLF
    const OLD_CRLF = OLD_LANDMARK.replace(/\n/g, '\r\n');
    if (html.includes(OLD_CRLF)) {
        html = html.replace(OLD_CRLF, NEW_LANDMARK.replace(/\n/g, '\r\n'));
        console.log('PATCH 1: Applied (CRLF)');
    } else {
        console.error('PATCH 1: OLD string not found!');
        process.exit(1);
    }
} else {
    html = html.replace(OLD_LANDMARK.replace(/\r\n/g, '\n'), NEW_LANDMARK);
    console.log('PATCH 1: Applied (LF)');
}

// ── PATCH 2: Replace deOnAreaChange ─────────────────────────────────────────
const OLD_AREA = `    function deOnAreaChange() {
        var areaName = (document.getElementById('deArea') || {}).value || '';
        ['deBuildingName','deFlatNumber'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        ['deBuildingGroup','deFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        if (!areaName) return;
        var saObj = _deAreas.find(function(s) { return s.name === areaName; });
        var bldgs = saObj
            ? _deBuildings.filter(function(b) { return !b.areaId || b.areaId === saObj.id; })
            : _deBuildings;
        var bSel = document.getElementById('deBuildingName');
        if (!bSel) return;
        bSel.innerHTML = '<option value="">\u2014 Select Building \u2014</option>';
        bldgs.forEach(function(b) {
            bSel.innerHTML += '<option value="' + b.name + '">' + b.name + '</option>';
        });
        var bGroup = document.getElementById('deBuildingGroup');
        if (bGroup) { bGroup.style.display = ''; bGroup.style.animation = 'deSlideDown .25s ease'; }
    }`;

const NEW_AREA = `    function deOnAreaChange() {
        var areaName = (document.getElementById('deArea') || {}).value || '';
        ['deBuildingName','deFlatNumber'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        ['deBuildingGroup','deFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        // Also scope by selected landmark
        var landmarkName = (document.getElementById('deLandmark') || {}).value || '';
        var landmarkObj  = _deLandmarks.find(function(l) { return l.name === landmarkName; });
        var bldgs;
        if (areaName) {
            var saObj = _deAreas.find(function(s) { return s.name === areaName; });
            bldgs = _deBuildings.filter(function(b) {
                return (saObj && b.areaId === saObj.id) ||
                       (landmarkObj && b.landmarkId === landmarkObj.id && !b.areaId);
            });
        } else if (landmarkObj) {
            bldgs = _deBuildings.filter(function(b) { return b.landmarkId === landmarkObj.id; });
        } else {
            bldgs = [];
        }
        var bSel = document.getElementById('deBuildingName');
        if (!bSel) return;
        bSel.innerHTML = '<option value="">\u2014 Select Building \u2014</option>';
        bldgs.forEach(function(b) {
            bSel.innerHTML += '<option value="' + b.name + '">' + b.name + '</option>';
        });
        if (bldgs.length > 0) {
            var bGroup = document.getElementById('deBuildingGroup');
            if (bGroup) { bGroup.style.display = ''; bGroup.style.animation = 'deSlideDown .25s ease'; }
        }
    }`;

const OLD_AREA_CRLF = OLD_AREA.replace(/\n/g, '\r\n');
if (html.includes(OLD_AREA_CRLF)) {
    html = html.replace(OLD_AREA_CRLF, NEW_AREA.replace(/\n/g, '\r\n'));
    console.log('PATCH 2: Applied (CRLF)');
} else if (html.includes(OLD_AREA)) {
    html = html.replace(OLD_AREA, NEW_AREA);
    console.log('PATCH 2: Applied (LF)');
} else {
    console.error('PATCH 2: OLD string not found!');
    process.exit(1);
}

fs.writeFileSync('dashboard.html', html);
console.log('Done — dashboard.html patched.');
