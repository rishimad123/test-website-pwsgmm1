const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');
const lines = content.split('\n');

// Replace specific lines with correct Marathi content (0-indexed)
// Each entry: [lineIndex, newLineContent]
const fixes = [
    // Line 3670: स्थापना १९९१
    [3669, '                                <span id="ade_rcg_f_receiptTopLeft">स्थापना १९९१</span>'],
    // Line 3671: ॥ श्री गजानन प्रसन्न ॥
    [3670, '                                <span class="rcg-r-center">॥ श्री गजानन प्रसन्न ॥</span>'],
    // Line 3672: वर्ष :
    [3671, '                                <span class="rcg-r-right">वर्ष : <span id="rcgRYear" class="rcg-placeholder">__</span></span>'],
    // Line 3676: श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ
    [3675, '                            <div class="rcg-r-title">श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ</div>'],
    // Line 3680: address
    [3679, '                                पटेलवाडी, क्लासिक हॉटेलच्या मागे, जुना नागरदास रोड, अंधेरी (पूर्व), मुंबई - ४०००६९'],
    // Line 3687: पावती क्र.
    [3686, '                                <span>पावती क्र. : <span id="rcgRReceiptNo" class="rcg-r-meta-val rcg-placeholder">___</span></span>'],
    // Line 3688: दिनांक (already fixed but re-apply clean)
    [3687, '                                <span>दिनांक : <span id="rcgRDate" class="rcg-r-meta-val rcg-placeholder">___________</span></span>'],
    // Line 3693: श्री/श्रीमती
    [3692, '                                <span class="rcg-r-donor-label">श्री/श्रीमती</span>'],
    // Line 3695: यांचकडून (already fixed but re-apply clean)
    [3694, '                                <span class="rcg-r-donor-suffix">यांचकडून</span>'],
    // Line 3700: अक्षरी रुपये
    [3699, '                                <span class="rcg-r-words-label">अक्षरी रुपये</span>'],
    // Line 3707: रोख/चेक मिळाले, धन्यवाद !
    [3706, '                                <span class="rcg-r-thanks-label">रोख/चेक मिळाले, धन्यवाद !</span>'],
    // Line 3719: अध्यक्ष
    [3718, '                                    <div class="rcg-r-sig-title">अध्यक्ष</div>'],
    // Line 3721: जयेश शिंदे (already fixed but re-apply clean)
    [3720, '                                    <div>जयेश शिंदे</div>'],
    // Line 3724: सरचिटणीस (already fixed)
    [3723, '                                    <div class="rcg-r-sig-title">सरचिटणीस</div>'],
    // Line 3726: ध्रुव चीटालीय
    [3725, '                                    <div><span class="sg-marathi" translate="no">ध्रुव चीटालीय</span><span class="sg-english" translate="no" style="display:none;">Dhruv Chotaliya</span></div>'],
    // Line 3729: खजिनदार (already fixed)
    [3728, '                                    <div class="rcg-r-sig-title">खजिनदार</div>'],
    // Line 3731: रणजीत राजपूत (already fixed)
    [3730, '                                    <div>रणजीत राजपूत</div>'],
    // Line 3734: वसूल करणार
    [3733, '                                    <div class="rcg-r-sig-title">वसूल करणार</div>'],
    // Form label lines
    // Line 3602: Receipt No. (पावती क्र.)
    [3601, '                            <label for="rcgReceiptNo">Receipt No. (पावती क्र.)</label>'],
    // Line 3607: Year (वर्ष)
    [3606, '                            <label for="rcgYear">Year (वर्ष)</label>'],
    // Line 3612: Donor Full Name (श्री/श्रीमती)
    [3611, '                            <label for="rcgDonorName">Donor Full Name (श्री/श्रीमती)</label>'],
    // Line 3622: Amount in Words (अक्षरी रुपये)
    [3621, '                            <label for="rcgAmountWords">Amount in Words (अक्षरी रुपये) <span style="color:#aaa;font-weight:400;">(auto)</span></label>'],
    // Line 3627: Date (दिनांक)
    [3626, '                            <label for="rcgDate">Date (दिनांक)</label>'],
    // Line 3634: Cash (रोख)
    [3633, '                                <option value="Cash">Cash (रोख)</option>'],
    // Line 3635: Cheque (चेक)
    [3634, '                                <option value="Cheque">Cheque (चेक)</option>'],
];

let fixCount = 0;
fixes.forEach(([idx, newLine]) => {
    if (idx < lines.length) {
        const old = lines[idx];
        lines[idx] = newLine + (old.endsWith('\r') ? '\r' : '');
        fixCount++;
    }
});

const result = lines.join('\n');
fs.writeFileSync('admin.html', result, 'utf8');
console.log('Fixed', fixCount, 'lines');

// Verify a few
console.log('\nSample output:');
[3669, 3670, 3675, 3686, 3692, 3699, 3706, 3718].forEach(i => {
    console.log('Line', i+1, ':', lines[i].trim().substring(0, 80));
});
