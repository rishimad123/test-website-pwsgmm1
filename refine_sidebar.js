const fs = require('fs');

const filesToUpdate = ['admin.html', 'dashboard.html'];

filesToUpdate.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Sidebar background and color
    content = content.replace(/background: linear-gradient\(180deg, #2C3E50 0%, #34495E 100%\);/g, 'background: var(--white); border-right: 1px solid rgba(0,0,0,0.05);');
    // For dashboard it might be different
    content = content.replace(/background: linear-gradient\(180deg, var\(--primary-color\) 0%, var\(--accent-color\) 100%\);/g, 'background: var(--white); border-right: 1px solid rgba(0,0,0,0.05);');
    
    // Admin sidebar header
    content = content.replace(/\.admin-sidebar-header \{[\s\S]*?background: rgba\(0,0,0,0\.2\);/g, '.admin-sidebar-header {\n            padding: 30px 20px;\n            background: var(--light-color);');
    
    // Dashboard sidebar header
    content = content.replace(/\.dashboard-sidebar-header \{[\s\S]*?background: rgba\(0,0,0,0\.2\);/g, '.dashboard-sidebar-header {\n            padding: 30px 20px;\n            background: var(--light-color);');
    
    // Sidebar link color
    content = content.replace(/\.admin-menu a \{[\s\S]*?color: #BDC3C7;/g, '.admin-menu a {\n            display: flex;\n            align-items: center;\n            gap: 15px;\n            padding: 15px 25px;\n            color: #64748B;');
    content = content.replace(/\.dashboard-menu a \{[\s\S]*?color: rgba\(255, 255, 255, 0\.8\);/g, '.dashboard-menu a {\n            display: flex;\n            align-items: center;\n            gap: 15px;\n            padding: 15px 25px;\n            color: #64748B;');

    // Sidebar header text color
    content = content.replace(/color: white;/g, 'color: var(--dark-color);');

    // Hover background
    content = content.replace(/background: rgba\(255,107,53,0\.15\);/g, 'background: rgba(232, 97, 0, 0.08);');
    content = content.replace(/background: rgba\(255, 255, 255, 0\.2\);/g, 'background: rgba(232, 97, 0, 0.08); color: var(--primary-color); border-left: 4px solid var(--primary-color);');

    // Also update any #BDC3C7 in sidebar headers
    content = content.replace(/color: #BDC3C7;/g, 'color: #94A3B8;');

    // Update body background for dashboard
    content = content.replace(/\.dashboard \{\s*display: flex;\s*min-height: 100vh;\s*\}/g, '.dashboard {\n            display: flex;\n            min-height: 100vh;\n            background: var(--light-color);\n        }');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Refined sidebar in ${file}`);
});
