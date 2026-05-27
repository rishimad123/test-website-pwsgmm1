const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

const targetStr = `'<span style="color:#888;">Reason:</span> ' + (h.reason||'—') + ' &nbsp;<span style="color:#aaa;font-size:.75rem;">' + dt + ' by ' + (h.changedBy||'—') + '</span>' +
                    '</div>';`;

const replaceStr = `'<span style="color:#888;">Reason:</span> ' + (h.reason||'—') + ' &nbsp;<span style="color:#aaa;font-size:.75rem;">' + dt + ' by ' + (h.changedBy||'—') + '</span>' +
                        extraInfo +
                    '</div>';`;

if(content.includes(targetStr)) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync('admin.html', content);
    console.log('Successfully updated admin.html');
} else {
    console.log('Failed to match in admin.html');
}
