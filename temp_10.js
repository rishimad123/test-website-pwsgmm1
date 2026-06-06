// VOLUNTEER VIEW ONLY RESTRICTIONS
document.addEventListener('DOMContentLoaded', () => {
    // We need to wait for currentUser to be populated
    const checkUserInterval = setInterval(() => {
        if (typeof currentUser !== 'undefined' && currentUser !== null) {
            clearInterval(checkUserInterval);
            if (currentUser.role === 'volunteer_view') {
                console.log('Applying View-Only restrictions...');
                
                // Hide sidebar links except Donor Search and Logout
                const sidebarLinks = document.querySelectorAll('.sidebar-nav ul li a');
                sidebarLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href !== '#donorSearch' && href !== '#logout' && !link.onclick?.toString().includes('logout')) {
                        link.parentElement.style.display = 'none';
                    }
                });

                // Hide dashboard overview cards
                document.querySelectorAll('[onclick*="tshirtSection"]').forEach(el => el.style.display = 'none');
                document.querySelectorAll('[onclick*="donationEntry"]').forEach(el => el.style.display = 'none');
                document.querySelectorAll('[onclick*="donations"]').forEach(el => el.style.display = 'none');
                document.querySelectorAll('[onclick*="balanceRecovery"]').forEach(el => el.style.display = 'none');

                // Force view to Donor Search
                if (typeof showSection === 'function') {
                    showSection('donorSearch');
                } else if (window.showSection) {
                    window.showSection('donorSearch');
                }
            }
        }
    }, 100);
});