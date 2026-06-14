const fs = require('fs');

function patchHtml(file, prefix) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Top left
    content = content.replace(
        /<span>स्थापना १९९१<\/span>/,
        `<span id="${prefix}_f_receiptTopLeft">स्थापना १९९१</span>`
    );

    // 2. Top center
    content = content.replace(
        /<span style="text-align:center;flex:1;">॥ श्री गजानन प्रसन्न ॥<\/span>/,
        `<span id="${prefix}_f_receiptTopCenter" style="text-align:center;flex:1;">॥ श्री गजानन प्रसन्न ॥</span>`
    );

    // 3. Top right prefix
    content = content.replace(
        /<span style="white-space:nowrap;">वर्ष : <span id="(a?de)_rcg_r_year"/,
        `<span style="white-space:nowrap;"><span id="${prefix}_f_receiptTopRightPrefix">वर्ष :</span> <span id="$1_rcg_r_year"`
    );

    // 4. Title
    content = content.replace(
        /<div style="text-align:center;font-size:1\.75rem;font-weight:900;color:#8B1A1A;line-height:1\.25;margin-bottom:3px;letter-spacing:\.01em;">\s*श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ\s*<\/div>/,
        `<div id="${prefix}_f_receiptTitle" style="text-align:center;font-size:1.75rem;font-weight:900;color:#8B1A1A;line-height:1.25;margin-bottom:3px;letter-spacing:.01em;">\n                        श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ\n                    </div>`
    );

    // 5. Address
    content = content.replace(
        /<div style="text-align:center;font-size:\.72rem;color:#8B1A1A;margin-bottom:10px;font-weight:500;">\s*पटेलवाडी, क्लासिक हॉटेलच्या मागे, जुना नागरदास रोड, अंधेरी \(पूर्व\), मुंबई - ४०००६९\s*<\/div>/,
        `<div id="${prefix}_f_receiptAddress" style="text-align:center;font-size:.72rem;color:#8B1A1A;margin-bottom:10px;font-weight:500;">\n                        पटेलवाडी, क्लासिक हॉटेलच्या मागे, जुना नागरदास रोड, अंधेरी (पूर्व), मुंबई - ४०००६९\n                    </div>`
    );

    // 6. Donor prefix
    content = content.replace(
        /<span style="font-size:\.92rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">श्री\/श्रीमती<\/span>/,
        `<span id="${prefix}_f_receiptDonorPrefix" style="font-size:.92rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">श्री/श्रीमती</span>`
    );

    // 7. Donor suffix
    content = content.replace(
        /<span style="font-size:\.88rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">यांचकडून<\/span>/,
        `<span id="${prefix}_f_receiptDonorSuffix" style="font-size:.88rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">यांचकडून</span>`
    );

    // 8. Amount prefix
    content = content.replace(
        /<span style="font-size:\.92rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">अक्षरी रुपये<\/span>/,
        `<span id="${prefix}_f_receiptAmountWordsPrefix" style="font-size:.92rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">अक्षरी रुपये</span>`
    );

    // 9. Thank you
    content = content.replace(
        /<span style="font-size:\.88rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">रोख\/चेक मिळाले, धन्यवाद !<\/span>/,
        `<span id="${prefix}_f_receiptThankYouText" style="font-size:.88rem;font-weight:700;color:#8B1A1A;white-space:nowrap;">रोख/चेक मिळाले, धन्यवाद !</span>`
    );

    // 10. Signatures
    // We will do a generic replacement for the 4 roles.
    content = content.replace(
        /<div style="font-size:\.68rem;color:#777;font-weight:400;">अध्यक्ष<\/div>\s*<div style="border-top:1\.5px solid #8B1A1A;width:70px;margin:6px auto 3px;"><\/div>\s*<div>जयेश शिंदे<\/div>/,
        `<div id="${prefix}_f_receiptSign1Role" style="font-size:.68rem;color:#777;font-weight:400;">अध्यक्ष</div>\n                            <div style="border-top:1.5px solid #8B1A1A;width:70px;margin:6px auto 3px;"></div>\n                            <div id="${prefix}_f_receiptSign1Name">जयेश शिंदे</div>`
    );

    content = content.replace(
        /<div style="font-size:\.68rem;color:#777;font-weight:400;">सरचिटणीस<\/div>\s*<div style="border-top:1\.5px solid #8B1A1A;width:70px;margin:6px auto 3px;"><\/div>\s*<div><span class="sg-marathi" translate="no">ध्रुव चीटालीय<\/span><span class="sg-english" translate="no" style="display:none;">Dhruv Chotaliya<\/span><\/div>/,
        `<div id="${prefix}_f_receiptSign2Role" style="font-size:.68rem;color:#777;font-weight:400;">सरचिटणीस</div>\n                            <div style="border-top:1.5px solid #8B1A1A;width:70px;margin:6px auto 3px;"></div>\n                            <div id="${prefix}_f_receiptSign2Name"><span class="sg-marathi" translate="no">ध्रुव चीटालीय</span><span class="sg-english" translate="no" style="display:none;">Dhruv Chotaliya</span></div>`
    );

    content = content.replace(
        /<div style="font-size:\.68rem;color:#777;font-weight:400;">खजिनदार<\/div>\s*<div style="border-top:1\.5px solid #8B1A1A;width:70px;margin:6px auto 3px;"><\/div>\s*<div>रणजीत राजपूत<\/div>/,
        `<div id="${prefix}_f_receiptSign3Role" style="font-size:.68rem;color:#777;font-weight:400;">खजिनदार</div>\n                            <div style="border-top:1.5px solid #8B1A1A;width:70px;margin:6px auto 3px;"></div>\n                            <div id="${prefix}_f_receiptSign3Name">रणजीत राजपूत</div>`
    );

    content = content.replace(
        /<div style="font-size:\.68rem;color:#777;font-weight:400;">वसुल करणार<\/div>\s*<div style="border-top:1\.5px solid #8B1A1A;width:70px;margin:6px auto 3px;"><\/div>\s*<div>&nbsp;<\/div>/,
        `<div id="${prefix}_f_receiptSign4Role" style="font-size:.68rem;color:#777;font-weight:400;">वसुल करणार</div>\n                            <div style="border-top:1.5px solid #8B1A1A;width:70px;margin:6px auto 3px;"></div>\n                            <div id="${prefix}_f_receiptSign4Name">&nbsp;</div>`
    );

    // Patch fetch function to apply receiptFormat
    const syncFunc = `
    // Apply dynamic receipt format
    if (data.receiptFormat) {
        const rf = data.receiptFormat;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerHTML = val; };
        setVal('${prefix}_f_receiptTopLeft', rf.receiptTopLeft);
        setVal('${prefix}_f_receiptTopCenter', rf.receiptTopCenter);
        setVal('${prefix}_f_receiptTopRightPrefix', rf.receiptTopRightPrefix);
        setVal('${prefix}_r_year', rf.receiptYear); // Set the year too
        setVal('${prefix}_f_receiptTitle', rf.receiptTitle);
        setVal('${prefix}_f_receiptAddress', rf.receiptAddress);
        setVal('${prefix}_f_receiptDonorPrefix', rf.receiptDonorPrefix);
        setVal('${prefix}_f_receiptDonorSuffix', rf.receiptDonorSuffix);
        setVal('${prefix}_f_receiptAmountWordsPrefix', rf.receiptAmountWordsPrefix);
        setVal('${prefix}_f_receiptThankYouText', rf.receiptThankYouText);
        setVal('${prefix}_f_receiptSign1Role', rf.receiptSign1Role);
        setVal('${prefix}_f_receiptSign1Name', rf.receiptSign1Name);
        setVal('${prefix}_f_receiptSign2Role', rf.receiptSign2Role);
        setVal('${prefix}_f_receiptSign2Name', rf.receiptSign2Name);
        setVal('${prefix}_f_receiptSign3Role', rf.receiptSign3Role);
        setVal('${prefix}_f_receiptSign3Name', rf.receiptSign3Name);
        setVal('${prefix}_f_receiptSign4Role', rf.receiptSign4Role);
        setVal('${prefix}_f_receiptSign4Name', rf.receiptSign4Name);
    }
    `;

    if (file.includes('admin.html')) {
        content = content.replace(/(document\.getElementById\('eventDate'\)\.value =[^;]+;)/, `$1\n${syncFunc}`);
    } else {
        content = content.replace(/(document\.getElementById\('eventDate'\)\.value =[^;]+;)/, `$1\n${syncFunc}`);
    }

    fs.writeFileSync(file, content);
}

patchHtml('c:/Users/admin/Desktop/test-website-pwsgmm1/admin.html', 'ade_rcg');
patchHtml('c:/Users/admin/Desktop/test-website-pwsgmm1/dashboard.html', 'de_rcg');

console.log("HTML patching completed successfully.");
