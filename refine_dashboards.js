const fs = require('fs');

const filesToUpdate = ['admin.html', 'dashboard.html'];

filesToUpdate.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Make the body background light-color instead of white, so the white cards pop more
    content = content.replace(/body\s*\{\s*margin:\s*0;\s*background:\s*#f4f4f4;/g, 'body { margin:0; background:var(--light-color);');
    
    // Softer backgrounds
    content = content.replace(/background:#f4f4f4/g, 'background:var(--light-color)');
    
    // Change large border-radiuses to more professional ones
    content = content.replace(/border-radius:20px;/g, 'border-radius:16px;');
    content = content.replace(/border-radius:25px;/g, 'border-radius:16px;');
    
    // Smooth shadows
    content = content.replace(/box-shadow:0 2px 10px rgba\(0,0,0,0\.05\);/g, 'box-shadow:var(--shadow);');
    content = content.replace(/box-shadow:0 4px 15px rgba\(0,0,0,0\.1\);/g, 'box-shadow:var(--shadow);');

    // Sidebar refinement
    content = content.replace(/border-right:1px solid #eee;/g, 'border-right:1px solid rgba(0,0,0,0.05);');

    // Make header crisp white
    content = content.replace(/background:#fff;/g, 'background:var(--white);');

    // Light orange backgrounds to be even softer
    content = content.replace(/#FFF3E0/g, '#FFF8F1'); // very soft orange
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Refined UI in ${file}`);
});
