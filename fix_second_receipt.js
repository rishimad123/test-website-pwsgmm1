const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');
const lines = content.split('\n');

// Fix the SECOND receipt template (ade_rcg_receipt div, lines 4491-4576)
// Each pair: [0-indexed line number, full correct replacement line]
const fixes = [
    // Line 4493: स्थापना १९९१
    [4492, '                        <span>\u0938\u094d\u0925\u093e\u092a\u0928\u093e \u0967\u096f\u096f\u0967</span>'],
    // Line 4494: ॥ श्री गजानन प्रसन्न ॥
    [4493, '                        <span id="ade_rcg_f_receiptTopCenter" style="text-align:center;flex:1;">\u0964\u0964 \u0936\u094d\u0930\u0940 \u0917\u091c\u093e\u0928\u0928 \u092a\u094d\u0930\u0938\u0928\u094d\u0928 \u0964\u0964</span>'],
    // Line 4495: वर्ष :
    [4494, '                        <span style="white-space:nowrap;"><span id="ade_rcg_f_receiptTopRightPrefix">\u0935\u0930\u094d\u0937 :</span> <span id="ade_rcg_r_year" style="color:#222;font-weight:500;">__</span></span>'],
    // Line 4500: श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ
    [4499, '                        \u0936\u094d\u0930\u0940 \u092a\u091f\u0947\u0932\u0935\u093e\u0921\u0940 \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u0917\u0923\u0947\u0936\u094b\u0924\u094d\u0938\u0935 \u092e\u0902\u0921\u0933'],
    // Line 4505: address
    [4504, '                        \u092a\u091f\u0947\u0932\u0935\u093e\u0921\u0940, \u0915\u094d\u0932\u093e\u0938\u093f\u0915 \u0939\u0949\u091f\u0947\u0932\u091a\u094d\u092f\u093e \u092e\u093e\u0917\u0947, \u091c\u0941\u0928\u093e \u0928\u093e\u0917\u0930\u0926\u093e\u0938 \u0930\u094b\u0921, \u0905\u0902\u0927\u0947\u0930\u0940 (\u092a\u0942\u0930\u094d\u0935), \u092e\u0941\u0902\u092c\u0908 - \u0967\u0966\u0966\u0966\u096d\u096f'],
    // Line 4512: पावती क्र. :
    [4511, '                        <span>\u092a\u093e\u0935\u0924\u0940 \u0915\u094d\u0930. :'],
    // Line 4522: श्री/श्रीमती
    [4521, '                        <span id="ade_rcg_f_receiptDonorPrefix" style="font-size:.92rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">\u0936\u094d\u0930\u0940/\u0936\u094d\u0930\u0940\u092e\u0924\u0940</span>'],
    // Line 4532: अक्षरी रुपये
    [4531, '                        <span id="ade_rcg_f_receiptAmountWordsPrefix" style="font-size:.92rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">\u0905\u0915\u094d\u0937\u0930\u0940 \u0930\u0941\u092a\u092f\u0947</span>'],
    // Line 4542: रोख/चेक मिळाले, धन्यवाद !
    [4541, '                        <span id="ade_rcg_f_receiptThankYouText" style="font-size:.88rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">\u0930\u094b\u0916/\u091a\u0947\u0915 \u092e\u093f\u0933\u093e\u0932\u0947, \u0927\u0928\u094d\u092f\u0935\u093e\u0926 !</span>'],
    // Line 4557: अध्यक्ष
    [4556, '                            <div id="ade_rcg_f_receiptSign1Role" style="font-size:.68rem;color:#777;font-weight:400;">\u0905\u0927\u094d\u092f\u0915\u094d\u0937</div>'],
    // Line 4564: ध्रुव चीटालीय
    [4563, '                            <div id="ade_rcg_f_receiptSign2Name"><span class="sg-marathi" translate="no">\u0927\u094d\u0930\u0941\u0935 \u091a\u0940\u091f\u093e\u0932\u0940\u092f</span><span class="sg-english" translate="no" style="display:none;">Dhruv Chotaliya</span></div>'],
    // Line 4572: वसूल करणार
    [4571, '                            <div id="ade_rcg_f_receiptSign4Role" style="font-size:.68rem;color:#777;font-weight:400;">\u0935\u0938\u0942\u0932 \u0915\u0930\u0923\u093e\u0930</div>'],
];

let fixCount = 0;
fixes.forEach(([idx, newLine]) => {
    if (idx < lines.length) {
        lines[idx] = newLine + (lines[idx].endsWith('\r') ? '\r' : '');
        fixCount++;
    }
});

const result = lines.join('\n');
fs.writeFileSync('admin.html', result, 'utf8');
console.log('Fixed', fixCount, 'lines in second receipt template');

// Verify
console.log('\nSample output:');
[4492, 4493, 4499, 4504, 4511, 4521, 4531, 4541, 4556].forEach(i => {
    console.log('Line', i+1, ':', lines[i].trim().substring(0, 80));
});
