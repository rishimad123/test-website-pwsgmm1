const fs = require('fs');

const htmlFiles = [
    'about.html', 'admin.html', 'dashboard.html', 
    'index.html', 'login.html', 'gallery.html', 
    'contact.html', 'tshirt.html', 'volunteers.html'
];

htmlFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace old orange with new primary orange
    content = content.replace(/#FF6B35/g, '#E86100');
    
    // Replace old red with new accent orange
    content = content.replace(/#8B0000/g, '#FB8C00');
    
    // Replace old teal with amber
    content = content.replace(/#00796B/g, '#F59E0B');
    
    // Replace other hardcoded oranges if needed
    content = content.replace(/#FF8C42/g, '#FFB74D');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated old colors in ${file}`);
    }
});
