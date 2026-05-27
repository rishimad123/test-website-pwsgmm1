const fs = require('fs');

const dashboard = fs.readFileSync('dashboard.html', 'utf8');
const trackingHtml = fs.readFileSync('tracking_section.html', 'utf8');

// The tracking section HTML has <div id="donationTracking" ...
// I will just place it inside dashboard.html at the end of the content-area, or as a new section.
// Wait, the user wants it visible in the volunteer panel. Maybe they want a specific tab or just to show it.
// The trackingHtml itself is a content-section (<div id="donationTracking" class="content-section">).
// I can just inject it right before <!-- Donation Data Entry Section --> in dashboard.html.

const targetPoint = '<!-- Donation Data Entry Section -->';
if (dashboard.includes(targetPoint) && !dashboard.includes('id="donationTracking"')) {
    // Add the tab link to sidebar
    let newDash = dashboard.replace(targetPoint, trackingHtml + '\n\n                ' + targetPoint);
    
    // Add sidebar link for Donation Tracking
    const sidebarAnchor = `<a href="#" class="sidebar-item" data-section="overview" onclick="switchSection('overview')">
                    <i class="fas fa-home"></i> Overview
                </a>`;
    const newSidebarLink = `<a href="#" class="sidebar-item" data-section="donationTracking" onclick="switchSection('donationTracking')">
                    <i class="fas fa-chart-bar"></i> Donation Tracking
                </a>`;
    
    if (newDash.includes(sidebarAnchor)) {
        newDash = newDash.replace(sidebarAnchor, sidebarAnchor + '\n                ' + newSidebarLink);
    }
    
    fs.writeFileSync('dashboard.html', newDash, 'utf8');
    console.log('Injected tracking section into dashboard.');
} else {
    console.log('Could not find target or already injected.');
}
