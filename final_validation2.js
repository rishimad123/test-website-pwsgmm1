const fs = require('fs');

function applyValidation(filename, isDashboard) {
    let content = fs.readFileSync(filename, 'utf8');

    // PAYLOAD
    const payloadRegex = isDashboard 
        ? /const getTrim = id => getVal\(id\)\.trim\(\);[\r\n\s]+payload = \{/
        : /const getTrim = id => getVal\(id\)\.trim\(\);[\r\n\s]+payload = \{/;
        
    const pModeVar = isDashboard ? 'dePaymentMode' : 'adePaymentMode';
    const pRefVar = isDashboard ? 'deReference' : 'adeReference';
    
    const payloadReplacement = `const getTrim = id => getVal(id).trim();

            const pMode = getVal('${pModeVar}') || 'Cash';
            const refNum = getTrim('${pRefVar}');
            if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
            if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

            payload = {`;

    if (payloadRegex.test(content) && !content.includes(`getVal('${pModeVar}') || 'Cash';`)) {
        content = content.replace(payloadRegex, payloadReplacement);
        console.log(`Successfully replaced payload in ${filename}`);
    } else {
        console.log(`Payload replace skipped/failed for ${filename}`);
    }

    // LABEL (Dashboard)
    if (isDashboard) {
        const labelRegex = /lbl\.innerHTML = `\$\{_deRefLabels\[mode\] \|\| 'Reference Number'\} <span style="color:#aaa;font-weight:400;font-size:\.85rem;">\(optional\)<\/span>`;/;
        const labelReplacement = `lbl.innerHTML = \`\${_deRefLabels[mode] || 'Reference Number'} \${(mode === 'Cheque' || mode === 'RTGS') ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>'}\`;`;
        if (labelRegex.test(content)) {
            content = content.replace(labelRegex, labelReplacement);
            console.log(`Successfully replaced label in ${filename}`);
        }
    }

    fs.writeFileSync(filename, content, 'utf8');
}

applyValidation('dashboard.html', true);
applyValidation('admin.html', false);
