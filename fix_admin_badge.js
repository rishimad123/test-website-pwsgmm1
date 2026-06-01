const fs = require('fs');

let adminHtml = fs.readFileSync('admin.html', 'utf8');

// The original logic:
// ${e.area ? `<span style="background:#E8F5E9;color:#1B5E20;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:20px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${e.area}${e.subArea ? ` - ${e.subArea}` : ''}</span>` : ''}

const adminRegex = /\$\{e\.area \? `<span style="background:#E8F5E9;color:#1B5E20;font-size:\.73rem;font-weight:700;padding:3px 9px;border-radius:20px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;"><\/i>\$\{e\.area\}\$\{e\.subArea \? ` - \$\{e\.subArea\}` : ''\}<\/span>` : ''\}/g;

const adminReplacement = `\${(e.area || e.subArea) ? \`<span style="background:#E8F5E9;color:#1B5E20;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:20px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>\${[e.area, e.subArea].filter(Boolean).join(' - ')}</span>\` : ''}`;

adminHtml = adminHtml.replace(adminRegex, adminReplacement);

// Also for dashboard.html we did:
// ${[e.area, e.subArea, e.buildingName ? \`${e.buildingName}${e.flatNumber ? \` (Flat: ${e.flatNumber})\` : ''}\` : null, e.landmark].filter(Boolean).join(' &middot; ')}
// Wait, that's already applied.

fs.writeFileSync('admin.html', adminHtml, 'utf8');
console.log('Fixed admin.html area badge condition');
