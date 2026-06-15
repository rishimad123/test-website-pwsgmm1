// --- SYSTEM WIDE NOTIFICATIONS LOGIC ---
let lastSeenNotifTime = localStorage.getItem('lastSeenNotifTime') || null;
let currentNotifications = [];

async function fetchNotifications() {
    try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
            const data = await res.json();
            currentNotifications = data.notifications || [];
            updateNotifBadge();
            renderNotifList();
        }
    } catch(e) { 
        const errList = document.getElementById('dashNotifList');
        if (errList) errList.innerHTML = '<li class="notification-empty">Could not load notifications.</li>';
        console.error('Failed to fetch notifications', e); 
    }
}

function updateNotifBadge() {
    let unreadCount = 0;
    if (lastSeenNotifTime) {
        unreadCount = currentNotifications.filter(n => new Date(n.timestamp) > new Date(lastSeenNotifTime)).length;
    } else {
        unreadCount = currentNotifications.length;
    }
    
    const badge = document.getElementById('dashNotifBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderNotifList() {
    const list = document.getElementById('dashNotifList');
    if (!list) return;
    
    if (currentNotifications.length === 0) {
        list.innerHTML = '<li class="notification-empty">No new notifications.</li>';
        return;
    }
    
    list.innerHTML = currentNotifications.map(n => {
        const d = new Date(n.timestamp);
        const timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateStr = d.toLocaleDateString();
        return `
            <li class="notification-item">
                <div class="notification-message"><i class="fas fa-sign-in-alt" style="color:var(--primary-color);margin-right:6px;"></i>${n.message}</div>
                <div class="notification-time">${dateStr} ${timeStr}</div>
            </li>
        `;
    }).join('');
}

window.toggleNotifDropdown = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.querySelector('.notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            // Update last seen
            if (currentNotifications.length > 0) {
                lastSeenNotifTime = currentNotifications[0].timestamp;
                localStorage.setItem('lastSeenNotifTime', lastSeenNotifTime);
                updateNotifBadge();
            }
        }
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.querySelector('.notification-dropdown');
    const container = document.querySelector('.notification-container');
    if (dropdown && dropdown.classList.contains('show') && container && !container.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Poll every 5 seconds for near real-time
setInterval(fetchNotifications, 5000);
// Re-fetch when tab becomes active (e.g. after logging in on another tab)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) fetchNotifications();
});

// Fetch immediately (script is at bottom of body, DOM is already ready)
fetchNotifications();