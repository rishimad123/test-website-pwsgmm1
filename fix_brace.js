const fs = require('fs');
let content = fs.readFileSync('dashboard.html', 'utf8');

const badStr = "            }\n        }\n        }\r\n\r\n        // ==================== EDIT AMOUNT MODAL";
const badStr2 = "            }\r\n        }\r\n        }\r\n\r\n        // ==================== EDIT AMOUNT MODAL";
const badStr3 = "            }\n        }\r\n        }\r\n\r\n        // ==================== EDIT AMOUNT MODAL";
const badStr4 = "        }\\r\\n        }\\r\\n\\r\\n        // ==================== EDIT AMOUNT MODAL";
const goodStr = "            }\n        }\n\n        // ==================== EDIT AMOUNT MODAL";

content = content.replace(badStr, goodStr)
                 .replace(badStr2, goodStr)
                 .replace(badStr3, goodStr)
                 .replace("        }\r\n        }\r\n\r\n        // ==================== EDIT AMOUNT MODAL", "        }\r\n\r\n        // ==================== EDIT AMOUNT MODAL");

fs.writeFileSync('dashboard.html', content);
console.log('Fixed braces!');
