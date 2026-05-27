ction('balanceRecovery');
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
        const res  = await fetch('/api/pauti-books');
        const data = await res.json();
        const allSlips = [];
        (data.pautiBooks || []).forEach(book => {
            (book.slips || []).forEach(slip => {
                if (slip.uploadedAt && !slip.deleted && slip.amount && Number(slip.amount) > 0)
                    allSlips.push({ ...slip, bookNumber: book.bookNumber });
            });
        });
        allSlips.sort((a, b) => a.slipNumber - b.slipNumber);

        const total = allSlips.reduce((s, x) => s + Number(x.amount), 0);
        const fmt   = n => '₹' + Number(n).toLocaleString('en-IN');
        if (totalEl) totalEl.textContent = fmt(total);
        if (countEl) countEl.textContent = allSlips.length;

        // Group into books (50-slip ranges)
        const bookGroups = {};
        allSlips.forEach(s => {
            const bn = s.bookNumber;
            if (!bookGroups[bn]) bookGroups[bn] = { slips:[], total:0 };
            bookGroups[bn].slips.push(s);
            bookGroups[bn].total += Number(s.amount);
        });

        const books = Object.keys(bookGroups).sort((a,b)=>Number(a)-Number(b));
        if (books.length === 0) {
            tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px;">No Pauti slips with amounts found.</td></tr>';
            return;
        }
        tbodyEl.innerHTML = books.map(bn => {
            const g    = bookGroups[bn];
            const from = (Number(bn)-1)*50 + 1;
            const to   = Number(bn)*50;
            const avg  = g.slips.length > 0 ? g.total / g.slips.length : 0;
            return `<tr>
                <td>Slips ${from}&ndash;${to} (Book #${bn})</td>
                <td>${g.slips.length}</td>
                <td><strong style="color:#1B5E20;">${fmt(g.total)}</strong></td>
                <td style="color:#555;">${fmt(Math.round(avg))}</td>
            </tr>`;
        }).join('')
        + `<tr style="background:#FFF8F0;">
            <td><strong>Grand Total</strong></td>
            <td><strong>${allSlips.length}</strong></td>
            <td><strong style="color:var(--primary-color);font-size:1.05rem;">${fmt(total)}</strong></td>
            <td></td>
        </tr>`;
    } catch (e) {
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
                if (st) { st.style.display='block'; st.styl