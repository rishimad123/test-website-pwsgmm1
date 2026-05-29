const fs = require('fs');

function applyDashboardChanges() {
    let content = fs.readFileSync('dashboard.html', 'utf8');

    // 1. Add Book Type selector UI
    const uiOld = `                            <!-- ── Section A: Receipt Details ── -->
                            <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                                <i class="fas fa-book-open" style="margin-right:6px;"></i>Receipt Details
                            </div>
                            <div id="deReceiptGrid"`;
    
    const uiNew = `                            <!-- ── Section A: Receipt Details ── -->
                            <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                                <i class="fas fa-book-open" style="margin-right:6px;"></i>Receipt Details
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <label style="font-weight:600;font-size:0.85rem;color:#333;margin-bottom:8px;display:block;">Book Type</label>
                                <div style="display:flex;gap:15px;align-items:center;">
                                    <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:0.9rem;">
                                        <input type="radio" name="deBookType" value="New" checked onchange="dePopulateBooks(); deOnBookChange();">
                                        New Book (50 Books)
                                    </label>
                                    <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:0.9rem;">
                                        <input type="radio" name="deBookType" value="Old" onchange="dePopulateBooks(); deOnBookChange();">
                                        Old Book (30 Books)
                                    </label>
                                </div>
                            </div>
                            
                            <div id="deReceiptGrid"`;
    content = content.replace(uiOld, uiNew);

    // 2. dePopulateBooks
    const popOld = `    function dePopulateBooks() {
        const sel = document.getElementById('deBookNumber');
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select Book —</option>';
        for (let b = 1; b <= 50; b++) {`;
    const popNew = `    function dePopulateBooks() {
        const sel = document.getElementById('deBookNumber');
        const bType = document.querySelector('input[name="deBookType"]:checked')?.value || 'New';
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select Book —</option>';
        const maxBooks = bType === 'Old' ? 30 : 50;
        for (let b = 1; b <= maxBooks; b++) {`;
    content = content.replace(popOld, popNew);

    // 3. deOnBookChange
    const bookChangeOld = `        let used = [];
        try {
            const r = await fetch(\`/api/donation-entries/used-receipts/\${bn}\`);`;
    const bookChangeNew = `        let used = [];
        const bType = document.querySelector('input[name="deBookType"]:checked')?.value || 'New';
        try {
            const r = await fetch(\`/api/donation-entries/used-receipts/\${bn}?type=\${bType}\`);`;
    content = content.replace(bookChangeOld, bookChangeNew);

    // 4. deAutoReceipt
    const autoOld = `    async function deAutoReceipt() {
        try {
            const resp = await fetch('/api/donation-entries/next-receipt');`;
    const autoNew = `    async function deAutoReceipt() {
        try {
            const bType = document.querySelector('input[name="deBookType"]:checked')?.value || 'New';
            const resp = await fetch(\`/api/donation-entries/next-receipt?type=\${bType}\`);`;
    content = content.replace(autoOld, autoNew);

    // 5. Payload
    const payloadOld = `                bookNumber      : Number(getVal('deBookNumber')),
                receiptNumber   : Number(getVal('deReceiptNumber')),
                donorType,`;
    const payloadNew = `                bookNumber      : Number(getVal('deBookNumber')),
                receiptNumber   : Number(getVal('deReceiptNumber')),
                bookType        : document.querySelector('input[name="deBookType"]:checked')?.value || 'New',
                donorType,`;
    content = content.replace(payloadOld, payloadNew);

    // 6. brLoad table row display
    const brRowOld = `<td style="font-weight:700;">Bk \${r.bookNumber} #\${r.receiptNumber}</td>`;
    const brRowNew = `<td style="font-weight:700;">Bk \${r.bookNumber} (\${r.bookType || 'New'}) #\${r.receiptNumber}</td>`;
    content = content.replace(brRowOld, brRowNew);

    // 7. dsRenderTable display
    const tblRowOld = `<td style="font-weight:700;">Bk \${e.bookNumber}</td>`;
    const tblRowNew = `<td style="font-weight:700;">Bk \${e.bookNumber} <span style="font-size:0.75rem;color:#888;">(\${e.bookType || 'New'})</span></td>`;
    content = content.replace(tblRowOld, tblRowNew);

    // 8. dsRenderCards display
    const cardRowOld = `Bk \${e.bookNumber} / #\${e.receiptNumber}`;
    const cardRowNew = `Bk \${e.bookNumber} (\${e.bookType || 'New'}) / #\${e.receiptNumber}`;
    content = content.replace(cardRowOld, cardRowNew);

    fs.writeFileSync('dashboard.html', content, 'utf8');
    console.log('Dashboard updated!');
}

applyDashboardChanges();
