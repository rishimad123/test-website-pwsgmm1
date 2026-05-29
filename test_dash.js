
/* Portable API base: strip hardcoded localhost:3000 → relative URL on any host */
(function() {
  var _f = window.fetch.bind(window);
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.startsWith('http://localhost:3000'))
      url = url.slice('http://localhost:3000'.length);
    return _f(url, opts);
  };
})();
/* Fix photo URLs for mobile (relative, not localhost) */
window.fixUrl = function(url) {
  if (!url) return '';
  if (url.startsWith('http://localhost:3000')) return url.slice('http://localhost:3000'.length);
  return url;
};


      if (window.location.protocol === 'file:') {
        var page = window.location.pathname.split('/').pop();
        var hash = window.location.hash || '';
        window.location.replace('/' + page + hash);
      }
    

        // Check authentication
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
            window.location.href = 'login.html';
        } else {
            document.getElementById('userName').textContent = 'Welcome ' + currentUser.name;
            document.getElementById('topBarName').textContent = currentUser.name;
            document.getElementById('userAvatar').textContent = currentUser.name.charAt(0);
        }
        
        function showSection(sectionId) {
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.style.display = 'none';
            });

            // Show selected section
            const target = document.getElementById(sectionId);
            if (target) target.style.display = 'block';

            // Update active menu item
            document.querySelectorAll('.sidebar-menu a').forEach(link => {
                link.classList.remove('active');
            });
            if (event && event.target) {
                const link = event.target.closest('a');
                if (link) link.classList.add('active');
            }

            // Load donation entries when that section is opened
            if (sectionId === 'donationEntry') { deLoadDropdowns(); deLoadMyEntries(); }
            // Load balance recovery when that section is opened
            if (sectionId === 'balanceRecovery') { loadVolBalanceRecovery(); }
            // Load donor search when that section is opened
            if (sectionId === 'donorSearch') {
                if (typeof loadDonorSearch === 'function') loadDonorSearch();
            }
            if (sectionId === 'tshirtSection' && typeof renderTshirtSection === 'function') renderTshirtSection();
        }

        // Mobile sidebar helpers
        function openSidebar() {
            document.querySelector('.sidebar').classList.add('open');
            document.getElementById('sidebarOverlay').classList.add('active');
        }
        function closeSidebar() {
            document.querySelector('.sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        }
        
        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
        }
        
        // ==================== PASSBOOK DOCUMENT — Camera + Auto-Compress ====================
        // Works on Android, iOS (via capture=environment) and desktop (file picker)
        let _pbDocBlob = null;  // compressed Blob ready to upload

        // Canvas-based compression: reduces image to ≤1 MB (or targetKB) using quality loop
        function _compressImage(file, targetKB, callback) {
            const MAX_BYTES = (targetKB || 950) * 1024;
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = function() {
                URL.revokeObjectURL(url);
                // Determine render size (max 1920px wide)
                let w = img.naturalWidth, h = img.naturalHeight;
                const MAX_DIM = 1920;
                if (w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                // Binary-search quality until file fits
                let lo = 0.1, hi = 0.92, q = 0.82, blob = null;
                function tryQ(quality) {
                    canvas.toBlob(function(b) {
                        blob = b;
                        if (b.size <= MAX_BYTES || (hi - lo) < 0.03) {
                            callback(blob);
                        } else {
                            hi = quality;
                            q = (lo + hi) / 2;
                            tryQ(q);
                        }
                    }, 'image/jpeg', quality);
                }
                if (file.size <= MAX_BYTES) {
                    // Already small enough — still convert to JPEG for uniformity
                    canvas.toBlob(function(b) { callback(b); }, 'image/jpeg', 0.9);
                } else {
                    tryQ(q);
                }
            };
            img.onerror = function() { callback(null); }; // fallback: no compression
            img.src = url;
        }

        function _fmtBytes(b) {
            return b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(2) + ' MB';
        }

        const handleImageUpload = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            // Non-image? reject.
            if (!file.type.startsWith('image/')) {
                alert('Please select a JPG or PNG image.');
                this.value = ''; return;
            }
            // Show compression spinner
            const cmpEl  = document.getElementById('pbCompressStatus');
            const preEl  = document.getElementById('pbDocPreview');
            const thumbEl = document.getElementById('pbDocThumb');
            const nameEl  = document.getElementById('pbDocFileName');
            const sizeEl  = document.getElementById('pbDocFileSize');
            if (cmpEl)  cmpEl.style.display  = '';
            if (preEl)  preEl.style.display  = 'none';
            _pbDocBlob = null;

            _compressImage(file, 950, function(blob) {
                if (cmpEl) cmpEl.style.display = 'none';
                if (!blob) {
                    alert('Could not process image. Please try a different file.');
                    return;
                }
                _pbDocBlob = blob;
                // Show thumbnail — revoke any previous object URL to prevent memory leak
                if (thumbEl && thumbEl.src && thumbEl.src.startsWith('blob:')) URL.revokeObjectURL(thumbEl.src);
                const objURL = URL.createObjectURL(blob);
                if (thumbEl) { thumbEl.src = objURL; }
                if (nameEl)  nameEl.textContent  = file.name.replace(/\.[^.]+$/, '') + '.jpg';
                if (sizeEl)  sizeEl.textContent  = '✅ ' + _fmtBytes(blob.size) + (file.size > blob.size ? '  (compressed from ' + _fmtBytes(file.size) + ')' : '');
                if (preEl)  preEl.style.display  = '';
            });
        };

        document.getElementById('pbDocCamera')?.addEventListener('change', handleImageUpload);
        document.getElementById('pbDocCameraCapture')?.addEventListener('change', handleImageUpload);

        function pbClearDoc() {
            _pbDocBlob = null;
            const inp = document.getElementById('pbDocCamera');
            if (inp) inp.value = '';
            const inpCap = document.getElementById('pbDocCameraCapture');
            if (inpCap) inpCap.value = '';
            const preEl = document.getElementById('pbDocPreview');
            if (preEl) preEl.style.display = 'none';
            const thumb = document.getElementById('pbDocThumb');
            if (thumb) thumb.src = '';
        }

        // Android-specific layout modification
        (function checkAndroidUpload() {
            const isAndroid = /Android/i.test(navigator.userAgent);
            const pbUploadContainer = document.getElementById('pbUploadContainer');
            if (isAndroid && pbUploadContainer) {
                pbUploadContainer.innerHTML = `
                    <button type="button" onclick="document.getElementById('pbDocCameraCapture').click()"
                        style="flex:1;min-width:120px;padding:14px;border:2px dashed var(--primary-color);border-radius:12px;background:#fff8f5;color:var(--primary-color);font-size:.92rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-camera" style="font-size:1.3rem;"></i> Take Photo
                    </button>
                    <button type="button" onclick="document.getElementById('pbDocCamera').click()"
                        style="flex:1;min-width:120px;padding:14px;border:2px dashed var(--primary-color);border-radius:12px;background:#fff8f5;color:var(--primary-color);font-size:.92rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-images" style="font-size:1.3rem;"></i> Select Gallery
                    </button>
                `;
            }
        })();

        // ==================== LIGHTBOX ====================
        function openPbLightbox(url) {
            const lb = document.getElementById('pbLightbox');
            const img = document.getElementById('pbLightboxImg');
            img.src = url;
            lb.classList.add('active');
        }
        function closePbLightbox() {
            document.getElementById('pbLightbox').classList.remove('active');
            document.getElementById('pbLightboxImg').src = '';
        }
        document.getElementById('pbLightbox').addEventListener('click', function(e) {
            if (e.target === this) closePbLightbox();
        });

        // ==================== BALANCE RECOVERY MODULE ====================
        async function loadVolBalanceRecovery() {
            const tbody = document.getElementById('volBalTbody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:24px;">Loading...</td></tr>';
            try {
                // Fetch all donation entries and Pauti books (across entire website)
                const [deRes, pbRes] = await Promise.all([
                    fetch('/api/donation-entries'),
                    fetch('/api/pauti-books')
                ]);
                const deData = await deRes.json();
                const pbData = await pbRes.json();

                const pautiPending = [];
                (pbData.pautiBooks || []).forEach(book => {
                    (book.slips || []).forEach(slip => {
                        if (!slip.deleted && slip.uploadedAt &&
                            (slip.paymentMode === 'balance' || !slip.amount || Number(slip.amount) <= 0)) {
                            pautiPending.push({
                                receiptId: `SLIP-${slip.slipNumber}`,
                                name: slip.donorName || '—',
                                amount: slip.amount || 0,
                                photoUrl: slip.photoUrl || null,
                                submittedAt: slip.uploadedAt,
                                status: 'pending',
                                type: 'pauti-slip',
                                bookNumber: book.bookNumber,
                                receiptNumber: slip.slipNumber,
                                area: '—'
                            });
                        }
                    });
                });

                const dePending = (deData.entries || []).filter(e =>
                    e.paymentMode && e.paymentMode.toLowerCase() === 'balance' && !e.deleted
                ).map(e => {
                    const donor = e.donorType === 'Business'
                        ? (e.businessName || '—')
                        : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
                    return {
                        receiptId: e.entryId,
                        name: donor,
                        amount: e.amount || 0,
                        photoUrl: e.photoUrl || null,
                        submittedAt: e.submittedAt,
                        status: e.status || 'Balance',
                        type: 'donation-entry',
                        bookNumber: e.bookNumber,
                        receiptNumber: e.receiptNumber,
                        area: e.area || '—'
                    };
                });

                const list = [...pautiPending, ...dePending];

                if (list.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:24px;">No pending balance slips found.</td></tr>';
                    return;
                }

                const grouped = {};
                list.forEach(r => {
                    const bn = r.bookNumber || 'Unknown';
                    if(!grouped[bn]) grouped[bn] = [];
                    grouped[bn].push(r);
                });

                const bookNumbers = Object.keys(grouped).sort((a, b) => {
                    const na = parseInt(a);
                    const nb = parseInt(b);
                    if (!isNaN(na) && !isNaN(nb)) return na - nb;
                    return String(a).localeCompare(String(b));
                });

                let html = '';
                bookNumbers.forEach(bn => {
                    html += `<tr><td colspan="8" style="background:#F4F6FB;color:#1A237E;font-weight:700;font-size:1.05rem;padding:12px 16px;">Book Number ${bn}</td></tr>`;
                    html += grouped[bn].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map(r => {
                        const dt = new Date(r.submittedAt);
                        const dateStr = dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase()
                                      + ', ' + dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                        const amtCell = r.amount && Number(r.amount) > 0
                            ? '₹' + Number(r.amount).toLocaleString('en-IN')
                            : '<span style="color:#ccc;font-style:italic;">No amount</span>';
                        const photoCell = r.photoUrl
                            ? `<img src="${r.photoUrl}?t=${Date.now()}" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="openPbLightbox('${r.photoUrl}')" title="Click to enlarge">`
                            : '<span style="color:#ccc;">—</span>';
                        
                        const isReceived  = (r.status || '').toLowerCase() === 'received';
                        const statusBadge = isReceived 
                            ? '<span class="badge badge-success" style="background:#E8F5E9;color:#1B5E20;">Received</span>'
                            : '<span class="badge badge-warning" style="background:#FFF8E1;color:#F57F17;">Balance</span>';

                        const safeId = r.receiptId.replace(/'/g, "\\'");
                        const markBtn = (!isReceived)
                            ? `<button class="btn-icon btn-edit" style="background:#E8F5E9;color:#1B5E20;padding:6px 10px;margin-right:5px;" title="Mark as Received" onclick="markBalanceReceived('${safeId}')"><i class="fas fa-check"></i></button>`
                            : '';
                        const editBtn = r.type === 'donation-entry'
                            ? `<button class="btn btn-sm" style="background:#E3F2FD;color:#1565C0;padding:6px 10px;" onclick="deOpenVolEdit('${safeId}')"><i class="fas fa-edit"></i> Edit</button>`
                            : '<span style="font-size:0.8rem;color:#999;">-</span>';

                        return `<tr>
                            <td style="font-weight:700;">Bk ${r.bookNumber} #${r.receiptNumber}</td>
                            <td style="font-weight:600;">${r.name}</td>
                            <td>${r.area}</td>
                            <td style="color:#2E7D32;font-weight:700;">${amtCell}</td>
                            <td style="color:#777;font-size:.82rem;">${dateStr}</td>
                            <td>${statusBadge}</td>
                            <td style="text-align:center;">${photoCell}</td>
                            <td style="text-align:center;white-space:nowrap;">${markBtn}${editBtn}</td>
                        </tr>`;
                    }).join('');
                });
                tbody.innerHTML = html;
            } catch(e) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#c00;padding:24px;">Error loading balance data.</td></tr>';
            }
        }

        async function markBalanceReceived(id) {
            if (!confirm('Mark this balance recovery slip as Received?')) return;
            try {
                const res  = await fetch(`/api/receipts/${encodeURIComponent(id)}/mark-received`, { method: 'PATCH' });
                const data = await res.json();
                if (res.ok && data.success) {
                    showNotification('Balance slip marked as received!', 'success');
                    loadVolBalanceRecovery();
                } else {
                    showNotification('Error: ' + (data.message || 'Could not update.'), 'error');
                }
            } catch (e) {
                showNotification('Cannot reach server.', 'error');
            }
        }

        // ==================== EDIT AMOUNT MODAL ====================
        let _editReceiptId = null;
        function openPbEdit(receiptId, currentAmount) {
            _editReceiptId = receiptId;
            document.getElementById('pbEditAmountInput').value = currentAmount || '';
            document.getElementById('pbEditModal').classList.add('active');
        }
        function closePbEdit() {
            _editReceiptId = null;
            document.getElementById('pbEditModal').classList.remove('active');
        }
        async function savePbEditAmount() {
            const newAmt = Number(document.getElementById('pbEditAmountInput').value);
            if (!_editReceiptId || isNaN(newAmt) || newAmt <= 0) {
                alert('Please enter a valid positive amount.');
                return;
            }
            const btn = document.getElementById('pbEditSaveBtn');
            btn.disabled = true; btn.textContent = 'Saving…';
            try {
                const res = await fetch(`/api/receipts/${encodeURIComponent(_editReceiptId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: newAmt })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    closePbEdit();
                    loadVolunteerPassbooks();
                } else {
                    alert('Error: ' + (data.message || 'Could not save.'));
                }
            } catch(e) {
                alert('Cannot reach server. Make sure server.js is running.');
            } finally {
                btn.disabled = false; btn.textContent = 'Save';
            }
        }

        // ==================== LOAD VOLUNTEER RECEIPTS ====================
        async function loadVolunteerPassbooks() {
            const tbody = document.getElementById('uploadedDocsList');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;">Loading…</td></tr>';
            try {
                const res = await fetch('/api/receipts');
                const data = await res.json();
                const myId = currentUser ? (currentUser.id ?? null) : null;
                // Show all receipts belonging to this user (or all if userId is null)
                const myReceipts = (data.receipts || []).filter(r =>
                    myId === null || String(r.userId) === String(myId)
                );
                if (myReceipts.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;">No receipts submitted yet.</td></tr>';
                    return;
                }
                tbody.innerHTML = myReceipts.map(r => {
                    const dateStr = new Date(r.submittedAt).toLocaleDateString('en-IN',
                        { day: 'numeric', month: 'short', year: 'numeric' });
                    const amtDisplay = (r.amount !== null && r.amount !== undefined)
                        ? '₹' + Number(r.amount).toLocaleString('en-IN')
                        : '<span style="color:#aaa;">—</span>';
                    const isPdf = r.passbookFile && r.passbookFile.toLowerCase().match(/\.pdf$/);
                    const hasFile = !!r.passbookUrl;
                    const viewBtn = hasFile
                        ? (isPdf
                            ? `<button class="btn btn-sm btn-primary" onclick="window.open('${r.passbookUrl}','_blank')"><i class="fas fa-file-pdf" style="margin-right:4px;"></i>View PDF</button>`
                            : `<button class="btn btn-sm btn-primary" onclick="openPbLightbox('${r.passbookUrl}')"><i class="fas fa-image" style="margin-right:4px;"></i>View</button>`)
                        : `<span style="color:#bbb;font-size:.85rem;">No file</span>`;
                    return `
                        <tr id="vol-row-${r.receiptId}">
                            <td style="font-size:.8rem;color:#888;">${r.receiptId}</td>
                            <td>${r.name}</td>
                            <td>${amtDisplay}</td>
                            <td>${dateStr}</td>
                            <td>${viewBtn}</td>
                            <td>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                    <button class="btn btn-sm" style="background:#E3F2FD;color:#1565C0;" onclick="openPbEdit('${r.receiptId}',${r.amount ?? 0})">
                                        <i class="fas fa-edit"></i> Edit Amount
                                    </button>
                                    <button class="btn btn-sm" style="background:#FFF3E0;color:#E65100;" onclick="reUpload('${r.receiptId}')">
                                        <i class="fas fa-upload"></i> Re-Upload
                                    </button>
                                </div>
                            </td>
                        </tr>`;
                }).join('');
            } catch(e) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;">⚠ Could not load receipts. Is server.js running?</td></tr>';
            }
        }

        // ==================== RE-UPLOAD (link file to a specific receipt) ====================
        let _reUploadReceiptId = null;
        function reUpload(receiptId) {
            _reUploadReceiptId = receiptId;
            // Reuse the existing file input
            document.getElementById('fileInput').click();
        }

        // ==================== FILE UPLOAD HANDLER ====================
        let selectedUploadFile = null;

        function formatBytes(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }

        function clearFileSelection() {
            selectedUploadFile = null;
            document.getElementById('fileInput').value = '';
            document.getElementById('filePreviewBar').style.display = 'none';
            document.getElementById('fileUploadStatus').style.display = 'none';
        }

        function showFileStatus(message, type) {
            const el = document.getElementById('fileUploadStatus');
            el.textContent = message;
            el.style.display = 'block';
            if (type === 'success') {
                el.style.background = '#D5F4E6';
                el.style.color      = '#1a7a45';
                el.style.border     = '1px solid #a3e6c1';
            } else {
                el.style.background = '#FFEBEE';
                el.style.color      = '#c0392b';
                el.style.border     = '1px solid #f5b7b1';
            }
            if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 7000);
        }

        // Show preview bar when a file is chosen
        document.getElementById('fileInput')?.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // 5 MB guard
            if (file.size > 5 * 1024 * 1024) {
                showFileStatus('❌ File is too large. Maximum allowed size is 5 MB.', 'error');
                this.value = '';
                return;
            }

            selectedUploadFile = file;
            document.getElementById('selectedFileName').textContent = file.name;
            document.getElementById('selectedFileSize').textContent  = formatBytes(file.size);

            const bar = document.getElementById('filePreviewBar');
            bar.style.display = 'flex';   // reveal the bar
            document.getElementById('fileUploadStatus').style.display = 'none';
        });

        // Upload button click → send file via FormData to the server
        document.getElementById('uploadFileBtn')?.addEventListener('click', async function () {
            if (!selectedUploadFile) return;

            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Uploading…';

            try {
                const formData = new FormData();
                formData.append('passbook', selectedUploadFile);
                formData.append('userId',   currentUser ? currentUser.id   : '');
                formData.append('userName', currentUser ? currentUser.name : '');
                // Link to the last submitted receipt (if any)
                // Prefer re-upload target, then the last submitted receipt
                const linkedId = _reUploadReceiptId
                    || document.getElementById('linkedReceiptId')?.value
                    || window._lastReceiptId
                    || '';
                if (linkedId) formData.append('receiptId', linkedId);

                const response = await fetch('/api/upload-passbook', {
                    method: 'POST',
                    body: formData   // browser sets multipart boundary automatically
                });

                if (response.ok) {
                    const data = await response.json();
                    showFileStatus(`✅ "${data.fileName}" uploaded successfully!`, 'success');
                    clearFileSelection();
                    _reUploadReceiptId = null;   // reset re-upload target
                    // Refresh the receipts table to show updated passbook link
                    loadVolunteerPassbooks();
                } else {
                    const err = await response.json().catch(() => ({}));
                    showFileStatus('❌ Upload failed: ' + (err.message || response.statusText), 'error');
                }
            } catch (netErr) {
                showFileStatus('❌ Cannot reach the server. Make sure server.js is running on port 3000.', 'error');
                console.error('File upload error:', netErr);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-upload" style="margin-right:8px;"></i>Upload Now';
            }
        });

        // ==================== DONOR SEARCH & SYNC ====================
        // (showSection already handles donorSearch loading — no override needed)

        // Load live record count for hero banner on page load
        async function _loadHeroCount() {
            try {
                const res  = await fetch('/api/donations');
                if (!res.ok) return;
                const data = await res.json();
                const count = (data.records || []).length;
                const el    = document.getElementById('heroDonorCount');
                const badge = document.getElementById('sidebarDonorBadge');
                if (el) el.textContent = count > 0
                    ? `${count.toLocaleString('en-IN')} Records Available`
                    : 'No data uploaded yet';
                if (badge && count > 0) badge.style.display = '';
            } catch (_) { /* server offline — ignore */ }
        }
        _loadHeroCount();

        // BroadcastChannel: auto-refresh when admin uploads new data
        try {
            const _donBC = new BroadcastChannel('donations_update');
            _donBC.onmessage = function(e) {
                if (e.data && e.data.type === 'refresh') {
                    // Silently refresh donor data in background
                    if (typeof loadDonorSearch === 'function') loadDonorSearch();
                    // Update hero count badge
                    _loadHeroCount();
                    // Visual pulse on the banner to indicate new data
                    const banner = document.getElementById('donorHeroBanner');
                    if (banner) {
                        banner.style.boxShadow = '0 0 0 4px rgba(255,255,255,.6), 0 6px 28px rgba(26,35,126,.5)';
                        const countEl = document.getElementById('heroDonorCount');
                        if (countEl) countEl.textContent = `\u2705 ${(e.data.uploaded||0).toLocaleString('en-IN')} new records synced!`;
                        setTimeout(() => {
                            banner.style.boxShadow = '0 6px 28px rgba(26,35,126,.3)';
                            _loadHeroCount(); // restore real count
                        }, 4000);
                    }
                }
            };
        } catch (_) { /* BroadcastChannel not available */ }
        // ==================== PAUTI BOOK SLIP SUBMISSION ====================

        function pautiToggleCheck() {
            const mode = document.getElementById('psMode')?.value;
            const grp  = document.getElementById('psCheckGroup');
            if (grp) grp.style.display = mode === 'check' ? '' : 'none';
        }

        function _pautiStatus(msg, type) {
            const el = document.getElementById('pautiSlipStatus');
            if (!el) return;
            el.style.display    = '';
            el.style.background = type === 'success' ? '#E8F5E9' : '#FFEBEE';
            el.style.color      = type === 'success' ? '#1B5E20' : '#B71C1C';
            el.textContent      = msg;
        }

        document.getElementById('pautiSlipForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name   = document.getElementById('psName')?.value.trim();
            const amount = parseFloat(document.getElementById('psAmount')?.value || '');
            const mode   = document.getElementById('psMode')?.value || 'cash';
            const check  = document.getElementById('psCheck')?.value.trim() || null;

            if (!name)           { _pautiStatus('❌ Donor name is required.', 'error'); return; }
            if (!amount || amount <= 0) { _pautiStatus('❌ A valid positive amount is required.', 'error'); return; }

            const btn = document.getElementById('pautiSlipBtn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Submitting…'; }

            try {
                const res  = await fetch('/api/pauti-books/next-slip', {
                    method : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body   : JSON.stringify({
                        donorName       : name,
                        amount          : amount,
                        paymentMode     : mode,
                        checkNumber     : check,
                        uploadedBy      : currentUser?.name  || 'Unknown',
                        uploadedByUserId: currentUser?.id    || null,
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    // Hide form, show confirmation
                    document.getElementById('pautiSlipStatus').style.display = 'none';
                    document.getElementById('pautiSlipForm').reset();
                    pautiToggleCheck();
                    const confirm = document.getElementById('pautiSlipConfirm');
                    const numEl   = document.getElementById('pautiConfirmSlipNum');
                    const bookEl  = document.getElementById('pautiConfirmBook');
                    if (numEl)  numEl.textContent  = `Slip #${data.slipNumber}`;
                    if (bookEl) bookEl.textContent = `Book #${data.bookNumber} (Slips ${data.slipsFrom}–${data.slipsTo})`;
                    if (confirm) { confirm.style.display = ''; confirm.scrollIntoView({ behavior:'smooth', block:'center' }); }
                    // Auto-hide confirmation after 8s
                    setTimeout(() => { if (confirm) confirm.style.display = 'none'; }, 8000);
                    // Refresh my slips list
                    loadMyPautiSlips();
                } else {
                    _pautiStatus('❌ ' + (data.message || 'Could not claim slip. Try again.'), 'error');
                }
            } catch (err) {
                _pautiStatus('❌ Cannot reach server. Make sure server.js is running on port 3000.', 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit & Claim Slip'; }
            }
        });

        async function loadMyPautiSlips() {
            const tbody = document.getElementById('myPautiSlipsList');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;">Loading…</td></tr>';
            try {
                const res  = await fetch('/api/pauti-books');
                const data = await res.json();
                const myName   = (currentUser?.name  || '').toLowerCase();
                const myUserId = currentUser?.id || null;
                const mySlips  = [];
                (data.pautiBooks || []).forEach(book => {
                    (book.slips || []).forEach(slip => {
                        if (!slip.uploadedAt || slip.deleted) return;
                        const matchName = slip.uploadedBy && slip.uploadedBy.toLowerCase() === myName;
                        const matchId   = myUserId && slip.uploadedByUserId && String(slip.uploadedByUserId) === String(myUserId);
                        if (matchName || matchId) {
                            mySlips.push({ ...slip, bookNumber: book.bookNumber });
                        }
                    });
                });
                mySlips.sort((a, b) => b.slipNumber - a.slipNumber);
                if (mySlips.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;">No slips submitted by you yet.</td></tr>';
                    return;
                }
                const fmt = n => n ? '₹' + Number(n).toLocaleString('en-IN') : '—';
                tbody.innerHTML = mySlips.map((s, i) => {
                    const bg   = i % 2 === 0 ? '#fff' : '#f9fafe';
                    const date = s.uploadedAt
                        ? new Date(s.uploadedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
                        : '—';
                    const mode = s.paymentMode
                        ? `<span style="background:#EEF2FF;color:#3730A3;padding:2px 8px;border-radius:12px;font-size:.78rem;font-weight:600;">${s.paymentMode.toUpperCase()}</span>`
                        : '—';
                    return `<tr style="background:${bg};">
                        <td><strong style="color:var(--primary-color);">#${s.slipNumber}</strong></td>
                        <td>Book #${s.bookNumber}</td>
                        <td>${s.donorName || '—'}</td>
                        <td><strong style="color:#2E7D32;">${fmt(s.amount)}</strong></td>
                        <td>${mode}</td>
                        <td style="font-size:.85rem;color:#777;">${date}</td>
                    </tr>`;
                }).join('');
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;">⚠ Cannot reach server.</td></tr>';
            }
        }

        // ── Receipt photo file handler — auto-compresses to <1 MB ─────────
        let _deReceiptPhotoFile = null;
        document.getElementById('deReceiptPhotoInput')?.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { alert('Please select a JPG or PNG image.'); this.value = ''; return; }
            _deReceiptPhotoFile = null;
            _compressImage(file, 950, function(blob) {
                if (!blob) { alert('Could not process image.'); return; }
                _deReceiptPhotoFile = blob;
                const thumb = document.getElementById('deReceiptPhotoThumb');
                const name  = document.getElementById('deReceiptPhotoName');
                const prev  = document.getElementById('deReceiptPhotoPreview');
                // Revoke previous object URL to prevent memory leak
                if (thumb && thumb.src && thumb.src.startsWith('blob:')) URL.revokeObjectURL(thumb.src);
                if (thumb) thumb.src = URL.createObjectURL(blob);
                if (name)  name.textContent = '\u2705 ' + file.name.replace(/\.[^.]+$/, '') + '.jpg (' +
                    (blob.size < 1048576 ? (blob.size/1024).toFixed(1) + ' KB' : (blob.size/1048576).toFixed(2) + ' MB') +
                    (file.size > blob.size ? ', compressed' : '') + ')';
                if (prev)  prev.style.display = 'flex';
            });
        });
        function deClearReceiptPhoto() {
            _deReceiptPhotoFile = null;
            const inp = document.getElementById('deReceiptPhotoInput');
            if (inp) inp.value = '';
            const prev = document.getElementById('deReceiptPhotoPreview');
            if (prev) prev.style.display = 'none';
            const thumb = document.getElementById('deReceiptPhotoThumb');
            if (thumb && thumb.src && thumb.src.startsWith('blob:')) URL.revokeObjectURL(thumb.src);
            if (thumb) thumb.src = '';
        }

    



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
    const _KW_ADDR  = /road|area|street|ward|locality|location|address|addr|nagar|galli|lane|plot|flat|house|sector/i;
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
                            <span style="background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;border-radius:20px;padding:2px 12px;font-size:.76rem;font-weight:700;letter-spacing:.04em;">
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

    // ── Book dropdown (Books 1–50) ──────────────────────────
    function dePopulateBooks() {
        const sel = document.getElementById('deBookNumber');
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select Book —</option>';
        for (let b = 1; b <= 50; b++) {
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
        try {
            const r = await fetch(`/api/donation-entries/used-receipts/${bn}`);
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
        const activeStyle = 'display:flex;align-items:center;gap:6px;padding:7px 18px;border:2px solid var(--primary-color);border-radius:20px;cursor:pointer;font-weight:600;font-size:.82rem;background:var(--primary-color);color:#fff;transition:all .2s;';
        const inactiveStyle = 'display:flex;align-items:center;gap:6px;padding:7px 18px;border:2px solid #ddd;border-radius:20px;cursor:pointer;font-weight:600;font-size:.82rem;background:#f9f9f9;color:#555;transition:all .2s;';
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

    // ── Load buildings & areas dropdowns ────────────────────
    async function deLoadDropdowns() {
        await deLoadBuildings();
        await deLoadAreas();
        // Show Add buttons only for admin
        const isAdmin = currentUser && currentUser.role === 'admin';
        const bBtn = document.getElementById('deAddBldgBtn');
        const aBtn = document.getElementById('deAddAreaBtn');
        if (bBtn) bBtn.style.display = isAdmin ? '' : 'none';
        if (aBtn) aBtn.style.display = isAdmin ? '' : 'none';
        dePopulateBooks();
    }

    async function deLoadBuildings() {
        try {
            const r = await fetch('/api/buildings');
            const d = await r.json();
            const sel = document.getElementById('deBuildingName');
            if (!sel) return;
            const cur = sel.value;
            sel.innerHTML = '<option value="">— Select Building —</option>';
            (d.buildings || []).forEach(b => {
                sel.innerHTML += `<option value="${b.name}" ${b.name===cur?'selected':''}>${b.name}</option>`;
            });
        } catch(e) {}
    }

    async function deLoadAreas() {
        const FIXED_AREAS = ['Patelwadi', 'Shindewadi', 'Gurkhawadi'];
        const sel = document.getElementById('deArea');
        if (!sel) return;
        const cur = sel.value;
        // Always start with the 3 fixed areas
        sel.innerHTML = '<option value="">\u2014 Select Area \u2014</option>' +
            FIXED_AREAS.map(n => `<option value="${n}" ${n===cur?'selected':''}>${n}</option>`).join('');
        // Then append any extra ones from the API (skip duplicates)
        try {
            const r = await fetch('/api/areas');
            const d = await r.json();
            (d.areas || []).forEach(a => {
                if (!FIXED_AREAS.includes(a.name)) {
                    sel.innerHTML += `<option value="${a.name}" ${a.name===cur?'selected':''}>${a.name}</option>`;
                }
            });
        } catch(e) { /* API unreachable — fixed areas still shown */ }
    }

    async function deAddBuilding() {
        const name = prompt('Enter new Building Name:');
        if (!name || !name.trim()) return;
        try {
            const r = await fetch('/api/buildings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:name.trim() }) });
            const d = await r.json();
            if (r.ok && d.success) { await deLoadBuildings(); document.getElementById('deBuildingName').value = d.building.name; }
            else alert(d.message || 'Could not add building.');
        } catch(e) { alert('Server error.'); }
    }

    async function deAddArea() {
        const name = prompt('Enter new Area Name:');
        if (!name || !name.trim()) return;
        try {
            const r = await fetch('/api/areas', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:name.trim() }) });
            const d = await r.json();
            if (r.ok && d.success) { await deLoadAreas(); document.getElementById('deArea').value = d.area.name; }
            else alert(d.message || 'Could not add area.');
        } catch(e) { alert('Server error.'); }
    }

    // ── Form submit ──────────────────────────────────────────
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

            const pMode = getVal('dePaymentMode') || 'Cash';
            const refNum = getTrim('deReference');
            if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
            if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

            payload = {
                bookNumber      : Number(getVal('deBookNumber')),
                receiptNumber   : Number(getVal('deReceiptNumber')),
                donorType,
                firstName       : donorType === 'Individual' ? getTrim('deFirstName').toUpperCase()    : null,
                middleName      : donorType === 'Individual' ? getTrim('deMiddleName').toUpperCase()   : null,
                lastName        : donorType === 'Individual' ? getTrim('deLastName').toUpperCase()     : null,
                businessName    : donorType === 'Business'   ? getTrim('deBusinessName').toUpperCase(): null,
                whatsappNumber  : getTrim('deWhatsapp')  || null,
                mobileNumber    : getTrim('deMobile')    || null,
                mailId          : getTrim('deMail')      || null,
                buildingName    : getVal('deBuildingName') || null,
                area            : getVal('deArea')         || null,
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
                this.reset();
                deSetDonorType('Individual');
                deSetMode('Cash');
                const rSel = document.getElementById('deReceiptNumber');
                if (rSel) { rSel.innerHTML = '<option value="">\u2014 Select Book first \u2014</option>'; rSel.disabled = true; }
                await deLoadMyEntries();
            } else {
                deShowStatus('\u274c ' + (data.message || 'Submission failed.'), 'error');
            }
        } catch(err) {
            console.error('[DE Form] Fetch/network error:', err);
            deShowStatus('\u274c Network error: ' + (err.message || 'Cannot reach server. Make sure server.js is running.'), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry'; }
        }
    });

    function deShowStatus(msg, type) {
        const el = document.getElementById('deStatus');
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
        el.style.background = type === 'success' ? '#D5F4E6' : '#FFEBEE';
        el.style.color      = type === 'success' ? '#1a7a45' : '#c0392b';
        el.style.border     = type === 'success' ? '1px solid #a3e6c1' : '1px solid #f5b7b1';
        setTimeout(() => el.style.display = 'none', 6000);
    }

    // ── Load landmarks into volunteer form ───────────────────────────────────
    async function deLoadLandmarks() {
        try {
            const r = await fetch('/api/landmarks'); const data = await r.json();
            const sel = document.getElementById('deLandmark'); if (!sel) return;
            const cur = sel.value;
            // Keep first option
            while (sel.options.length > 1) sel.remove(1);
            (data.landmarks||[]).forEach(l => {
                const o = document.createElement('option');
                o.value = l.name; o.textContent = l.name;
                if (l.name === cur) o.selected = true;
                sel.appendChild(o);
            });
        } catch(e) {}
    }

    // ── Auto-receipt for volunteer form ──────────────────────────────────────
    async function deAutoReceipt() {
        try {
            const resp = await fetch('/api/donation-entries/next-receipt');
            const slot = await resp.json();
            if (!slot.bookNumber) { alert('❌ All receipt numbers are used.'); return; }
            const bookSel = document.getElementById('deBookNumber');
            if (bookSel) { bookSel.value = slot.bookNumber; bookSel.dispatchEvent(new Event('change')); }
            let attempts = 0;
            const waitAndSet = setInterval(function() {
                attempts++;
                const rs = document.getElementById('deReceiptNumber');
                if (!rs) { clearInterval(waitAndSet); return; }
                if (!rs.disabled && rs.options.length > 1) {
                    rs.value = slot.receiptNumber;
                    clearInterval(waitAndSet);
                    const st = document.getElementById('deStatus') || document.getElementById('deEntryStatus');
                    if (st) { st.style.display=''; st.textContent='✅ Auto: Book '+slot.bookNumber+', Receipt #'+slot.receiptNumber; st.style.background='#D5F4E6'; st.style.color='#1a7a45'; setTimeout(()=>st.style.display='none',4000); }
                }
                if (attempts > 40) clearInterval(waitAndSet);
            }, 100);
        } catch(e) { alert('❌ Auto-receipt error: ' + e.message); }
    }

    // Load landmarks when the Donation Data Entry section first loads
    document.addEventListener('DOMContentLoaded', function() {
        deLoadLandmarks();
        // Also reload when section becomes visible
        const observer = new MutationObserver(function(muts) {
            muts.forEach(function(m) {
                if (m.type === 'attributes' && m.attributeName === 'style') {
                    const sec = document.getElementById('donationEntry');
                    if (sec && sec.style.display !== 'none') deLoadLandmarks();
                }
            });
        });
        const sec = document.getElementById('donationEntry');
        if (sec) observer.observe(sec, { attributes: true });
    });

    // Also add landmark to the submission payload (hook into the form submit)
    // Patch the payload builder to include landmark
    const _origDeForm = document.getElementById('donationEntryForm');
    if (_origDeForm) {
        const _origSubmit = _origDeForm.onsubmit;
        // The landmark field is already in the form; the existing payload builder
        // must include it. Patch: override getVal for deLandmark in payload
    }

    // ── My entries table ─────────────────────────────────────────
    async function deLoadMyEntries() {
        const tbody = document.getElementById('deMyEntriesTbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;">Loading…</td></tr>';
        try {
            const uid = currentUser ? currentUser.id : null;
            const url = uid && currentUser.role !== 'admin' ? `/api/donation-entries?userId=${uid}` : '/api/donation-entries';
            const res = await fetch(url);
            const data = await res.json();
            const entries = data.entries || [];
            if (!entries.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;">No entries yet.</td></tr>'; return; }
            tbody.innerHTML = entries.slice().reverse().map(e => {
                const donor = e.donorType === 'Business' ? (e.businessName||'—') : [e.firstName,e.middleName,e.lastName].filter(Boolean).join(' ') || '—';
                const dtObj  = new Date(e.submittedAt);
                const dtTime = dtObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
                const dtDate = dtObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                const dt    = `<span style="font-size:.78rem;white-space:nowrap;">${dtTime}<br><span style="color:#aaa;">${dtDate}</span></span>`;
                const amt   = e.amount != null ? '₹' + Number(e.amount).toLocaleString('en-IN') : '—';
                const photoCell = e.photoUrl
                    ? `<img src="${fixUrl(e.photoUrl)}?t=${Date.now()}" alt="Receipt" loading="lazy" decoding="async" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;vertical-align:middle;" onclick="openPbLightbox('${fixUrl(e.photoUrl)}')" title="Click to enlarge">`
                    : '<span style="color:#ccc;font-size:.8rem;">—</span>';
                return `<tr id="de-vol-row-${e.entryId}">
                    <td style="font-weight:700;">Bk ${e.bookNumber}</td>
                    <td>#${e.receiptNumber}</td>
                    <td>${donor}</td>
                    <td>${e.area||'—'}</td>
                    <td style="color:#2E7D32;font-weight:600;">${amt}</td>
                    <td><span style="padding:3px 10px;border-radius:12px;background:#E3F2FD;color:#1565C0;font-size:.78rem;font-weight:700;">${e.paymentMode}</span></td>
                    <td style="text-align:center;">${photoCell}</td>
                    <td style="color:#888;font-size:.78rem;">${dt}</td>
                    <td><button onclick="deOpenVolEdit('${e.entryId}')" style="padding:6px 12px;border:none;border-radius:7px;background:linear-gradient(135deg,var(--primary-color),#ff8c42);color:#fff;cursor:pointer;font-size:.8rem;font-weight:700;"><i class="fas fa-edit"></i></button></td>
                </tr>`;
            }).join('');
        // ── Also populate mobile cards ─────────────────────────────────────────
        const cardsEl = document.getElementById('deMyEntriesCards');
        if (cardsEl) {
            if (!entries.length) {
                cardsEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No entries yet.</p>';
            } else {
                cardsEl.innerHTML = entries.slice().reverse().map(e => {
                    const donor = e.donorType === 'Business' ? (e.businessName||'—') : [e.firstName,e.middleName,e.lastName].filter(Boolean).join(' ') || '—';
                    const amt   = e.amount != null ? '₹' + Number(e.amount).toLocaleString('en-IN') : '—';
                    const dtObj = new Date(e.submittedAt);
                    const dtStr = dtObj.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase()
                                + '\n' + dtObj.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
                    const dtParts = dtStr.split('\n');
                    const photoSection = e.photoUrl
                        ? `<div style="margin-top:10px;border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="openPbLightbox('${fixUrl(e.photoUrl)}')">
                               <img src="${fixUrl(e.photoUrl)}?t=${Date.now()}" loading="lazy" alt="Receipt photo"
                                   style="width:100%;max-height:200px;object-fit:cover;display:block;">
                               <div style="background:#fff8f5;padding:5px 10px;font-size:.72rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;">
                                   <i class="fas fa-expand-alt"></i> Tap to view full receipt
                               </div>
                           </div>`
                        : `<div style="margin-top:10px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:14px;text-align:center;background:#fffaf8;">
                               <i class="fas fa-camera" style="font-size:1.4rem;color:#ddd;display:block;margin-bottom:6px;"></i>
                               <span style="font-size:.75rem;color:#ccc;font-weight:600;">No Receipt Photo</span>
                           </div>`;
                    return `<div style="border:1px solid #f0e8e0;border-radius:14px;padding:14px;margin:0 0 12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.06);">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;font-size:.97rem;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${donor}</div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center;">
                                    <span style="background:#F3E5F5;color:#6A1B9A;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;">
                                        <i class="fas fa-book" style="font-size:.65rem;margin-right:3px;"></i>Bk ${e.bookNumber} / #${e.receiptNumber}
                                    </span>
                                    <span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;">
                                        <i class="fas fa-map-marker-alt" style="font-size:.65rem;margin-right:3px;"></i>${e.area||'—'}
                                    </span>
                                    <span style="background:#FFF3E0;color:#E65100;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700;">${e.paymentMode}</span>
                                </div>
                                <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                                    <span style="color:#2E7D32;font-weight:700;font-size:1.05rem;">${amt}</span>
                                    <span style="font-size:.72rem;color:#aaa;text-align:right;">${dtParts[0]}<br><span style="color:#bbb;">${dtParts[1]}</span></span>
                                </div>
                            </div>
                            <button onclick="deOpenVolEdit('${e.entryId}')" style="padding:8px 12px;border:none;border-radius:8px;background:linear-gradient(135deg,var(--primary-color),#ff8c42);color:#fff;cursor:pointer;font-size:.8rem;font-weight:700;flex-shrink:0;margin-left:4px;"><i class="fas fa-edit"></i></button>
                        </div>
                        ${photoSection}
                    </div>`;
                }).join('');
            }
        }
        } catch(err) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#c00;">Error loading entries.</td></tr>'; }
    }

    // ── Volunteer Edit Modal ────────────────────────────────
    let _deVolEditBlob = null;

    function deOpenVolEdit(id) {
        fetch('/api/donation-entries').then(r => r.json()).then(data => {
            const e = (data.entries || []).find(x => x.entryId === id);
            if (!e) return;
            _deVolEditBlob = null;
            document.getElementById('deVolEditId').value     = id;
            document.getElementById('deVolEditAmount').value = e.amount != null ? e.amount : '';
            // Store original amount to detect changes later
            document.getElementById('deVolEditAmount').dataset.original = e.amount != null ? e.amount : '';
            document.getElementById('deVolEditMode').value   = e.paymentMode || 'Cash';
            
            const statusField = document.getElementById('deVolEditStatusField');
            if (statusField) {
                statusField.value = e.status || (e.paymentMode === 'Balance' ? 'Balance' : 'Received');
                // Change style based on status
                statusField.style.background = statusField.value === 'Received' ? '#E8F5E9' : '#FFF3E0';
                statusField.style.color = statusField.value === 'Received' ? '#1B5E20' : '#E65100';
                
                statusField.onchange = function() {
                    this.style.background = this.value === 'Received' ? '#E8F5E9' : '#FFF3E0';
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
            const areaSel = document.getElementById('deVolEditArea');
            areaSel.innerHTML = '<option value="">— Select Area —</option>' +
                FIXED.map(n => `<option value="${n}" ${n===e.area?'selected':''}>${n}</option>`).join('');
            fetch('/api/areas').then(r2 => r2.json()).then(ad => {
                (ad.areas||[]).forEach(a => {
                    if (!FIXED.includes(a.name))
                        areaSel.innerHTML += `<option value="${a.name}" ${a.name===e.area?'selected':''}>${a.name}</option>`;
                });
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
            const r = await fetch(`/api/donation-entries/used-receipts/${bookNum}`);
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
            area          : document.getElementById('deVolEditArea').value || undefined,
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

    

    async function deShowCommitteeMembers() {
        const sec = document.getElementById('committeeViewSection');
        if (!sec) return;
        sec.innerHTML = '<div style="text-align:center;color:#aaa;padding:40px;">Loading…</div>';
        try {
            const r = await fetch('/api/committee-members'); const data = await r.json();
            const members = data.members || [];
            if (!members.length) { sec.innerHTML = '<div style="text-align:center;color:#aaa;padding:40px;">No committee members found.</div>'; return; }
            sec.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">' +
                members.map(m => `<div style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;text-align:center;">
                ${m.photoUrl?'<img src="${fixUrl(m.photoUrl)}" style="width:100%;height:150px;object-fit:cover;">':'<div style=\"width:100%;height:150px;background:linear-gradient(135deg,var(--primary-color),#ff8c42);display:flex;align-items:center;justify-content:center;\"><i class=\"fas fa-user\" style=\"font-size:3rem;color:#fff;opacity:.5;\"></i></div>'}
                <div style="padding:12px 10px 14px;">
                    <div style="font-weight:700;">${m.name}</div>
                    <div style="font-size:.82rem;color:var(--primary-color);font-weight:600;">${m.role||m.department||'Member'}</div>
                    ${m.phone?'<div style=\"font-size:.78rem;color:#666;\"><i class=\"fas fa-phone\" style=\"margin-right:3px;\"></i>'+m.phone+'</div>':''}
                </div></div>`).join('') + '</div>';
        } catch(e) { sec.innerHTML = '<div style=\"text-align:center;color:#c00;padding:40px;\">⚠ Cannot load.</div>'; }
    }
    

        document.addEventListener('DOMContentLoaded', () => {
            if (typeof loadDonationTrackingCards === 'function') loadDonationTrackingCards(); // Initial fetch
            const evtSource = new EventSource('/api/live-updates');
            evtSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'donations_updated') {
                        if (typeof loadDonationTrackingCards === 'function') {
                            loadDonationTrackingCards();
                        }
                        
                        
                        // Refresh volunteer data if function exists
                        if (typeof loadRecentEntries === 'function') loadRecentEntries();
                        
                    }
                } catch (e) {
                    console.error('SSE Error:', e);
                }
            };
            evtSource.onerror = function() {
                console.log('SSE connection lost, reconnecting...');
            };
        });
    

// ==================== DONATION TRACKING LIVE CARDS ====================
async function loadDonationTrackingCards() {
    try {
        const res = await fetch('/api/donation-entries');
        const data = await res.json();
        const allSlips = data.entries || [];

        const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
        const withAmt = allSlips.filter(s => getStatus(s) === 'received');
        const withoutAmt = allSlips.filter(s => getStatus(s) !== 'received' && (getStatus(s) === 'balance' || String(s.paymentMode).toLowerCase() === 'balance'));

        const totalRec = withAmt.reduce((sum, s) => sum + Number(s.amount || 0), 0);
        const totalPend = withoutAmt.reduce((sum, s) => sum + Number(s.amount || 0), 0);

        const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
        const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

        setEl('dtTotalReceived', fmt(totalRec));
        setEl('dtReceivedCount', `${withAmt.length} slip${withAmt.length !== 1 ? 's' : ''} received`);
        setEl('dtTotalPending',  fmt(totalPend));
        setEl('dtPendingCount',  `${withoutAmt.length} slip${withoutAmt.length !== 1 ? 's' : ''} pending`);
        setEl('dtTotalSlips',    `${allSlips.length} / 2500`);

        if (allSlips.length > 0) {
            const receipts = allSlips.map(s => Number(s.receiptNumber)).filter(n => !isNaN(n));
            if (receipts.length > 0) {
                const min = Math.min(...receipts);
                const max = Math.max(...receipts);
                setEl('dtSlipRange', `Receipt #${min} – #${max}`);
            } else {
                setEl('dtSlipRange', '');
            }
        } else {
            setEl('dtSlipRange', '');
        }
    } catch (e) {
        console.warn('Could not load donation tracking cards:', e.message);
    }
}

// Stub out navToBalanceRecovery for volunteer dashboard
function navToBalanceRecovery(type) {
    console.log('Balance recovery view not available in volunteer panel.');
}


        function googleTranslateElementInit() {
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,mr',
                autoDisplay: false
            }, 'google_translate_element');
        }
        // Force hide the banner asynchronously just in case CSS fails
        setInterval(function() {
            var frames = document.getElementsByClassName('goog-te-banner-frame');
            for(var i=0; i<frames.length; i++) { frames[i].style.display = 'none'; frames[i].style.visibility = 'hidden'; }
            if (document.body && document.body.style.top !== '0px') document.body.style.top = '0px';
            if (document.documentElement && document.documentElement.style.marginTop !== '0px') document.documentElement.style.marginTop = '0px';
        }, 300);
        function toggleLanguage() {
            const isMar = document.getElementById('langMar').classList.contains('active');
            const targetLang = isMar ? 'en' : 'mr';
            
            if(isMar) {
                document.getElementById('langMar').classList.remove('active');
                document.getElementById('langEng').classList.add('active');
            } else {
                document.getElementById('langEng').classList.remove('active');
                document.getElementById('langMar').classList.add('active');
            }
            
            const select = document.querySelector('.goog-te-combo');
            if (select) {
                select.value = targetLang;
                select.dispatchEvent(new Event('change'));
            }
        }
    
