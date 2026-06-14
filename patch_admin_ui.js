const fs = require('fs');

const uiHtml = `
                    <!-- Receipt Format Configuration -->
                    <div class="admin-card" style="margin-bottom:20px;border-left:4px solid #8B1A1A;">
                        <div class="card-header">
                            <h3><i class="fas fa-file-invoice" style="color:#8B1A1A;margin-right:8px;"></i>Receipt Format Settings</h3>
                        </div>
                        <p style="color:#666;font-size:0.9rem;margin:8px 0 16px;">Configure the default text displayed on the donation receipts (for both Admin and Volunteer panels).</p>
                        
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Top Left Text</label>
                                <input type="text" id="rfTopLeft" class="admin-input" placeholder="स्थापना १९९१" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Top Center Text</label>
                                <input type="text" id="rfTopCenter" class="admin-input" placeholder="॥ श्री गजानन प्रसन्न ॥" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Top Right Prefix</label>
                                <input type="text" id="rfTopRight" class="admin-input" placeholder="वर्ष :" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Receipt Year</label>
                                <input type="text" id="rfYear" class="admin-input" placeholder="२०२६-२७" style="width:100%;margin:0;">
                            </div>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Main Title</label>
                            <input type="text" id="rfTitle" class="admin-input" placeholder="श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ" style="width:100%;margin:0;">
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Address</label>
                            <input type="text" id="rfAddress" class="admin-input" placeholder="पटेलवाडी, क्लासिक हॉटेलच्या मागे..." style="width:100%;margin:0;">
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Donor Prefix</label>
                                <input type="text" id="rfDonorPrefix" class="admin-input" placeholder="श्री/श्रीमती" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Donor Suffix</label>
                                <input type="text" id="rfDonorSuffix" class="admin-input" placeholder="यांचकडून" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Amount Prefix (Words)</label>
                                <input type="text" id="rfAmountWords" class="admin-input" placeholder="अक्षरी रुपये" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Thank You Text</label>
                                <input type="text" id="rfThankYou" class="admin-input" placeholder="रोख/चेक मिळाले, धन्यवाद !" style="width:100%;margin:0;">
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:15px;">
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Sign 1 Role</label>
                                <input type="text" id="rfSign1Role" class="admin-input" placeholder="अध्यक्ष" style="width:100%;margin:0;">
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;margin-top:5px;">Sign 1 Name</label>
                                <input type="text" id="rfSign1Name" class="admin-input" placeholder="जयेश शिंदे" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Sign 2 Role</label>
                                <input type="text" id="rfSign2Role" class="admin-input" placeholder="सरचिटणीस" style="width:100%;margin:0;">
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;margin-top:5px;">Sign 2 Name</label>
                                <input type="text" id="rfSign2Name" class="admin-input" placeholder="ध्रुव चीटालीय" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Sign 3 Role</label>
                                <input type="text" id="rfSign3Role" class="admin-input" placeholder="खजिनदार" style="width:100%;margin:0;">
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;margin-top:5px;">Sign 3 Name</label>
                                <input type="text" id="rfSign3Name" class="admin-input" placeholder="रणजीत राजपूत" style="width:100%;margin:0;">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;">Sign 4 Role</label>
                                <input type="text" id="rfSign4Role" class="admin-input" placeholder="वसुल करणार" style="width:100%;margin:0;">
                                <label style="display:block;font-size:0.85rem;color:#666;margin-bottom:5px;margin-top:5px;">Sign 4 Name</label>
                                <input type="text" id="rfSign4Name" class="admin-input" placeholder="&nbsp;" style="width:100%;margin:0;">
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <button class="btn btn-primary btn-small" onclick="saveReceiptFormat()" style="background:#8B1A1A;border-color:#8B1A1A;color:#fff;font-weight:bold;">
                                    <i class="fas fa-save"></i> Save Receipt Settings
                                </button>
                                <span id="rfStatus" style="margin-left:10px;font-size:0.85rem;color:#27AE60;font-weight:600;opacity:0;transition:opacity 0.3s;">Saved successfully!</span>
                            </div>
                        </div>
                    </div>
`;

let content = fs.readFileSync('c:/Users/admin/Desktop/test-website-pwsgmm1/admin.html', 'utf8');

// Inject the UI just before the Cloudinary Setup card
content = content.replace('<!-- Cloudinary Setup -->', uiHtml + '\n                    <!-- Cloudinary Setup -->');

fs.writeFileSync('c:/Users/admin/Desktop/test-website-pwsgmm1/admin.html', content);
console.log("UI added to admin.html");
