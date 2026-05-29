const fs = require('fs');

function applyAdminChanges() {
    let content = fs.readFileSync('admin.html', 'utf8');

    // 1. Add Book Type selector UI
    const uiOld = `                <!-- ── Section A: Receipt Details ── -->
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                    <i class="fas fa-book-open" style="margin-right:6px;"></i>Receipt Details
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">`;
    
    const uiNew = `                <!-- ── Section A: Receipt Details ── -->
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                    <i class="fas fa-book-open" style="margin-right:6px;"></i>Receipt Details
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-weight:600;font-size:0.85rem;color:#333;margin-bottom:8px;display:block;">Book Type</label>
                    <div style="display:flex;gap:15px;align-items:center;">
                        <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:0.9rem;">
                            <input type="radio" name="adeBookType" value="New" checked onchange="adePopulateBooks(); adeOnBookChange();">
                            New Book (50 Books)
                        </label>
                        <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:0.9rem;">
                            <input type="radio" name="adeBookType" value="Old" onchange="adePopulateBooks(); adeOnBookChange();">
                            Old Book (30 Books)
                        </label>
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">`;
    content = content.replace(uiOld, uiNew);

    // 2. adePopulateBooks
    const popOld = `    function adePopulateBooks() {
        const sel = document.getElementById('adeBookNumber');
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select Book —</option>';
        for (let b = 1; b <= 50; b++) {`;
    const popNew = `    function adePopulateBooks() {
        const sel = document.getElementById('adeBookNumber');
        const bType = document.querySelector('input[name="adeBookType"]:checked')?.value || 'New';
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select Book —</option>';
        const maxBooks = bType === 'Old' ? 30 : 50;
        for (let b = 1; b <= maxBooks; b++) {`;
    content = content.replace(popOld, popNew);

    // 3. adeOnBookChange
    const bookChangeOld = `        let used = [];
        try {
            const r = await fetch(\`/api/donation-entries/used-receipts/\${bn}\`);`;
    const bookChangeNew = `        let used = [];
        const bType = document.querySelector('input[name="adeBookType"]:checked')?.value || 'New';
        try {
            const r = await fetch(\`/api/donation-entries/used-receipts/\${bn}?type=\${bType}\`);`;
    content = content.replace(bookChangeOld, bookChangeNew);

    // 4. adeAutoReceipt
    const autoOld = `    async function adeAutoReceipt() {
        try {
            const resp = await fetch('/api/donation-entries/next-receipt');`;
    const autoNew = `    async function adeAutoReceipt() {
        try {
            const bType = document.querySelector('input[name="adeBookType"]:checked')?.value || 'New';
            const resp = await fetch(\`/api/donation-entries/next-receipt?type=\${bType}\`);`;
    content = content.replace(autoOld, autoNew);

    // 5. Payload
    const payloadOld = `            payload = {
                bookNumber      : Number(getVal('adeBookNumber')),
                receiptNumber   : Number(getVal('adeReceiptNumber')),
                donorType,`;
    const payloadNew = `            payload = {
                bookNumber      : Number(getVal('adeBookNumber')),
                receiptNumber   : Number(getVal('adeReceiptNumber')),
                bookType        : document.querySelector('input[name="adeBookType"]:checked')?.value || 'New',
                donorType,`;
    content = content.replace(payloadOld, payloadNew);

    fs.writeFileSync('admin.html', content, 'utf8');
    console.log('Admin HTML updated!');
}

applyAdminChanges();
