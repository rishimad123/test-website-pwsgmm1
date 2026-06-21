
    // ── Volunteer Donor Search ─────────────────────────────────────────────────
    // Volunteers see ONLY 4 key fields: Donor Name, Address, Landmark, Amount.
    // All financial columns are hidden. Records grouped by year.

    let _dsRecords  = [], _dsColumns = [], _dsFiltered = [], _dsPage = 1;
    let _dsAmtCol   = null;  // detected amount column
    let _dsYearCol  = null;  // detected year column
    let _dsNameCol  = null;  // detected donor name column
    let _dsAddrCols = [];    // detected address/location columns
    let _dsLandCols = [];    // detected landmark/building columns
    let _dsVolCols  = [];    // final 4 columns shown to volunteer
    const DS_PAGE   = 30;
    let _dsFiltersOpen = false;

    // ── Keyword detectors ───────────────────────────────────────────────────────
    const _KW_AMT   = /amount|amt|donation|don|rupee|\brs\b|inr/i;
    const _KW_YEAR  = /year|yr|varshe|वर्ष/i;
    const _KW_NAME  = /donor|name|naam|नाम/i;
    const _KW_ADDR  = /road|landmark|street|ward|locality|location|address|addr|nagar|galli|lane|plot|flat|house|sector/i;
    const _KW_LAND  = /landmark|building|bldg|society|chawl|complex|tower|apt|apartment|opposite|near/i;

    function _dsDetectCols() {
        _dsAmtCol   = _dsColumns.find(c => _KW_AMT.test(c))  || null;
        _dsYearCol  = _dsColumns.find(c => _KW_YEAR.test(c)) || null;
        _dsNameCol  = _dsColumns.find(c => _KW_NAME.test(c)) || null;
        _dsAddrCols = _dsColumns.filter(c => _KW_ADDR.test(c) && c !== _dsAmtCol);
        _dsLandCols = _dsColumns.filter(c => _KW_LAND.test(c) && c !== _dsAmtCol);
        // If no dedicated landmark col, pull last address col
        if (_dsLandCols.length === 0 && _dsAddrCols.length > 1) {
            _dsLandCols = [_dsAddrCols[_dsAddrCols.length - 1]];
        }
        // Build the 4-column volunteer display set (no duplicates, ordered)
        const seen = new Set();
        _dsVolCols  = [];
        const addCol = c => { if (c && !seen.has(c)) { seen.add(c); _dsVolCols.push(c); } };
        addCol(_dsNameCol);
        _dsAddrCols.forEach(addCol);
        _dsLandCols.forEach(addCol);
        addCol(_dsAmtCol);
        // Trim to 4 columns max (Name, best-addr, landmark, amount)
        if (_dsVolCols.length > 4) {
            const keep = [];
            if (_dsNameCol)             keep.push(_dsNameCol);
            if (_dsAddrCols.length)     keep.push(_dsAddrCols[0]);
            if (_dsLandCols.length)     keep.push(_dsLandCols[0]);
            if (_dsAmtCol)              keep.push(_dsAmtCol);
            _dsVolCols = [...new Set(keep)];
        }
        // Fallback: if still empty, show up to 4 non-financial cols
        if (_dsVolCols.length === 0) {
            const fin = /balance|cash|bank|withdrawn|collection|expense|growth|notes/i;
            _dsVolCols = _dsColumns.filter(c => !fin.test(c)).slice(0, 4);
        }
    }

    // Toggle filter panel
    function dsToggleFilters() {
        _dsFiltersOpen = !_dsFiltersOpen;
        const panel = document.getElementById('dsFilterPanel');
        const lbl   = document.getElementById('dsToggleBtnLabel');
        const btn   = document.getElementById('dsToggleFiltersBtn');
        if (panel) panel.style.display  = _dsFiltersOpen ? '' : 'none';
        if (lbl)   lbl.textContent      = _dsFiltersOpen ? 'Hide Filters' : 'Filters';
        if (btn)   btn.style.background = _dsFiltersOpen ? '#e8eaf6' : '#f8f9fa';
    }

    // ── Get year value from a record ─────────────────────────────────────────
    function _dsGetYear(r) {
        if (_dsYearCol && r[_dsYearCol] !== undefined && String(r[_dsYearCol]).trim() !== '')
            return String(r[_dsYearCol]).trim();
        for (const col of _dsColumns) {
            const m = String(r[col] ?? '').match(/\b(19|20)\d{2}\b/);
            if (m) return m[0];
        }
        return 'Unknown';
    }

    // ── Group records by year, newest first ──────────────────────────────────
    function _dsGroupByYear(records) {
        const map = new Map();
        records.forEach(r => {
            const yr = _dsGetYear(r);
            if (!map.has(yr)) map.set(yr, []);
            map.get(yr).push(r);
        });
        return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
    }

    // Load data from server
    async function loadDonorSearch() {
        const msgEl = document.getElementById('dsLoadingMsg');
        const wrap  = document.getElementById('dsTableWrap');
        if (msgEl) {
            msgEl.style.display = '';
            msgEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:1.3rem;margin-bottom:10px;display:block;color:#ccc;"></i>Loading donor records\u2026';
        }
        if (wrap) wrap.style.display = 'none';
        try {
            const res  = await fetch('/api/donations');
            const data = await res.json();
            _dsColumns  = data.columns || [];
            _dsRecords  = data.records || [];
            _dsFiltered = _dsRecords;
            _dsPage     = 1;
            _dsDetectCols();

            if (_dsVolCols.length > 0) {
                dsApplyFilters();
                if (msgEl) msgEl.style.display = 'none';
            } else if (_dsColumns.length > 0) {
                if (msgEl) {
                    msgEl.style.display = '';
                    msgEl.innerHTML = '<i class="fas fa-lock" style="font-size:1.4rem;opacity:.4;margin-bottom:8px;display:block;color:#888;"></i>No donor details available in current dataset.';
                }
            } else {
                if (msgEl) {
                    msgEl.style.display = '';
                    msgEl.innerHTML = '<i class="fas fa-cloud-upload-alt" style="font-size:1.8rem;opacity:.3;margin-bottom:8px;display:block;"></i>No data uploaded yet \u2014 ask your admin to upload the Excel file.';
                }
            }
        } catch (e) {
            if (msgEl) {
                msgEl.style.display = '';
                msgEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="font-size:1.4rem;opacity:.5;margin-bottom:8px;display:block;color:#E67E22;"></i>\u26a0 Cannot connect to server.';
            }
        }
    }

    // ── Apply 3 filters (Location, Landmark, Amount) + global search ─────────
    function dsApplyFilters() {
        const gq  = (document.getElementById('dsGlobalSearch')?.value || '').toLowerCase().trim();
        const locQ = (document.getElementById('dsLocSearch')?.value  || '').toLowerCase().trim();
        const lanQ = (document.getElementById('dsLandSearch')?.value || '').toLowerCase().trim();
        const mn  = parseFloat(document.getElementById('dsAmtMin')?.value || '') || null;
        const mx  = parseFloat(document.getElementById('dsAmtMax')?.value || '') || null;

        _dsFiltered = _dsRecords.filter(r => {
            // Location filter — search address columns
            if (locQ) {
                const hay = (_dsAddrCols.length ? _dsAddrCols : _dsColumns)
                    .map(c => String(r[c] ?? '')).join(' ').toLowerCase();
                if (!hay.includes(locQ)) return false;
            }
            // Landmark filter — search landmark/building columns
            if (lanQ) {
                const hay = (_dsLandCols.length ? _dsLandCols : _dsColumns)
                    .map(c => String(r[c] ?? '')).join(' ').toLowerCase();
                if (!hay.includes(lanQ)) return false;
            }
            // Amount range
            if (_dsAmtCol && (mn !== null || mx !== null)) {
                const a = parseFloat(r[_dsAmtCol]) || 0;
                if (mn !== null && a < mn) return false;
                if (mx !== null && a > mx) return false;
            }
            // Global search — across volunteer-visible columns only
            if (gq) {
                const hay = _dsVolCols.map(c => String(r[c] ?? '')).join(' ').toLowerCase();
                if (!hay.includes(gq)) return false;
            }
            return true;
        });

        const sum = _dsAmtCol ? _dsFiltered.reduce((s, r) => s + (parseFloat(r[_dsAmtCol]) || 0), 0) : 0;
        const ct  = document.getElementById('dsChipTotal');
        const cm  = document.getElementById('dsChipMatch');
        const cs  = document.getElementById('dsChipSum');
        if (ct) ct.textContent = `${_dsRecords.length.toLocaleString('en-IN')} total`;
        if (cm) cm.textContent = `${_dsFiltered.length.toLocaleString('en-IN')} shown`;
        if (cs) cs.textContent = _dsAmtCol ? '\u20b9' + sum.toLocaleString('en-IN') : '';
        _dsPage = 1;
        dsRenderTable();
    }

    // Clear all 3 filters + global search
    function dsClearFilters() {
        ['dsGlobalSearch','dsLocSearch','dsLandSearch','dsAmtMin','dsAmtMax'].forEach(id => {
            const e = document.getElementById(id); if (e) e.value = '';
        });
        dsApplyFilters();
    }

    // ── Render table — 4 volunteer columns, grouped by year ──────────────────
    function dsRenderTable() {
        const thead = document.getElementById('dsThead');
        const tbody = document.getElementById('dsTbody');
        const wrap  = document.getElementById('dsTableWrap');
        const noRes = document.getElementById('dsNoResults');
        const msgEl = document.getElementById('dsLoadingMsg');
        if (!thead || !tbody) return;

        if (_dsFiltered.length === 0 || _dsVolCols.length === 0) {
            if (wrap)  wrap.style.display  = 'none';
            if (noRes) noRes.style.display = '';
            if (msgEl) msgEl.style.display = 'none';
            return;
        }
        if (wrap)  wrap.style.display  = '';
        if (noRes) noRes.style.display = 'none';
        if (msgEl) msgEl.style.display = 'none';

        // Fixed column headers (friendly labels)
        const colLabels = _dsVolCols.map(c => c); // use actual col names from Excel
        thead.innerHTML = '<tr>' + colLabels.map(c => `<th>${c}</th>`).join('') + '</tr>';

        // Group filtered records by year
        const groups   = _dsGroupByYear(_dsFiltered);
        const flatRows = [];
        groups.forEach((recs, yr) => {
            const yearSum = _dsAmtCol
                ? recs.reduce((s, r) => s + (parseFloat(r[_dsAmtCol]) || 0), 0)
                : null;
            flatRows.push({ type: 'header', yr, count: recs.length, sum: yearSum });
            recs.forEach(r => flatRows.push({ type: 'row', r }));
        });

        const start    = (_dsPage - 1) * DS_PAGE;
        const pageRows = flatRows.slice(start, start + DS_PAGE);

        tbody.innerHTML = pageRows.map(item => {
            if (item.type === 'header') {
                const sumTxt = item.sum !== null
                    ? ` &nbsp;&middot;&nbsp; <span style="color:#27AE60;font-weight:700;">\u20b9${item.sum.toLocaleString('en-IN')}</span>`
                    : '';
                return `<tr>
                    <td colspan="${_dsVolCols.length}" class="ds-year-header"
                        style="padding:9px 12px;background:linear-gradient(90deg,#1a237e0a,transparent);border-top:2px solid #e8eaf0;border-bottom:1px solid #e8eaf0;">
                        <span style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;width:100%;">
                            <span style="background:linear-gradient(135deg, var(--primary-color), var(--accent-color));color:#fff;border-radius:16px;padding:2px 12px;font-size:.76rem;font-weight:700;letter-spacing:.04em;">
                                ${item.yr}
                            </span>
                            <span style="font-size:.8rem;color:#666;">${item.count.toLocaleString('en-IN')} donors${sumTxt}</span>
                        </span>
                    </td>
                </tr>`;
            }
            const { r } = item;
            const cells = _dsVolCols.map(col => {
                const v     = r[col] ?? '';
                const isAmt = col === _dsAmtCol;
                const disp  = isAmt && v !== ''
                    ? `<strong style="color:#2E7D32;">\u20b9${Number(v).toLocaleString('en-IN')}</strong>`
                    : `<span title="${String(v).replace(/"/g,'&quot;')}">${v}</span>`;
                return `<td data-label="${String(col).replace(/"/g,'&quot;')}">${disp}</td>`;
            }).join('');
            return `<tr onmouseover="this.style.background='#eef2ff'" onmouseout="this.style.background=''">${cells}</tr>`;
        }).join('');

        // Pagination
        const tp = Math.ceil(flatRows.length / DS_PAGE);
        const pi = document.getElementById('dsPaginationInfo');
        const pb = document.getElementById('dsPaginationBtns');
        if (pi) pi.textContent = `${start+1}\u2013${Math.min(start+DS_PAGE, flatRows.length)} of ${_dsFiltered.length.toLocaleString('en-IN')} records`;
        if (pb) {
            pb.innerHTML = '';
            if (tp > 1) {
                const mk = (lbl, p, active) => {
                    const b = document.createElement('button');
                    b.innerHTML = lbl;
                    b.style.cssText = `padding:4px 10px;border:1.5px solid ${active?'var(--primary-color)':'#ddd'};border-radius:6px;background:${active?'var(--primary-color)':'#fff'};color:${active?'#fff':'#333'};cursor:pointer;font-size:.78rem;`;
                    if (!active) { b.onmouseover=()=>b.style.background='#f0f2ff'; b.onmouseout=()=>b.style.background='#fff'; }
                    b.onclick = () => { _dsPage = p; dsRenderTable(); };
                    return b;
                };
                if (_dsPage > 1) pb.appendChild(mk('\u2039', _dsPage - 1, false));
                const lo = Math.max(1, _dsPage - 2), hi = Math.min(tp, _dsPage + 2);
                if (lo > 1) pb.insertAdjacentHTML('beforeend','<span style="padding:0 4px;color:#aaa;font-size:.78rem;">\u2026</span>');
                for (let p = lo; p <= hi; p++) pb.appendChild(mk(p, p, p === _dsPage));
                if (hi < tp) pb.insertAdjacentHTML('beforeend','<span style="padding:0 4px;color:#aaa;font-size:.78rem;">\u2026</span>');
                if (_dsPage < tp) pb.appendChild(mk('\u203a', _dsPage + 1, false));
            }
        }
    }

    // CSV export — volunteer columns only
    function dsExportCSV() {
        if (!_dsFiltered.length || !_dsVolCols.length) return;
        const q   = v => `"${String(v??'').replace(/"/g,'""')}"`;
        const csv = '\uFEFF' + [
            _dsVolCols.map(q).join(','),
            ..._dsFiltered.map(r => _dsVolCols.map(c => q(r[c])).join(','))
        ].join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
        const a   = Object.assign(document.createElement('a'), {
            href: url,
            download: `donors_${new Date().toISOString().slice(0,10)}.csv`
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    
    // ══════════════════════════════════════════════════════
    // ── DONATION ENTRY — full JS ──────────────────────────
    // ══════════════════════════════════════════════════════

    // ── Live clock (only if element exists) ────────────────────
    (function deStartClock() {
        const cl = document.getElementById('deLiveClock');
        const dt = document.getElementById('deLiveDate');
        if (!cl && !dt) return;
        function tick() {
            const now = new Date();
            if (cl) cl.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
            if (dt) dt.textContent = now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        }
        tick();
        setInterval(tick, 1000);
    })();

    // ── Book dropdown (Books 1–N) ──────────────────────────
    function dePopulateBooks() {
        const sel = document.getElementById('deBookNumber');
        const bType = document.querySelector('input[name="deBookType"]:checked')?.value || 'New';
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select Book —</option>';
        const maxBooks = bType === 'Old' ? (window._deMaxOldBooks || 30) : (window._deMaxNewBooks || 50);
        for (let b = 1; b <= maxBooks; b++) {
            const from = (b - 1) * 50 + 1, to = b * 50;
            sel.innerHTML += `<option value="${b}">Book ${b}  (Receipts ${from}–${to})</option>`;
        }
    }

    // ── When book changes, populate receipt dropdown ─────────
    async function deOnBookChange() {
        const bn  = Number(document.getElementById('deBookNumber').value);
        const sel = document.getElementById('deReceiptNumber');
        if (!bn) { sel.innerHTML = '<option value="">— Select Book first —</option>'; sel.disabled = true; return; }
        sel.disabled = true;
        sel.innerHTML = '<option value="">Loading…</option>';
        const from = (bn - 1) * 50 + 1, to = bn * 50;
        let used = [];
        const bType = document.querySelector('input[name="deBookType"]:checked')?.value || 'New';
        try {
            const r = await fetch(`/api/donation-entries/used-receipts/${bn}?type=${bType}`);
            const d = await r.json();
            used = d.usedReceipts || [];
        } catch(e) {}
        sel.innerHTML = '<option value="">— Select Receipt —</option>';
        for (let n = from; n <= to; n++) {
            const taken = used.includes(n);
            sel.innerHTML += `<option value="${n}" ${taken ? 'disabled style="color:#ccc;"' : ''}>${n}${taken ? ' (used)' : ''}</option>`;
        }
        sel.disabled = false;
    }

    // ── Donor type toggle ────────────────────────────────────
    function deSetDonorType(type) {
        document.getElementById('deDonorType').value = type;
        const indActive = type === 'Individual';
        const activeStyle = 'display:flex;align-items:center;gap:6px;padding:7px 18px;border:2px solid var(--primary-color);border-radius:16px;cursor:pointer;font-weight:600;font-size:.82rem;background:var(--primary-color);color:#fff;transition:all .2s;';
        const inactiveStyle = 'display:flex;align-items:center;gap:6px;padding:7px 18px;border:2px solid #ddd;border-radius:16px;cursor:pointer;font-weight:600;font-size:.82rem;background:#f9f9f9;color:#555;transition:all .2s;';
        document.getElementById('deBtnInd').style.cssText = indActive  ? activeStyle : inactiveStyle;
        document.getElementById('deBtnBiz').style.cssText = !indActive ? activeStyle : inactiveStyle;
        document.getElementById('deIndFields').style.display = indActive  ? 'grid' : 'none';
        document.getElementById('deBizFields').style.display = !indActive ? 'block' : 'none';
    }

    // ── Payment mode toggle ──────────────────────────────────
    const _deModes = { Cash:'deModeCash', Cheque:'deModeChq', UPI:'deModeUPI', RTGS:'deModeRTGS', Balance:'deModeBal' };
    const _deRefLabels = { Cash:'Reference Number', Cheque:'Cheque Number', UPI:'UPI / Transaction ID', RTGS:'RTGS Reference Number', Balance:'Recovery Notes / Reference' };
    function deSetMode(mode) {
        document.getElementById('dePaymentMode').value = mode;
        Object.entries(_deModes).forEach(([m, id]) => {
            const el = document.getElementById(id);
            if (!el) return;
            const active = m === mode;
            el.style.background = active ? 'var(--primary-color)' : '#f9f9f9';
            el.style.color      = active ? '#fff' : '#555';
            el.style.border     = active ? '2px solid var(--primary-color)' : '2px solid #ddd';
        });
        const lbl = document.getElementById('deRefLabel');
        if (lbl) {
            const isReq = (mode === 'Cheque' || mode === 'RTGS');
            const reqHtml = isReq ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>';
            lbl.innerHTML = `${_deRefLabels[mode] || 'Reference Number'} ${reqHtml}`;
        }
    }

    // ── Hierarchical Location Cascade ─────────────────────────────────────────────
    let _deLandmarks = [], _deAreas = [], _deBuildings = [];

    async function deLoadDropdowns() {
        try {
            const [aRes, saRes, bRes, sRes] = await Promise.all([
                fetch('/api/landmarks'),
                fetch('/api/areas'), fetch('/api/buildings'),
                fetch('/api/settings')
            ]);
            const [aData, saData, bData, sData] = await Promise.all([
                aRes.json(), saRes.json(), bRes.json(), sRes.json()
            ]);
            _deLandmarks = aData.landmarks || [];
            _deAreas     = saData.areas    || [];
            _deBuildings = bData.buildings || [];
            // Store dynamic book limits globally
            window._deMaxNewBooks = sData.maxNewBooks || 50;
            window._deMaxOldBooks = sData.maxOldBooks || 30;
            // Update radio labels
            const lblNew = document.getElementById('deLblNewBooks');
            const lblOld = document.getElementById('deLblOldBooks');
            if (lblNew) lblNew.textContent = `New Book (${window._deMaxNewBooks} Books)`;
            if (lblOld) lblOld.textContent = `Old Book (${window._deMaxOldBooks} Books)`;
            // Repopulate book dropdown
            dePopulateBooks();
        } catch(e) {
            _deLandmarks = []; _deAreas = []; _deBuildings = [];
        }
        // Populate landmark dropdown
        var lSel = document.getElementById('deLandmark');
        if (lSel) {
            var cur = lSel.value;
            lSel.innerHTML = '<option value="">— Select Landmark —</option>';
            _deLandmarks.forEach(function(l) {
                lSel.innerHTML += '<option value="' + l.name + '"' + (l.name === cur ? ' selected' : '') + '>' + l.name + '</option>';
            });
            var hint = document.getElementById('deLandmarkHint');
            if (hint) hint.style.display = _deLandmarks.length === 0 ? '' : 'none';
        }
        // Show Manage button to admin only
        var isAdmin = currentUser && currentUser.role === 'admin';
        var manBtn = document.getElementById('deManageLocBtn');
        if (manBtn) manBtn.style.display = isAdmin ? '' : 'none';
        // Show landmark group, hide everything else
        var lmGrp = document.getElementById('deLandmarkGroup');
        if (lmGrp) lmGrp.style.display = '';
        ['deAreaGroup','deBuildingGroup','deFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        dePopulateBooks();
    }

    function deOnLandmarkChange() {
        var landmarkName = (document.getElementById('deLandmark') || {}).value || '';
        // Reset area + building
        ['deArea','deBuildingName','deFlatNumber'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        ['deAreaGroup','deBuildingGroup','deFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        // Reset locked area badge
        deUnlockArea(true);
        if (!landmarkName) return;
        var landmarkObj = _deLandmarks.find(function(a) { return a.name === landmarkName; });

        // Populate Areas for this Landmark
        var subs = landmarkObj
            ? _deAreas.filter(function(s) { return s.landmarkId === landmarkObj.id; })
            : [];
        var subSel = document.getElementById('deArea');
        if (subSel) {
            subSel.innerHTML = '<option value="">— Select Area —</option>';
            subs.forEach(function(s) {
                subSel.innerHTML += '<option value="' + s.name + '" data-id="' + s.id + '">' + s.name + '</option>';
            });
        }
        if (subs.length > 0) {
            var aGrp = document.getElementById('deAreaGroup');
            if (aGrp) { aGrp.style.display = ''; aGrp.style.animation = 'deSlideDown .25s ease'; }
            // Hide the "select" and show it (the locked badge is hidden by default)
            var locked = document.getElementById('deAreaLocked');
            if (locked) locked.style.display = 'none';
            if (subSel) subSel.style.display = '';
        }

        // Pre-populate buildings linked directly to this Landmark
        dePopulateBuildingsForLandmark(landmarkObj);
    }

    function deOnAreaChange() {
        var areaName = (document.getElementById('deArea') || {}).value || '';
        // Reset building
        ['deBuildingName','deFlatNumber'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        ['deBuildingGroup','deFlatNumberGroup'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        if (!areaName) {
            deUnlockArea(true);
            return;
        }
        // LOCK the area in — show badge, hide dropdown
        var lockedDiv  = document.getElementById('deAreaLocked');
        var lockedName = document.getElementById('deAreaLockedName');
        var areaSel    = document.getElementById('deArea');
        if (lockedName) lockedName.textContent = areaName;
        if (lockedDiv)  { lockedDiv.style.display = 'flex'; }
        if (areaSel)    areaSel.style.display = 'none';

        // Populate buildings for this area
        var landmarkName = (document.getElementById('deLandmark') || {}).value || '';
        var landmarkObj  = _deLandmarks.find(function(l) { return l.name === landmarkName; });
        var saObj = _deAreas.find(function(s) { return s.name === areaName; });
        var bldgs = _deBuildings.filter(function(b) {
            return (saObj && b.areaId === saObj.id) ||
                   (landmarkObj && b.landmarkId === landmarkObj.id && !b.areaId);
        });
        deShowBuildings(bldgs);
    }

    function deUnlockArea(silent) {
        var lockedDiv = document.getElementById('deAreaLocked');
        var areaSel   = document.getElementById('deArea');
        if (lockedDiv) lockedDiv.style.display = 'none';
        if (areaSel)  { areaSel.style.display = ''; areaSel.value = ''; }
        if (!silent) {
            // reset buildings too
            ['deBuildingName','deFlatNumber'].forEach(function(id) {
                var el = document.getElementById(id); if (el) el.value = '';
            });
            ['deBuildingGroup','deFlatNumberGroup'].forEach(function(id) {
                var el = document.getElementById(id); if (el) el.style.display = 'none';
            });
        }
    }

    function dePopulateBuildingsForLandmark(landmarkObj) {
        var bldgs = landmarkObj
            ? _deBuildings.filter(function(b) { return b.landmarkId === landmarkObj.id; })
            : [];
        // Show building group whether or not there are results
        deShowBuildings(bldgs);
    }

    function deShowBuildings(bldgs) {
        var bSel  = document.getElementById('deBuildingName');
        var bHint = document.getElementById('deBuildingHint');
        var bGrp  = document.getElementById('deBuildingGroup');
        if (!bSel) return;
        bSel.innerHTML = '<option value="">— Select Building (optional) —</option>';
        bldgs.forEach(function(b) {
            bSel.innerHTML += '<option value="' + b.name + '" data-id="' + b.id + '">' + b.name + '</option>';
        });
        if (bHint) bHint.style.display = bldgs.length === 0 ? '' : 'none';
        if (bGrp) { bGrp.style.display = ''; bGrp.style.animation = 'deSlideDown .25s ease'; }
    }

    function deOnBuildingChange() {
        var building  = (document.getElementById('deBuildingName') || {}).value || '';
        var flatGroup = document.getElementById('deFlatNumberGroup');
        if (!flatGroup) return;
        if (building) { flatGroup.style.display = ''; flatGroup.style.animation = 'deSlideDown .25s ease'; }
        else flatGroup.style.display = 'none';
    }

    // ── Admin: Open the Manage Locations modal ───────────────────────────────
    async function deOpenManageModal() {
        if (typeof adeLandmarkModal === 'function') {
            adeLandmarkModal();
        } else {
            // Self-contained lightweight modal for dashboard context
            const [rL, rA] = await Promise.all([fetch('/api/landmarks'), fetch('/api/areas')]);
            const [dL, dA] = await Promise.all([rL.json(), rA.json()]);
            let lms   = dL.landmarks || [];
            let areas = dA.areas     || [];
            let selLm = lms.length ? lms[0].id : null;

            var existing = document.getElementById('deMgmtModal');
            if (existing) existing.remove();
            var modal = document.createElement('div');
            modal.id = 'deMgmtModal';
            modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto;';

            function renderMgmt() {
                var lmObj = lms.find(function(l){ return l.id === selLm; });
                var lmAreas = selLm ? areas.filter(function(a){ return a.landmarkId === selLm; }) : [];
                var html = '<div style="background:#fff;border-radius:16px;padding:26px;width:94%;max-width:780px;box-shadow:0 8px 40px rgba(0,0,0,.24);margin-bottom:40px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:2px solid #f0f0f0;padding-bottom:12px;">';
                html += '<h3 style="margin:0;font-size:1.1rem;color:#1a237e;"><i class="fas fa-sitemap" style="color:#F59E0B;margin-right:8px;"></i>Manage Locations</h3>';
                html += '<span onclick="document.getElementById(\'deMgmtModal\').remove()" style="font-size:1.4rem;cursor:pointer;color:#999;">&times;</span>';
                html += '</div>';
                html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">';

                // Col 1: Landmarks
                html += '<div style="border-right:2px solid #f0f0f0;padding-right:18px;">';
                html += '<div style="font-size:.72rem;font-weight:800;text-transform:uppercase;color:#E65100;margin-bottom:10px;"><i class="fas fa-map-marker-alt" style="margin-right:5px;"></i>Landmarks</div>';
                html += '<div style="display:flex;gap:6px;margin-bottom:10px;">';
                html += '<input type="text" id="deMgmtLmInput" class="form-control" placeholder="New landmark" style="flex:1;font-size:.82rem;">';
                html += '<button onclick="deMgmtAddLm()" style="padding:0 12px;border:none;border-radius:8px;background:#E65100;color:#fff;font-weight:700;cursor:pointer;">+ Add</button>';
                html += '</div>';
                html += '<div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">';
                lms.forEach(function(l) {
                    var isSel = l.id === selLm;
                    html += '<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:' + (isSel?'#FFF3E0':'#f8f9fa') + ';border:2px solid ' + (isSel?'#F59E0B':'transparent') + ';border-radius:8px;cursor:pointer;" onclick="deMgmtSelLm(this)" data-lid="' + l.id + '">';
                    html += '<span style="flex:1;font-weight:700;font-size:.85rem;color:' + (isSel?'#E65100':'#333') + '">' + l.name + '</span>';
                    html += '<button onclick="event.stopPropagation();deMgmtRenLm(this)" data-lid="' + l.id + '" data-lname="' + l.name.replace(/"/g,'&quot;') + '" style="border:none;background:#E3F2FD;color:#1565C0;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:.72rem;" title="Rename"><i class="fas fa-pen"></i></button>';
                    html += '<button onclick="event.stopPropagation();deMgmtDelLm(this)" data-lid="' + l.id + '" style="border:none;background:#FFEBEE;color:#c0392b;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:.72rem;" title="Delete"><i class="fas fa-trash"></i></button>';
                    html += '</div>';
                });
                if (!lms.length) html += '<div style="color:#aaa;text-align:center;padding:16px;font-size:.83rem;">No landmarks yet.</div>';
                html += '</div></div>';

                // Col 2: Areas
                html += '<div>';
                html += '<div style="font-size:.72rem;font-weight:800;text-transform:uppercase;color:#2E7D32;margin-bottom:10px;"><i class="fas fa-map" style="margin-right:5px;"></i>Areas' + (lmObj ? ' <span style="font-weight:400;text-transform:none;color:#888;">under ' + lmObj.name + '</span>' : '') + '</div>';
                if (selLm) {
                    html += '<div style="display:flex;gap:6px;margin-bottom:10px;">';
                    html += '<input type="text" id="deMgmtAreaInput" class="form-control" placeholder="New area" style="flex:1;font-size:.82rem;">';
                    html += '<button onclick="deMgmtAddArea(this)" data-lmid="' + selLm + '" style="padding:0 12px;border:none;border-radius:8px;background:#2E7D32;color:#fff;font-weight:700;cursor:pointer;">+ Add</button>';
                    html += '</div>';
                }
                html += '<div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">';
                lmAreas.forEach(function(a) {
                    html += '<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#f0fff4;border-radius:8px;">';
                    html += '<span style="flex:1;font-weight:600;font-size:.85rem;">' + a.name + '</span>';
                    html += '<button onclick="deMgmtRenArea(this)" data-aid="' + a.id + '" data-aname="' + a.name.replace(/"/g,'&quot;') + '" style="border:none;background:#E3F2FD;color:#1565C0;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:.72rem;" title="Rename"><i class="fas fa-pen"></i></button>';
                    html += '<button onclick="deMgmtDelArea(this)" data-aid="' + a.id + '" style="border:none;background:#FFEBEE;color:#c0392b;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:.72rem;" title="Delete"><i class="fas fa-trash"></i></button>';
                    html += '</div>';
                });
                if (!lmAreas.length && selLm) html += '<div style="color:#aaa;text-align:center;padding:16px;font-size:.83rem;">No areas yet. Add one above.</div>';
                if (!selLm) html += '<div style="color:#aaa;text-align:center;padding:16px;font-size:.83rem;">Select a landmark first.</div>';
                html += '</div></div>';

                html += '</div>';
                html += '<div style="margin-top:16px;font-size:.75rem;color:#888;text-align:center;"><i class="fas fa-info-circle" style="margin-right:4px;"></i>Changes take effect immediately across all volunteer forms.</div>';
                html += '</div>';
                modal.innerHTML = html;
            }

            window.deMgmtSelLm = function(el) { selLm = el.dataset.lid; renderMgmt(); };
            window.deMgmtAddLm = async function() {
                var name = ((document.getElementById('deMgmtLmInput')||{}).value||'').trim(); if(!name) return;
                var r = await fetch('/api/landmarks', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name: name }) });
                var d = await r.json();
                if (r.ok && d.success) { lms.push(d.landmark); selLm = d.landmark.id; deLoadDropdowns(); renderMgmt(); }
                else alert(d.message||'Could not add.');
            };
            window.deMgmtRenLm = async function(btn) {
                var id = btn.dataset.lid; var nm = prompt('Rename landmark:', btn.dataset.lname); if(!nm||!nm.trim()) return;
                var r = await fetch('/api/landmarks/'+encodeURIComponent(id), { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name: nm.trim() }) });
                var d = await r.json();
                if (r.ok && d.success) { var i=lms.findIndex(function(l){return l.id===id;}); if(i>=0) lms[i].name=nm.trim(); deLoadDropdowns(); renderMgmt(); }
                else alert(d.message||'Rename failed.');
            };
            window.deMgmtDelLm = async function(btn) {
                var id = btn.dataset.lid;
                if (!confirm('Delete this landmark and all its areas?')) return;
                var r = await fetch('/api/landmarks/'+encodeURIComponent(id), { method:'DELETE' });
                if (r.ok) { lms=lms.filter(function(l){return l.id!==id;}); areas=areas.filter(function(a){return a.landmarkId!==id;}); if(selLm===id) selLm=lms.length?lms[0].id:null; deLoadDropdowns(); renderMgmt(); }
                else alert('Could not delete.');
            };
            window.deMgmtAddArea = async function(btn) {
                var lmid = btn.dataset.lmid;
                var name = ((document.getElementById('deMgmtAreaInput')||{}).value||'').trim(); if(!name) return;
                var r = await fetch('/api/areas', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name: name, landmarkId: lmid }) });
                var d = await r.json();
                if (r.ok && d.success) { areas.push(d.area); deLoadDropdowns(); renderMgmt(); }
                else alert(d.message||'Could not add.');
            };
            window.deMgmtRenArea = async function(btn) {
                var id = btn.dataset.aid; var nm = prompt('Rename area:', btn.dataset.aname); if(!nm||!nm.trim()) return;
                var r = await fetch('/api/areas/'+encodeURIComponent(id), { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name: nm.trim() }) });
                var d = await r.json();
                if (r.ok && d.success) { var i=areas.findIndex(function(a){return a.id===id;}); if(i>=0) areas[i].name=nm.trim(); deLoadDropdowns(); renderMgmt(); }
                else alert(d.message||'Rename failed.');
            };
            window.deMgmtDelArea = async function(btn) {
                var id = btn.dataset.aid;
                if (!confirm('Delete this area?')) return;
                var r = await fetch('/api/areas/'+encodeURIComponent(id), { method:'DELETE' });
                if (r.ok) { areas=areas.filter(function(a){return a.id!==id;}); deLoadDropdowns(); renderMgmt(); }
                else alert('Could not delete.');
            };

            renderMgmt();
            document.body.appendChild(modal);
            modal.addEventListener('click', function(ev) { if (ev.target === modal) modal.remove(); });
        }
    }

    async function deAddLandmark() {
        var name = prompt('Enter new Landmark name:');
        if (!name || !name.trim()) return;
        try {
            var r = await fetch('/api/landmarks', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name: name.trim() }) });
            var d = await r.json();
            if (r.ok && d.success) {
                _deLandmarks.push(d.landmark);
                var lSel = document.getElementById('deLandmark');
                if (lSel) { lSel.innerHTML += '<option value="' + d.landmark.name + '">' + d.landmark.name + '</option>'; lSel.value = d.landmark.name; }
                var hint = document.getElementById('deLandmarkHint');
                if (hint) hint.style.display = 'none';
                deOnLandmarkChange();
            } else { alert(d.message || 'Could not add landmark.'); }
        } catch(e) { alert('Server error.'); }
    }

    async function deAddBuilding() {
        var name = prompt('Enter new Building name:');
        if (!name || !name.trim()) return;
        var areaName = (document.getElementById('deArea') || {}).value || '';
        var saObj = areaName ? _deAreas.find(function(s) { return s.name === areaName; }) : null;
        var payload = { name: name.trim() };
        if (saObj) payload.areaId = saObj.id;
        try {
            var r = await fetch('/api/buildings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
            var d = await r.json();
            if (r.ok && d.success) {
                _deBuildings.push(d.building);
                var bSel = document.getElementById('deBuildingName');
                if (bSel) { bSel.innerHTML += '<option value="' + d.building.name + '">' + d.building.name + '</option>'; bSel.value = d.building.name; }
                deOnBuildingChange();
            } else { alert(d.message || 'Could not add building.'); }
        } catch(e) { alert('Server error.'); }
    }
    document.getElementById('donationEntryForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn = document.getElementById('deSubmitBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Saving\u2026'; }

        // ── Build payload with null-safe reads ──────────────────
        let payload;
        try {
            const donorType = (document.getElementById('deDonorType')?.value || 'Individual');
            const getVal  = id => document.getElementById(id)?.value ?? '';
            const getTrim = id => getVal(id).trim();

            const lmVal = getVal('deLandmark');
            if (!lmVal) throw new Error('Landmark is mandatory.');
            const amtVal = getVal('deAmount');
            if (amtVal === '') throw new Error('Donation Amount is mandatory.');
            const pMode = getVal('dePaymentMode') || 'Cash';
            const refNum = getTrim('deReference');
            if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
            if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

            payload = {
                bookNumber      : Number(getVal('deBookNumber')),
                receiptNumber   : Number(getVal('deReceiptNumber')),
                bookType        : document.querySelector('input[name="deBookType"]:checked')?.value || 'New',
                donorType,
                firstName       : donorType === 'Individual' ? getTrim('deFirstName').toUpperCase()    : null,
                middleName      : donorType === 'Individual' ? getTrim('deMiddleName').toUpperCase()   : null,
                lastName        : donorType === 'Individual' ? getTrim('deLastName').toUpperCase()     : null,
                businessName    : donorType === 'Business'   ? getTrim('deBusinessName').toUpperCase(): null,
                whatsappNumber  : getTrim('deWhatsapp')  || null,
                mobileNumber    : getTrim('deMobile')    || null,
                mailId          : getTrim('deMail')      || null,
                buildingName    : getVal('deBuildingName') || null,
                flatNumber      : getTrim('deFlatNumber') || null,
                landmark            : getVal('deLandmark')         || null,
                area         : getVal('deArea')      || null,
                landmark        : getVal('deLandmark')     || null,
                amount          : getVal('deAmount') !== '' ? Number(getVal('deAmount')) : null,
                paymentMode     : getVal('dePaymentMode') || 'Cash',
                referenceNumber : getTrim('deReference') || null,
                submittedBy     : currentUser ? currentUser.name : null,
                submittedByUserId: currentUser ? currentUser.id  : null,
            };
        } catch (buildErr) {
            console.error('[DE Form] Payload build error:', buildErr);
            deShowStatus('\u274c Form error: ' + buildErr.message, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry'; }
            return;
        }

        // ── Submit to server ─────────────────────────────────────
        try {
            console.log('[DE Form] Submitting payload:', payload);
            const res  = await fetch('/api/donation-entries', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify(payload)
            });
            const data = await res.json();
            console.log('[DE Form] Server response:', res.status, data);
            if (res.ok && data.success) {
                // Upload passbook photo if one was captured
                if (_pbDocBlob && data.entry && data.entry.entryId) {
                    try {
                        const fd = new FormData();
                        fd.append('passbook', _pbDocBlob, (document.getElementById('pbDocFileName')?.textContent || 'receipt.jpg'));
                        fd.append('userId',    currentUser ? String(currentUser.id)   : '');
                        fd.append('userName',  currentUser ? currentUser.name : '');
                        fd.append('entryId',   data.entry.entryId);
                        await fetch('/api/upload-passbook', { method: 'POST', body: fd });
                        pbClearDoc();
                    } catch(_) { /* photo upload failure is non-blocking */ }
                }
                deShowStatus(`\u2705 Entry saved! Book ${data.entry.bookNumber}, Receipt #${data.entry.receiptNumber}`, 'success');
                // Save receipt snapshot & capture preview BEFORE resetting form so #de_rcg_receipt is still populated
                try { await de_rcg_saveSnapshot(data.entry.entryId); } catch(_) {}
                this.reset();
                deSetDonorType('Individual');
                deSetMode('Cash');
                const rSel = document.getElementById('deReceiptNumber');
                if (rSel) { rSel.innerHTML = '<option value="">\u2014 Select Book first \u2014</option>'; rSel.disabled = true; }
                await deLoadMyEntries();
            } else {
                deShowStatus('\u274c ' + (data.message || 'Could not save entry.'), 'error');
            }
        } catch (err) {
            console.error('[DE Form] Error:', err);
            deShowStatus('\u274c Server error: ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry'; }
        }
    });

    // ── Volunteer Entries Table (admin layout mirrored) ───────────────────
    let _vdeAll = [];
    let _vdeFiltered = [];

    async function vdeLoad() {
        const tbody = document.getElementById('vdeTbody');
        const grid = document.getElementById('vdeCardGrid');
        if(tbody) tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#999;padding:30px;">Loading...</td></tr>';
        if(grid) grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px;grid-column:1/-1;">Loading...</div>';
        
        try {
            const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null;
            const res = await fetch('/api/donation-entries?year=' + (window._vdeSelectedYear || 'active'));
            const data = await res.json();
            let entries = (data.entries || []).filter(e => !e.deleted);
            
            // Show all entries (same as admin view)
            
            entries.sort((a,b) => new Date(b.submittedAt||0) - new Date(a.submittedAt||0));
            _vdeAll = entries;

            // Populate filter options dynamically based on available data
            const lmSet = new Set(), modeSet = new Set();
            _vdeAll.forEach(e => {
                if (e.landmark) lmSet.add(e.landmark);
                if (e.paymentMode) modeSet.add(e.paymentMode);
            });
            const selLm = document.getElementById('vdeFilterLandmark');
            if (selLm) {
                const currentVal = selLm.value;
                selLm.innerHTML = '<option value="">All Landmarks</option>' + 
                    Array.from(lmSet).sort().map(l => '<option value="'+l+'">'+l+'</option>').join('');
                selLm.value = currentVal;
            }
            const selMode = document.getElementById('vdeFilterMode');
            if (selMode) {
                const currentVal = selMode.value;
                selMode.innerHTML = '<option value="">All Modes</option>' + 
                    Array.from(modeSet).sort().map(m => '<option value="'+m+'">'+m+'</option>').join('');
                selMode.value = currentVal;
            }

            vdeFilter();
        } catch(err) {
            console.error('vdeLoad err:', err);
            if(tbody) tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#c00;padding:30px;">Error loading entries.</td></tr>';
            if(grid) grid.innerHTML = '<div style="text-align:center;color:#c00;padding:30px;grid-column:1/-1;">Error loading entries.</div>';
        }
    }

    function vdeFilter() {
        const name = (document.getElementById('vdeSearchName')?.value || '').toLowerCase();
        const book = document.getElementById('vdeFilterBook')?.value;
        const landmark = document.getElementById('vdeFilterLandmark')?.value;
        const mode = document.getElementById('vdeFilterMode')?.value;
        const type = document.getElementById('vdeFilterType')?.value;
        
        _vdeFiltered = _vdeAll.filter(e => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
            if (name && !donor.toLowerCase().includes(name)) return false;
            if (book && String(e.bookNumber) !== String(book)) return false;
            if (landmark && e.landmark !== landmark) return false;
            if (mode && e.paymentMode !== mode) return false;
            if (type && e.donorType !== type) return false;
            return true;
        });
        vdeRender();
        vdeRenderCards();
    }

    function vdeClearFilters() {
        ['vdeSearchName','vdeFilterBook','vdeFilterLandmark','vdeFilterMode','vdeFilterType','vdeCardSearch'].forEach(id => { 
            const el = document.getElementById(id); 
            if(el) el.value = ''; 
        });
        vdeFilter();
    }

    function vdeRender() {
        const tbody = document.getElementById('vdeTbody');
        if (!tbody) return;
        const totalAmt = _vdeFiltered.reduce((s,e) => s + (e.amount||0), 0);
        document.getElementById('vdeSummaryTotal')    && (document.getElementById('vdeSummaryTotal').textContent    = _vdeAll.length);
        document.getElementById('vdeSummaryFiltered') && (document.getElementById('vdeSummaryFiltered').textContent = _vdeFiltered.length);
        document.getElementById('vdeSummaryAmt')      && (document.getElementById('vdeSummaryAmt').innerHTML        = '&#x20B9;' + totalAmt.toLocaleString('en-IN'));
        
        if (!_vdeFiltered.length) { tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#999;padding:30px;">No entries found.</td></tr>'; return; }
        
        // Group entries by Landmark
        const _vdeLmOrder = [];
        const _vdeLmGroups = {};
        _vdeFiltered.forEach(e => {
            const lm = String(e.landmark || '(No Landmark)').trim();
            if (!_vdeLmGroups[lm]) { _vdeLmGroups[lm] = []; _vdeLmOrder.push(lm); }
            _vdeLmGroups[lm].push(e);
        });

        let _vdeHtml = '';
        let _vdeRowNum = 0;
        _vdeLmOrder.forEach(lm => {
            const cnt = _vdeLmGroups[lm].length;
            _vdeHtml += '<tr>' +
                '<td colspan="17" style="background:linear-gradient(90deg,#FFF3E0,#FFF8F5);color:#BF360C;font-weight:700;font-size:.88rem;padding:9px 16px;border-left:4px solid #E65100;border-top:2px solid #FFCC80;">' +
                '<i class="fas fa-map-marker-alt" style="margin-right:7px;color:#E65100;"></i>' + lm +
                '<span style="font-weight:400;color:#888;font-size:.78rem;margin-left:10px;">(' + cnt + ' entr' + (cnt === 1 ? 'y' : 'ies') + ')</span>' +
                '</td></tr>';
            _vdeLmGroups[lm].forEach(e => {
                _vdeRowNum++;
                const i = _vdeRowNum - 1;
                const donor = e.donorType === 'Business'
                    ? (e.businessName || '—')
                    : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
                const dtObj = new Date(e.submittedAt);
                const dtTime = dtObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
                const dtDate = dtObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                let dt = '<span style="font-size:.8rem;white-space:nowrap;">' + dtTime + '<br><span style="color:#aaa;">' + dtDate + '</span></span>';
                if (e.updatedAt && e.updatedAt !== e.submittedAt) {
                    const upObj = new Date(e.updatedAt);
                    if (!isNaN(upObj)) {
                        const upTime = upObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
                        const upDate = upObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                        dt += '<div style="margin-top:4px;padding:2px 4px;background:#FFF8F1;border:1px solid #ffe0b2;border-radius:4px;color:#E65100;font-size:0.7rem;line-height:1.1;white-space:nowrap;"><i class="fas fa-history" style="font-size:0.6rem;"></i> Updated:<br>' + upTime + ' ' + upDate + '</div>';
                    }
                }
                const amt = e.amount != null ? '&#x20B9;' + Number(e.amount).toLocaleString('en-IN') : '—';
                
                const _tHp  = !!e.photoUrl;
                const _tHpv = !!e.receiptPreviewUrl;
                const _tTs  = Date.now();
                const photoCell = (_tHp || _tHpv)
                    ? (
                        (_tHp  ? '<div style="margin-bottom:3px;"><img src="' + fixUrl(e.photoUrl) + '?t=' + _tTs + '" style="width:46px;height:46px;object-fit:cover;border-radius:6px;border:2px solid #E65100;cursor:pointer;" onclick="openPbLightbox(\'' + fixUrl(e.photoUrl) + '\')" title="📷 Photo"></div>' : '') +
                        (_tHpv ? '<div><img src="' + fixUrl(e.receiptPreviewUrl) + '?t=' + _tTs + '" style="width:46px;height:46px;object-fit:cover;border-radius:6px;border:2px solid #1565C0;cursor:pointer;" onclick="openPbLightbox(\'' + fixUrl(e.receiptPreviewUrl) + '\')" title="🧾 Preview"></div>' : '')
                      )
                    : '<span style="font-size:.72rem;color:#aaa;font-style:italic;">No Image</span>';

                // Volunteer Edit buttons (No delete!)
                const editBtn = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'volunteer_view') ? ''
                    : `<button class="btn-icon btn-edit" title="Edit" onclick="deOpenVolEdit('${e.entryId}')"><i class="fas fa-edit"></i></button>`;

                _vdeHtml += '<tr id="vde-row-' + e.entryId + '">' +
                    '<td style="color:#aaa;font-size:.8rem;">' + (i+1) + '</td>' +
                    '<td style="font-weight:700;vertical-align:middle;">Bk ' + e.bookNumber + ' ' + ((e.bookType||'New')==='Old' ? '<span style="background:#FFF8F1;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>' : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>') + '</td>' +
                    '<td>#' + e.receiptNumber + '</td>' +
                    '<td style="font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + donor + '">' + donor + '</td>' +
                    '<td><span style="padding:2px 9px;border-radius:10px;font-size:.75rem;font-weight:700;background:' + (e.donorType==='Business'?'#E3F2FD':'#E8F5E9') + ';color:' + (e.donorType==='Business'?'#1565C0':'#1B5E20') + ';">' + e.donorType + '</span></td>' +
                    '<td style="color:#555;font-size:.85rem;">' + (e.whatsappNumber||'') + '</td>' +
                    '<td style="color:#555;font-size:.85rem;">' + (e.mobileNumber||'') + '</td>' +
                    '<td style="font-size:.85rem;">' + (e.buildingName||'') + (e.flatNumber ? '<br><span style="font-size:0.75rem;color:#777;">Flat: ' + e.flatNumber + '</span>' : '') + '</td>' +
                    '<td style="font-size:.85rem;">' + (e.landmark||'') + '</td>' +
                    '<td style="font-size:.85rem;">' + (e.area||'') + '</td>' +
                    '<td style="color:#2E7D32;font-weight:700;">' + amt + '</td>' +
                    '<td><span style="padding:3px 10px;border-radius:12px;background:#FFF8F1;color:#E65100;font-size:.75rem;font-weight:700;">' + e.paymentMode + '</span></td>' +
                    '<td style="font-size:.82rem;color:#777;">' + (e.referenceNumber||'') + '</td>' +
                    '<td style="text-align:center;vertical-align:middle;">' + photoCell + '</td>' +
                    '<td style="font-size:.82rem;color:#888;">' + (e.submittedBy||'') + '</td>' +
                    '<td style="color:#888;font-size:.82rem;">' + dt + '</td>' +
                    '<td><div class="action-btns">' + editBtn + '</div></td>' +
                    '</tr>';
            });
        });
        tbody.innerHTML = _vdeHtml;
    }

    function vdeRenderCards() {
        const grid = document.getElementById('vdeCardGrid');
        if (!grid) return;
        const q = (document.getElementById('vdeCardSearch')?.value || '').toLowerCase();
        let list = _vdeFiltered;
        if (q) {
            list = list.filter(e => {
                const donor = e.donorType === 'Business'
                    ? (e.businessName || '')
                    : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
                return donor.toLowerCase().includes(q) || 
                       String(e.landmark||'').toLowerCase().includes(q) ||
                       String(e.bookNumber).includes(q) ||
                       String(e.receiptNumber).includes(q);
            });
        }
        document.getElementById('vdeCardCount') && (document.getElementById('vdeCardCount').textContent = list.length + ' cards');
        if (!list.length) { grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px;grid-column:1/-1;">No entries match your search.</div>'; return; }

        grid.innerHTML = list.map(e => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '—')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
            const amt = e.amount != null ? '&#x20B9;' + Number(e.amount).toLocaleString('en-IN') : '—';
            const mode = e.paymentMode || '—';
            const modeClr = (mode === 'Cash' ? '#2E7D32' : mode === 'Cheque' ? '#1565C0' : mode === 'UPI' ? '#6A1B9A' : mode === 'RTGS' ? '#0277BD' : mode === 'Balance' ? '#E65100' : '#555');
            const dtObj = new Date(e.submittedAt);
            const dateStr = isNaN(dtObj) ? '—' : dtObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
            const timeStr = isNaN(dtObj) ? '' : dtObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
            
            const _hp = !!e.photoUrl, _hpv = !!e.receiptPreviewUrl, _ts = Date.now();
            const photoSection = (_hp || _hpv)
                ? `<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                       ${_hp ? `<div style="border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="openPbLightbox('${fixUrl(e.photoUrl)}')">
                           <div style="background:#FFF3E0;padding:3px 10px;font-size:.68rem;color:#E65100;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fas fa-camera"></i>&nbsp;Uploaded Receipt Photo</div>
                           <img src="${fixUrl(e.photoUrl)}?t=${_ts}" loading="lazy" alt="Receipt photo" style="width:100%;max-height:180px;object-fit:cover;display:block;">
                           <div style="background:#fff8f5;padding:3px 10px;font-size:.68rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;"><i class="fas fa-expand-alt"></i>&nbsp;Tap to view full image</div>
                       </div>` : ''}
                       ${_hpv ? `<div style="border-radius:10px;overflow:hidden;border:1.5px solid #90CAF9;cursor:pointer;" onclick="openPbLightbox('${fixUrl(e.receiptPreviewUrl)}')">
                           <div style="background:#E3F2FD;padding:3px 10px;font-size:.68rem;color:#1565C0;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fas fa-file-invoice"></i>&nbsp;Digital Receipt Preview</div>
                           <img src="${fixUrl(e.receiptPreviewUrl)}?t=${_ts}" loading="lazy" alt="Digital receipt" style="width:100%;max-height:180px;object-fit:cover;display:block;">
                           <div style="background:#EBF5FF;padding:3px 10px;font-size:.68rem;color:#1565C0;font-weight:600;display:flex;align-items:center;gap:5px;"><i class="fas fa-expand-alt"></i>&nbsp;Tap to view full preview</div>
                       </div>` : ''}
                   </div>`
                : `<div style="margin-top:12px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:12px;text-align:center;background:#fffaf8;">
                       <i class="fas fa-camera" style="font-size:1.3rem;color:#ddd;display:block;margin-bottom:5px;"></i>
                       <span style="font-size:.73rem;color:#ccc;font-weight:600;">No Receipt Photo</span>
                   </div>`;

            // Volunteer Edit button
            const editBtn = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'volunteer_view') ? ''
                : `<button onclick="deOpenVolEdit('${e.entryId}')" title="Edit" style="border:none;background:#E3F2FD;color:#1565C0;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.8rem;flex-shrink:0;"><i class="fas fa-edit"></i></button>`;

            return `<div style="background:var(--white);border:1.5px solid #F0F0F0;border-radius:14px;padding:18px 16px;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:box-shadow .2s;" onmouseover="this.style.boxShadow='0 4px 18px rgba(0,0,0,.11)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,.06)'">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">
                    <div style="font-weight:700;font-size:.97rem;color:var(--dark-color);line-height:1.3;">${donor}</div>
                    ${editBtn}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px;">
                    <span style="background:#F3E5F5;color:#6A1B9A;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;vertical-align:middle;"><i class="fas fa-book" style="margin-right:4px;"></i>Bk ${e.bookNumber} / #${e.receiptNumber}</span> ${ (e.bookType||'New')==='Old' ? '<span style="background:#FFF8F1;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:2px;vertical-align:middle;">Old</span>' : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:2px;vertical-align:middle;">New</span>' }
                    ${(e.landmark || e.area) ? `<span style="background:#E8F5E9;color:#1B5E20;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${[e.landmark, e.area].filter(Boolean).join(' - ')}</span>` : ''}
                    ${e.buildingName ? `<span style="background:#F3E5F5;color:#6A1B9A;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;"><i class="fas fa-building" style="margin-right:4px;"></i>${e.buildingName}${e.flatNumber ? ` (Flat: ${e.flatNumber})` : ''}</span>` : ''}
                    <span style="background:#FFF8E1;color:${modeClr};font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;">${mode}</span>
                </div>
                
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                    ${(e.editHistory && e.editHistory.length) || (e.nameHistory && e.nameHistory.length) ? `<span onclick="deOpenVolEdit('${e.entryId}')" style="cursor:pointer;font-size:.7rem;font-weight:700;color:#c0392b;background:#FFEBEE;padding:3px 8px;border-radius:12px;border:1px solid #f5b7b1;"><i class="fas fa-pencil-alt" style="margin-right:4px;"></i>Edited</span>` : '<span></span>'}
                    ${(e.status || (e.paymentMode === 'Balance' ? 'Balance' : 'Received')).toLowerCase() === 'received' ? `<span style="background:#E8F5E9;color:#1B5E20;font-size:.73rem;font-weight:800;padding:3px 9px;border-radius:16px;border:1px solid #c8e6c9;">STATUS: RECEIVED</span>` : `<span style="background:#FFF8E1;color:#F57F17;font-size:.73rem;font-weight:800;padding:3px 9px;border-radius:16px;border:1px solid #ffe0b2;">STATUS: BALANCE</span>`}
                    <div style="display:flex;gap:4px;">
                        <button onclick="de_rcg_openEditModal('${e.entryId}')" title="Edit Receipt" style="border:none;background:linear-gradient(135deg,#8B1A1A,#B71C1C);color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.78rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;"><i class="fas fa-file-invoice"></i> Edit</button>
                        ${e.receiptPreviewUrl ? `<button onclick="window.open('${e.receiptPreviewUrl}', '_blank')" title="View HD Receipt" style="border:none;background:#FFEBEE;color:#C62828;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.78rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;"><i class="fas fa-eye"></i> View</button>` : ''}
                    </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="font-size:1.1rem;font-weight:800;color:#2E7D32;">${amt}</div>
                    <div style="font-size:.76rem;color:#aaa;text-align:right;line-height:1.4;">
                        ${timeStr}<br>${dateStr}
                        ${(e.updatedAt && e.updatedAt !== e.submittedAt && !isNaN(new Date(e.updatedAt))) ? 
                            `<div style="margin-top:4px;padding:2px 4px;background:#FFF8F1;border:1px solid #ffe0b2;border-radius:4px;color:#E65100;font-size:0.7rem;line-height:1.1;text-align:right;"><i class="fas fa-history" style="font-size:0.6rem;"></i> Updated:<br>${new Date(e.updatedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase()} ${new Date(e.updatedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>` 
                            : ''}
                    </div>
                </div>
                ${e.submittedBy ? `<div style="font-size:.75rem;color:#bbb;margin-top:7px;"><i class="fas fa-user" style="margin-right:4px;"></i>${e.submittedBy}</div>` : ''}
                ${e.markedReceivedBy ? `<div style="font-size:.76rem;font-weight:700;color:#E65100;margin-top:6px;padding:5px 10px;background:#FFF8F1;border-radius:8px;border:1px solid #ffe0b2;"><i class="fas fa-check-circle" style="color:#2E7D32;margin-right:5px;"></i>Marked received by <strong>${e.markedReceivedBy}</strong></div>` : ''}
                ${photoSection}
            </div>`;
        }).join('');
    }

    // Call vdeLoad when section is displayed
    async function deLoadMyEntries() {
        await vdeLoad();
    }

    // ─── Year Filter for Donation Data Entry ────────────────────────────────
    async function deLoadYearFilter() {
        const roles = ['admin', 'volunteer_full', 'volunteer_full_tshirt'];
        const sel = document.getElementById('deYearFilter');
        if (!sel) return;
        if (!currentUser || !roles.includes(currentUser.role)) {
            sel.style.display = 'none';
            return;
        }
        // Always show the dropdown for eligible roles – even before API response
        sel.style.display = 'inline-block';
        try {
            const r = await fetch('/api/donation-years');
            const data = await r.json();
            if (!data.years || !data.years.length) return;
            sel.innerHTML = '';
            const activeYear = data.activeYear;
            // Add an "All Years" option at the top for admins
            if (currentUser.role === 'admin') {
                const allOpt = document.createElement('option');
                allOpt.value = 'all';
                allOpt.textContent = '📅 All Years';
                sel.appendChild(allOpt);
            }
            data.years.forEach(yr => {
                const opt = document.createElement('option');
                opt.value = yr;
                opt.textContent = yr === activeYear ? '⭐ ' + yr + ' (Active)' : yr;
                if (!window._deSelectedYear && yr === activeYear) opt.selected = true;
                if (window._deSelectedYear === yr) opt.selected = true;
                sel.appendChild(opt);
            });
            if (!window._deSelectedYear) window._deSelectedYear = activeYear;
        } catch(e) {
            // Even if API fails, keep showing with default "Active Year" option
            console.warn('Could not load donation years from API:', e);
            if (!window._deSelectedYear) window._deSelectedYear = 'active';
        }
    }

    // ── Volunteer Edit Modal ────────────────────────────────
    let _deVolEditBlob = null;
    let _deVolEditBookType = 'New';

    function deOpenVolEdit(id) {
        fetch('/api/donation-entries?year=' + (window._deSelectedYear || 'active')).then(r => r.json()).then(data => {
            const e = (data.entries || []).find(x => x.entryId === id);
            if (!e) return;
            _deVolEditBlob = null;
            _deVolEditBookType = e.bookType || 'New';
            document.getElementById('deVolEditId').value     = id;
            document.getElementById('deVolEditAmount').value = e.amount != null ? e.amount : '';
            // Store original amount to detect changes later
            document.getElementById('deVolEditAmount').dataset.original = e.amount != null ? e.amount : '';
            document.getElementById('deVolEditMode').value   = e.paymentMode || 'Cash';
            
            const statusField = document.getElementById('deVolEditStatusField');
            if (statusField) {
                statusField.value = e.status || (e.paymentMode === 'Balance' ? 'Balance' : 'Received');
                // Change style based on status
                statusField.style.background = statusField.value === 'Received' ? '#E8F5E9' : '#FFF8F1';
                statusField.style.color = statusField.value === 'Received' ? '#1B5E20' : '#E65100';
                
                statusField.onchange = function() {
                    this.style.background = this.value === 'Received' ? '#E8F5E9' : '#FFF8F1';
                    this.style.color = this.value === 'Received' ? '#1B5E20' : '#E65100';
                };
            }

            const bookSel = document.getElementById('deVolEditBook');
            bookSel.innerHTML = '';
            for (let b = 1; b <= 50; b++) {
                const from = (b-1)*50+1, to = b*50;
                const opt = document.createElement('option');
                opt.value = b; opt.textContent = `Book ${b}  (${from}–${to})`;
                if (b === e.bookNumber) opt.selected = true;
                bookSel.appendChild(opt);
            }
            bookSel.dataset.original = e.bookNumber || '';

            const recSel = document.getElementById('deVolEditReceipt');
            recSel.dataset.original = e.receiptNumber || '';
            
            deVolEditPopulateReceipts(e.bookNumber, e.receiptNumber);
            const FIXED = ['Patelwadi','Shindewadi','Gurkhawadi'];
            const landmarkSel = document.getElementById('deVolEditLandmark');
            landmarkSel.innerHTML = '<option value="">— Select Landmark —</option>' +
                FIXED.map(n => `<option value="${n}" ${n===e.landmark?'selected':''}>${n}</option>`).join('');
            fetch('/api/landmarks').then(r2 => r2.json()).then(ad => {
                (ad.landmarks||[]).forEach(a => {
                    if (!FIXED.includes(a.name))
                        landmarkSel.innerHTML += `<option value="${a.name}" ${a.name===e.landmark?'selected':''}>${a.name}</option>`;
                });
                deOnVolEditLandmarkChange(e.area);
            }).catch(()=>{});
            const curDiv = document.getElementById('deVolEditCurrentPhoto');
            const curImg = document.getElementById('deVolEditCurrentImg');
            if (e.photoUrl) {
                curImg.src = e.photoUrl + '?t=' + Date.now();
                curImg.onclick = () => openPbLightbox(e.photoUrl);
                curDiv.style.display = '';
            } else { curDiv.style.display = 'none'; }
            document.getElementById('deVolEditPhotoPreview').style.display = 'none';
            document.getElementById('deVolEditPhotoInput').value = '';
            document.getElementById('deVolEditStatus').style.display = 'none';
            // Populate name fields
            const isBiz = e.donorType === 'Business';
            const indF  = document.getElementById('deVolNameIndFields');
            const bizF  = document.getElementById('deVolNameBizFields');
            if (indF) indF.style.display = isBiz ? 'none' : 'grid';
            if (bizF) bizF.style.display = isBiz ? 'block' : 'none';
            const f1 = document.getElementById('deVolEditFirst'); if(f1) f1.value = e.firstName || '';
            const f2 = document.getElementById('deVolEditMid');   if(f2) f2.value = e.middleName || '';
            const f3 = document.getElementById('deVolEditLast');  if(f3) f3.value = e.lastName || '';
            const fb = document.getElementById('deVolEditBiz');   if(fb) fb.value = e.businessName || '';
            const fr = document.getElementById('deVolEditReason'); if(fr) fr.value = '';

            // ── Mark fields required / optional based on role ─────────────────
            const _isVolRole = currentUser && currentUser.role !== 'admin';
            const _reqFields = ['deVolEditFirst','deVolEditLast','deVolEditAmount','deVolEditReason'];
            _reqFields.forEach(fid => {
                const el = document.getElementById(fid);
                if (el) el.required = _isVolRole;
            });
            const _bizEl = document.getElementById('deVolEditBiz');
            if (_bizEl) _bizEl.required = _isVolRole && (e.donorType === 'Business');

            // ── Render edit history ───────────────────────────────────────────
            const histDiv = document.getElementById('deVolEditHistory');
            if (histDiv) {
                const hist = [...(e.editHistory || []), ...(e.nameHistory || [])].sort(
                    (a, b) => new Date(a.changedAt || a.at || 0) - new Date(b.changedAt || b.at || 0)
                );
                if (hist.length) {
                    histDiv.style.display = '';
                    histDiv.innerHTML =
                        `<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:#c0392b;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                            <i class="fas fa-history"></i> Edit History <span style="background:#FFEBEE;color:#c0392b;border-radius:10px;padding:1px 8px;font-size:.7rem;">${hist.length}</span>
                        </div>` +
                        hist.map(h => {
                            const dt = new Date(h.changedAt || h.at || '');
                            const dtStr = isNaN(dt) ? '' :
                                dt.toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) + ' · ' +
                                dt.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase();
                            const changes = [];
                            if (h.from !== undefined && h.to !== undefined && h.from !== h.to)
                                changes.push(`Name: "${h.from || '—'}" → "${h.to || '—'}"`);
                            if (h.fromAmount !== undefined && h.toAmount !== undefined && h.fromAmount !== h.toAmount)
                                changes.push(`Amount: ₹${h.fromAmount} → ₹${h.toAmount}`);
                            if (h.fromBook !== undefined && h.toBook !== undefined && h.fromBook !== h.toBook)
                                changes.push(`Book: ${h.fromBook} → ${h.toBook}`);
                            if (h.fromReceipt !== undefined && h.toReceipt !== undefined && h.fromReceipt !== h.toReceipt)
                                changes.push(`Receipt: #${h.fromReceipt} → #${h.toReceipt}`);
                            if (h.fromMode !== undefined && h.toMode !== undefined && h.fromMode !== h.toMode)
                                changes.push(`Mode: ${h.fromMode} → ${h.toMode}`);
                            if (h.fromStatus !== undefined && h.toStatus !== undefined && h.fromStatus !== h.toStatus)
                                changes.push(`Status: ${h.fromStatus} → ${h.toStatus}`);
                            return `<div style="background:#FFF8F1;border:1px solid #ffe0b2;border-radius:10px;padding:10px 14px;margin-bottom:8px;font-size:.76rem;">
                                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:6px;">
                                    <span style="font-weight:700;color:#E65100;"><i class="fas fa-user" style="margin-right:5px;"></i>${h.changedBy || h.by || 'Unknown'}</span>
                                    <span style="color:#999;font-size:.7rem;">${dtStr}</span>
                                </div>
                                ${changes.length ? `<div style="color:#555;background:#fff;border-radius:6px;padding:4px 8px;margin-bottom:5px;font-size:.72rem;line-height:1.5;">${changes.map(c=>`<div>• ${c}</div>`).join('')}</div>` : ''}
                                <div style="color:#666;"><i class="fas fa-comment-alt" style="margin-right:5px;color:#bbb;"></i><strong>Reason:</strong> ${h.reason || h.changeReason || '—'}</div>
                            </div>`;
                        }).join('');
                } else {
                    histDiv.style.display = 'none';
                    histDiv.innerHTML = '';
                }
            }

            document.getElementById('deVolEditModal').style.display = 'flex';
        }).catch(() => alert('Could not load entry.'));
    }

    async function deVolEditPopulateReceipts(bookNum, currentReceipt) {
        const sel = document.getElementById('deVolEditReceipt');
        sel.disabled = true;
        sel.innerHTML = '<option>Loading…</option>';
        const from = (bookNum-1)*50+1, to = bookNum*50;
        let used = [];
        try {
            const r = await fetch(`/api/donation-entries/used-receipts/${bookNum}?type=${_deVolEditBookType}`);
            const d = await r.json();
            used = d.usedReceipts || [];
        } catch(ex) {}
        sel.innerHTML = '<option value="">— Select Receipt —</option>';
        for (let n = from; n <= to; n++) {
            const taken = used.includes(n) && n !== Number(currentReceipt);
            const opt = document.createElement('option');
            opt.value = n; opt.textContent = n + (taken ? ' (used)' : '');
            if (taken) opt.disabled = true;
            if (n === Number(currentReceipt)) opt.selected = true;
            sel.appendChild(opt);
        }
        sel.disabled = false;
    }

    async function deVolEditBookChange() {
        const bn = Number(document.getElementById('deVolEditBook').value);
        await deVolEditPopulateReceipts(bn, null);
    }

    async function deOnVolEditLandmarkChange(initialArea = null) {
        const landmarkName = document.getElementById('deVolEditLandmark')?.value;
        const group = document.getElementById('deVolEditAreaGroup');
        const sel = document.getElementById('deVolEditArea');
        if (!group || !sel) return;
        
        sel.innerHTML = '<option value="">— Select Area —</option>';
        if (landmarkName) {
            group.style.display = 'block';
            try {
                const r1 = await fetch('/api/landmarks');
                const d1 = await r1.json();
                const landmarkObj = (d1.landmarks || []).find(a => a.name === landmarkName);
                if (landmarkObj) {
                    const r2 = await fetch('/api/areas');
                    const d2 = await r2.json();
                    const subs = (d2.areas || []).filter(s => s.landmarkId === landmarkObj.id);
                    subs.forEach(s => {
                        sel.innerHTML += `<option value="${s.name}" ${initialArea && s.name === initialArea ? 'selected' : ''}>${s.name}</option>`;
                    });
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            group.style.display = 'none';
        }
    }

    function deCloseVolEdit() {
        _deVolEditBlob = null;
        document.getElementById('deVolEditModal').style.display = 'none';
        document.getElementById('deVolEditPhotoPreview').style.display = 'none';
        document.getElementById('deVolEditPhotoInput').value = '';
    }

    document.getElementById('deVolEditPhotoInput')?.addEventListener('change', function(ev) {
        const file = ev.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Please select a JPG or PNG image.'); this.value=''; return; }
        const prev  = document.getElementById('deVolEditPhotoPreview');
        const thumb = document.getElementById('deVolEditPhotoThumb');
        const name  = document.getElementById('deVolEditPhotoName');
        _compressImage(file, 950, function(blob) {
            if (!blob) { alert('Could not process image.'); return; }
            _deVolEditBlob = blob;
            // Revoke previous object URL before setting a new one
            if (thumb && thumb.src && thumb.src.startsWith('blob:')) URL.revokeObjectURL(thumb.src);
            if (thumb) thumb.src = URL.createObjectURL(blob);
            if (name)  name.textContent = '\u2705 ' + file.name.replace(/\.[^.]+$/, '') + '.jpg ' +
                (blob.size < 1048576 ? '(' + (blob.size/1024).toFixed(1) + ' KB)' : '(' + (blob.size/1048576).toFixed(2) + ' MB)');
            if (prev) prev.style.display = '';
        });
    });

    async function deSaveVolEdit(ev) {
        ev.preventDefault();
        const id  = document.getElementById('deVolEditId').value;
        if (!id) return;
        const btn = document.getElementById('deVolEditSaveBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Saving…'; }
        const st = document.getElementById('deVolEditStatus');
        function showSt(msg, type) {
            if (!st) return;
            st.style.display = ''; st.textContent = msg;
            st.style.background = type==='success' ? '#D5F4E6' : '#FFEBEE';
            st.style.color      = type==='success' ? '#1a7a45' : '#c0392b';
            st.style.border     = type==='success' ? '1px solid #a3e6c1' : '1px solid #f5b7b1';
        }
        const amtVal = document.getElementById('deVolEditAmount').value;
        const bnVal  = Number(document.getElementById('deVolEditBook').value);
        const rnVal  = Number(document.getElementById('deVolEditReceipt').value);
        if (!rnVal) { showSt('❌ Please select a Receipt Number.', 'error'); if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-save" style="margin-right:6px;"></i>Save Changes'; } return; }
        // Detect name changes
        const _eIsBiz = document.getElementById('deVolNameBizFields')?.style.display !== 'none';
        const _newFirst = document.getElementById('deVolEditFirst')?.value.trim().toUpperCase() || '';
        const _newMid   = document.getElementById('deVolEditMid')?.value.trim().toUpperCase()   || '';
        const _newLast  = document.getElementById('deVolEditLast')?.value.trim().toUpperCase()  || '';
        const _newBiz   = document.getElementById('deVolEditBiz')?.value.trim().toUpperCase()   || '';
        const _reason   = document.getElementById('deVolEditReason')?.value.trim()              || '';
        const _hasNameChange = _eIsBiz ? !!_newBiz : !!(_newFirst || _newMid || _newLast);
        
        const origAmt   = document.getElementById('deVolEditAmount').dataset.original || '';
        const _hasAmountChange = origAmt !== amtVal;

        const origBook  = document.getElementById('deVolEditBook').dataset.original || '';
        const _hasBookChange = origBook !== '' && Number(origBook) !== bnVal;

        const origRcpt  = document.getElementById('deVolEditReceipt').dataset.original || '';
        const _hasReceiptChange = origRcpt !== '' && Number(origRcpt) !== rnVal;

        const payload = {
            _isAdmin      : false,
            paymentMode   : document.getElementById('deVolEditMode').value,
            status        : document.getElementById('deVolEditStatusField')?.value || undefined,
            bookNumber    : bnVal,
            receiptNumber : rnVal,
            landmark          : document.getElementById('deVolEditLandmark').value || undefined,
            area       : document.getElementById('deVolEditArea').value || undefined,
        };
        if (amtVal !== '') payload.amount = Number(amtVal);
        
        if (_hasNameChange || _hasAmountChange || _hasBookChange || _hasReceiptChange) {
            if (!_reason) { showSt('❌ Please provide a reason for the change.', 'error'); if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-save" style="margin-right:6px;"></i>Save Changes'; } return; }
            if (_hasNameChange) {
                if (_eIsBiz) { payload.businessName = _newBiz; }
                else { payload.firstName = _newFirst; payload.middleName = _newMid; payload.lastName = _newLast; }
            }
            payload.changeReason = _reason;
            payload.changedBy = currentUser ? currentUser.name : 'Volunteer';
        }
        try {
            const res  = await fetch(`/api/donation-entries/${encodeURIComponent(id)}`, {
                method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                showSt('❌ ' + (data.message || 'Update failed.'), 'error');
                if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-save" style="margin-right:6px;"></i>Save Changes'; }
                return;
            }
            if (_deVolEditBlob) {
                try {
                    const fd = new FormData();
                    fd.append('passbook', _deVolEditBlob, 'receipt.jpg');
                    fd.append('entryId', id);
                    fd.append('userId',   currentUser ? String(currentUser.id) : '');
                    fd.append('userName', currentUser ? currentUser.name : '');
                    const upRes  = await fetch('/api/upload-passbook', { method:'POST', body:fd });
                    if (upRes.ok) {
                        const upData = await upRes.json();
                        if (upData.fileName) {
                            const rowImg = document.querySelector(`#de-vol-row-${CSS.escape(id)} img`);
                            const newSrc = `/uploads/${upData.fileName}?t=${Date.now()}`;
                            if (rowImg) { rowImg.src = newSrc; rowImg.onclick = () => openPbLightbox(newSrc); }
                        }
                    }
                } catch(_x) { /* photo failure non-blocking */ }
            }
            showSt('✅ Entry updated!', 'success');
            setTimeout(() => deCloseVolEdit(), 900);
            await deLoadMyEntries();
        } catch(err) {
            showSt('❌ ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-save" style="margin-right:6px;"></i>Save Changes'; }
        }
    }

    