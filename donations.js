// =====================================================================
// DONATION EXPLORER MODULE  (donations.js)
// Loaded after admin.js via <script src="donations.js">
// =====================================================================

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

        const wb   = XLSX.read(buf, { type: 'array', cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) {
            setStatus('Sheet is empty — no data rows found.', false);
            if (progWrap) progWrap.style.display = 'none';
            return;
        }

        if (progBar) progBar.style.width = '70%';
        if (progLbl) progLbl.textContent = `Uploading ${rows.length} records\u2026`;

        const mode     = document.querySelector('input[name="uploadMode"]:checked')?.value || 'append';
        const endpoint = mode === 'replace' ? '/api/donations/replace' : '/api/donations/upload';

        const res  = await fetch(`${endpoint}`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ records: rows })
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
    const amtKw   = /amount|amt|donation|don|rupee|\brs\b|inr/i;
    const yearKw  = /year|yr|varshe|वर्ष/i;
    const locKw   = /road|area|street|ward|locality|location|address|addr|nagar|galli|lane|plot|flat|house|sector/i;
    const landKw  = /landmark|building|bldg|society|chawl|complex|tower|apt|appartment|apartment|opposite|near/i;

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
// =====================================================
// COMPLETE donRenderTable() - REPLACE YOUR EXISTING ONE
// Mobile = cards view | PC = table view
// =====================================================

function donRenderTable() {
  const thead     = document.getElementById('donThead');
  const tbody     = document.getElementById('donTbody');
  const tableEl   = document.getElementById('donTable');
  const cardsWrap = document.getElementById('donCardsWrap');
  const isMobile  = window.innerWidth <= 768;

  if (!tbody) return;

  // --- Show/hide table vs cards based on screen size ---
  if (tableEl)   tableEl.style.display   = isMobile ? 'none' : '';
  if (cardsWrap) cardsWrap.style.display = isMobile ? ''     : 'none';

  // --- Empty state ---
  if (_donFiltered.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="${(_donColumns.length + 1)}" style="text-align:center;color:#aaa;padding:30px;">No records found</td></tr>`;
    if (cardsWrap) cardsWrap.innerHTML = '<p style="text-align:center;color:#aaa;padding:30px 0;font-size:.9rem;">No records found</p>';
    _updatePagination(0);
    return;
  }

  // --- Group by year + build flat rows (shared for both views) ---
  const groups  = _donGroupByYear(_donFiltered);
  const flatRows = [];
  groups.forEach((recs, yr) => {
    const yearSum = _donAmountCol
      ? recs.reduce((s, r) => s + (parseFloat(r[_donAmountCol]) || 0), 0)
      : null;
    flatRows.push({ type: 'header', yr, count: recs.length, sum: yearSum });
    recs.forEach(r => flatRows.push({ type: 'row', r }));
  });

  const start    = (_donPage - 1) * DON_PAGE_SIZE;
  const pageRows = flatRows.slice(start, start + DON_PAGE_SIZE);

  // ======================================================
  // MOBILE — CARD VIEW
  // ======================================================
  if (isMobile && cardsWrap) {
    cardsWrap.innerHTML = pageRows.map(item => {

      // --- Year header card ---
      if (item.type === 'header') {
        const sumTxt = item.sum !== null
          ? `<span class="don-year-sum">₹${item.sum.toLocaleString('en-IN')}</span>`
          : '';
        return `
          <div class="don-year-header">
            <span class="don-year-badge">${_escHtmlDon(item.yr)}</span>
            <span class="don-year-count">${item.count.toLocaleString('en-IN')} records</span>
            ${sumTxt}
          </div>`;
      }

      // --- Data card ---
      const r = item.r;

      // Donor name — first non-amount column
      const nameCol   = _donColumns.find(c => c !== _donAmountCol) || _donColumns[0];
      const donorName = nameCol ? _escHtmlDon(String(r[nameCol] ?? '')) : '—';

      // Amount
      const amtRaw    = _donAmountCol ? r[_donAmountCol] : null;
      const amtDisplay = (amtRaw !== null && amtRaw !== undefined && amtRaw !== '')
        ? `₹${Number(amtRaw).toLocaleString('en-IN')}`
        : '—';

      // Area / Location
      const locCol  = _donLocCols  && _donLocCols.length  ? _donLocCols[0]  : null;
      const areaVal = locCol ? String(r[locCol] ?? '').trim() : '';

      // Landmark / Building
      const landCol = _donLandCols && _donLandCols.length ? _donLandCols[0] : null;
      const landVal = landCol ? String(r[landCol] ?? '').trim() : '';

      // Payment mode — detect cash/online/cheque/upi value
      const modeCol = _donColumns.find(c => {
        const v = String(r[c] ?? '').toLowerCase();
        return ['cash','online','cheque','upi','neft','rtgs','dd'].includes(v);
      });
      const modeVal = modeCol ? String(r[modeCol] ?? '').trim() : '';

      // Receipt / Book number
      const receiptCol = _donColumns.find(c => /receipt|rcpt|slip|book|bk|no\b|#/i.test(c));
      const receiptVal = receiptCol ? String(r[receiptCol] ?? '').trim() : '';

      // Timestamp
      const tsCol = _donColumns.find(c => /date|time|ts|created|stamp|entry/i.test(c));
      const tsRaw = tsCol ? String(r[tsCol] ?? '') : '';
      let tsDisplay = '';
      if (tsRaw) {
        try {
          const d = new Date(tsRaw);
          if (!isNaN(d)) {
            tsDisplay = d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
              + '<br>' + d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
          } else {
            tsDisplay = _escHtmlDon(tsRaw);
          }
        } catch(_) { tsDisplay = _escHtmlDon(tsRaw); }
      }

      // Entered by
      const byCol = _donColumns.find(c =>
        /\b(by|user|volunteer|enteredby|entry_by)\b/i.test(c) && c !== nameCol
      );
      const byVal = byCol ? String(r[byCol] ?? '').trim() : '';

      const safeId = String(r._id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");

      return `
        <div class="don-card">
          <div class="don-card-top">
            <div class="don-card-name">${donorName}</div>
            <button class="don-card-edit-btn"
              onclick="openEditDonModal('${safeId}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
          </div>
          <div class="don-card-tags">
            ${receiptVal ? `<span class="don-tag don-tag-book">📋 ${_escHtmlDon(receiptVal)}</span>` : ''}
            ${areaVal    ? `<span class="don-tag don-tag-area">📍 ${_escHtmlDon(areaVal)}</span>`    : ''}
            ${landVal && landVal !== areaVal
              ? `<span class="don-tag don-tag-book">🏠 ${_escHtmlDon(landVal)}</span>` : ''}
            ${modeVal    ? `<span class="don-tag don-tag-mode">${_escHtmlDon(modeVal)}</span>`       : ''}
          </div>
          <div class="don-card-amount">${amtDisplay}</div>
          <div class="don-card-footer">
            <div class="don-card-meta">
              ${byVal
                ? `<i class="fas fa-user"></i>&nbsp;<span>${_escHtmlDon(byVal)}</span>`
                : ''}
            </div>
            <div class="don-card-time">${tsDisplay}</div>
          </div>
        </div>`;
    }).join('');

    _updatePagination(flatRows.length);
    return; // stop here for mobile — don't render table
  }

  // ======================================================
  // PC — TABLE VIEW (your original code, unchanged)
  // ======================================================
  const colsToShow = _donColumns;

  thead.innerHTML = '<tr>' +
    colsToShow.map(c => `<th style="white-space:nowrap;font-size:.82rem;">${_escHtmlDon(c)}</th>`).join('') +
    '<th style="font-size:.82rem;">Actions</th></tr>';

  tbody.innerHTML = pageRows.map(item => {
    if (item.type === 'header') {
      const sumTxt = item.sum !== null
        ? `&nbsp;&nbsp;<span style="color:#27AE60;font-weight:700;">\u20b9${item.sum.toLocaleString('en-IN')}</span>`
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
        </td></tr>`;
    }

    const r     = item.r;
    const cells = colsToShow.map(col => {
      const val    = r[col] ?? '';
      const isAmt  = col === _donAmountCol;
      const display = isAmt
        ? `<strong style="color:#27AE60;">\u20b9${Number(val).toLocaleString('en-IN')}</strong>`
        : _escHtmlDon(String(val));
      return `<td style="white-space:nowrap;font-size:.85rem;">${display}</td>`;
    }).join('');

    const safeId = String(r._id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");

    return `<tr onmouseover="this.style.background='#f9f4ff'"
                onmouseout="this.style.background=''">
      ${cells}
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" title="Edit"
            onclick="openEditDonModal('${safeId}')">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  _updatePagination(flatRows.length);
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
    fieldsEl.innerHTML = _donColumns.map(col => {
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
    _donColumns.forEach(col => {
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

// ── Export filtered rows as CSV ──────────────────────────────────────────────
function donExportCSV() {
    if (_donFiltered.length === 0) {
        if (typeof showNotification === 'function') showNotification('No data to export.', 'error');
        return;
    }
    const q   = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
    const hdr = _donColumns.map(q).join(',');
    const rows = _donFiltered.map(r => _donColumns.map(c => q(r[c])).join(','));
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
