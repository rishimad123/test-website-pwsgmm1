// VOLUNTEER VIEW ONLY RESTRICTIONS
document.addEventListener('DOMContentLoaded', () => {
    // We need to wait for currentUser to be populated
    const checkUserInterval = setInterval(() => {
        if (typeof currentUser !== 'undefined' && currentUser !== null) {
            clearInterval(checkUserInterval);

            // ── volunteer_view: strict read-only, donor search only ──────────
            deLoadYearFilter();
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

            // ── volunteer: full access but NO T-shirt section ────────────────
            if (currentUser.role === 'volunteer') {
                console.log('Applying standard Volunteer restrictions (no T-shirt access)...');

                // Hide T-shirt sidebar link
                document.querySelectorAll('.sidebar-nav ul li a').forEach(link => {
                    if (link.getAttribute('href') === '#tshirtSection' ||
                        (link.getAttribute('onclick') || '').includes('tshirtSection')) {
                        link.parentElement.style.display = 'none';
                    }
                });

                // Hide T-shirt overview card on the overview page
                document.querySelectorAll('[onclick*="tshirtSection"]').forEach(el => el.style.display = 'none');

                // Guard: intercept showSection to block direct navigation to tshirtSection
                const _origShowSec = window.showSection;
                if (typeof _origShowSec === 'function') {
                    window.showSection = function(id) {
                        if (id === 'tshirtSection') {
                            console.warn('T-shirt section is not available for this role.');
                            _origShowSec('overview');
                            return;
                        }
                        _origShowSec(id);
                    };
                }
            }
        }
    }, 100);
});