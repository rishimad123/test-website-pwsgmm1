const fs = require('fs');
let d = fs.readFileSync('admin.js', 'utf8');

const FETCH_START = "        // Fetch Donation Analytics for Chart — uses donation-entries grouped by month\r\n        fetch('/api/donation-entries').then(r => r.json()).then(deData => {";
const FETCH_END = "        }).catch(e => console.error('Analytics load error:', e));";

let startIdx = d.indexOf(FETCH_START);
if (startIdx === -1) {
    // try without \r
    startIdx = d.indexOf(FETCH_START.replace(/\r/g, ''));
}
let endIdx = d.indexOf(FETCH_END, startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find fetch block', {startIdx, endIdx});
    process.exit(1);
}
endIdx += FETCH_END.length;

const newFetchBlock = `        // Fetch Donation Analytics for Chart
        fetch('/api/donation-entries').then(r => r.json()).then(deData => {
            window._allDonationEntriesForChart = (deData.entries || []).filter(e => !e.deleted && e.submittedAt && Number(e.amount) > 0);
            renderDonationAnalyticsChart();
        }).catch(e => console.error('Analytics load error:', e));`;

d = d.substring(0, startIdx) + newFetchBlock + d.substring(endIdx);

const renderFunc = `

// ==================== DONATION ANALYTICS CHART RENDERING ====================
window.renderDonationAnalyticsChart = function() {
    const entries = window._allDonationEntriesForChart || [];
    const filterEl = document.getElementById('analyticsGroupingFilter');
    const grouping = filterEl ? filterEl.value : 'month'; // 'day', 'month', 'year'

    if (!entries.length) {
        const ctxCanvas = document.getElementById('yearlyDonationChart');
        if (ctxCanvas) {
            ctxCanvas.parentElement.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px 20px;font-size:.95rem;">No donation data available yet.</div>';
        }
        return;
    }

    const totals = {};
    const order = [];

    entries.forEach(e => {
        const d = new Date(e.submittedAt);
        if (isNaN(d)) return;
        
        let label = '';
        let sortKey = 0;
        
        if (grouping === 'day') {
            label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            sortKey = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
        } else if (grouping === 'month') {
            label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
            sortKey = d.getFullYear() * 100 + d.getMonth();
        } else if (grouping === 'year') {
            label = d.getFullYear().toString();
            sortKey = d.getFullYear();
        }

        if (!totals[label]) {
            totals[label] = { total: 0, sort: sortKey };
            order.push(label);
        }
        totals[label].total += Number(e.amount) || 0;
    });

    order.sort((a, b) => totals[a].sort - totals[b].sort);
    const labels  = order;
    const amounts = order.map(m => totals[m].total);
    const maxAmt  = Math.max(...amounts, 1);

    // If grouping by day and there are too many days, we might want to just show the last 30 days
    // But for now we show all. Chart.js handles large datasets gracefully.

    const ctxCanvas = document.getElementById('yearlyDonationChart');
    if (!ctxCanvas) return;
    const ctx = ctxCanvas.getContext('2d');
    
    // Check if the canvas parent was replaced by the "No donation data" message
    if (ctxCanvas.tagName !== 'CANVAS') {
        // We'd have to recreate the canvas if we destroyed it, but we only show the message if !entries.length,
        // and if there are entries we never destroy the canvas.
    }

    if (window._donationChartInst) window._donationChartInst.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(46, 125, 50, 0.85)');
    gradient.addColorStop(1, 'rgba(46, 125, 50, 0.10)');

    window._donationChartInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Total Donations (₹)',
                data: amounts,
                backgroundColor: gradient,
                borderColor: '#2E7D32',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                hoverBackgroundColor: '#1B5E20'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,30,30,0.92)',
                    titleFont: { size: 13, family: "'Inter', sans-serif", weight: '600' },
                    bodyFont:  { size: 15, family: "'Inter', sans-serif", weight: '700' },
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        title: ctx => ctx[0].label,
                        label: ctx => '₹ ' + ctx.parsed.y.toLocaleString('en-IN')
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: maxAmt * 1.15,
                    grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                    ticks: {
                        color: '#666',
                        font: { size: 12, family: "'Inter', sans-serif" },
                        callback: v => {
                            if (v >= 10000000) return '₹' + (v/10000000).toFixed(1) + 'Cr';
                            if (v >= 100000)   return '₹' + (v/100000).toFixed(1) + 'L';
                            if (v >= 1000)     return '₹' + (v/1000).toFixed(0) + 'K';
                            return '₹' + v;
                        }
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        color: '#444',
                        font: { size: 12, weight: '600', family: "'Inter', sans-serif" },
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });
};
`;

if (!d.includes('window.renderDonationAnalyticsChart')) {
    d += renderFunc;
}

fs.writeFileSync('admin.js', d, 'utf8');
console.log('✅ admin.js updated successfully!');
