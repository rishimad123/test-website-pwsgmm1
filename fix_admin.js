const fs = require('fs');
let content = fs.readFileSync('admin.js', 'utf8');

const target = `return '<div style="padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #E3F2FD;margin-bottom:6px;font-size:.82rem;">' +
                    nameChange + amtChange + bookChange + recChange + modeChange + statusChange +
                    '<span style="color:#888;">Reason:</span> ' + (h.reason||'—') + ' &nbsp;<span style="color:#aaa;font-size:.75rem;">' + dt + ' by ' + (h.changedBy||'—') + '</span>' +
                '</div>';`;

const replacement = `let extraInfo = '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #E3F2FD;font-size:.78rem;color:#666;">' +
                    'Amount: <strong>' + (h.toAmount !== undefined && h.toAmount !== null ? '₹'+h.toAmount : (amount != null ? '₹'+amount : '—')) + '</strong> &nbsp;|&nbsp; ' +
                    'Book: <strong>' + (h.toBook !== undefined && h.toBook !== null ? h.toBook : (bookNum || '—')) + '</strong> &nbsp;|&nbsp; ' +
                    'Receipt: <strong>' + (h.toReceipt !== undefined && h.toReceipt !== null ? h.toReceipt : (receiptNum || '—')) + '</strong>' +
                    '</div>';
                return '<div style="padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #E3F2FD;margin-bottom:6px;font-size:.82rem;">' +
                    nameChange + amtChange + bookChange + recChange + modeChange + statusChange +
                    '<span style="color:#888;">Reason:</span> ' + (h.reason||'—') + ' &nbsp;<span style="color:#aaa;font-size:.75rem;">' + dt + ' by ' + (h.changedBy||'—') + '</span>' +
                    extraInfo +
                '</div>';`;

if (content.indexOf(target) !== -1) {
    content = content.replace(target, replacement);
    fs.writeFileSync('admin.js', content, 'utf8');
    console.log('Success (exact match)');
} else {
    console.log('Trying regex match...');
    const rgx = /return '<div style=\"padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #E3F2FD;margin-bottom:6px;font-size:\.82rem;\">' \+\s*nameChange \+ amtChange \+ bookChange \+ recChange \+ modeChange \+ statusChange \+\s*'<span style=\"color:#888;\">Reason:<\/span> ' \+ \(h\.reason\|\|'[^']+'\) \+ ' &nbsp;<span style=\"color:#aaa;font-size:\.75rem;\">' \+ dt \+ ' by ' \+ \(h\.changedBy\|\|'[^']+'\) \+ '<\/span>' \+\s*'<\/div>';/g;
    
    if (rgx.test(content)) {
        content = content.replace(rgx, replacement);
        fs.writeFileSync('admin.js', content, 'utf8');
        console.log('Success (regex match)');
    } else {
        console.log('Failed to match');
    }
}
