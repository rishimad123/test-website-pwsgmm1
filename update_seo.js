const fs = require("fs");
const path = require("path");

const publicPages = {
    "index.html": { title: "Shree Patelwadi Sarvjanik Ganesh Utsav Mandal - Home", desc: "Welcome to Shree Patelwadi Sarvjanik Ganesh Utsav Mandal. Join us in our cultural and social activities.", keywords: "Ganesh Utsav, Mandal, Shree Patelwadi, Festival, Cultural Activities" },
    "about.html": { title: "About Us - Shree Patelwadi Sarvjanik Ganesh Utsav Mandal", desc: "Learn more about the history, mission, and activities of Shree Patelwadi Sarvjanik Ganesh Utsav Mandal.", keywords: "About Us, History, Mission, Ganesh Utsav Mandal" },
    "committee.html": { title: "Our Committee - Shree Patelwadi Sarvjanik Ganesh Utsav Mandal", desc: "Meet the dedicated committee members of Shree Patelwadi Sarvjanik Ganesh Utsav Mandal.", keywords: "Committee, Members, Leadership, Ganesh Utsav" },
    "volunteers.html": { title: "Volunteers - Shree Patelwadi Sarvjanik Ganesh Utsav Mandal", desc: "Our volunteers are the backbone of the Mandal. See our volunteer team.", keywords: "Volunteers, Team, Social Service, Ganesh Utsav" },
    "tshirt.html": { title: "T-Shirts - Shree Patelwadi Sarvjanik Ganesh Utsav Mandal", desc: "Order official T-shirts for the Shree Patelwadi Sarvjanik Ganesh Utsav Mandal events.", keywords: "T-Shirts, Merchandise, Official Apparel" },
    "gallery.html": { title: "Gallery - Shree Patelwadi Sarvjanik Ganesh Utsav Mandal", desc: "View the photo gallery of past events and celebrations by the Mandal.", keywords: "Gallery, Photos, Events, Celebrations" },
    "developers.html": { title: "Developers - Shree Patelwadi Sarvjanik Ganesh Utsav Mandal", desc: "Meet the developers behind the Shree Patelwadi Sarvjanik Ganesh Utsav Mandal website.", keywords: "Developers, Website Team" }
};

const privatePages = ["admin.html", "dashboard.html", "login.html"];

function injectMetaTags(filename, metaHtml) {
    if (!fs.existsSync(filename)) return;
    let content = fs.readFileSync(filename, "utf8");
    
    // Remove existing meta/title tags to avoid duplication
    content = content.replace(/<title>.*?<\/title>/gi, "");
    content = content.replace(/<meta\s+name=["'](description|keywords|robots)["'][^>]*>/gi, "");

    if (content.includes("</head>")) {
        content = content.replace("</head>", `${metaHtml}\n</head>`);
        fs.writeFileSync(filename, content);
        console.log(`Updated ${filename}`);
    } else {
        console.log(`Could not find </head> in ${filename}`);
    }
}

for (const [file, seo] of Object.entries(publicPages)) {
    const metaHtml = `    <title>${seo.title}</title>\n    <meta name="description" content="${seo.desc}">\n    <meta name="keywords" content="${seo.keywords}">`;
    injectMetaTags(file, metaHtml);
}

for (const file of privatePages) {
    const metaHtml = `    <title>Private Area</title>\n    <meta name="robots" content="noindex, nofollow">`;
    injectMetaTags(file, metaHtml);
}

// Generate sitemap.xml
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(publicPages).map(page => `  <url>\n    <loc>https://patelwadichasukhakarta.com/${page}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${page === 'index.html' ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n')}
</urlset>`;
fs.writeFileSync("sitemap.xml", sitemapXml);
console.log("Created sitemap.xml");

// Generate robots.txt
const robotsTxt = `User-agent: *
Disallow: /admin.html
Disallow: /dashboard.html
Disallow: /login.html
Disallow: /api/

Sitemap: https://patelwadichasukhakarta.com/sitemap.xml`;
fs.writeFileSync("robots.txt", robotsTxt);
console.log("Created robots.txt");

// Generate google site verification
fs.writeFileSync("google9670c95740b5c57f.html", "google-site-verification: google9670c95740b5c57f.html");
console.log("Created google9670c95740b5c57f.html");
