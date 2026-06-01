const fs = require('fs');

['admin.html', 'dashboard.html'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace hardcoded gradients with CSS variables
    content = content.replace(/linear-gradient\(135deg,\s*#E86100,\s*#FFB74D\)/g, 'linear-gradient(135deg, var(--primary-color), var(--accent-color))');
    
    // We can leave Amber (#F59E0B) for RTGS, it's a specific payment mode color, which is totally fine.
    
    fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed hardcoded colors in dashboards');
