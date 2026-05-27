const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const oldReceivedHtml = `<div id="brPanelReceived" style="display:none;">
                            <p style="color:#888;font-size:.9rem;margin-bottom:16px;">Year-to-date total from all Pauti slips (Slip #1 onward). Admin can edit the override amount.</p>
                            <!-- Summary -->
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px;">
                                <div class="admin-stat-card">
                                    <div class="stat-icon green"><i class="fas fa-rupee-sign"></i></div>
                                    <div class="stat-details">
                                        <h3 id="brReceivedTotal" style="font-size:1.4rem;">&#8377;0</h3>
                                        <p>Total from Pauti Slips</p>
                                    </div>
                                </div>
                                <div class="admin-stat-card">
                                    <div class="stat-icon blue"><i class="fas fa-receipt"></i></div>
                                    <div class="stat-details">
                                        <h3 id="brReceivedSlipCount" style="font-size:1.4rem;">0</h3>
                                        <p>Slips with Amounts</p>
                                    </div>
                                </div>
                                <div class="admin-stat-card" style="background:#FFFDE7;">
                                    <div class="stat-icon orange"><i class="fas fa-edit"></i></div>
                                    <div class="stat-details">
                                        <p style="margin-bottom:6px;font-size:.85rem;font-weight:600;color:#555;">Override Total (admin)</p>
                                        <div style="display:flex;gap:8px;align-items:center;">
                                            <input type="number" id="brOverrideInput" placeholder="Enter override &#8377;"
                                                style="flex:1;padding:7px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:.9rem;">
                                            <button class="btn btn-primary btn-small" onclick="saveBrOverride()">Save</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Yearly breakdown table -->
                            <div style="overflow-x:auto;">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Slip Range</th>
                                            <th>Slip Count</th>
                                            <th>Amount Total (&#8377;)</th>
                                            <th>Avg per Slip</th>
                                        </tr>
                                    </thead>
                                    <tbody id="brReceivedBreakdownTbody">
                                        <tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px;">Loading&hellip;</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>`;

const newReceivedHtml = `<div id="brPanelReceived" style="display:none;">
                            <p style="color:#888;font-size:.9rem;margin-bottom:16px;">Shows all slips with status <strong>Received</strong>. Admin can edit or delete slips.</p>
                            <!-- Summary -->
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px;">
                                <div class="admin-stat-card">
                                    <div class="stat-icon green"><i class="fas fa-rupee-sign"></i></div>
                                    <div class="stat-details">
                                        <h3 id="brReceivedTotal" style="font-size:1.4rem;">&#8377;0</h3>
                                        <p>Total Amount Received</p>
                                    </div>
                                </div>
                                <div class="admin-stat-card">
                                    <div class="stat-icon blue"><i class="fas fa-receipt"></i></div>
                                    <div class="stat-details">
                                        <h3 id="brReceivedSlipCount" style="font-size:1.4rem;">0</h3>
                                        <p>Total Slips</p>
                                    </div>
                                </div>
                            </div>
                            <!-- Slips List Table -->
                            <div style="overflow-x:auto;">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Book Number</th>
                                            <th>Receipt Number</th>
                                            <th>Total Amount (&#8377;)</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="brReceivedBreakdownTbody">
                                        <tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px;">Loading&hellip;</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>`;

if(html.includes('<div id="brPanelReceived" style="display:none;">')) {
    const startIdx = html.indexOf('<div id="brPanelReceived" style="display:none;">');
    const endIdx = html.indexOf('</div>', html.indexOf('</table>', startIdx)) + 6;
    
    // Fallback regex/indexOf replace based on exactly matching the block boundaries
    html = html.substring(0, startIdx) + newReceivedHtml + html.substring(endIdx);
    
    fs.writeFileSync('admin.html', html, 'utf8');
    console.log('Successfully updated admin.html');
} else {
    console.log('Could not find brPanelReceived section in admin.html');
}
