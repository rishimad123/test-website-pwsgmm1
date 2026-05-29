const fs = require("fs");

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, "utf-8");

    // 1. Fix balanceRecovery missing admin-card
    if (content.includes('id="balanceRecovery"')) {
        const pattern = /(id="balanceRecovery"[\s\S]*?)(<div style="margin-bottom:28px;">)(\s*<div class="card-header">)/;
        content = content.replace(pattern, '$1<div class="admin-card">$3');
    }

    // 2. Rewrite tshirtSection
    const formMatch = content.match(/<!-- Application Form \+ Admin Price Settings -->[\s\S]*?(?=<!-- Sizes Overview -->)/);
    if (!formMatch) return console.log("Form not found in", filepath);
    
    // We want to grab sizesMatch up to the <p>Click any size...
    const sizesMatch = content.match(/<!-- Sizes Overview -->[\s\S]*?<p style="margin:12px 0 0;font-size:.78rem;color:#aaa;text-align:center;">Click any size to view applicants<\/p>\s*<\/div>\s*<\/div>/);
    if (!sizesMatch) return console.log("Sizes not found in", filepath);

    let displayStyle = filepath.includes("dashboard") ? ' style="display:none;"' : '';

    const newTshirtSection = `<!-- ══════════ T-SHIRT SECTION ══════════ -->
                <div id="tshirtSection" class="content-section"${displayStyle}>
                    <div class="page-title">
                        <h1><i class="fas fa-tshirt" style="color:var(--primary-color);margin-right:10px;"></i>T-shirt Section</h1>
                        <p>Manage T-shirt applications and size summaries</p>
                    </div>

                    <div class="admin-card">
                        ${formMatch[0].trim()}
                        
                        <div style="margin-top:28px;">
                            ${sizesMatch[0].trim()}
                        </div>
                    </div>
                </div>\n`;

    // Now find where to replace
    const startIdx = content.indexOf('<div id="tshirtSection"');
    if (startIdx === -1) return console.log("Start not found");
    
    const sizesEndText = '<p style="margin:12px 0 0;font-size:.78rem;color:#aaa;text-align:center;">Click any size to view applicants</p>\n        </div>\n    </div>\n</div>';
    let endIdx = content.indexOf(sizesEndText, startIdx);
    
    if (endIdx === -1) {
        // fallback
        const altEnd = '<p style="margin:12px 0 0;font-size:.78rem;color:#aaa;text-align:center;">Click any size to view applicants</p>';
        endIdx = content.indexOf(altEnd, startIdx);
        if (endIdx === -1) return console.log("End not found in", filepath);
        
        // Find the 3 closing divs after it
        let temp = content.substring(endIdx);
        const match = temp.match(/<\/p>[\s]*<\/div>[\s]*<\/div>[\s]*<\/div>/);
        if (match) {
            endIdx = endIdx + match.index + match[0].length;
        } else {
            endIdx = endIdx + altEnd.length;
        }
    } else {
        endIdx = endIdx + sizesEndText.length;
    }

    let replaceStart = startIdx;
    const commentStr = '<!-- ══════════ T-SHIRT SECTION ══════════ -->\n                ';
    // check if comment exists
    const beforeStart = content.substring(Math.max(0, startIdx - 100), startIdx);
    if (beforeStart.includes('<!-- ══════════ T-SHIRT SECTION ══════════ -->')) {
        replaceStart = content.lastIndexOf('<!-- ══════════ T-SHIRT SECTION ══════════ -->', startIdx);
    } else if (beforeStart.includes('<!-- \ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd T-SHIRT SECTION')) {
        replaceStart = content.lastIndexOf('<!--', startIdx);
    } else if (beforeStart.includes('<!--  ? ? ? ? ? ? ? ? ? ? T-SHIRT SECTION')) {
        replaceStart = content.lastIndexOf('<!--', startIdx);
    }

    content = content.substring(0, replaceStart) + newTshirtSection + content.substring(endIdx);
    
    fs.writeFileSync(filepath, content);
    console.log("Fixed", filepath);
}

fixFile("dashboard.html");
fixFile("admin.html");
