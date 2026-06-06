const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:3000/dashboard.html');
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
        window.currentUser = { name: 'Test', role: 'volunteer' };
        if (typeof showSection === 'function') {
            try {
                showSection('donationEntry');
                console.log('Called showSection("donationEntry")');
            } catch(e) {
                console.log("showSection error:", e);
            }
        } else {
            console.log("showSection is not a function");
        }
    });

    await new Promise(r => setTimeout(r, 1000));
    
    const display = await page.evaluate(() => {
        const el = document.getElementById('donationEntry');
        return el ? el.style.display : 'Not Found';
    });
    console.log('Donation Entry Display:', display);
    
    await browser.close();
})();
