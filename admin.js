// ==================== URL HELPER (mobile-safe relative URLs) ====================
window.fixUrl = window.fixUrl || function(url) {
    if (!url) return '';
    if (url.startsWith('http://localhost:3000')) return url.slice('http://localhost:3000'.length);
    return url;
};

// ==================== CHECK ADMIN ACCESS ====================
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    
    if (!currentUser) {
        alert('Please login first!');
        window.location.href = 'login.html';
        return;
    }
    
    // Master user (isMaster flag or sentinel id) bypasses role gate
    const isMasterUser = currentUser.isMaster === true || currentUser.id === '__master__';
    if (currentUser.role !== 'admin' && !isMasterUser) {
        alert('Access denied! Admin privileges required.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Update admin profile UI
    if (document.getElementById('adminName')) {
        document.getElementById('adminName').textContent = currentUser.name;
    }
    if (document.getElementById('topNavName')) {
        document.getElementById('topNavName').textContent = currentUser.name;
        document.getElementById('topNavRole').textContent = (currentUser.role === 'admin' ? 'Administrator' : currentUser.role);
        const avatarEl = document.getElementById('topNavAvatar');
        if (avatarEl) {
            if (currentUser.photoUrl) {
                avatarEl.innerHTML = '<img src="' + currentUser.photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
                avatarEl.style.padding = '0';
                avatarEl.style.overflow = 'hidden';
            } else if (currentUser.name && currentUser.name.length > 0) {
                avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
            }
        }
    }
    
    // Initialize admin panel
    initializeAdminPanel();
});

// ==================== INITIALIZE ADMIN PANEL ====================
function initializeAdminPanel() {
    console.log('✅ Admin panel initialized');
    loadDashboardData();
}

// ==================== SHOW SECTION ====================
function showAdminSection(sectionId) {
    if (sectionId === 'myprofile') {
        if (typeof loadMyProfileAdmin === 'function') loadMyProfileAdmin();
    }
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update active menu item — use event safely (fails on iOS if not guarded)
    document.querySelectorAll('.admin-menu a').forEach(link => {
        link.classList.remove('active');
    });
    try {
        const activeLink = (typeof event !== 'undefined' && event && event.target)
            ? event.target.closest('a')
            : document.querySelector(`.admin-menu a[onclick*="'${sectionId}'"]`);
        if (activeLink) activeLink.classList.add('active');
    } catch(_) {}
    
    // Close mobile sidebar after navigating
    closeAdminSidebar();
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard Overview',
        'users': 'User Management',
        'volunteers': 'Volunteer Management',
        'committeeMembers': 'Committee Members',
        'donations': 'Upload Excel',
        'gallery': 'Gallery Management',
        'events'          : 'Event Management',
        'reports'         : 'Reports & Analytics',
        'settings'        : 'System Settings',
        'passbookReceipts': 'Passbook Receipts',
        'expenses'        : 'Expenses Management',
        'pautiBooks'      : 'Pauti Books',
        'balanceRecovery' : 'Balance/Pending Recovery',
        'donationTracking': 'Donations',
        'donationEntries' : 'Donation Data Entry',
        'donorSearch'     : 'Donor Search',
        'tshirtSection'   : 'T-shirt Section',
    };

    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Admin Panel';

    if (sectionId === 'dashboard')        loadDashboardData();
    if (sectionId === 'passbookReceipts') loadAdminReceipts();
    if (sectionId === 'expenses')         loadExpenses();
    if (sectionId === 'reports')          loadFinancials();
    if (sectionId === 'pautiBooks')       loadPautiBooks();
    if (sectionId === 'balanceRecovery')  loadBalanceRecovery();
    if (sectionId === 'donations')        loadDonationExplorer();
    if (sectionId === 'donationTracking') loadDonationTrackingCards();
    if (sectionId === 'volunteers')       loadVolunteers();
    if (sectionId === 'users')            loadUsers();
    if (sectionId === 'donationEntries')  loadAdminDonationEntries();
    if (sectionId === 'gallery')          loadAdminGallery();
    if (sectionId === 'events')           loadAdminEvents();
    if (sectionId === 'donorSearch')      loadDonorSearch();
    if (sectionId === 'tshirtSection' && typeof renderTshirtSection === 'function') renderTshirtSection();
    if (sectionId === 'tshirtSection' && typeof adminTsInit === 'function') adminTsInit();
}

// ── Quick Upload (from Admin Dashboard home) ──────────────────────────────────
function triggerQuickUpload() {
    document.getElementById('quickUploadInput').click();
}
async function handleQuickUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = ''; // reset so same file can be re-uploaded

    const statusEl  = document.getElementById('quickUploadStatus');
    const badgeEl   = document.getElementById('quickUploadBadge');
    const cardEl    = document.getElementById('quickUploadCard');

    const setStatus = (msg, ok) => {
        if (!statusEl) return;
        statusEl.style.display    = '';
        statusEl.style.background = ok ? '#E8F5E9' : '#FFEBEE';
        statusEl.style.color      = ok ? '#1B5E20' : '#B71C1C';
        statusEl.textContent      = msg;
    };

    if (badgeEl) badgeEl.textContent = 'Processing…';

    // Read & parse Excel in browser via donations.js XLSX engine
    try {
        if (typeof XLSX === 'undefined') {
            setStatus('❌ SheetJS not loaded. Check internet connection.', false);
            if (badgeEl) badgeEl.textContent = 'Error';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setStatus('❌ File too large. Max 10 MB.', false);
            if (badgeEl) badgeEl.textContent = 'Too Large';
            return;
        }
        const buf  = await file.arrayBuffer();
        const wb   = XLSX.read(buf, { type: 'array', cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) { setStatus('❌ Sheet is empty.', false); return; }

        const mode     = document.querySelector('input[name="quickUploadMode"]:checked')?.value || 'append';
        const endpoint = mode === 'replace' ? '/api/donations/replace' : '/api/donations/upload';

        if (badgeEl) badgeEl.textContent = `Uploading ${rows.length} rows…`;
        const res  = await fetch(`${endpoint}`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ records: rows })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            setStatus(`✅ ${data.uploaded} records uploaded! Total: ${data.total ?? data.uploaded}`, true);
            if (badgeEl) badgeEl.textContent = `✅ ${data.uploaded} Records`;
            showNotification(`✅ Donation data uploaded! ${data.uploaded} records synced.`, 'success');
            // Broadcast to all open tabs (volunteer dashboard auto-refreshes)
            try {
                const bc = new BroadcastChannel('donations_update');
                bc.postMessage({ type: 'refresh', uploaded: data.uploaded, total: data.total });
                bc.close();
            } catch (_) {}
            // Also refresh Donation Explorer if it's currently open
            if (typeof loadDonationExplorer === 'function') loadDonationExplorer();
            // Refresh Dashboard Chart
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            setStatus('❌ Server error: ' + (data.message || 'Unknown'), false);
            if (badgeEl) badgeEl.textContent = 'Upload Failed';
        }
    } catch (err) {
        setStatus('❌ Error: ' + err.message, false);
        if (badgeEl) badgeEl.textContent = 'Error';
    }
}

// ==================== LOAD DASHBOARD DATA ====================
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    try {
        // Fetch Volunteers
        fetch('/api/users').then(r => r.json()).then(data => {
            if (data.users) {
                const vols = data.users.filter(u => String(u.role).toLowerCase() === 'volunteer').length;
                const total = data.users.length;
                const el = document.getElementById('dashStatVolunteers');
                const trend = document.getElementById('dashStatVolunteersTrend');
                if (el) el.textContent = vols;
                if (trend) trend.innerHTML = `<i class="fas fa-user-check"></i> Out of ${total} total users`;
            } else {
                throw new Error('Invalid users data');
            }
        }).catch(e => {
            console.error('Volunteers load error:', e);
            const el = document.getElementById('dashStatVolunteers');
            const trend = document.getElementById('dashStatVolunteersTrend');
            if (el) el.textContent = '0';
            if (trend) trend.textContent = 'Failed to load';
        });

        // Fetch Upcoming Events
        fetch('/api/events').then(r => r.json()).then(data => {
            if (data.events) {
                const now = new Date();
                const upcoming = data.events.filter(e => new Date(e.date) >= now).length;
                const el = document.getElementById('dashStatEvents');
                const trend = document.getElementById('dashStatEventsTrend');
                if (el) el.textContent = upcoming;
                if (trend) trend.innerHTML = `<i class="fas fa-calendar-alt"></i> Scheduled`;
            } else {
                throw new Error('Invalid events data');
            }
        }).catch(e => {
            console.error('Events load error:', e);
            const el = document.getElementById('dashStatEvents');
            const trend = document.getElementById('dashStatEventsTrend');
            if (el) el.textContent = '0';
            if (trend) trend.textContent = 'Failed to load';
        });

        // Fetch Gallery Photos
        fetch('/api/gallery').then(r => r.json()).then(data => {
            if (data.photos) {
                const total = data.photos.length;
                const el = document.getElementById('dashStatGallery');
                const trend = document.getElementById('dashStatGalleryTrend');
                if (el) el.textContent = total;
                if (trend) trend.innerHTML = `<i class="fas fa-image"></i> Total uploaded`;
            } else {
                throw new Error('Invalid gallery data');
            }
        }).catch(e => {
            console.error('Gallery load error:', e);
            const el = document.getElementById('dashStatGallery');
            const trend = document.getElementById('dashStatGalleryTrend');
            if (el) el.textContent = '0';
            if (trend) trend.textContent = 'Failed to load';
        });

        // Fetch Total Donations (Entries + Pauti Books)
        Promise.all([
            fetch('/api/donation-entries').then(r => r.json()),
            fetch('/api/pauti-books').then(r => r.json())
        ]).then(([deData, pbData]) => {
            let totalSum = 0;
            // Add donation entries
            (deData.entries || []).forEach(e => {
                if (!e.deleted && e.status === 'Received') totalSum += Number(e.amount || 0);
            });
            // Add pauti slips
            (pbData.pautiBooks || []).forEach(book => {
                (book.slips || []).forEach(s => {
                    if (s.uploadedAt && !s.deleted) totalSum += Number(s.amount || 0);
                });
            });
            const el = document.getElementById('dashStatDonations');
            const trend = document.getElementById('dashStatDonationsTrend');
            if (el) el.textContent = '₹' + totalSum.toLocaleString('en-IN');
            if (trend) trend.innerHTML = `<i class="fas fa-check-circle"></i> Live collected total`;
        }).catch(e => {
            console.error('Donations load error:', e);
            const el = document.getElementById('dashStatDonations');
            const trend = document.getElementById('dashStatDonationsTrend');
            if (el) el.textContent = '₹0';
            if (trend) trend.textContent = 'Failed to load';
        });

        // Fetch Donation Analytics for Chart
        fetch('/api/donations').then(r => r.json()).then(data => {
            if (data && data.records && data.columns) {
                // Find Amount, Year, and Date columns based on heuristics
                let amtCol = null, yearCol = null, dateCol = null;
                for (const col of data.columns) {
                    const low = col.toLowerCase();
                    if (low.includes('amount')) {
                        amtCol = col;
                    } else if (!amtCol && (low.includes('rs') || low.includes('rupee') || low.includes('donation'))) {
                        amtCol = col;
                    }
                    if (!yearCol && (low.includes('year') || low === 'fy' || low.includes('financial'))) yearCol = col;
                    if (!dateCol && low.includes('date')) dateCol = col;
                }
                
                const yearlyTotals = {};
                data.records.forEach(r => {
                    if (r._deleted) return;
                    let yr = null;
                    
                    // 1. Try explicit year column
                    if (yearCol && r[yearCol]) {
                        const val = String(r[yearCol]).trim();
                        // Try 4-digit
                        const m = val.match(/\b(19|20)\d{2}\b/);
                        if (m) yr = m[0];
                        else {
                            // Try 2-digit range like 21-22
                            const m2 = val.match(/\b(\d{2})-(\d{2})\b/);
                            if (m2) yr = "20" + m2[1]; // e.g. "21-22" -> "2021"
                            else yr = val.substring(0,4); // Fallback to raw string
                        }
                    }
                    
                    // 2. Try explicit date column
                    if (!yr && dateCol && r[dateCol]) {
                        const m = String(r[dateCol]).match(/\b(19|20)\d{2}\b/);
                        if (m) yr = m[0];
                    }
                    
                    // 3. Fallback to searching any column for a 4-digit year
                    if (!yr) {
                        for (const col of data.columns) {
                            if (col === amtCol) continue;
                            const m = String(r[col] || '').match(/\b(19|20)\d{2}\b/);
                            if (m) { yr = m[0]; break; }
                        }
                    }
                    
                    if (!yr || yr === 'Unknown') return;
                    
                    // Normalize to 4 digits if possible for neatness
                    const normMatch = yr.match(/\b(19|20)\d{2}\b/);
                    if (normMatch) yr = normMatch[0];
                    
                    // Extract amount robustly
                    let amt = 0;
                    if (amtCol && r[amtCol]) {
                        const amtStr = String(r[amtCol]).replace(/[^0-9.-]+/g, '');
                        amt = parseFloat(amtStr) || 0;
                    }
                    
                    if (!yearlyTotals[yr]) yearlyTotals[yr] = 0;
                    yearlyTotals[yr] += amt;
                });
                
                const labels = Object.keys(yearlyTotals).sort();
                const amounts = labels.map(y => yearlyTotals[y]);
                
                const ctxCanvas = document.getElementById('yearlyDonationChart');
                if (ctxCanvas) {
                    const ctx = ctxCanvas.getContext('2d');
                    if (window._donationChartInst) {
                        window._donationChartInst.destroy();
                    }
                    
                    // Premium Gradient
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(46, 125, 50, 0.85)'); // Vibrant green
                    gradient.addColorStop(1, 'rgba(46, 125, 50, 0.15)');

                    window._donationChartInst = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Total Donations',
                                data: amounts,
                                backgroundColor: gradient,
                                borderColor: '#2E7D32',
                                borderWidth: 2,
                                borderRadius: 8,
                                borderSkipped: false,
                                hoverBackgroundColor: '#1B5E20'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                    titleFont: { size: 14, family: "'Inter', sans-serif" },
                                    bodyFont: { size: 15, weight: 'bold', family: "'Inter', sans-serif" },
                                    padding: 12,
                                    cornerRadius: 8,
                                    displayColors: false,
                                    callbacks: {
                                        label: function(context) {
                                            return '₹ ' + context.parsed.y.toLocaleString('en-IN');
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                                    ticks: {
                                        font: { size: 12, family: "'Inter', sans-serif", color: '#666' },
                                        callback: function(value) {
                                            if (value >= 10000000) return '₹' + (value/10000000).toFixed(1) + 'Cr';
                                            if (value >= 100000) return '₹' + (value/100000).toFixed(1) + 'L';
                                            if (value >= 1000) return '₹' + (value/1000).toFixed(0) + 'K';
                                            return '₹' + value;
                                        }
                                    }
                                },
                                x: {
                                    grid: { display: false, drawBorder: false },
                                    ticks: { font: { size: 13, weight: '600', family: "'Inter', sans-serif", color: '#444' } }
                                }
                            },
                            animation: {
                                duration: 1200,
                                easing: 'easeOutQuart'
                            }
                        }
                    });
                }

            }
        }).catch(e => console.error('Analytics load error:', e));
        
    } catch (err) {
        console.error('Error in loadDashboardData:', err);
    }
}


// ==================== DONATION TRACKING LIVE CARDS ====================
async function loadDonationTrackingCards() {
    try {
        const res = await fetch('/api/donation-entries');
        const data = await res.json();
        const allSlips = data.entries || [];

        const withAmt = allSlips.filter(s => s.status === 'Received');
        const withoutAmt = allSlips.filter(s => s.status !== 'Received' && (s.status === 'Balance' || s.paymentMode === 'Balance' || s.status === 'Pending'));

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

// Navigate to Balance Recovery and select a tab
function navToBalanceRecovery(tab) {
    showAdminSection('balanceRecovery');
    // Delay slightly so the section renders first
    setTimeout(() => switchBrTab(tab), 80);
}

// ==================== BALANCE RECOVERY TABS ====================
let _brCurrentTab = 'pending';

function switchBrTab(tab) {
    _brCurrentTab = tab;
    const tabPending  = document.getElementById('brTabPending');
    const tabReceived = document.getElementById('brTabReceived');
    const panelP = document.getElementById('brPanelPending');
    const panelR = document.getElementById('brPanelReceived');
    const activeStyle   = `padding:10px 24px;border:none;background:none;font-size:.92rem;font-weight:600;color:var(--primary-color);border-bottom:3px solid var(--primary-color);cursor:pointer;`;
    const inactiveStyle = `padding:10px 24px;border:none;background:none;font-size:.92rem;font-weight:600;color:#999;border-bottom:3px solid transparent;cursor:pointer;`;
    if (tab === 'pending') {
        if (tabPending)  tabPending.style.cssText  = activeStyle;
        if (tabReceived) tabReceived.style.cssText = inactiveStyle;
        if (panelP) panelP.style.display = '';
        if (panelR) panelR.style.display = 'none';
        loadBalanceRecovery();
    } else {
        if (tabPending)  tabPending.style.cssText  = inactiveStyle;
        if (tabReceived) tabReceived.style.cssText = activeStyle;
        if (panelP) panelP.style.display = 'none';
        if (panelR) panelR.style.display = '';
        loadBrReceivedBreakdown();
    }
}

async function loadBrReceivedBreakdown() {
    const totalEl   = document.getElementById('brReceivedTotal');
    const countEl   = document.getElementById('brReceivedSlipCount');
    const tbodyEl   = document.getElementById('brReceivedBreakdownTbody');
    if (!tbodyEl) return;
    tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px;">Loading&hellip;</td></tr>';
    try {
        // Fetch all receipts and donation entries to find "Received" slips
        const [pbRes, rcRes, deRes] = await Promise.all([
            fetch('/api/pauti-books').catch(()=>({json:()=>({pautiBooks:[]})})),
            fetch('/api/receipts').catch(()=>({json:()=>({receipts:[]})})),
            fetch('/api/donation-entries').catch(()=>({json:()=>({entries:[]})}))
        ]);
        const pbData = await pbRes.json();
        const rcData = await rcRes.json();
        const deData = await deRes.json();

        const allSlips = [];
        
        // Pauti Slips
        (pbData.pautiBooks || []).forEach(book => {
            (book.slips || []).forEach(slip => {
                const getStatus = s => (s.status || (String(s.paymentMode).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
                if (slip.uploadedAt && !slip.deleted && getStatus(slip) === 'received' && slip.amount && Number(slip.amount) > 0) {
                    allSlips.push({
                        receiptId  : `SLIP-${slip.slipNumber}`,
                        name       : slip.donorName || '—',
                        amount     : slip.amount || 0,
                        passbookUrl: slip.photoUrl || null,
                        status     : slip.status || 'received',
                        type       : 'pauti-slip',
                        paymentMode: slip.paymentMode || 'cash',
                        _slipNum   : slip.slipNumber,
                        _bookId    : book.pautiBookId,
                        bookNumber : book.bookNumber,
                        receiptNumber: slip.slipNumber
                    });
                }
            });
        });

        // Regular Receipts
        (rcData.receipts || []).forEach(r => {
            const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
            if (!r.deleted && getStatus(r) === 'received') {
                allSlips.push({
                    ...r,
                    receiptNumber: r.receiptNumber,
                    bookNumber: r.bookNumber
                });
            }
        });

        // Donation Entries
        (deData.entries || []).forEach(e => {
            const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
            if (!e.deleted && getStatus(e) === 'received') {
                const donor = e.donorType === 'Business' ? (e.businessName || '—') : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
                allSlips.push({
                    receiptId  : e.entryId || ('DE-' + e.receiptNumber),
                    name       : donor,
                    amount     : e.amount || 0,
                    passbookUrl: e.photoUrl || null,
                    status     : e.status || 'received',
                    type       : 'donation-entry',
                    paymentMode: e.paymentMode,
                    _bookNum   : e.bookNumber,
                    _recNum    : e.receiptNumber,
                    bookNumber : e.bookNumber,
                    receiptNumber: e.receiptNumber
                });
            }
        });

        // Sort by Book Number then Receipt Number
        allSlips.sort((a, b) => {
            if (a.bookNumber !== b.bookNumber) return (a.bookNumber || 0) - (b.bookNumber || 0);
            return (a.receiptNumber || 0) - (b.receiptNumber || 0);
        });

        const total = allSlips.reduce((s, x) => s + Number(x.amount), 0);
        const fmt   = n => '₹' + Number(n).toLocaleString('en-IN');
        if (totalEl) totalEl.textContent = fmt(total);
        if (countEl) countEl.textContent = allSlips.length;

        if (allSlips.length === 0) {
            tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px;">No received slips found.</td></tr>';
            return;
        }

        window._brHistoryStore = window._brHistoryStore || {};

        tbodyEl.innerHTML = allSlips.map(r => {
            const safeId   = (r.receiptId||'').replace(/'/g, "\\'");
            const safeName = (r.name || '').replace(/'/g, "\\'");
            const safePhoto = (r.passbookUrl||'').replace(/'/g,"\\'");
            const editBtn = `<button class="btn-icon btn-edit" title="Edit Entry" onclick="openBrEditModal('${safeId}','${safeName}',${r.amount||0},'${r.paymentMode||'cash'}','${r.status||'received'}',${r.bookNumber||r._bookNum||0},${r.receiptNumber||r._recNum||r._slipNum||0},'${safePhoto}','${r.type}','${r._bookId||''}')"><i class="fas fa-edit"></i></button>`;
            const delBtn = `<button class="btn-icon btn-delete" title="Delete" onclick="softDeleteReceipt('${safeId}','${safeName}')"><i class="fas fa-trash"></i></button>`;
            
            return `<tr>
                <td style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safeName || '—'}">${safeName || '—'}</td>
                <td>${r.bookNumber || '—'}</td>
                <td>${r.receiptNumber || '—'}</td>
                <td><strong style="color:#1B5E20;">${fmt(r.amount)}</strong></td>
                <td><div class="action-btns">${editBtn}${delBtn}</div></td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error(e);
        if (tbodyEl) tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#c0392b;padding:20px;">⚠ Cannot reach server.</td></tr>';
    }
}
function saveBrOverride() {
    const input = document.getElementById('brOverrideInput');
    const val   = parseFloat(input?.value || '');
    if (isNaN(val) || val < 0) {
        showNotification('Please enter a valid positive amount.', 'error');
        return;
    }
    const totalEl = document.getElementById('brReceivedTotal');
    if (totalEl) totalEl.textContent = '₹' + val.toLocaleString('en-IN');
    showNotification('Override amount saved: ₹' + val.toLocaleString('en-IN'), 'success');
}

// ==================== DONATION DATA MANAGEMENT ====================
async function deleteDonationData() {
    const count = await (async () => {
        try {
            const r = await fetch('/api/donations');
            const d = await r.json();
            return (d.records || []).filter(x => !x._deleted).length;
        } catch { return '?'; }
    })();
    if (!confirm(`⚠ Delete ALL ${count} donation record(s)?\n\nThis will clear the entire Donation Explorer database. This action cannot be undone.\n\nClick OK to confirm.`)) return;
    try {
        const res  = await fetch('/api/donations', { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification(`🗑 ${data.deleted} donation record(s) deleted.`, 'success');
            if (typeof loadDonationExplorer === 'function') loadDonationExplorer();
        } else {
            showNotification('Error: ' + (data.message || 'Delete failed.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server.', 'error');
    }
}

// ==================== MODAL FUNCTIONS ====================
function openModal(modalType) {
    const modal = document.getElementById(modalType + 'Modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalType) {
    const modal = document.getElementById(modalType + 'Modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// ==================== USER MANAGEMENT ====================
const addUserForm = document.getElementById('addUserForm');
if (addUserForm) {
    addUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
            name      : formData.get('name'),
            username  : formData.get('username'),
            email     : formData.get('email'),
            role      : formData.get('role'),
            password  : formData.get('password'),
            department: formData.get('department'),
        };
        const btn = document.getElementById('auSubmitBtn');
        const st  = document.getElementById('auStatus');
        if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
        if (st)  { st.style.display = 'none'; }
        try {
            const res  = await fetch('/api/users', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify(userData)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showNotification(`✅ User "${userData.username}" added successfully!`, 'success');
                closeModal('addUser');
                e.target.reset();
                loadUsers();
            } else {
                if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent = data.message || 'Could not add user.'; }
            }
        } catch (err) {
            if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent = 'Cannot reach server.'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Add User'; }
        }
    });
}

const editUserForm = document.getElementById('editUserForm');
if (editUserForm) {
    editUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const originalUsername = formData.get('originalUsername');
        const userData = {
            name      : formData.get('name'),
            username  : formData.get('username'),
            email     : formData.get('email'),
            role      : formData.get('role'),
            password  : formData.get('password'),
            department: formData.get('department'),
        };
        const btn = document.getElementById('euSubmitBtn');
        const st  = document.getElementById('euStatus');
        if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
        if (st)  { st.style.display = 'none'; }
        try {
            const res  = await fetch(`/api/users/${encodeURIComponent(originalUsername)}`, {
                method : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify(userData)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showNotification(`✅ User "${userData.username}" updated successfully!`, 'success');
                closeModal('editUser');
                loadUsers();
            } else {
                if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent = data.message || 'Could not update user.'; }
            }
        } catch (err) {
            if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent = 'Cannot reach server.'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
        }
    });
}

// ==================== LOAD USERS ====================
async function loadUsers() {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) return;
    userTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px;">Loading…</td></tr>';
    try {
        const res  = await fetch('/api/users');
        const data = await res.json();
        const allUsers = data.users || [];
        if (allUsers.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px;">No users found.</td></tr>';
            return;
        }
        userTableBody.innerHTML = allUsers.map(user => {
            const roleBg  = { admin:'#EDE7F6', volunteer:'#E3F2FD', committee:'#E8F5E9' };
            const roleClr = { admin:'#4527A0', volunteer:'#1565C0', committee:'#1B5E20' };
            const roleBadge = `<span style="padding:2px 9px;border-radius:10px;background:${roleBg[user.role]||'#f5f5f5'};color:${roleClr[user.role]||'#555'};font-size:.78rem;font-weight:700;">${(user.role||'').toUpperCase()}</span>`;
            const statusBadge = user.blocked
                ? '<span class="badge" style="background:#FFEBEE;color:#c0392b;">🔒 Blocked</span>'
                : '<span class="badge badge-success">✅ Active</span>';
            const safeUser = escHtml(user.username);
            return `<tr>
                <td>${escHtml(user.name || user.username)}</td>
                <td><code style="font-size:.85rem;">${safeUser}</code></td>
                <td>${escHtml(user.email || '—')}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td><div class="action-btns">
                    <button class="btn-icon btn-edit" title="Edit User" onclick="editUser('${safeUser}', '${escHtml(user.name||user.username)}', '${escHtml(user.email||'')}', '${escHtml(user.role||'')}', '${escHtml(user.department||'')}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" title="Delete User" onclick="deleteUser('${safeUser}','${escHtml(user.name||user.username)}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div></td>
            </tr>`;
        }).join('');
    } catch (err) {
        userTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c00;padding:20px;">⚠ Cannot reach server.</td></tr>';
    }
}

// ==================== DELETE USER ====================
async function deleteUser(username, name) {
    if (!confirm(`Delete user "${name}" (${username})?\n\nThey will no longer be able to log in.`)) return;
    try {
        const res  = await fetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification(`🗑️ User "${username}" deleted.`, 'success');
            loadUsers();
        } else {
            showNotification('Error: ' + (data.message || 'Could not delete.'), 'error');
        }
    } catch (err) {
        showNotification('Cannot reach server.', 'error');
    }
}

// ==================== EDIT USER ====================
function editUser(username, name, email, role, department) {
    const form = document.getElementById('editUserForm');
    if (!form) return;
    form.reset();
    
    document.getElementById('euOriginalUsername').value = username;
    document.getElementById('euUsername').value = username;
    document.getElementById('euName').value = name;
    document.getElementById('euEmail').value = email;
    document.getElementById('euRole').value = role.toLowerCase();
    document.getElementById('euDept').value = department;
    
    const st = document.getElementById('euStatus');
    if (st) st.style.display = 'none';
    
    openModal('editUser');
}

// ==================== EXPORT DATA ====================
function exportData(type) {
    alert('Exporting ' + type + ' data...');
    // In real application, generate and download CSV/PDF file
}

// ==================== GENERATE REPORT ====================
function generateReport(reportType) {
    alert('Generating ' + reportType + ' report...');
    // In real application, generate PDF report
}

// ==================== RESPONSIVE TABLE HELPER ====================
// Automatically injects data-label for mobile card view tables
const observeTables = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    for (let m of mutations) {
        if (m.addedNodes.length > 0) shouldUpdate = true;
    }
    if (shouldUpdate) {
        document.querySelectorAll('table.admin-table, table.fin-table, table.table').forEach(table => {
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
            table.querySelectorAll('tbody tr').forEach(row => {
                row.querySelectorAll('td').forEach((cell, i) => {
                    if (headers[i] && !cell.hasAttribute('data-label')) {
                        cell.setAttribute('data-label', headers[i]);
                    }
                });
            });
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    observeTables.observe(document.body, { childList: true, subtree: true });
});
// ==================== ADMIN LOGOUT ====================
function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('currentUser');  // clear any stale old entry
        window.location.href = 'index.html';
    }
}

// ==================== MOBILE SIDEBAR TOGGLE ====================
function toggleAdminSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('adminSidebarOverlay');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('mobile-open');
    if (isOpen) {
        sidebar.classList.remove('sidebar-open');
        sidebar.classList.remove('mobile-open');
        if (overlay) overlay.style.display = 'none';
    } else {
        sidebar.classList.add('sidebar-open');
        sidebar.classList.add('mobile-open');
        if (overlay) overlay.style.display = 'block';
    }
}

function closeAdminSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('adminSidebarOverlay');
    if (sidebar) {
        sidebar.classList.remove('sidebar-open');
        sidebar.classList.remove('mobile-open');
    }
    if (overlay) overlay.style.display = 'none';
}

// ==================== SEARCH FUNCTIONALITY ====================
function searchTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    
    if (!input || !table) return;
    
    input.addEventListener('keyup', function() {
        const filter = input.value.toUpperCase();
        const rows = table.getElementsByTagName('tr');
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('td');
            let found = false;
            
            for (let j = 0; j < cells.length; j++) {
                const cell = cells[j];
                if (cell) {
                    const textValue = cell.textContent || cell.innerText;
                    if (textValue.toUpperCase().indexOf(filter) > -1) {
                        found = true;
                        break;
                    }
                }
            }
            
            row.style.display = found ? '' : 'none';
        }
    });
}

// ==================== UPLOAD HANDLER ====================
function handleFileUpload(inputElement, fileType) {
    const file = inputElement.files[0];
    if (file) {
        // Validate file type
        const validTypes = {
            'image': ['image/jpeg', 'image/png', 'image/gif'],
            'document': ['application/pdf', 'application/msword'],
            'excel': ['application/vnd.ms-excel', 'text/csv']
        };
        
        if (validTypes[fileType] && !validTypes[fileType].includes(file.type)) {
            alert('Invalid file type!');
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB!');
            return;
        }
        
        console.log('File selected:', file.name);
        // In real application, upload to server
        alert('File uploaded successfully: ' + file.name);
    }
}

// ==================== STATISTICS UPDATE ====================
function updateStatistics() {
    // Update dashboard statistics
    const stats = {
        volunteers: 150,
        donations: 550000,
        events: 12,
        photos: 245
    };
    
    console.log('ðŸ“ˆ Statistics updated:', stats);
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#27AE60' : type === 'error' ? '#E74C3C' : '#3498DB'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== INITIALIZE ON LOAD ====================
console.log('ðŸŽ¯ Admin.js loaded successfully');
console.log('Admin.js loaded. User:', JSON.parse(sessionStorage.getItem('currentUser') || '{}').name);

// =====================================================================
// PASSBOOK RECEIPTS â€” Admin panel (NEW)
// =====================================================================

// â”€ Lightbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openAdminPbLightbox(url) {
    const lb  = document.getElementById('adminPbLightbox');
    const img = document.getElementById('adminPbLightboxImg');
    if (!lb || !img) return;
    img.src = url;
    lb.classList.add('active');
}
function closeAdminPbLightbox() {
    const lb = document.getElementById('adminPbLightbox');
    if (lb) lb.classList.remove('active');
    const img = document.getElementById('adminPbLightboxImg');
    if (img) img.src = '';
}
document.addEventListener('DOMContentLoaded', function () {
    const lb = document.getElementById('adminPbLightbox');
    if (lb) lb.addEventListener('click', function (e) {
        if (e.target === this) closeAdminPbLightbox();
    });
    const em = document.getElementById('adminEditModal');
    if (em) em.addEventListener('click', function (e) {
        if (e.target === this) closeAdminEdit();
    });
});

// â”€ Edit Amount modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _admEditReceiptId = null;

function openAdminEdit(receiptId, currentAmount) {
    _admEditReceiptId = receiptId;
    const sub = document.getElementById('admEditSubtitle');
    if (sub) sub.textContent = 'Receipt: ' + receiptId;
    const inp = document.getElementById('admEditAmountInput');
    if (inp) inp.value = (currentAmount !== null && currentAmount !== undefined) ? currentAmount : '';
    const modal = document.getElementById('adminEditModal');
    if (modal) modal.classList.add('active');
}

function closeAdminEdit() {
    _admEditReceiptId = null;
    const modal = document.getElementById('adminEditModal');
    if (modal) modal.classList.remove('active');
}

async function saveAdminEditAmount() {
    const newAmt = Number(document.getElementById('admEditAmountInput')?.value);
    if (!_admEditReceiptId || isNaN(newAmt) || newAmt <= 0) {
        showNotification('Please enter a valid positive amount.', 'error');
        return;
    }
    const btn = document.getElementById('admEditSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Savingâ€¦'; }
    try {
        const res = await fetch(
            `/api/receipts/${encodeURIComponent(_admEditReceiptId)}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: newAmt })
            }
        );
        const data = await res.json();
        if (res.ok && data.success) {
            closeAdminEdit();
            showNotification('Amount updated successfully!', 'success');
            loadAdminReceipts();
        } else {
            showNotification('Error: ' + (data.message || 'Could not save.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server. Is server.js running?', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    }
}

// â”€ Clear Amount (PATCH) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function clearAdminAmount(receiptId, donorName) {
    const confirmed = confirm(
        `Clear the donation amount for "${donorName}" (${receiptId})?

This will set the amount to empty.\nThe record, name, and passbook file will NOT be deleted.`
    );
    if (!confirmed) return;
    try {
        const res = await fetch(
            `/api/receipts/${encodeURIComponent(receiptId)}/clear-amount`,
            { method: 'PATCH' }
        );
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification(`Amount cleared for ${donorName}. Record is intact.`, 'success');
            loadAdminReceipts();
        } else {
            showNotification('Error: ' + (data.message || 'Could not clear amount.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server. Is server.js running?', 'error');
    }
}

// â”€ Load receipts table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadAdminReceipts() {
    const tbody    = document.getElementById('adminReceiptsTbody');
    const statusEl = document.getElementById('adminReceiptsStatus');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#aaa;padding:24px;">Loading…</td></tr>';
    if (statusEl) statusEl.style.display = 'none';
    try {
        const res  = await fetch('/api/receipts');
        const data = await res.json();
        // Exclude soft-deleted and balance-type from the normal receipts view
        const list = (data.receipts || []).filter(r => !r.deleted && r.type !== 'balance');
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#aaa;padding:24px;">No receipts found.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(r => {
            const dateStr    = new Date(r.submittedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
            const amtDisplay = (r.amount !== null && r.amount !== undefined)
                ? '₹' + Number(r.amount).toLocaleString('en-IN')
                : '<span style="color:#ccc;">—</span>';
            // Editable Mode dropdown
            const safeRId = r.receiptId.replace(/'/g, "\\'");
            const modes   = ['cash','upi','check','online'];
            const modeSelect = `<select id="modeSelect_${r.receiptId}"
                onchange="updateReceiptMode('${safeRId}', this.value)"
                style="padding:4px 8px;border:1.5px solid #e0e0e0;border-radius:6px;font-size:.82rem;cursor:pointer;background:#fff;">
                ${modes.map(m => `<option value="${m}" ${(r.paymentMode||'cash')===m?'selected':''}>${m.toUpperCase()}</option>`).join('')}
            </select>`;
            const checkCell  = r.paymentMode === 'check' && r.checkNumber ? `<code style="font-size:.85rem;">${escHtml(r.checkNumber)}</code>` : '<span style="color:#ccc;">—</span>';
            const typeCell   = r.type === 'balance' ? '<span class="badge badge-warning">Balance</span>' : '<span class="badge badge-info">Slip</span>';
            const statusBadge = r.status === 'pending_review'
                ? '<span class="badge badge-warning">Pending</span>'
                : `<span class="badge badge-success">${r.status}</span>`;
            const isPdf  = r.passbookFile && r.passbookFile.toLowerCase().match(/\.pdf$/);
            const hasFile = !!r.passbookUrl;
            const viewBtn = hasFile
                ? (isPdf
                    ? `<button class="btn-icon btn-edit" title="Open PDF" onclick="window.open('${r.passbookUrl}','_blank')"><i class="fas fa-file-pdf"></i></button>`
                    : `<button class="btn-icon btn-edit" title="View Image" onclick="openAdminPbLightbox('${r.passbookUrl}')"><i class="fas fa-image"></i></button>`)
                : '<span style="color:#ccc;font-size:.8rem;">—</span>';
            const safeAmt  = (r.amount !== null && r.amount !== undefined) ? r.amount : 0;
            const safeName = (r.name || '').replace(/'/g, "\\'");
            return `
            <tr>
                <td class="pb-receipt-id">${r.receiptId}</td>
                <td>${r.name || '—'}</td>
                <td>${amtDisplay}</td>
                <td>${modeSelect}</td>
                <td>${checkCell}</td>
                <td>${typeCell}</td>
                <td>${dateStr}</td>
                <td>${statusBadge}</td>
                <td>${viewBtn}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" title="Edit Amount"
                                onclick="openAdminEdit('${r.receiptId}', ${safeAmt})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" title="Clear Amount (keeps record)"
                                style="background:#FFF3E0;color:#E65100;"
                                onclick="clearAdminAmount('${r.receiptId}', '${safeName}')">
                            <i class="fas fa-eraser"></i>
                        </button>
                        <button class="btn-icon btn-delete" title="Soft Delete (data kept)"
                                onclick="softDeleteReceipt('${r.receiptId}', '${safeName}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#c0392b;padding:24px;">⚠ Could not load receipts. Is server.js running on port 3000?</td></tr>';
    }
}

// ── Inline update receipt payment mode ──────────────────────────────────────
async function updateReceiptMode(receiptId, newMode) {
    try {
        const payload = { paymentMode: newMode };
        // If switching away from check, clear checkNumber
        if (newMode !== 'check') payload.checkNumber = null;
        const res  = await fetch(`/api/receipts/${encodeURIComponent(receiptId)}`, {
            method : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification(`Payment mode updated to ${newMode.toUpperCase()}.`, 'success');
            // Refresh to update check # cell display
            loadAdminReceipts();
        } else {
            showNotification('Error: ' + (data.message || 'Could not update mode.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server.', 'error');
    }
}

// =====================================================================
// EXPENSES MANAGEMENT
// =====================================================================

// â”€â”€â”€ Category â†’ Subcategory map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EXP_SUBCATS = {
    'Advertising and Printing': [
        'Awal/Pavti Book Printing',
        'Awal/Pavti/Banner Design',
        'Banner Printing',
        'Wooden Frame for Banner',
        'Stationary Expenses',
        'Other Expenses'
    ],
    'Ganpati Expenses': [
        'Ganpati Murthy Expense',
        'Ganpati Paat Expense',
        'Ganpati Visarjan Expense (Mandvi Gali)',
        'Forklift Expense',
        'Other Expense'
    ],
    'Mandap and Decoration Expense': [
        'Ganpati Mandap Expense',
        'Ganpati Decoration Expense',
        'Ganpati Mandap Labour Food Expense',
        'Other Expense'
    ],
    'Electricity Expense': [
        'Meter Connection Expense',
        'Other Expense'
    ],
    'Transportation Expense': [
        'Tempo Expense',
        'Towing Van Expense',
        'Generator Expense',
        'Diesel and Petrol Expense',
        'Other Expense'
    ],
    'Sound and Banjo Expense': null,   // special â€” handled separately
    'Satyanarayan Pooja and Pooja Expense': [
        'Prasad',
        'Bhaatji Dakshina',
        'Pooja Samagri',
        'Other Expenses'
    ],
    'Ganpati Aagman': [
        'Food Expenses',
        'Other Expenses'
    ],
    'Ganpati Visarjan': [
        'Food Expenses',
        'Other Expenses'
    ],
    'Other Expenses': []  // standalone â€” reason field shown immediately
};

// Subcategory values that trigger the reason/free-text field
const EXP_OTHER_NAMES = ['Other Expense', 'Other Expenses'];

// â”€â”€â”€ In-memory cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _expensesList   = [];
let _editExpenseId  = null;

// â”€â”€â”€ Load from server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadExpenses() {
    const tbody = document.getElementById('expensesTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:24px;">Loadingâ€¦</td></tr>';
    try {
        const res  = await fetch('/api/expenses');
        const data = await res.json();
        _expensesList = data.expenses || [];
        renderExpensesTable();
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#c0392b;padding:24px;">âš  Could not load expenses. Is server.js running on port 3000?</td></tr>';
    }
}

// â”€â”€â”€ Filter + render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getFilteredExpenses() {
    const q    = (document.getElementById('expFilterSearch')?.value  || '').toLowerCase();
    const cat  = (document.getElementById('expFilterCategory')?.value || '');
    const from = document.getElementById('expFilterFrom')?.value || '';
    const to   = document.getElementById('expFilterTo')?.value   || '';

    return _expensesList.filter(e => {
        if (cat  && e.category !== cat) return false;
        if (from && e.date < from)       return false;
        if (to   && e.date > to)         return false;
        if (q) {
            const hay = [
                e.particulars, e.referenceNumber,
                e.commonHeader, e.subcategory,
                e.reason, e.category,
                e.serialNumber
            ].join(' ').toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

function renderExpensesTable() {
    const tbody   = document.getElementById('expensesTbody');
    const fTotal  = document.getElementById('expFooterTotal');
    const fCount  = document.getElementById('expFilteredCount');
    const fAmt    = document.getElementById('expFilteredTotal');
    const gTotal  = document.getElementById('expGrandTotal');
    const gCount  = document.getElementById('expEntryCount');
    if (!tbody) return;

    // Grand totals (all records)
    const grandAmt = _expensesList.reduce((s, e) => s + Number(e.amount || 0), 0);
    if (gTotal) gTotal.textContent = '\u20b9' + grandAmt.toLocaleString('en-IN');
    if (gCount) gCount.textContent = _expensesList.length;

    const filtered = getFilteredExpenses();
    const filtAmt  = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
    const fmt = n => '\u20b9' + Number(n).toLocaleString('en-IN');

    if (fTotal) fTotal.textContent = fmt(filtAmt);
    if (fCount) fCount.textContent = filtered.length;
    if (fAmt)   fAmt.textContent   = fmt(filtAmt);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:30px;">No matching expense records found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(e => {
        // Build subcategory display string
        let subcatDisplay = e.subcategory || 'â€”';
        if (e.category === 'Sound and Banjo Expense') {
            subcatDisplay = [e.subcategory, e.soundEvent ? `(${e.soundEvent})` : ''].filter(Boolean).join(' ');
        }
        // Append reason if present
        const reasonHtml = e.reason
            ? `<br><small style="color:#888;font-style:italic;">${escHtml(e.reason)}</small>`
            : '';

        const dateDisp = e.date
            ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})
            : 'â€”';

        const safeId = e.expenseId.replace(/'/g, "\\'");

        return `
        <tr>
            <td>${escHtml(e.serialNumber || '')}</td>
            <td style="white-space:nowrap;">${dateDisp}</td>
            <td>${escHtml(e.commonHeader || '')}</td>
            <td><span class="exp-cat-badge">${escHtml(e.category)}</span></td>
            <td>${escHtml(subcatDisplay)}${reasonHtml}</td>
            <td>${escHtml(e.particulars || '')}</td>
            <td style="font-size:.85rem;color:#888;">${escHtml(e.referenceNumber || '')}</td>
            <td style="font-weight:600;">${fmt(e.amount)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" title="Edit"
                            onclick="editExpense('${safeId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" title="Delete"
                            onclick="deleteExpense('${safeId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function clearExpenseFilters() {
    const ids = ['expFilterSearch','expFilterCategory','expFilterFrom','expFilterTo'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    renderExpensesTable();
}

// â”€â”€â”€ Modal open / close â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openExpenseModal(record) {
    _editExpenseId = record ? record.expenseId : null;
    const title = document.getElementById('expModalTitle');
    if (title) title.innerHTML = _editExpenseId
        ? '<i class="fas fa-edit" style="color:var(--primary-color);margin-right:8px;"></i>Edit Expense'
        : '<i class="fas fa-plus-circle" style="color:var(--primary-color);margin-right:8px;"></i>Add Expense';

    // Reset all fields
    document.getElementById('expDate').value        = record ? record.date          : '';
    document.getElementById('expSerialNo').value    = record ? record.serialNumber  : '';
    document.getElementById('expCommonHeader').value= record ? record.commonHeader  : '';
    document.getElementById('expRefNo').value       = record ? record.referenceNumber: '';
    document.getElementById('expParticulars').value = record ? record.particulars   : '';
    document.getElementById('expCategory').value    = record ? record.category      : '';
    document.getElementById('expAmount').value      = record ? record.amount        : '';

    onExpCategoryChange(record);

    document.getElementById('expenseModal').classList.add('active');
}

function closeExpenseModal() {
    _editExpenseId = null;
    document.getElementById('expenseModal').classList.remove('active');
    document.getElementById('expenseForm').reset();
    onExpCategoryChange();
}

// Close expenses modal on backdrop click
document.addEventListener('DOMContentLoaded', function() {
    const em = document.getElementById('expenseModal');
    if (em) em.addEventListener('click', function(e) {
        if (e.target === this) closeExpenseModal();
    });
});

// â”€â”€â”€ Category change handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function onExpCategoryChange(record) {
    const cat   = document.getElementById('expCategory')?.value || '';
    const subs  = EXP_SUBCATS[cat];
    const isSB  = cat === 'Sound and Banjo Expense';
    const isOtherCat = cat === 'Other Expenses';

    // Show/hide sections
    document.getElementById('expSubcatSection').style.display   = (!isSB && !isOtherCat && cat) ? '' : 'none';
    document.getElementById('expSoundBanjoSection').style.display = isSB ? '' : 'none';

    // Populate subcategory dropdown
    if (!isSB && !isOtherCat && subs) {
        const sel = document.getElementById('expSubcategory');
        sel.innerHTML = '<option value="">-- Select Subcategory --</option>' +
            subs.map(s => `<option${record && record.subcategory === s ? ' selected' : ''}>${s}</option>`).join('');
        if (record) sel.value = record.subcategory || '';
    }

    // Populate Sound & Banjo fields
    if (isSB && record) {
        const se = document.getElementById('expSoundEvent');
        const st = document.getElementById('expSoundType');
        if (se) se.value = record.soundEvent  || '';
        if (st) st.value = record.subcategory || '';
    }

    // Reason: show for standalone Other Expenses cat immediately
    if (isOtherCat) {
        document.getElementById('expReasonSection').style.display = '';
        if (record) document.getElementById('expReason').value = record.reason || '';
    } else {
        onExpSubcategoryChange(record);
    }
}

function onExpSubcategoryChange(record) {
    const cat   = document.getElementById('expCategory')?.value || '';
    const isSB  = cat === 'Sound and Banjo Expense';
    const subVal = isSB
        ? (document.getElementById('expSoundType')?.value || '')
        : (document.getElementById('expSubcategory')?.value || '');

    const needReason = EXP_OTHER_NAMES.includes(subVal);
    document.getElementById('expReasonSection').style.display = needReason ? '' : 'none';
    if (needReason && record) {
        document.getElementById('expReason').value = record.reason || '';
    } else if (!needReason) {
        const el = document.getElementById('expReason');
        if (el) el.value = '';
    }
}

// â”€â”€â”€ Edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function editExpense(id) {
    const record = _expensesList.find(e => e.expenseId === id);
    if (!record) return;
    openExpenseModal(record);
}

// â”€â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function deleteExpense(id) {
    const record = _expensesList.find(e => e.expenseId === id);
    const label  = record ? `${record.category} / ${record.subcategory || 'N/A'} â€” \u20b9${record.amount}` : id;
    if (!confirm(`Delete this expense record?\n\n${label}\n\nThis cannot be undone.`)) return;
    try {
        const res  = await fetch(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification('Expense deleted.', 'success');
            loadExpenses();
        } else {
            showNotification('Error: ' + (data.message || 'Could not delete.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server. Is server.js running?', 'error');
    }
}

// â”€â”€â”€ Save (add / edit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function saveExpenseRecord(ev) {
    ev.preventDefault();
    const cat   = document.getElementById('expCategory').value.trim();
    const isSB  = cat === 'Sound and Banjo Expense';
    const isOC  = cat === 'Other Expenses';

    let subcategory = '';
    let soundEvent  = null;

    if (isSB) {
        soundEvent  = document.getElementById('expSoundEvent').value.trim();
        subcategory = document.getElementById('expSoundType').value.trim();
        if (!soundEvent || !subcategory) {
            showNotification('Please select an Event and Expense Type for Sound & Banjo.', 'error');
            return;
        }
    } else if (!isOC) {
        subcategory = document.getElementById('expSubcategory').value.trim();
        if (!subcategory) {
            showNotification('Please select a subcategory.', 'error');
            return;
        }
    }

    const needReason = isOC || EXP_OTHER_NAMES.includes(subcategory);
    const reason = needReason ? document.getElementById('expReason').value.trim() : '';
    if (needReason && !reason) {
        showNotification('Please enter a reason / description for Other Expenses.', 'error');
        return;
    }

    const payload = {
        date           : document.getElementById('expDate').value,
        serialNumber   : document.getElementById('expSerialNo').value.trim(),
        particulars    : document.getElementById('expParticulars').value.trim(),
        commonHeader   : document.getElementById('expCommonHeader').value.trim(),
        referenceNumber: document.getElementById('expRefNo').value.trim(),
        category       : cat,
        subcategory,
        soundEvent,
        reason,
        amount         : Number(document.getElementById('expAmount').value)
    };

    const btn = document.getElementById('expSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Savingâ€¦'; }

    try {
        const url    = _editExpenseId
            ? `/api/expenses/${encodeURIComponent(_editExpenseId)}`
            : '/api/expenses';
        const method = _editExpenseId ? 'PUT' : 'POST';
        const res    = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeExpenseModal();
            showNotification(
                _editExpenseId ? 'Expense updated successfully!' : 'Expense added successfully!',
                'success'
            );
            loadExpenses();
        } else {
            showNotification('Error: ' + (data.message || 'Could not save.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server. Is server.js running?', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Expense'; }
    }
}

// ── Excel Export for Expenses ──────────────────────────────────────────
function exportExpensesExcel() {
    const list = getFilteredExpenses();
    if (list.length === 0) {
        showNotification('No expense records to export.', 'error');
        return;
    }

    const orgName  = 'Patelwadi Sarvajnik Ganesh Mitra Mandal';
    const exportDt = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const rupee = n => Number(n || 0).toFixed(2);

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Expenses</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  .title  { font-size:16pt; font-weight:bold; color:#2C3E50; }
  .sub    { font-size:10pt; color:#7F8C8D; }
  th { background:#2C3E50; color:#fff; font-weight:bold; text-align:center; border:1px solid #ccc; padding:6px 10px; }
  td { border:1px solid #ddd; padding:5px 8px; text-align:center; }
  .num { text-align:center; mso-number-format:"#,##0.00"; }
</style>
</head><body>
<p class="title">${orgName}</p>
<p class="sub">Expense Records &mdash; Exported on ${exportDt}</p>
<br>
<table>
<thead>
<tr>
  <th>Serial Number</th>
  <th>Date</th>
  <th>Common Header</th>
  <th>Category</th>
  <th>Subcategory</th>
  <th>Particulars</th>
  <th>Reference Number</th>
  <th>Amount (₹)</th>
</tr>
</thead>
<tbody>`;

    list.forEach(r => {
        let subcatDisplay = r.subcategory || '—';
        if (r.category === 'Sound and Banjo Expense') {
            subcatDisplay = [r.subcategory, r.soundEvent ? `(${r.soundEvent})` : ''].filter(Boolean).join(' ');
        }
        if (r.reason) {
            subcatDisplay += ' - ' + r.reason;
        }

        const dateDisp = r.date 
            ? new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) 
            : '—';

        html += `
<tr>
  <td>${escHtml(r.serialNumber || '—')}</td>
  <td>${dateDisp}</td>
  <td>${escHtml(r.commonHeader || '—')}</td>
  <td>${escHtml(r.category || '—')}</td>
  <td>${escHtml(subcatDisplay)}</td>
  <td>${escHtml(r.particulars || '—')}</td>
  <td>${escHtml(r.referenceNumber || '—')}</td>
  <td class="num">${rupee(r.amount)}</td>
</tr>`;
    });

    html += `
</tbody>
</table>
</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Expense_Records_${new Date().getFullYear()}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Excel file downloaded successfully!', 'success');
}


// =====================================================================
// BALANCE SHEET – Reports  (replaces old Financial Statements table)
// =====================================================================

let _financialsList  = [];
let _editFinancialId = null;
let _activeBsId      = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const finFmt = n => '\u20b9' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
function finBalance(r) {
    return Number(r.totalCollection || 0) - Number(r.currentYearExpenses || 0);
}
function finComputeCollection(r) {
    return Number(r.lastYearBalance      || 0) +
           Number(r.currentYearDonations || 0) +
           Number(r.cashInHand           || 0) +
           Number(r.cashAtBank           || 0) +
           Number(r.cashWithdrawnFromBank|| 0);
}
function growthBadge(curr, prev) {
    if (prev === null || prev === undefined || prev === 0) return '<span style="color:#aaa;font-size:.8rem;">\u2014</span>';
    const pct   = ((curr - prev) / Math.abs(prev)) * 100;
    const sign  = pct >= 0 ? '+' : '';
    const color = pct >= 0 ? '#27AE60' : '#E74C3C';
    const arrow = pct >= 0 ? '\u25b2' : '\u25bc';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:${pct>=0?'#D5F4E6':'#FFEBEE'};color:${color};font-size:.8rem;font-weight:700;white-space:nowrap;">${arrow} ${sign}${pct.toFixed(1)}%</span>`;
}

// Stub so any oninput="finAutoCalc()" calls don't error
function finAutoCalc() {}

// ─── escAttr: escape values for HTML attributes ───────────────────────────────
function escAttr(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Load (called when Reports tab opens) ────────────────────────────────────
async function loadFinancials() { await loadBalanceSheets(); }

async function loadBalanceSheets() {
    const tabsEl = document.getElementById('bsYearTabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = '<span style="color:#aaa;font-size:.9rem;">Loading\u2026</span>';
    try {
        const res  = await fetch('/api/financials');
        const data = await res.json();
        _financialsList = (data.financials || []).sort((a, b) => String(a.year).localeCompare(String(b.year)));
        renderBsTabs();
        if (_financialsList.length > 0) {
            renderBsLedger(_financialsList[_financialsList.length - 1].financialId);
        } else {
            const body = document.getElementById('bsLedgerBody');
            if (body) body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:30px;">No records found. Click <strong>Add Year</strong> to get started.</td></tr>';
        }
    } catch (e) {
        tabsEl.innerHTML = '<span style="color:#c0392b;">\u26a0 Could not load records. Is server.js running?</span>';
    }
}

// ─── Render year selector tabs ────────────────────────────────────────────────
function renderBsTabs() {
    const tabsEl = document.getElementById('bsYearTabs');
    if (!tabsEl) return;
    if (_financialsList.length === 0) {
        tabsEl.innerHTML = '<span style="color:#aaa;font-size:.9rem;">No years added yet.</span>';
        return;
    }
    tabsEl.innerHTML = _financialsList.map(r => {
        const isActive = r.financialId === _activeBsId;
        const safe = r.financialId.replace(/'/g, "\\'");
        return `<button class="bs-year-tab${isActive ? ' active' : ''}" onclick="renderBsLedger('${safe}')">${escHtml(r.year)}</button>`;
    }).join('');
}

// ─── Parse balance sheet structured data from record ─────────────────────────
function parseBsData(record) {
    let bsData = null;
    try { bsData = record._bsData ? JSON.parse(record._bsData) : null; } catch(e) {}
    if (!bsData) {
        // Migrate from old flat format
        bsData = {
            lyYear: record.year || '',
            cyYear: record.notes || '',
            aCashBalanceParticulars: 'Cash Balance',
            aCashBalance: Number(record.cashInHand || 0),
            aBankBalanceParticulars: 'Bank Balance  (i)',
            aBankBalance: Number(record.cashAtBank || 0),
            bCashReceivedParticulars: 'Amount Received Cash  (i)',
            bCashReceived: Number(record.currentYearDonations || 0),
            bBankReceivedParticulars: 'Amount Received in Bank  (ii) (+)',
            bBankReceived: 0,
            bCashBoxParticulars: 'Amount Received in Cash Box  (+)',
            bCashBox: 0,
            cWithdrawnParticulars: '(iii) Cash withdrawn from Bank for C.Y.',
            cWithdrawn: Number(record.cashWithdrawnFromBank || 0),
            dExpenses: Number(record.currentYearExpenses || 0),
            eCashInHandParticulars: 'Cash in Hand',
            eCashInHand: 0,
            eCashTransferParticulars: 'Cash transfer to Bank',
            eCashTransfer: 0,
            eCashInBankParticulars: 'Cash in Bank',
            eCashInBank: 0,
        };
    }
    return bsData;
}

// ─── Render the ledger table for one year ────────────────────────────────────
async function renderBsLedger(fid) {
    _activeBsId = fid;
    renderBsTabs();

    const record = _financialsList.find(r => r.financialId === fid);
    if (!record) return;

    const bs     = parseBsData(record);
    const safe   = fid.replace(/'/g, "\\'");
    const lyYear = bs.lyYear || record.year || '';
    const cyYear = bs.cyYear || '';

    // Auto-fetch expenses if not loaded
    if (typeof _expensesList === 'undefined' || _expensesList.length === 0) {
        try { await loadExpenses(); } catch(e) {}
    }

    // Calculate expenses for the current year
    let autoExpenses = 0;
    if (_expensesList && _expensesList.length > 0) {
        let startYr = 0, endYr = 0;
        const yrMatch = cyYear.match(/(\d{4})-(\d{4})/);
        if (yrMatch) {
            startYr = Number(yrMatch[1]);
            endYr   = Number(yrMatch[2]);
            const startDt = new Date(`${startYr}-04-01`);
            const endDt   = new Date(`${endYr}-03-31T23:59:59`);
            autoExpenses = _expensesList.reduce((sum, exp) => {
                const d = new Date(exp.date);
                if (d >= startDt && d <= endDt) return sum + Number(exp.amount || 0);
                return sum;
            }, 0);
        } else {
            // Fallback: sum all expenses if year format isn't standard
            autoExpenses = _expensesList.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        }
    }
    
    // Pre-fill expenses if no saved value
    let dExpVal = bs.dExpenses !== undefined && bs.dExpenses !== null && bs.dExpenses !== '' ? bs.dExpenses : autoExpenses;

    const body = document.getElementById('bsLedgerBody');
    if (!body) return;

    body.innerHTML = `
<tr>
  <td colspan="3" style="background:#fff8e8;padding:10px 16px;">
    <span style="font-weight:700;font-size:1.05rem;color:var(--primary-color);">
      Balance Sheet &mdash; L.Y:&nbsp;<span id="bsLyYearDisp">${escHtml(lyYear)}</span>
      &nbsp;/&nbsp; C.Y:&nbsp;<span id="bsCyYearDisp">${escHtml(cyYear)}</span>
    </span>
  </td>
  <td style="background:#fff8e8;text-align:right;">
    <div style="display:flex;gap:6px;justify-content:flex-end;">
      <button class="btn btn-primary btn-small" onclick="saveBsLedger('${safe}')" style="padding:6px 14px;font-size:.82rem;">
        <i class="fas fa-save"></i> Save
      </button>
      <button class="btn-icon btn-delete" title="Delete this year" onclick="deleteBsYear('${safe}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </td>
</tr>
<!-- A) Balance for Last Year -->
<tr class="bs-section-sep">
  <td class="bs-section-lbl">A)</td>
  <td class="bs-section-lbl" colspan="2">
    Balance for the year (L.Y)&nbsp;
    <input class="bs-particulars-input" id="bs_lyYear" value="${escAttr(lyYear)}"
      placeholder="e.g. 2025-2026" style="width:140px;display:inline-block;" oninput="bsAutoCalc()">
  </td>
  <td class="bs-amt"></td>
</tr>
<tr>
  <td></td>
  <td class="bs-particulars">
    <input class="bs-particulars-input" id="bs_aCashPart" value="${escAttr(bs.aCashBalanceParticulars)}" placeholder="Particulars">
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_aCash" type="number" value="${bs.aCashBalance||''}" placeholder="0" oninput="bsAutoCalc()">
  </td>
  <td class="bs-amt"></td>
</tr>
<tr>
  <td></td>
  <td class="bs-particulars">
    <input class="bs-particulars-input" id="bs_aBankPart" value="${escAttr(bs.aBankBalanceParticulars)}" placeholder="Particulars">
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_aBank" type="number" value="${bs.aBankBalance||''}" placeholder="0" oninput="bsAutoCalc()" style="text-decoration:underline;">
  </td>
  <td class="bs-amt"></td>
</tr>
<!-- B) Income for Current Year -->
<tr class="bs-section-sep">
  <td class="bs-section-lbl">B)</td>
  <td class="bs-section-lbl" colspan="2">
    Income for the Current Year&nbsp;
    <input class="bs-particulars-input" id="bs_cyYear" value="${escAttr(cyYear)}"
      placeholder="e.g. 2026-2027" style="width:140px;display:inline-block;" oninput="bsAutoCalc()">
  </td>
  <td class="bs-amt"></td>
</tr>
<tr>
  <td></td>
  <td class="bs-particulars">
    <input class="bs-particulars-input" id="bs_bCashPart" value="${escAttr(bs.bCashReceivedParticulars)}" placeholder="Particulars">
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_bCash" type="number" value="${bs.bCashReceived||''}" placeholder="0" oninput="bsAutoCalc()">
  </td>
  <td class="bs-amt"></td>
</tr>
<tr>
  <td></td>
  <td class="bs-particulars">
    <input class="bs-particulars-input" id="bs_bBankPart" value="${escAttr(bs.bBankReceivedParticulars)}" placeholder="Particulars">
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_bBank" type="number" value="${bs.bBankReceived||''}" placeholder="0" oninput="bsAutoCalc()">
  </td>
  <td class="bs-amt"></td>
</tr>
<tr>
  <td></td>
  <td class="bs-particulars">
    <input class="bs-particulars-input" id="bs_bBoxPart" value="${escAttr(bs.bCashBoxParticulars)}" placeholder="Particulars">
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_bBox" type="number" value="${bs.bCashBox||''}" placeholder="0" oninput="bsAutoCalc()" style="text-decoration:underline;">
  </td>
  <td class="bs-amt"></td>
</tr>
<tr class="bs-total-row">
  <td></td>
  <td style="text-align:right;font-style:italic;">
    Total Collections for C.Y.&nbsp;<span id="bs_cyYearLabel">${escHtml(cyYear)}</span>
  </td>
  <td class="bs-amts" style="text-decoration:underline;">
    <input class="bs-input" id="bs_totalColl" type="number" readonly style="background:#f5f5f5;cursor:not-allowed;font-weight:bold;color:#1a1a7a;">
  </td>
  <td class="bs-amt"></td>
</tr>
<!-- C) Cash Withdrawn -->
<tr class="bs-section-sep">
  <td class="bs-section-lbl">C)</td>
  <td class="bs-particulars" style="font-weight:700;font-style:normal;">
    <input class="bs-particulars-input" id="bs_cPart" value="${escAttr(bs.cWithdrawnParticulars)}"
      placeholder="Particulars" style="font-style:normal;font-weight:700;">
    &nbsp;<span id="bs_cCyLabel" style="font-size:.88rem;color:#555;">${escHtml(cyYear)}</span>
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_cWithdrawn" type="number" value="${bs.cWithdrawn||''}" placeholder="0" oninput="bsAutoCalc()">
  </td>
  <td class="bs-amt" style="color:#555;font-style:italic;font-size:.88rem;">
    <span style="display:inline-flex;align-items:center;gap:4px;">(i+ii-iii)&nbsp;<input class="bs-input" id="bs_cResultDisplay" type="number" readonly style="background:#e8f4fd;cursor:not-allowed;font-weight:bold;color:#1a1a7a;width:90px;padding:2px 4px;border:1px solid #b3d4fc;"></span>
  </td>
</tr>
<!-- D) Expenses -->
<tr class="bs-section-sep">
  <td class="bs-section-lbl">D)</td>
  <td class="bs-section-lbl">
    Expenses for the Current Year&nbsp;<span id="bs_dCyLabel">${escHtml(cyYear)}</span>
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_dExp" type="number" value="${dExpVal||''}" placeholder="0" oninput="bsAutoCalc()" style="text-decoration:underline;">
  </td>
  <td class="bs-amt"></td>
</tr>
<!-- E) Closing Balance -->
<tr class="bs-section-sep">
  <td class="bs-section-lbl">E)</td>
  <td class="bs-section-lbl" colspan="2">
    Balance for the Current Year&nbsp;<span id="bs_eCyLabel">${escHtml(cyYear)}</span>
  </td>
  <td class="bs-amt">
    <input class="bs-input" id="bs_mainClosingBalance" type="number" readonly style="background:#e8f4fd;cursor:not-allowed;font-weight:bold;color:#1a1a7a;border:1px solid #b3d4fc;">
  </td>
</tr>
<tr>
  <td></td>
  <td class="bs-particulars">
    <input class="bs-particulars-input" id="bs_eCashPart" value="${escAttr(bs.eCashInHandParticulars)}" placeholder="Particulars">
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_eCash" type="number" value="${bs.eCashInHand||''}" placeholder="0" oninput="bsAutoCalc()">
  </td>
  <td class="bs-amt"></td>
</tr>
<tr>
  <td></td>
  <td class="bs-particulars">
    <input class="bs-particulars-input" id="bs_eTransferPart" value="${escAttr(bs.eCashTransferParticulars)}" placeholder="Particulars">
  </td>
  <td class="bs-amts" style="font-style:italic;">
    (+)&nbsp;<input class="bs-input" id="bs_eTransfer" type="number" value="${bs.eCashTransfer||''}" placeholder="0" oninput="bsAutoCalc()" style="width:85px;">
  </td>
  <td class="bs-amt"></td>
</tr>
<tr>
  <td></td>
  <td class="bs-particulars">
    <input class="bs-particulars-input" id="bs_eBankPart" value="${escAttr(bs.eCashInBankParticulars)}" placeholder="Particulars">
  </td>
  <td class="bs-amts">
    <input class="bs-input" id="bs_eBank" type="number" value="${bs.eCashInBank||''}" placeholder="0" style="text-decoration:underline;background:#f5f5f5;cursor:not-allowed;" readonly>
  </td>
  <td class="bs-amt"></td>
</tr>
<tr><td colspan="4" style="height:20px;background:#fffdf5;border:none;"></td></tr>
`;

    bsAutoCalc();
}

// ─── Auto-calculate totals ────────────────────────────────────────────────────
function bsAutoCalc() {
    const g  = id => Number(document.getElementById(id)?.value || 0);
    const gs = id => (document.getElementById(id)?.value || '');
    const si = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

    // B) Total Collections
    const transferVal = g('bs_eTransfer');
    si('bs_totalColl', g('bs_bCash') + g('bs_bBank') + g('bs_bBox'));

    // C) Cash Withdrawn Result (i + ii - iii)
    const c_result = g('bs_aBank') + g('bs_bBank') - g('bs_cWithdrawn');
    si('bs_cResultDisplay', c_result);

    // E) Cash in Bank (Auto-calculated: C_result + Cash Transfer to Bank)
    si('bs_eBank', c_result + transferVal);

    // E) Main Closing Balance = Last Year Bank Balance + Bank Received (CY) + Cash Transfer to Bank
    //    i.e.  Section A (bank)  +  Section B (bank)  +  Section E (transfer)
    const mainBal = g('bs_aBank') + g('bs_bBank') + transferVal;
    si('bs_mainClosingBalance', mainBal);

    const cyYearVal = gs('bs_cyYear');
    ['bs_cyYearLabel','bs_cCyLabel','bs_dCyLabel','bs_eCyLabel'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = cyYearVal;
    });
}

// ─── Save ledger inline edits to server ──────────────────────────────────────
async function saveBsLedger(fid) {
    const record = _financialsList.find(r => r.financialId === fid);
    if (!record) return;
    const g  = id => Number(document.getElementById(id)?.value || 0);
    const gs = id => (document.getElementById(id)?.value || '').trim();
    const bsData = {
        lyYear: gs('bs_lyYear'), cyYear: gs('bs_cyYear'),
        aCashBalanceParticulars: gs('bs_aCashPart'), aCashBalance: g('bs_aCash'),
        aBankBalanceParticulars: gs('bs_aBankPart'), aBankBalance: g('bs_aBank'),
        bCashReceivedParticulars: gs('bs_bCashPart'), bCashReceived: g('bs_bCash'),
        bBankReceivedParticulars: gs('bs_bBankPart'), bBankReceived: g('bs_bBank'),
        bCashBoxParticulars: gs('bs_bBoxPart'), bCashBox: g('bs_bBox'),
        cWithdrawnParticulars: gs('bs_cPart'), cWithdrawn: g('bs_cWithdrawn'),
        dExpenses: g('bs_dExp'),
        eCashInHandParticulars: gs('bs_eCashPart'), eCashInHand: g('bs_eCash'),
        eCashTransferParticulars: gs('bs_eTransferPart'), eCashTransfer: g('bs_eTransfer'),
        eCashInBankParticulars: gs('bs_eBankPart'), eCashInBank: g('bs_eBank'),
    };
    const totalColl = bsData.bCashReceived + bsData.bBankReceived + bsData.bCashBox;
    const lyBalance = bsData.aCashBalance  + bsData.aBankBalance;
    const payload = {
        year: record.year, lastYearBalance: lyBalance,
        currentYearDonations: bsData.bCashReceived, cashInHand: bsData.aCashBalance,
        cashAtBank: bsData.aBankBalance, cashWithdrawnFromBank: bsData.cWithdrawn,
        totalCollection: totalColl, currentYearExpenses: bsData.dExpenses,
        notes: bsData.cyYear, _bsData: JSON.stringify(bsData),
    };
    try {
        const res  = await fetch(`/api/financials/${encodeURIComponent(fid)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            const idx = _financialsList.findIndex(r => r.financialId === fid);
            if (idx >= 0) _financialsList[idx] = { ..._financialsList[idx], ...payload };
            showNotification('Balance sheet saved!', 'success');
        } else { showNotification('Error: ' + (data.message || 'Could not save.'), 'error'); }
    } catch (e) { showNotification('Cannot reach server. Is server.js running?', 'error'); }
}

// ─── Modal open / close ───────────────────────────────────────────────────────
function openBalanceSheetModal() {
    const t = document.getElementById('finModalTitle');
    if (t) t.innerHTML = '<i class="fas fa-plus-circle" style="color:var(--primary-color);margin-right:8px;"></i>Add Balance Sheet Year';
    document.getElementById('financialModal').classList.add('active');
}
function openFinancialModal(record) { openBalanceSheetModal(); }

function closeFinancialModal() {
    document.getElementById('financialModal').classList.remove('active');
    const f = document.getElementById('financialForm'); if (f) f.reset();
}

document.addEventListener('DOMContentLoaded', function() {
    const fm = document.getElementById('financialModal');
    if (fm) fm.addEventListener('click', function(e) { if (e.target === this) closeFinancialModal(); });
});

// ─── Create a new year ────────────────────────────────────────────────────────
async function saveBalanceSheetYear(ev) {
    ev.preventDefault();
    const lyYear = (document.getElementById('finYear')?.value || '').trim();
    const cyYear = (document.getElementById('finCYLabel')?.value || '').trim();
    if (!lyYear || !cyYear) { showNotification('Both year labels are required.', 'error'); return; }
    if (_financialsList.find(r => r.year === lyYear)) {
        showNotification(`A record for "${lyYear}" already exists.`, 'error'); return;
    }
    const bsData = {
        lyYear, cyYear,
        aCashBalanceParticulars: 'Cash Balance',          aCashBalance: 0,
        aBankBalanceParticulars: 'Bank Balance  (i)',      aBankBalance: 0,
        bCashReceivedParticulars: 'Amount Received Cash  (i)',         bCashReceived: 0,
        bBankReceivedParticulars: 'Amount Received in Bank  (ii) (+)', bBankReceived: 0,
        bCashBoxParticulars: 'Amount Received in Cash Box  (+)',       bCashBox: 0,
        cWithdrawnParticulars: '(iii) Cash withdrawn from Bank for C.Y.', cWithdrawn: 0,
        dExpenses: 0,
        eCashInHandParticulars: 'Cash in Hand',           eCashInHand: 0,
        eCashTransferParticulars: 'Cash transfer to Bank', eCashTransfer: 0,
        eCashInBankParticulars: 'Cash in Bank',           eCashInBank: 0,
    };
    const payload = {
        year: lyYear, lastYearBalance: 0, currentYearDonations: 0,
        cashInHand: 0, cashAtBank: 0, cashWithdrawnFromBank: 0,
        totalCollection: 0, currentYearExpenses: 0,
        notes: cyYear, _bsData: JSON.stringify(bsData)
    };
    const btn = document.getElementById('finSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating\u2026'; }
    try {
        const res  = await fetch('/api/financials', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeFinancialModal();
            showNotification(`Balance sheet for ${lyYear} created!`, 'success');
            await loadBalanceSheets();
            const newRec = _financialsList.find(r => r.year === lyYear);
            if (newRec) renderBsLedger(newRec.financialId);
        } else { showNotification('Error: ' + (data.message || 'Could not create.'), 'error'); }
    } catch (e) { showNotification('Cannot reach server. Is server.js running?', 'error');
    } finally { if (btn) { btn.disabled = false; btn.textContent = 'Create Balance Sheet'; } }
}
async function saveFinancialRecord(ev) { return saveBalanceSheetYear(ev); }

// ─── Delete a year ────────────────────────────────────────────────────────────
async function deleteBsYear(fid) {
    const record = _financialsList.find(r => r.financialId === fid);
    const label  = record ? `Year ${record.year}` : fid;
    if (!confirm(`Delete the balance sheet for ${label}?\n\nThis cannot be undone.`)) return;
    try {
        const res  = await fetch(`/api/financials/${encodeURIComponent(fid)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification(`Balance sheet for ${label} deleted.`, 'success');
            _activeBsId = null; loadBalanceSheets();
        } else { showNotification('Error: ' + (data.message || 'Could not delete.'), 'error'); }
    } catch (e) { showNotification('Cannot reach server.', 'error'); }
}
async function deleteFinancial(id) { return deleteBsYear(id); }
function renderFinancials() { /* replaced by renderBsLedger */ }

// ─── Excel Export — replicates the ledger format exactly ─────────────────────
function exportBalanceSheetExcel() {
    if (_financialsList.length === 0) {
        showNotification('No balance sheet records to export.', 'error'); return;
    }
    const activeFid = _activeBsId || _financialsList[_financialsList.length - 1].financialId;
    const record = _financialsList.find(r => r.financialId === activeFid);
    if (!record) { showNotification('Please select a year first.', 'error'); return; }

    const lv = id => document.getElementById(id);
    const g  = id => lv(id) ? Number(lv(id).value || 0) : 0;
    const gs = id => lv(id) ? (lv(id).value || '').trim() : '';
    const usingLive = !!document.getElementById('bs_lyYear');

    let bs = usingLive ? {
        lyYear: gs('bs_lyYear'), cyYear: gs('bs_cyYear'),
        aCashBalanceParticulars: gs('bs_aCashPart'), aCashBalance: g('bs_aCash'),
        aBankBalanceParticulars: gs('bs_aBankPart'), aBankBalance: g('bs_aBank'),
        bCashReceivedParticulars: gs('bs_bCashPart'), bCashReceived: g('bs_bCash'),
        bBankReceivedParticulars: gs('bs_bBankPart'), bBankReceived: g('bs_bBank'),
        bCashBoxParticulars: gs('bs_bBoxPart'), bCashBox: g('bs_bBox'),
        cWithdrawnParticulars: gs('bs_cPart'), cWithdrawn: g('bs_cWithdrawn'),
        dExpenses: g('bs_dExp'),
        eCashInHandParticulars: gs('bs_eCashPart'), eCashInHand: g('bs_eCash'),
        eCashTransferParticulars: gs('bs_eTransferPart'), eCashTransfer: g('bs_eTransfer'),
        eCashInBankParticulars: gs('bs_eBankPart'), eCashInBank: g('bs_eBank'),
    } : parseBsData(record);

    const totalColl = Number(bs.bCashReceived) + Number(bs.bBankReceived) + Number(bs.bCashBox);
    const mainBal   = Number(bs.aBankBalance) + Number(bs.bBankReceived) + Number(bs.eCashTransfer);
    const rupee = n => Number(n || 0) !== 0 ? Number(n).toLocaleString('en-IN') : '';
    const esc   = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const orgName  = 'Patelwadi Sarvajnik Ganesh Mitra Mandal';
    const exportDt = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Balance Sheet</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
body{font-family:'Courier New',Courier,monospace;font-size:11pt;color:#1a1a7a;}
.org{font-size:14pt;font-weight:bold;color:#2C3E50;}.sub{font-size:9pt;color:#7F8C8D;}
table{border-collapse:collapse;width:100%;}
th{border:1px solid #d4c9a8;padding:8px 14px;background:#faf3e0;font-weight:bold;text-align:center;}
td{border:1px solid #d4c9a8;padding:6px 14px;}
.sec{font-weight:bold;background:#fff8e8;}.part{padding-left:36px;font-style:italic;}
.amts{text-align:right;}.amt{text-align:right;font-weight:bold;}
.tot{background:#fdf0d5;font-weight:bold;border-top:2px solid #c8a84b;}.ul{text-decoration:underline;}
</style>
</head><body>
<p class="org">${esc(orgName)}</p>
<p class="sub">Balance Sheet &mdash; L.Y: ${esc(bs.lyYear)} &nbsp;/&nbsp; C.Y: ${esc(bs.cyYear)}</p>
<p class="sub">Exported on ${exportDt}</p><br>
<table>
<thead><tr>
  <th style="width:40px;"></th>
  <th style="text-align:left;min-width:280px;">Particulars</th>
  <th style="min-width:130px;">Amts</th>
  <th style="min-width:130px;">Amt</th>
</tr></thead>
<tbody>
<tr class="tot"><td class="sec">A)</td><td class="sec" colspan="2">Balance for the year (L.Y) ${esc(bs.lyYear)}</td><td></td></tr>
<tr><td></td><td class="part">${esc(bs.aCashBalanceParticulars)}</td><td class="amts">${rupee(bs.aCashBalance)}</td><td></td></tr>
<tr><td></td><td class="part">${esc(bs.aBankBalanceParticulars)}</td><td class="amts ul">${rupee(bs.aBankBalance)}</td><td></td></tr>
<tr class="tot"><td class="sec">B)</td><td class="sec" colspan="2">Income for the Current Year ${esc(bs.cyYear)}</td><td></td></tr>
<tr><td></td><td class="part">${esc(bs.bCashReceivedParticulars)}</td><td class="amts">${rupee(bs.bCashReceived)}</td><td></td></tr>
<tr><td></td><td class="part">${esc(bs.bBankReceivedParticulars)}</td><td class="amts">${rupee(bs.bBankReceived)}</td><td></td></tr>
<tr><td></td><td class="part">${esc(bs.bCashBoxParticulars)}</td><td class="amts ul">${rupee(bs.bCashBox)}</td><td></td></tr>
<tr class="tot"><td></td><td style="text-align:right;font-style:italic;">Total Collections for C.Y. ${esc(bs.cyYear)}</td><td class="amts ul">${rupee(totalColl)}</td><td></td></tr>
<tr class="tot"><td class="sec">C)</td><td class="sec">${esc(bs.cWithdrawnParticulars)} ${esc(bs.cyYear)}</td><td style="text-align:center;font-style:italic;color:#555;">(i+ii-iii)</td><td class="amt">${rupee(bs.cWithdrawn)}</td></tr>
<tr class="tot"><td class="sec">D)</td><td class="sec" colspan="2">Expenses for the Current Year ${esc(bs.cyYear)}</td><td class="amt ul">${rupee(bs.dExpenses)}</td></tr>
<tr class="tot"><td class="sec">E)</td><td class="sec" colspan="2">Balance for the Current Year ${esc(bs.cyYear)}</td><td class="amt ul">${rupee(mainBal)}</td></tr>
<tr><td></td><td class="part">${esc(bs.eCashInHandParticulars)}</td><td class="amts">${rupee(bs.eCashInHand)}</td><td></td></tr>
<tr><td></td><td class="part">${esc(bs.eCashTransferParticulars)}</td><td class="amts">(+) ${rupee(bs.eCashTransfer)}</td><td></td></tr>
<tr><td></td><td class="part">${esc(bs.eCashInBankParticulars)}</td><td class="amts ul">${rupee(bs.eCashInBank)}</td><td></td></tr>
</tbody></table>
<br><p class="sub">Total Collections = Amount Received Cash + Amount Received in Bank + Amount Received in Cash Box</p>
</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `Balance_Sheet_${bs.lyYear || 'export'}.xls`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showNotification('Balance Sheet Excel downloaded!', 'success');
}
function exportFinancialsExcel() { exportBalanceSheetExcel(); }

// =====================================================================
// SOFT DELETE RECEIPT
// =====================================================================
async function softDeleteReceipt(id, name) {
    if (!confirm(`Soft-delete the receipt for "${name}"?\n\nThe data will be kept on the server but hidden from this view.`)) return;
    try {
        const res  = await fetch(`/api/receipts/${encodeURIComponent(id)}/soft-delete`, { method: 'PATCH' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification('Receipt soft-deleted (data retained).', 'success');
            loadAdminReceipts();
        } else {
            showNotification('Error: ' + (data.message || 'Could not soft-delete.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server.', 'error');
    }
}

// =====================================================================
// PAUTI BOOKS MODULE
// =====================================================================

let _pautiBooksList = [];
let _editSlipBookId = null;
let _editSlipNum    = null;

async function loadPautiBooks() {
    const tbody = document.getElementById('pautiBooksTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:24px;">Loading…</td></tr>';
    try {
        const res  = await fetch('/api/pauti-books');
        const data = await res.json();
        _pautiBooksList = (data.pautiBooks || []).sort((a, b) => a.bookNumber - b.bookNumber);
        renderPautiBooks();
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;padding:24px;">⚠ Cannot reach server.</td></tr>';
    }
}

function renderPautiBooks() {
    const tbody = document.getElementById('pautiBooksTbody');
    if (!tbody) return;

    // Global stats
    const totalSubmitted = _pautiBooksList.reduce((s, b) => s + b.slips.filter(sl => sl.uploadedAt && !sl.deleted).length, 0);
    const statEl = document.getElementById('pautiGlobalStats');
    if (statEl) statEl.textContent = `${totalSubmitted} slips submitted across ${_pautiBooksList.length} book(s) — next slip: #${totalSubmitted + 1}`;

    if (_pautiBooksList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:30px;">No slips submitted yet. Volunteers can submit slips from their dashboard — books are created automatically.</td></tr>';
        return;
    }
    tbody.innerHTML = _pautiBooksList.map(book => {
        const uploaded = book.slips.filter(s => s.uploadedAt && !s.deleted).length;
        const total    = book.slips.length;
        const pct      = total > 0 ? Math.round((uploaded / total) * 100) : 0;
        const pctColor = pct === 100 ? '#27AE60' : pct > 60 ? '#2980B9' : '#E67E22';
        return `
        <tr>
            <td><span style="font-weight:700;color:var(--primary-color);font-size:1rem;">#${book.bookNumber}</span></td>
            <td><code style="font-size:.85rem;background:#f4f4f4;padding:2px 8px;border-radius:4px;">${book.slipsFrom}–${book.slipsTo}</code></td>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;height:8px;background:#eee;border-radius:4px;min-width:80px;">
                        <div style="width:${pct}%;height:100%;background:${pctColor};border-radius:4px;transition:width .4s;"></div>
                    </div>
                    <span style="font-size:.85rem;color:#555;white-space:nowrap;min-width:40px;">${uploaded}/${total}</span>
                    <span style="font-size:.78rem;color:${pctColor};font-weight:600;">${pct}%</span>
                </div>
            </td>
            <td>
                <span class="badge" style="background:${pct===100?'#E8F5E9':'#FFF3E0'};color:${pct===100?'#1B5E20':'#E65100'};">
                    ${pct === 100 ? '✅ Complete' : 'In Progress'}
                </span>
            </td>
            <td>
                <button class="btn-icon btn-edit" title="View Slips" onclick="viewPautiSlips('${book.pautiBookId}')">
                    <i class="fas fa-list"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function viewPautiSlips(bookId) {
    const book = _pautiBooksList.find(b => b.pautiBookId === bookId);
    if (!book) return;
    const panel = document.getElementById('pautiSlipPanel');
    const title = document.getElementById('pautiSlipPanelTitle');
    const tbody = document.getElementById('pautiSlipsTbody');
    if (!panel || !tbody) return;
    title.innerHTML = `<i class="fas fa-receipt" style="color:var(--primary-color);margin-right:8px;"></i>Book #${book.bookNumber} &mdash; Slips ${book.slipsFrom}&ndash;${book.slipsTo}`;

    tbody.innerHTML = book.slips.map(slip => {
        if (slip.deleted) {
            return `<tr style="opacity:.45;">
                <td><s>${slip.slipNumber}</s></td>
                <td colspan="9" style="color:#aaa;font-style:italic;">Soft-deleted</td>
            </tr>`;
        }

        // Exact timestamp
        const uploadedExact = slip.uploadedAt
            ? (() => {
                const dt = new Date(slip.uploadedAt);
                const t  = dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
                const d  = dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                return `<span style="font-size:.8rem;color:#555;white-space:nowrap;">${t}<br><span style="color:#aaa;">${d}</span></span>`;
              })()
            : '<span style="color:#ccc">—</span>';

        const amtCell   = slip.amount ? '₹' + Number(slip.amount).toLocaleString('en-IN') : '<span style="color:#ccc">—</span>';
        const nameCell  = slip.donorName  ? escHtml(slip.donorName)  : '<span style="color:#ccc">—</span>';
        const byCell    = slip.uploadedBy
            ? `<span style="font-size:.82rem;color:#3949AB;font-weight:600;">${escHtml(slip.uploadedBy)}</span>`
            : '<span style="color:#ccc">—</span>';
        const modeCell  = slip.paymentMode
            ? `<span class="badge" style="background:#EEF2FF;color:#3730A3;">${slip.paymentMode.toUpperCase()}</span>`
            : '<span style="color:#ccc">—</span>';
        const checkCell = slip.paymentMode === 'check' && slip.checkNumber
            ? `<code style="font-size:.82rem;">${escHtml(slip.checkNumber)}</code>`
            : '<span style="color:#ccc">—</span>';
        const hasPhoto  = !!slip.photoUrl;
        const photoBtn  = hasPhoto
            ? `<button class="btn-icon btn-edit" title="View Photo" onclick="openAdminPbLightbox(fixUrl('${slip.photoUrl}'))"><i class="fas fa-image"></i></button>`
            : '<span style="color:#ccc;font-size:.8rem">—</span>';
        const statusCell = slip.uploadedAt
            ? '<span class="badge badge-success">Uploaded</span>'
            : '<span class="badge badge-warning">Pending</span>';
        const safeBookId = book.pautiBookId.replace(/'/g, "\\'");
        const rowId      = `ps-row-${safeBookId}-${slip.slipNumber}`;

        return `<tr id="${rowId}">
            <td><strong style="color:var(--primary-color);">${slip.slipNumber}</strong></td>
            <td>
                <input type="text" value="${(slip.donorName || '').replace(/"/g,'&quot;')}"
                    style="width:100%;min-width:100px;padding:4px 7px;border:1.5px solid #e0e0e0;border-radius:6px;font-size:.88rem;"
                    onchange="inlineSaveSlip('${safeBookId}',${slip.slipNumber},'donorName',this.value,this)"
                    title="Click to edit donor name">
            </td>
            <td>
                <input type="number" value="${slip.amount || ''}"
                    style="width:90px;padding:4px 7px;border:1.5px solid #e0e0e0;border-radius:6px;font-size:.88rem;"
                    onchange="inlineSaveSlip('${safeBookId}',${slip.slipNumber},'amount',this.value,this)"
                    title="Click to edit amount">
            </td>
            <td>
                <select style="padding:4px 6px;border:1.5px solid #e0e0e0;border-radius:6px;font-size:.82rem;"
                    onchange="inlineSaveSlip('${safeBookId}',${slip.slipNumber},'paymentMode',this.value,this)">
                    ${['cash','upi','check','online','balance'].map(m =>
                        `<option value="${m}" ${slip.paymentMode===m?'selected':''}>${m.toUpperCase()}</option>`
                    ).join('')}
                </select>
            </td>
            <td>${checkCell}</td>
            <td>${byCell}</td>
            <td>${photoBtn}</td>
            <td>${uploadedExact}</td>
            <td>${statusCell}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-delete" title="Soft Delete Slip" onclick="softDeleteSlip('${safeBookId}', ${slip.slipNumber})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    panel.style.display = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Inline save: saves a single field of a Pauti slip in real-time
async function inlineSaveSlip(bookId, slipNumber, field, value, inputEl) {
    const payload = { [field]: field === 'amount' ? Number(value) : value };
    if (inputEl) { inputEl.style.borderColor = '#3949AB'; }
    try {
        const url = `/api/pauti-books/${encodeURIComponent(bookId)}/slips/${slipNumber}`;
        const res = await fetch(url, {
            method : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (inputEl) { inputEl.style.borderColor = '#27AE60'; }
            // Update local store so re-render reflects new value
            const book = _pautiBooksList.find(b => b.pautiBookId === bookId);
            const slip = book?.slips.find(s => s.slipNumber === slipNumber);
            if (slip) slip[field] = field === 'amount' ? Number(value) : value;
            setTimeout(() => { if (inputEl) inputEl.style.borderColor = '#e0e0e0'; }, 1800);
        } else {
            if (inputEl) { inputEl.style.borderColor = '#E53935'; }
            showNotification('Save failed: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (e) {
        if (inputEl) { inputEl.style.borderColor = '#E53935'; }
        showNotification('Cannot reach server.', 'error');
    }
}


function closePautiSlipPanel() {
    const panel = document.getElementById('pautiSlipPanel');
    if (panel) panel.style.display = 'none';
}

// Assign Book modal kept as dead code — UI now uses auto-assignment
function openAssignBookModal() {
    showNotification('Books are now created automatically as volunteers submit slips. No manual assignment needed.', 'info');
}
function closeAssignBookModal() {
    const m = document.getElementById('assignBookModal');
    if (m) m.classList.remove('active');
}
async function saveAssignBook(ev) { if(ev) ev.preventDefault(); }

// ─ Edit Slip Modal ──────────────────────────────────────────────────────────
function esToggleCheck() {
    const mode = document.getElementById('esMode')?.value;
    const grp  = document.getElementById('esCheckGroup');
    if (grp) grp.style.display = mode === 'check' ? '' : 'none';
}
function openEditSlipModal(bookId, slipNumber) {
    _editSlipBookId = bookId;
    _editSlipNum    = slipNumber;
    const book = _pautiBooksList.find(b => b.pautiBookId === bookId);
    const slip = book?.slips.find(s => s.slipNumber === slipNumber);
    document.getElementById('editSlipTitle').innerHTML = `<i class="fas fa-edit" style="color:var(--primary-color);margin-right:8px;"></i>Edit Slip #${slipNumber}`;
    document.getElementById('esName').value        = slip?.donorName   || '';
    document.getElementById('esAmount').value      = slip?.amount      || '';
    document.getElementById('esMode').value        = slip?.paymentMode || 'cash';
    document.getElementById('esCheckNumber').value = slip?.checkNumber || '';
    esToggleCheck();
    document.getElementById('editSlipModal').classList.add('active');
}
function closeEditSlipModal() {
    _editSlipBookId = null;
    _editSlipNum    = null;
    document.getElementById('editSlipModal').classList.remove('active');
}
async function saveEditSlip(ev) {
    ev.preventDefault();
    if (!_editSlipBookId || !_editSlipNum) return;
    const payload = {
        donorName  : document.getElementById('esName').value.trim(),
        amount     : Number(document.getElementById('esAmount').value || 0),
        paymentMode: document.getElementById('esMode').value,
        checkNumber: document.getElementById('esCheckNumber').value.trim() || null,
    };
    const btn = document.getElementById('esSaveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
        const url = `/api/pauti-books/${encodeURIComponent(_editSlipBookId)}/slips/${_editSlipNum}`;
        const res = await fetch(url, {
            method : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeEditSlipModal();
            showNotification('Slip updated!', 'success');
            loadPautiBooks();
        } else {
            showNotification('Error: ' + (data.message || 'Could not save.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server.', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Save Changes';
    }
}
async function softDeleteSlip(bookId, slipNumber) {
    if (!confirm(`Soft-delete Slip #${slipNumber}?\n\nData is kept on server but hidden from view.`)) return;
    try {
        const url = `/api/pauti-books/${encodeURIComponent(bookId)}/slips/${slipNumber}/soft-delete`;
        const res = await fetch(url, { method: 'PATCH' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification(`Slip #${slipNumber} soft-deleted.`, 'success');
            loadPautiBooks();
            // Re-open the slip panel for the same book
            viewPautiSlips(bookId);
        } else {
            showNotification('Error: ' + (data.message || 'Could not delete.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server.', 'error');
    }
}

// =====================================================================
// BALANCE RECOVERY MODULE
// =====================================================================
async function loadBalanceRecovery() {
    const tbody = document.getElementById('balRecTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:24px;">Loading…</td></tr>';
    try {
        // Merge: Pauti slips (mode=balance or no amount) + balance-type receipts + donation entries with Balance mode
        const [pbRes, rcRes, deRes] = await Promise.all([
            fetch('/api/pauti-books'),
            fetch('/api/receipts'),
            fetch('/api/donation-entries')
        ]);
        const pbData = await pbRes.json();
        const rcData = await rcRes.json();
        const deData = await deRes.json();

        // Pauti slips with payment mode = balance (these are pending collections)
        const pautiPending = [];
        (pbData.pautiBooks || []).forEach(book => {
            (book.slips || []).forEach(slip => {
                if (!slip.deleted && slip.uploadedAt &&
                    (slip.paymentMode === 'balance' || !slip.amount || Number(slip.amount) <= 0)) {
                    pautiPending.push({
                        receiptId  : `SLIP-${slip.slipNumber}`,
                        name       : slip.donorName || '—',
                        amount     : slip.amount || 0,
                        passbookUrl: slip.photoUrl || null,
                        userId     : slip.uploadedBy || '—',
                        submittedAt: slip.uploadedAt,
                        status     : slip.status || 'pending',
                        type       : 'pauti-slip',
                        paymentMode: slip.paymentMode || 'balance',
                        _slipNum   : slip.slipNumber,
                        _bookId    : book.pautiBookId,
                    });
                }
            });
        });

        // Regular balance receipts
        const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
        const receiptBal = (rcData.receipts || []).filter(r => String(r.type).toLowerCase() === 'balance' && !r.deleted && getStatus(r) !== 'received');

        // Donation entries with paymentMode = 'Balance' (from any volunteer or admin)
        const deBal = (deData.entries || []).filter(e => {
            const getStatus = s => (s.status || (String(s.paymentMode||s.type).toLowerCase() === 'balance' ? 'Balance' : 'Received')).toLowerCase();
            return e.paymentMode && String(e.paymentMode).toLowerCase() === 'balance' && !e.deleted && getStatus(e) !== 'received';
        }).map(e => {
            const donor = e.donorType === 'Business'
                ? (e.businessName || '—')
                : [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') || '—';
            return {
                receiptId  : e.entryId || ('DE-' + e.receiptNumber),
                name       : donor,
                amount     : e.amount || 0,
                passbookUrl: e.photoUrl || null,
                userId     : e.submittedBy || '—',
                submittedAt: e.submittedAt || new Date().toISOString(),
                status     : e.status || 'pending',
                type       : 'donation-entry',
                paymentMode: e.paymentMode,
                _bookNum   : e.bookNumber,
                _recNum    : e.receiptNumber,
                editHistory: e.editHistory || [],
                nameHistory: e.nameHistory || []
            };
        });
        
        window._brHistoryStore = {};

        const list = [...pautiPending, ...receiptBal, ...deBal].sort((a, b) =>
            new Date(b.submittedAt) - new Date(a.submittedAt));

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:30px;">No pending balance slips found. All slips have amounts recorded.</td></tr>';
            return;
        }
                const grouped = {};
        list.forEach(r => {
            const bn = r._bookNum || r._bookNumber || r.bookNumber || 'Unknown';
            const bt = r._bookType || r.bookType || 'New';
            const groupKey = bn === 'Unknown' ? bn : `${bn} (${bt})`;
            if(!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(r);
        });

        const bookNumbers = Object.keys(grouped).sort((a, b) => {
            const na = parseInt(a);
            const nb = parseInt(b);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return String(a).localeCompare(String(b));
        });

        let html = '';
        bookNumbers.forEach(bn => {
                        let bnDisplay = bn;
            let btBadge = '';
            if (bn.includes(' (')) {
                const parts = bn.split(' (');
                bnDisplay = parts[0];
                const btPart = parts[1].replace(')', '');
                btBadge = btPart === 'Old' 
                  ? '<span style="background:#FFF3E0;color:#E65100;font-size:.75rem;padding:3px 8px;border-radius:12px;font-weight:700;margin-left:8px;vertical-align:middle;">Old</span>' 
                  : '<span style="background:#E3F2FD;color:#1565C0;font-size:.75rem;padding:3px 8px;border-radius:12px;font-weight:700;margin-left:8px;vertical-align:middle;">New</span>';
            }
            html += `<tr><td colspan="8" style="background:#F4F6FB;color:#1A237E;font-weight:700;font-size:1.05rem;padding:12px 16px;vertical-align:middle;">Book Number ${bnDisplay} ${btBadge}</td></tr>`;
            html += grouped[bn].map(r => {
                const dt = new Date(r.submittedAt);
                const dateStr = dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase()
                              + ', ' + dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                const amtCell  = r.amount && Number(r.amount) > 0
                    ? '₹' + Number(r.amount).toLocaleString('en-IN')
                    : '<span style="color:#ccc;font-style:italic;">No amount</span>';
                const hasFile  = !!r.passbookUrl;
                const photoBtn = hasFile
                    ? `<button class="btn-icon btn-edit" title="View Photo" onclick="openAdminPbLightbox(fixUrl('${r.passbookUrl}'))"><i class="fas fa-image"></i></button>`
                    : '<span style="color:#ccc;font-size:.8rem">—</span>';
                const isReceived  = (r.status || '').toLowerCase() === 'received';
                const statusBadge = isReceived
                    ? '<span class="badge badge-success">Received</span>'
                    : '<span class="badge badge-warning">Balance</span>';
                const isPauti = r.type === 'pauti-slip';
                const isDonEntry = r.type === 'donation-entry';
                
                const recNumDisplay = r._recNum || r._slipNum || r._receiptNumber || r.receiptNumber || 'N/A';

                const safeId   = r.receiptId.replace(/'/g, "\\'");
                const safeName = (r.name || '').replace(/'/g, "\\'");
                const safePhoto = (r.passbookUrl||'').replace(/'/g,"\\'");
                if (r.editHistory && r.editHistory.length > 0) window._brHistoryStore[r.receiptId] = r.editHistory;
                else if (r.nameHistory && r.nameHistory.length > 0) window._brHistoryStore[r.receiptId] = r.nameHistory;
                const editBtn = `<button class="btn-icon btn-edit" title="Edit Entry" onclick="openBrEditModal('${safeId}','${safeName}',${r.amount||0},'${r.paymentMode||'cash'}','${r.status||'pending'}',${r._bookNumber||r._bookNum||0},${r._receiptNumber||r._recNum||r._slipNum||0},'${safePhoto}','${r.type}','${r._bookId||''}')"><i class="fas fa-edit"></i></button>`;
                const markBtn  = (!isPauti && !isDonEntry && !isReceived)
                    ? `<button class="btn-icon btn-edit" style="background:#E8F5E9;color:#1B5E20;" title="Mark as Received" onclick="markBalanceReceived('${safeId}')"><i class="fas fa-check"></i></button>`
                    : '';
                const delBtn = (!isPauti && !isDonEntry)
                    ? `<button class="btn-icon btn-delete" title="Soft Delete" onclick="softDeleteReceipt('${safeId}','${safeName}')"><i class="fas fa-trash"></i></button>`
                    : '';
                return `
                <tr>
                    <td style="font-size:.85rem;color:#555;white-space:nowrap;padding-left:24px;font-weight:600;">Receipt Number ${recNumDisplay}</td>
                    <td>${escHtml(r.name || '—')}</td>
                    <td>${amtCell}</td>
                    <td>${photoBtn}</td>
                    <td style="font-size:.85rem;color:#3949AB;font-weight:600;">${escHtml(r.userId || '—')}</td>
                    <td style="font-size:.82rem;color:#555;white-space:nowrap;">${dateStr}</td>
                    <td>${statusBadge}</td>
                    <td><div class="action-btns">${editBtn}${markBtn}${delBtn}</div></td>
                </tr>`;
            }).join('');
        });
        tbody.innerHTML = html;

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#c0392b;padding:24px;">⚠ Cannot reach server.</td></tr>';
    }
}

async function markBalanceReceived(id) {
    if (!confirm('Mark this balance recovery slip as Received?')) return;
    try {
        const curUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const byName  = curUser.name || 'Admin';
        const res  = await fetch(`/api/receipts/${encodeURIComponent(id)}/mark-received?by=${encodeURIComponent(byName)}`, { method: 'PATCH' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification('Balance slip marked as received!', 'success');
            loadBalanceRecovery();
        } else {
            showNotification('Error: ' + (data.message || 'Could not update.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server.', 'error');
    }
}

// =====================================================================
// BALANCE/PENDING RECOVERY — EDIT MODAL
// =====================================================================
let _brEditReceiptIdStore = null;

function openBrEditModal(receiptId, name, amount, mode, status, bookNum, receiptNum, photoUrl, type, extraBookId) {
    _brEditReceiptIdStore = receiptId;
    document.getElementById('brEditReceiptId').value = receiptId;
    const typeEl = document.getElementById('brEditType');
    if (typeEl) typeEl.value = type || 'balance';
    const extraBkEl = document.getElementById('brEditExtraBookId');
    if (extraBkEl) extraBkEl.value = extraBookId || '';
    document.getElementById('brEditName').value   = name   || '';
    document.getElementById('brEditAmount').value = amount || '';
    
    // Inject History
    const form = document.getElementById('brEditForm');
    let existingHist = document.getElementById('brEditHistDiv');
    if (existingHist) existingHist.remove();
    const hist = window._brHistoryStore ? window._brHistoryStore[receiptId] : null;
    if (hist && hist.length && form) {
        const histDiv = document.createElement('div');
        histDiv.id = 'brEditHistDiv';
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
                    'Amount: <strong>' + (h.toAmount !== undefined && h.toAmount !== null ? '₹'+h.toAmount : (amount != null ? '₹'+amount : '—')) + '</strong> &nbsp;|&nbsp; ' +
                    'Book: <strong>' + (h.toBook !== undefined && h.toBook !== null ? h.toBook : (bookNum || '—')) + '</strong> &nbsp;|&nbsp; ' +
                    'Receipt: <strong>' + (h.toReceipt !== undefined && h.toReceipt !== null ? h.toReceipt : (receiptNum || '—')) + '</strong>' +
                    '</div>';
                return '<div style="padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #E3F2FD;margin-bottom:6px;font-size:.82rem;">' +
                    nameChange + amtChange + bookChange + recChange + modeChange + statusChange +
                    '<span style="color:#888;">Reason:</span> ' + (h.reason||'—') + ' &nbsp;<span style="color:#aaa;font-size:.75rem;">' + dt + ' by ' + (h.changedBy||'—') + '</span>' +
                    extraInfo +
                '</div>';
            }).join('');
        form.insertBefore(histDiv, form.firstChild);
    }
    
    // Normalize mode for selector dropdown
    let normMode = 'cash';
    if (mode) {
        const m = mode.toLowerCase();
        if (m === 'upi') normMode = 'upi';
        else if (m === 'check' || m === 'cheque') normMode = 'check';
        else if (m === 'rtgs') normMode = 'rtgs';
        else if (m === 'balance') normMode = 'balance';
        else if (m === 'online') normMode = 'online';
    }
    document.getElementById('brEditMode').value   = normMode;
    
    const statSel = document.getElementById('brEditStatusSel');
    if (statSel) statSel.value = status || 'pending';
    const bk = document.getElementById('brEditBook');
    if (bk) bk.value = bookNum || '';
    const rn = document.getElementById('brEditReceiptNum');
    if (rn) rn.value = receiptNum || '';
    const curDiv = document.getElementById('brEditCurPhoto');
    const curImg = document.getElementById('brEditCurPhotoImg');
    if (curDiv && curImg) {
        if (photoUrl) {
            curImg.src = (typeof fixUrl === 'function' ? fixUrl(photoUrl) : photoUrl) + '?t=' + Date.now();
            curImg.onclick = () => openAdminPbLightbox(typeof fixUrl === 'function' ? fixUrl(photoUrl) : photoUrl);
            curDiv.style.display = '';
        } else { curDiv.style.display = 'none'; }
    }
    window._brEditPhotoFile = null;
    const prev = document.getElementById('brEditPhotoPreview');
    if (prev) prev.style.display = 'none';
    const inp = document.getElementById('brEditPhotoInput');
    if (inp) { inp.value = ''; inp.onchange = function(ev) {
        const f=ev.target.files[0]; if(!f) return;
        if(!f.type.startsWith('image/')){ alert('Please select an image.'); inp.value=''; return; }
        window._brEditPhotoFile = null;
        if (typeof window._compressImage === 'function') {
            window._compressImage(f, 950, function(blob) {
                if(!blob){ alert('Could not process image.'); return; }
                window._brEditPhotoFile = blob;
                const t=document.getElementById('brEditPhotoThumb');
                const p=document.getElementById('brEditPhotoPreview');
                if(t) t.src=URL.createObjectURL(blob);
                if(p) p.style.display='';
            });
        } else {
            window._brEditPhotoFile=f;
            const r2=new FileReader(); r2.onload=function(re){const t=document.getElementById('brEditPhotoThumb');const p=document.getElementById('brEditPhotoPreview');if(t)t.src=re.target.result;if(p)p.style.display='';}; r2.readAsDataURL(f);
        }
    }; }
    const st = document.getElementById('brEditStatus');
    if (st) st.style.display = 'none';
    const modal = document.getElementById('brEditModal');
    if (modal) modal.style.display = 'flex';
}

function closeBrEditModal() {
    _brEditReceiptIdStore = null;
    const modal = document.getElementById('brEditModal');
    if (modal) modal.style.display = 'none';
    const form  = document.getElementById('brEditForm');
    if (form) form.reset();
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', function () {
    const m = document.getElementById('brEditModal');
    if (m) m.addEventListener('click', function (e) {
        if (e.target === this) closeBrEditModal();
    });
});

async function saveBrEditEntry(ev) {
    ev.preventDefault();
    const id  = document.getElementById('brEditReceiptId').value;
    if (!id) return;
    const type = document.getElementById('brEditType')?.value || 'balance';
    const extraBookId = document.getElementById('brEditExtraBookId')?.value || '';
    const btn = document.getElementById('brEditSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const st = document.getElementById('brEditStatus');
    const bkVal = document.getElementById('brEditBook')?.value;
    const rnVal = document.getElementById('brEditReceiptNum')?.value;
    
    const donorName = document.getElementById('brEditName').value.trim();
    const amount = Number(document.getElementById('brEditAmount').value || 0);
    const mode = document.getElementById('brEditMode').value;
    const status = document.getElementById('brEditStatusSel')?.value || 'pending';
    const bookNumber = bkVal ? Number(bkVal) : undefined;
    const receiptNumber = rnVal ? Number(rnVal) : undefined;

    let url = '';
    let method = 'PUT';
    let payload = {};

    if (type === 'pauti-slip') {
        const slipNum = receiptNumber;
        if (!extraBookId || !slipNum) {
            if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent = 'Missing Book ID or Slip Number.'; }
            if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
            return;
        }
        url = `/api/pauti-books/${encodeURIComponent(extraBookId)}/slips/${encodeURIComponent(slipNum)}`;
        
        let capMode = 'cash';
        if (mode.toLowerCase() === 'upi') capMode = 'upi';
        else if (mode.toLowerCase() === 'check' || mode.toLowerCase() === 'cheque') capMode = 'cheque';
        else if (mode.toLowerCase() === 'rtgs') capMode = 'rtgs';
        else if (mode.toLowerCase() === 'balance') capMode = 'balance';
        else if (mode.toLowerCase() === 'cash') capMode = 'cash';

        payload = {
            donorName: donorName,
            amount: amount,
            paymentMode: capMode,
            status: status
        };
    } else if (type === 'donation-entry') {
        url = `/api/donation-entries/${encodeURIComponent(id)}`;
        let capMode = 'Cash';
        if (mode.toLowerCase() === 'upi') capMode = 'UPI';
        else if (mode.toLowerCase() === 'check' || mode.toLowerCase() === 'cheque') capMode = 'Cheque';
        else if (mode.toLowerCase() === 'rtgs') capMode = 'RTGS';
        else if (mode.toLowerCase() === 'balance') capMode = 'Balance';
        else if (mode.toLowerCase() === 'cash') capMode = 'Cash';
        
        payload = {
            _isAdmin: true,
            donorType: 'Individual',
            amount: amount,
            paymentMode: capMode,
            status: status,
            bookNumber: bookNumber,
            receiptNumber: receiptNumber
        };
        const nameParts = donorName.split(/\s+/);
        if (nameParts.length === 1) {
            payload.firstName = nameParts[0];
            payload.middleName = '';
            payload.lastName = '';
        } else if (nameParts.length === 2) {
            payload.firstName = nameParts[0];
            payload.middleName = '';
            payload.lastName = nameParts[1];
        } else {
            payload.firstName = nameParts[0];
            payload.middleName = nameParts.slice(1, nameParts.length - 1).join(' ');
            payload.lastName = nameParts[nameParts.length - 1];
        }
    } else {
        url = `/api/receipts/${encodeURIComponent(id)}`;
        payload = {
            name: donorName,
            amount: amount,
            paymentMode: mode,
            status: status,
            bookNumber: bookNumber,
            receiptNumber: receiptNumber
        };
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (window._brEditPhotoFile) {
                try {
                    const fd = new FormData();
                    fd.append('passbook', window._brEditPhotoFile, 'receipt.jpg');
                    if (type === 'donation-entry') {
                        fd.append('entryId', id);
                    } else if (type === 'pauti-slip') {
                        fd.append('bookId', extraBookId);
                        fd.append('slipNum', receiptNumber);
                    } else {
                        fd.append('receiptId', id);
                    }
                    await fetch('/api/upload-passbook', { method: 'POST', body: fd });
                    window._brEditPhotoFile = null;
                } catch (_px) {}
            }
            closeBrEditModal();
            showNotification('✅ Recovery entry updated!', 'success');
            loadBalanceRecovery();
        } else {
            if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent = data.message || 'Could not save.'; }
        }
    } catch (e) {
        if (st) { st.style.display='block'; st.style.background='#FFEBEE'; st.style.color='#c0392b'; st.textContent = 'Server error.'; }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
}

// =====================================================================
// VOLUNTEER MANAGEMENT MODULE  (server-backed)
// =====================================================================

let _volAll = [];      // full list from server
let _volFiltered = []; // filtered for display

async function loadVolunteers() {
    const tbody = document.getElementById('volTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:24px;">Loading…</td></tr>';
    try {
        const res  = await fetch('/api/users');
        const data = await res.json();
        _volAll = (data.users || []).filter(u => u.role !== 'admin');

        // Update stats
        const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setEl('volStatTotal',   _volAll.length);
        setEl('volStatActive',  _volAll.filter(v => !v.blocked).length);
        setEl('volStatBlocked', _volAll.filter(v => v.blocked).length);

        _volFiltered = _volAll;
        volFilter();
    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#c00;padding:24px;">⚠ Cannot reach server.</td></tr>';
    }
}

function volFilter() {
    const q = (document.getElementById('volSearchInput')?.value || '').toLowerCase();
    _volFiltered = q
        ? _volAll.filter(u =>
            (u.name     || '').toLowerCase().includes(q) ||
            (u.username || '').toLowerCase().includes(q) ||
            (u.email    || '').toLowerCase().includes(q) ||
            (u.role     || '').toLowerCase().includes(q))
        : [..._volAll];
    volRender();
}

function volRender() {
    const tbody = document.getElementById('volTbody');
    if (!tbody) return;
    if (_volFiltered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:30px;">No users found.</td></tr>';
        return;
    }
    const roleBg  = { admin:'#EDE7F6', volunteer:'#E3F2FD', committee:'#E8F5E9' };
    const roleClr = { admin:'#4527A0', volunteer:'#1565C0', committee:'#1B5E20' };
    tbody.innerHTML = _volFiltered.map((u, i) => {
        const statusBadge = u.blocked
            ? '<span style="padding:3px 11px;border-radius:12px;background:#FFEBEE;color:#c0392b;font-size:.75rem;font-weight:700;">🔒 Blocked</span>'
            : '<span style="padding:3px 11px;border-radius:12px;background:#E8F5E9;color:#1B5E20;font-size:.75rem;font-weight:700;">✅ Active</span>';
        const roleBadge = `<span style="padding:3px 10px;border-radius:12px;background:${roleBg[u.role]||'#f5f5f5'};color:${roleClr[u.role]||'#555'};font-size:.75rem;font-weight:700;">${(u.role||'').toUpperCase()}</span>`;
        const safeUser = escHtml(u.username);
        const editBtn = `<button class="btn-icon btn-edit" title="Edit Volunteer" onclick="editUser('${safeUser}', '${escHtml(u.name||u.username)}', '${escHtml(u.email||'')}', '${escHtml(u.role||'')}', '${escHtml(u.department||'')}')"><i class="fas fa-edit"></i></button>`;
        const blockBtn = u.blocked
            ? `<button class="btn-icon btn-edit" style="background:#E8F5E9;color:#1B5E20;" title="Unblock" onclick="volToggleBlock('${safeUser}',false)"><i class="fas fa-unlock"></i></button>`
            : `<button class="btn-icon" style="background:#FFF3E0;color:#E65100;" title="Block"   onclick="volToggleBlock('${safeUser}',true)"><i class="fas fa-ban"></i></button>`;
        return `<tr style="background:${u.blocked ? '#fff5f5' : (i%2===0?'#fff':'#f9fafe')};">
            <td style="color:#aaa;font-size:.8rem;">${i+1}</td>
            <td><strong>${escHtml(u.name||u.username)}</strong><br><code style="font-size:.8rem;color:#555;">${safeUser}</code></td>
            <td>${roleBadge}</td>
            <td style="font-size:.85rem;color:#555;">${escHtml(u.email||'—')}</td>
            <td style="font-size:.85rem;color:#555;">${escHtml(u.department||'—')}</td>
            <td>${statusBadge}</td>
            <td><div class="action-btns">${editBtn}${blockBtn}</div></td>
        </tr>`;
    }).join('');
}

async function volToggleBlock(username, shouldBlock) {
    const action = shouldBlock ? 'block' : 'unblock';
    if (!confirm(`Are you sure you want to ${action} "${username}"?`)) return;
    try {
        const res  = await fetch('/api/users/block', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ username, blocked: shouldBlock })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification(shouldBlock ? `🔒 "${username}" blocked.` : `✅ "${username}" unblocked.`, shouldBlock ? 'error' : 'success');
            await loadVolunteers();
        } else {
            showNotification('Error: ' + (data.message || 'Could not update.'), 'error');
        }
    } catch (e) {
        showNotification('Cannot reach server.', 'error');
    }
}

function volExportCSV() {
    const rows = _volAll.map(u => ({ ...u, status: u.blocked ? 'Blocked' : 'Active' }));
    if (!rows.length) { showNotification('No users to export.', 'error'); return; }
    const header = ['Name','Username','Role','Email','Department','Status'];
    const csv = [header.join(','), ...rows.map(r => [
        `"${r.name||r.username}"`, `"${r.username}"`,
        r.role, `"${r.email||''}"`, `"${r.department||''}"`, r.status
    ].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'users_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showNotification('✅ CSV exported!', 'success');
}


// ── Admin view of all donation entries ────────────────────────────────────────
let _deAdmAllEntries = [];

async function loadAdminDonationEntries() {
    const tbody = document.getElementById('deAdmTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>';
    try {
        const res  = await fetch('/api/donation-entries');
        const data = await res.json();
        _deAdmAllEntries = (data.entries || []).slice().reverse();
        deAdmApplyFilter();
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#c0392b;padding:24px;">⚠ Cannot reach server.</td></tr>';
    }
}

function deAdmApplyFilter() {
    const q     = (document.getElementById('deAdmSearch')?.value || '').toLowerCase().trim();
    const list  = q ? _deAdmAllEntries.filter(e => {
        const donor = e.donorType === 'Business' ? (e.businessName||'') : [e.firstName,e.middleName,e.lastName].filter(Boolean).join(' ');
        return (donor + ' ' + (e.area||'') + ' ' + (e.paymentMode||'') + ' ' + (e.submittedBy||'')).toLowerCase().includes(q);
    }) : _deAdmAllEntries;

    const totalAmt   = list.reduce((s,e) => s + (Number(e.amount)||0), 0);
    const withPhoto  = list.filter(e => e.photoUrl).length;
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('deAdmCount',     list.length.toLocaleString('en-IN'));
    setEl('deAdmTotal',     '₹' + totalAmt.toLocaleString('en-IN'));
    setEl('deAdmWithPhoto', withPhoto.toLocaleString('en-IN'));

    const tbody = document.getElementById('deAdmTbody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:24px;">No entries found.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(e => {
        const donor   = e.donorType === 'Business' ? (e.businessName||'—') : [e.firstName,e.middleName,e.lastName].filter(Boolean).join(' ') || '—';
        const amt     = e.amount != null ? '₹' + Number(e.amount).toLocaleString('en-IN') : '<span style="color:#ccc;">—</span>';
        const dtObj   = new Date(e.submittedAt);
        const dtTime  = dtObj.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase();
        const dtDate  = dtObj.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
        const photoCell = e.photoUrl
            ? `<img src="${e.photoUrl}?t=${Date.now()}" loading="lazy" onclick="openAdminPbLightbox('${e.photoUrl}')" style="width:44px;height:44px;object-fit:cover;border-radius:7px;border:1.5px solid #ffe0d0;cursor:pointer;" title="Click to enlarge">`
            : '<span style="color:#ccc;font-size:.8rem;">—</span>';
        let modeBadge = `<span style="padding:3px 9px;border-radius:10px;background:#E3F2FD;color:#1565C0;font-size:.76rem;font-weight:700;">${e.paymentMode||'—'}</span>`;
        if (e.markedReceivedBy) {
            modeBadge = `<span style="padding:3px 9px;border-radius:10px;background:#E8F5E9;color:#2E7D32;font-size:.76rem;font-weight:700;">Received</span>
                         <div style="font-size:0.75rem;color:#E65100;font-weight:700;margin-top:6px;line-height:1.2;">Marked received by ${escHtml(e.markedReceivedBy)}</div>`;
        }
        const safeId  = (e.entryId||'').replace(/'/g,"\\'");
        return `<tr>
            <td style="vertical-align:middle;"><strong>Bk${e.bookNumber}</strong> ${ (e.bookType||'New')==='Old' ? '<span style="background:#FFF3E0;color:#E65100;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">Old</span>' : '<span style="background:#E3F2FD;color:#1565C0;font-size:.7rem;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px;">New</span>' }<br><span style="font-size:.8rem;color:#888;">#${e.receiptNumber}</span></td>
            <td>${escHtml(donor)}</td>
            <td>${escHtml(e.area||'—')}</td>
            <td style="color:#2E7D32;font-weight:600;">${amt}</td>
            <td>${modeBadge}</td>
            <td style="text-align:center;">${photoCell}</td>
            <td style="font-size:.82rem;color:#3949AB;">${escHtml(e.submittedBy||'—')}</td>
            <td style="font-size:.78rem;color:#888;white-space:nowrap;">${dtTime}<br>${dtDate}</td>
            <td>
                <button class="btn-icon btn-delete" title="Delete entry" onclick="deAdmDelete('${safeId}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

async function deAdmDelete(entryId) {
    if (!confirm('Delete this donation entry? This cannot be undone.')) return;
    try {
        const res  = await fetch(`/api/donation-entries/${encodeURIComponent(entryId)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification('Entry deleted.', 'success');
            _deAdmAllEntries = _deAdmAllEntries.filter(e => e.entryId !== entryId);
            deAdmApplyFilter();
        } else {
            showNotification('Error: ' + (data.message || 'Delete failed.'), 'error');
        }
    } catch(e) {
        showNotification('Cannot reach server.', 'error');
    }
}

// ==================== EXCEL TRANSLATOR & EXPORT ====================
async function translateExcelData(data) {
    showNotification('Translating to Marathi, please wait... (This may take a minute)', 'info');
    let allStrings = new Set();
    data.forEach(row => {
        Object.keys(row).forEach(k => allStrings.add(String(k).trim()));
        Object.values(row).forEach(v => {
            if (v != null && String(v).trim() !== '') allStrings.add(String(v).trim());
        });
    });
    
    let stringArray = Array.from(allStrings);
    if(stringArray.length === 0) return data;
    
    try {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ strings: stringArray })
        });
        const d = await res.json();
        if (d.success && d.translated) {
            let map = {};
            stringArray.forEach((s, i) => map[s] = d.translated[i] || s);
            
            return data.map(row => {
                let newRow = {};
                Object.entries(row).forEach(([k, v]) => {
                    let newK = map[String(k).trim()] || k;
                    let newV = (v != null && String(v).trim() !== '') ? (map[String(v).trim()] || v) : v;
                    newRow[newK] = newV;
                });
                return newRow;
            });
        }
    } catch(e) {
        console.error(e);
        showNotification('Translation API error. Downloading in English.', 'error');
    }
    return data;
}

async function translateUploadedExcel() {
    if (typeof XLSX === 'undefined') {
        showNotification('Excel library not loaded.', 'error');
        return;
    }
    const fileInput = document.getElementById('translatorFile');
    const status = document.getElementById('translatorStatus');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showNotification('Please select an Excel file first.', 'error');
        return;
    }
    const file = fileInput.files[0];
    status.style.display = 'inline';
    status.style.color = '#e67e22';
    status.textContent = 'Reading & translating...';
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            if(jsonData.length === 0) {
                status.style.color = '#c0392b';
                status.textContent = 'Excel file is empty.';
                return;
            }
            
            let translatedData = await translateExcelData(jsonData);
            
            const newWs = XLSX.utils.json_to_sheet(translatedData);
            const newWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWb, newWs, "Translated");
            
            const newFilename = "Translated_Marathi_" + file.name;
            XLSX.writeFile(newWb, newFilename);
            
            status.style.color = '#27ae60';
            status.textContent = 'Translation complete! Downloaded.';
            setTimeout(() => { status.style.display = 'none'; }, 5000);
            fileInput.value = ''; // clear
            
        } catch(err) {
            console.error(err);
            status.style.color = '#c0392b';
            status.textContent = 'Error processing file.';
        }
    };
    reader.readAsArrayBuffer(file);
}

// Expose translator functions globally for HTML onclick handlers
window.translateExcelData = translateExcelData;
window.translateUploadedExcel = translateUploadedExcel;
window.exportAdminDonationEntriesToExcel = exportAdminDonationEntriesToExcel;
window.saveSiteSettingsForm = saveSiteSettingsForm;

async function exportAdminDonationEntriesToExcel(lang = 'en') {
    if (typeof XLSX === 'undefined') {
        showNotification('Excel export library is not loaded.', 'error');
        return;
    }
    
    if (!_deAdmAllEntries || _deAdmAllEntries.length === 0) {
        showNotification('No entries to export.', 'error');
        return;
    }
    
    // Format data following the requested structure
    const data = _deAdmAllEntries.map(e => {
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
        
        return {
            'Book Number': e.bookNumber || '',
            'Book Type': e.bookType || 'New',
            'Receipt Number': e.receiptNumber || '',
            'Donor Name': donorName || '',
            'Landmark': e.landmark || e.buildingName || '',
            'Location': e.location || e.area || '',
            'Common Landmark': e.commonLandmark || '',
            'Amount': e.amount || 0,
            'Payment Mode': e.paymentMode || '',
            'Submitted By': e.submittedBy || '',
            'Date Submitted': submittedDate,
            'Time Submitted': submittedTime,
            'Status': e.status || '',
            'Reference Number': e.referenceNumber || '',
            'Entry ID': e.entryId || ''
        };
    });
    
    let finalData = data;
    if (lang === 'mr') {
        finalData = await translateExcelData(data);
    }
    
    const ws = XLSX.utils.json_to_sheet(finalData);
    
    const colWidths = [
        { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 20 }, { wch: 25 }
    ];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Donation Entries");
    
    const filename = "Donation_Data_Entry_" + new Date().toISOString().split('T')[0] + ".xlsx";
    XLSX.writeFile(wb, filename);
    showNotification('Exported to Excel successfully!', 'success');
}

// ==================== GALLERY MANAGEMENT ====================
let _adminGalleryPhotos = [];

async function loadAdminGallery() {
    const grid = document.getElementById('adminGalleryGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;color:#aaa;grid-column: 1 / -1;padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';
    
    try {
        const res = await fetch('/api/gallery');
        const data = await res.json();
        if (res.ok && data.photos) {
            _adminGalleryPhotos = data.photos;
            renderAdminGallery();
        }
    } catch(e) {
        grid.innerHTML = '<div style="text-align:center;color:#c0392b;grid-column: 1 / -1;padding:30px;">Failed to load gallery.</div>';
    }
}

function renderAdminGallery() {
    const grid = document.getElementById('adminGalleryGrid');
    if (!grid) return;
    
    if (_adminGalleryPhotos.length === 0) {
        grid.innerHTML = '<div style="text-align:center;color:#aaa;grid-column: 1 / -1;padding:30px;">No photos uploaded yet.</div>';
        return;
    }
    
    grid.innerHTML = _adminGalleryPhotos.map(photo => `
        <div class="gallery-card" style="border:1px solid #eee; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; background:#fff; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
            <div style="height:150px; overflow:hidden; background:#fafafa;">
                <img src="${photo.photoUrl}" style="width:100%; height:100%; object-fit:cover;" alt="Gallery Image">
            </div>
            <div style="padding:12px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                <p style="font-size:0.9rem; color:#555; margin-bottom:10px;">${escHtml(photo.description || 'No description')}</p>
                <div style="display:flex; justify-content:space-between;">
                    <button class="btn btn-small" style="padding:4px 8px; font-size:0.8rem; background:#f0f0f0;" onclick="editGalleryPhoto('${photo.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-small btn-delete" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteGalleryPhoto('${photo.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function openGalleryModal() {
    document.getElementById('galleryForm').reset();
    document.getElementById('galleryId').value = '';
    document.getElementById('galleryModalTitle').textContent = 'Upload Photo';
    document.getElementById('galleryPhotoGroup').style.display = 'block';
    document.getElementById('galleryPhoto').required = true;
    document.getElementById('galleryModal').style.display = 'flex';
}

function closeGalleryModal() {
    document.getElementById('galleryModal').style.display = 'none';
}

function editGalleryPhoto(id) {
    const photo = _adminGalleryPhotos.find(p => p.id === id);
    if (!photo) return;
    
    document.getElementById('galleryForm').reset();
    document.getElementById('galleryId').value = photo.id;
    document.getElementById('galleryDesc').value = photo.description || '';
    
    document.getElementById('galleryModalTitle').textContent = 'Edit Photo Description';
    document.getElementById('galleryPhotoGroup').style.display = 'none';
    document.getElementById('galleryPhoto').required = false;
    
    document.getElementById('galleryModal').style.display = 'flex';
}

async function saveGalleryPhoto(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('gallerySubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const id = document.getElementById('galleryId').value;
    const desc = document.getElementById('galleryDesc').value;
    
    try {
        if (id) {
            // Edit existing (only description)
            const res = await fetch(`/api/gallery/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: desc })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showNotification('Photo updated.', 'success');
                closeGalleryModal();
                loadAdminGallery();
            } else {
                showNotification(data.message || 'Update failed.', 'error');
            }
        } else {
            // Upload new
            const fileInput = document.getElementById('galleryPhoto');
            if (!fileInput.files.length) {
                showNotification('Please select a photo.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Upload';
                return;
            }
            
            const formData = new FormData();
            formData.append('photo', fileInput.files[0]);
            formData.append('description', desc);
            
            const res = await fetch('/api/gallery', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showNotification('Photo uploaded.', 'success');
                closeGalleryModal();
                loadAdminGallery();
            } else {
                showNotification(data.message || 'Upload failed.', 'error');
            }
        }
    } catch(e) {
        showNotification('Cannot reach server.', 'error');
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = id ? 'Save Changes' : 'Upload';
}

async function deleteGalleryPhoto(id) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/gallery/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification('Photo deleted.', 'success');
            loadAdminGallery();
        } else {
            showNotification(data.message || 'Delete failed.', 'error');
        }
    } catch(e) {
        showNotification('Cannot reach server.', 'error');
    }
}

// ==================== EVENTS MANAGEMENT ====================
let _adminEventsList = [];

async function loadAdminEvents() {
    const tbody = document.getElementById('adminEventsTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>';
    
    try {
        const res = await fetch('/api/events');
        const data = await res.json();
        if (res.ok && data.events) {
            _adminEventsList = data.events;
            // Sort by date (newest first)
            _adminEventsList.sort((a,b) => new Date(b.date) - new Date(a.date));
            renderAdminEvents();
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c0392b;padding:24px;">Failed to load events.</td></tr>';
    }
}

function renderAdminEvents() {
    const tbody = document.getElementById('adminEventsTbody');
    if (!tbody) return;
    
    if (_adminEventsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:24px;">No events added yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = _adminEventsList.map(ev => {
        let dateStr = ev.date;
        try { dateStr = new Date(ev.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); } catch(e){}
        
        return `
            <tr>
                <td><strong>${escHtml(ev.title)}</strong></td>
                <td>${dateStr} ${ev.time ? `<br><span style="font-size:0.85em;color:#777;">${escHtml(ev.time)}</span>` : ''}</td>
                <td>${escHtml(ev.location || '—')}</td>
                <td><span title="${escHtml(ev.description || '')}">${escHtml(ev.description || '—').substring(0, 50)}${ev.description && ev.description.length > 50 ? '...' : ''}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Edit" onclick="editEvent('${ev.id}')" style="color:var(--primary-color);"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-delete" title="Delete" onclick="deleteEvent('${ev.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openEventModal() {
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventModalTitle').textContent = 'Add Event';
    document.getElementById('eventModal').style.display = 'flex';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
}

function editEvent(id) {
    const ev = _adminEventsList.find(e => e.id === id);
    if (!ev) return;
    
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = ev.id;
    document.getElementById('eventTitle').value = ev.title || '';
    document.getElementById('eventDate').value = ev.date || '';
    document.getElementById('eventTime').value = ev.time || '';
    document.getElementById('eventLocation').value = ev.location || '';
    document.getElementById('eventDesc').value = ev.description || '';
    
    document.getElementById('eventModalTitle').textContent = 'Edit Event';
    document.getElementById('eventModal').style.display = 'flex';
}

async function saveEvent(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('eventSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const id = document.getElementById('eventId').value;
    const payload = {
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        location: document.getElementById('eventLocation').value,
        description: document.getElementById('eventDesc').value
    };
    
    try {
        const url = id ? `/api/events/${encodeURIComponent(id)}` : '/api/events';
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification(id ? 'Event updated.' : 'Event added.', 'success');
            closeEventModal();
            loadAdminEvents();
        } else {
            showNotification(data.message || 'Operation failed.', 'error');
        }
    } catch(e) {
        showNotification('Cannot reach server.', 'error');
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Save Event';
}

async function deleteEvent(id) {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showNotification('Event deleted.', 'success');
            loadAdminEvents();
        } else {
            showNotification(data.message || 'Delete failed.', 'error');
        }
    } catch(e) {
        showNotification('Cannot reach server.', 'error');
    }
}


// ==================== ADMIN DONOR SEARCH (replicated from volunteer dashboard) ====================
let _dsRecords  = [], _dsColumns = [], _dsFiltered = [], _dsPage = 1;
let _dsAmtCol   = null;
let _dsYearCol  = null;
let _dsNameCol  = null;
let _dsAddrCols = [];
let _dsLandCols = [];
let _dsVolCols  = [];
const DS_PAGE   = 30;
let _dsFiltersOpen = false;

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
    if (_dsLandCols.length === 0 && _dsAddrCols.length > 1)
        _dsLandCols = [_dsAddrCols[_dsAddrCols.length - 1]];
    const seen = new Set();
    _dsVolCols  = [];
    const addCol = c => { if (c && !seen.has(c)) { seen.add(c); _dsVolCols.push(c); } };
    addCol(_dsNameCol);
    _dsAddrCols.forEach(addCol);
    _dsLandCols.forEach(addCol);
    addCol(_dsAmtCol);
    if (_dsVolCols.length > 4) {
        const keep = [];
        if (_dsNameCol)             keep.push(_dsNameCol);
        if (_dsAddrCols.length)     keep.push(_dsAddrCols[0]);
        if (_dsLandCols.length)     keep.push(_dsLandCols[0]);
        if (_dsAmtCol)              keep.push(_dsAmtCol);
        _dsVolCols = [...new Set(keep)];
    }
    if (_dsVolCols.length === 0) {
        const fin = /balance|cash|bank|withdrawn|collection|expense|growth|notes/i;
        _dsVolCols = _dsColumns.filter(c => !fin.test(c)).slice(0, 4);
    }
}

function dsToggleFilters() {
    _dsFiltersOpen = !_dsFiltersOpen;
    const panel = document.getElementById('dsFilterPanel');
    const lbl   = document.getElementById('dsToggleBtnLabel');
    const btn   = document.getElementById('dsToggleFiltersBtn');
    if (panel) panel.style.display  = _dsFiltersOpen ? '' : 'none';
    if (lbl)   lbl.textContent      = _dsFiltersOpen ? 'Hide Filters' : 'Filters';
    if (btn)   btn.style.background = _dsFiltersOpen ? '#e8eaf6' : '#f8f9fa';
}

function _dsGetYear(r) {
    if (_dsYearCol && r[_dsYearCol] !== undefined && String(r[_dsYearCol]).trim() !== '')
        return String(r[_dsYearCol]).trim();
    for (const col of _dsColumns) {
        const m = String(r[col] ?? '').match(/\b(19|20)\d{2}\b/);
        if (m) return m[0];
    }
    return 'Unknown';
}

function _dsGroupByYear(records) {
    const map = new Map();
    records.forEach(r => {
        const yr = _dsGetYear(r);
        if (!map.has(yr)) map.set(yr, []);
        map.get(yr).push(r);
    });
    return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

async function loadDonorSearch() {
    const msgEl = document.getElementById('dsLoadingMsg');
    const wrap  = document.getElementById('dsTableWrap');
    if (msgEl) {
        msgEl.style.display = '';
        msgEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:1.3rem;margin-bottom:10px;display:block;color:#ccc;"></i>Loading donor records…';
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
            if (msgEl) { msgEl.style.display = ''; msgEl.innerHTML = '<i class="fas fa-lock" style="font-size:1.4rem;opacity:.4;margin-bottom:8px;display:block;color:#888;"></i>No donor details available in current dataset.'; }
        } else {
            if (msgEl) { msgEl.style.display = ''; msgEl.innerHTML = '<i class="fas fa-cloud-upload-alt" style="font-size:1.8rem;opacity:.3;margin-bottom:8px;display:block;"></i>No data uploaded yet.'; }
        }
    } catch (e) {
        if (msgEl) { msgEl.style.display = ''; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="font-size:1.4rem;opacity:.5;margin-bottom:8px;display:block;color:#E67E22;"></i>&#9888; Cannot connect to server.'; }
    }
}

function dsApplyFilters() {
    const gq   = (document.getElementById('dsGlobalSearch')?.value || '').toLowerCase().trim();
    const locQ = (document.getElementById('dsLocSearch')?.value    || '').toLowerCase().trim();
    const lanQ = (document.getElementById('dsLandSearch')?.value   || '').toLowerCase().trim();
    const mn   = parseFloat(document.getElementById('dsAmtMin')?.value || '') || null;
    const mx   = parseFloat(document.getElementById('dsAmtMax')?.value || '') || null;

    _dsFiltered = _dsRecords.filter(r => {
        if (locQ) { const hay = (_dsAddrCols.length ? _dsAddrCols : _dsColumns).map(c => String(r[c]??'')).join(' ').toLowerCase(); if (!hay.includes(locQ)) return false; }
        if (lanQ) { const hay = (_dsLandCols.length ? _dsLandCols : _dsColumns).map(c => String(r[c]??'')).join(' ').toLowerCase(); if (!hay.includes(lanQ)) return false; }
        if (_dsAmtCol && (mn !== null || mx !== null)) { const a = parseFloat(r[_dsAmtCol]) || 0; if (mn !== null && a < mn) return false; if (mx !== null && a > mx) return false; }
        if (gq) { const hay = _dsVolCols.map(c => String(r[c]??'')).join(' ').toLowerCase(); if (!hay.includes(gq)) return false; }
        return true;
    });

    const sum = _dsAmtCol ? _dsFiltered.reduce((s, r) => s + (parseFloat(r[_dsAmtCol]) || 0), 0) : 0;
    const ct  = document.getElementById('dsChipTotal');
    const cm  = document.getElementById('dsChipMatch');
    const cs  = document.getElementById('dsChipSum');
    if (ct) ct.textContent = _dsRecords.length.toLocaleString('en-IN') + ' total';
    if (cm) cm.textContent = _dsFiltered.length.toLocaleString('en-IN') + ' shown';
    if (cs) cs.textContent = _dsAmtCol ? '₹' + sum.toLocaleString('en-IN') : '';
    _dsPage = 1;
    dsRenderTable();
}

function dsClearFilters() {
    ['dsGlobalSearch','dsLocSearch','dsLandSearch','dsAmtMin','dsAmtMax'].forEach(id => {
        const e = document.getElementById(id); if (e) e.value = '';
    });
    dsApplyFilters();
}

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

    thead.innerHTML = '<tr>' + _dsVolCols.map(c => '<th>' + c + '</th>').join('') + '</tr>';

    const groups   = _dsGroupByYear(_dsFiltered);
    const flatRows = [];
    groups.forEach((recs, yr) => {
        const yearSum = _dsAmtCol ? recs.reduce((s, r) => s + (parseFloat(r[_dsAmtCol]) || 0), 0) : null;
        flatRows.push({ type: 'header', yr, count: recs.length, sum: yearSum });
        recs.forEach(r => flatRows.push({ type: 'row', r }));
    });

    const start    = (_dsPage - 1) * DS_PAGE;
    const pageRows = flatRows.slice(start, start + DS_PAGE);

    tbody.innerHTML = pageRows.map(item => {
        if (item.type === 'header') {
            const sumTxt = item.sum !== null ? ' &nbsp;&middot;&nbsp; <span style="color:#27AE60;font-weight:700;">₹' + item.sum.toLocaleString('en-IN') + '</span>' : '';
            return '<tr><td colspan="' + _dsVolCols.length + '" class="ds-year-header" style="padding:9px 12px;background:linear-gradient(90deg,#1a237e0a,transparent);border-top:2px solid #e8eaf0;border-bottom:1px solid #e8eaf0;"><span style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;width:100%;"><span style="background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;border-radius:20px;padding:2px 12px;font-size:.76rem;font-weight:700;letter-spacing:.04em;">' + item.yr + '</span><span style="font-size:.8rem;color:#666;">' + item.count.toLocaleString('en-IN') + ' donors' + sumTxt + '</span></span></td></tr>';
        }
        const cells = _dsVolCols.map(col => {
            const v    = item.r[col] ?? '';
            const disp = col === _dsAmtCol && v !== '' ? '<strong style="color:#2E7D32;">₹' + Number(v).toLocaleString('en-IN') + '</strong>' : '<span title="' + String(v).replace(/"/g, '&quot;') + '">' + v + '</span>';
            return '<td data-label="' + String(col).replace(/"/g, '&quot;') + '">' + disp + '</td>';
        }).join('');
        return '<tr onmouseover="this.style.background=\\\'#eef2ff\\\'" onmouseout="this.style.background=\\\'\\\'">' + cells + '</tr>';
    }).join('');

    const tp = Math.ceil(flatRows.length / DS_PAGE);
    const pi = document.getElementById('dsPaginationInfo');
    const pb = document.getElementById('dsPaginationBtns');
    if (pi) pi.textContent = (start+1) + '–' + Math.min(start+DS_PAGE, flatRows.length) + ' of ' + _dsFiltered.length.toLocaleString('en-IN') + ' records';
    if (pb) {
        pb.innerHTML = '';
        if (tp > 1) {
            const mk = (lbl, p, active) => {
                const b = document.createElement('button');
                b.innerHTML = lbl;
                b.style.cssText = 'padding:4px 10px;border:1.5px solid ' + (active?'#3949AB':'#ddd') + ';border-radius:6px;background:' + (active?'#3949AB':'#fff') + ';color:' + (active?'#fff':'#333') + ';cursor:pointer;font-size:.78rem;';
                if (!active) { b.onmouseover=()=>b.style.background='#f0f2ff'; b.onmouseout=()=>b.style.background='#fff'; }
                b.onclick = () => { _dsPage = p; dsRenderTable(); };
                return b;
            };
            if (_dsPage > 1) pb.appendChild(mk('&laquo;', _dsPage - 1, false));
            for (let p = Math.max(1, _dsPage - 2); p <= Math.min(tp, _dsPage + 2); p++)
                pb.appendChild(mk(p, p, p === _dsPage));
            if (_dsPage < tp) pb.appendChild(mk('&raquo;', _dsPage + 1, false));
        }
    }
}

function dsExportCSV() {
    if (!_dsFiltered.length) return;
    const header = _dsVolCols.join(',');
    const rows   = _dsFiltered.map(r => _dsVolCols.map(c => '"' + String(r[c]??'').replace(/"/g,'""') + '"').join(','));
    const blob   = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = 'donor_search_export.csv'; a.click();
    URL.revokeObjectURL(url);
}


// --- MY PROFILE (ADMIN) ---
function loadMyProfileAdmin() {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    document.getElementById('profAdminName').value = user.name || '';
    document.getElementById('profAdminEmail').value = user.email || user.username || '';
    document.getElementById('profAdminContact').value = user.contactNumber || '';
    document.getElementById('profAdminPassword').value = '';
    
    if (user.photoUrl) {
        document.getElementById('profAdminPhotoPreview').src = user.photoUrl;
        document.getElementById('profAdminPhotoPreview').style.display = 'block';
    } else {
        document.getElementById('profAdminPhotoPreview').style.display = 'none';
    }
    
    if (user.idProofUrl) {
        document.getElementById('profAdminIdPreview').src = user.idProofUrl;
        document.getElementById('profAdminIdPreview').style.display = 'block';
    } else {
        document.getElementById('profAdminIdPreview').style.display = 'none';
    }
}

function previewProfileImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).src = e.target.result;
            document.getElementById(previewId).style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function saveAdminProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('profAdminBtn');
    btn.disabled = true;
    btn.innerHTML = 'Saving...';
    
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const payload = {
        username: user.username,
        name: document.getElementById('profAdminName').value.trim(),
        contactNumber: document.getElementById('profAdminContact').value.trim(),
        password: document.getElementById('profAdminPassword').value || undefined
    };
    
    const photoFile = document.getElementById('profAdminPhoto').files[0];
    if (photoFile) {
        payload.photoBase64 = await fileToBase64(photoFile);
        payload.photoExt = photoFile.name.split('.').pop();
    }
    
    const idFile = document.getElementById('profAdminId').files[0];
    if (idFile) {
        payload.idProofBase64 = await fileToBase64(idFile);
        payload.idProofExt = idFile.name.split('.').pop();
    }
    
    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            // Update session storage
            user.name = data.user.name;
            user.contactNumber = data.user.contactNumber || '';
            if (data.user.photoUrl) user.photoUrl = data.user.photoUrl;
            if (data.user.idProofUrl) user.idProofUrl = data.user.idProofUrl;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            // Update UI Name immediately
            document.getElementById('adminName').textContent = user.name;
            if (document.getElementById('topNavName')) document.getElementById('topNavName').textContent = user.name;
            const avatarEl = document.getElementById('topNavAvatar');
            if (avatarEl) {
                if (user.photoUrl) {
                    avatarEl.innerHTML = '<img src="' + user.photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
                    avatarEl.style.padding = '0';
                    avatarEl.style.overflow = 'hidden';
                } else {
                    avatarEl.innerHTML = '';
                    avatarEl.textContent = user.name.charAt(0).toUpperCase();
                    avatarEl.style.padding = '';
                }
            }
            alert('Profile updated successfully!');
            document.getElementById('profAdminPassword').value = '';
            
            // Refresh users list if we are looking at it
            if(typeof loadUsers === 'function') loadUsers();
            
        } else {
            alert('Error updating profile: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        alert('Server unreachable');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Profile';
}

// Hook into showAdminSection
const originalShowAdminSection = window.showAdminSection;
if (originalShowAdminSection) {
    window.showAdminSection = function(id) {
        if (id === 'myprofile') {
            loadMyProfileAdmin();
        }
        originalShowAdminSection(id);
    };
}

// ==================== GLOBAL EVENT SETTINGS ====================
async function loadAdminEventDate() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data && data.eventDate) {
            const dateStr = data.eventDate.split('T')[0];
            document.getElementById('adminEventDate').value = dateStr;
        }
        if (data && data.eventName) document.getElementById('adminEventName').value = data.eventName;
        if (data && data.eventDesc) document.getElementById('adminEventDesc').value = data.eventDesc;

        // Cloudinary Config
        if (data && data.cloudinaryConfig) {
            const cloudinary = data.cloudinaryConfig;
            if (document.getElementById('cloudinaryCloudName')) document.getElementById('cloudinaryCloudName').value = cloudinary.cloudName || '';
            if (document.getElementById('cloudinaryApiKey')) document.getElementById('cloudinaryApiKey').value = cloudinary.apiKey || '';
            if (document.getElementById('cloudinaryApiSecret')) document.getElementById('cloudinaryApiSecret').value = cloudinary.apiSecret || '';
        }

        // Quick Stats
        if (data && data.yearsOfService !== undefined) {
            const el = document.getElementById('adminYearsOfService');
            if (el) el.value = data.yearsOfService;
        }
        if (data && data.activeVolunteers !== undefined) {
            const el = document.getElementById('adminActiveVolunteers');
            if (el) el.value = data.activeVolunteers;
        }

        // About Section text
        if (data && data.aboutText) {
            const el = document.getElementById('adminAboutText');
            if (el) el.value = data.aboutText;
        }
        // About Section photo preview
        if (data && data.aboutPhoto) {
            const wrap = document.getElementById('adminAboutPhotoPreviewWrap');
            const img  = document.getElementById('adminAboutPhotoPreview');
            if (wrap && img) { img.src = data.aboutPhoto; wrap.style.display = 'block'; }
        }

        // About Page text
        if (data && data.aboutPageText) {
            const el = document.getElementById('adminAboutPageText');
            if (el) el.value = data.aboutPageText;
        }
        // About Page photo preview
        if (data && data.aboutPagePhoto) {
            const wrap = document.getElementById('adminAboutPagePhotoPreviewWrap');
            const img  = document.getElementById('adminAboutPagePhotoPreview');
            if (wrap && img) { img.src = data.aboutPagePhoto; wrap.style.display = 'block'; }
        }

        // T-shirt Showcase Photos
        if (data && data.tshirtPhotos) {
            for (let i = 0; i < 4; i++) {
                const photoUrl = data.tshirtPhotos[i];
                const wrap = document.getElementById(`adminTshirtPhotoPreviewWrap${i}`);
                const img = document.getElementById(`adminTshirtPhotoPreview${i}`);
                if (wrap && img && photoUrl) {
                    img.src = photoUrl;
                    wrap.style.display = 'block';
                }
            }
        }

        // Countdown timer inputs
        const cdDateInput = document.getElementById('countdownDateInput');
        const cdTimeInput = document.getElementById('countdownTimeInput');
        const previewBox  = document.getElementById('countdownPreviewBox');
        const previewText = document.getElementById('countdownPreviewText');
        const cdIso = data && (data.countdownDate || data.eventDate);
        if (cdIso && cdDateInput) {
            const dt = new Date(cdIso);
            cdDateInput.value = dt.toISOString().split('T')[0];
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            if (cdTimeInput) cdTimeInput.value = `${hh}:${mm}`;
            if (previewBox && previewText) {
                previewText.textContent = dt.toLocaleString('en-IN', {
                    weekday: 'short', year: 'numeric', month: 'long',
                    day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                previewBox.style.display = 'block';
            }
        }

        // Banner preview
        const bannerPreview = document.getElementById('adminBannerPreview');
        if (data && data.dashboardBanner) {
            bannerPreview.src = data.dashboardBanner;
            bannerPreview.style.display = 'block';
        } else {
            bannerPreview.style.display = 'none';
        }

        // Footer & Social Settings
        if (data) {
            if (data.footerAboutText) document.getElementById('adminFooterAboutText').value = data.footerAboutText;
            if (data.contactAddress) document.getElementById('adminContactAddress').value = data.contactAddress;
            if (data.contactPhone) document.getElementById('adminContactPhone').value = data.contactPhone;
            if (data.contactEmail) document.getElementById('adminContactEmail').value = data.contactEmail;
            if (data.socialFacebook) document.getElementById('adminSocialFacebook').value = data.socialFacebook;
            if (data.socialInstagram) document.getElementById('adminSocialInstagram').value = data.socialInstagram;
            if (data.socialYoutube) document.getElementById('adminSocialYoutube').value = data.socialYoutube;
            if (data.socialTwitter) document.getElementById('adminSocialTwitter').value = data.socialTwitter;
        }
    } catch (e) {
        console.warn('Failed to load settings:', e.message);
    }
}

// Save Website Settings (Footer & Social)
async function saveSiteSettingsForm() {
    const payload = {
        footerAboutText: document.getElementById('adminFooterAboutText')?.value || '',
        contactAddress: document.getElementById('adminContactAddress')?.value || '',
        contactPhone: document.getElementById('adminContactPhone')?.value || '',
        contactEmail: document.getElementById('adminContactEmail')?.value || '',
        socialFacebook: document.getElementById('adminSocialFacebook')?.value || '',
        socialInstagram: document.getElementById('adminSocialInstagram')?.value || '',
        socialYoutube: document.getElementById('adminSocialYoutube')?.value || '',
        socialTwitter: document.getElementById('adminSocialTwitter')?.value || ''
    };
    
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            const status = document.getElementById('adminSiteSettingsStatus');
            if (status) {
                status.style.opacity = '1';
                setTimeout(() => status.style.opacity = '0', 3000);
            }
        } else {
            alert('Failed to save settings: ' + (data.message || 'Unknown error'));
        }
    } catch(e) {
        alert('Error: ' + e.message);
    }
}

async function saveCloudinaryConfig() {
    const cloudName = document.getElementById('cloudinaryCloudName')?.value.trim();
    const apiKey = document.getElementById('cloudinaryApiKey')?.value.trim();
    const apiSecret = document.getElementById('cloudinaryApiSecret')?.value.trim();

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cloudinaryConfig: { cloudName, apiKey, apiSecret }
            })
        });
        const data = await res.json();
        if (data.success) {
            const s = document.getElementById('cloudinaryConfigStatus');
            if (s) { s.style.opacity = '1'; setTimeout(() => s.style.opacity = '0', 3000); }
        } else {
            alert('Failed to save Cloudinary config: ' + (data.message || 'Unknown error'));
        }
    } catch(e) { alert('Error: ' + e.message); }
}

// Save Quick Stats (Years of Service + Active Volunteers)
async function saveQuickStats() {
    const yos = document.getElementById('adminYearsOfService')?.value;
    const av  = document.getElementById('adminActiveVolunteers')?.value;
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yearsOfService: yos, activeVolunteers: av })
        });
        const data = await res.json();
        if (data.success) {
            const s = document.getElementById('quickStatsStatus');
            if (s) { s.style.opacity = '1'; setTimeout(() => s.style.opacity = '0', 3000); }
        } else { alert('Failed to save stats: ' + (data.message || 'Unknown error')); }
    } catch(e) { alert('Error: ' + e.message); }
}

// Save About Section (text + optional photo)
async function saveAboutSection() {
    const text      = document.getElementById('adminAboutText')?.value || '';
    const fileInput = document.getElementById('adminAboutPhoto');
    let photoUrl    = null;

    // Upload photo first if one was selected
    if (fileInput && fileInput.files[0]) {
        const fd = new FormData();
        fd.append('photo', fileInput.files[0]);
        try {
            const r = await fetch('/api/about-photo', { method: 'POST', body: fd });
            const d = await r.json();
            if (d.success) {
                photoUrl = d.url;
                const wrap = document.getElementById('adminAboutPhotoPreviewWrap');
                const img  = document.getElementById('adminAboutPhotoPreview');
                if (wrap && img) { img.src = photoUrl; wrap.style.display = 'block'; }
                fileInput.value = '';
            } else { alert('Photo upload failed: ' + (d.message || 'Unknown error')); return; }
        } catch(e) { alert('Photo upload error: ' + e.message); return; }
    }

    // Save text
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aboutText: text })
        });
        const data = await res.json();
        if (data.success) {
            const s = document.getElementById('aboutSectionStatus');
            if (s) { s.style.opacity = '1'; setTimeout(() => s.style.opacity = '0', 3000); }
        } else { alert('Failed to save: ' + (data.message || 'Unknown error')); }
    } catch(e) { alert('Error: ' + e.message); }
}

// Save About Page (text + optional photo)
async function saveAboutPage() {
    const text      = document.getElementById('adminAboutPageText')?.value || '';
    const fileInput = document.getElementById('adminAboutPagePhoto');
    let photoUrl    = null;

    // Upload photo first if one was selected
    if (fileInput && fileInput.files[0]) {
        const fd = new FormData();
        fd.append('photo', fileInput.files[0]);
        try {
            const r = await fetch('/api/about-page-photo', { method: 'POST', body: fd });
            const d = await r.json();
            if (d.success) {
                photoUrl = d.url;
                const wrap = document.getElementById('adminAboutPagePhotoPreviewWrap');
                const img  = document.getElementById('adminAboutPagePhotoPreview');
                if (wrap && img) { img.src = photoUrl; wrap.style.display = 'block'; }
                fileInput.value = '';
            } else { alert('Photo upload failed: ' + (d.message || 'Unknown error')); return; }
        } catch(e) { alert('Photo upload error: ' + e.message); return; }
    }

    // Save text
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aboutPageText: text })
        });
        const data = await res.json();
        if (data.success) {
            const s = document.getElementById('aboutPageStatus');
            if (s) { s.style.opacity = '1'; setTimeout(() => s.style.opacity = '0', 3000); }
        } else { alert('Failed to save: ' + (data.message || 'Unknown error')); }
    } catch(e) { alert('Error: ' + e.message); }
}


// Upload T-shirt Showcase Photo
async function uploadAdminTshirtPhoto(slot) {
    const fileInput = document.getElementById(`adminTshirtPhoto${slot}`);
    const file = fileInput.files[0];
    if (!file) return alert('Please select an image file first.');
    
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('slot', slot);
    
    try {
        const res = await fetch('/api/tshirt-showcase-photo', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            const wrap = document.getElementById(`adminTshirtPhotoPreviewWrap${slot}`);
            const img = document.getElementById(`adminTshirtPhotoPreview${slot}`);
            if (wrap && img) {
                img.src = data.url;
                wrap.style.display = 'block';
            }
            fileInput.value = '';
        } else {
            alert('Upload failed: ' + (data.message || 'Unknown error'));
        }
    } catch (e) {
        alert('Upload error: ' + e.message);
    }
}

// Delete T-shirt Showcase Photo
async function deleteAdminTshirtPhoto(slot) {
    if (!confirm('Are you sure you want to remove this image?')) return;
    try {
        const res = await fetch(`/api/tshirt-showcase-photo/${slot}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            const wrap = document.getElementById(`adminTshirtPhotoPreviewWrap${slot}`);
            const img = document.getElementById(`adminTshirtPhotoPreview${slot}`);
            if (wrap && img) {
                wrap.style.display = 'none';
                img.src = '';
            }
            document.getElementById(`adminTshirtPhoto${slot}`).value = '';
        } else {
            alert('Failed to remove: ' + (data.message || 'Unknown error'));
        }
    } catch (e) {
        alert('Error removing photo: ' + e.message);
    }
}


async function saveCountdownTimer() {
    const dateVal = document.getElementById('countdownDateInput')?.value;
    const timeVal = document.getElementById('countdownTimeInput')?.value || '00:00';
    if (!dateVal) return alert('Please select a date for the countdown.');
    const isoStr = new Date(`${dateVal}T${timeVal}:00`).toISOString();
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countdownDate: isoStr })
        });
        const data = await res.json();
        if (data.success) {
            const statusEl = document.getElementById('countdownTimerStatus');
            if (statusEl) { statusEl.style.opacity = '1'; setTimeout(() => statusEl.style.opacity = '0', 3000); }
            // Update preview
            const dt = new Date(isoStr);
            const previewText = document.getElementById('countdownPreviewText');
            const previewBox  = document.getElementById('countdownPreviewBox');
            if (previewText) {
                previewText.textContent = dt.toLocaleString('en-IN', {
                    weekday: 'short', year: 'numeric', month: 'long',
                    day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            }
            if (previewBox) previewBox.style.display = 'block';
        } else {
            alert('Failed to save: ' + (data.message || data.error || 'Unknown error'));
        }
    } catch (e) {
        alert('Error saving countdown: ' + e.message);
    }
}


async function saveAdminEventDate() {
    const n = document.getElementById('adminEventName').value;
    const d = document.getElementById('adminEventDate').value;
    const desc = document.getElementById('adminEventDesc').value;
    if (!d || !n) return alert('Please provide event name and date');
    const isoDate = new Date(d).toISOString();
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventName: n, eventDate: isoDate, eventDesc: desc })
        });
        const data = await res.json();
        if (data.success) {
            const statusEl = document.getElementById('adminEventDateStatus');
            statusEl.style.opacity = '1';
            setTimeout(() => statusEl.style.opacity = '0', 3000);
            if (typeof loadAdminEvents === 'function') loadAdminEvents();
        } else {
            alert('Failed to save: ' + (data.message || data.error || 'Unknown error'));
        }
    } catch (e) {
        alert('Error saving event: ' + e.message);
    }
}

async function uploadAdminBanner() {
    const fileInput = document.getElementById('adminBannerFile');
    const file = fileInput.files[0];
    if (!file) return alert('Please select an image file first.');
    
    const formData = new FormData();
    formData.append('banner', file);
    
    try {
        const res = await fetch('/api/banner', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('adminBannerPreview').src = data.url;
            document.getElementById('adminBannerPreview').style.display = 'block';
            fileInput.value = '';
            alert('Banner uploaded successfully!');
        } else {
            alert('Failed to upload: ' + (data.message || 'Unknown error'));
        }
    } catch (e) {
        alert('Error uploading banner: ' + e.message);
    }
}

async function deleteAdminBanner() {
    if (!confirm('Are you sure you want to remove the banner?')) return;
    try {
        const res = await fetch('/api/banner', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            document.getElementById('adminBannerPreview').style.display = 'none';
            document.getElementById('adminBannerPreview').src = '';
            alert('Banner removed successfully!');
        } else {
            alert('Failed to remove: ' + (data.message || 'Unknown error'));
        }
    } catch (e) {
        alert('Error removing banner: ' + e.message);
    }
}

// Call loadAdminEventDate on init
document.addEventListener('DOMContentLoaded', () => {
    loadAdminEventDate();
    // Init coordinator list if we're on the admin T-shirt section
    if (document.getElementById('adminCoordinatorList')) {
        adminTsInit();
    }
});

// ═══════════════════════════════════════════════════════
// ADMIN — T-SHIRT COORDINATOR MANAGEMENT
// ═══════════════════════════════════════════════════════

// Render the coordinator list in the admin panel
function adminTsRenderCoordinators() {
    const list = document.getElementById('adminCoordinatorList');
    if (!list) return;

    if (!window.tsCoordinators || window.tsCoordinators.length === 0) {
        list.innerHTML = `<div style="text-align:center;color:#bbb;padding:20px;font-size:0.9rem;">No coordinators added yet. Click <strong>+ Add Coordinator</strong> to begin.</div>`;
        return;
    }

    list.innerHTML = window.tsCoordinators.map((c, i) => `
    <div style="background:#f9fafb;border-radius:10px;border:1px solid #e8eaf6;padding:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <img src="${c.photo || ''}" alt="${c.name}"
            style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid #e8eaf6;flex-shrink:0;"
            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=3949AB&color=fff&size=54'">
        <div style="flex:1;min-width:180px;">
            <div style="font-weight:700;font-size:0.95rem;color:#1a237e;">${c.name}</div>
            <div style="font-size:0.82rem;color:#666;margin:2px 0;">${c.position}</div>
            <div style="font-size:0.82rem;color:#888;">📱 ${c.phone}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
            <button onclick="adminTsEditCoordinator(${i})"
                style="padding:7px 14px;background:#e8eaf6;color:#3949AB;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button onclick="adminTsDeleteCoordinator(${i})"
                style="padding:7px 12px;background:#ffcdd2;color:#c62828;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>`).join('');
}

// Open modal for adding or editing a coordinator
function adminTsOpenModal(idx) {
    const isEdit = idx !== null && idx !== undefined;
    const c = isEdit ? window.tsCoordinators[idx] : { name: '', position: '', phone: '', photo: '' };

    let modal = document.getElementById('adminCoordModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'adminCoordModal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
    <div onclick="if(event.target===this)this.style.display='none'" style="display:flex;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 12px 40px rgba(0,0,0,.22);overflow:hidden;">
            <div style="padding:18px 22px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#3949AB,#5c6bc0);">
                <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="fas fa-user-edit" style="margin-right:8px;"></i>${isEdit ? 'Edit' : 'Add'} Coordinator</h3>
                <span onclick="document.getElementById('adminCoordModal').style.display='none'" style="color:#fff;font-size:1.5rem;cursor:pointer;line-height:1;opacity:.8;">&times;</span>
            </div>
            <div style="padding:22px;display:flex;flex-direction:column;gap:14px;">
                <div>
                    <label style="display:block;font-size:.82rem;font-weight:600;color:#555;margin-bottom:5px;">Full Name *</label>
                    <input id="acdName" type="text" value="${c.name}" placeholder="e.g. Ravi Sharma"
                        style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none;"
                        onfocus="this.style.borderColor='#3949AB'" onblur="this.style.borderColor='#ddd'">
                </div>
                <div>
                    <label style="display:block;font-size:.82rem;font-weight:600;color:#555;margin-bottom:5px;">Position / Role *</label>
                    <input id="acdPosition" type="text" value="${c.position}" placeholder="e.g. Lead Coordinator"
                        style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none;"
                        onfocus="this.style.borderColor='#3949AB'" onblur="this.style.borderColor='#ddd'">
                </div>
                <div>
                    <label style="display:block;font-size:.82rem;font-weight:600;color:#555;margin-bottom:5px;">WhatsApp Number (with country code) *</label>
                    <input id="acdPhone" type="text" value="${c.phone}" placeholder="e.g. 919876543210"
                        style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none;"
                        onfocus="this.style.borderColor='#3949AB'" onblur="this.style.borderColor='#ddd'">
                    <div style="font-size:.76rem;color:#888;margin-top:4px;">Include country code without + (e.g. 91 for India)</div>
                </div>
                <div>
                    <label style="display:block;font-size:.82rem;font-weight:600;color:#555;margin-bottom:5px;">Photo <span style="font-weight:400;color:#aaa;">(optional)</span></label>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input id="acdPhotoFile" type="file" accept="image/*"
                            style="flex:1; padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none;"
                            onfocus="this.style.borderColor='#3949AB'" onblur="this.style.borderColor='#ddd'"
                            onchange="if(this.files[0]) document.getElementById('acdPhotoPreview').src = URL.createObjectURL(this.files[0])">
                        <input type="hidden" id="acdPhoto" value="${c.photo || ''}">
                        <img id="acdPhotoPreview" src="${c.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'C')}&background=3949AB&color=fff&size=54`}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid #ddd;">
                    </div>
                    <div style="font-size:.76rem;color:#888;margin-top:4px;">Select an image from your device. Leave blank to auto-generate an avatar.</div>
                </div>
                <div id="acdError" style="display:none;padding:8px 12px;background:#FFEBEE;color:#c62828;border-radius:8px;font-size:.85rem;"></div>
            </div>
            <div style="padding:16px 22px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="document.getElementById('adminCoordModal').style.display='none'"
                    style="padding:9px 20px;background:#f5f5f5;border:none;border-radius:8px;cursor:pointer;font-size:.9rem;color:#555;">Cancel</button>
                <button onclick="adminTsSaveCoordinator(${isEdit ? idx : 'null'})"
                    style="padding:9px 22px;background:#3949AB;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.9rem;font-weight:700;">
                    <i class="fas fa-save" style="margin-right:6px;"></i>${isEdit ? 'Save Changes' : 'Add Coordinator'}
                </button>
            </div>
        </div>
    </div>`;
    modal.style.display = 'block';
}

function adminTsAddCoordinator() { adminTsOpenModal(null); }
function adminTsEditCoordinator(idx) { adminTsOpenModal(idx); }

async function adminTsSaveCoordinator(idx) {
    const name     = document.getElementById('acdName')?.value.trim();
    const position = document.getElementById('acdPosition')?.value.trim();
    const phone    = (document.getElementById('acdPhone')?.value || '').replace(/\D/g, '');
    let photo      = document.getElementById('acdPhoto')?.value.trim();
    const errEl    = document.getElementById('acdError');

    if (!name || !position || !phone) {
        errEl.style.display = 'block';
        errEl.textContent = 'Name, Position, and Phone are required.';
        return;
    }

    const fileInput = document.getElementById('acdPhotoFile');
    if (fileInput && fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        const btn = event.currentTarget;
        const oldText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        btn.disabled = true;
        try {
            const upRes = await fetch('/api/upload-image', { method: 'POST', body: formData });
            const upData = await upRes.json();
            if (upData.success) {
                photo = upData.url;
            } else {
                errEl.style.display = 'block';
                errEl.textContent = 'Photo upload failed: ' + (upData.message || 'Unknown error');
                btn.innerHTML = oldText;
                btn.disabled = false;
                return;
            }
        } catch (e) {
            errEl.style.display = 'block';
            errEl.textContent = 'Upload error: ' + e.message;
            btn.innerHTML = oldText;
            btn.disabled = false;
            return;
        }
    }

    const entry = {
        name, position, phone,
        photo: photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3949AB&color=fff&size=80`
    };

    if (idx === null || idx === undefined || idx === 'null') {
        window.tsCoordinators.push(entry);
    } else {
        window.tsCoordinators[idx] = entry;
    }

    try {
        const res = await fetch('/api/tshirts/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: window.tsPrice || 350, coordinators: window.tsCoordinators })
        });
        if (res.ok) {
            document.getElementById('adminCoordModal').style.display = 'none';
            adminTsRenderCoordinators();
        } else {
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to save. Please try again.';
        }
    } catch (e) {
        errEl.style.display = 'block';
        errEl.textContent = 'Network error: ' + e.message;
    }
}

async function adminTsDeleteCoordinator(idx) {
    const name = window.tsCoordinators[idx]?.name || 'this coordinator';
    if (!confirm(`Delete "${name}"? This will update the public T-shirt page.`)) return;
    window.tsCoordinators.splice(idx, 1);
    try {
        await fetch('/api/tshirts/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: window.tsPrice || 350, coordinators: window.tsCoordinators })
        });
    } catch(e) { console.error(e); }
    adminTsRenderCoordinators();
}

// Load coordinators from server and render
async function adminTsInit() {
    if (!window.tsCoordinators) window.tsCoordinators = [];
    if (!window.tsPrice) window.tsPrice = 350;
    try {
        const res = await fetch('/api/tshirts/settings');
        const d = await res.json();
        if (d && Array.isArray(d.coordinators)) window.tsCoordinators = d.coordinators;
        if (d && d.price) window.tsPrice = d.price;
    } catch(e) {}
    adminTsRenderCoordinators();
}

// ═══════════════════════════════════════════════════════════════════
// DEVELOPERS SECTION  (Master-only admin management)
// ═══════════════════════════════════════════════════════════════════

// Show the Developers tab only for the master user
function initDevelopersSection() {
    const cuStr = sessionStorage.getItem('currentUser');
    if (!cuStr) return;
    const cu = JSON.parse(cuStr);
    const isMaster = cu.isMaster === true || cu.id === '__master__';
    
    // Unhide the sidebar menu item if master
    const navItem = document.getElementById('navDevelopersItem');
    if (navItem) {
        navItem.style.display = isMaster ? 'block' : 'none';
    }
    
    if (isMaster) {
        adminLoadDevelopers();
    }
}

// Load and render the developers list
async function adminLoadDevelopers() {
    const list = document.getElementById('adminDevelopersList');
    if (!list) return;
    try {
        const res = await fetch('/api/developers');
        const data = await res.json();
        const devs = data.developers || [];
        
        // Load the message from the API
        const devMsg = data.developerMessage || '';
        const msgInput = document.getElementById('devMessageInput');
        if (msgInput) msgInput.value = devMsg;

        // Load footer developer
        const footerDev = data.footerDeveloper || {};
        const fDevName = document.getElementById('footerDevName');
        const fDevPos = document.getElementById('footerDevPosition');
        const fDevPreview = document.getElementById('footerDevPhotoPreview');
        if (fDevName) fDevName.value = footerDev.name || '';
        if (fDevPos) fDevPos.value = footerDev.position || '';
        if (fDevPreview && footerDev.photoUrl) {
            fDevPreview.src = footerDev.photoUrl;
            fDevPreview.style.display = 'block';
        }

        if (devs.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:#aaa;padding:16px;font-size:0.9rem;">No developers added yet.</div>';
            return;
        }

        list.innerHTML = devs.map(dev => `
        <div style="background:#fff;border-radius:10px;border:1px solid #E0D5FF;padding:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <img src="${dev.photoUrl || ''}" alt="${dev.name}"
                style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #6C3DE8;flex-shrink:0;"
                onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=6C3DE8&color=fff&size=52'">
            <div style="flex:1;min-width:180px;">
                <div style="font-weight:700;font-size:0.95rem;color:#3D1F8C;">${dev.name}</div>
                <div style="font-size:0.82rem;color:#666;margin:2px 0;">${(dev.bio||'').substring(0,80)}${(dev.bio||'').length>80?'...':''}</div>
                ${dev.whatsapp ? `<div style="font-size:0.78rem;color:#25D366;"><i class="fab fa-whatsapp"></i> ${dev.whatsapp}</div>` : ''}
            </div>
            <button onclick="adminDeleteDeveloper('${dev.id}')"
                style="padding:7px 12px;background:#ffcdd2;color:#c62828;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;flex-shrink:0;">
                <i class="fas fa-trash"></i>
            </button>
        </div>`).join('');
    } catch(e) {
        list.innerHTML = '<div style="color:#e74c3c;padding:12px;font-size:0.9rem;">Failed to load developers.</div>';
    }
}

// Add a new developer
async function adminAddDeveloper() {
    const name = (document.getElementById('devName')?.value || '').trim();
    const bio  = (document.getElementById('devBio')?.value || '').trim();
    const whatsapp = (document.getElementById('devWhatsapp')?.value || '').trim();
    const photoInput = document.getElementById('devPhoto');
    const statusEl = document.getElementById('devAddStatus');

    if (!name) { alert('Please enter the developer name.'); return; }

    const fd = new FormData();
    fd.append('name', name);
    fd.append('bio', bio);
    fd.append('whatsapp', whatsapp);
    if (photoInput && photoInput.files[0]) fd.append('photo', photoInput.files[0]);

    const btn = document.querySelector('[onclick="adminAddDeveloper()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
        const res = await fetch('/api/developers', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            // Clear form
            document.getElementById('devName').value = '';
            document.getElementById('devBio').value = '';
            document.getElementById('devWhatsapp').value = '';
            if (photoInput) photoInput.value = '';
            document.getElementById('devPhotoPreviewWrap').style.display = 'none';

            if (statusEl) { statusEl.textContent = 'Developer added!'; statusEl.style.opacity = '1'; setTimeout(() => statusEl.style.opacity = '0', 3000); }
            await adminLoadDevelopers();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch(e) {
        alert('Failed: ' + e.message);
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Add Developer'; }
}

// Save the developer message
async function adminSaveDeveloperMessage() {
    const message = (document.getElementById('devMessageInput')?.value || '').trim();
    const btn = document.querySelector('[onclick="adminSaveDeveloperMessage()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
        const res = await fetch('/api/developers/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        if (data.success) {
            const statusEl = document.getElementById('devMessageStatus');
            if (statusEl) { 
                statusEl.textContent = 'Message saved successfully!'; 
                statusEl.style.opacity = '1'; 
                setTimeout(() => statusEl.style.opacity = '0', 3000); 
            }
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch(e) {
        alert('Failed: ' + e.message);
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Message'; }
}

// Save footer developer profile
async function adminSaveFooterDeveloper() {
    const name = (document.getElementById('footerDevName')?.value || '').trim();
    const position = (document.getElementById('footerDevPosition')?.value || '').trim();
    const photoInput = document.getElementById('footerDevPhoto');
    const statusEl = document.getElementById('footerDevStatus');

    if (!name) { alert('Please enter the footer developer name.'); return; }

    const fd = new FormData();
    fd.append('name', name);
    fd.append('position', position);
    if (photoInput && photoInput.files[0]) fd.append('photo', photoInput.files[0]);

    const btn = document.querySelector('[onclick="adminSaveFooterDeveloper()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
        const res = await fetch('/api/developers/footer', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            if (photoInput) photoInput.value = '';
            if (statusEl) { 
                statusEl.textContent = 'Footer profile saved successfully!'; 
                statusEl.style.opacity = '1'; 
                setTimeout(() => statusEl.style.opacity = '0', 3000); 
            }
            await adminLoadDevelopers();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch(e) {
        alert('Failed: ' + e.message);
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Footer Profile'; }
}

// Delete a developer
async function adminDeleteDeveloper(id) {
    if (!confirm('Remove this developer from the public page?')) return;
    try {
        const res = await fetch('/api/developers/' + encodeURIComponent(id), { method: 'DELETE' });
        const data = await res.json();
        if (data.success) await adminLoadDevelopers();
        else alert('Error: ' + (data.message || 'Unknown error'));
    } catch(e) {
        alert('Failed: ' + e.message);
    }
}

// Preview photo before upload
document.addEventListener('DOMContentLoaded', () => {
    const photoInput = document.getElementById('devPhoto');
    if (photoInput) {
        photoInput.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('devPhotoPreview');
                const wrap = document.getElementById('devPhotoPreviewWrap');
                if (preview && wrap) { preview.src = e.target.result; wrap.style.display = 'block'; }
            };
            reader.readAsDataURL(file);
        });
    }

    const fPhotoInput = document.getElementById('footerDevPhoto');
    if (fPhotoInput) {
        fPhotoInput.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('footerDevPhotoPreview');
                if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
            };
            reader.readAsDataURL(file);
        });
    }

    // Trigger Developers card visibility
    initDevelopersSection();
});
