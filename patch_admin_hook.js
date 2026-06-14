const fs = require('fs');
let c = fs.readFileSync('admin.html', 'utf8');

const OLD_HOOK = `if (id === 'volunteers') { if(typeof switchVolTab==='function') switchVolTab('cards'); }`;
const NEW_HOOK = `if (id === 'volunteers') { if(typeof switchVolTab==='function') switchVolTab('cards'); }
        if (id === 'events') { if(typeof adminLoadYears === 'function') adminLoadYears(); }`;

if (c.includes(OLD_HOOK)) {
    c = c.replace(OLD_HOOK, NEW_HOOK);
    fs.writeFileSync('admin.html', c);
    console.log('✅ Updated showAdminSection');
} else {
    console.log('❌ OLD_HOOK not found');
}
