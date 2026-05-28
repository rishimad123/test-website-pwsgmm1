const fs = require('fs');

function patchHtml(filename, isDashboard) {
    if (!fs.existsSync(filename)) return;
    let content = fs.readFileSync(filename, 'utf8');

    // 1. Add script tag
    if (!content.includes('<script src="tshirts.js"></script>')) {
        content = content.replace(
            /<script src="donations.js.*?><\/script>/,
            `$&
    <script src="tshirts.js"></script>`
        );
    }

    // 2. Add sidebar menu
    const sidebarMatch = /<ul class="admin-menu">/i;
    const sidebarItem = `
                <li>
                    <a href="#" onclick="${isDashboard ? 'showVolunteerSection' : 'showAdminSection'}('tshirtSection')">
                        <i class="fas fa-tshirt"></i>
                        <span>T-shirt Section</span>
                    </a>
                </li>`;
    if (!content.includes('tshirtSection') && sidebarMatch.test(content)) {
        content = content.replace(sidebarMatch, `$&${sidebarItem}`);
    }

    // 3. Add the HTML container
    // We can place it before "<!-- Live Updates (SSE) -->"
    const containerHtml = `
    <!-- ══════════ T-SHIRT SECTION ══════════ -->
    <div id="tshirtSection" class="content-section" style="display:none;"></div>
    
    `;
    
    if (!content.includes('id="tshirtSection"')) {
        if (content.includes('<!-- Live Updates (SSE) -->')) {
            content = content.replace('<!-- Live Updates (SSE) -->', containerHtml + '<!-- Live Updates (SSE) -->');
        } else {
            // just put it before the closing </div> of .admin-content
            // Hard to match exact closing div, we will just inject it at a known location
            content = content.replace('</body>', containerHtml + '</body>');
        }
    }

    fs.writeFileSync(filename, content, 'utf8');
    console.log(filename + ' patched successfully.');
}

patchHtml('admin.html', false);
patchHtml('dashboard.html', true);
