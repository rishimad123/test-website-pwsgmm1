const fs = require('fs');

let content = fs.readFileSync('tshirts.js', 'utf8');

if (!content.includes('tsExportBtn')) {
    const refreshBtnHTML = `<button id="tsRefreshBtn" onclick="tsFetchAndRender()" style="padding:6px 14px;background:#3949AB;color:#fff;border:none;border-radius:12px;font-size:.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s;box-shadow:0 2px 6px rgba(57,73,171,.3);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>`;
    
    const exportBtnHTML = `<button id="tsExportBtn" onclick="tsExportToExcel()" style="padding:6px 14px;background:#1b5e20;color:#fff;border:none;border-radius:12px;font-size:.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s;box-shadow:0 2px 6px rgba(27,94,32,.3);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-file-excel"></i> Export to Excel
                    </button>`;

    content = content.replace(refreshBtnHTML, refreshBtnHTML + '\n                    ' + exportBtnHTML);
}

if (!content.includes('tsExportToExcel')) {
    const exportScript = `

// ==========================================
// EXPORT TO EXCEL
// ==========================================
window.tsExportToExcel = function() {
    if (!tsApplications || tsApplications.length === 0) {
        alert("No T-shirt applications to export.");
        return;
    }

    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="utf-8">';
    html += '<style>td, th { text-align: center; vertical-align: middle; }</style>';
    html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>T-shirts</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
    html += '<body>';
    
    // Summary
    const sizeGroups = {};
    [18,20,22,24,26,28,30,32,34,36,38,40,42,44,46].forEach(s => sizeGroups[s] = 0);
    let totalShirts = 0;
    tsApplications.forEach(app => {
        const s = parseInt(app.size);
        const q = parseInt(app.quantity) || 1;
        if (sizeGroups[s] !== undefined) { sizeGroups[s] += q; totalShirts += q; }
    });

    html += '<table border="1" cellpadding="5" style="border-collapse: collapse; text-align: center; vertical-align: middle;">';
    html += '<thead><tr><th colspan="2" style="background-color: #1b5e20; color: white; font-size: 16px;">T-SHIRT REQUIREMENTS SUMMARY</th></tr>';
    html += '<tr><th style="background-color: #e8f5e9;">Size</th><th style="background-color: #e8f5e9;">Total Required</th></tr></thead>';
    html += '<tbody>';
    Object.keys(sizeGroups).forEach(size => {
        if (sizeGroups[size] > 0) {
            html += \`<tr><td>\${size}</td><td>\${sizeGroups[size]}</td></tr>\`;
        }
    });
    html += \`<tr><th style="background-color: #ffecb3;">Total</th><th style="background-color: #ffecb3;">\${totalShirts}</th></tr>\`;
    html += '</tbody></table><br><br>';

    // Details
    html += '<table border="1" cellpadding="5" style="border-collapse: collapse; text-align: center; vertical-align: middle;">';
    html += '<thead><tr><th colspan="4" style="background-color: #1565c0; color: white; font-size: 16px;">DETAILED APPLICATIONS</th></tr>';
    html += '<tr>';
    ['Size Number', 'Name of Applicant', 'Contact Number', 'Quantity Applied'].forEach(h => {
        html += \`<th style="background-color: #e3f2fd; font-weight: bold;">\${h}</th>\`;
    });
    html += '</tr></thead><tbody>';
    
    const sorted = [...tsApplications].sort((a, b) => {
        if (parseInt(a.size) !== parseInt(b.size)) return parseInt(a.size) - parseInt(b.size);
        return (a.name || '').localeCompare(b.name || '');
    });

    sorted.forEach(app => {
        html += \`<tr>\`;
        html += \`<td>\${app.size || '-'}</td>\`;
        html += \`<td>\${app.name || '-'}</td>\`;
        html += \`<td>\${app.phone || '-'}</td>\`;
        html += \`<td>\${app.quantity || 1}</td>\`;
        html += \`</tr>\`;
    });
    html += '</tbody></table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`T-shirt_Export_\${new Date().toISOString().slice(0,10)}.xls\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
`;
    content += exportScript;
}

fs.writeFileSync('tshirts.js', content, 'utf8');
console.log('Successfully injected Export to Excel into tshirts.js!');
