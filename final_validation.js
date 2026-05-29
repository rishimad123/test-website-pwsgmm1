const fs = require('fs');

function applyValidation(filename) {
    let content = fs.readFileSync(filename, 'utf8');
    const isDashboard = filename === 'dashboard.html';
    
    // Label replace
    const oldLabel = isDashboard 
        ? "lbl.innerHTML = `${_deRefLabels[mode] || 'Reference Number'} <span style=\"color:#aaa;font-weight:400;font-size:.85rem;\">(optional)</span>`;"
        : "lbl.innerHTML = `${_adeRefLabels[mode] || 'Reference Number'} <span style=\"color:#aaa;font-weight:400;font-size:.85rem;\">(optional)</span>`;";
        
    const newLabel = isDashboard
        ? `lbl.innerHTML = \\\`\\\${_deRefLabels[mode] || 'Reference Number'} \\\${(mode === 'Cheque' || mode === 'RTGS') ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>'}\\\`;`.replace(/\\\\/g, '')
        : `lbl.innerHTML = \\\`\\\${_adeRefLabels[mode] || 'Reference Number'} \\\${(mode === 'Cheque' || mode === 'RTGS') ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>'}\\\`;`.replace(/\\\\/g, '');

    if (content.includes(oldLabel)) {
        content = content.replace(oldLabel, newLabel);
        console.log(`Successfully replaced label in ${filename}`);
    } else {
        console.log(`Label target not found in ${filename}`);
    }

    // Payload replace (only if not already done)
    const oldPayload = "const getTrim = id => getVal(id).trim();\\r\\n\\r\\n                payload = {".replace(/\\\\r\\\\n/g, '\\r\\n');
    const oldPayload2 = "const getTrim = id => getVal(id).trim();\\n\\n                payload = {".replace(/\\\\n/g, '\\n');
    
    const modeVar = isDashboard ? 'dePaymentMode' : 'adePaymentMode';
    const refVar = isDashboard ? 'deReference' : 'adeReference';
    
    const newPayloadStr = `const getTrim = id => getVal(id).trim();

                const pMode = getVal('${modeVar}') || 'Cash';
                const refNum = getTrim('${refVar}');
                if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
                if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

                payload = {`;

    if (content.includes("const pMode = getVal('adePaymentMode')")) {
        console.log(`Payload already replaced in ${filename}`);
    } else if (content.includes(oldPayload)) {
        content = content.replace(oldPayload, newPayloadStr);
        console.log(`Successfully replaced payload in ${filename}`);
    } else if (content.includes(oldPayload2)) {
        content = content.replace(oldPayload2, newPayloadStr);
        console.log(`Successfully replaced payload in ${filename} (LF)`);
    } else {
        console.log(`Payload target not found in ${filename}`);
    }
    
    fs.writeFileSync(filename, content, 'utf8');
}

applyValidation('dashboard.html');
applyValidation('admin.html');
