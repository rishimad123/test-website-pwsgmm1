const fs = require('fs');

// ── dashboard.html: replace the restriction block ──────────────────────────
let dash = fs.readFileSync('dashboard.html', 'utf8');

const oldBlock = `// VOLUNTEER VIEW ONLY RESTRICTIONS\r\ndocument.addEventListener('DOMContentLoaded', () => {\r\n    // We need to wait for currentUser to be populated\r\n    const checkUserInterval = setInterval(() => {\r\n        if (typeof currentUser !== 'undefined' && currentUser !== null) {\r\n            clearInterval(checkUserInterval);\r\n            if (currentUser.role === 'volunteer_view') {\r\n                console.log('Applying View-Only restrictions...');\r\n                \r\n                // Hide sidebar links except Donor Search and Logout\r\n                const sidebarLinks = document.querySelectorAll('.sidebar-nav ul li a');\r\n                sidebarLinks.forEach(link => {\r\n                    const href = link.getAttribute('href');\r\n                    if (href !== '#donorSearch' && href !== '#logout' && !link.onclick?.toString().includes('logout')) {\r\n                        link.parentElement.style.display = 'none';\r\n                    }\r\n                });\r\n\r\n                // Hide dashboard overview cards\r\n                document.querySelectorAll('[onclick*="tshirtSection"]').forEach(el => el.style.display = 'none');\r\n                document.querySelectorAll('[onclick*="donationEntry"]').forEach(el => el.style.display = 'none');\r\n                document.querySelectorAll('[onclick*="donations"]').forEach(el => el.style.display = 'none');\r\n                document.querySelectorAll('[onclick*="balanceRecovery"]').forEach(el => el.style.display = 'none');\r\n\r\n                // Force view to Donor Search\r\n                if (typeof showSection === 'function') {\r\n                    showSection('donorSearch');\r\n                } else if (window.showSection) {\r\n                    window.showSection('donorSearch');\r\n                }\r\n            }\r\n        }\r\n    }, 100);\r\n});`;

const newBlock = `// VOLUNTEER VIEW ONLY RESTRICTIONS
document.addEventListener('DOMContentLoaded', () => {
    // We need to wait for currentUser to be populated
    const checkUserInterval = setInterval(() => {
        if (typeof currentUser !== 'undefined' && currentUser !== null) {
            clearInterval(checkUserInterval);

            // ── volunteer_view: strict read-only, donor search only ──────────
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
});`;

if (dash.includes(oldBlock)) {
    dash = dash.replace(oldBlock, newBlock);
    console.log('dashboard.html restriction block replaced (CRLF)');
} else {
    // Try LF version
    const oldBlockLF = oldBlock.replace(/\r\n/g, '\n');
    if (dash.includes(oldBlockLF)) {
        dash = dash.replace(oldBlockLF, newBlock);
        console.log('dashboard.html restriction block replaced (LF)');
    } else {
        // Try to find the block more loosely
        const idx = dash.indexOf('// VOLUNTEER VIEW ONLY RESTRICTIONS');
        if (idx !== -1) {
            const endIdx = dash.indexOf('\n});\n</script>', idx);
            const endIdxCRLF = dash.indexOf('\r\n});\r\n</script>', idx);
            const actualEnd = endIdxCRLF !== -1 ? endIdxCRLF + '\r\n});\r\n'.length : (endIdx !== -1 ? endIdx + '\n});\n'.length : -1);
            if (actualEnd !== -1) {
                dash = dash.slice(0, idx) + newBlock + dash.slice(actualEnd);
                console.log('dashboard.html restriction block replaced (loose match)');
            } else {
                console.error('Could not find end of restriction block - manual fix needed');
                process.exit(1);
            }
        } else {
            console.error('Could not find restriction block at all');
            process.exit(1);
        }
    }
}

fs.writeFileSync('dashboard.html', dash);
console.log('dashboard.html saved');
console.log('volunteer_full_tshirt in dashboard.html:', (dash.match(/volunteer_full_tshirt/g)||[]).length);
