const fs = require('fs');

// ── 1. admin.html: Add new role to both dropdowns ──────────────────────────
let adminHtml = fs.readFileSync('admin.html', 'utf8');

// Create User dropdown
adminHtml = adminHtml.replace(
    '<option value="volunteer">Volunteer Full Access</option>\r\n                        <option value="committee">Committee</option>',
    '<option value="volunteer">Volunteer Full Access</option>\r\n                        <option value="volunteer_full_tshirt">Volunteer Full Access with T-Shirt</option>\r\n                        <option value="committee">Committee</option>'
);
// Also try LF variant
adminHtml = adminHtml.replace(
    '<option value="volunteer">Volunteer Full Access</option>\n                        <option value="committee">Committee</option>',
    '<option value="volunteer">Volunteer Full Access</option>\n                        <option value="volunteer_full_tshirt">Volunteer Full Access with T-Shirt</option>\n                        <option value="committee">Committee</option>'
);

// Edit User dropdown — replace the whole select content
adminHtml = adminHtml.replace(
    '<select name="role" id="euRole" required>\r\n                        <option value="volunteer">Volunteer</option>\r\n                        <option value="committee">Committee</option>\r\n                        <option value="admin">Admin</option>\r\n                    </select>',
    '<select name="role" id="euRole" required>\r\n                        <option value="volunteer_view">Volunteer Only View</option>\r\n                        <option value="volunteer">Volunteer Full Access</option>\r\n                        <option value="volunteer_full_tshirt">Volunteer Full Access with T-Shirt</option>\r\n                        <option value="committee">Committee</option>\r\n                        <option value="admin">Admin</option>\r\n                    </select>'
);
adminHtml = adminHtml.replace(
    '<select name="role" id="euRole" required>\n                        <option value="volunteer">Volunteer</option>\n                        <option value="committee">Committee</option>\n                        <option value="admin">Admin</option>\n                    </select>',
    '<select name="role" id="euRole" required>\n                        <option value="volunteer_view">Volunteer Only View</option>\n                        <option value="volunteer">Volunteer Full Access</option>\n                        <option value="volunteer_full_tshirt">Volunteer Full Access with T-Shirt</option>\n                        <option value="committee">Committee</option>\n                        <option value="admin">Admin</option>\n                    </select>'
);

fs.writeFileSync('admin.html', adminHtml);
console.log('admin.html patched');
console.log('volunteer_full_tshirt occurrences:', (adminHtml.match(/volunteer_full_tshirt/g)||[]).length);

// ── 2. admin.js: Add role badge colours ────────────────────────────────────
let adminJs = fs.readFileSync('admin.js', 'utf8');

// Two places with roleBg/roleClr maps
adminJs = adminJs.replace(
    /const roleBg\s*=\s*\{\s*admin:'#EDE7F6',\s*volunteer:'#E3F2FD',\s*committee:'#E8F5E9'\s*\};/g,
    "const roleBg  = { admin:'#EDE7F6', volunteer:'#E3F2FD', volunteer_view:'#F3E5F5', volunteer_full_tshirt:'#E8EAF6', committee:'#E8F5E9' };"
);
adminJs = adminJs.replace(
    /const roleClr\s*=\s*\{\s*admin:'#4527A0',\s*volunteer:'#1565C0',\s*committee:'#1B5E20'\s*\};/g,
    "const roleClr = { admin:'#4527A0', volunteer:'#1565C0', volunteer_view:'#6A1B9A', volunteer_full_tshirt:'#283593', committee:'#1B5E20' };"
);

// Also update the second roleBg/roleClr set (volunteers table in admin.js)
adminJs = adminJs.replace(
    /const roleBg\s*=\s*\{[^}]*\};[\s\S]*?const roleClr\s*=\s*\{[^}]*\};/,
    (match) => {
        // Replace the first occurrence only
        return match;  // already handled by regex above
    }
);

fs.writeFileSync('admin.js', adminJs);
console.log('admin.js patched');
console.log('volunteer_full_tshirt in admin.js:', (adminJs.match(/volunteer_full_tshirt/g)||[]).length);
