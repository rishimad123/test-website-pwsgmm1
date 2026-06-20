const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

// These are the EXACT strings as they appear in the file (using codepoints from char inspection)
// Windows-1252 bytes were read as Unicode codepoints, producing these hybrid strings
// Correct Marathi unicode is provided for each

// Helper: build string from codepoint array
const cp = (...codes) => codes.map(c => String.fromCodePoint(c)).join('');

// The mojibake chars that appear instead of Marathi bytes:
// e0 a4 XX  -> U+00E0 U+00A4 U+00XX  (the mojibake pattern)
// But some bytes (80-9F range) are Windows-1252 special chars:
//   80 -> € (20ac)   82 -> ‚ (201a)   83 -> ƒ (192)    84 -> „ (201e)
//   85 -> … (2026)   86 -> † (2020)   87 -> ‡ (2021)   88 -> ˆ (2c6)
//   89 -> ‰ (2030)   8a -> Š (160)    8b -> ‹ (2039)   8c -> Œ (152)
//   8d -> [undef]    8e -> Ž (17d)    8f -> [undef]
//   91 -> ' (2018)   92 -> ' (2019)   93 -> " (201c)   94 -> " (201d)
//   95 -> • (2022)   96 -> – (2013)   97 -> — (2014)   98 -> ˜ (2dc)
//   99 -> ™ (2122)   9a -> š (161)    9b -> › (203a)   9c -> œ (153)
//   9e -> ž (17e)    9f -> Ÿ (178)

// Instead of computing, use the exact strings from show_chars.js output above
// Build each bad string from its known codepoints

// à¤¸à¥à¤¥à¤¾à¤ªà¤¨à¤¾ à¥§à¥¯à¥¯à¥§  = स्थापना १९९१
// char codes: e0 a4 b8   e0 a5 8d   e0 a4 a5   e0 a4 be   e0 a4 aa   e0 a4 a8   e0 a4 be   20   e0 a5 a7   e0 a5 af   e0 a5 af   e0 a5 a7
// In UTF-8 this decodes to: à ¤ ¸ à ¥ . à ¤ ¥ à ¤ ¾ à ¤ ª à ¤ ¨ à ¤ ¾   à ¥ § à ¥ ¯ à ¥ ¯ à ¥ §

// These are ALL codepoints as they appear in the JS string when read as utf8:
const BAD = {
    "स्थापना १९९१":
        "\u00e0\u00a4\u00b8\u00e0\u00a5\u008d\u00e0\u00a4\u00a5\u00e0\u00a4\u00be\u00e0\u00a4\u00aa\u00e0\u00a4\u00a8\u00e0\u00a4\u00be \u00e0\u00a5\u00a7\u00e0\u00a5\u00af\u00e0\u00a5\u00af\u00e0\u00a5\u00a7",
    "॥ श्री गजानन प्रसन्न ॥":
        "\u00e0\u00a5\u00a5 \u00e0\u00a4\u00b6\u00e0\u00a5\u008d\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac \u00e0\u00a4\u2014\u00e0\u00a4\u0153\u00e0\u00a4\u00be\u00e0\u00a4\u00a8\u00e0\u00a4\u00a8 \u00e0\u00a4\u00aa\u00e0\u00a5\u008d\u00e0\u00a4\u00b0\u00e0\u00a4\u00b8\u00e0\u00a4\u00a8\u00e0\u00a5\u008d\u00e0\u00a4\u00a8 \u00e0\u00a5\u00a5",
    "वर्ष :":
        "\u00e0\u00a4\u00b5\u00e0\u00a4\u00b0\u00e0\u00a5\u008d\u00e0\u00a4\u00b7 :",
    "श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ":
        "\u00e0\u00a4\u00b6\u00e0\u00a5\u008d\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac \u00e0\u00a4\u00aa\u00e0\u00a4\u0178\u00e0\u00a5\u2021\u00e0\u00a4\u00b2\u00e0\u00a4\u00b5\u00e0\u00a4\u00be\u00e0\u00a4\u00a1\u00e0\u00a5\u20ac \u00e0\u00a4\u00b8\u00e0\u00a4\u00be\u00e0\u00a4\u00b0\u00e0\u00a5\u008d\u00e0\u00a4\u00b5\u00e0\u00a4\u0153\u00e0\u00a4\u00a8\u00e0\u00a4\u00bf\u00e0\u00a4\u2022 \u00e0\u00a4\u2014\u00e0\u00a4\u00a3\u00e0\u00a5\u2021\u00e0\u00a4\u00b6\u00e0\u00a5\u2039\u00e0\u00a4\u00a4\u00e0\u00a5\u008d\u00e0\u00a4\u00b8\u00e0\u00a4\u00b5 \u00e0\u00a4\u00ae\u00e0\u00a4\u201a\u00e0\u00a4\u00a1\u00e0\u00a4\u00b3",
    "पावती क्र. :":
        "\u00e0\u00a4\u00aa\u00e0\u00a4\u00be\u00e0\u00a4\u00b5\u00e0\u00a4\u00a4\u00e0\u00a5\u20ac \u00e0\u00a4\u2022\u00e0\u00a5\u008d\u00e0\u00a4\u00b0. :",
    "पावती क्र.":
        "\u00e0\u00a4\u00aa\u00e0\u00a4\u00be\u00e0\u00a4\u00b5\u00e0\u00a4\u00a4\u00e0\u00a5\u20ac \u00e0\u00a4\u2022\u00e0\u00a5\u008d\u00e0\u00a4\u00b0.",
    "श्री/श्रीमती":
        "\u00e0\u00a4\u00b6\u00e0\u00a5\u008d\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac/\u00e0\u00a4\u00b6\u00e0\u00a5\u008d\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac\u00e0\u00a4\u00ae\u00e0\u00a4\u00a4\u00e0\u00a5\u20ac",
    "अक्षरी रुपये":
        "\u00e0\u00a4\u2026\u00e0\u00a4\u2022\u00e0\u00a5\u008d\u00e0\u00a4\u00b7\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac \u00e0\u00a4\u00b0\u00e0\u00a5\u0081\u00e0\u00a4\u00aa\u00e0\u00a4\u00af\u00e0\u00a5\u2021",
    "रोख/चेक मिळाले, धन्यवाद !":
        "\u00e0\u00a4\u00b0\u00e0\u00a5\u2039\u00e0\u00a4\u2013/\u00e0\u00a4\u00a1\u00e0\u00a5\u2021\u00e0\u00a4\u2022 \u00e0\u00a4\u00ae\u00e0\u00a4\u00bf\u00e0\u00a4\u00b3\u00e0\u00a4\u00be\u00e0\u00a4\u00b2\u00e0\u00a5\u2021, \u00e0\u00a4\u00a7\u00e0\u00a4\u00a8\u00e0\u00a5\u008d\u00e0\u00a4\u00af\u00e0\u00a4\u00b5\u00e0\u00a4\u00be\u00e0\u00a4\u00a6 !",
    "अध्यक्ष":
        "\u00e0\u00a4\u2026\u00e0\u00a4\u00a7\u00e0\u00a5\u008d\u00e0\u00a4\u00af\u00e0\u00a4\u2022\u00e0\u00a5\u008d\u00e0\u00a4\u00b7",
    "ध्रुव चीटालीय":
        "\u00e0\u00a4\u00a7\u00e0\u00a5\u008d\u00e0\u00a4\u00b0\u00e0\u00a5\u0081\u00e0\u00a4\u00b5 \u00e0\u00a4\u00a1\u00e0\u00a5\u20ac\u00e0\u00a4\u0178\u00e0\u00a4\u00be\u00e0\u00a4\u00b2\u00e0\u00a5\u20ac\u00e0\u00a4\u00af",
    "वसूल करणार":
        "\u00e0\u00a4\u00b5\u00e0\u00a4\u00b8\u00e0\u00a5\u0081\u00e0\u00a4\u00b2 \u00e0\u00a4\u2022\u00e0\u00a4\u00b0\u00e0\u00a4\u00a3\u00e0\u00a4\u00be\u00e0\u00a4\u00b0",
    "वर्ष)":
        "\u00e0\u00a4\u00b5\u00e0\u00a4\u00b0\u00e0\u00a5\u008d\u00e0\u00a4\u00b7)",
    "श्री/श्रीमती)":
        "\u00e0\u00a4\u00b6\u00e0\u00a5\u008d\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac/\u00e0\u00a4\u00b6\u00e0\u00a5\u008d\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac\u00e0\u00a4\u00ae\u00e0\u00a4\u00a4\u00e0\u00a5\u20ac)",
    "अक्षरी रुपये)":
        "\u00e0\u00a4\u2026\u00e0\u00a4\u2022\u00e0\u00a5\u008d\u00e0\u00a4\u00b7\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac \u00e0\u00a4\u00b0\u00e0\u00a5\u0081\u00e0\u00a4\u00aa\u00e0\u00a4\u00af\u00e0\u00a5\u2021)",
};

// Also fix the address line
const badAddr = "\u00e0\u00a4\u00aa\u00e0\u00a4\u0178\u00e0\u00a5\u2021\u00e0\u00a4\u00b2\u00e0\u00a4\u00b5\u00e0\u00a4\u00be\u00e0\u00a4\u00a1\u00e0\u00a5\u20ac, \u00e0\u00a4\u2022\u00e0\u00a5\u008d\u00e0\u00a4\u00b2\u00e0\u00a4\u00be\u00e0\u00a4\u00b8\u00e0\u00a4\u00bf\u00e0\u00a4\u2022 \u00e0\u00a4\u00b9\u00e0\u00a5\u2030\u00e0\u00a4\u0178\u00e0\u00a5\u2021\u00e0\u00a4\u00b2\u00e0\u00a4\u161\u00e0\u00a5\u008d\u00e0\u00a4\u00af\u00e0\u00a4\u00be \u00e0\u00a4\u00ae\u00e0\u00a4\u00be\u00e0\u00a4\u2014\u00e0\u00a5\u2021, \u00e0\u00a4\u009c\u00e0\u00a5\u008d\u00e0\u00a4\u00a8\u00e0\u00a4\u00be \u00e0\u00a4\u00a8\u00e0\u00a4\u00be\u00e0\u00a4\u2014\u00e0\u00a4\u00b0\u00e0\u00a4\u00a6\u00e0\u00a4\u00be\u00e0\u00a4\u00b8 \u00e0\u00a4\u00b0\u00e0\u00a5\u008b\u00e0\u00a4\u00a1, \u00e0\u00a4\u2026\u00e0\u00a4\u0082\u00e0\u00a4\u00a7\u00e0\u00a5\u2021\u00e0\u00a4\u00b0\u00e0\u00a5\u20ac (\u00e0\u00a4\u00aa\u00e0\u00a5\u0082\u00e0\u00a4\u00b0\u00e0\u00a5\u008d\u00e0\u00a4\u00b5), \u00e0\u00a4\u00ae\u00e0\u00a5\u0081\u00e0\u00a4\u0082\u00e0\u00a4\u00ac\u00e0\u00a4\u2088 - \u00e0\u00a5\u00aa\u00e0\u00a5\u00a6\u00e0\u00a5\u00a6\u00e0\u00a5\u00a6\u00e0\u00a5\u00ac\u00e0\u00a5\u00af";
BAD["पटेलवाडी, क्लासिक हॉटेलच्या मागे, जुना नागरदास रोड, अंधेरी (पूर्व), मुंबई - ४०००६९"] = badAddr;

let fixed = 0;
Object.entries(BAD).forEach(([good, bad]) => {
    if (content.includes(bad)) {
        content = content.split(bad).join(good);
        console.log('✅', good);
        fixed++;
    } else {
        // Try the string as-is from the file view
        console.log('⚠  not found for:', good);
    }
});

fs.writeFileSync('admin.html', content, 'utf8');
console.log('\nFixed:', fixed, '/', Object.keys(BAD).length);
