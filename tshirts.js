// tshirts.js - Frontend logic for T-shirt Section

const TS_COORDINATORS = [
    { name: "Coordinator 1", position: "Lead Coordinator", phone: "919876543210", photo: "https://via.placeholder.com/80/e3f2fd/1565c0?text=C1" },
    { name: "Coordinator 2", position: "Logistics Head", phone: "919876543211", photo: "https://via.placeholder.com/80/e8f5e9/1b5e20?text=C2" },
    { name: "Coordinator 3", position: "Distribution Head", phone: "919876543212", photo: "https://via.placeholder.com/80/fff3e0/e65100?text=C3" }
];

let tsPrice = 350;
let tsApplications = [];
let isAdminMode = false;
let isPublicMode = false;

function initTshirts() {
    isAdminMode = !!document.getElementById('adminName') || window.location.pathname.includes('admin.html');
    isPublicMode = window.location.pathname.includes('index.html') || window.location.pathname === '/' || (!document.getElementById('adminName') && !document.getElementById('topBarName'));
    loadTshirtSection();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTshirts);
} else {
    initTshirts();
}

async function loadTshirtSection() {
    try {
        const [settRes, appRes] = await Promise.all([
            fetch('/api/tshirts/settings'),
            fetch('/api/tshirts')
        ]);
        
        const settData = await settRes.json();
        const appData = await appRes.json();
        
        if (settData.price) tsPrice = settData.price;
        if (appData.tshirts) tsApplications = appData.tshirts;
        
    } catch (e) {
        console.error('Error loading T-shirt data:', e);
    } finally {
        renderTshirtSection();
    }
}

function renderTshirtSection() {
    const container = document.getElementById('tshirtSection');
    if (!container) return;
    
    let html = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:22px;">
            <div>
                <h2 style="color:var(--dark-color);margin:0 0 4px;">T-shirt Section</h2>
                <p style="color:#777;margin:0;">Manage T-shirt applications and view sizes</p>
            </div>
            <button onclick="loadTshirtSection()" class="btn btn-small" style="background:#f4f4f4;color:#555;"><i class="fas fa-sync-alt"></i> Refresh</button>
        </div>
    `;

    // 1. Coordinators
    html += `
        <div style="margin-bottom:24px;">
            <h3 style="margin-bottom:12px;font-size:1.1rem;color:var(--primary-color);"><i class="fas fa-users" style="margin-right:8px;"></i>Coordinators</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:16px;">
                ${TS_COORDINATORS.map(c => `
                    <div style="background:#fff;border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,0.05);border:1px solid #eee;">
                        <img src="${c.photo}" alt="${c.name}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">
                        <div style="flex:1;">
                            <h4 style="margin:0;font-size:1rem;">${c.name}</h4>
                            <p style="margin:2px 0 6px;font-size:0.8rem;color:#777;">${c.position}</p>
                            <a href="https://wa.me/${c.phone}" target="_blank" style="display:inline-block;padding:4px 10px;background:#25D366;color:#fff;border-radius:12px;font-size:0.75rem;text-decoration:none;font-weight:600;"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // 2. Application Form & Price Setting
    html += `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:20px;margin-bottom:24px;">
            <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);border:1.5px solid var(--primary-color);">
                <h3 style="margin:0 0 16px;color:var(--dark-color);"><i class="fas fa-tshirt" style="color:var(--primary-color);margin-right:8px;"></i>Apply for T-shirt</h3>
                <form onsubmit="submitTshirtApplication(event)">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="tsFormName" class="form-control" placeholder="Full Name" required>
                    </div>
                    <div class="form-group">
                        <label>Mobile Number</label>
                        <input type="tel" id="tsFormNumber" class="form-control" placeholder="10-digit number" pattern="[0-9]{10}" maxlength="10" required>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div class="form-group" style="margin:0;">
                            <label>Size</label>
                            <select id="tsFormSize" class="form-control" required>
                                ${[18,20,22,24,26,28,30,32,34,36,38,40,42,44,46].map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label>Quantity</label>
                            <input type="number" id="tsFormQuantity" class="form-control" value="1" min="1" max="10" oninput="updateTsTotal()" required>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:10px;background:#f9f9f9;border-radius:8px;">
                        <span style="font-weight:600;color:#555;">Total Amount:</span>
                        <span id="tsFormTotal" style="font-size:1.2rem;font-weight:700;color:#2E7D32;">₹${tsPrice}</span>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%;"><i class="fas fa-check"></i> Submit Application</button>
                    <div id="tsFormStatus" style="margin-top:10px;display:none;padding:8px;border-radius:6px;font-size:0.85rem;text-align:center;"></div>
                </form>
            </div>
    `;

    if (isAdminMode) {
        html += `
            <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);border:1px solid #ddd;height:fit-content;">
                <h3 style="margin:0 0 16px;color:var(--dark-color);"><i class="fas fa-cog" style="color:#777;margin-right:8px;"></i>Admin Settings</h3>
                <form onsubmit="updateTshirtPrice(event)">
                    <div class="form-group">
                        <label>Price per T-shirt (₹)</label>
                        <input type="number" id="tsAdminPrice" class="form-control" value="${tsPrice}" min="0" required>
                    </div>
                    <button type="submit" class="btn" style="background:#3949AB;color:#fff;"><i class="fas fa-save"></i> Save Price</button>
                    <div id="tsAdminStatus" style="margin-top:10px;display:none;padding:8px;border-radius:6px;font-size:0.85rem;"></div>
                </form>
            </div>
        `;
    } else {
        html += `<div></div>`; // Empty placeholder for grid balance
    }
    
    html += `</div>`;

    if (!isPublicMode) {
        // 3. Summary view
        const sizeGroups = {};
        [18,20,22,24,26,28,30,32,34,36,38,40,42,44,46].forEach(s => sizeGroups[s] = 0);
        
        let totalShirts = 0;
        tsApplications.forEach(app => {
            if (sizeGroups[app.size] !== undefined) {
                sizeGroups[app.size] += app.quantity;
                totalShirts += app.quantity;
            }
        });

        html += `
            <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);border:1px solid #ddd;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h3 style="margin:0;color:var(--dark-color);"><i class="fas fa-chart-pie" style="color:#E65100;margin-right:8px;"></i>Sizes Overview</h3>
                    <span style="font-weight:700;background:#FFF3E0;color:#E65100;padding:4px 12px;border-radius:12px;">Total: ${totalShirts} shirts</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:12px;">
                    ${Object.keys(sizeGroups).map(size => {
                        const count = sizeGroups[size];
                        return `
                            <div onclick="openTsApplicantsModal(${size})" style="cursor:pointer;flex:1;min-width:70px;text-align:center;padding:12px;border-radius:8px;background:${count > 0 ? '#E8F5E9' : '#f9f9f9'};border:1px solid ${count > 0 ? '#C8E6C9' : '#eee'};transition:all .2s;">
                                <div style="font-size:1.1rem;font-weight:700;color:${count > 0 ? '#2E7D32' : '#999'};">${size}</div>
                                <div style="font-size:0.8rem;color:#777;margin-top:4px;">${count} req</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <p style="margin:12px 0 0;font-size:0.8rem;color:#888;text-align:center;">Click on any size to view applicants and update status.</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

function updateTsTotal() {
    const qty = parseInt(document.getElementById('tsFormQuantity').value) || 1;
    document.getElementById('tsFormTotal').textContent = '₹' + (qty * tsPrice).toLocaleString('en-IN');
}

async function submitTshirtApplication(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const statusDiv = document.getElementById('tsFormStatus');
    
    const data = {
        name: document.getElementById('tsFormName').value,
        number: document.getElementById('tsFormNumber').value,
        size: document.getElementById('tsFormSize').value,
        quantity: document.getElementById('tsFormQuantity').value
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        const res = await fetch('/api/tshirts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resData = await res.json();
        
        if (res.ok) {
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#E8F5E9';
            statusDiv.style.color = '#1B5E20';
            statusDiv.textContent = 'Application submitted successfully!';
            e.target.reset();
            updateTsTotal();
            loadTshirtSection(); // reload data
            setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
        } else {
            throw new Error(resData.message || 'Error submitting application');
        }
    } catch(err) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#FFEBEE';
        statusDiv.style.color = '#c0392b';
        statusDiv.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Submit Application';
    }
}

async function updateTshirtPrice(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const statusDiv = document.getElementById('tsAdminStatus');
    const newPrice = parseFloat(document.getElementById('tsAdminPrice').value);
    
    btn.disabled = true;
    
    try {
        const res = await fetch('/api/tshirts/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: newPrice })
        });
        const data = await res.json();
        
        if (res.ok) {
            tsPrice = data.price;
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#E8F5E9';
            statusDiv.style.color = '#1B5E20';
            statusDiv.textContent = 'Price updated!';
            updateTsTotal();
            setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
        } else {
            throw new Error(data.message || 'Error updating price');
        }
    } catch(err) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#FFEBEE';
        statusDiv.style.color = '#c0392b';
        statusDiv.textContent = err.message;
    } finally {
        btn.disabled = false;
    }
}

// Modal logic for applicants
function openTsApplicantsModal(size) {
    let modal = document.getElementById('tsApplicantsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tsApplicantsModal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;padding:20px;';
        document.body.appendChild(modal);
    }
    
    const applicants = tsApplications.filter(a => parseInt(a.size) === size);
    
    let html = `
        <div style="background:#fff;border-radius:12px;width:100%;max-width:600px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
            <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;"><i class="fas fa-tshirt" style="color:var(--primary-color);margin-right:8px;"></i>Size ${size} Applicants</h3>
                <span onclick="document.getElementById('tsApplicantsModal').style.display='none'" style="font-size:1.5rem;cursor:pointer;color:#999;">&times;</span>
            </div>
            <div style="padding:20px;overflow-y:auto;flex:1;">
    `;
    
    if (applicants.length === 0) {
        html += `<p style="text-align:center;color:#999;margin:20px 0;">No applications for this size yet.</p>`;
    } else {
        html += `
            <table class="admin-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <thead>
                    <tr style="background:#f4f4f4;text-align:left;">
                        <th style="padding:10px;">Name</th>
                        <th style="padding:10px;">Contact</th>
                        <th style="padding:10px;">Qty</th>
                        <th style="padding:10px;">Total (₹)</th>
                        <th style="padding:10px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${applicants.map(app => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px;font-weight:600;">${app.name}</td>
                            <td style="padding:10px;color:#555;">${app.number}</td>
                            <td style="padding:10px;text-align:center;">${app.quantity}</td>
                            <td style="padding:10px;color:#2E7D32;font-weight:600;">${app.totalAmount}</td>
                            <td style="padding:10px;">
                                <select onchange="updateTsStatus('${app.id}', this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid #ddd;background:${app.status==='Received'?'#E8F5E9':'#fff'};color:${app.status==='Received'?'#1B5E20':'#333'};font-size:0.8rem;outline:none;">
                                    <option value="Pending" ${app.status!=='Received'?'selected':''}>Pending</option>
                                    <option value="Received" ${app.status==='Received'?'selected':''}>Received</option>
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    html += `
            </div>
            <div style="padding:16px 20px;border-top:1px solid #eee;text-align:right;">
                <button class="btn" style="background:#eee;color:#333;" onclick="document.getElementById('tsApplicantsModal').style.display='none'">Close</button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    modal.style.display = 'flex';
}

async function updateTsStatus(id, newStatus) {
    try {
        const res = await fetch('/api/tshirts/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            const entry = tsApplications.find(a => a.id === id);
            if (entry) entry.status = newStatus;
        } else {
            alert('Failed to update status.');
        }
    } catch(err) {
        console.error(err);
        alert('Network error updating status.');
    }
}
