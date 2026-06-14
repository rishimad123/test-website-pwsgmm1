const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace(
    "                diag\r\n            return sendJSON(res, 200, { ok: false, message: 'Cloudinary error: ' + err.message, error: String(err), diag });\r\n        }",
    "                diag\r\n            });\r\n        } catch (err) {\r\n            return sendJSON(res, 200, { ok: false, message: 'Cloudinary error: ' + err.message, error: String(err), diag });\r\n        }"
);
c = c.replace(
    "                diag\n            return sendJSON(res, 200, { ok: false, message: 'Cloudinary error: ' + err.message, error: String(err), diag });\n        }",
    "                diag\n            });\n        } catch (err) {\n            return sendJSON(res, 200, { ok: false, message: 'Cloudinary error: ' + err.message, error: String(err), diag });\n        }"
);
fs.writeFileSync('server.js', c);
console.log('Fixed syntax in server.js');
