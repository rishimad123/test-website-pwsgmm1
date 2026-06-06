const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', req => console.log('FAILED:', req.url(), req.failure()?.errorText));
    page.on('response', resp => {
        if (resp.status() >= 400) {
            console.log(`HTTP ${resp.status()}: ${resp.url()}`);
        }
    });

    console.log('Loading dashboard.html...');
    await page.goto('http://localhost:3000/dashboard.html', { waitUntil: 'networkidle2', timeout: 10000 });
    
    const fns = await page.evaluate(() => {
        return {
            showSection: typeof showSection,
            donationEntry: document.getElementById('donationEntry') ? document.getElementById('donationEntry').style.display : 'NOT FOUND',
            currentUser: typeof currentUser
        };
    });
    console.log('State after load:', JSON.stringify(fns));
    
    await browser.close();
})().catch(e => console.error('Script error:', e.message));
