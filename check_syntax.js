const fs = require('fs');

function checkScripts(file) {
    const html = fs.readFileSync(file, 'utf8');
    const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null) {
        const code = match[1].trim();
        if (code) {
            fs.writeFileSync(`temp_${count}.js`, code);
            try {
                require('child_process').execSync(`node -c temp_${count}.js`);
                // console.log(`${file} script ${count} OK`);
            } catch (e) {
                console.error(`SYNTAX ERROR in ${file} script ${count}:`);
                console.error(e.message);
            }
            count++;
        }
    }
    console.log(`Checked ${count} scripts in ${file}`);
}

checkScripts('dashboard.html');
checkScripts('admin.html');
