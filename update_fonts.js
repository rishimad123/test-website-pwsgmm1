const fs = require('fs');
const path = require('path');

const dir = '.';
const files = fs.readdirSync(dir);

const oldFontUrl = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap';
const newFontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';

const oldFontFamily = "'Poppins', sans-serif";
const newFontFamily = "'Inter', sans-serif";

files.forEach(file => {
    if (file.endsWith('.html') || file.endsWith('.css')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        if (content.includes(oldFontUrl)) {
            content = content.split(oldFontUrl).join(newFontUrl);
            modified = true;
        }

        if (content.includes(oldFontFamily)) {
            content = content.split(oldFontFamily).join(newFontFamily);
            modified = true;
        }
        
        // Sometimes without quotes
        if (content.includes("font-family: Poppins, sans-serif")) {
            content = content.split("font-family: Poppins, sans-serif").join("font-family: 'Inter', sans-serif");
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated fonts in ${file}`);
        }
    }
});
