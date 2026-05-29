const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

const startTag = '<ul class="admin-menu">';
const endTag = '</ul>';

const startIdx = content.indexOf(startTag);
const endIdx = content.indexOf(endTag, startIdx) + endTag.length;

if (startIdx !== -1 && endIdx !== -1) {
    const newMenu = `<ul class="admin-menu">
                <li>
                    <a href="#" class="active" onclick="showAdminSection('dashboard')">
                        <i class="fas fa-chart-line"></i>
                        <span>Dashboard</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('donationEntries')">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <span>Donation Data Entry</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('balanceRecovery')">
                        <i class="fas fa-hand-holding-usd"></i>
                        <span>Balance/Pending Recovery</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('tshirtSection')">
                        <i class="fas fa-tshirt"></i>
                        <span>T-shirt Section</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('donorSearch')">
                        <i class="fas fa-search"></i>
                        <span>Donor Search</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('users')">
                        <i class="fas fa-users"></i>
                        <span>Manage Users</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('volunteers')">
                        <i class="fas fa-user-friends"></i>
                        <span>Volunteers</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('committeeMembers')">
                        <i class="fas fa-user-tie"></i>
                        <span>Committee Members</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('donationTracking')">
                        <i class="fas fa-hand-holding-usd"></i>
                        <span>Donations</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('expenses')">
                        <i class="fas fa-wallet"></i>
                        <span>Expenses</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('gallery')">
                        <i class="fas fa-images"></i>
                        <span>Gallery</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('events')">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Events</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('reports')">
                        <i class="fas fa-file-alt"></i>
                        <span>Reports</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('donations')">
                        <i class="fas fa-file-excel"></i>
                        <span>Upload Excel</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="showAdminSection('settings')">
                        <i class="fas fa-cog"></i>
                        <span>Settings</span>
                    </a>
                </li>
                <li>
                    <a href="#" onclick="adminLogout()">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </a>
                </li>
            </ul>`;

    content = content.substring(0, startIdx) + newMenu + content.substring(endIdx);
    fs.writeFileSync('admin.html', content, 'utf8');
    console.log('Successfully reordered the sidebar menu.');
} else {
    console.log('Could not find the admin-menu list.');
}
