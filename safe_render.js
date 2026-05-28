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
