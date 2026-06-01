const fs = require('fs');

let content = fs.readFileSync('dashboard.html', 'utf8');

// The exact substring for area
const areaSearch = '<i class="fas fa-map-marker-alt" style="font-size:.65rem;margin-right:3px;"></i>${e.area||\'—\'}';
const areaSearchR = '<i class="fas fa-map-marker-alt" style="font-size:.65rem;margin-right:3px;"></i>${r.area||\'—\'}';

const paymentSearch = '${e.paymentMode||\'—\'}';

// We just replace these specific substrings for now as a fallback? No, we want the whole span conditionally rendered.

// Let's find the span indices manually
function replaceSpan(content, markerStr, replaceStr) {
    let index = content.indexOf(markerStr);
    while (index !== -1) {
        let spanStart = content.lastIndexOf('<span', index);
        let spanEnd = content.indexOf('</span>', index) + 7;
        if (spanStart !== -1 && spanEnd !== -1) {
            content = content.substring(0, spanStart) + replaceStr + content.substring(spanEnd);
        }
        index = content.indexOf(markerStr, spanStart + replaceStr.length);
    }
    return content;
}

content = replaceSpan(content, areaSearchR, '${r.area ? `<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;"><i class="fas fa-map-marker-alt" style="font-size:.65rem;margin-right:3px;"></i>${r.area}</span>` : \'\'}');

content = replaceSpan(content, areaSearch, '${e.area ? `<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;"><i class="fas fa-map-marker-alt" style="font-size:.65rem;margin-right:3px;"></i>${e.area}${e.subArea ? ` &bull; ${e.subArea}` : \'\'}${e.buildingName ? ` &middot; ${e.buildingName}${e.flatNumber ? ` (Flat: ${e.flatNumber})` : \'\'}` : \'\'}${e.landmark ? ` &middot; ${e.landmark}` : \'\'}</span>` : \'\'}');

// For paymentMode, we need to conditionally render the span
let pIndex = content.indexOf(paymentSearch);
while (pIndex !== -1) {
    let spanStart = content.lastIndexOf('<span', pIndex);
    let spanEnd = content.indexOf('</span>', pIndex) + 7;
    if (spanStart !== -1 && spanEnd !== -1) {
        let originalSpan = content.substring(spanStart, spanEnd);
        let newSpan = '${e.paymentMode ? `' + originalSpan.replace(paymentSearch, '${e.paymentMode}') + '` : \'\'}';
        content = content.substring(0, spanStart) + newSpan + content.substring(spanEnd);
    }
    pIndex = content.indexOf(paymentSearch, spanStart + 10);
}

fs.writeFileSync('dashboard.html', content, 'utf8');
console.log('Done replacing spans in dashboard.html');
