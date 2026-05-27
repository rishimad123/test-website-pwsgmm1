const fs = require('fs');

const dashboard = fs.readFileSync('dashboard.html', 'utf8');
const trackingHtml = fs.readFileSync('tracking_section.html', 'utf8');

const targetPoint = '<div id="donationEntry" class="content-section"';
if (dashboard.includes(targetPoint) && !dashboard.includes('id="donationTracking"')) {
    let newDash = dashboard.replace(targetPoint, trackingHtml + '\n\n                ' + targetPoint);
    
    // Add sidebar link for Donation Tracking
    const sidebarRegex = /(<a href="#" class="sidebar-item" data-section="overview"[^>]*>[\s\S]*?<\/a>)/;
    const match = dashboard.match(sidebarRegex);
    if (match) {
        const sidebarAnchor = match[1];
        const newSidebarLink = `<a href="#" class="sidebar-item" data-section="donationTracking" onclick="switchSection('donationTracking')">
                    <i class="fas fa-chart-bar"></i> Donation Tracking
                </a>`;
        newDash = newDash.replace(sidebarAnchor, sidebarAnchor + '\n                ' + newSidebarLink);
    }
    
    fs.writeFileSync('dashboard.html', newDash, 'utf8');
    console.log('Injected tracking section into dashboard.');
} else {
    console.log('Could not find target or already injected.');
}
