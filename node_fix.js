const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

// Use precise strings, taking care with escape characters
const searchStr = "return '<div style=\"padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #E3F2FD;margin-bottom:6px;font-size:.82rem;\">' +\n                        nameChange + amtChange + bookChange + recChange + modeChange + statusChange +\n                        '<span style=\"color:#888;\">Reason:</span> ' + (h.reason||'—') + ' &nbsp;<span style=\"color:#aaa;font-size:.75rem;\">' + dt + ' by ' + (h.changedBy||'—') + '</span>' +\n                    '</div>';";

const replaceStr = "return '<div style=\"padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #E3F2FD;margin-bottom:6px;font-size:.82rem;\">' +\n                        nameChange + amtChange + bookChange + recChange + modeChange + statusChange +\n                        '<span style=\"color:#888;\">Reason:</span> ' + (h.reason||'—') + ' &nbsp;<span style=\"color:#aaa;font-size:.75rem;\">' + dt + ' by ' + (h.changedBy||'—') + '</span>' +\n                        extraInfo +\n                    '</div>';";

if (content.indexOf(searchStr) !== -1) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync('admin.html', content, 'utf8');
    console.log('Success (exact match)');
} else {
    console.log('Trying regex match...');
    const rgx = /return '<div style=\"padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #E3F2FD;margin-bottom:6px;font-size:\.82rem;\">' \+\s+nameChange \+ amtChange \+ bookChange \+ recChange \+ modeChange \+ statusChange \+\s+'<span style=\"color:#888;\">Reason:<\/span> ' \+ \(h\.reason\|\|'—'\) \+ ' &nbsp;<span style=\"color:#aaa;font-size:\.75rem;\">' \+ dt \+ ' by ' \+ \(h\.changedBy\|\|'—'\) \+ '<\/span>' \+\s+'<\/div>';/g;
    
    if (rgx.test(content)) {
        content = content.replace(rgx, replaceStr);
        fs.writeFileSync('admin.html', content, 'utf8');
        console.log('Success (regex match)');
    } else {
        console.log('Failed to match');
    }
}
