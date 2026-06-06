document.addEventListener('DOMContentLoaded', function() {
  injectDESection();
  var s = document.getElementById('donationEntries');
  if (!s) return;
  var target = document.getElementById('donationEntriesStatic');
  if (target) target.replaceWith(s);
});
    // Inject the section HTML on DOM ready
    (function injectDESection() {
        const section = document.createElement('div');
        section.id = 'donationEntries';
        section.className = 'content-section';
        section.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:22px;">
            <div>
                <h2 style="color:var(--dark-color);margin:0 0 4px;">Donation Data Entry</h2>
                <p style="color:#777;margin:0;">All donation receipt entries — full CRUD control</p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button onclick="adeBuildingModal()" class="btn btn-small" style="background:#3949AB;color:#fff;"><i class="fas fa-building" style="margin-right:6px;"></i>Manage Buildings</button>
                <button onclick="adeLandmarkModal()" class="btn btn-small" style="background:#F59E0B;color:#fff;"><i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>Manage Landmarks</button>
                <button onclick="adeLandmarkModal()" class="btn btn-small" style="background:#6A1B9A;color:#fff;"><i class="fas fa-flag" style="margin-right:6px;"></i>Manage Landmarks</button>
                <button onclick="adeToggleForm()" class="btn btn-small" style="background:var(--primary-color);color:#fff;"><i class="fas fa-plus" style="margin-right:6px;"></i>Record Donation</button>
                <div style="display:inline-flex;gap:10px;">
                    <button onclick="adeExportExcel('en')" class="btn btn-small" style="background:#1D6F42;color:#fff;"><i class="fas fa-file-excel" style="margin-right:6px;"></i>Export (EN)</button>
                    <button onclick="adeExportExcel('mr')" class="btn btn-small" style="background:#27ae60;color:#fff;"><i class="fas fa-language" style="margin-right:6px;"></i>Export (MR)</button>
                </div>
                <button onclick="adeLoad()" class="btn btn-small" style="background:var(--light-color);color:#555;"><i class="fas fa-sync-alt"></i></button>
            </div>
        </div>

        <!-- Status -->
        <div id="adeStatus" style="display:none;padding:12px 18px;border-radius:10px;margin-bottom:16px;font-weight:600;"></div>

        <!-- Collapsible donation form card -->
        <div id="adeFormCard" class="admin-card" style="display:none;padding:24px;margin-bottom:18px;border:1.5px solid var(--primary-color);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:1.5px solid #eee;padding-bottom:10px;">
                <h3 style="margin:0;color:var(--dark-color);"><i class="fas fa-file-invoice-dollar" style="color:var(--primary-color);margin-right:8px;"></i>Record New Donation Receipt</h3>
                <button onclick="adeToggleForm()" class="btn btn-small" style="background:#eee;color:#555;"><i class="fas fa-times"></i> Close</button>
            </div>
            <form id="adeEntryForm" novalidate autocomplete="off">
                <!-- ── Section A: Receipt Details ── -->
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
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                    <div class="form-group" style="margin:0;">
                        <label for="adeBookNumber">Book Number <span style="color:red;">*</span> <button type="button" onclick="adeAutoReceipt()" style="margin-left:6px;padding:2px 9px;border:none;border-radius:8px;background:#E8F5E9;color:#1B5E20;font-size:.72rem;font-weight:700;cursor:pointer;"><i class="fas fa-magic"></i> Auto</button></label>
                        <select id="adeBookNumber" class="form-control" onchange="adeOnBookChange()"></select>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label for="adeReceiptNumber">Receipt Number <span style="color:red;">*</span></label>
                        <select id="adeReceiptNumber" class="form-control" disabled>
                            <option value="">— Select Book first —</option>
                        </select>
                    </div>
                </div>

                <!-- ── Section B: Donor Type ── -->
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                    <i class="fas fa-user-circle" style="margin-right:6px;"></i>Donor Type
                </div>
                <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
                    <label id="adeBtnInd" onclick="adeSetDonorType('Individual')" style="display:flex;align-items:center;gap:6px;padding:7px 18px;border:2px solid var(--primary-color);border-radius:16px;cursor:pointer;font-weight:600;font-size:.82rem;background:var(--primary-color);color:#fff;transition:all .2s;">
                        <i class="fas fa-user" style="font-size:.78rem;"></i> Individual
                    </label>
                    <label id="adeBtnBiz" onclick="adeSetDonorType('Business')" style="display:flex;align-items:center;gap:6px;padding:7px 18px;border:2px solid #ddd;border-radius:16px;cursor:pointer;font-weight:600;font-size:.82rem;background:#f9f9f9;color:#555;transition:all .2s;">
                        <i class="fas fa-building" style="font-size:.78rem;"></i> Business
                    </label>
                </div>
                <input type="hidden" id="adeDonorType" value="Individual">

                <!-- Individual name fields -->
                <div id="adeIndFields" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px;">
                    <div class="form-group" style="margin:0;">
                        <label for="adeFirstName">First Name <span style="color:red;">*</span></label>
                        <input type="text" id="adeFirstName" class="form-control" placeholder="FIRST" oninput="this.value=this.value.toUpperCase()" required>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label for="adeMiddleName">Middle Name <span style="color:red;">*</span></label>
                        <input type="text" id="adeMiddleName" class="form-control" placeholder="MIDDLE" oninput="this.value=this.value.toUpperCase()" required>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label for="adeLastName">Last Name <span style="color:red;">*</span></label>
                        <input type="text" id="adeLastName" class="form-control" placeholder="LAST" oninput="this.value=this.value.toUpperCase()" required>
                    </div>
                </div>

                <!-- Business name field -->
                <div id="adeBizFields" style="display:none;margin-bottom:20px;">
                    <div class="form-group" style="margin:0;">
                        <label for="adeBusinessName">Business Name <span style="color:red;">*</span></label>
                        <input type="text" id="adeBusinessName" class="form-control" placeholder="BUSINESS NAME" oninput="this.value=this.value.toUpperCase()">
                    </div>
                </div>

                <!-- ── Section C: Contact ── -->
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                    <i class="fas fa-address-book" style="margin-right:6px;"></i>Contact Information
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px;">
                    <div class="form-group" style="margin:0;">
                        <label for="adeWhatsapp"><i class="fab fa-whatsapp" style="color:#25D366;"></i> WhatsApp Number</label>
                        <input type="tel" id="adeWhatsapp" class="form-control" placeholder="10-digit number" maxlength="10" pattern="[0-9]{10}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label for="adeMobile"><i class="fas fa-mobile-alt" style="color:#3949AB;"></i> Mobile Number</label>
                        <input type="tel" id="adeMobile" class="form-control" placeholder="10-digit number" maxlength="10" pattern="[0-9]{10}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label for="adeMail"><i class="fas fa-envelope" style="color:#E67E22;"></i> Mail ID</label>
                        <input type="email" id="adeMail" class="form-control" placeholder="email@example.com">
                    </div>
                </div>

                <!-- ── Section D: Landmark ── -->
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                    <i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>Landmark
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
                    <div class="form-group" style="margin:0;">
                        <label for="adeBuildingNameSelect">Building Name</label>
                        <div style="display:flex;gap:8px;">
                            <select id="adeBuildingNameSelect" class="form-control" style="flex:1;" onchange="document.getElementById('adeFlatNumberGroup').style.display = this.value ? 'block' : 'none';"></select>
                            <button type="button" onclick="adeAddBuildingPrompt()" style="padding:0 14px;border:none;border-radius:8px;background:var(--primary-color);color:#fff;cursor:pointer;font-size:.85rem;white-space:nowrap;">＋ Add</button>
                        </div>
                    </div>
                    <div class="form-group" id="adeFlatNumberGroup" style="margin:0; display:none;">
                        <label for="adeFlatNumber">Enter Flat Number</label>
                        <input type="text" id="adeFlatNumber" class="form-control" placeholder="Flat No.">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label for="adeLandmarkSelect">Landmark</label>
                        <div style="display:flex;gap:8px;">
                            <select id="adeLandmarkSelect" class="form-control" style="flex:1;" onchange="adeOnLandmarkChange()"></select>
                            <button type="button" onclick="adeLandmarkModal()" style="padding:0 14px;border:none;border-radius:8px;background:var(--primary-color);color:#fff;cursor:pointer;font-size:.85rem;white-space:nowrap;">Manage Landmarks</button>
                        </div>
                    </div>
                    <div class="form-group" id="adeAreaGroup" style="margin:0;display:none;">
                        <label for="adeAreaSelect">Area</label>
                        <div style="display:flex;gap:8px;">
                            <select id="adeAreaSelect" class="form-control" style="flex:1;">
                                <option value="">— Select Area —</option>
                            </select>
                        </div>
                    </div>

                </div>

                <!-- ── Section E: Payment ── -->
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;">
                    <i class="fas fa-rupee-sign" style="margin-right:6px;"></i>Amount &amp; Payment
                </div>
                <div class="form-group">
                    <label for="adeAmount">Donation Amount (₹)</label>
                    <input type="number" id="adeAmount" class="form-control" placeholder="Enter amount" min="0">
                </div>
                <div class="form-group">
                    <label>Payment Mode <span style="color:red;">*</span></label>
                    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
                        <label class="de-mode-btn active" id="adeModeCash" onclick="adeSetMode('Cash')" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:2px solid var(--primary-color);border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:var(--primary-color);color:#fff;transition:all .2s;">
                            <i class="fas fa-money-bill-wave" style="font-size:1.2rem;"></i>Cash
                        </label>
                        <label class="de-mode-btn" id="adeModeChq" onclick="adeSetMode('Cheque')" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:2px solid #ddd;border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:#f9f9f9;color:#555;transition:all .2s;">
                            <i class="fas fa-file-alt" style="font-size:1.2rem;"></i>Cheque
                        </label>
                        <label class="de-mode-btn" id="adeModeUPI" onclick="adeSetMode('UPI')" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:2px solid #ddd;border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:#f9f9f9;color:#555;transition:all .2s;">
                            <i class="fas fa-qrcode" style="font-size:1.2rem;"></i>UPI
                        </label>
                        <label class="de-mode-btn" id="adeModeRTGS" onclick="adeSetMode('RTGS')" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:2px solid #ddd;border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:#f9f9f9;color:#555;transition:all .2s;">
                            <i class="fas fa-university" style="font-size:1.2rem;"></i>RTGS
                        </label>
                        <label class="de-mode-btn" id="adeModeBal" onclick="adeSetMode('Balance')" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:2px solid #ddd;border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:#f9f9f9;color:#555;transition:all .2s;">
                            <i class="fas fa-hand-holding-usd" style="font-size:1.2rem;"></i>Balance
                        </label>
                    </div>
                </div>
                <input type="hidden" id="adePaymentMode" value="Cash">
                <div class="form-group" id="adeRefGroup">
                    <label for="adeReference" id="adeRefLabel">Reference Number <span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span></label>
                    <input type="text" id="adeReference" class="form-control" placeholder="Reference / Transaction / Cheque number">
                </div>

                <!-- ── Section F: Passbook Document Upload ── -->
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary-color);border-bottom:2px dashed #ffe0d0;padding-bottom:6px;margin-bottom:16px;margin-top:8px;">
                    <i class="fas fa-camera" style="margin-right:6px;"></i>Passbook Document
                </div>
                <div class="card" style="margin-bottom:16px;box-shadow:none;border:1.5px solid #ffe0d0;padding:18px;">
                    <div id="apbDocStatus" style="display:none;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-weight:500;"></div>
                    <div id="apbUploadContainer" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
                        <button type="button" id="apbCameraBtn"
                            onclick="document.getElementById('apbDocCamera').click()"
                            style="flex:1;min-width:140px;padding:14px;border:2px dashed var(--primary-color);border-radius:12px;background:#fff8f5;color:var(--primary-color);font-size:.92rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                            <i class="fas fa-camera" style="font-size:1.3rem;"></i> Take Photo / Select Image
                        </button>
                    </div>
                    <input type="file" id="apbDocCamera" style="display:none;" accept="image/*">
                    <input type="file" id="apbDocCameraCapture" style="display:none;" accept="image/*" capture="environment">
                    <div id="apbCompressStatus" style="display:none;font-size:.82rem;color:#888;margin-bottom:10px;">
                        <i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Compressing image…
                    </div>
                    <div id="apbDocPreview" style="display:none;margin-bottom:14px;">
                        <img id="apbDocThumb" src="" alt="Receipt preview" style="max-width:100%;max-height:220px;border-radius:10px;border:1.5px solid #e0e0e0;object-fit:contain;">
                        <div style="display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;">
                            <span id="apbDocFileName" style="font-size:.83rem;color:#555;flex:1;"></span>
                            <span id="apbDocFileSize" style="font-size:.78rem;color:#27ae60;font-weight:600;"></span>
                            <button type="button" onclick="apbClearDoc()" style="background:none;border:none;color:#E74C3C;cursor:pointer;font-size:.85rem;"><i class="fas fa-times"></i> Remove</button>
                        </div>
                    </div>
                    <p style="font-size:.78rem;color:#aaa;margin:0;"><i class="fas fa-info-circle" style="margin-right:4px;"></i>Image is automatically compressed to under 1 MB.</p>
                </div>

                <button type="submit" id="adeSubmitBtn" class="btn btn-primary" style="width:100%;max-width:360px;display:block;padding:14px 30px;font-size:1rem;border-radius:10px;margin-top:8px;">
                    <i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry
                </button>
            </form>
        </div>

        <!-- All Submitted Entries cards -->
        <div class="admin-card" style="padding:24px;margin-bottom:18px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #F0F0F0;">
                <h3 style="margin:0;color:var(--dark-color);font-size:1.2rem;"><i class="fas fa-list-ul" style="color:var(--primary-color);margin-right:8px;"></i>All Submitted Entries</h3>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span id="adeCardCount" style="font-size:.83rem;color:#888;"></span>
                    <input type="text" id="adeCardSearch" placeholder="🔍 Search donor, landmark…"
                        style="padding:7px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.85rem;width:180px;"
                        oninput="adeRenderCards()">
                    <button onclick="adeLoad()" class="btn btn-small" style="background:var(--light-color);color:#555;"><i class="fas fa-sync-alt"></i></button>
                </div>
            </div>
            <div id="adeCardGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">
                <div style="text-align:center;color:#aaa;padding:30px;grid-column:1/-1;">Loading…</div>
            </div>
        </div>

        <!-- Filters -->
        <div class="admin-card" style="padding:20px;margin-bottom:18px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:end;">
                <div>
                    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#555;display:block;margin-bottom:5px;">Search Name</label>
                    <input type="text" id="adeSearchName" class="form-control" placeholder="Donor / Business" oninput="adeFilter()" style="padding:9px 12px;">
                </div>
                <div>
                    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#555;display:block;margin-bottom:5px;">Book No.</label>
                    <input type="number" id="adeFilterBook" class="form-control" placeholder="1–50" min="1" max="50" oninput="adeFilter()" style="padding:9px 12px;">
                </div>
                <div>
                    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#555;display:block;margin-bottom:5px;">Landmark</label>
                    <select id="adeFilterLandmark" class="form-control" onchange="adeFilter()" style="padding:9px 12px;"><option value="">All Landmarks</option></select>
                </div>
                <div>
                    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#555;display:block;margin-bottom:5px;">Payment Mode</label>
                    <select id="adeFilterMode" class="form-control" onchange="adeFilter()" style="padding:9px 12px;">
                        <option value="">All Modes</option>
                        <option>Cash</option><option>Cheque</option><option>UPI</option><option>RTGS</option><option>Balance</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#555;display:block;margin-bottom:5px;">Donor Type</label>
                    <select id="adeFilterType" class="form-control" onchange="adeFilter()" style="padding:9px 12px;">
                        <option value="">All Types</option><option>Individual</option><option>Business</option>
                    </select>
                </div>
                <div style="display:flex;align-items:flex-end;">
                    <button onclick="adeClearFilters()" class="btn btn-small" style="background:#eee;color:#666;width:100%;padding:9px;">Clear Filters</button>
                </div>
            </div>
            <div style="margin-top:12px;display:flex;gap:12px;font-size:.85rem;color:#777;flex-wrap:wrap;">
                <span>Total: <strong id="adeSummaryTotal">—</strong></span>
                <span>Filtered: <strong id="adeSummaryFiltered">—</strong></span>
                <span>Total Amount: <strong id="adeSummaryAmt" style="color:#2E7D32;">—</strong></span>
            </div>
        </div>

        <!-- Table -->
        <div class="admin-card" style="padding:0;overflow:hidden;">
            <div style="overflow-x:auto;">
                <table class="admin-table" id="adeTable">
                    <thead>
                        <tr>
                            <th>#</th><th>Book</th><th>Receipt</th><th>Donor</th><th>Type</th>
                            <th>WhatsApp</th><th>Mobile</th><th>Building</th><th>Landmark</th><th>Area</th>
                            <th>Amount</th><th>Mode</th><th>Ref No.</th><th>Landmark</th><th>Image</th><th>Submitted By</th><th>Date</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="adeTbody">
                        <tr><td colspan="18" style="text-align:center;color:#999;padding:30px;">Loading…</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        document.querySelector('.admin-content')?.appendChild(section);
    })();


    // ── Lightbox for Receipt Photos ──
    function adeOpenLightbox(url) {
        let lb = document.getElementById('adeLightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.id = 'adeLightbox';
            lb.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer;';
            lb.onclick = () => lb.remove();
            lb.innerHTML = '<img id="adeLightboxImg" style="max-width:100%;max-height:100%;border-radius:10px;border:3px solid #fff;"><button style="position:absolute;top:20px;right:20px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;">&times;</button>';
            document.body.appendChild(lb);
        }
        document.getElementById('adeLightboxImg').src = url;
    }

    // ── Admin Donation Entries JS ─────────────────────────────────
    let _adeAll = [], _adeFiltered = [];
    let _adeFormOpen = false;

    // ── All Submitted Entries card renderer ──────────────────────
    function adeRenderCards() {
        const grid = document.getElementById('adeCardGrid');
        if (!grid) return;
        const q = (document.getElementById('adeCardSearch')?.value || '').toLowerCase();
        const list = _adeAll.filter(e => {
            if (!q) return true;
            const donor = e.donorType === 'Business'
                ? (e.businessName || '')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
            return donor.toLowerCase().includes(q) || (e.landmark || '').toLowerCase().includes(q);
        });
        const countEl = document.getElementById('adeCardCount');
        if (countEl) countEl.textContent = list.length + ' entr' + (list.length === 1 ? 'y' : 'ies');
        if (!list.length) {
            grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px;grid-column:1/-1;">No entries found.</div>';
            return;
        }
        const modeColor = { Cash:'#27AE60', Cheque:'#1565C0', UPI:'#6A1B9A', RTGS:'#F59E0B', Balance:'#E65100' };
        grid.innerHTML = list.slice().reverse().map(e => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '—')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
            const amt = e.amount != null ? '₹' + Number(e.amount).toLocaleString('en-IN') : '—';
            const mode = e.paymentMode || '—';
            const modeClr = modeColor[mode] || '#555';
            const dtObj = new Date(e.submittedAt);
            const dateStr = isNaN(dtObj) ? '—' : dtObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
            const timeStr = isNaN(dtObj) ? '' : dtObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
            const photoUrl = e.photoUrl || '';
            const photoSection = photoUrl
                ? `<div style="margin-top:12px;border-radius:10px;overflow:hidden;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="adeOpenLightbox('${photoUrl}')">
                       <img src="${photoUrl}?t=${Date.now()}" loading="lazy" alt="Receipt photo" style="width:100%;max-height:180px;object-fit:cover;display:block;">
                       <div style="background:#fff8f5;padding:5px 10px;font-size:.72rem;color:#E65100;font-weight:600;display:flex;align-items:center;gap:5px;">
                           <i class="fas fa-expand-alt"></i> Tap to view full receipt
                       </div>
                   </div>`
                : `<div style="margin-top:12px;border:1.5px dashed #f0e0d0;border-radius:10px;padding:12px;text-align:center;background:#fffaf8;">
                       <i class="fas fa-camera" style="font-size:1.3rem;color:#ddd;display:block;margin-bottom:5px;"></i>
                       <span style="font-size:.73rem;color:#ccc;font-weight:600;">No Receipt Photo</span>
                   </div>`;
            return `<div style="background:var(--white);border:1.5px solid #F0F0F0;border-radius:14px;padding:18px 16px;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:box-shadow .2s;" onmouseover="this.style.boxShadow='0 4px 18px rgba(0,0,0,.11)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,.06)'">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">
                    <div style="font-weight:700;font-size:.97rem;color:var(--dark-color);line-height:1.3;">${donor}</div>
                    <button onclick="adeOpenEdit('${e.entryId}')" title="Edit" style="border:none;background:#E3F2FD;color:#1565C0;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.8rem;flex-shrink:0;"><i class="fas fa-edit"></i></button>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px;">
                    <span style="background:#F3E5F5;color:#6A1B9A;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;vertical-align:middle;"><i class="fas fa-book" style="margin-right:4px;"></i>Bk ${e.bookNumber} / #${e.receiptNumber}</span> ${ (e.bookType||'New')==='Old' ? '<span style="background:#FFF8F1;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:2px;vertical-align:middle;">Old</span>' : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:2px;vertical-align:middle;">New</span>' }
                    ${(e.landmark || e.area) ? `<span style="background:#E8F5E9;color:#1B5E20;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${[e.landmark, e.area].filter(Boolean).join(' - ')}</span>` : ''}
                    ${e.landmark ? `<span style="background:#E3F2FD;color:#1565C0;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;"><i class="fas fa-location-arrow" style="margin-right:4px;"></i>${e.landmark}</span>` : ''}
                    ${e.buildingName ? `<span style="background:#F3E5F5;color:#6A1B9A;font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;"><i class="fas fa-building" style="margin-right:4px;"></i>${e.buildingName}${e.flatNumber ? ` (Flat: ${e.flatNumber})` : ''}</span>` : ''}
                    <span style="background:#FFF8E1;color:${modeClr};font-size:.73rem;font-weight:700;padding:3px 9px;border-radius:16px;">${mode}</span>
                </div>
                
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    ${(e.editHistory && e.editHistory.length) || (e.nameHistory && e.nameHistory.length) ? `<span onclick="adeOpenEdit('${e.entryId}')" style="cursor:pointer;font-size:.7rem;font-weight:700;color:#c0392b;background:#FFEBEE;padding:3px 8px;border-radius:12px;border:1px solid #f5b7b1;"><i class="fas fa-pencil-alt" style="margin-right:4px;"></i>Edited (Click edit to view)</span>` : '<span></span>'}
                    ${(e.status || (e.paymentMode === 'Balance' ? 'Balance' : 'Received')).toLowerCase() === 'received' ? `<span style="background:#E8F5E9;color:#1B5E20;font-size:.73rem;font-weight:800;padding:3px 9px;border-radius:16px;border:1px solid #c8e6c9;">STATUS: RECEIVED</span>` : `<span style="background:#FFF8E1;color:#F57F17;font-size:.73rem;font-weight:800;padding:3px 9px;border-radius:16px;border:1px solid #ffe0b2;">STATUS: BALANCE</span>`}
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="font-size:1.1rem;font-weight:800;color:#2E7D32;">${amt}</div>
                    <div style="font-size:.76rem;color:#aaa;text-align:right;line-height:1.4;">${timeStr}<br>${dateStr}</div>
                </div>
                ${e.submittedBy ? `<div style="font-size:.75rem;color:#bbb;margin-top:7px;"><i class="fas fa-user" style="margin-right:4px;"></i>${e.submittedBy}</div>` : ''}
                ${e.markedReceivedBy ? `<div style="font-size:.76rem;font-weight:700;color:#E65100;margin-top:6px;padding:5px 10px;background:#FFF8F1;border-radius:8px;border:1px solid #ffe0b2;"><i class="fas fa-check-circle" style="color:#2E7D32;margin-right:5px;"></i>Marked received by <strong>${e.markedReceivedBy}</strong></div>` : ''}
                ${photoSection}
            </div>`;
        }).join('');
    }
    let _apbDocBlob = null;

    function adeToggleForm() {
        _adeFormOpen = !_adeFormOpen;
        const el = document.getElementById('adeFormCard');
        if (el) el.style.display = _adeFormOpen ? 'block' : 'none';
        if (_adeFormOpen) {
            adePopulateBooks();
            adeLoadDropdowns();
            checkAdeAndroidUpload();
        }
    }

    function adePopulateBooks() {
        const sel = document.getElementById('adeBookNumber');
        const bType = document.querySelector('input[name="adeBookType"]:checked')?.value || 'New';
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select Book —</option>';
        const maxBooks = bType === 'Old' ? 30 : 50;
        for (let b = 1; b <= maxBooks; b++) {
            const from = (b - 1) * 50 + 1, to = b * 50;
            sel.innerHTML += `<option value="${b}">Book ${b}  (Receipts ${from}–${to})</option>`;
        }
    }

    async function adeOnBookChange() {
        const bn = Number(document.getElementById('adeBookNumber')?.value);
        const sel = document.getElementById('adeReceiptNumber');
        if (!sel) return;
        if (!bn) {
            sel.innerHTML = '<option value="">— Select Book first —</option>';
            sel.disabled = true;
            return;
        }
        sel.disabled = true;
        sel.innerHTML = '<option value="">Loading…</option>';
        const from = (bn - 1) * 50 + 1, to = bn * 50;
        let used = [];
        const bType = document.querySelector('input[name="adeBookType"]:checked')?.value || 'New';
        try {
            const r = await fetch(`/api/donation-entries/used-receipts/${bn}?type=${bType}`);
            const d = await r.json();
            used = d.usedReceipts || [];
        } catch (e) {}
        sel.innerHTML = '<option value="">— Select Receipt —</option>';
        for (let n = from; n <= to; n++) {
            const taken = used.includes(n);
            sel.innerHTML += `<option value="${n}" ${taken ? 'disabled style="color:#ccc;"' : ''}>${n}${taken ? ' (used)' : ''}</option>`;
        }
        sel.disabled = false;
    }

    function adeSetDonorType(type) {
        document.getElementById('adeDonorType').value = type;
        const indActive = type === 'Individual';
        const activeStyle = 'display:flex;align-items:center;gap:6px;padding:7px 18px;border:2px solid var(--primary-color);border-radius:16px;cursor:pointer;font-weight:600;font-size:.82rem;background:var(--primary-color);color:#fff;transition:all .2s;';
        const inactiveStyle = 'display:flex;align-items:center;gap:6px;padding:7px 18px;border:2px solid #ddd;border-radius:16px;cursor:pointer;font-weight:600;font-size:.82rem;background:#f9f9f9;color:#555;transition:all .2s;';
        document.getElementById('adeBtnInd').style.cssText = indActive ? activeStyle : inactiveStyle;
        document.getElementById('adeBtnBiz').style.cssText = !indActive ? activeStyle : inactiveStyle;
        document.getElementById('adeIndFields').style.display = indActive ? 'grid' : 'none';
        document.getElementById('adeBizFields').style.display = !indActive ? 'block' : 'none';
    }

    const _adeModes = { Cash: 'adeModeCash', Cheque: 'adeModeChq', UPI: 'adeModeUPI', RTGS: 'adeModeRTGS', Balance: 'adeModeBal' };
    const _adeRefLabels = { Cash: 'Reference Number', Cheque: 'Cheque Number', UPI: 'UPI / Transaction ID', RTGS: 'RTGS Reference Number', Balance: 'Recovery Notes / Reference' };
    
    function adeSetMode(mode) {
        document.getElementById('adePaymentMode').value = mode;
        Object.entries(_adeModes).forEach(([m, id]) => {
            const el = document.getElementById(id);
            if (!el) return;
            const active = m === mode;
            el.style.background = active ? 'var(--primary-color)' : '#f9f9f9';
            el.style.color = active ? '#fff' : '#555';
            el.style.border = active ? '2px solid var(--primary-color)' : '2px solid #ddd';
        });
        const lbl = document.getElementById('adeRefLabel');
        if (lbl) lbl.innerHTML = `${_adeRefLabels[mode] || 'Reference Number'} ${(mode === 'Cheque' || mode === 'RTGS') ? '<span style="color:#e74c3c;font-weight:600;font-size:.85rem;">(required)</span>' : '<span style="color:#aaa;font-weight:400;font-size:.85rem;">(optional)</span>'}`;
        const refGroup = document.getElementById('adeRefGroup');
        if (refGroup) refGroup.style.display = mode === 'Balance' ? 'none' : '';
    }

    async function adeLoadDropdowns() {
        await Promise.all([adeLoadBuildings(), adeLoadLandmarks(), adeLoadLandmarks(), aneLoadAll()]);
    }

    async function adeLoadBuildings() {
        try {
            const r = await fetch('/api/buildings');
            const d = await r.json();
            const sel = document.getElementById('adeBuildingNameSelect');
            if (!sel) return;
            const cur = sel.value;
            sel.innerHTML = '<option value="">— Select Building —</option>';
            (d.buildings || []).forEach(b => {
                sel.innerHTML += `<option value="${b.name}" ${b.name === cur ? 'selected' : ''}>${b.name}</option>`;
            });
        } catch (e) {}
    }

    async function adeLoadLandmarks() {
        const FIXED_LANDMARKS = ['Patelwadi', 'Shindewadi', 'Gurkhawadi'];
        const sel = document.getElementById('adeLandmarkSelect');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">— Select Landmark —</option>' +
            FIXED_LANDMARKS.map(n => `<option value="${n}" ${n === cur ? 'selected' : ''}>${n}</option>`).join('');
        try {
            const r = await fetch('/api/landmarks');
            const d = await r.json();
            (d.landmarks || []).forEach(a => {
                if (!FIXED_LANDMARKS.includes(a.name)) {
                    sel.innerHTML += `<option value="${a.name}" ${a.name === cur ? 'selected' : ''}>${a.name}</option>`;
                }
            });
            adeOnLandmarkChange();
        } catch (e) {}
    }

    async function adeLoadAreas(landmarkName) {
        const sel = document.getElementById('adeAreaSelect');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">— Select Area —</option>';
        if (!landmarkName) return;
        
        try {
            const r1 = await fetch('/api/landmarks');
            const d1 = await r1.json();
            const landmarkObj = (d1.landmarks || []).find(a => a.name === landmarkName);
            if (!landmarkObj) return;

            const r2 = await fetch('/api/areas');
            const d2 = await r2.json();
            const subs = (d2.areas || []).filter(s => s.landmarkId === landmarkObj.id);
            
            subs.forEach(s => {
                sel.innerHTML += `<option value="${s.name}" ${s.name === cur ? 'selected' : ''}>${s.name}</option>`;
            });
        } catch (e) {
            console.error(e);
        }
    }

    function adeOnLandmarkChange() {
        const landmarkName = document.getElementById('adeLandmarkSelect')?.value;
        const group = document.getElementById('adeAreaGroup');
        if (!group) return;
        
        if (landmarkName) {
            group.style.display = 'block';
            adeLoadAreas(landmarkName);
        } else {
            group.style.display = 'none';
        }
    }

    async function adeLoadLandmarks() {
        try {
            const r = await fetch('/api/landmarks');
            const data = await r.json();
            const sel = document.getElementById('adeLandmarkSelect');
            if (!sel) return;
            const cur = sel.value;
            while (sel.options.length > 1) sel.remove(1);
            (data.landmarks || []).forEach(l => {
                const o = document.createElement('option');
                o.value = l.name;
                o.textContent = l.name;
                if (l.name === cur) o.selected = true;
                sel.appendChild(o);
            });
        } catch (e) {}
    }

    async function adeAddBuildingPrompt() {
        const name = prompt('Enter new Building Name:');
        if (!name || !name.trim()) return;
        try {
            const r = await fetch('/api/buildings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() })
            });
            const d = await r.json();
            if (r.ok && d.success) {
                await adeLoadBuildings();
                document.getElementById('adeBuildingNameSelect').value = d.building.name;
            } else {
                alert(d.message || 'Could not add building.');
            }
        } catch (e) {
            alert('Server error.');
        }
    }

    async function adeAddLandmarkPrompt() {
        const name = prompt('Enter new Landmark Name:');
        if (!name || !name.trim()) return;
        try {
            const r = await fetch('/api/landmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() })
            });
            const d = await r.json();
            if (r.ok && d.success) {
                await adeLoadLandmarks();
                document.getElementById('adeLandmarkSelect').value = d.landmark.name;
            } else {
                alert(d.message || 'Could not add landmark.');
            }
        } catch (e) {
            alert('Server error.');
        }
    }

    async function adeAutoReceipt() {
        try {
            const bType = document.querySelector('input[name="adeBookType"]:checked')?.value || 'New';
            const resp = await fetch(`/api/donation-entries/next-receipt?type=${bType}`);
            const slot = await resp.json();
            if (!slot.bookNumber) { alert('❌ All receipt numbers are used.'); return; }
            const bookSel = document.getElementById('adeBookNumber');
            if (bookSel) {
                bookSel.value = slot.bookNumber;
                bookSel.dispatchEvent(new Event('change'));
            }
            let attempts = 0;
            const waitAndSet = setInterval(function() {
                attempts++;
                const rs = document.getElementById('adeReceiptNumber');
                if (!rs) { clearInterval(waitAndSet); return; }
                if (!rs.disabled && rs.options.length > 1) {
                    rs.value = slot.receiptNumber;
                    clearInterval(waitAndSet);
                    adeShowStatus('✅ Auto: Book ' + slot.bookNumber + ', Receipt #' + slot.receiptNumber, 'success');
                }
                if (attempts > 40) clearInterval(waitAndSet);
            }, 100);
        } catch (e) {
            alert('❌ Auto-receipt error: ' + e.message);
        }
    }

    function checkAdeAndroidUpload() {
        const isAndroid = /Android/i.test(navigator.userAgent);
        const apbUploadContainer = document.getElementById('apbUploadContainer');
        if (isAndroid && apbUploadContainer) {
            apbUploadContainer.innerHTML = `
                <button type="button" onclick="document.getElementById('apbDocCameraCapture').click()"
                    style="flex:1;min-width:120px;padding:14px;border:2px dashed var(--primary-color);border-radius:12px;background:#fff8f5;color:var(--primary-color);font-size:.92rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                    <i class="fas fa-camera" style="font-size:1.3rem;"></i> Take Photo
                </button>
                <button type="button" onclick="document.getElementById('apbDocCamera').click()"
                    style="flex:1;min-width:120px;padding:14px;border:2px dashed var(--primary-color);border-radius:12px;background:#fff8f5;color:var(--primary-color);font-size:.92rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                    <i class="fas fa-images" style="font-size:1.3rem;"></i> Select Gallery
                </button>
            `;
        }
    }

    function handleApbFileSelect(ev) {
        const f = ev.target.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) {
            alert('Please select an image file.');
            ev.target.value = '';
            return;
        }
        _apbDocBlob = null;
        const statusEl = document.getElementById('apbCompressStatus');
        if (statusEl) statusEl.style.display = '';
        window._compressImage(f, 950, function(blob) {
            if (statusEl) statusEl.style.display = 'none';
            if (!blob) {
                alert('Could not process image.');
                return;
            }
            _apbDocBlob = blob;
            const thumb = document.getElementById('apbDocThumb');
            const name = document.getElementById('apbDocFileName');
            const size = document.getElementById('apbDocFileSize');
            const prev = document.getElementById('apbDocPreview');
            if (thumb) thumb.src = URL.createObjectURL(blob);
            if (name) name.textContent = f.name.replace(/\.[^.]+$/, '') + '.jpg';
            if (size) size.textContent = window._fmtBytesA(blob.size);
            if (prev) prev.style.display = '';
        });
    }

    function apbClearDoc() {
        _apbDocBlob = null;
        const inp = document.getElementById('apbDocCamera');
        if (inp) inp.value = '';
        const inpCap = document.getElementById('apbDocCameraCapture');
        if (inpCap) inpCap.value = '';
        const preEl = document.getElementById('apbDocPreview');
        if (preEl) preEl.style.display = 'none';
        const thumb = document.getElementById('apbDocThumb');
        if (thumb) thumb.src = '';
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('adeEntryForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('adeSubmitBtn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Saving…'; }

            let payload;
            try {
                const donorType = (document.getElementById('adeDonorType')?.value || 'Individual');
                const getVal  = id => document.getElementById(id)?.value ?? '';
                const getTrim = id => getVal(id).trim();

            const amtVal = getVal('adeAmount');
            if (amtVal === '') throw new Error('Donation Amount is mandatory.');
            const pMode = getVal('adePaymentMode') || 'Cash';
            const refNum = getTrim('adeReference');
            if (pMode === 'Cheque' && !refNum) throw new Error('Cheque number is mandatory for Cheque payments.');
            if (pMode === 'RTGS' && !refNum) throw new Error('Transaction ID / Reference number is mandatory for RTGS payments.');

            payload = {
                    bookNumber      : Number(getVal('adeBookNumber')),
                    receiptNumber   : Number(getVal('adeReceiptNumber')),
                    bookType        : document.querySelector('input[name="adeBookType"]:checked')?.value || 'New',
                    donorType,
                    firstName       : donorType === 'Individual' ? getTrim('adeFirstName').toUpperCase()    : null,
                    middleName      : donorType === 'Individual' ? getTrim('adeMiddleName').toUpperCase()   : null,
                    lastName        : donorType === 'Individual' ? getTrim('adeLastName').toUpperCase()     : null,
                    businessName    : donorType === 'Business'   ? getTrim('adeBusinessName').toUpperCase(): null,
                    whatsappNumber  : getTrim('adeWhatsapp')  || null,
                    mobileNumber    : getTrim('adeMobile')    || null,
                    mailId          : getTrim('adeMail')      || null,
                    buildingName    : getVal('adeBuildingNameSelect') || null,
                    flatNumber      : getTrim('adeFlatNumber')        || null,
                    landmark            : getVal('adeLandmarkSelect')         || null,
                    area         : getVal('adeAreaSelect')      || null,
                    landmark        : getVal('adeLandmarkSelect')     || null,
                    amount          : getVal('adeAmount') !== '' ? Number(getVal('adeAmount')) : null,
                    paymentMode     : getVal('adePaymentMode') || 'Cash',
                    referenceNumber : getTrim('adeReference') || null,
                    submittedBy     : 'Admin',
                    submittedByUserId: 'admin'
                };
            } catch (buildErr) {
                console.error('[ADE Form] Payload build error:', buildErr);
                adeShowStatus('❌ Form error: ' + buildErr.message, 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry'; }
                return;
            }

            try {
                const res = await fetch('/api/donation-entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    if (_apbDocBlob && data.entry && data.entry.entryId) {
                        try {
                            const fd = new FormData();
                            fd.append('passbook', _apbDocBlob, 'receipt.jpg');
                            fd.append('entryId', data.entry.entryId);
                            fd.append('userId', 'admin');
                            await fetch('/api/upload-passbook', { method: 'POST', body: fd });
                            apbClearDoc();
                        } catch (_) {}
                    }
                    adeShowStatus(`✅ Entry saved! Book ${data.entry.bookNumber}, Receipt #${data.entry.receiptNumber}`, 'success');
                    this.reset();
                    adeSetDonorType('Individual');
                    adeSetMode('Cash');
                    const rSel = document.getElementById('adeReceiptNumber');
                    if (rSel) { rSel.innerHTML = '<option value="">— Select Book first —</option>'; rSel.disabled = true; }
                    await adeLoad();
                } else {
                    adeShowStatus('❌ ' + (data.message || 'Submission failed.'), 'error');
                }
            } catch (err) {
                adeShowStatus('❌ Network error: ' + (err.message || 'Cannot reach server.'), 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Entry'; }
            }
        });

        // Initialize file upload handlers
        document.getElementById('apbDocCamera')?.addEventListener('change', handleApbFileSelect);
        document.getElementById('apbDocCameraCapture')?.addEventListener('change', handleApbFileSelect);
    });

    async function adeExportExcel(lang = 'en') {
        if (typeof XLSX === 'undefined') {
            const status = document.getElementById('adeStatus');
            if(status) { status.style.display='block'; status.style.background='#FFEBEE'; status.style.color='#c0392b'; status.textContent='Excel export library is not loaded.'; }
            return;
        }
        
        if (!_adeAll || _adeAll.length === 0) {
            const status = document.getElementById('adeStatus');
            if(status) { status.style.display='block'; status.style.background='#FFEBEE'; status.style.color='#c0392b'; status.textContent='No entries to export.'; }
            return;
        }
        
        // Format data following the requested structure
        const data = _adeAll.map(e => {
            const donorName = e.donorType === 'Business' ? (e.businessName || '') : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
            
            let submittedDate = '';
            let submittedTime = '';
            if (e.submittedAt) {
                try {
                    const dtObj = new Date(e.submittedAt);
                    submittedDate = dtObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    submittedTime = dtObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                } catch (err) {}
            }
            
            const row = {};
            if (e.bookNumber) row['Book Number'] = e.bookNumber;
            if (e.receiptNumber) row['Receipt Number'] = e.receiptNumber;
            if (donorName) row['Donor Name'] = donorName;
            if (e.whatsappNumber) row['WhatsApp Number'] = e.whatsappNumber;
            if (e.mobileNumber) row['Mobile Number'] = e.mobileNumber;
            if (e.mailId) row['Email'] = e.mailId;
            if (e.landmark) row['Landmark'] = e.landmark;
            if (e.area) row['Area'] = e.area;
            if (e.landmark) row['Common Landmark'] = e.landmark;
            if (e.buildingName) row['Building Name'] = e.buildingName;
            if (e.flatNumber) row['Flat Number'] = e.flatNumber;
            if (e.amount != null) row['Amount'] = e.amount;
            if (e.paymentMode) row['Payment Mode'] = e.paymentMode;
            if (e.referenceNumber) row['Reference Number'] = e.referenceNumber;
            if (submittedDate) row['Date Submitted'] = submittedDate;
            if (submittedTime) row['Time Submitted'] = submittedTime;
            if (e.submittedBy) row['Submitted By'] = e.submittedBy;
            if (e.status) row['Status'] = e.status;
            if (e.entryId) row['Entry ID'] = e.entryId;
            
            return row;
        });
        
        let finalData = data;
        if (lang === 'mr' && typeof translateExcelData === 'function') {
            finalData = await translateExcelData(data);
        }
        
        const ws = XLSX.utils.json_to_sheet(finalData);
        
        for (const cellAddress in ws) {
            if (cellAddress[0] === '!') continue;
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            ws[cellAddress].s.alignment = { horizontal: "center", vertical: "center" };
        }
        
        const colWidths = [
            { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
            { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
            { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
            { wch: 20 }, { wch: 12 }, { wch: 25 }
        ];
        ws['!cols'] = colWidths;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Donation Entries");
        
        const filename = "Donation_Data_Entry_" + new Date().toISOString().split('T')[0] + ".xlsx";
        XLSX.writeFile(wb, filename);
        
        const status = document.getElementById('adeStatus');
        if(status) { status.style.display='block'; status.style.background='#E8F5E9'; status.style.color='#1B5E20'; status.textContent='Exported to Excel successfully!'; setTimeout(()=>status.style.display='none', 3000); }
    }

    async function adeLoad() {
        const tbody = document.getElementById('adeTbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="18" style="text-align:center;color:#999;padding:30px;">Loading…</td></tr>';
        try {
            const [entRes, landmarkRes] = await Promise.all([
                fetch('/api/donation-entries'),
                fetch('/api/landmarks')
            ]);
            const entData  = await entRes.json();
            const landmarkData = await landmarkRes.json();
            _adeAll = entData.entries || [];
            // Populate landmark filter dropdown
            const landmarkSel = document.getElementById('adeFilterLandmark');
            if (landmarkSel) {
                landmarkSel.innerHTML = '<option value="">All Landmarks</option>';
                (landmarkData.landmarks || []).forEach(a => landmarkSel.innerHTML += `<option>${a.name}</option>`);
            }
            adeFilter();
            adeRenderCards();
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#c00;padding:30px;">Error loading data.</td></tr>';
        }
    }

    function adeFilter() {
        const name = (document.getElementById('adeSearchName')?.value || '').toLowerCase();
        const book = document.getElementById('adeFilterBook')?.value;
        const landmark = document.getElementById('adeFilterLandmark')?.value;
        const mode = document.getElementById('adeFilterMode')?.value;
        const type = document.getElementById('adeFilterType')?.value;
        _adeFiltered = _adeAll.filter(e => {
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
        adeRender();
    }

    function adeClearFilters() {
        ['adeSearchName','adeFilterBook'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
        ['adeFilterLandmark','adeFilterMode','adeFilterType'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
        adeFilter();
    }

    function adeRender() {
        const tbody = document.getElementById('adeTbody');
        if (!tbody) return;
        const totalAmt = _adeFiltered.reduce((s,e) => s + (e.amount||0), 0);
        document.getElementById('adeSummaryTotal')    && (document.getElementById('adeSummaryTotal').textContent    = _adeAll.length);
        document.getElementById('adeSummaryFiltered') && (document.getElementById('adeSummaryFiltered').textContent = _adeFiltered.length);
                document.getElementById('adeSummaryAmt')      && (document.getElementById('adeSummaryAmt').textContent      = '₹' + totalAmt.toLocaleString('en-IN'));
        
        // Instantly update donation tracking section when data changes
        if (typeof loadDonationTrackingCards === 'function') {
            loadDonationTrackingCards();
        }

        if (!_adeFiltered.length) { tbody.innerHTML = '<tr><td colspan="18" style="text-align:center;color:#999;padding:30px;">No entries found.</td></tr>'; return; }
        tbody.innerHTML = _adeFiltered.slice().reverse().map((e, i) => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '—')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
            const dtObj = new Date(e.submittedAt);
            const dtTime = dtObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
            const dtDate = dtObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
            const dt = `<span style="font-size:.8rem;white-space:nowrap;">${dtTime}<br><span style="color:#aaa;">${dtDate}</span></span>`;
            const amt = e.amount != null ? '₹' + Number(e.amount).toLocaleString('en-IN') : '—';
            return `<tr id="ade-row-${e.entryId}">
                <td style="color:#aaa;font-size:.8rem;">${i+1}</td>
                <td style="font-weight:700;vertical-align:middle;">Bk ${e.bookNumber} ${ (e.bookType||'New')==='Old' ? '<span style="background:#FFF8F1;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>' : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>' }</td>
                <td>#${e.receiptNumber}</td>
                <td style="font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${donor}">${donor}</td>
                <td><span style="padding:2px 9px;border-radius:10px;font-size:.75rem;font-weight:700;background:${e.donorType==='Business'?'#E3F2FD':'#E8F5E9'};color:${e.donorType==='Business'?'#1565C0':'#1B5E20'};">${e.donorType}</span></td>
                <td style="color:#555;font-size:.85rem;">${e.whatsappNumber||''}</td>
                <td style="color:#555;font-size:.85rem;">${e.mobileNumber||''}</td>
                <td style="font-size:.85rem;">${e.buildingName||''}${e.flatNumber ? `<br><span style="font-size:0.75rem;color:#777;">Flat: ${e.flatNumber}</span>` : ''}</td>
                <td style="font-size:.85rem;">${e.landmark||''}</td>
                <td style="font-size:.85rem;">${e.area||''}</td>
                <td style="color:#2E7D32;font-weight:700;">${amt}</td>
                <td><span style="padding:3px 10px;border-radius:12px;background:#FFF8F1;color:#E65100;font-size:.75rem;font-weight:700;">${e.paymentMode}</span></td>
                <td style="font-size:.82rem;color:#777;">${e.referenceNumber||''}</td>
                <td style="font-size:.82rem;color:#555;">${e.landmark||''}</td>
                <td style="text-align:center;">${e.photoUrl ? `<img src="${fixUrl(e.photoUrl)}?t=${Date.now()}" style="width:50px;height:50px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;" onclick="openAdminLightbox(fixUrl('${e.photoUrl}'))" title="View photo">` : '<span style="font-size:.72rem;color:#aaa;font-style:italic;">No Image</span>'}</td>
                <td style="font-size:.82rem;color:#888;">${e.submittedBy||''}</td>
                <td style="color:#888;font-size:.82rem;">${dt}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" title="Edit" onclick="adeOpenEdit('${e.entryId}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-delete" title="Delete" onclick="adeDelete('${e.entryId}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    async function adeDelete(id) {
        if (!confirm('Delete this donation entry? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/donation-entries/${encodeURIComponent(id)}`, { method:'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
                adeShowStatus('✅ Entry deleted.', 'success');
                _adeAll = _adeAll.filter(e => e.entryId !== id);
                adeFilter();
            } else { adeShowStatus('❌ ' + (data.message||'Delete failed.'), 'error'); }
        } catch(e) { adeShowStatus('❌ Server error.', 'error'); }
    }

    // ── Edit modal ─────────────────────────────────────────────────
    let _adeEditId = null;
    function adeOpenEdit(id) {
        const e = _adeAll.find(x => x.entryId === id);
        if (!e) return;
        _adeEditId = id;
        const isDonorBiz = e.donorType === 'Business';
        const modal = document.createElement('div');
        modal.id = 'adeEditModal';
        modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:var(--white);border-radius:16px;padding:30px 28px;max-width:680px;width:94%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="margin:0;color:var(--dark-color);"><i class="fas fa-edit" style="color:var(--primary-color);margin-right:8px;"></i>Edit Entry</h3>
                <span onclick="document.getElementById('adeEditModal').remove()" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>
            </div>
            <div id="adeEditStatus" style="display:none;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-weight:600;"></div>
            <form onsubmit="adeSaveEdit(event)" autocomplete="off">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                    <div class="form-group"><label>Book Number</label><input name="bookNumber" class="form-control" type="number" value="${e.bookNumber}" min="1" max="50" required></div>
                    <div class="form-group"><label>Receipt Number</label><input name="receiptNumber" class="form-control" type="number" value="${e.receiptNumber}" min="1" max="2500" required></div>
                </div>
                <div class="form-group"><label>Donor Type</label>
                    <select name="donorType" class="form-control" onchange="this.closest('form').querySelector('.ade-ind-grp').style.display=this.value==='Individual'?'grid':'none';this.closest('form').querySelector('.ade-biz-grp').style.display=this.value==='Business'?'block':'none';">
                        <option ${!isDonorBiz?'selected':''}>Individual</option>
                        <option ${isDonorBiz?'selected':''}>Business</option>
                    </select>
                </div>
                <div class="ade-ind-grp" style="display:${!isDonorBiz?'grid':'none'};grid-template-columns:1fr 1fr 1fr;gap:12px;">
                    <div class="form-group"><label>First Name</label><input name="firstName" class="form-control" value="${e.firstName||''}" oninput="this.value=this.value.toUpperCase()"></div>
                    <div class="form-group"><label>Middle Name</label><input name="middleName" class="form-control" value="${e.middleName||''}" oninput="this.value=this.value.toUpperCase()"></div>
                    <div class="form-group"><label>Last Name</label><input name="lastName" class="form-control" value="${e.lastName||''}" oninput="this.value=this.value.toUpperCase()"></div>
                </div>
                <div class="ade-biz-grp" style="display:${isDonorBiz?'block':'none'};">
                    <div class="form-group"><label>Business Name</label><input name="businessName" class="form-control" value="${e.businessName||''}" oninput="this.value=this.value.toUpperCase()"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                    <div class="form-group"><label>WhatsApp</label><input name="whatsappNumber" class="form-control" value="${e.whatsappNumber||''}" maxlength="10"></div>
                    <div class="form-group"><label>Mobile</label><input name="mobileNumber" class="form-control" value="${e.mobileNumber||''}" maxlength="10"></div>
                    <div class="form-group"><label>Mail ID</label><input name="mailId" class="form-control" value="${e.mailId||''}"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group"><label>Building Name</label><input name="buildingName" class="form-control" value="${e.buildingName||''}"></div>
                    <div class="form-group"><label>Landmark</label><input name="landmark" class="form-control" value="${e.landmark||''}"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                    <div class="form-group"><label>Amount (₹)</label><input name="amount" class="form-control" type="number" value="${e.amount||''}" min="0"></div>
                    <div class="form-group"><label>Payment Mode</label>
                        <select name="paymentMode" class="form-control">
                            <option ${e.paymentMode==='Cash'?'selected':''}>Cash</option>
                            <option ${e.paymentMode==='Cheque'?'selected':''}>Cheque</option>
                            <option ${e.paymentMode==='UPI'?'selected':''}>UPI</option>
                            <option ${e.paymentMode==='RTGS'?'selected':''}>RTGS</option>
                            <option ${e.paymentMode==='Balance'?'selected':''}>Balance</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Status</label>
                        <select name="status" class="form-control">
                            <option ${(e.status || (e.paymentMode === 'Balance' ? 'Balance' : 'Received')) === 'Received' ? 'selected' : ''} value="Received">Received</option>
                            <option ${(e.status || (e.paymentMode === 'Balance' ? 'Balance' : 'Received')) === 'Balance' ? 'selected' : ''} value="Balance">Balance</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Reference No.</label><input name="referenceNumber" class="form-control" value="${e.referenceNumber||''}"></div>
                </div>
                <div style="border:1.5px dashed #ffe0d0;border-radius:10px;padding:16px;margin-bottom:14px;">
                    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:#E65100;margin-bottom:10px;"><i class="fas fa-camera" style="margin-right:6px;"></i>Receipt Photo</div>
                    <div id="adeEditCurPhotoDiv" style="display:none;margin-bottom:10px;">
                        <p style="font-size:.8rem;color:#777;margin:0 0 6px;">Current photo:</p>
                        <img id="adeEditCurPhotoImg" src="" alt="Current" style="max-width:100%;max-height:130px;border-radius:8px;border:1.5px solid #e0e0e0;object-fit:contain;cursor:pointer;">
                    </div>
                    <button type="button" onclick="document.getElementById('adeEditPhotoInput').click()" style="width:100%;padding:11px;border:2px dashed #ddd;border-radius:10px;background:#fff8f5;color:#555;cursor:pointer;font-size:.85rem;font-weight:600;"><i class="fas fa-upload" style="margin-right:6px;color:#E65100;"></i>Upload / Replace Photo</button>
                    <input type="file" id="adeEditPhotoInput" style="display:none;" accept="image/*">
                    <div id="adeEditPhotoPreview" style="display:none;margin-top:10px;">
                        <img id="adeEditPhotoThumb" src="" alt="Preview" style="max-width:100%;max-height:130px;border-radius:8px;border:1.5px solid #ffe0d0;object-fit:contain;">
                        <p id="adeEditPhotoName" style="font-size:.8rem;color:#555;margin:6px 0 0;"></p>
                    </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
                    <button type="button" class="btn" style="background:#eee;color:#555;" onclick="document.getElementById('adeEditModal').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="adeSaveBtnModal">Save Changes</button>
                </div>
            </form>
        </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', ev => { if (ev.target === modal) modal.remove(); });
        // Show editHistory if present (fallback to nameHistory for legacy)
        const hist = e.editHistory || e.nameHistory;
        if (hist && hist.length) {
            const histDiv = document.createElement('div');
            histDiv.style.cssText = 'margin-bottom:16px;border:1.5px solid #E3F2FD;border-radius:10px;padding:14px;background:#F8FBFF;';
            histDiv.innerHTML = '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:#1565C0;margin-bottom:10px;"><i class="fas fa-history" style="margin-right:6px;"></i>Edit History</div>' +
                hist.map(function(h) {
                    const dt = new Date(h.changedAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true});
                    let nameChange = '';
                    if (h.from !== h.to) nameChange = '<span style="color:#888;">Name:</span> <strong>' + (h.from||'—') + '</strong> &rarr; <strong>' + (h.to||'—') + '</strong><br>';
                    let amtChange = '';
                    if (h.fromAmount !== h.toAmount && h.fromAmount !== undefined && h.toAmount !== undefined) amtChange = '<span style="color:#888;">Amount:</span> <strong>₹' + (h.fromAmount||'0') + '</strong> &rarr; <strong>₹' + (h.toAmount||'0') + '</strong><br>';
                    let bookChange = '';
                    if (h.fromBook !== h.toBook && h.fromBook !== undefined && h.toBook !== undefined) bookChange = '<span style="color:#888;">Book:</span> <strong>' + (h.fromBook||'—') + '</strong> &rarr; <strong>' + (h.toBook||'—') + '</strong><br>';
                    let recChange = '';
                    if (h.fromReceipt !== h.toReceipt && h.fromReceipt !== undefined && h.toReceipt !== undefined) recChange = '<span style="color:#888;">Receipt:</span> <strong>' + (h.fromReceipt||'—') + '</strong> &rarr; <strong>' + (h.toReceipt||'—') + '</strong><br>';
                    let modeChange = '';
                    if (h.fromMode !== h.toMode && h.fromMode !== undefined && h.toMode !== undefined) modeChange = '<span style="color:#888;">Mode:</span> <strong>' + (h.fromMode||'—') + '</strong> &rarr; <strong>' + (h.toMode||'—') + '</strong><br>';
                    let statusChange = '';
                    if (h.fromStatus !== h.toStatus && h.fromStatus !== undefined && h.toStatus !== undefined) statusChange = '<span style="color:#888;">Status:</span> <strong>' + (h.fromStatus||'—') + '</strong> &rarr; <strong>' + (h.toStatus||'—') + '</strong><br>';
                    
                    let extraInfo = '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #E3F2FD;font-size:.78rem;color:#666;">' +
                        'Amount: <strong>' + (h.toAmount !== undefined && h.toAmount !== null ? '₹'+h.toAmount : (e.amount != null ? '₹'+e.amount : '—')) + '</strong> &nbsp;|&nbsp; ' +
                        'Book: <strong>' + (h.toBook !== undefined && h.toBook !== null ? h.toBook : (e.bookNumber || '—')) + '</strong> &nbsp;|&nbsp; ' +
                        'Receipt: <strong>' + (h.toReceipt !== undefined && h.toReceipt !== null ? h.toReceipt : (e.receiptNumber || '—')) + '</strong>' +
                        '</div>';
                        
                    return '<div style="padding:8px 12px;background:var(--white);border-radius:8px;border:1px solid #E3F2FD;margin-bottom:6px;font-size:.82rem;">' +
                        nameChange + amtChange + bookChange + recChange + modeChange + statusChange +
                        '<span style="color:#888;">Reason:</span> ' + (h.reason||'—') + ' &nbsp;<span style="color:#aaa;font-size:.75rem;">' + dt + ' by ' + (h.changedBy||'—') + '</span>' +
                        extraInfo +
                    '</div>';
                }).join('');
            const form = modal.querySelector('form');
            if (form) form.insertBefore(histDiv, form.firstChild);
        }
        // Populate current photo
        const curPDiv = document.getElementById('adeEditCurPhotoDiv');
        const curPImg = document.getElementById('adeEditCurPhotoImg');
        if (e.photoUrl && curPDiv && curPImg) {
            curPImg.src = fixUrl(e.photoUrl) + '?t=' + Date.now();
            curPImg.onclick = () => openAdminLightbox(fixUrl(e.photoUrl));
            curPDiv.style.display = '';
        } else if (curPDiv) { curPDiv.style.display = 'none'; }
        const aePreview = document.getElementById('adeEditPhotoPreview');
        if (aePreview) aePreview.style.display = 'none';
        window._adeEditPhotoBlob = null;
        const aeInput = document.getElementById('adeEditPhotoInput');
        if (aeInput) {
            aeInput.value = '';
            aeInput.onchange = function(ev2) {
                const f = ev2.target.files[0]; if (!f) return;
                if (!f.type.startsWith('image/')) { alert('Please select a JPG or PNG image.'); aeInput.value=''; return; }
                window._adeEditPhotoBlob = null;
                window._compressImage(f, 950, function(blob) {
                    if (!blob) { alert('Could not process image.'); return; }
                    window._adeEditPhotoBlob = blob;
                    const thumb = document.getElementById('adeEditPhotoThumb');
                    const name  = document.getElementById('adeEditPhotoName');
                    const prev  = document.getElementById('adeEditPhotoPreview');
                    if (thumb) thumb.src = URL.createObjectURL(blob);
                    if (name)  name.textContent = '✅ ' + f.name.replace(/\.[^.]+$/, '') + '.jpg (' + window._fmtBytesA(blob.size) + (f.size > blob.size ? ', compressed' : '') + ')';
                    if (prev)  prev.style.display = '';
                });
            };
        }
    }

    async function adeSaveEdit(ev) {
        ev.preventDefault();
        const form = ev.target;
        const btn  = document.getElementById('adeSaveBtnModal');
        if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
        const fd = new FormData(form);
        const payload = { _isAdmin: true };
        fd.forEach((v, k) => { payload[k] = ['bookNumber','receiptNumber','amount'].includes(k) ? Number(v) : v; });
        try {
            const res  = await fetch(`/api/donation-entries/${encodeURIComponent(_adeEditId)}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
            const data = await res.json();
            if (res.ok && data.success) {
                document.getElementById('adeEditModal')?.remove();
                adeShowStatus('\u2705 Entry updated successfully.', 'success');
                // Upload photo if selected
                if (window._adeEditPhotoBlob) {
                    try {
                        const fd2 = new FormData();
                        fd2.append('passbook', window._adeEditPhotoBlob, 'receipt.jpg');
                        fd2.append('entryId', _adeEditId);
                        await fetch('/api/upload-passbook', { method:'POST', body:fd2 });
                        window._adeEditPhotoBlob = null;
                    } catch(_px) {}
                }
                await adeLoad();
            } else {
                const st = document.getElementById('adeEditStatus');
                if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c00'; st.textContent = data.message||'Update failed.'; }
            }
        } catch(e) { alert('Server error.'); }
        finally { if (btn) { btn.disabled=false; btn.textContent='Save Changes'; } }
    }

    // ── Building/Landmark Management modals ──────────────────────────
    async function adeBuildingModal() {
        const [rB, rS] = await Promise.all([fetch('/api/buildings'), fetch('/api/areas')]);
        const [dB, dS] = await Promise.all([rB.json(), rS.json()]);
        const allBldgs    = dB.buildings || [];
        const allAreas = dS.areas  || [];
        const modal = document.createElement('div');
        modal.id = 'adeBldgModal';
        modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;';
        modal.innerHTML = '<div style="background:var(--white);border-radius:16px;padding:28px;max-width:480px;width:92%;max-height:82vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.2);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
                '<h3 style="margin:0;"><i class="fas fa-building" style="color:#3949AB;margin-right:8px;"></i>Manage Buildings</h3>' +
                '<span onclick="document.getElementById(\'adeBldgModal\').remove()" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:16px;">' +
                '<input type="text" id="adeBldgInput" class="form-control" placeholder="Building name" style="font-size:.85rem;">' +
                '<select id="adeBldgArea" class="form-control" style="font-size:.85rem;">' +
                    '<option value="">— Link to Area (optional) —</option>' +
                    allAreas.map(function(s){ return '<option value="'+s.id+'">'+s.name+'</option>'; }).join('') +
                '</select>' +
                '<button onclick="amAddBuilding()" class="btn btn-primary">Add Building</button>' +
            '</div>' +
            '<div id="adeBldgList" style="display:flex;flex-direction:column;gap:8px;">' +
            allBldgs.map(function(b) {
                var saName = b.areaId ? (allAreas.find(function(s){return s.id===b.areaId;})||{}).name || '' : '';
                return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8f9fa;border-radius:8px;">' +
                    '<div style="flex:1;">' +
                        '<div style="font-weight:700;font-size:.85rem;">'+b.name+'</div>' +
                        (saName ? '<div style="font-size:.75rem;color:#888;"><i class="fas fa-map" style="margin-right:3px;"></i>'+saName+'</div>' : '') +
                    '</div>' +
                    '<button onclick="amDeleteBuilding(\''+b.id+'\',this)" style="border:none;background:#FFEBEE;color:#c0392b;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.8rem;"><i class="fas fa-trash"></i></button>' +
                '</div>';
            }).join('') +
            (!allBldgs.length ? '<div style="color:#aaa;text-align:center;padding:12px;">No buildings yet.</div>' : '') +
            '</div></div>';
        window.amAddBuilding = async function() {
            var name = (document.getElementById('adeBldgInput')||{}).value||''; name = name.trim(); if(!name) return;
            var saId = (document.getElementById('adeBldgArea')||{}).value||null;
            var payload = { name: name }; if(saId) payload.areaId = saId;
            var r = await fetch('/api/buildings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
            var d = await r.json();
            if(r.ok && d.success) { document.getElementById('adeBldgModal')?.remove(); adeBuildingModal(); adeLoadBuildings(); }
            else alert(d.message || 'Could not add.');
        };
        window.amDeleteBuilding = async function(id, btn) {
            if (!confirm('Remove this building?')) return;
            var r = await fetch('/api/buildings/' + encodeURIComponent(id), { method:'DELETE' });
            if (r.ok) { btn.closest('div').remove(); adeLoadBuildings(); }
            else alert('Could not delete.');
        };
        document.body.appendChild(modal);
        modal.addEventListener('click', function(ev) { if (ev.target === modal) modal.remove(); });
    }

    async function adeDeleteBldg(id, btn) {
        if (!confirm('Remove this building?')) return;
        const res = await fetch(`/api/buildings/${encodeURIComponent(id)}`, { method:'DELETE' });
        if (res.ok) { btn.closest('div').remove(); }
        else alert('Could not delete.');
    }

    async function adeLandmarkModal() {
        const [rL, rA, rS] = await Promise.all([fetch('/api/landmarks'), fetch('/api/landmarks'), fetch('/api/areas')]);
        const [dL, dA, dS] = await Promise.all([rL.json(), rA.json(), rS.json()]);
        const allLandmarks = dA.landmarks || [];
        const allAreas  = dS.areas  || [];
        const modal = document.createElement('div');
        modal.id = 'adeLandmarkModalEl';
        modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;';
        let selLmId = allLandmarks.length ? allLandmarks[0].id : null;
        let selLandmarkId = null;

        function landmarksForLm() {
            return allLandmarks.filter(function(a) { return !a.landmarkId || a.landmarkId === selLmId; });
        }
        function subsForLandmark() {
            return allAreas.filter(function(s) { return s.landmarkId === selLandmarkId; });
        }

        function renderModal() {
            const lmLandmarks = landmarksForLm();
            const subs    = subsForLandmark();
            const selLm   = allLandmarks.find(function(l){ return l.id === selLmId; });
            const selLandmark = allLandmarks.find(function(a){ return a.id === selLandmarkId; });
            modal.innerHTML = '<div style="background:var(--white);border-radius:16px;padding:28px;width:94%;max-width:960px;max-height:88vh;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
                    '<h3 style="margin:0;"><i class="fas fa-sitemap" style="color:#F59E0B;margin-right:8px;"></i>Manage Locations</h3>' +
                    '<span onclick="document.getElementById(\'adeLandmarkModalEl\').remove()" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;flex:1;overflow:hidden;min-height:320px;">' +

                // Column 1: Landmarks
                '<div style="display:flex;flex-direction:column;border-right:1.5px solid #f0f0f0;padding-right:16px;">' +
                    '<h4 style="margin:0 0 10px;color:#E65100;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;"><i class="fas fa-map-marker-alt" style="margin-right:5px;"></i>Landmarks</h4>' +
                    '<div style="display:flex;gap:6px;margin-bottom:10px;">' +
                        '<input type="text" id="amLmInput" class="form-control" placeholder="New landmark" style="flex:1;font-size:.83rem;">' +
                        '<button onclick="amAddLandmark()" class="btn btn-primary btn-small" style="background:var(--primary-color);">Add</button>' +
                    '</div>' +
                    '<div id="amLmList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">' +
                    allLandmarks.map(function(l) {
                        return '<div onclick="amSelectLm(\''+l.id+'\')" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:'+(selLmId===l.id?'#FFF3E0':'#f8f9fa')+';border:1.5px solid '+(selLmId===l.id?'#F59E0B':'transparent')+';border-radius:8px;cursor:pointer;">' +
                            '<span style="flex:1;font-weight:700;font-size:.85rem;color:'+(selLmId===l.id?'#E65100':'#333')+'">'+l.name+'</span>' +
                            '<button onclick="event.stopPropagation();amDeleteLandmark(\''+l.id+'\')" style="border:none;background:#FFEBEE;color:#c0392b;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:.75rem;"><i class="fas fa-trash"></i></button>' +
                        '</div>';
                    }).join('') +
                    (!allLandmarks.length ? '<div style="color:#aaa;text-align:center;padding:12px;font-size:.83rem;">No landmarks yet.</div>' : '') +
                    '</div>' +
                '</div>' +

                // Column 2: Landmarks for selected landmark
                '<div style="display:flex;flex-direction:column;border-right:1.5px solid #f0f0f0;padding-right:16px;">' +
                    '<h4 style="margin:0 0 10px;color:#1565C0;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;"><i class="fas fa-map-pin" style="margin-right:5px;"></i>Landmarks' + (selLm ? ' <span style="font-weight:400;text-transform:none;color:#888;">(under '+selLm.name+')</span>' : '') + '</h4>' +
                    (selLmId ? ('<div style="display:flex;gap:6px;margin-bottom:10px;">' +
                        '<input type="text" id="amLandmarkInput" class="form-control" placeholder="New landmark" style="flex:1;font-size:.83rem;">' +
                        '<button onclick="amAddLandmark(\''+selLmId+'\')" class="btn btn-primary btn-small" style="background:#1565C0;">Add</button>' +
                    '</div>') : '') +
                    '<div id="amLandmarkList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">' +
                    lmLandmarks.map(function(a) {
                        return '<div onclick="amSelectLandmark(\''+a.id+'\')" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:'+(selLandmarkId===a.id?'#E3F2FD':'#f8f9fa')+';border:1.5px solid '+(selLandmarkId===a.id?'#1565C0':'transparent')+';border-radius:8px;cursor:pointer;">' +
                            '<span style="flex:1;font-weight:700;font-size:.85rem;color:'+(selLandmarkId===a.id?'#1565C0':'#333')+'">'+a.name+'</span>' +
                            '<button onclick="event.stopPropagation();amDeleteLandmark(\''+a.id+'\')" style="border:none;background:#FFEBEE;color:#c0392b;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:.75rem;"><i class="fas fa-trash"></i></button>' +
                        '</div>';
                    }).join('') +
                    (!lmLandmarks.length ? '<div style="color:#aaa;text-align:center;padding:12px;font-size:.83rem;">' + (selLmId ? 'No landmarks for this landmark.' : 'Select a landmark first.') + '</div>' : '') +
                    '</div>' +
                '</div>' +

                // Column 3: Areas for selected landmark
                '<div style="display:flex;flex-direction:column;">' +
                    '<h4 style="margin:0 0 10px;color:#2E7D32;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;"><i class="fas fa-map" style="margin-right:5px;"></i>Areas' + (selLandmark ? ' <span style="font-weight:400;text-transform:none;color:#888;">(under '+selLandmark.name+')</span>' : '') + '</h4>' +
                    (selLandmarkId ? ('<div style="display:flex;gap:6px;margin-bottom:10px;">' +
                        '<input type="text" id="amAreaInput" class="form-control" placeholder="New area" style="flex:1;font-size:.83rem;">' +
                        '<button onclick="amAddArea(\''+selLandmarkId+'\')" class="btn btn-primary btn-small" style="background:#2E7D32;">Add</button>' +
                    '</div>') : '') +
                    '<div id="amAreaList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">' +
                    subs.map(function(s) {
                        return '<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:#f8f9fa;border-radius:8px;">' +
                            '<span style="flex:1;font-weight:600;font-size:.85rem;">'+s.name+'</span>' +
                            '<button onclick="amDeleteArea(\''+s.id+'\')" style="border:none;background:#FFEBEE;color:#c0392b;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:.75rem;"><i class="fas fa-trash"></i></button>' +
                        '</div>';
                    }).join('') +
                    (!subs.length ? '<div style="color:#aaa;text-align:center;padding:12px;font-size:.83rem;">' + (selLandmarkId ? 'No areas yet.' : 'Select an landmark first.') + '</div>' : '') +
                    '</div>' +
                '</div>' +

                '</div></div>';
        }

        window.amSelectLm = function(id) { selLmId = id; selLandmarkId = null; renderModal(); };
        window.amSelectLandmark = function(id) { selLandmarkId = id; renderModal(); };
        window.amAddLandmark = async function() {
            var name = (document.getElementById('amLmInput') || {}).value || '';
            name = name.trim(); if (!name) return;
            var r = await fetch('/api/landmarks', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name: name }) });
            var d = await r.json();
            if (r.ok && d.success) { allLandmarks.push(d.landmark); selLmId = d.landmark.id; selLandmarkId = null; renderModal(); adeLoadLandmarks(); }
            else alert(d.message || 'Could not add.');
        };
        window.amDeleteLandmark = async function(id) {
            if (!confirm('Delete this landmark?')) return;
            var r = await fetch('/api/landmarks/' + encodeURIComponent(id), { method:'DELETE' });
            if (r.ok) { var i = allLandmarks.findIndex(function(l){return l.id===id;}); if(i>=0) allLandmarks.splice(i,1); if(selLmId===id){selLmId=allLandmarks.length?allLandmarks[0].id:null;selLandmarkId=null;} renderModal(); adeLoadLandmarks(); }
            else alert('Could not delete.');
        };
        window.amAddLandmark = async function(landmarkId) {
            var name = (document.getElementById('amLandmarkInput') || {}).value || '';
            name = name.trim(); if (!name) return;
            var r = await fetch('/api/landmarks', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name: name, landmarkId: landmarkId }) });
            var d = await r.json();
            if (r.ok && d.success) { allLandmarks.push(d.landmark); selLandmarkId = d.landmark.id; renderModal(); adeLoadLandmarks(); }
            else alert(d.message || 'Could not add.');
        };
        window.amDeleteLandmark = async function(id) {
            if (!confirm('Delete this landmark and all its areas?')) return;
            var r = await fetch('/api/landmarks/' + encodeURIComponent(id), { method:'DELETE' });
            if (r.ok) { var i = allLandmarks.findIndex(function(a){return a.id===id;}); if(i>=0) allLandmarks.splice(i,1); if(selLandmarkId===id) selLandmarkId=null; renderModal(); adeLoadLandmarks(); }
            else alert('Could not delete.');
        };
        window.amAddArea = async function(landmarkId) {
            var name = (document.getElementById('amAreaInput') || {}).value || '';
            name = name.trim(); if (!name) return;
            var r = await fetch('/api/areas', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name: name, landmarkId: landmarkId }) });
            var d = await r.json();
            if (r.ok && d.success) { allAreas.push(d.area); renderModal(); }
            else alert(d.message || 'Could not add.');
        };
        window.amDeleteArea = async function(id) {
            if (!confirm('Delete this area?')) return;
            var r = await fetch('/api/areas/' + encodeURIComponent(id), { method:'DELETE' });
            if (r.ok) { var i = allAreas.findIndex(function(s){return s.id===id;}); if(i>=0) allAreas.splice(i,1); renderModal(); }
            else alert('Could not delete.');
        };

        renderModal();
        document.body.appendChild(modal);
        modal.addEventListener('click', function(ev) { if (ev.target === modal) modal.remove(); });
    }
    function adeShowStatus(msg, type) {
        const el = document.getElementById('adeStatus');
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
        el.style.background = type === 'success' ? '#D5F4E6' : '#FFEBEE';
        el.style.color      = type === 'success' ? '#1a7a45' : '#c0392b';
        el.style.border     = type === 'success' ? '1px solid #a3e6c1' : '1px solid #f5b7b1';
        setTimeout(() => el.style.display = 'none', 5000);
    }

    // ── Admin lightbox ───────────────────────────────────────────────────────
    function openAdminLightbox(src) {
        let lb = document.getElementById('adminLightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.id = 'adminLightbox';
            lb.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;align-items:center;justify-content:center;cursor:zoom-out;';
            lb.innerHTML = '<img id="adminLbImg" style="max-width:92vw;max-height:92vh;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.6);">';
            lb.onclick = () => lb.style.display = 'none';
            document.body.appendChild(lb);
        }
        document.getElementById('adminLbImg').src = src;
        lb.style.display = 'flex';
    }

    // ── Admin New Entry Form ─────────────────────────────────────────────────
    (function injectAdminNewEntryForm() {
        const sec = document.getElementById('donationEntriesStatic');
        if (!sec) return;
        const formCard = document.createElement('div');
        formCard.style.cssText = 'background:var(--white);border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);margin-bottom:22px;overflow:hidden;';
        formCard.innerHTML = `
        <div id="aneToggleBar" onclick="aneToggle()" style="display:flex;align-items:center;justify-content:space-between;padding:16px 22px;cursor:pointer;background:linear-gradient(135deg,#1a237e,#3949AB);color:#fff;">
            <span style="font-weight:700;font-size:1rem;"><i class="fas fa-plus-circle" style="margin-right:8px;"></i>New Donation Entry (Admin)</span>
            <i id="aneChevron" class="fas fa-chevron-down" style="transition:transform .3s;"></i>
        </div>
        <div id="aneFormBody" style="display:none;padding:24px 22px;">
            <div id="aneStatus" style="display:none;padding:10px 16px;border-radius:8px;margin-bottom:14px;font-weight:600;"></div>
            <form id="aneForm" onsubmit="aneSave(event)" autocomplete="off">
                <div style="margin-bottom: 14px;">
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
                    <div class="form-group" style="margin:0;"><label>Book Number</label><select id="aneBook" class="form-control" onchange="aneBookChange()"><option value="">— Select —</option></select></div>
                    <div class="form-group" style="margin:0;"><label>Receipt Number <button type="button" onclick="aneAutoReceipt()" style="margin-left:8px;padding:2px 10px;border:none;border-radius:8px;background:#E8F5E9;color:#1B5E20;font-size:.75rem;font-weight:700;cursor:pointer;"><i class="fas fa-magic"></i> Auto</button></label><select id="aneReceipt" class="form-control" disabled><option>— Select Book first —</option></select></div>
                </div>
                <!-- Donor Type -->
                <div class="form-group" style="margin-bottom:14px;">
                  <label>Donor Type</label>
                  <div style="display:flex;gap:10px;margin-top:6px;">
                    <button type="button" id="aneBtnInd" onclick="aneSetType('Individual')" style="padding:7px 20px;border:2px solid var(--primary-color);border-radius:16px;background:var(--primary-color);color:#fff;font-weight:700;cursor:pointer;">Individual</button>
                    <button type="button" id="aneBtnBiz" onclick="aneSetType('Business')" style="padding:7px 20px;border:2px solid #ddd;border-radius:16px;background:#f9f9f9;color:#555;font-weight:700;cursor:pointer;">Business</button>
                    <input type="hidden" id="aneDonorType" value="Individual">
                  </div>
                </div>
                <!-- Individual fields -->
                <div id="aneIndFields" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
                    <div class="form-group" style="margin:0;"><label>First Name</label><input id="aneFirst" class="form-control" placeholder="FIRST" oninput="this.value=this.value.toUpperCase()"></div>
                    <div class="form-group" style="margin:0;"><label>Middle Name</label><input id="aneMid" class="form-control" placeholder="MIDDLE" oninput="this.value=this.value.toUpperCase()"></div>
                    <div class="form-group" style="margin:0;"><label>Last Name</label><input id="aneLast" class="form-control" placeholder="LAST" oninput="this.value=this.value.toUpperCase()"></div>
                </div>
                <!-- Business fields -->
                <div id="aneBizFields" style="display:none;margin-bottom:14px;">
                    <div class="form-group" style="margin:0;"><label>Business Name</label><input id="aneBizName" class="form-control" placeholder="BUSINESS NAME" oninput="this.value=this.value.toUpperCase()"></div>
                </div>
                <!-- Contact fields (both types) -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
                    <div class="form-group" style="margin:0;"><label>WhatsApp Number</label><input id="aneWA" class="form-control" placeholder="10 digits" maxlength="10"></div>
                    <div class="form-group" style="margin:0;"><label>Mobile Number</label><input id="aneMobile" class="form-control" placeholder="10 digits" maxlength="10"></div>
                    <div class="form-group" style="margin:0;"><label>Email ID</label><input id="aneEmail" class="form-control" placeholder="name" oninput="aneEmailHint(this)"><small id="aneEmailHint" style="color:#888;font-size:.78rem;"></small></div>
                </div>
                <!-- Location Cascade: Landmark → Landmark → Area → Building → Flat -->
                <div style="border:1.5px dashed #ffe0d0;border-radius:12px;padding:16px;margin-bottom:14px;">
                    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--primary-color);margin-bottom:14px;letter-spacing:.07em;"><i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>Location</div>
                    <div class="form-group" style="margin-bottom:12px;">
                        <label style="font-weight:600;font-size:.85rem;color:#333;"><i class="fas fa-landmark" style="color:var(--primary-color);margin-right:5px;font-size:.8rem;"></i> Landmark <span style="font-size:.75rem;font-weight:400;color:#888;">(Select first)</span></label>
                        <div style="display:flex;gap:8px;">
                            <select id="aneLandmark" class="form-control" style="flex:1;" onchange="aneOnLandmarkChange()"><option value="">&#x2014; Select Landmark &#x2014;</option></select>
                            <button type="button" onclick="adeLandmarkModal()" style="padding:0 14px;border:none;border-radius:8px;background:#f3e5f5;color:#6A1B9A;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-cog"></i> Manage</button>
                        </div>
                    </div>
                    <div id="aneLandmarkGroup" style="display:none;margin-bottom:12px;">
                        <label style="font-weight:600;font-size:.85rem;color:#1565C0;"><i class="fas fa-map-pin" style="margin-right:5px;font-size:.8rem;"></i> Landmark</label>
                        <select id="aneLandmark" class="form-control" onchange="aneOnLandmarkChange()"><option value="">&#x2014; Select Landmark &#x2014;</option></select>
                    </div>
                    <div id="aneAreaGroup" style="display:none;margin-bottom:12px;">
                        <label style="font-weight:600;font-size:.85rem;color:#2E7D32;"><i class="fas fa-map" style="margin-right:5px;font-size:.8rem;"></i> Area</label>
                        <select id="aneArea" class="form-control" onchange="aneOnAreaChange()"><option value="">&#x2014; Select Area &#x2014;</option></select>
                    </div>
                    <div id="aneBuildingGroup" style="display:none;margin-bottom:12px;">
                        <label style="font-weight:600;font-size:.85rem;color:#3949AB;"><i class="fas fa-building" style="margin-right:5px;font-size:.8rem;"></i> Building Name</label>
                        <div style="display:flex;gap:8px;">
                            <select id="aneBuilding" class="form-control" style="flex:1;" onchange="aneOnBuildingChange()"><option value="">&#x2014; Select Building &#x2014;</option></select>
                            <button type="button" onclick="adeBuildingModal()" style="padding:0 14px;border:none;border-radius:8px;background:#E3F2FD;color:#1565C0;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-cog"></i> Manage</button>
                        </div>
                    </div>
                    <div id="aneFlatNumberGroup" style="display:none;margin-bottom:4px;">
                        <label style="font-weight:600;font-size:.85rem;color:#E67E22;"><i class="fas fa-door-open" style="margin-right:5px;font-size:.8rem;"></i> Flat / Unit Number</label>
                        <input type="text" id="aneFlatNumber" class="form-control" placeholder="e.g. A-201, Flat 3B">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                    <div class="form-group" style="margin:0;"><label>Amount (&#8377;)</label><input type="number" id="aneAmount" class="form-control" min="0" placeholder="0"></div>
                    <div class="form-group" style="margin:0;"><label>Reference No. <span style="color:#aaa;font-size:.8rem;">(optional)</span></label><input id="aneRef" class="form-control" placeholder=""></div>
                </div>
                <div class="form-group" style="margin-bottom:16px;">
                    <label style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em;color:#555;">Payment Mode <span style="color:red;">*</span></label>
                    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:8px;">
                        <label id="aneModeCash" onclick="aneSetMode('Cash')" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 6px;border:2px solid var(--primary-color);border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:var(--primary-color);color:#fff;transition:all .2s;user-select:none;">
                            <i class="fas fa-money-bill-wave" style="font-size:1.1rem;"></i>Cash
                        </label>
                        <label id="aneModeChq" onclick="aneSetMode('Cheque')" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 6px;border:2px solid #ddd;border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:#f9f9f9;color:#555;transition:all .2s;user-select:none;">
                            <i class="fas fa-file-alt" style="font-size:1.1rem;"></i>Cheque
                        </label>
                        <label id="aneModeUPI" onclick="aneSetMode('UPI')" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 6px;border:2px solid #ddd;border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:#f9f9f9;color:#555;transition:all .2s;user-select:none;">
                            <i class="fas fa-qrcode" style="font-size:1.1rem;"></i>UPI
                        </label>
                        <label id="aneModeRTGS" onclick="aneSetMode('RTGS')" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 6px;border:2px solid #ddd;border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:#f9f9f9;color:#555;transition:all .2s;user-select:none;">
                            <i class="fas fa-university" style="font-size:1.1rem;"></i>RTGS
                        </label>
                        <label id="aneModeBal" onclick="aneSetMode('Balance')" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 6px;border:2px solid #ddd;border-radius:10px;cursor:pointer;font-weight:700;font-size:.78rem;background:#f9f9f9;color:#555;transition:all .2s;user-select:none;">
                            <i class="fas fa-clock" style="font-size:1.1rem;"></i>Balance
                        </label>
                    </div>
                    <input type="hidden" id="anePaymentMode" value="Cash">
                </div>
                <div id="aneRefGroup" style="margin-bottom:14px;">
                    <label id="aneRefLabel" class="form-group" style="display:block;"><span style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em;color:#555;">Reference No. <span style="color:#aaa;font-size:.8rem;font-weight:400;">(optional)</span></span><input id="aneRef" class="form-control" placeholder="Ref / Transaction / Cheque number" style="margin-top:6px;"></label>
                </div>
                <div style="border:1.5px dashed #ffe0d0;border-radius:12px;padding:16px;margin-bottom:16px;">
                    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:#E65100;margin-bottom:12px;"><i class="fas fa-camera" style="margin-right:6px;"></i>Receipt Photo <span style="color:#aaa;font-weight:400;">(optional)</span></div>
                    <button type="button" onclick="document.getElementById('anePhotoInput').click()" style="flex:1;width:100%;padding:14px;border:2px dashed var(--primary-color);border-radius:12px;background:#fff8f5;color:var(--primary-color);font-size:.92rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-camera" style="font-size:1.3rem;"></i> Take Photo / Select Image
                    </button>
                    <input type="file" id="anePhotoInput" style="display:none;" accept="image/*">
                    <div id="anePhotoPreview" style="display:none;margin-top:10px;">
                        <img id="anePhotoThumb" src="" alt="Preview" style="max-width:100%;max-height:180px;border-radius:10px;border:1.5px solid #e0e0e0;object-fit:contain;">
                        <div style="display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;">
                            <span id="anePhotoName" style="font-size:.83rem;color:#555;flex:1;"></span>
                            <button type="button" onclick="aneClearPhoto()" style="background:none;border:none;color:#E74C3C;cursor:pointer;font-size:.85rem;"><i class="fas fa-times"></i> Remove</button>
                        </div>
                    </div>
                    <p style="font-size:.78rem;color:#aaa;margin:10px 0 0;"><i class="fas fa-info-circle" style="margin-right:4px;"></i>Image is automatically compressed to under 1 MB. Works on Android, iOS, and desktop.</p>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button type="button" class="btn" style="background:#eee;color:#555;" onclick="aneReset()">Reset</button>
                    <button type="submit" class="btn btn-primary" id="aneSaveBtn"><i class="fas fa-paper-plane" style="margin-right:6px;"></i>Save Entry</button>
                </div>
            </form>
        </div>
        `;
        sec.insertBefore(formCard, sec.firstChild);
    })();

    let _aneOpen = false;
    let _anePhotoFile = null;

    /* ── Payment mode tile toggle ─────────────────────────────────────── */
    const _aneModeTiles = { Cash:'aneModeCash', Cheque:'aneModeChq', UPI:'aneModeUPI', RTGS:'aneModeRTGS', Balance:'aneModeBal' };
    const _aneModeColors = {
        Cash    : { bg:'var(--primary-color)', border:'var(--primary-color)', color:'#fff' },
        Cheque  : { bg:'#1565C0',             border:'#1565C0',              color:'#fff' },
        UPI     : { bg:'#6A1B9A',             border:'#6A1B9A',              color:'#fff' },
        RTGS    : { bg:'#F59E0B',             border:'#F59E0B',              color:'#fff' },
        Balance : { bg:'#4527A0',             border:'#4527A0',              color:'#fff' },
    };
    function aneSetMode(mode) {
        document.getElementById('anePaymentMode').value = mode;
        Object.keys(_aneModeTiles).forEach(function(m) {
            const el = document.getElementById(_aneModeTiles[m]);
            if (!el) return;
            if (m === mode) {
                const c = _aneModeColors[m];
                el.style.background = c.bg;
                el.style.borderColor = c.border;
                el.style.color = c.color;
            } else {
                el.style.background = '#f9f9f9';
                el.style.borderColor = '#ddd';
                el.style.color = '#555';
            }
        });
        // Show/hide reference field (Balance needs no ref by default)
        const rg = document.getElementById('aneRefGroup');
        if (rg) rg.style.display = mode === 'Balance' ? 'none' : '';
    }

    function aneClearPhoto() {
        window._anePhotoFile = null;
        const inp = document.getElementById('anePhotoInput'); if (inp) inp.value = '';
        const prev = document.getElementById('anePhotoPreview'); if (prev) prev.style.display = 'none';
        const thumb = document.getElementById('anePhotoThumb'); if (thumb) thumb.src = '';
        const name = document.getElementById('anePhotoName'); if (name) name.textContent = '';
    }

    function aneToggle() {
        _aneOpen = !_aneOpen;
        document.getElementById('aneFormBody').style.display = _aneOpen ? '' : 'none';
        const ch = document.getElementById('aneChevron');
        if (ch) ch.style.transform = _aneOpen ? 'rotate(180deg)' : '';
        if (_aneOpen) { anePopulateBooks(); aneLoadLandmarks(); }
    }
    function anePopulateBooks() {
        const sel = document.getElementById('aneBook'); if (!sel || sel.options.length > 1) return;
        for (let b=1;b<=50;b++) { const o=document.createElement('option'); o.value=b; o.textContent=`Book ${b}  (${(b-1)*50+1}–${b*50})`; sel.appendChild(o); }
    }
    document.getElementById('anePhotoInput')?.addEventListener('change', function(ev) {
        const f=ev.target.files[0]; if(!f) return;
        if(!f.type.startsWith('image/')){ alert('Please select an image.'); ev.target.value=''; return; }
        window._anePhotoFile=null;
        window._compressImage(f, 950, function(blob) {
            if(!blob){ alert('Could not process image.'); return; }
            window._anePhotoFile=blob;
            const t=document.getElementById('anePhotoThumb'); if(t) t.src=URL.createObjectURL(blob);
            const n=document.getElementById('anePhotoName'); if(n) n.textContent='✅ '+f.name.replace(/\.[^.]+$/,'')+'.jpg ('+window._fmtBytesA(blob.size)+')';
            const p=document.getElementById('anePhotoPreview'); if(p) p.style.display='';
        });
    });
    
    // ── ANE form: cached data ────────────────────────────────────────────────
    var _aneLandmarks = [], _aneLandmarks = [], _aneAreas = [], _aneBuildings = [];

    async function aneLoadAll() {
        try {
            var rs = await Promise.all([fetch('/api/landmarks'),fetch('/api/landmarks'),fetch('/api/areas'),fetch('/api/buildings')]);
            var ds = await Promise.all(rs.map(function(r){return r.json();}));
            _aneLandmarks = ds[0].landmarks || [];
            _aneLandmarks     = ds[1].landmarks     || [];
            _aneAreas  = ds[2].areas  || [];
            _aneBuildings = ds[3].buildings || [];
        } catch(e) { _aneLandmarks=[]; _aneLandmarks=[]; _aneAreas=[]; _aneBuildings=[]; }

        // Populate Landmark dropdown
        var lSel = document.getElementById('aneLandmark');
        if (lSel) {
            var cur = lSel.value;
            lSel.innerHTML = '<option value="">— Select Landmark —</option>';
            _aneLandmarks.forEach(function(l) {
                lSel.innerHTML += '<option value="'+l.name+'"'+(l.name===cur?' selected':'')+'>'+l.name+'</option>';
            });
        }
        // Reset cascade
        ['aneLandmarkGroup','aneAreaGroup','aneBuildingGroup','aneFlatNumberGroup'].forEach(function(id){
            var el=document.getElementById(id); if(el) el.style.display='none';
        });
    }

    function aneOnLandmarkChange() {
        var lmName = (document.getElementById('aneLandmark')||{}).value||'';
        // Reset downstream
        ['aneLandmark','aneArea','aneBuilding'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
        ['aneLandmarkGroup','aneAreaGroup','aneBuildingGroup','aneFlatNumberGroup'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
        if (!lmName) return;
        var lmObj = _aneLandmarks.find(function(l){return l.name===lmName;});
        var filtLandmarks = lmObj ? _aneLandmarks.filter(function(a){return !a.landmarkId||a.landmarkId===lmObj.id;}) : _aneLandmarks;
        var landmarkSel = document.getElementById('aneLandmark');
        if (!landmarkSel) return;
        landmarkSel.innerHTML = '<option value="">— Select Landmark —</option>';
        filtLandmarks.forEach(function(a){ landmarkSel.innerHTML += '<option value="'+a.name+'" data-id="'+a.id+'">'+a.name+'</option>'; });
        var g=document.getElementById('aneLandmarkGroup'); if(g) g.style.display='';
    }

    function aneOnLandmarkChange() {
        var landmarkName = (document.getElementById('aneLandmark')||{}).value||'';
        ['aneArea','aneBuilding'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
        ['aneAreaGroup','aneBuildingGroup','aneFlatNumberGroup'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
        if (!landmarkName) return;
        var landmarkObj = _aneLandmarks.find(function(a){return a.name===landmarkName;});
        var subs = landmarkObj ? _aneAreas.filter(function(s){return s.landmarkId===landmarkObj.id;}) : [];
        var subSel = document.getElementById('aneArea');
        if (!subSel) return;
        subSel.innerHTML = '<option value="">— Select Area —</option>';
        subs.forEach(function(s){ subSel.innerHTML += '<option value="'+s.name+'" data-id="'+s.id+'">'+s.name+'</option>'; });
        var g=document.getElementById('aneAreaGroup'); if(g) g.style.display='';
    }

    function aneOnAreaChange() {
        var saName = (document.getElementById('aneArea')||{}).value||'';
        var el=document.getElementById('aneBuilding'); if(el) el.value='';
        ['aneBuildingGroup','aneFlatNumberGroup'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
        if (!saName) return;
        var saObj = _aneAreas.find(function(s){return s.name===saName;});
        var bldgs = saObj ? _aneBuildings.filter(function(b){return !b.areaId||b.areaId===saObj.id;}) : _aneBuildings;
        var bSel = document.getElementById('aneBuilding');
        if (!bSel) return;
        bSel.innerHTML = '<option value="">— Select Building —</option>';
        bldgs.forEach(function(b){ bSel.innerHTML += '<option value="'+b.name+'">'+b.name+'</option>'; });
        var g=document.getElementById('aneBuildingGroup'); if(g) g.style.display='';
    }

    function aneOnBuildingChange() {
        var b = (document.getElementById('aneBuilding')||{}).value||'';
        var g=document.getElementById('aneFlatNumberGroup'); if(g) g.style.display=b?'':'none';
    }

    // Legacy stubs (kept for backward compat calls)
    async function aneLoadLandmarks() { await aneLoadAll(); }
    async function aneLoadBuildings() { await aneLoadAll(); }
    async function aneLoadLandmarks() { await aneLoadAll(); }

    function aneShowStatus(msg, type) {
        var el=document.getElementById('aneStatus'); if(!el) return;
        el.style.display=''; el.textContent=msg;
        el.style.background=type==='success'?'#D5F4E6':'#FFEBEE';
        el.style.color=type==='success'?'#1a7a45':'#c0392b';
        el.style.border=type==='success'?'1px solid #a3e6c1':'1px solid #f5b7b1';
    }

    function aneReset() {
        document.getElementById('aneForm')?.reset();
        document.getElementById('aneBook').value='';
        var rs=document.getElementById('aneReceipt'); if(rs){rs.innerHTML='<option>\u2014 Select Book first \u2014</option>';rs.disabled=true;}
        var pp=document.getElementById('anePhotoPreview'); if(pp) pp.style.display='none';
        window._anePhotoFile=null;
        document.getElementById('anePhotoInput').value='';
        document.getElementById('aneStatus').style.display='none';
        aneSetMode('Cash');
        // Reset location cascade
        ['aneLandmark','aneLandmark','aneArea','aneBuilding'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
        ['aneLandmarkGroup','aneAreaGroup','aneBuildingGroup','aneFlatNumberGroup'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
    }


    // ── Manage Landmarks modal ───────────────────────────────────────────────
    async function adeLandmarkModal() {
        const res = await fetch('/api/landmarks');
        const data = await res.json();
        const modal = document.createElement('div');
        modal.id = 'adeLmModal';
        modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;';
        modal.innerHTML = `<div style="background:var(--white);border-radius:16px;padding:28px;max-width:440px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.2);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <h3 style="margin:0;"><i class="fas fa-flag" style="color:#6A1B9A;margin-right:8px;"></i>Manage Landmarks</h3>
                <span onclick="document.getElementById('adeLmModal').remove()" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:16px;">
                <input type="text" id="adeLmInput" class="form-control" placeholder="New landmark name" style="flex:1;">
                <button onclick="adeAddLandmark()" class="btn btn-primary btn-small">Add</button>
            </div>
            <div id="adeLmList" style="display:flex;flex-direction:column;gap:8px;">
                ${(data.landmarks||[]).map(l => `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8f9fa;border-radius:8px;">
                    <span style="flex:1;font-weight:600;">${l.name}</span>
                    <button onclick="adeDeleteLandmark('${l.id}',this)" style="border:none;background:#FFEBEE;color:#c0392b;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.8rem;"><i class="fas fa-trash"></i></button>
                </div>`).join('')}
            </div>
        </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', ev => { if(ev.target===modal) modal.remove(); });
    }
    async function adeAddLandmark() {
        const name = document.getElementById('adeLmInput')?.value.trim(); if(!name) return;
        const res = await fetch('/api/landmarks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});
        const d = await res.json();
        if(res.ok&&d.success){document.getElementById('adeLmModal')?.remove();adeLandmarkModal();}
        else alert(d.message||'Could not add.');
    }
    async function adeDeleteLandmark(id, btn) {
        if(!confirm('Remove this landmark?')) return;
        const res = await fetch(`/api/landmarks/${encodeURIComponent(id)}`,{method:'DELETE'});
        if(res.ok) btn.closest('div').remove(); else alert('Could not delete.');
    }

    // ── Override aneToggle to also load buildings + landmarks ───────────────
    const _origAneToggle = window.aneToggle;
    window.aneToggle = function() {
        _origAneToggle && _origAneToggle();
        aneLoadBuildings();
        aneLoadLandmarks();
    };

    // ── Override aneSave to include new fields ──────────────────────────────
    window.aneSave = async function(ev) {
        ev.preventDefault();
        const btn = document.getElementById('aneSaveBtn');
        if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Saving…';}
        const aneShowStatus = function(msg,type){
            const el=document.getElementById('aneStatus');if(!el)return;
            el.style.display='';el.textContent=msg;
            el.style.background=type==='success'?'#D5F4E6':'#FFEBEE';
            el.style.color=type==='success'?'#1a7a45':'#c0392b';
            el.style.border=type==='success'?'1px solid #a3e6c1':'1px solid #f5b7b1';
        };
        const donorType = document.getElementById('aneDonorType')?.value || 'Individual';
        const bn = Number(document.getElementById('aneBook').value);
        const rn = Number(document.getElementById('aneReceipt').value);
        const fn = (document.getElementById('aneFirst')?.value||'').trim().toUpperCase();
        const mn = (document.getElementById('aneMid')?.value||'').trim().toUpperCase();
        const ln = (document.getElementById('aneLast')?.value||'').trim().toUpperCase();
        const biz = (document.getElementById('aneBizName')?.value||'').trim().toUpperCase();
        const emailRaw = (document.getElementById('aneEmail')?.value||'').trim();
        const emailFull = emailRaw ? (emailRaw.includes('@') ? emailRaw : emailRaw+'@gmail.com') : null;
        if(!bn||!rn){aneShowStatus('❌ Select Book and Receipt Number.','error');if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane" style="margin-right:6px;"></i>Save Entry';}return;}
        if(donorType==='Individual'&&(!fn||!mn||!ln)){aneShowStatus('❌ First, Middle, and Last Name are required.','error');if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane" style="margin-right:6px;"></i>Save Entry';}return;}
        if(donorType==='Business'&&!biz){aneShowStatus('❌ Business Name is required.','error');if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane" style="margin-right:6px;"></i>Save Entry';}return;}
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser')||'null');
        const payload = {
            bookNumber:bn, receiptNumber:rn, donorType,
            firstName:donorType==='Individual'?fn:null, middleName:donorType==='Individual'?mn:null, lastName:donorType==='Individual'?ln:null,
            businessName:donorType==='Business'?biz:null,
            whatsappNumber:document.getElementById('aneWA')?.value.trim()||null,
            mobileNumber:document.getElementById('aneMobile')?.value.trim()||null,
            mailId:emailFull,
            buildingName:document.getElementById('aneBuilding')?.value||null,
            landmark:document.getElementById('aneLandmark').value||null,landmark:document.getElementById('aneLandmark')?.value||null,buildingName:document.getElementById('aneBuilding')?.value||null,
            area:document.getElementById('aneArea')?.value||null,
            landmark:document.getElementById('aneLandmark')?.value||null,
            amount:document.getElementById('aneAmount').value!==''?Number(document.getElementById('aneAmount').value):null,
            paymentMode:document.getElementById('anePaymentMode')?.value||document.getElementById('aneMode')?.value||'Cash',
            referenceNumber:document.getElementById('aneRef')?.value.trim()||null,
            submittedBy:currentUser?currentUser.name:'Admin',
            submittedByUserId:currentUser?currentUser.id:null
        };
        try {
            const res=await fetch('/api/donation-entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            const data=await res.json();
            if(res.ok&&data.success){
                if(window._anePhotoFile&&data.entry&&data.entry.entryId){
                    try{
                        const fd=new FormData();fd.append('passbook',window._anePhotoFile,'receipt.jpg');
                        fd.append('entryId',data.entry.entryId);fd.append('userId',currentUser?String(currentUser.id):'');
                        await fetch('/api/upload-passbook',{method:'POST',body:fd});
                    }catch(_px){}
                }
                aneShowStatus('✅ Entry saved! Book '+data.entry.bookNumber+', Receipt #'+data.entry.receiptNumber,'success');
                aneReset();await adeLoad();
            } else { aneShowStatus('❌ '+(data.message||'Submission failed.'),'error'); }
        } catch(err){ aneShowStatus('❌ '+err.message,'error'); }
        finally{ if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane" style="margin-right:6px;"></i>Save Entry';} }
    };

    // ── Committee Members section ────────────────────────────────────────────
    (function injectCommitteeSection() {
        const container = document.querySelector('.admin-content');
        if (!container || document.getElementById('committeeMembers')) return;
        const sec = document.createElement('div');
        sec.id = 'committeeMembers';
        sec.className = 'content-section';
        sec.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:22px;">
            <div><h2 style="color:var(--dark-color);margin:0 0 4px;">Committee Members</h2><p style="color:#777;margin:0;">Manage committee — visible to all volunteers and on public page</p></div>
            <button onclick="cmOpenAdd()" class="btn btn-primary"><i class="fas fa-plus" style="margin-right:6px;"></i>Add Member</button>
        </div>
        <div id="cmStatus" style="display:none;padding:12px 18px;border-radius:10px;margin-bottom:16px;font-weight:600;"></div>
        <div id="cmGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;">
            <div style="text-align:center;color:#aaa;padding:40px;grid-column:1/-1;">Loading…</div>
        </div>`;
        container.appendChild(sec);
    })();

    let _cmAll = [];
    async function cmLoad() {
        const grid = document.getElementById('cmGrid'); if(!grid) return;
        grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:40px;grid-column:1/-1;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary-color);margin-bottom:8px;"></i><br>Loading…</div>';
        try {
            const r = await fetch('/api/committee-members'); const d = await r.json();
            _cmAll = d.members || [];
            if(!_cmAll.length){grid.innerHTML='<div style="text-align:center;color:#aaa;padding:40px;grid-column:1/-1;">No members yet. Click Add Member.</div>';return;}
            grid.innerHTML = _cmAll.map(m => `<div style="background:var(--white);border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;text-align:center;display:flex;flex-direction:column;justify-content:space-between;border:1px solid #eee;">
                <div>
                    ${m.photoUrl?
                        `<img src="${fixUrl(m.photoUrl)}" style="width:100%;height:180px;object-fit:cover;" onclick="openAdminLightbox('${fixUrl(m.photoUrl)}')">`:
                        `<div style="width:100%;height:180px;background:linear-gradient(135deg,var(--primary-color),#ff8c42);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="font-size:3rem;color:#fff;opacity:.5;"></i></div>`}
                    <div style="padding:14px 12px 6px;">
                        <div style="font-weight:700;font-size:1.05rem;margin-bottom:4px;color:var(--dark-color);">${m.name}</div>
                        <div style="font-size:.82rem;color:var(--primary-color);font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${m.role||m.department||'Member'}</div>
                        ${m.memberId?'<div style="font-size:.78rem;color:#999;margin-bottom:8px;">ID: '+m.memberId+'</div>':''}
                        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:10px;">
                            ${m.phone?'<div style="font-size:.82rem;color:#555;"><i class="fas fa-phone" style="margin-right:6px;color:var(--primary-color);"></i>'+m.phone+'</div>':''}
                            ${m.whatsapp?'<div style="font-size:.82rem;color:#2e7d32;"><i class="fab fa-whatsapp" style="margin-right:6px;color:#25d366;font-weight:bold;"></i>'+m.whatsapp+'</div>':''}
                        </div>
                    </div>
                </div>
                <div style="padding:0 12px 16px 12px;">
                    <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;border-top:1px solid #f5f5f5;padding-top:12px;">
                        <button onclick="cmOpenEdit('${m.id}')" class="btn-icon btn-edit" title="Edit Member" style="background:#E3F2FD;color:#1565C0;"><i class="fas fa-edit"></i></button>
                        <button onclick="cmDelete('${m.id}')" class="btn-icon btn-delete" title="Delete Member" style="background:#FFEBEE;color:#c0392b;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`).join('');
        } catch(e) { grid.innerHTML='<div style="text-align:center;color:#c00;padding:40px;grid-column:1/-1;">⚠ Cannot load members.</div>'; }
    }

    function cmShowStatus(msg,type){
        const el=document.getElementById('cmStatus');if(!el)return;
        el.style.display='';el.textContent=msg;
        el.style.background=type==='success'?'#D5F4E6':'#FFEBEE';
        el.style.color=type==='success'?'#1a7a45':'#c0392b';
        el.style.border=type==='success'?'1px solid #a3e6c1':'1px solid #f5b7b1';
        setTimeout(()=>el.style.display='none',5000);
    }

    function cmOpenAdd() { cmOpenModal(null); }
    function cmOpenEdit(id) { cmOpenModal(_cmAll.find(m=>m.id===id)); }
    let _cmPhotoFile = null;
    function cmOpenModal(member) {
        _cmPhotoFile = null;
        const isEdit = !!member;
        const modal = document.createElement('div');
        modal.id = 'cmModal';
        modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;';
        modal.innerHTML = `<div style="background:var(--white);border-radius:16px;padding:28px 24px;max-width:480px;width:94%;max-height:88vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <h3 style="margin:0;font-weight:600;font-size:1.25rem;color:var(--dark-color);">${isEdit?'Edit':'Add'} Committee Member</h3>
                <span onclick="document.getElementById('cmModal').remove()" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>
            </div>
            <div id="cmModalStatus" style="display:none;padding:10px;border-radius:8px;margin-bottom:12px;font-weight:600;"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Full Name *</label><input id="cmName" class="admin-input" style="width:100%;box-sizing:border-box;" value="${member?member.name:''}"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Member ID</label><input id="cmMemberId" class="admin-input" style="width:100%;box-sizing:border-box;" value="${member?member.memberId:''}"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Phone / Contact Number</label><input id="cmPhone" class="admin-input" style="width:100%;box-sizing:border-box;" maxlength="10" value="${member?member.phone||'':''}"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">WhatsApp Number</label><input id="cmWhatsapp" class="admin-input" style="width:100%;box-sizing:border-box;" maxlength="10" value="${member?member.whatsapp||'':''}"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Department</label><input id="cmDept" class="admin-input" style="width:100%;box-sizing:border-box;" placeholder="e.g. Executive" value="${member?member.department||'':''}"></div>
            <div class="form-group" style="margin-bottom:14px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Role / Position</label><input id="cmRole" class="admin-input" style="width:100%;box-sizing:border-box;" placeholder="e.g. President" value="${member?member.role||'':''}"></div>
            <div style="border:1.5px dashed #ffe0d0;border-radius:10px;padding:14px;margin-bottom:16px;">
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:#E65100;margin-bottom:10px;"><i class="fas fa-camera" style="margin-right:6px;"></i>Member Photo</div>
                ${member&&member.photoUrl?`<div style="text-align:center;"><img src="${fixUrl(member.photoUrl)}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:2px solid #ffe0d0;margin-bottom:10px;"></div>`:''}
                <button type="button" onclick="document.getElementById('cmPhotoInput').click()" style="width:100%;padding:10px;border:2px dashed #ddd;border-radius:10px;background:#fff8f5;color:#555;cursor:pointer;font-size:.85rem;font-weight:600;transition:all .2s;" onmouseover="this.style.borderColor='#E65100'" onmouseout="this.style.borderColor='#ddd'"><i class="fas fa-upload" style="margin-right:6px;color:#E65100;"></i>Select & Compress Photo</button>
                <input type="file" id="cmPhotoInput" style="display:none;" accept="image/*">
                <div id="cmPhotoPreview" style="display:none;margin-top:10px;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid #eee;">
                    <img id="cmPhotoThumb" src="" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:2px solid #ffe0d0;">
                    <div id="cmPhotoName" style="font-size:.78rem;color:#555;margin-top:6px;word-break:break-all;"></div>
                </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                <button class="btn" style="background:#eee;color:#555;" onclick="document.getElementById('cmModal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="cmSave('${member?member.id:''}')"><i class="fas fa-save" style="margin-right:6px;"></i>Save</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', ev => { if(ev.target===modal) modal.remove(); });
        document.getElementById('cmPhotoInput').onchange = function(ev) {
            const f = ev.target.files[0]; if(!f) return;
            window._compressImage(f, 950, function(blob) {
                if(!blob){ alert('Could not compress image.'); return; }
                _cmPhotoFile = blob;
                const r = new FileReader();
                r.onload = function(re) {
                    document.getElementById('cmPhotoThumb').src = re.target.result;
                    document.getElementById('cmPhotoName').innerHTML = `<i class="fas fa-check-circle" style="color:#2e7d32;"></i> Compressed: ${f.name.substring(0,20)}... (${window._fmtBytesA(blob.size)})`;
                    document.getElementById('cmPhotoPreview').style.display = '';
                };
                r.readAsDataURL(blob);
            });
        };
    }

    async function cmSave(editId) {
        const name = document.getElementById('cmName')?.value.trim();
        if(!name){alert('Name is required.');return;}
        const payload = {
            name, 
            memberId:document.getElementById('cmMemberId')?.value.trim()||'',
            phone:document.getElementById('cmPhone')?.value.trim()||'',
            whatsapp:document.getElementById('cmWhatsapp')?.value.trim()||'',
            department:document.getElementById('cmDept')?.value.trim()||'',
            role:document.getElementById('cmRole')?.value.trim()||''
        };
        try {
            let res, d;
            if(editId){
                res=await fetch(`/api/committee-members/${encodeURIComponent(editId)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            } else {
                res=await fetch('/api/committee-members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            }
            d=await res.json();
            if(!res.ok||!d.success){alert(d.message||'Save failed.');return;}
            const memberId = d.member.id;
            if(_cmPhotoFile){
                try{
                    const fd=new FormData();fd.append('photo',_cmPhotoFile,'member.jpg');fd.append('memberId',memberId);
                    await fetch('/api/upload-committee-photo',{method:'POST',body:fd});
                }catch(_px){}
            }
            document.getElementById('cmModal').remove();
            cmShowStatus('✅ Member saved!','success');
            await cmLoad();
        } catch(err){alert('Error: '+err.message);}
    }

    async function cmDelete(id) {
        if(!confirm('Delete this committee member?')) return;
        try {
            const res=await fetch(`/api/committee-members/${encodeURIComponent(id)}`,{method:'DELETE'});
            const d=await res.json();
            if(res.ok&&d.success){cmShowStatus('✅ Member deleted.','success');await cmLoad();}
            else alert(d.message||'Delete failed.');
        }catch(e){alert('Server error.');}
    }


    // ── Volunteer Cards public display section ──────────────────────────────
    let _vcAll = [];
    async function vcLoad() {
        const grid = document.getElementById('vcGrid'); if(!grid) return;
        grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:40px;grid-column:1/-1;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary-color);margin-bottom:8px;"></i><br>Loading public volunteer cards...</div>';
        try {
            const r = await fetch('/api/volunteer-cards'); const d = await r.json();
            _vcAll = d.cards || [];
            if(!_vcAll.length){grid.innerHTML='<div style="text-align:center;color:#aaa;padding:40px;grid-column:1/-1;">No volunteer public cards set up yet. Click Add Volunteer Card.</div>';return;}
            grid.innerHTML = _vcAll.map(v => `<div style="background:var(--white);border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;text-align:center;display:flex;flex-direction:column;justify-content:space-between;border:1px solid #eee;">
                <div>
                    ${v.photoUrl?
                        `<img src="${fixUrl(v.photoUrl)}" style="width:100%;height:180px;object-fit:cover;" onclick="openAdminLightbox('${fixUrl(v.photoUrl)}')">`:
                        `<div style="width:100%;height:180px;background:linear-gradient(135deg,var(--primary-color),var(--accent-color));display:flex;align-items:center;justify-content:center;"><i class="fas fa-user-circle" style="font-size:3rem;color:#fff;opacity:.5;"></i></div>`}
                    <div style="padding:14px 12px 6px;">
                        <div style="font-weight:700;font-size:1.05rem;margin-bottom:4px;color:var(--dark-color);">${v.name}</div>
                        <div style="font-size:.82rem;color:var(--primary-color);font-weight:600;margin-bottom:10px;text-transform:uppercase;">${v.position||'Active Volunteer'}</div>
                        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:10px;">
                            ${v.phone?'<div style="font-size:.82rem;color:#555;"><i class="fas fa-phone" style="margin-right:6px;color:var(--primary-color);"></i>'+v.phone+'</div>':''}
                            ${v.phone?'<div style="font-size:.82rem;color:#2e7d32;"><i class="fab fa-whatsapp" style="margin-right:6px;color:#25d366;font-weight:bold;"></i>wa.me/91'+v.phone+'</div>':''}
                        </div>
                    </div>
                </div>
                <div style="padding:0 12px 16px 12px;">
                    <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;border-top:1px solid #f5f5f5;padding-top:12px;">
                        <button onclick="vcOpenEdit('${v.id}')" class="btn-icon btn-edit" title="Edit Card" style="background:#E3F2FD;color:#1565C0;"><i class="fas fa-edit"></i></button>
                        <button onclick="vcDelete('${v.id}')" class="btn-icon btn-delete" title="Delete Card" style="background:#FFEBEE;color:#c0392b;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`).join('');
        } catch(e) { grid.innerHTML='<div style="text-align:center;color:#c00;padding:40px;grid-column:1/-1;">⚠ Cannot load volunteer cards.</div>'; }
    }

    function vcShowStatus(msg,type){
        const el=document.getElementById('vcStatus');if(!el)return;
        el.style.display='';el.textContent=msg;
        el.style.background=type==='success'?'#D5F4E6':'#FFEBEE';
        el.style.color=type==='success'?'#1a7a45':'#c0392b';
        el.style.border=type==='success'?'1px solid #a3e6c1':'1px solid #f5b7b1';
        setTimeout(()=>el.style.display='none',5000);
    }

    function vcOpenAdd() { vcOpenModal(null); }
    function vcOpenEdit(id) { vcOpenModal(_vcAll.find(v=>v.id===id)); }
    let _vcPhotoFile = null;
    function vcOpenModal(card) {
        _vcPhotoFile = null;
        const isEdit = !!card;
        const modal = document.createElement('div');
        modal.id = 'vcModal';
        modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;';
        modal.innerHTML = `<div style="background:var(--white);border-radius:16px;padding:28px 24px;max-width:480px;width:94%;max-height:88vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <h3 style="margin:0;font-weight:600;font-size:1.25rem;color:var(--dark-color);">${isEdit?'Edit':'Add'} Volunteer Card</h3>
                <span onclick="document.getElementById('vcModal').remove()" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>
            </div>
            <div id="vcModalStatus" style="display:none;padding:10px;border-radius:8px;margin-bottom:12px;font-weight:600;"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Full Name *</label><input id="vcName" class="admin-input" style="width:100%;box-sizing:border-box;" placeholder="e.g. Ramesh Patel" value="${card?card.name:''}"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Position / Department</label><input id="vcPosition" class="admin-input" style="width:100%;box-sizing:border-box;" placeholder="e.g. Lead Coordinator" value="${card?card.position||'':''}"></div>
            <div class="form-group" style="margin-bottom:14px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Contact / Phone Number</label><input id="vcPhone" class="admin-input" style="width:100%;box-sizing:border-box;" maxlength="10" placeholder="10-digit mobile" value="${card?card.phone||'':''}"></div>
            <div style="border:1.5px dashed #ffe0d0;border-radius:10px;padding:14px;margin-bottom:16px;">
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:#E65100;margin-bottom:10px;"><i class="fas fa-camera" style="margin-right:6px;"></i>Volunteer Photo</div>
                ${card&&card.photoUrl?`<div style="text-align:center;"><img src="${fixUrl(card.photoUrl)}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:2px solid #ffe0d0;margin-bottom:10px;"></div>`:''}
                <button type="button" onclick="document.getElementById('vcPhotoInput').click()" style="width:100%;padding:10px;border:2px dashed #ddd;border-radius:10px;background:#fff8f5;color:#555;cursor:pointer;font-size:.85rem;font-weight:600;transition:all .2s;" onmouseover="this.style.borderColor='#E65100'" onmouseout="this.style.borderColor='#ddd'"><i class="fas fa-upload" style="margin-right:6px;color:#E65100;"></i>Select & Compress Photo</button>
                <input type="file" id="vcPhotoInput" style="display:none;" accept="image/*">
                <div id="vcPhotoPreview" style="display:none;margin-top:10px;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid #eee;">
                    <img id="vcPhotoThumb" src="" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:2px solid #ffe0d0;">
                    <div id="vcPhotoName" style="font-size:.78rem;color:#555;margin-top:6px;word-break:break-all;"></div>
                </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                <button class="btn" style="background:#eee;color:#555;" onclick="document.getElementById('vcModal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="vcSave('${card?card.id:''}')"><i class="fas fa-save" style="margin-right:6px;"></i>Save Card</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', ev => { if(ev.target===modal) modal.remove(); });
        document.getElementById('vcPhotoInput').onchange = function(ev) {
            const f = ev.target.files[0]; if(!f) return;
            window._compressImage(f, 950, function(blob) {
                if(!blob){ alert('Could not compress image.'); return; }
                _vcPhotoFile = blob;
                const r = new FileReader();
                r.onload = function(re) {
                    document.getElementById('vcPhotoThumb').src = re.target.result;
                    document.getElementById('vcPhotoName').innerHTML = `<i class="fas fa-check-circle" style="color:#2e7d32;"></i> Compressed: ${f.name.substring(0,20)}... (${window._fmtBytesA(blob.size)})`;
                    document.getElementById('vcPhotoPreview').style.display = '';
                };
                r.readAsDataURL(blob);
            });
        };
    }

    async function vcSave(editId) {
        const name = document.getElementById('vcName')?.value.trim();
        if(!name){alert('Name is required.');return;}
        const payload = {
            name, 
            position:document.getElementById('vcPosition')?.value.trim()||'',
            phone:document.getElementById('vcPhone')?.value.trim()||''
        };
        try {
            let res, d;
            if(editId){
                res=await fetch(`/api/volunteer-cards/${encodeURIComponent(editId)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            } else {
                res=await fetch('/api/volunteer-cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            }
            d=await res.json();
            if(!res.ok||!d.success){alert(d.message||'Save failed.');return;}
            const id = d.card.id;
            if(_vcPhotoFile){
                try{
                    const fd=new FormData();fd.append('photo',_vcPhotoFile,'volunteer.jpg');fd.append('volunteerId',id);
                    await fetch('/api/upload-volunteer-photo',{method:'POST',body:fd});
                }catch(_px){}
            }
            document.getElementById('vcModal').remove();
            vcShowStatus('✅ Volunteer card saved!','success');
            await vcLoad();
        } catch(err){alert('Error: '+err.message);}
    }

    async function vcDelete(id) {
        if(!confirm('Delete this volunteer card?')) return;
        try {
            const res=await fetch(`/api/volunteer-cards/${encodeURIComponent(id)}`,{method:'DELETE'});
            const d=await res.json();
            if(res.ok&&d.success){vcShowStatus('✅ Volunteer card deleted.','success');await vcLoad();}
            else alert(d.message||'Delete failed.');
        }catch(e){alert('Server error.');}
    }

    function switchVolTab(tab) {
        const tabCards = document.getElementById('volTabCards');
        const tabAccounts = document.getElementById('volTabAccounts');
        const panelCards = document.getElementById('volPanelCards');
        const panelAccounts = document.getElementById('volPanelAccounts');
        const activeStyle   = `padding:10px 24px;border:none;background:none;font-size:.92rem;font-weight:600;color:var(--primary-color);border-bottom:3px solid var(--primary-color);cursor:pointer;transition:all .2s;`;
        const inactiveStyle = `padding:10px 24px;border:none;background:none;font-size:.92rem;font-weight:600;color:#999;border-bottom:3px solid transparent;cursor:pointer;transition:all .2s;`;
        
        if (tab === 'cards') {
            if (tabCards) tabCards.style.cssText = activeStyle;
            if (tabAccounts) tabAccounts.style.cssText = inactiveStyle;
            if (panelCards) panelCards.style.display = '';
            if (panelAccounts) panelAccounts.style.display = 'none';
            vcLoad();
        } else {
            if (tabCards) tabCards.style.cssText = inactiveStyle;
            if (tabAccounts) tabAccounts.style.cssText = activeStyle;
            if (panelCards) panelCards.style.display = 'none';
            if (panelAccounts) panelAccounts.style.display = '';
            loadVolunteers();
        }
    }




    let _ccAll = [];
    async function ccLoad() {
        const grid = document.getElementById('ccGrid'); if(!grid) return;
        grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:40px;grid-column:1/-1;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary-color);margin-bottom:8px;"></i><br>Loading Contact Slots...</div>';
        try {
            const r = await fetch('/api/contact-cards'); const d = await r.json();
            _ccAll = d.cards || [];
            if(!_ccAll.length){
                grid.innerHTML='<div style="text-align:center;color:#aaa;padding:40px;grid-column:1/-1;">No contact slots available. Contact Server administrator.</div>';
                return;
            }
            grid.innerHTML = _ccAll.map((c, i) => {
                const title = c.title || `Representative Slot ${c.slot}`;
                const subtitle = c.subtitle || (i === 0 ? 'General Inquiries' : i === 1 ? 'Donations Desk' : i === 2 ? 'Cultural Events' : i === 3 ? 'Public Relations' : 'Volunteer Management');
                
                return `<div style="background:var(--white);border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;border:1px solid #eee;display:flex;flex-direction:column;justify-content:space-between;position:relative;">
                    <span style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.65);color:#fff;padding:3px 9px;border-radius:30px;font-size:0.75rem;font-weight:600;z-index:2;">Slot ${c.slot}</span>
                    <div>
                        ${c.photoUrl?
                            `<img src="${fixUrl(c.photoUrl)}" style="width:100%;height:180px;object-fit:cover;" onclick="openAdminLightbox('${fixUrl(c.photoUrl)}')">`:
                            `<div style="width:100%;height:180px;background:linear-gradient(135deg,var(--primary-color),var(--accent-color));display:flex;align-items:center;justify-content:center;"><i class="fas fa-id-card" style="font-size:3rem;color:#fff;opacity:.5;"></i></div>`}
                        <div style="padding:16px 14px 6px;">
                            <div style="font-weight:700;font-size:1.1rem;margin-bottom:4px;color:var(--dark-color);">${title}</div>
                            <div style="font-size:.82rem;color:var(--primary-color);font-weight:600;margin-bottom:10px;text-transform:uppercase;">${subtitle}</div>
                            <div style="display:flex;flex-direction:column;gap:4px;margin-top:12px;">
                                ${c.phone?'<div style="font-size:.82rem;color:#555;"><i class="fas fa-phone" style="margin-right:6px;color:var(--primary-color);"></i>'+c.phone+'</div>':`<div style="font-size:.8rem;color:#999;font-style:italic;">No phone number configured</div>`}
                                ${c.whatsapp?'<div style="font-size:.82rem;color:#2e7d32;"><i class="fab fa-whatsapp" style="margin-right:6px;color:#25d366;font-weight:bold;"></i>+91 '+c.whatsapp+'</div>':''}
                            </div>
                        </div>
                    </div>
                    <div style="padding:0 14px 16px 14px;">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;border-top:1px solid #f5f5f5;padding-top:12px;">
                            <button onclick="ccOpenEdit(${c.slot})" class="btn btn-primary btn-small" style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px;"><i class="fas fa-cog"></i> Configure Slot ${c.slot}</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { grid.innerHTML='<div style="text-align:center;color:#c00;padding:40px;grid-column:1/-1;">⚠ Cannot load contact slots.</div>'; }
    }

    function ccShowStatus(msg,type){
        const el=document.getElementById('ccStatus');if(!el)return;
        el.style.display='';el.textContent=msg;
        el.style.background=type==='success'?'#D5F4E6':'#FFEBEE';
        el.style.color=type==='success'?'#1a7a45':'#c0392b';
        el.style.border=type==='success'?'1px solid #a3e6c1':'1px solid #f5b7b1';
        setTimeout(()=>el.style.display='none',5000);
    }

    let _ccPhotoFile = null;
    function ccOpenEdit(slotNum) {
        _ccPhotoFile = null;
        const card = _ccAll.find(c=>c.slot===slotNum);
        const modal = document.createElement('div');
        modal.id = 'ccModal';
        modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;';
        
        // Slot fallback info to help admin understand the default slots
        const defaultRole = slotNum === 1 ? 'General Inquiries' : slotNum === 2 ? 'Donations Desk' : slotNum === 3 ? 'Cultural Events' : slotNum === 4 ? 'Public Relations' : 'Volunteer Management';
        
        modal.innerHTML = `<div style="background:var(--white);border-radius:16px;padding:28px 24px;max-width:480px;width:94%;max-height:88vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <h3 style="margin:0;font-weight:600;font-size:1.25rem;color:var(--dark-color);">Configure Slot ${slotNum}</h3>
                <span onclick="document.getElementById('ccModal').remove()" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>
            </div>
            <p style="color:#777;font-size:0.83rem;margin: -8px 0 16px 0;">Configure custom name, role, and contact for Slot ${slotNum}. Leaving fields blank falls back to system defaults.</p>
            <div id="ccModalStatus" style="display:none;padding:10px;border-radius:8px;margin-bottom:12px;font-weight:600;"></div>
            
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Representative Name / Title</label><input id="ccTitle" class="admin-input" style="width:100%;box-sizing:border-box;" placeholder="e.g. Rajesh Shah" value="${card?card.title||'':''}"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Subtitle / Role Description</label><input id="ccSubtitle" class="admin-input" style="width:100%;box-sizing:border-box;" placeholder="Default: ${defaultRole}" value="${card?card.subtitle||'':''}"></div>
            <div class="form-group" style="margin-bottom:12px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">Phone / Contact Number</label><input id="ccPhone" class="admin-input" style="width:100%;box-sizing:border-box;" maxlength="10" placeholder="10-digit mobile" value="${card?card.phone||'':''}"></div>
            <div class="form-group" style="margin-bottom:14px;"><label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;color:#555;">WhatsApp Number</label><input id="ccWhatsapp" class="admin-input" style="width:100%;box-sizing:border-box;" maxlength="10" placeholder="WhatsApp number" value="${card?card.whatsapp||'':''}"></div>
            
            <div style="border:1.5px dashed #ffe0d0;border-radius:10px;padding:14px;margin-bottom:16px;">
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:#E65100;margin-bottom:10px;"><i class="fas fa-camera" style="margin-right:6px;"></i>Representative Photo</div>
                ${card&&card.photoUrl?`<div style="text-align:center;"><img src="${fixUrl(card.photoUrl)}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:2px solid #ffe0d0;margin-bottom:10px;"></div>`:''}
                <button type="button" onclick="document.getElementById('ccPhotoInput').click()" style="width:100%;padding:10px;border:2px dashed #ddd;border-radius:10px;background:#fff8f5;color:#555;cursor:pointer;font-size:.85rem;font-weight:600;transition:all .2s;" onmouseover="this.style.borderColor='#E65100'" onmouseout="this.style.borderColor='#ddd'"><i class="fas fa-upload" style="margin-right:6px;color:#E65100;"></i>Select & Compress Photo</button>
                <input type="file" id="ccPhotoInput" style="display:none;" accept="image/*">
                <div id="ccPhotoPreview" style="display:none;margin-top:10px;text-align:center;background:var(--white);border-radius:8px;padding:10px;border:1px solid #eee;">
                    <img id="ccPhotoThumb" src="" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:2px solid #ffe0d0;">
                    <div id="ccPhotoName" style="font-size:.78rem;color:#555;margin-top:6px;word-break:break-all;"></div>
                </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                <button class="btn" style="background:#eee;color:#555;" onclick="document.getElementById('ccModal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="ccSave(${slotNum})"><i class="fas fa-save" style="margin-right:6px;"></i>Save Slot Config</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', ev => { if(ev.target===modal) modal.remove(); });
        document.getElementById('ccPhotoInput').onchange = function(ev) {
            const f = ev.target.files[0]; if(!f) return;
            window._compressImage(f, 950, function(blob) {
                if(!blob){ alert('Could not compress image.'); return; }
                _ccPhotoFile = blob;
                const r = new FileReader();
                r.onload = function(re) {
                    document.getElementById('ccPhotoThumb').src = re.target.result;
                    document.getElementById('ccPhotoName').innerHTML = `<i class="fas fa-check-circle" style="color:#2e7d32;"></i> Compressed: ${f.name.substring(0,20)}... (${window._fmtBytesA(blob.size)})`;
                    document.getElementById('ccPhotoPreview').style.display = '';
                };
                r.readAsDataURL(blob);
            });
        };
    }

    async function ccSave(slotNum) {
        const payload = {
            title: document.getElementById('ccTitle')?.value.trim()||'',
            subtitle: document.getElementById('ccSubtitle')?.value.trim()||'',
            phone: document.getElementById('ccPhone')?.value.trim()||'',
            whatsapp: document.getElementById('ccWhatsapp')?.value.trim()||''
        };
        try {
            const res = await fetch(`/api/contact-cards/${slotNum}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await res.json();
            if (!res.ok || !d.success) { alert(d.message || 'Save failed.'); return; }
            if (_ccPhotoFile) {
                try {
                    const fd = new FormData();
                    fd.append('photo', _ccPhotoFile, 'contact.jpg');
                    fd.append('slot', String(slotNum));
                    await fetch('/api/upload-contact-photo', { method: 'POST', body: fd });
                } catch (_px) {}
            }
            document.getElementById('ccModal').remove();
            ccShowStatus(`✅ Slot ${slotNum} updated!`, 'success');
            await ccLoad();
        } catch (err) { alert('Error: ' + err.message); }
    }


    // ── Hook into admin section switcher ────────────────────────────────────
    // Hook into admin section switcher so we auto-load on navigate
    const _origShowAdmin = window.showAdminSection;
    window.showAdminSection = function(id) {
        if (typeof _origShowAdmin === 'function') _origShowAdmin(id);
        if (id === 'donationEntries') adeLoad();
        if (id === 'committeeMembers') { if(typeof cmLoad==='function') cmLoad(); }
        if (id === 'volunteers') { if(typeof switchVolTab==='function') switchVolTab('cards'); }
        
    };