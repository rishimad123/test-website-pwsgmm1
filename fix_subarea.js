const fs = require('fs');

let adminHtml = fs.readFileSync('admin.html', 'utf8');

// 1. Add Sub-Area dropdown to "Record Donation" modal in admin.html
const aneAreaStr = '<div class="form-group" style="margin:0;"><label>Area</label><select id="aneArea" class="form-control" onchange="aneOnAreaChange()"><option value="">- Select Area -</option><option>Patelwadi</option><option>Shindewadi</option><option>Gurkhawadi</option></select></div>';
const aneBuildingStr = '<div class="form-group" style="margin:0;"><label>Building Name</label><select id="aneBuilding"';

// Wait, the original in admin.html is:
// <div class="form-group" style="margin:0;"><label>Area</label><select id="aneArea" class="form-control"><option value="">- Select Area -</option><option>Patelwadi</option><option>Shindewadi</option><option>Gurkhawadi</option></select></div>
// We need to add `onchange="aneOnAreaChange()"` to `aneArea` if it isn't there, and add the sub-area div.
const aneAreaRegex = /<div class="form-group" style="margin:0;"><label>Area<\/label><select id="aneArea" class="form-control"(?: onchange="[^"]*")?>.*?<\/select><\/div>/;

const newAneAreaAndSub = `
<div class="form-group" style="margin:0;">
    <label>Area</label>
    <select id="aneArea" class="form-control" onchange="aneOnAreaChange()">
        <option value="">- Select Area -</option>
    </select>
</div>
<div class="form-group" id="aneSubAreaGroup" style="margin:0; display:none;">
    <label>Sub-Area</label>
    <select id="aneSubArea" class="form-control">
        <option value="">- Select Sub-Area -</option>
    </select>
</div>
`;

adminHtml = adminHtml.replace(aneAreaRegex, newAneAreaAndSub.trim().replace(/\n/g, ''));

// We need to add `aneOnAreaChange` and update `aneLoadAreas` in admin.html
const aneLoadAreasRegex = /async function aneLoadAreas\(\) \{[\s\S]*?catch\(e\)\{\}[\s]*\}/;
const newAneLoadAreas = `
    async function aneLoadAreas() {
        try {
            const r = await fetch('/api/areas');
            const d = await r.json();
            const sel = document.getElementById('aneArea');
            if(!sel) return;
            sel.innerHTML = '<option value="">- Select Area -</option>';
            (d.areas||[]).forEach(a => {
                const o = document.createElement('option');
                o.value = a.name; o.textContent = a.name;
                sel.appendChild(o);
            });
            window._adeAreasData = d.areas || [];
        } catch(e) {}
    }

    async function aneOnAreaChange() {
        const areaName = document.getElementById('aneArea')?.value;
        const group = document.getElementById('aneSubAreaGroup');
        const sel = document.getElementById('aneSubArea');
        if (!group || !sel) return;
        
        if (areaName) {
            group.style.display = 'block';
            sel.innerHTML = '<option value="">- Select Sub-Area -</option>';
            const areaObj = (window._adeAreasData || []).find(a => a.name === areaName);
            if (areaObj) {
                try {
                    const r2 = await fetch('/api/sub-areas');
                    const d2 = await r2.json();
                    const subs = (d2.subAreas || []).filter(s => s.areaId === areaObj.id);
                    subs.forEach(s => {
                        sel.innerHTML += \`<option value="\${s.name}">\${s.name}</option>\`;
                    });
                } catch(e) {}
            }
        } else {
            group.style.display = 'none';
            sel.innerHTML = '<option value="">- Select Sub-Area -</option>';
        }
    }
`;

adminHtml = adminHtml.replace(aneLoadAreasRegex, newAneLoadAreas);

// Update submit payload for ane in admin.html
const anePayloadRegex = /area:document\.getElementById\('aneArea'\)\.value\|\|null,/;
const newAnePayload = `area:document.getElementById('aneArea').value||null,
            subArea:document.getElementById('aneSubArea')?.value||null,`;

// We have two places where aneArea is submitted (individual and business)
adminHtml = adminHtml.replace(/area:document\.getElementById\('aneArea'\)\.value\|\|null,/g, newAnePayload);

fs.writeFileSync('admin.html', adminHtml, 'utf8');

// 2. Fix dashboard.html badge rendering
let dashHtml = fs.readFileSync('dashboard.html', 'utf8');

// The replacement we did in patch3 was:
// ${e.area ? `<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;"><i class="fas fa-map-marker-alt" style="font-size:.65rem;margin-right:3px;"></i>${e.area}${e.subArea ? ` &bull; ${e.subArea}` : ''}${e.buildingName ? ` &middot; ${e.buildingName}${e.flatNumber ? ` (Flat: ${e.flatNumber})` : ''}` : ''}${e.landmark ? ` &middot; ${e.landmark}` : ''}</span>` : ''}

// We want to show the span if ANY location field exists!
const badSpanLogic = /\$\{e\.area \? `<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:\.72rem;font-weight:700;"><i class="fas fa-map-marker-alt" style="font-size:\.65rem;margin-right:3px;"><\/i>\$\{e\.area\}\$\{e\.subArea \? ` &bull; \$\{e\.subArea\}` : ''\}\$\{e\.buildingName \? ` &middot; \$\{e\.buildingName\}\$\{e\.flatNumber \? ` \(Flat: \$\{e\.flatNumber\}\)` : ''\}` : ''\}\$\{e\.landmark \? ` &middot; \$\{e\.landmark\}` : ''\}<\/span>` : ''\}/g;

const goodSpanLogic = `\${(e.area || e.subArea || e.buildingName || e.landmark) ? \`<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;"><i class="fas fa-map-marker-alt" style="font-size:.65rem;margin-right:3px;"></i>\${[e.area, e.subArea, e.buildingName ? \`\${e.buildingName}\${e.flatNumber ? \` (Flat: \${e.flatNumber})\` : ''}\` : null, e.landmark].filter(Boolean).join(' &middot; ')}</span>\` : ''}`;

dashHtml = dashHtml.replace(badSpanLogic, goodSpanLogic);

fs.writeFileSync('dashboard.html', dashHtml, 'utf8');

console.log('Fixed admin.html aneSubArea and dashboard.html badges');
