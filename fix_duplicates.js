const fs = require('fs');

function fixDashboard() {
    let html = fs.readFileSync('dashboard.html', 'utf8');

    // 1. Remove duplicate let declaration
    html = html.replace(
        /let _deLandmarks = \[\], _deLandmarks = \[\], _deAreas = \[\], _deBuildings = \[\];/g,
        'let _deLandmarks = [], _deAreas = [], _deBuildings = [];'
    );
    html = html.replace(
        /_deLandmarks = \[\]; _deLandmarks = \[\]; _deAreas = \[\]; _deBuildings = \[\];/g,
        '_deLandmarks = []; _deAreas = []; _deBuildings = [];'
    );

    // 2. Fix the fetch calls
    html = html.replace(
        /const \[lRes, aRes, saRes, bRes\] = await Promise\.all\(\[\s*fetch\('\/api\/landmarks'\), fetch\('\/api\/landmarks'\),\s*fetch\('\/api\/areas'\),\s*fetch\('\/api\/buildings'\)\s*\]\);/g,
        "const [aRes, saRes, bRes] = await Promise.all([\n                fetch('/api/landmarks'),\n                fetch('/api/areas'),  fetch('/api/buildings')\n            ]);"
    );

    // 3. Fix the json parse calls
    html = html.replace(
        /const \[lData, aData, saData, bData\] = await Promise\.all\(\[\s*lRes\.json\(\), aRes\.json\(\), saRes\.json\(\), bRes\.json\(\)\s*\]\);/g,
        "const [aData, saData, bData] = await Promise.all([\n                aRes.json(), saRes.json(), bRes.json()\n            ]);"
    );

    // 4. Fix assignment duplicates
    html = html.replace(/_deLandmarks = lData\.landmarks \|\| \[\];\s*_deLandmarks\s*=\s*aData\.landmarks\s*\|\|\s*\[\];/g,
        '_deLandmarks = aData.landmarks || [];'
    );

    // 5. Remove the OLD "Common Landmark" HTML group
    // The old one has: <label for="deLandmark" ...> Common Landmark ... </label>
    html = html.replace(
        /<div class="form-group" id="deLandmarkGroup" style="margin-bottom:16px;">[\s\S]*?<label for="deLandmark"[\s\S]*?>Common Landmark[\s\S]*?<\/div>\s*<div id="deLandmarkHint"[\s\S]*?<\/div>\s*<\/div>/g,
        ''
    );
    // There might be another variant
    html = html.replace(
        /<div class="form-group" id="deLandmarkGroup" style="margin-bottom:16px;">\s*<label for="deLandmark"[^>]*>.*?Common Landmark.*?<\/label>\s*<div[^>]*>\s*<select id="deLandmark"[^>]*>.*?<\/select>\s*<button[^>]*>.*?<\/button>\s*<\/div>\s*<div id="deLandmarkHint"[^>]*>.*?<\/div>\s*<\/div>/g,
        ''
    );
    
    // 6. Make the NEW Landmark group visible (remove display:none;)
    html = html.replace(
        /<div class="form-group" id="deLandmarkGroup" style="margin-bottom:16px;display:none;">/g,
        '<div class="form-group" id="deLandmarkGroup" style="margin-bottom:16px;">'
    );

    fs.writeFileSync('dashboard.html', html, 'utf8');
}

function fixAdmin() {
    let html = fs.readFileSync('admin.html', 'utf8');

    // 1. Remove duplicate const allLandmarks
    html = html.replace(
        /const allLandmarks = dL\.landmarks \|\| \[\];\s*const allLandmarks\s*=\s*dA\.landmarks\s*\|\|\s*\[\];/g,
        'const allLandmarks = dA.landmarks || [];'
    );

    // 2. Fix the fetch calls
    html = html.replace(
        /const \[rL, rA, rSA, rB\] = await Promise\.all\(\[\s*fetch\('\/api\/landmarks'\),\s*fetch\('\/api\/landmarks'\),\s*fetch\('\/api\/areas'\),\s*fetch\('\/api\/buildings'\)\s*\]\);/g,
        "const [rA, rSA, rB] = await Promise.all([\n                fetch('/api/landmarks'),\n                fetch('/api/areas'),\n                fetch('/api/buildings')\n            ]);"
    );

    // 3. Fix the json parse calls
    html = html.replace(
        /const \[dL, dA, dSA, dB\] = await Promise\.all\(\[\s*rL\.json\(\),\s*rA\.json\(\),\s*rSA\.json\(\),\s*rB\.json\(\)\s*\]\);/g,
        "const [dA, dSA, dB] = await Promise.all([\n                rA.json(),\n                rSA.json(),\n                rB.json()\n            ]);"
    );

    // 4. Also remove the old adeLandmarkSelect Common Landmark HTML from admin.html if present
    html = html.replace(
        /<div class="form-group" style="margin-bottom:10px;">\s*<label for="adeLandmarkSelect">Common Landmark<\/label>\s*<select id="adeLandmarkSelect" class="form-control">\s*<\/select>\s*<\/div>/g,
        ''
    );

    fs.writeFileSync('admin.html', html, 'utf8');
}

try {
    fixDashboard();
    console.log('Fixed dashboard.html duplicate vars and HTML');
} catch (e) { console.error(e); }

try {
    fixAdmin();
    console.log('Fixed admin.html duplicate vars');
} catch (e) { console.error(e); }
