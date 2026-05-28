const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

// 1. Add navbar link
const navLink = '<li><a href="#tshirtSection">T-shirts</a></li>';
if (!content.includes('href="#tshirtSection"')) {
    content = content.replace(
        '<li><a href="gallery.html">Gallery</a></li>',
        navLink + '\n                    <li><a href="gallery.html">Gallery</a></li>'
    );
}

// 2. Add section container
const sectionContainer = `
    <!-- T-shirts Section -->
    <section id="tshirtSection" class="container" style="margin: 60px auto; padding: 0 15px;"></section>
`;
if (!content.includes('id="tshirtSection"')) {
    content = content.replace(
        '    <!-- Gallery Preview -->',
        sectionContainer + '\n    <!-- Gallery Preview -->'
    );
}

// 3. Add script tag
if (!content.includes('tshirts.js')) {
    content = content.replace(
        '    <script src="main.js"></script>',
        '    <script src="tshirts.js"></script>\n    <script src="main.js"></script>'
    );
}

fs.writeFileSync('index.html', content, 'utf8');
console.log('index.html patched successfully.');
