const fs = require('fs');

const funcHtml = `
// ==================== DONATION TRACKING LIVE CARDS ====================
async function loadDonationTrackingCards() {
    try {
        const res = await fetch('/api/donation-entries');
        const data = await res.json();
        const allSlips = data.entries || [];

        const withAmt = allSlips.filter(s => s.status === 'Received');
        const withoutAmt = allSlips.filter(s => s.status !== 'Received' && (s.status === 'Balance' || s.paymentMode === 'Balance'));

        const totalRec = withAmt.reduce((sum, s) => sum + Number(s.amount || 0), 0);
        const totalPend = withoutAmt.reduce((sum, s) => sum + Number(s.amount || 0), 0);

        const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
        const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

        setEl('dtTotalReceived', fmt(totalRec));
        setEl('dtReceivedCount', \`\${withAmt.length} slip\${withAmt.length !== 1 ? 's' : ''} received\`);
        setEl('dtTotalPending',  fmt(totalPend));
        setEl('dtPendingCount',  \`\${withoutAmt.length} slip\${withoutAmt.length !== 1 ? 's' : ''} pending\`);
        setEl('dtTotalSlips',    \`\${allSlips.length} / 2500\`);

        if (allSlips.length > 0) {
            const receipts = allSlips.map(s => Number(s.receiptNumber)).filter(n => !isNaN(n));
            if (receipts.length > 0) {
                const min = Math.min(...receipts);
                const max = Math.max(...receipts);
                setEl('dtSlipRange', \`Receipt #\${min} – #\${max}\`);
            } else {
                setEl('dtSlipRange', '');
            }
        } else {
            setEl('dtSlipRange', '');
        }
    } catch (e) {
        console.warn('Could not load donation tracking cards:', e.message);
    }
}

// Stub out navToBalanceRecovery for volunteer dashboard
function navToBalanceRecovery(type) {
    console.log('Balance recovery view not available in volunteer panel.');
}
`;

let dash = fs.readFileSync('dashboard.html', 'utf8');
if (!dash.includes('async function loadDonationTrackingCards')) {
    dash = dash.replace('</body>', '<script>' + funcHtml + '</script>\n</body>');
    fs.writeFileSync('dashboard.html', dash, 'utf8');
    console.log('Injected JS functions into dashboard.html');
}
