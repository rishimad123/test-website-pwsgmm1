// tshirts.js - T-shirt Section UI Logic

// ════════════════════════════════════════════
// COORDINATOR DATA - Update these with real details
// ════════════════════════════════════════════
const TS_COORDINATORS = [
    { name: "Coordinator 1", position: "Lead Coordinator",    phone: "919876543210", photo: "https://ui-avatars.com/api/?name=C1&background=1565c0&color=fff&size=80" },
    { name: "Coordinator 2", position: "Logistics Head",      phone: "919876543211", photo: "https://ui-avatars.com/api/?name=C2&background=1b5e20&color=fff&size=80" },
    { name: "Coordinator 3", position: "Distribution Head",   phone: "919876543212", photo: "https://ui-avatars.com/api/?name=C3&background=e65100&color=fff&size=80" }
];

let tsPrice = 350;
let tsApplications = [];
let tsRendered = false;

// ════════════════════════════════════════════
// INIT — runs as soon as the script loads
// ════════════════════════════════════════════
(function init() {
    // Render immediately with default price so section is never blank
    renderTshirtSection();

    // Then fetch real data from API and re-render
    fetch('/api/tshirts/settings')
        .then(r => r.json())
        .then(d => { if (d && d.price) tsPrice = d.price; })
        .catch(() => {})
        .finally(() => {
            fetch('/api/tshirts')
                .then(r => r.json())
                .then(d => { if (d && d.tshirts) tsApplications = d.tshirts; })
                .catch(() => {})
                .finally(() => renderTshirtSection());
        });
})();

// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════
function isAdmin() {
    return !!document.getElementById('adminName') || window.location.pathname.includes('admin.html');
}
function isPublic() {
    return !document.getElementById('adminName') && !document.getElementById('topBarName');
}

// ════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════
function renderTshirtSection() {
    const adminMode = isAdmin();
    const publicMode = isPublic();

    if (publicMode) {
        const publicContainer = document.getElementById('tshirtSectionInner');
        if (!publicContainer) return;

        let html = '';
        html += `
        <div style="margin-bottom:28px;">
            <h3 style="margin:0 0 14px;font-size:1.05rem;color:#e74c3c;font-weight:700;">
                <span style="margin-right:6px;">&#128100;</span> T-shirt Coordinators
            </h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
                ${TS_COORDINATORS.map(c => `
                <div style="background:#fff;border-radius:14px;padding:18px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 10px rgba(0,0,0,.08);border:1px solid #f0f0f0;">
                    <img src="${c.photo}" alt="${c.name}" style="width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid #eee;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=e74c3c&color=fff&size=58'">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:1rem;color:#2c3e50;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
                        <div style="font-size:.8rem;color:#888;margin:2px 0 8px;">${c.position}</div>
                        <a href="https://wa.me/${c.phone}" target="_blank" style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:#25D366;color:#fff;border-radius:20px;font-size:.75rem;text-decoration:none;font-weight:600;">
                            &#128241; WhatsApp
                        </a>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;

        html += `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-bottom:28px;">
            <div style="background:#fff;border-radius:14px;padding:22px;box-shadow:0 2px 10px rgba(0,0,0,.08);border:2px solid #e74c3c;">
                <h3 style="margin:0 0 18px;color:#2c3e50;font-size:1rem;">
                    &#128248; Apply for T-shirt
                </h3>
                <form onsubmit="tsSubmitApplication(event)">
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Full Name *</label>
                        <input type="text" id="tsName" placeholder="Enter full name" required
                            style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none;"
                            onfocus="this.style.borderColor='#e74c3c'" onblur="this.style.borderColor='#ddd'">
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Mobile Number *</label>
                        <input type="tel" id="tsPhone" placeholder="10-digit number" pattern="[0-9]{10}" maxlength="10" required
                            style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none;"
                            onfocus="this.style.borderColor='#e74c3c'" onblur="this.style.borderColor='#ddd'">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div>
                            <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Size *</label>
                            <select id="tsSize" required
                                style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none;background:#fff;">
                                ${[18,20,22,24,26,28,30,32,34,36,38,40,42,44,46].map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Quantity *</label>
                            <input type="number" id="tsQty" value="1" min="1" max="20" required
                                oninput="tsUpdateTotal()"
                                style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none;"
                                onfocus="this.style.borderColor='#e74c3c'" onblur="this.style.borderColor='#ddd'">
                        </div>
                    </div>
                    <div style="background:#fff5f5;border-radius:8px;padding:12px 14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:600;color:#555;font-size:.9rem;">Total Amount:</span>
                        <span id="tsTotalDisplay" style="font-size:1.3rem;font-weight:800;color:#27ae60;">&#8377;${tsPrice}</span>
                    </div>
                    <button type="submit" style="width:100%;padding:11px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-size:.95rem;font-weight:700;cursor:pointer;transition:background .2s;"
                        onmouseover="this.style.background='#c0392b'" onmouseout="this.style.background='#e74c3c'">
                        &#10003; Submit Application
                    </button>
                    <div id="tsFormMsg" style="display:none;margin-top:10px;padding:9px;border-radius:6px;font-size:.85rem;text-align:center;"></div>
                </form>
            </div>
        </div>`;
        
        publicContainer.innerHTML = html;
        tsUpdateTotal();
    } else {
        // Admin or Volunteer Dashboard - Update Hardcoded DOM Elements
        const adminContainer = document.getElementById('tshirtSection');
        if (!adminContainer) return;

        // 1. Update Price Settings Value if Admin
        if (adminMode) {
            const priceInput = document.getElementById('tsAdminPrice');
            if (priceInput) priceInput.value = tsPrice;
        }

        // 2. Update Total Amount Display in Application Form
        tsUpdateTotal();

        // 3. Update Sizes Overview
        const sizeGroups = {};
        [18,20,22,24,26,28,30,32,34,36,38,40,42,44,46].forEach(s => sizeGroups[s] = 0);
        let totalShirts = 0;
        
        if (tsApplications && Array.isArray(tsApplications)) {
            tsApplications.forEach(app => {
                const s = parseInt(app.size);
                if (sizeGroups[s] !== undefined) { 
                    const q = parseInt(app.quantity) || 1;
                    sizeGroups[s] += q; 
                    totalShirts += q; 
                }
            });
        }

        const totalCountEl = document.getElementById('tsTotalCount');
        if (totalCountEl) {
            totalCountEl.textContent = 'Total: ' + totalShirts + ' shirts';
        }

        Object.keys(sizeGroups).forEach(size => {
            const count = sizeGroups[size];
            const box = document.getElementById('tsBox' + size);
            const countEl = document.getElementById('tsBoxCount' + size);
            
            if (box && countEl) {
                if (count > 0) {
                    box.style.background = '#E8F5E9';
                    box.style.borderColor = '#81C784';
                    box.querySelector('div').style.color = '#2E7D32';
                } else {
                    box.style.background = '#f9f9f9';
                    box.style.borderColor = '#eee';
                    box.querySelector('div').style.color = '#bbb';
                }
                countEl.textContent = count + ' req';
            }
        });
    }
}


// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════
function tsUpdateTotal() {
    const qty = parseInt(document.getElementById('tsQty')?.value) || 1;
    const el = document.getElementById('tsTotalDisplay');
    if (el) el.textContent = '₹' + (qty * tsPrice).toLocaleString('en-IN');
}

async function tsSubmitApplication(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const msgEl = document.getElementById('tsFormMsg');
    const data = {
        name: document.getElementById('tsName').value,
        phone: document.getElementById('tsPhone').value,
        size: document.getElementById('tsSize').value,
        quantity: parseInt(document.getElementById('tsQty').value) || 1,
        totalAmount: (parseInt(document.getElementById('tsQty').value) || 1) * tsPrice
    };
    btn.disabled = true; btn.textContent = 'Submitting...';
    try {
        const res = await fetch('/api/tshirts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        const resp = await res.json();
        if (res.ok) {
            msgEl.style.display = 'block'; msgEl.style.background = '#E8F5E9'; msgEl.style.color = '#1B5E20';
            msgEl.textContent = '✓ Application submitted successfully!';
            e.target.reset(); tsUpdateTotal();
            setTimeout(() => { msgEl.style.display='none'; renderTshirtSection(); }, 2500);
        } else { throw new Error(resp.message || 'Submission failed'); }
    } catch(err) {
        msgEl.style.display='block'; msgEl.style.background='#FFEBEE'; msgEl.style.color='#c62828';
        msgEl.textContent = err.message;
    } finally { btn.disabled=false; btn.innerHTML='&#10003; Submit Application'; }
}

async function tsUpdatePrice(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const msgEl = document.getElementById('tsAdminMsg');
    const newPrice = parseFloat(document.getElementById('tsAdminPrice').value);
    btn.disabled = true;
    try {
        const res = await fetch('/api/tshirts/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ price: newPrice }) });
        const d = await res.json();
        if (res.ok) {
            tsPrice = d.price || newPrice;
            msgEl.style.display='block'; msgEl.style.background='#E8F5E9'; msgEl.style.color='#1B5E20';
            msgEl.textContent = '✓ Price updated to ₹' + tsPrice;
            tsUpdateTotal();
            setTimeout(() => { msgEl.style.display='none'; }, 2500);
        } else { throw new Error(d.message || 'Update failed'); }
    } catch(err) {
        msgEl.style.display='block'; msgEl.style.background='#FFEBEE'; msgEl.style.color='#c62828';
        msgEl.textContent = err.message;
    } finally { btn.disabled=false; }
}

function tsOpenModal(size) {
    let modal = document.getElementById('tsModal');
    if (!modal) { modal = document.createElement('div'); modal.id='tsModal'; document.body.appendChild(modal); }
    const applicants = tsApplications.filter(a => parseInt(a.size) === size);
    modal.innerHTML = `
    <div onclick="if(event.target===this)this.style.display='none'" style="display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#fff;border-radius:14px;width:100%;max-width:620px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.25);">
            <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;">&#128248; Size ${size} – ${applicants.length} Applicant(s)</h3>
                <span onclick="document.getElementById('tsModal').style.display='none'" style="font-size:1.6rem;cursor:pointer;color:#999;line-height:1;">&times;</span>
            </div>
            <div style="padding:20px;overflow-y:auto;flex:1;">
                ${applicants.length === 0 ? `<p style="text-align:center;color:#aaa;padding:30px 0;">No applications for size ${size} yet.</p>` : `
                <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
                    <thead><tr style="background:#f5f5f5;">
                        <th style="padding:10px;text-align:left;">Name</th>
                        <th style="padding:10px;text-align:left;">Contact</th>
                        <th style="padding:10px;text-align:center;">Qty</th>
                        <th style="padding:10px;text-align:right;">Total</th>
                        <th style="padding:10px;text-align:center;">Status</th>
                    </tr></thead>
                    <tbody>
                    ${applicants.map(app => `
                        <tr style="border-bottom:1px solid #f0f0f0;">
                            <td style="padding:10px;font-weight:600;">${app.name}</td>
                            <td style="padding:10px;color:#666;">${app.phone || app.number || '-'}</td>
                            <td style="padding:10px;text-align:center;">${app.quantity}</td>
                            <td style="padding:10px;text-align:right;color:#27ae60;font-weight:600;">&#8377;${app.totalAmount || ((app.quantity || 1) * tsPrice)}</td>
                            <td style="padding:10px;text-align:center;">
                                <select onchange="this.style.background=this.value==='Received'?'#E8F5E9':'#FFF3E0';this.style.color=this.value==='Received'?'#1B5E20':'#E65100';tsUpdateStatus('${app.id||app._id}',this.value)"
                                    style="padding:4px 8px;border-radius:6px;border:1px solid #ddd;font-size:.8rem;background:${app.status==='Received'?'#E8F5E9':'#FFF3E0'};color:${app.status==='Received'?'#1B5E20':'#E65100'};">
                                    <option value="Pending" ${app.status!=='Received'?'selected':''}>Pending</option>
                                    <option value="Received" ${app.status==='Received'?'selected':''}>Received</option>
                                </select>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>`}
            </div>
            <div style="padding:14px 20px;border-top:1px solid #eee;text-align:right;">
                <button onclick="document.getElementById('tsModal').style.display='none'" style="padding:8px 18px;background:#f0f0f0;border:none;border-radius:8px;cursor:pointer;font-size:.9rem;">Close</button>
            </div>
        </div>
    </div>`;
    modal.style.display = 'block';
}

async function tsUpdateStatus(id, newStatus) {
    try {
        const res = await fetch('/api/tshirts/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: newStatus }) });
        if (res.ok) { const entry = tsApplications.find(a => (a.id||a._id) === id); if (entry) entry.status = newStatus; }
        else alert('Failed to update status.');
    } catch(e) { console.error(e); alert('Network error.'); }
}
