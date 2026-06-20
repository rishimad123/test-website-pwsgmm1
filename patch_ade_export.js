const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Find the exact function start/end (line-based)
const lines = html.split('\n');
let startIdx = -1, endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('async function adeExportExcel(lang')) {
        startIdx = i;
        break;
    }
}
if (startIdx < 0) { console.log('❌ adeExportExcel not found'); process.exit(1); }

// Find the closing `}` of this function (depth tracking)
let depth = 0;
let inFn = false;
for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
        if (ch === '{') { depth++; inFn = true; }
        if (ch === '}') { depth--; }
    }
    if (inFn && depth === 0) { endIdx = i; break; }
}

console.log('Found adeExportExcel: lines', startIdx + 1, '-', endIdx + 1);

// Build the new function — columns matching the adeTable exactly, grouped by landmark
const newFn = `    async function adeExportExcel(lang = 'en') {
        if (typeof XLSX === 'undefined') {
            const st = document.getElementById('adeStatus');
            if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent='Excel library not loaded.'; }
            return;
        }
        const srcData = _adeFiltered && _adeFiltered.length ? _adeFiltered : _adeAll;
        if (!srcData || !srcData.length) {
            const st = document.getElementById('adeStatus');
            if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent='No entries to export.'; }
            return;
        }

        const fmtDate = (v) => {
            if (!v) return '';
            try {
                const d = new Date(v);
                if (isNaN(d)) return String(v);
                return String(d.getDate()).padStart(2,'0') + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + d.getFullYear();
            } catch(_) { return String(v); }
        };

        // ── Column definitions matching the on-screen table ──────────────────
        const COLS = [
            '#',
            'Book No',
            'Receipt No',
            'Donor Name',
            'Type',
            'WhatsApp',
            'Mobile',
            'Building',
            'Landmark',
            'Area',
            'Amount',
            'Mode',
            'Ref No.',
            'Submitted By',
            'Date'
        ];

        // ── Map each entry to a row object ────────────────────────────────────
        const mapRow = (e, idx) => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
            return {
                '#':            idx,
                'Book No':      e.bookNumber  != null ? Number(e.bookNumber)  : '',
                'Receipt No':   e.receiptNumber != null ? Number(e.receiptNumber) : '',
                'Donor Name':   donor,
                'Type':         e.donorType || '',
                'WhatsApp':     e.whatsappNumber || '',
                'Mobile':       e.mobileNumber || '',
                'Building':     (e.buildingName || '') + (e.flatNumber ? ' Flat:' + e.flatNumber : ''),
                'Landmark':     e.landmark || '',
                'Area':         e.area || '',
                'Amount':       e.amount != null ? Number(e.amount) : '',
                'Mode':         e.paymentMode || '',
                'Ref No.':      e.referenceNumber || '',
                'Submitted By': e.submittedBy || '',
                'Date':         fmtDate(e.submittedAt)
            };
        };

        // ── Group by Landmark (same order as on-screen table) ─────────────────
        const lmOrder = [];
        const lmGroups = {};
        srcData.forEach(e => {
            const lm = String(e.landmark || '(No Landmark)').trim();
            if (!lmGroups[lm]) { lmGroups[lm] = []; lmOrder.push(lm); }
            lmGroups[lm].push(e);
        });

        // ── Build AoA (Array of Arrays) with landmark header rows ─────────────
        const wsData = [COLS];  // column header row
        let rowNum = 0;
        lmOrder.forEach(lm => {
            // Landmark group separator — name in col 1, rest blank
            const sepRow = COLS.map((_, ci) => ci === 0 ? '► ' + lm : '');
            sepRow._isLm = true;
            wsData.push(sepRow);
            lmGroups[lm].forEach(e => {
                rowNum++;
                const r = mapRow(e, rowNum);
                wsData.push(COLS.map(c => r[c] !== undefined ? r[c] : ''));
            });
        });

        // Optional Marathi translation (translates string cells)
        let finalData = wsData;
        if (lang === 'mr' && typeof translateExcelData === 'function') {
            // Translate only the data rows (skip header and landmark rows)
            const dataRows = srcData.map((e, i) => mapRow(e, i+1));
            const translated = await translateExcelData(dataRows);
            // Re-build with translated values
            const tData = [COLS];
            let rIdx = 0;
            lmOrder.forEach(lm => {
                const sepRow = COLS.map((_, ci) => ci === 0 ? '► ' + lm : '');
                sepRow._isLm = true;
                tData.push(sepRow);
                lmGroups[lm].forEach(() => {
                    const tr = translated[rIdx++];
                    tData.push(COLS.map(c => tr ? (tr[c] !== undefined ? tr[c] : '') : ''));
                });
            });
            finalData = tData;
        }

        // ── Create worksheet from AoA ─────────────────────────────────────────
        const ws = XLSX.utils.aoa_to_sheet(finalData);

        // ── Styles ────────────────────────────────────────────────────────────
        const colHdrStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
            fill: { patternType: 'solid', fgColor: { rgb: '1D6F42' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top:{style:'thin',color:{rgb:'000000'}}, bottom:{style:'thin',color:{rgb:'000000'}}, left:{style:'thin',color:{rgb:'000000'}}, right:{style:'thin',color:{rgb:'000000'}} }
        };
        const lmHdrStyle = {
            font: { bold: true, color: { rgb: '7B3F00' }, sz: 10 },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFE0B2' } },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: { top:{style:'thin',color:{rgb:'E65100'}}, bottom:{style:'thin',color:{rgb:'E65100'}}, left:{style:'thin',color:{rgb:'E65100'}}, right:{style:'thin',color:{rgb:'E65100'}} }
        };

        // Track which rows are landmark headers
        const lmRows = new Set();
        finalData.forEach((row, ri) => { if (row._isLm) lmRows.add(ri); });

        // Apply column header style (row 0)
        for (let c = 0; c < COLS.length; c++) {
            const addr = XLSX.utils.encode_cell({ r: 0, c });
            if (ws[addr]) ws[addr].s = colHdrStyle;
        }

        // Apply data + landmark header row styles
        let dataRowIdx = 0;
        for (let ri = 1; ri < finalData.length; ri++) {
            if (lmRows.has(ri)) {
                for (let c = 0; c < COLS.length; c++) {
                    const addr = XLSX.utils.encode_cell({ r: ri, c });
                    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
                    ws[addr].s = lmHdrStyle;
                }
                continue;
            }
            const isAlt = dataRowIdx % 2 === 0;
            const bg = isAlt ? 'FFFFFF' : 'F7F7F7';
            dataRowIdx++;
            for (let c = 0; c < COLS.length; c++) {
                const addr = XLSX.utils.encode_cell({ r: ri, c });
                if (!ws[addr]) continue;
                const isAmt = c === 10; // Amount column
                ws[addr].s = isAmt && ws[addr].t === 'n' ? {
                    font: { sz: 10 },
                    numFmt: '#,##0',
                    fill: { patternType: 'solid', fgColor: { rgb: bg } },
                    alignment: { horizontal: 'right', vertical: 'center' },
                    border: { top:{style:'hair',color:{rgb:'CCCCCC'}}, bottom:{style:'hair',color:{rgb:'CCCCCC'}}, left:{style:'hair',color:{rgb:'CCCCCC'}}, right:{style:'hair',color:{rgb:'CCCCCC'}} }
                } : {
                    font: { sz: 10 },
                    fill: { patternType: 'solid', fgColor: { rgb: bg } },
                    alignment: { horizontal: 'left', vertical: 'center' },
                    border: { top:{style:'hair',color:{rgb:'CCCCCC'}}, bottom:{style:'hair',color:{rgb:'CCCCCC'}}, left:{style:'hair',color:{rgb:'CCCCCC'}}, right:{style:'hair',color:{rgb:'CCCCCC'}} }
                };
            }
        }

        // Column widths
        ws['!cols'] = [
            { wch: 5  },  // #
            { wch: 8  },  // Book No
            { wch: 10 },  // Receipt No
            { wch: 28 },  // Donor Name
            { wch: 12 },  // Type
            { wch: 13 },  // WhatsApp
            { wch: 13 },  // Mobile
            { wch: 20 },  // Building
            { wch: 30 },  // Landmark
            { wch: 22 },  // Area
            { wch: 12 },  // Amount
            { wch: 10 },  // Mode
            { wch: 14 },  // Ref No.
            { wch: 16 },  // Submitted By
            { wch: 13 }   // Date
        ];
        ws['!rows'] = [{ hpt: 28 }]; // header row height

        // ── Assemble workbook ─────────────────────────────────────────────────
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Donation Data Entry');

        const t = new Date();
        const dd = String(t.getDate()).padStart(2,'0');
        const mm = String(t.getMonth()+1).padStart(2,'0');
        XLSX.writeFile(wb, 'Donation_Data_Entry_' + dd + '-' + mm + '-' + t.getFullYear() + '.xlsx');

        const st = document.getElementById('adeStatus');
        if (st) {
            st.style.display = 'block';
            st.style.background = '#E8F5E9';
            st.style.color = '#1B5E20';
            st.textContent = 'Exported ' + rowNum + ' entries to Excel';
            setTimeout(() => st.style.display = 'none', 3000);
        }
    }`;

// Splice in the new function
const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
const result = [...before, newFn, ...after].join('\n');
fs.writeFileSync('admin.html', result, 'utf8');
console.log('✅ adeExportExcel rewritten successfully');
console.log('New line count:', result.split('\n').length);
