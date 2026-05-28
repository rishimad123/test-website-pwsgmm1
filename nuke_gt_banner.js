const fs = require('fs');

function aggressiveHide(file) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove the old CSS block
    content = content.replace(
        /\\/\\* Hide Google Translate Top Bar \\*\\/[\\s\\S]*?#goog-gt-tt \\{ display: none !important; \\}/,
        `/* Deep Hide Google Translate Top Bar */
        .goog-te-banner-frame { display: none !important; visibility: hidden !important; }
        .skiptranslate iframe { display: none !important; visibility: hidden !important; }
        body { top: 0px !important; position: static !important; }
        html { height: 100%; margin-top: 0px !important; }
        #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
        .goog-text-highlight { background: none !important; box-shadow: none !important; border: none !important; }
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf { display: none !important; visibility: hidden !important; }`
    );

    // Also inject a small JS interval right after googleTranslateElementInit to nuke any inline styles Google tries to force
    const jsPayload = `
        setInterval(function() {
            var frames = document.getElementsByClassName('goog-te-banner-frame');
            for(var i=0; i<frames.length; i++) { frames[i].style.display = 'none'; }
            if (document.body) document.body.style.top = '0px';
            if (document.documentElement) document.documentElement.style.marginTop = '0px';
        }, 500);`;

    if (!content.includes('setInterval(function() { var frames = document.getElementsByClassName')) {
        content = content.replace(
            /autoDisplay: false\s*\}, 'google_translate_element'\);\s*\}/,
            `autoDisplay: false\n            }, 'google_translate_element');\n        }\n${jsPayload}`
        );
    }

    // Cache bust version just in case
    content = content.replace(/admin\.js\?v=\d+/g, 'admin.js?v=5');

    fs.writeFileSync(file, content, 'utf8');
}

aggressiveHide('admin.html');
aggressiveHide('dashboard.html');
console.log('Aggressive Google Translate banner removal applied successfully.');
