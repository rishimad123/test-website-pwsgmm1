const fs = require('fs');

// Build the full T-shirt section HTML for admin (with sizes overview + admin settings)
const sizes = [18,20,22,24,26,28,30,32,34,36,38,40,42,44,46];
const sizeOptions = sizes.map(s => `<option value="${s}">${s}</option>`).join('');

const tshirtAdminHTML = `
    <div style="padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px;">
            <div>
                <h2 style="color:#2c3e50;margin:0 0 4px;font-size:1.5rem;">&#128248; T-shirt Section</h2>
                <p style="color:#777;margin:0;font-size:.9rem;">Manage T-shirt applications and size summaries</p>
            </div>
        </div>

        <!-- Coordinators -->
        <div style="margin-bottom:28px;">
            <h3 style="margin:0 0 14px;font-size:1rem;color:#e74c3c;font-weight:700;">&#128100; T-shirt Coordinators</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
                <div style="background:#fff;border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);border:1px solid #f0f0f0;">
                    <img src="https://ui-avatars.com/api/?name=C1&background=1565c0&color=fff&size=80" alt="Coordinator 1" style="width:58px;height:58px;border-radius:50%;">
                    <div>
                        <div style="font-weight:700;font-size:1rem;color:#2c3e50;">Coordinator 1</div>
                        <div style="font-size:.8rem;color:#888;margin:2px 0 8px;">Lead Coordinator</div>
                        <a href="https://wa.me/919876543210" target="_blank" style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:#25D366;color:#fff;border-radius:20px;font-size:.75rem;text-decoration:none;font-weight:600;">&#128241; WhatsApp</a>
                    </div>
                </div>
                <div style="background:#fff;border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);border:1px solid #f0f0f0;">
                    <img src="https://ui-avatars.com/api/?name=C2&background=1b5e20&color=fff&size=80" alt="Coordinator 2" style="width:58px;height:58px;border-radius:50%;">
                    <div>
                        <div style="font-weight:700;font-size:1rem;color:#2c3e50;">Coordinator 2</div>
                        <div style="font-size:.8rem;color:#888;margin:2px 0 8px;">Logistics Head</div>
                        <a href="https://wa.me/919876543211" target="_blank" style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:#25D366;color:#fff;border-radius:20px;font-size:.75rem;text-decoration:none;font-weight:600;">&#128241; WhatsApp</a>
                    </div>
                </div>
                <div style="background:#fff;border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);border:1px solid #f0f0f0;">
                    <img src="https://ui-avatars.com/api/?name=C3&background=e65100&color=fff&size=80" alt="Coordinator 3" style="width:58px;height:58px;border-radius:50%;">
                    <div>
                        <div style="font-weight:700;font-size:1rem;color:#2c3e50;">Coordinator 3</div>
                        <div style="font-size:.8rem;color:#888;margin:2px 0 8px;">Distribution Head</div>
                        <a href="https://wa.me/919876543212" target="_blank" style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:#25D366;color:#fff;border-radius:20px;font-size:.75rem;text-decoration:none;font-weight:600;">&#128241; WhatsApp</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Application Form + Admin Price Settings -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-bottom:28px;">
            <div style="background:#fff;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.07);border:2px solid #e74c3c;">
                <h3 style="margin:0 0 18px;color:#2c3e50;font-size:1rem;">&#128248; Apply for T-shirt</h3>
                <form onsubmit="tsSubmitApplication(event)">
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Full Name *</label>
                        <input type="text" id="tsName" placeholder="Enter full name" required style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Mobile Number *</label>
                        <input type="tel" id="tsPhone" placeholder="10-digit number" pattern="[0-9]{10}" maxlength="10" required style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div>
                            <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Size *</label>
                            <select id="tsSize" required style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;background:#fff;">
                                ${sizeOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Quantity *</label>
                            <input type="number" id="tsQty" value="1" min="1" max="20" required oninput="tsUpdateTotal()" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;">
                        </div>
                    </div>
                    <div style="background:#fff5f5;border-radius:8px;padding:12px 14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:600;color:#555;font-size:.9rem;">Total Amount:</span>
                        <span id="tsTotalDisplay" style="font-size:1.3rem;font-weight:800;color:#27ae60;">&#8377;350</span>
                    </div>
                    <button type="submit" style="width:100%;padding:11px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-size:.95rem;font-weight:700;cursor:pointer;">&#10003; Submit Application</button>
                    <div id="tsFormMsg" style="display:none;margin-top:10px;padding:9px;border-radius:6px;font-size:.85rem;text-align:center;"></div>
                </form>
            </div>
            <div style="background:#fff;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.07);border:1px solid #e0e0e0;align-self:start;">
                <h3 style="margin:0 0 18px;color:#2c3e50;font-size:1rem;">&#9881; Admin Settings</h3>
                <form onsubmit="tsUpdatePrice(event)">
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:.85rem;font-weight:600;color:#555;margin-bottom:5px;">Price per T-shirt (&#8377;)</label>
                        <input type="number" id="tsAdminPrice" value="350" min="0" required style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;box-sizing:border-box;">
                    </div>
                    <button type="submit" style="padding:10px 18px;background:#3949AB;color:#fff;border:none;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;">&#128190; Save Price</button>
                    <div id="tsAdminMsg" style="display:none;margin-top:10px;padding:8px;border-radius:6px;font-size:.85rem;"></div>
                </form>
            </div>
        </div>

        <!-- Sizes Overview -->
        <div id="tsSizesOverview" style="background:#fff;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.07);border:1px solid #e0e0e0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                <h3 style="margin:0;color:#2c3e50;font-size:1rem;">&#128202; Sizes Overview</h3>
                <span id="tsTotalCount" style="background:#FFF3E0;color:#E65100;padding:4px 12px;border-radius:12px;font-weight:700;font-size:.85rem;">Total: 0 shirts</span>
            </div>
            <div id="tsSizeBoxes" style="display:flex;flex-wrap:wrap;gap:10px;">
                ${sizes.map(s => `<div onclick="tsOpenModal(${s})" id="tsBox${s}" style="cursor:pointer;min-width:62px;text-align:center;padding:10px 8px;border-radius:8px;background:#f9f9f9;border:1.5px solid #eee;transition:all .2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="font-size:1.05rem;font-weight:700;color:#bbb;">${s}</div>
                    <div id="tsBoxCount${s}" style="font-size:.75rem;color:#888;margin-top:3px;">0 req</div>
                </div>`).join('')}
            </div>
            <p style="margin:12px 0 0;font-size:.78rem;color:#aaa;text-align:center;">Click any size to view applicants</p>
        </div>
    </div>
`;

// Volunteer version (no admin settings, same overview)
const tshirtVolHTML = tshirtAdminHTML.replace(
    /<div style="background:#fff;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba\(0,0,0,\.07\);border:1px solid #e0e0e0;align-self:start;">[\s\S]*?<\/div>\s*<\/div>\s*<!-- Sizes Overview -->/,
    '<!-- Sizes Overview -->'
);

// Patch admin.html
let adminContent = fs.readFileSync('admin.html', 'utf8');
adminContent = adminContent.replace(
    /(<div id="tshirtSection" class="content-section">)(<\/div>)/,
    '$1' + tshirtAdminHTML + '$2'
);
fs.writeFileSync('admin.html', adminContent, 'utf8');
console.log('admin.html patched, tshirtSection now has content:', adminContent.includes('Lead Coordinator'));

// Patch dashboard.html
let dashContent = fs.readFileSync('dashboard.html', 'utf8');
dashContent = dashContent.replace(
    /(<div id="tshirtSection" class="content-section">)(<\/div>)/,
    '$1' + tshirtAdminHTML.replace('<h3 style="margin:0 0 18px;color:#2c3e50;font-size:1rem;">&#9881; Admin Settings</h3>', '<h3 style="margin:0 0 18px;color:#2c3e50;font-size:1rem;">&#128202; Volunteer View</h3>') + '$2'
);
fs.writeFileSync('dashboard.html', dashContent, 'utf8');
console.log('dashboard.html patched, tshirtSection now has content:', dashContent.includes('Lead Coordinator'));
