import os

def replace_in_file(filename, old_str, new_str):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Success: Replaced string in {filename}")
    else:
        print(f"Error: Target string not found in {filename}")

# Dashboard label
dashboard_label_old = """        const lbl = document.getElementById('deRefLabel');
        if (lbl) lbl.innerHTML = `${_deRefLabels[mode] || 'Reference Number'} <span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>`;"""

dashboard_label_new = """        const lbl = document.getElementById('deRefLabel');
        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = `${_deRefLabels[mode] || 'Reference Number'} ${reqHtml}`;
        }"""

replace_in_file('dashboard.html', dashboard_label_old, dashboard_label_new)


# Admin label
admin_label_old = """        const lbl = document.getElementById('adeRefLabel');
        if (lbl) lbl.innerHTML = `${_adeRefLabels[mode] || 'Reference Number'} <span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>`;"""

admin_label_new = """        const lbl = document.getElementById('adeRefLabel');
        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = `${_adeRefLabels[mode] || 'Reference Number'} ${reqHtml}`;
        }"""

replace_in_file('admin.html', admin_label_old, admin_label_new)


# Admin payload (since it was reverted)
admin_payload_old = """                const getTrim = id => getVal(id).trim();

                payload = {"""

admin_payload_new = """                const getTrim = id => getVal(id).trim();

                const pMode = getVal('adePaymentMode') || 'Cash';
                const refNum = getTrim('adeReference');
                if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
                if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

                payload = {"""

replace_in_file('admin.html', admin_payload_old, admin_payload_new)
