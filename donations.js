// =====================================================================
// DONATION EXPLORER MODULE  (donations.js)
// Loaded after admin.js via <script src="donations.js">
// =====================================================================

// ── CANONICAL COLUMN ORDER (must match the Excel format exactly) ──────────
const DON_CANONICAL_COLS = [
    'Receipt Book',
    'Date',
    'Receipt No',
    'Receipt Type',
    'Name',
    'Location/ Area',
    'Current Year Amount',
    'Balance Pending',
    'Balance Receipt Amount',
    'Balance Recovered',
    'Balance Received Date',
    'Comments',
    'Balance Difference',
    'Common Location'
];

// ── Helper: detect which canonical col a stored col maps to ───────────────
function _donMapToCanonical(colName) {
    const cn = (colName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const canonMap = {
        'receipt book'          : 'Receipt Book',
        'book'                  : 'Receipt Book',
        'book no'               : 'Receipt Book',
        'book number'           : 'Receipt Book',
        'book no.'              : 'Receipt Book',
        'receipt no'            : 'Receipt No',
        'receipt no.'           : 'Receipt No',
        'receipt number'        : 'Receipt No',
        'receipt_no'            : 'Receipt No',
        'date'                  : 'Date',
        'receipt type'          : 'Receipt Type',
        'type'                  : 'Receipt Type',
        'receipt_type'          : 'Receipt Type',
        'name'                  : 'Name',
        'donor name'            : 'Name',
        'donor'                 : 'Name',
        'location/ area'        : 'Location/ Area',
        'location/area'         : 'Location/ Area',
        'location area'         : 'Location/ Area',
        'location'              : 'Location/ Area',
        'area'                  : 'Location/ Area',
        'current year amount'   : 'Current Year Amount',
        'current year amt'      : 'Current Year Amount',
        'amount'                : 'Current Year Amount',
        'amt'                   : 'Current Year Amount',
        'balance pending'       : 'Balance Pending',
        'balance'               : 'Balance Pending',
        'balance receipt amount': 'Balance Receipt Amount',
        'balance receipt amt'   : 'Balance Receipt Amount',
        'balance rcpt amount'   : 'Balance Receipt Amount',
        'balance recovered'     : 'Balance Recovered',
        'bal recovered'         : 'Balance Recovered',
        'bal. recovered'        : 'Balance Recovered',
        'balance received date' : 'Balance Received Date',
        'bal received date'     : 'Balance Received Date',
        'bal. recd date'        : 'Balance Received Date',
        'bal recd date'         : 'Balance Received Date',
        'comments'              : 'Comments',
        'comment'               : 'Comments',
        'remarks'               : 'Comments',
        'balance difference'    : 'Balance Difference',
        'bal difference'        : 'Balance Difference',
        'bal. difference'       : 'Balance Difference',
        'common location'       : 'Common Location',
        'common loc'            : 'Common Location',
    };
    return canonMap[cn] || null;
}

// ── Helper: format a cell value for date columns (ensure DD-MM-YYYY) ──────
function _donFormatDate(val) {
    if (!val && val !== 0) return '';
    // Already a formatted string in expected pattern?
    if (typeof val === 'string') {
        // Already DD-MM-YYYY
        if (/^\d{2}-\d{2}-\d{4}$/.test(val.trim())) return val.trim();
        // Try YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
            const [y, m, d] = val.trim().split('-');
            return `${d}-${m}-${y}`;
        }
        // Try DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) {
            const [d, m, y] = val.trim().split('/');
            return `${d}-${m}-${y}`;
        }
        // Try MM/DD/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val.trim())) {
            const parts = val.trim().split('/');
            return `${String(parts[1]).padStart(2,'0')}-${String(parts[0]).padStart(2,'0')}-${parts[2]}`;
        }
        return val;
    }
    // SheetJS Date object
    if (val instanceof Date) {
        const d = String(val.getDate()).padStart(2, '0');
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const y = val.getFullYear();
        return `${d}-${m}-${y}`;
    }
    // Excel serial date number (SheetJS sometimes passes these as numbers)
    if (typeof val === 'number' && val > 25569 && val < 60000) {
        // Convert Excel serial to JS Date (Excel epoch = 1900-01-01, JS offset 25569 days)
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        const d = String(date.getUTCDate()).padStart(2, '0');
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const y = date.getUTCFullYear();
        return `${d}-${m}-${y}`;
    }
    return String(val);
}

// ── Helper: normalise a row to canonical column names ─────────────────────
function _donNormaliseRow(rawRow) {
    const result = {};
    const dateColKeys = ['Date', 'Balance Received Date', 'Balance Reco Date'];

    // First pass: map known canonical columns
    for (const [origKey, origVal] of Object.entries(rawRow)) {
        if (origKey.startsWith('_')) { result[origKey] = origVal; continue; }
        const canonical = _donMapToCanonical(origKey);
        if (canonical) {
            if (dateColKeys.includes(canonical)) {
                result[canonical] = _donFormatDate(origVal);
            } else {
                result[canonical] = origVal;
            }
        }
    }

    // Second pass: copy unmapped columns as-is (they may be extra columns)
    for (const [origKey, origVal] of Object.entries(rawRow)) {
        if (origKey.startsWith('_')) continue;
        const canonical = _donMapToCanonical(origKey);
        if (!canonical && !(origKey in result)) {
            result[origKey] = origVal;
        }
    }

    return result;
}

// ── Build the effective column order for display/export ───────────────────
function _donBuildColOrder(columns) {
    // Start with canonical columns that exist in data
    const present = new Set(columns);
    const ordered = DON_CANONICAL_COLS.filter(c => present.has(c));
    // Append any extra columns not in canonical list
    columns.forEach(c => { if (!DON_CANONICAL_COLS.includes(c) && !c.startsWith('_')) ordered.push(c); });
    return ordered;
}

let _donAllRecords   = [];   // all records from server
let _donColumns      = [];   // column names
let _donFiltered     = [];   // after filter/search
let _donPage         = 1;
const DON_PAGE_SIZE  = 50;
let _donEditId       = null;
let _donAmountCol    = null; // auto-detected amount column
let _donYearCol      = null; // auto-detected year column
let _donLocCols      = [];   // columns used for Location filter
let _donLandCols     = [];   // columns used for Landmark filter

// ── Drag & Drop helpers ──────────────────────────────────────────────────────
function donDragOver(e) {
    e.preventDefault();
    const dz = document.getElementById('donDropZone');
    if (dz) { dz.style.borderColor = '#4CAF50'; dz.style.background = '#E8F5E9'; }
}
function donDragLeave(e) {
    const dz = document.getElementById('donDropZone');
    if (dz) { dz.style.borderColor = '#C8E6C9'; dz.style.background = '#F1F8E9'; }
}
function donDrop(e) {
    e.preventDefault();
    donDragLeave(e);
    const file = e.dataTransfer.files[0];
    if (file) donParseAndUpload(file);
}
function donFileSelected(e) {
    const file = e.target.files[0];
    if (file) donParseAndUpload(file);
    e.target.value = '';
}

// ── Parse Excel with SheetJS, then POST JSON to server ──────────────────────
async function donParseAndUpload(file) {
    const statusEl = document.getElementById('donUploadStatus');
    const progWrap = document.getElementById('donUploadProgress');
    const progBar  = document.getElementById('donProgressBar');
    const progLbl  = document.getElementById('donProgressLabel');

    const setStatus = (msg, ok) => {
        if (!statusEl) return;
        statusEl.style.display    = '';
        statusEl.style.background = ok ? '#E8F5E9' : '#FFEBEE';
        statusEl.style.color      = ok ? '#2E7D32' : '#C62828';
        statusEl.textContent      = msg;
    };

    if (file.size > 10 * 1024 * 1024) { setStatus('File too large. Max 10 MB.', false); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) { setStatus('Only .xlsx, .xls, or .csv files are supported.', false); return; }

    if (progWrap) progWrap.style.display = '';
    if (progBar)  progBar.style.width    = '10%';
    if (progLbl)  progLbl.textContent    = 'Reading file\u2026';

    try {
        const buf = await file.arrayBuffer();
        if (progBar) progBar.style.width = '40%';
        if (progLbl) progLbl.textContent = 'Parsing spreadsheet\u2026';

        if (typeof XLSX === 'undefined') {
            setStatus('\u274c SheetJS library not loaded. Please check your internet connection and reload.', false);
            if (progWrap) progWrap.style.display = 'none';
            return;
        }

        // Read workbook — do NOT use cellDates:true so we can handle dates ourselves
        // Use raw:false to get formatted cell values (preserves number & date formatting)
        const wb   = XLSX.read(buf, { type: 'array', cellDates: false, raw: false, dateNF: 'DD-MM-YYYY' });
        const ws   = wb.Sheets[wb.SheetNames[0]];

        // Use sheet_to_json with raw:false to get formatted strings (as displayed in Excel)
        // This preserves number formatting and date formatting from the source file
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, dateNF: 'DD-MM-YYYY' });

        // Also get raw rows to detect actual numeric values for numeric columns
        const rawRowsNumeric = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });

        if (rawRows.length === 0) {
            setStatus('Sheet is empty — no data rows found.', false);
            if (progWrap) progWrap.style.display = 'none';
            return;
        }

        // Merge: use formatted strings but keep actual numbers for numeric cols
        const numericCols = new Set();
        if (rawRowsNumeric.length > 0) {
            for (const key of Object.keys(rawRowsNumeric[0])) {
                // If any value in this column is a real number, mark it numeric
                const hasNum = rawRowsNumeric.some(r => typeof r[key] === 'number');
                if (hasNum) numericCols.add(key);
            }
        }

        const rows = rawRows.map((r, i) => {
            const merged = { ...r };
            // For numeric columns, use the raw numeric value from rawRowsNumeric
            if (rawRowsNumeric[i]) {
                for (const k of numericCols) {
                    if (k in rawRowsNumeric[i] && typeof rawRowsNumeric[i][k] === 'number') {
                        merged[k] = rawRowsNumeric[i][k];
                    }
                }
            }
            return merged;
        });

        // Normalise all rows to canonical column names and DD-MM-YYYY dates
        const normalisedRows = rows.map(_donNormaliseRow);

        if (progBar) progBar.style.width = '70%';
        if (progLbl) progLbl.textContent = `Uploading ${normalisedRows.length} records\u2026`;

        const mode     = document.querySelector('input[name="uploadMode"]:checked')?.value || 'append';
        const endpoint = mode === 'replace' ? '/api/donations/replace' : '/api/donations/upload';

        const res  = await fetch(`${endpoint}`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ records: normalisedRows })
        });
        const data = await res.json();
        if (progBar) progBar.style.width = '100%';

        if (res.ok && data.success) {
            setStatus(
                `\u2705 ${mode === 'replace' ? 'Replaced' : 'Appended'} ${data.uploaded} records. ` +
                `Total in database: ${data.total ?? data.uploaded}. ` +
                `Columns detected: ${data.columns.length}.`, true
            );
            if (typeof showNotification === 'function')
                showNotification(`Donation data uploaded! ${data.uploaded} records.`, 'success');
            try {
                const bc = new BroadcastChannel('donations_update');
                bc.postMessage({ type: 'refresh', uploaded: data.uploaded, total: data.total ?? data.uploaded });
                bc.close();
            } catch (_) {}
            setTimeout(() => {
                if (progWrap) { progWrap.style.display = 'none'; if (progBar) progBar.style.width = '0%'; }
            }, 2000);
            loadDonationExplorer();
        } else {
            setStatus('\u274c Server error: ' + (data.message || 'Unknown error'), false);
            if (progWrap) progWrap.style.display = 'none';
        }
    } catch (err) {
        setStatus('\u274c Parse/upload error: ' + err.message, false);
        if (progWrap) progWrap.style.display = 'none';
    }
}

// ── Auto-detect special columns from headers ─────────────────────────────────
function _donDetectColumns() {
    // Prefer canonical column names for detection
    const amtKw   = /current year amount|amount|amt|donation|don|rupee|\brs\b|inr/i;
    const yearKw  = /year|yr|varshe|वर्ष/i;
    const locKw   = /location|area|road|street|ward|locality|address|addr|nagar|galli|lane|plot|flat|house|sector/i;
    const landKw  = /common location|landmark|building|bldg|society|chawl|complex|tower|apt|appartment|apartment|opposite|near/i;

    _donAmountCol = _donColumns.find(c => amtKw.test(c))  || null;
    _donYearCol   = _donColumns.find(c => yearKw.test(c)) || null;
    _donLocCols   = _donColumns.filter(c => locKw.test(c)  && c !== _donAmountCol);
    _donLandCols  = _donColumns.filter(c => landKw.test(c) && c !== _donAmountCol);

    // Fallback: if no dedicated landmark col, use any address-ish column not already in locCols
    if (_donLandCols.length === 0 && _donLocCols.length > 1) {
        _donLandCols = [_donLocCols.pop()];
    }
}

// ── Load existing donation data from server ──────────────────────────────────
async function loadDonationExplorer() {
    try {
        const res  = await fetch('/api/donations');
        const data = await res.json();
        _donColumns    = data.columns || [];
        _donAllRecords = (data.records || []).filter(r => !r._deleted);
        _donPage       = 1;

        const statsBar   = document.getElementById('donStatsBar');
        const filterCard = document.getElementById('donFilterCard');
        const tableCard  = document.getElementById('donTableCard');
        const badge      = document.getElementById('donExplorerRecordBadge');

        if (_donColumns.length > 0) {
            _donDetectColumns();
            _donPopulateFilterHints();
            donApplyFilters();
            if (filterCard) filterCard.style.display = '';
            if (tableCard)  tableCard.style.display  = '';
            if (statsBar)   statsBar.style.display   = '';
            const colsEl = document.getElementById('donStatCols');
            if (colsEl)  colsEl.textContent  = _donColumns.length;
            const totEl  = document.getElementById('donStatTotal');
            if (totEl)   totEl.textContent   = _donAllRecords.length;
            // Update header badge
            if (badge) {
                badge.style.display = '';
                badge.textContent   = `${_donAllRecords.length.toLocaleString('en-IN')} records`;
            }
        } else {
            // No data — hide all panels and reset badge
            if (filterCard) filterCard.style.display = 'none';
            if (tableCard)  tableCard.style.display  = 'none';
            if (statsBar)   statsBar.style.display   = 'none';
            if (badge) { badge.style.display = 'none'; }
        }
    } catch (e) {
        // Silently ignore — server not running yet
    }
}

// ── Populate filter placeholders with detected column names ──────────────────
function _donPopulateFilterHints() {
    const locHint  = document.getElementById('donLocHint');
    const landHint = document.getElementById('donLandHint');
    const amtHint  = document.getElementById('donAmtDetected');
    if (locHint)  locHint.textContent  = _donLocCols.length  ? `(${_donLocCols.join(', ')})` : '';
    if (landHint) landHint.textContent = _donLandCols.length ? `(${_donLandCols.join(', ')})` : '';
    if (amtHint)  amtHint.textContent  = _donAmountCol       ? `(column: "${_donAmountCol}")` : '(no amount column detected)';
}

// Standalone HTML escaping helpers
function _escHtmlDon(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _escAttrDon(s) { return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ── Apply all filters ────────────────────────────────────────────────────────
function donApplyFilters() {
    const locQ  = (document.getElementById('donLocSearch')?.value  || '').toLowerCase().trim();
    const lanQ  = (document.getElementById('donLandSearch')?.value || '').toLowerCase().trim();
    const gQ    = (document.getElementById('donGlobalSearch')?.value || '').toLowerCase().trim();
    const amtMn = parseFloat(document.getElementById('donAmtMin')?.value || '') || null;
    const amtMx = parseFloat(document.getElementById('donAmtMax')?.value || '') || null;

    _donFiltered = _donAllRecords.filter(r => {
        // Location filter
        if (locQ) {
            const hay = (_donLocCols.length ? _donLocCols : _donColumns)
                .map(c => String(r[c] ?? '')).join(' ').toLowerCase();
            if (!hay.includes(locQ)) return false;
        }
        // Landmark filter
        if (lanQ) {
            const hay = (_donLandCols.length ? _donLandCols : _donColumns)
                .map(c => String(r[c] ?? '')).join(' ').toLowerCase();
            if (!hay.includes(lanQ)) return false;
        }
        // Amount range filter
        if (_donAmountCol && (amtMn !== null || amtMx !== null)) {
            const amt = parseFloat(r[_donAmountCol]) || 0;
            if (amtMn !== null && amt < amtMn) return false;
            if (amtMx !== null && amt > amtMx) return false;
        }
        // Global search
        if (gQ) {
            if (!Object.values(r).join(' ').toLowerCase().includes(gQ)) return false;
        }
        return true;
    });

    const sum = _donAmountCol
        ? _donFiltered.reduce((acc, r) => acc + (parseFloat(r[_donAmountCol]) || 0), 0)
        : 0;
    const filtEl = document.getElementById('donStatFiltered');
    const sumEl  = document.getElementById('donStatSum');
    if (filtEl) filtEl.textContent = _donFiltered.length;
    if (sumEl)  sumEl.textContent  = '\u20b9' + sum.toLocaleString('en-IN');

    _donPage = 1;
    donRenderTable();
}

// ── Clear all filters ────────────────────────────────────────────────────────
function donClearFilters() {
    ['donLocSearch','donLandSearch','donGlobalSearch','donAmtMin','donAmtMax'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    donApplyFilters();
}

// ── Get year value from a record ─────────────────────────────────────────────
function _donGetYear(r) {
    if (_donYearCol && r[_donYearCol] !== undefined && r[_donYearCol] !== '') {
        return String(r[_donYearCol]).trim();
    }
    // Try to extract a 4-digit year from any date-like column
    for (const col of _donColumns) {
        const v = String(r[col] ?? '');
        const m = v.match(/\b(19|20)\d{2}\b/);
        if (m) return m[0];
    }
    return 'Unknown';
}

// ── Group records by year ────────────────────────────────────────────────────
function _donGroupByYear(records) {
    const groups = new Map();
    records.forEach(r => {
        const yr = _donGetYear(r);
        if (!groups.has(yr)) groups.set(yr, []);
        groups.get(yr).push(r);
    });
    // Sort years descending
    return new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

// ── Paginated table render — grouped by year ─────────────────────────────────
function donRenderTable() {
    const thead = document.getElementById('donThead');
    const tbody = document.getElementById('donTbody');
    if (!thead || !tbody) return;

    // Build ordered column list (canonical order + extras)
    const colsToShow = _donBuildColOrder(_donColumns);

    thead.innerHTML = '<tr>' +
        colsToShow.map(c => `<th style="white-space:nowrap;font-size:.82rem;">${_escHtmlDon(c)}</th>`).join('') +
        '<th style="font-size:.82rem;">Actions</th></tr>';

    if (_donFiltered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colsToShow.length + 1}" style="text-align:center;color:#aaa;padding:40px;font-size:.9rem;">No matching records found.</td></tr>`;
        _updatePagination(0);
        return;
    }

    // Group by year then paginate across the flat list
    const groups    = _donGroupByYear(_donFiltered);
    const flatRows  = [];         // { type:'header'|'row', data }
    groups.forEach((recs, yr) => {
        const yearSum = _donAmountCol
            ? recs.reduce((s, r) => s + (parseFloat(r[_donAmountCol]) || 0), 0)
            : null;
        flatRows.push({ type: 'header', yr, count: recs.length, sum: yearSum });
        recs.forEach(r => flatRows.push({ type: 'row', r }));
    });

    const start    = (_donPage - 1) * DON_PAGE_SIZE;
    const pageRows = flatRows.slice(start, start + DON_PAGE_SIZE);

    tbody.innerHTML = pageRows.map(item => {
        if (item.type === 'header') {
            const sumTxt = item.sum !== null
                ? ` &nbsp;·&nbsp; <span style="color:#27AE60;font-weight:700;">\u20b9${item.sum.toLocaleString('en-IN')}</span>`
                : '';
            return `<tr>
                <td colspan="${colsToShow.length + 1}"
                    style="padding:10px 14px;background:linear-gradient(90deg,#1a237e08,transparent);border-top:2px solid #e8eaf0;border-bottom:1px solid #e8eaf0;">
                    <span style="display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <span style="background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;border-radius:20px;padding:3px 14px;font-size:.78rem;font-weight:700;letter-spacing:.04em;">
                            ${_escHtmlDon(item.yr)}
                        </span>
                        <span style="font-size:.82rem;color:#555;">${item.count.toLocaleString('en-IN')} records${sumTxt}</span>
                    </span>
                </td>
            </tr>`;
        }
        const { r } = item;
        const cells = colsToShow.map(col => {
            const val     = r[col] ?? '';
            const isAmt   = col === _donAmountCol;
            // Highlight numeric amount columns in green, keep dates as-is text
            const display = isAmt && val !== ''
                ? `<strong style="color:#27AE60;">\u20b9${Number(val).toLocaleString('en-IN')}</strong>`
                : _escHtmlDon(String(val));
            return `<td style="white-space:nowrap;font-size:.85rem;">${display}</td>`;
        }).join('');
        const safeId = r._id.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        return `<tr onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''">
            ${cells}
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" title="Edit" onclick="openEditDonModal('${safeId}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete" title="Delete" onclick="deleteDonRecord('${safeId}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');

    _updatePagination(flatRows.length);
}

function _updatePagination(total) {
    const totalPages = Math.ceil(total / DON_PAGE_SIZE);
    const start      = (_donPage - 1) * DON_PAGE_SIZE;
    const infoEl     = document.getElementById('donPaginationInfo');
    const btnsEl     = document.getElementById('donPaginationBtns');
    if (infoEl) infoEl.textContent = total > 0
        ? `Showing ${start + 1}\u2013${Math.min(start + DON_PAGE_SIZE, total)} of ${_donFiltered.length.toLocaleString('en-IN')} records`
        : '';
    if (!btnsEl) return;
    btnsEl.innerHTML = '';
    if (totalPages <= 1) return;
    const mkBtn = (label, pg, active, disabled) => {
        const b = document.createElement('button');
        b.innerHTML = label;
        b.disabled  = disabled;
        b.style.cssText = `padding:5px 12px;border:1.5px solid ${active?'var(--primary-color)':'#ddd'};border-radius:6px;background:${active?'var(--primary-color)':'#fff'};color:${active?'#fff':'#333'};cursor:${disabled?'default':'pointer'};font-size:.83rem;transition:all .15s;`;
        if (!disabled && !active) b.onmouseover = () => b.style.background = '#f5f5f5';
        if (!disabled && !active) b.onmouseout  = () => b.style.background = '#fff';
        if (!disabled) b.onclick = () => { _donPage = pg; donRenderTable(); };
        return b;
    };
    if (_donPage > 1) btnsEl.appendChild(mkBtn('\u2039 Prev', _donPage - 1, false, false));
    const lo = Math.max(1, _donPage - 3), hi = Math.min(totalPages, _donPage + 3);
    if (lo > 1) { btnsEl.appendChild(mkBtn('1', 1, false, false)); if (lo > 2) btnsEl.insertAdjacentHTML('beforeend','<span style="color:#aaa;padding:0 4px;">\u2026</span>'); }
    for (let p = lo; p <= hi; p++) btnsEl.appendChild(mkBtn(p, p, p === _donPage, false));
    if (hi < totalPages) { if (hi < totalPages-1) btnsEl.insertAdjacentHTML('beforeend','<span style="color:#aaa;padding:0 4px;">\u2026</span>'); btnsEl.appendChild(mkBtn(totalPages, totalPages, false, false)); }
    if (_donPage < totalPages) btnsEl.appendChild(mkBtn('Next \u203a', _donPage + 1, false, false));
}

// ── Triple-Confirmation Delete ───────────────────────────────────────────────
async function deleteDonRecord(id) {
    if (!confirm('Delete this donation record?\n\nData is soft-deleted (kept on server, hidden from view).')) return;
    const typed = prompt('Second confirmation: type the word  DELETE  in capital letters to proceed.');
    if (typed !== 'DELETE') { alert('Deletion cancelled. You did not type DELETE correctly.'); return; }
    if (!confirm('FINAL CONFIRMATION\n\nThe record will be permanently hidden. Are you absolutely sure?')) return;
    try {
        const res  = await fetch(`/api/donations/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            if (typeof showNotification === 'function') showNotification('Record deleted (data retained on server).', 'success');
            _donAllRecords = _donAllRecords.filter(r => r._id !== id);
            donApplyFilters();
        } else {
            if (typeof showNotification === 'function') showNotification('Error: ' + (data.message || 'Could not delete.'), 'error');
        }
    } catch (e) {
        if (typeof showNotification === 'function') showNotification('Cannot reach server.', 'error');
    }
}

// ── Edit Donation Modal ──────────────────────────────────────────────────────
function openEditDonModal(id) {
    const record = _donAllRecords.find(r => r._id === id);
    if (!record) return;
    _donEditId = id;
    const fieldsEl = document.getElementById('editDonFields');
    if (!fieldsEl) return;
    const colsToEdit = _donBuildColOrder(_donColumns);
    fieldsEl.innerHTML = colsToEdit.map(col => {
        const val     = record[col] ?? '';
        const safeCol = col.replace(/\W/g,'_');
        return `
        <div class="form-group">
            <label style="font-size:.85rem;font-weight:600;">${_escHtmlDon(col)}</label>
            <input type="text" id="editDonField_${safeCol}" value="${_escAttrDon(String(val))}"
                style="padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;width:100%;font-size:.9rem;">
        </div>`;
    }).join('');
    const modal = document.getElementById('editDonationModal');
    if (modal) modal.classList.add('active');
}
function closeEditDonModal() {
    _donEditId = null;
    const modal = document.getElementById('editDonationModal');
    if (modal) modal.classList.remove('active');
}
async function saveEditDon(ev) {
    ev.preventDefault();
    if (!_donEditId) return;
    const payload = {};
    const colsToEdit = _donBuildColOrder(_donColumns);
    colsToEdit.forEach(col => {
        const el = document.getElementById(`editDonField_${col.replace(/\W/g,'_')}`);
        if (el) payload[col] = el.value.trim();
    });
    const btn = document.getElementById('editDonSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }
    try {
        const res  = await fetch(`/api/donations/${encodeURIComponent(_donEditId)}`, {
            method : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            const idx = _donAllRecords.findIndex(r => r._id === _donEditId);
            if (idx >= 0) Object.assign(_donAllRecords[idx], payload);
            closeEditDonModal();
            if (typeof showNotification === 'function') showNotification('Donation record updated!', 'success');
            donApplyFilters();
        } else {
            if (typeof showNotification === 'function') showNotification('Error: ' + (data.message || 'Could not save.'), 'error');
        }
    } catch (e) {
        if (typeof showNotification === 'function') showNotification('Cannot reach server.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
}

// ── Export filtered rows as Excel (matching the exact column order & formatting) ────
function donExportExcel() {
    if (_donFiltered.length === 0) {
        if (typeof showNotification === 'function') showNotification('No data to export.', 'error');
        return;
    }
    if (typeof XLSX === 'undefined') {
        if (typeof showNotification === 'function') showNotification('SheetJS library not loaded — cannot export.', 'error');
        return;
    }

    // Exact 14-column order matching the Excel format
    const COLS = [
        'Receipt Book', 'Date', 'Receipt No', 'Receipt Type', 'Name',
        'Location/ Area', 'Current Year Amount', 'Balance Pending',
        'Balance Receipt Amount', 'Balance Recovered', 'Balance Received Date',
        'Comments', 'Balance Difference', 'Common Location'
    ];

    // Build from _donColumns, preserving only canonical + any extras
    const exportCols = [
        ...COLS.filter(c => _donColumns.includes(c)),
        ..._donColumns.filter(c => !COLS.includes(c) && !c.startsWith('_'))
    ];
    // If no canonical cols matched, fall back to original columns
    const finalCols = exportCols.length > 0 ? exportCols : _donColumns.filter(c => !c.startsWith('_'));

    const dateColSet = new Set(['Date', 'Balance Received Date', 'Balance Reco Date']);
    const numericColSet = new Set([
        'Receipt Book', 'Receipt No', 'Current Year Amount', 'Balance Pending',
        'Balance Receipt Amount', 'Balance Recovered', 'Balance Difference'
    ]);

    // ── Sort: Receipt Book ASC → Location/Area ASC → Receipt No ASC ─────────
    const sorted = [..._donFiltered].sort((a, b) => {
        const bkA = Number(a['Receipt Book'] || a['Receipt No'] || 0);
        const bkB = Number(b['Receipt Book'] || b['Receipt No'] || 0);
        if (_donColumns.includes('Receipt Book') && bkA !== bkB) return bkA - bkB;
        const locA = String(a['Location/ Area'] || '');
        const locB = String(b['Location/ Area'] || '');
        const locCmp = locA.localeCompare(locB);
        if (locCmp !== 0) return locCmp;
        const rnA = Number(a['Receipt No'] || 0);
        const rnB = Number(b['Receipt No'] || 0);
        return rnA - rnB;
    });

    // Build worksheet data
    const wsData = [finalCols];
    sorted.forEach(record => {
        const row = finalCols.map(col => {
            const val = record[col] !== undefined ? record[col] : '';
            if (!val && val !== 0) return '';
            if (dateColSet.has(col)) return _donFormatDate(val);
            if (numericColSet.has(col)) {
                if (col.includes('Amount') || col.includes('Balance')) {
                    const cleanStr = String(val).replace(/[^\d.-]/g, '');
                    const num = parseFloat(cleanStr);
                    return isNaN(num) ? '' : num;
                }
                const num = parseFloat(String(val).replace(/,/g, ''));
                return isNaN(num) ? val : num;
            }
            return val;
        });
        wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Force date cells to text
    const dateColIndices = finalCols.map((c, i) => dateColSet.has(c) ? i : -1).filter(i => i >= 0);
    for (let r = 1; r < wsData.length; r++) {
        for (const ci of dateColIndices) {
            const addr = XLSX.utils.encode_cell({ r, c: ci });
            if (ws[addr]) { ws[addr].t = 's'; ws[addr].z = '@'; }
        }
    }

    // Styling
    const hStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: '1D6F42' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: { top:{style:'thin',color:{rgb:'000000'}}, bottom:{style:'thin',color:{rgb:'000000'}}, left:{style:'thin',color:{rgb:'000000'}}, right:{style:'thin',color:{rgb:'000000'}} }
    };
    const numericColIndices = new Set(finalCols.map((c, i) => numericColSet.has(c) ? i : -1).filter(i => i >= 0));
    const balDiffIdx = finalCols.indexOf('Balance Difference');
    const balPendIdx = finalCols.indexOf('Balance Pending');
    const balRcptIdx = finalCols.indexOf('Balance Receipt Amount');

    for (let c = 0; c < finalCols.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[addr]) ws[addr].s = hStyle;
    }
    for (let r = 1; r < wsData.length; r++) {
        const alt = r % 2 === 0;
        const fg  = alt ? 'F0FFF4' : 'FFFFFF';
        for (let c = 0; c < finalCols.length; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (!ws[addr]) continue;
            let cellFg = fg;
            if (c === balDiffIdx && ws[addr].t === 'n') {
                cellFg = ws[addr].v < 0 ? 'FFCCCC' : (ws[addr].v > 0 ? 'CCFFCC' : fg);
            }
            if ((c === balPendIdx || c === balRcptIdx) && ws[addr].t === 'n' && ws[addr].v > 0) {
                cellFg = 'DDEEFF';
            }
            ws[addr].s = numericColIndices.has(c) && ws[addr].t === 'n' ? {
                numFmt: '#,##0', fill:{patternType:'solid',fgColor:{rgb:cellFg}},
                alignment:{horizontal:'right',vertical:'center'},
                border:{top:{style:'hair',color:{rgb:'CCCCCC'}},bottom:{style:'hair',color:{rgb:'CCCCCC'}},left:{style:'hair',color:{rgb:'CCCCCC'}},right:{style:'hair',color:{rgb:'CCCCCC'}}}
            } : {
                fill:{patternType:'solid',fgColor:{rgb:cellFg}}, alignment:{vertical:'center'},
                border:{top:{style:'hair',color:{rgb:'CCCCCC'}},bottom:{style:'hair',color:{rgb:'CCCCCC'}},left:{style:'hair',color:{rgb:'CCCCCC'}},right:{style:'hair',color:{rgb:'CCCCCC'}}}
            };
        }
    }

    // Column widths
    ws['!cols'] = finalCols.map(col => {
        const maxLen = Math.max(col.length, ...sorted.map(r => String(r[col] ?? '').length));
        return { wch: Math.min(Math.max(maxLen + 2, 10), 35) };
    });
    ws['!rows'] = [{ hpt: 32 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Donation list');

    // Second sheet: Descending order
    const sortedDesc = [...sorted].reverse();
    const wsData2 = [finalCols, ...sortedDesc.map(r => finalCols.map(c => {
        const val = r[c] !== undefined ? r[c] : '';
        if (!val && val !== 0) return '';
        if (dateColSet.has(c)) return _donFormatDate(val);
        if (numericColSet.has(c)) { const n = parseFloat(String(val).replace(/,/g,'')); return isNaN(n)?val:n; }
        return val;
    }))];
    const ws2 = XLSX.utils.aoa_to_sheet(wsData2);
    for (let r = 1; r < wsData2.length; r++) {
        for (const ci of dateColIndices) {
            const addr = XLSX.utils.encode_cell({ r, c: ci });
            if (ws2[addr]) { ws2[addr].t = 's'; ws2[addr].z = '@'; }
        }
    }
    for (let c = 0; c < finalCols.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (ws2[addr]) ws2[addr].s = hStyle;
    }
    ws2['!cols'] = ws['!cols'];
    ws2['!rows'] = [{ hpt: 32 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Descending Order');

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const fileName = 'donations_' + dd + '-' + mm + '-' + today.getFullYear() + '.xlsx';
    XLSX.writeFile(wb, fileName);
    if (typeof showNotification === 'function')
        showNotification('Exported ' + sorted.length + ' records to ' + fileName, 'success');
}

// ── Legacy CSV export (kept for backward compatibility) ──────────────────────
function donExportCSV() {
    if (_donFiltered.length === 0) {
        if (typeof showNotification === 'function') showNotification('No data to export.', 'error');
        return;
    }
    const exportCols = _donBuildColOrder(_donColumns);
    const q   = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
    const hdr = exportCols.map(q).join(',');
    const rows = _donFiltered.map(r => exportCols.map(c => q(r[c])).join(','));
    const csv  = '\uFEFF' + [hdr, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `donations_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    if (typeof showNotification === 'function') showNotification(`Exported ${_donFiltered.length} records.`, 'success');
}
