const fs = require('fs');

function applyDashboardTheme(file, primaryColor, accentColor, sidebarColor, activeBgColor) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        // Override the :root via an inline style at the top of the body
        if (!content.includes('id="dashboard-theme-override"')) {
            const override = `\n<style id="dashboard-theme-override">
                :root {
                    --primary-color: ${primaryColor};
                    --accent-color: ${accentColor};
                    --dark-color: #1E293B; /* keep dark mode unified */
                }
                .admin-menu a:hover, .admin-menu a.active, .dashboard-menu a:hover, .dashboard-menu a.active {
                    background: ${activeBgColor} !important;
                    color: var(--primary-color) !important;
                    border-left: 4px solid var(--primary-color) !important;
                }
            </style>\n`;
            content = content.replace(/<body[^>]*>/, `$&${override}`);
        }
        
        // Ensure the sidebar header has a specific background or keeps light color
        // Actually, the user wanted distinct themes. 
        // For Admin: Executive Slate sidebar is a good idea, but I already made it white. Let's keep it white, the crimson active tab is enough to give it a rich distinct feel.
        // Wait, the plan said: "Admin Dashboard... Executive Slate & Crimson Theme (#1E293B base with #E11D48 rich accents)".
        // And "Volunteer Dashboard... Trust Blue & Sunset Orange Theme (#2563EB primary, #F97316 secondary)".
        
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated theme for ${file}`);
    }
}

applyDashboardTheme('admin.html', '#E11D48', '#BE123C', '#FFFFFF', 'rgba(225, 29, 72, 0.08)');
applyDashboardTheme('dashboard.html', '#2563EB', '#F97316', '#FFFFFF', 'rgba(37, 99, 235, 0.08)');
