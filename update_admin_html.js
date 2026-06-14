const fs = require('fs');

let content = fs.readFileSync('admin.html', 'utf8');

// 1. Add Manage Books button next to Manage Buildings
content = content.replace(
    /<button onclick="adeBuildingModal\(\)" class="btn btn-small" style="background:#3949AB;color:#fff;"><i class="fas fa-building" style="margin-right:6px;"><\/i>Manage Buildings<\/button>/,
    `<button onclick="adeManageBooksModal()" class="btn btn-small" style="background:#00695C;color:#fff;"><i class="fas fa-book" style="margin-right:6px;"></i>Manage Books</button>
                <button onclick="adeBuildingModal()" class="btn btn-small" style="background:#3949AB;color:#fff;"><i class="fas fa-building" style="margin-right:6px;"></i>Manage Buildings</button>`
);

// 2. Add Manage Books Modal HTML before the ending backtick of injectDESection()
// Since injectDESection is huge, let's find a safe insertion point.
// We can insert it right before: `    <!-- End of Section Content -->` or just at the end of the `section.innerHTML`
content = content.replace(
    /        <\/div>\s*`;\s*document\.getElementById\('admin-content'\)\.appendChild\(section\);/g,
    `        </div>
        
        <!-- Manage Books Modal -->
        <div id="adeManageBooksModal" class="modal">
            <div class="modal-content" style="max-width:500px;">
                <span class="close" onclick="document.getElementById('adeManageBooksModal').style.display='none'">&times;</span>
                <h3 style="margin-top:0;color:var(--dark-color);border-bottom:2px solid #eee;padding-bottom:10px;"><i class="fas fa-book"></i> Manage Books</h3>
                
                <div style="margin-bottom:15px;">
                    <label style="font-weight:600;display:block;margin-bottom:6px;">New Books Limit</label>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <button class="btn btn-small" onclick="adeChangeBookLimit('New', -1)">-</button>
                        <input type="number" id="adeMaxNewBooks" value="50" style="width:80px;text-align:center;font-weight:bold;padding:6px;" readonly>
                        <button class="btn btn-small" onclick="adeChangeBookLimit('New', 1)">+</button>
                    </div>
                    <small style="color:#777;">Adds or removes a New Book. Each book has 50 slips.</small>
                </div>
                
                <div style="margin-bottom:25px;">
                    <label style="font-weight:600;display:block;margin-bottom:6px;">Old Books Limit</label>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <button class="btn btn-small" onclick="adeChangeBookLimit('Old', -1)">-</button>
                        <input type="number" id="adeMaxOldBooks" value="30" style="width:80px;text-align:center;font-weight:bold;padding:6px;" readonly>
                        <button class="btn btn-small" onclick="adeChangeBookLimit('Old', 1)">+</button>
                    </div>
                    <small style="color:#777;">Adds or removes an Old Book. Each book has 50 slips.</small>
                </div>
                
                <div style="text-align:right;">
                    <button class="btn" onclick="document.getElementById('adeManageBooksModal').style.display='none'">Cancel</button>
                    <button class="btn btn-primary" onclick="adeSaveBookLimits()">Save Changes</button>
                </div>
            </div>
        </div>
        \`;
        document.getElementById('admin-content').appendChild(section);`
);

// 3. Update radio button text to be dynamic
content = content.replace(
    /New Book \(50 Books\)/g,
    `<span id="adeLblNewBooks">New Book (50 Books)</span>`
);
content = content.replace(
    /Old Book \(30 Books\)/g,
    `<span id="adeLblOldBooks">Old Book (30 Books)</span>`
);

fs.writeFileSync('admin.html', content, 'utf8');
console.log('admin.html updated successfully.');
