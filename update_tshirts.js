const fs = require("fs");
let content = fs.readFileSync("tshirts.js", "utf-8");

// 1. Change const TS_COORDINATORS to let tsCoordinators
content = content.replace("const TS_COORDINATORS =", "let tsCoordinators =");
// Also replace instances of TS_COORDINATORS in the map function for the public page
content = content.replace("TS_COORDINATORS.map", "tsCoordinators.map");

// 2. Update init() to fetch coordinators
const initFind = `.then(d => { if (d && d.price) tsPrice = d.price; })`;
const initReplace = `.then(d => { 
            if (d && d.price) tsPrice = d.price; 
            if (d && Array.isArray(d.coordinators)) tsCoordinators = d.coordinators;
        })`;
content = content.replace(initFind, initReplace);

// 3. Update tsSizesOverview total shirts and inject Live Stats & Refresh
const renderStatsFind = `const totalCountEl = document.getElementById('tsTotalCount');
        if (totalCountEl) {
            totalCountEl.textContent = 'Total: ' + totalShirts + ' shirts';
        }`;
const renderStatsReplace = `const totalCountEl = document.getElementById('tsTotalCount');
        if (totalCountEl) {
            if (!publicMode) {
                totalCountEl.outerHTML = \`
                <div id="tsTotalCount" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <span style="background:#E3F2FD;color:#1565C0;padding:6px 12px;border-radius:12px;font-weight:700;font-size:.85rem;box-shadow:0 2px 4px rgba(0,0,0,.05);">
                        &#128085; Total: \${totalShirts}
                    </span>
                    <span style="background:#E8F5E9;color:#2E7D32;padding:6px 12px;border-radius:12px;font-weight:700;font-size:.85rem;box-shadow:0 2px 4px rgba(0,0,0,.05);">
                        &#8377; Received: \${totalReceived.toLocaleString('en-IN')}
                    </span>
                    <span style="background:#FFF3E0;color:#E65100;padding:6px 12px;border-radius:12px;font-weight:700;font-size:.85rem;box-shadow:0 2px 4px rgba(0,0,0,.05);">
                        &#8377; Pending: \${totalPending.toLocaleString('en-IN')}
                    </span>
                    <button id="tsRefreshBtn" onclick="tsFetchAndRender()" style="padding:6px 14px;background:#3949AB;color:#fff;border:none;border-radius:12px;font-size:.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s;box-shadow:0 2px 6px rgba(57,73,171,.3);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>\`;
            } else {
                totalCountEl.textContent = 'Total: ' + totalShirts + ' shirts';
            }
        }`;
content = content.replace(renderStatsFind, renderStatsReplace);

// compute totalReceived and totalPending
const loopsFind = `tsApplications.forEach(app => {\n            const sz = parseInt(app.size);\n            if (sizeGroups[sz] !== undefined) {\n                sizeGroups[sz] += parseInt(app.quantity) || 1;\n            }\n            totalShirts += parseInt(app.quantity) || 1;\n        });`;
const loopsReplace = `let totalReceived = 0;\n        let totalPending = 0;\n        tsApplications.forEach(app => {\n            const sz = parseInt(app.size);\n            const qty = parseInt(app.quantity) || 1;\n            if (sizeGroups[sz] !== undefined) sizeGroups[sz] += qty;\n            totalShirts += qty;\n            const amt = app.totalAmount || (qty * tsPrice);\n            if (app.status === 'Received') totalReceived += amt;\n            else totalPending += amt;\n        });`;

if (!content.includes(loopsFind)) {
    // try fallback
    const fallbackFind = `tsApplications.forEach(app => {\r\n            const sz = parseInt(app.size);\r\n            if (sizeGroups[sz] !== undefined) {\r\n                sizeGroups[sz] += parseInt(app.quantity) || 1;\r\n            }\r\n            totalShirts += parseInt(app.quantity) || 1;\r\n        });`;
    content = content.replace(fallbackFind, loopsReplace);
} else {
    content = content.replace(loopsFind, loopsReplace);
}

// 4. Inject Admin Coordinators UI at the end of renderTshirtSection()
const endRenderFind = `} // end renderTshirtSection`;
const endRenderReplace = `
        // Render Coordinator Management for Admins
        if (isAdmin() && window.location.pathname.includes('admin.html')) {
            let adminCoordsEl = document.getElementById('tsAdminCoordinators');
            if (!adminCoordsEl) {
                adminCoordsEl = document.createElement('div');
                adminCoordsEl.id = 'tsAdminCoordinators';
                adminCoordsEl.style.marginTop = '28px';
                
                const tsSec = document.getElementById('tshirtSection');
                const adminCard = tsSec ? tsSec.querySelector('.admin-card') : null;
                if (adminCard) {
                    adminCard.appendChild(adminCoordsEl);
                }
            }
            
            if (adminCoordsEl) {
                adminCoordsEl.innerHTML = \`
                <div style="background:#fff;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.07);border:1px solid #e0e0e0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                        <h3 style="margin:0;color:#2c3e50;font-size:1rem;"><i class="fas fa-user-tie" style="margin-right:8px;color:#3949AB;"></i>Coordinator Management</h3>
                        <button onclick="tsAddCoordinator()" style="padding:6px 14px;background:#27ae60;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;transition:all .2s;" onmouseover="this.style.background='#219653'" onmouseout="this.style.background='#27ae60'">+ Add Coordinator</button>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:16px;">
                        \${tsCoordinators.map((c, idx) => \`
                        <div style="border:1px solid #eee;border-radius:10px;padding:14px;display:flex;gap:12px;align-items:center;background:#fafafa;">
                            <img src="\${c.photo}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;" onerror="this.src='https://ui-avatars.com/api/?name=\${encodeURIComponent(c.name)}&background=e74c3c&color=fff&size=50'">
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:600;font-size:.95rem;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${c.name}</div>
                                <div style="font-size:.8rem;color:#777;">\${c.position}</div>
                                <div style="font-size:.8rem;color:#555;margin-top:2px;">&#128241; \${c.phone}</div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:6px;">
                                <button onclick="tsEditCoordinator(\${idx})" style="background:#FFF3E0;color:#E65100;border:1px solid #FFE0B2;padding:6px;border-radius:6px;cursor:pointer;font-size:.8rem;transition:all .2s;" onmouseover="this.style.background='#FFE0B2'" onmouseout="this.style.background='#FFF3E0'"><i class="fas fa-edit"></i></button>
                                <button onclick="tsDeleteCoordinator(\${idx})" style="background:#FFEBEE;color:#c62828;border:1px solid #FFCDD2;padding:6px;border-radius:6px;cursor:pointer;font-size:.8rem;transition:all .2s;" onmouseover="this.style.background='#FFCDD2'" onmouseout="this.style.background='#FFEBEE'"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        \`).join('')}
                    </div>
                </div>
                \`;
            }
        }
} // end renderTshirtSection`;
content = content.replace(endRenderFind, endRenderReplace);

// 5. Append tsFetchAndRender and CRUD functions
const funcsToAppend = `

// ════════════════════════════════════════════
// LIVE REFRESH & COORDINATOR CRUD
// ════════════════════════════════════════════
function tsFetchAndRender() {
    const btn = document.getElementById('tsRefreshBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    fetch('/api/tshirts')
        .then(r => r.json())
        .then(d => { if (d && d.tshirts) tsApplications = d.tshirts; })
        .catch(e => console.error(e))
        .finally(() => {
            renderTshirtSection();
        });
}

async function tsSaveCoordinators() {
    try {
        const res = await fetch('/api/tshirts/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: tsPrice, coordinators: tsCoordinators })
        });
        if (res.ok) {
            renderTshirtSection();
        } else {
            alert("Failed to save coordinators.");
        }
    } catch(e) { console.error(e); alert("Network error."); }
}

function tsAddCoordinator() {
    const name = prompt("Enter Name:");
    if (!name) return;
    const position = prompt("Enter Position (e.g. Lead Coordinator):", "Coordinator");
    if (!position) return;
    const phone = prompt("Enter 10-digit Phone:");
    if (!phone) return;
    const photo = prompt("Enter Photo URL:", \`https://ui-avatars.com/api/?name=\${encodeURIComponent(name)}&background=3949AB&color=fff&size=80\`);
    
    tsCoordinators.push({ name, position, phone, photo: photo || '' });
    tsSaveCoordinators();
}

function tsEditCoordinator(idx) {
    const c = tsCoordinators[idx];
    const name = prompt("Edit Name:", c.name);
    if (!name) return;
    const position = prompt("Edit Position:", c.position);
    if (!position) return;
    const phone = prompt("Edit Phone:", c.phone);
    if (!phone) return;
    const photo = prompt("Edit Photo URL:", c.photo);
    
    tsCoordinators[idx] = { name, position, phone, photo: photo || '' };
    tsSaveCoordinators();
}

function tsDeleteCoordinator(idx) {
    if (confirm(\`Delete \${tsCoordinators[idx].name}?\`)) {
        tsCoordinators.splice(idx, 1);
        tsSaveCoordinators();
    }
}
`;

if (!content.includes('function tsFetchAndRender()')) {
    content += funcsToAppend;
}

fs.writeFileSync("tshirts.js", content);
console.log("Updated tshirts.js");
