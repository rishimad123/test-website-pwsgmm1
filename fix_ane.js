const fs = require('fs');

function fixAneForm() {
    let content = fs.readFileSync('admin.html', 'utf8');

    // 1. Add aneBookType UI
    const targetUI = `                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                    <div class="form-group" style="margin:0;"><label>Book Number</label><select id="aneBook" class="form-control" onchange="aneBookChange()"><option value="">— Select —</option></select></div>`;
    const newUI = `                <div style="margin-bottom: 14px;">
                    <label style="font-weight:600;font-size:0.85rem;color:#333;margin-bottom:8px;display:block;">Book Type</label>
                    <div style="display:flex;gap:15px;align-items:center;">
                        <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:0.9rem;">
                            <input type="radio" name="aneBookType" value="New" checked onchange="anePopulateBooks(); aneBookChange();">
                            New Book (50 Books)
                        </label>
                        <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:0.9rem;">
                            <input type="radio" name="aneBookType" value="Old" onchange="anePopulateBooks(); aneBookChange();">
                            Old Book (30 Books)
                        </label>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                    <div class="form-group" style="margin:0;"><label>Book Number</label><select id="aneBook" class="form-control" onchange="aneBookChange()"><option value="">— Select —</option></select></div>`;
    content = content.replace(targetUI, newUI);

    // 2. Add anePopulateBooks() and modify aneInit()
    const targetInit = `    function aneInit() {
        const sel = document.getElementById('aneBook');
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select —</option>';
        for(let i=1;i<=50;i++) {
            const f=(i-1)*50+1, t=i*50;
            const o = document.createElement('option'); o.value=i; o.textContent=\`Book \${i} (\${f}–\${t})\`; sel.appendChild(o);
        }
        aneLoadAreas();
    }`;
    const newInit = `    function anePopulateBooks() {
        const sel = document.getElementById('aneBook');
        const bType = document.querySelector('input[name="aneBookType"]:checked')?.value || 'New';
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select —</option>';
        const maxBooks = bType === 'Old' ? 30 : 50;
        for(let i=1;i<=maxBooks;i++) {
            const f=(i-1)*50+1, t=i*50;
            const o = document.createElement('option'); o.value=i; o.textContent=\`Book \${i} (\${f}–\${t})\`; sel.appendChild(o);
        }
    }
    function aneInit() {
        anePopulateBooks();
        aneLoadAreas();
    }`;
    content = content.replace(targetInit, newInit);

    // 3. Modify aneBookChange() to use bType
    const targetChange = `        let used=[];
        try { const r=await fetch(\`/api/donation-entries/used-receipts/\${bn}\`); const d=await r.json(); used=d.usedReceipts||[]; } catch(e){}`;
    const newChange = `        let used=[];
        const bType = document.querySelector('input[name="aneBookType"]:checked')?.value || 'New';
        try { const r=await fetch(\`/api/donation-entries/used-receipts/\${bn}?type=\${bType}\`); const d=await r.json(); used=d.usedReceipts||[]; } catch(e){}`;
    content = content.replace(targetChange, newChange);

    // 4. Modify aneAutoReceipt() to use bType
    const targetAuto = `    async function aneAutoReceipt() {
        try {
            const r=await fetch('/api/donation-entries/next-receipt');`;
    const newAuto = `    async function aneAutoReceipt() {
        try {
            const bType = document.querySelector('input[name="aneBookType"]:checked')?.value || 'New';
            const r=await fetch(\`/api/donation-entries/next-receipt?type=\${bType}\`);`;
    content = content.replace(targetAuto, newAuto);

    // 5. Modify aneSave() to submit bType
    const targetSave = `            bookNumber: Number(document.getElementById('aneBook').value),
            receiptNumber: Number(document.getElementById('aneReceipt').value),
            donorType: dType,`;
    const newSave = `            bookNumber: Number(document.getElementById('aneBook').value),
            receiptNumber: Number(document.getElementById('aneReceipt').value),
            bookType: document.querySelector('input[name="aneBookType"]:checked')?.value || 'New',
            donorType: dType,`;
    content = content.replace(targetSave, newSave);

    fs.writeFileSync('admin.html', content, 'utf8');
    console.log('aneForm in admin.html fixed');
}

fixAneForm();
