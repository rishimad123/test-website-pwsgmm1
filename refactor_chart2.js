const fs = require('fs');
let d = fs.readFileSync('admin.js', 'utf8');

const FETCH_START = "        // Fetch Donation Analytics for Chart\r\n        fetch('/api/donation-entries')";
const FETCH_END   = "        }).catch(e => console.error('Analytics load error:', e));";

let startIdx = d.indexOf(FETCH_START);
if (startIdx === -1) startIdx = d.indexOf(FETCH_START.replace(/\r/g, ''));
let endIdx = d.indexOf(FETCH_END, startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.error('Fetch block not found!', {startIdx, endIdx});
    process.exit(1);
}
endIdx += FETCH_END.length;

const RENDER_START = "// ==================== DONATION ANALYTICS CHART RENDERING ====================";
const rStart = d.indexOf(RENDER_START);

if (rStart === -1) {
    console.error('Render func not found!');
    process.exit(1);
}

const beforeFetch = d.substring(0, startIdx);
const between = d.substring(endIdx, rStart);

const newLogic = `        // Fetch Donation and Expense Analytics for Chart
        Promise.all([
            fetch('/api/donation-entries').then(r => r.json()),
            fetch('/api/expenses').then(r => r.json())
        ]).then(([deData, expData]) => {
            window._allDonationEntriesForChart = (deData.entries || []).filter(e => !e.deleted && e.submittedAt && Number(e.amount) > 0);
            window._allExpensesForChart = (expData.expenses || []).filter(e => !e.deleted && e.date && Number(e.amount) > 0);
            renderDonationAnalyticsChart();
        }).catch(e => console.error('Analytics load error:', e));`;

const newRender = `// ==================== DONATION ANALYTICS CHART RENDERING ====================
window.renderDonationAnalyticsChart = function() {
    const dEntries = window._allDonationEntriesForChart || [];
    const eEntries = window._allExpensesForChart || [];
    const filterEl = document.getElementById('analyticsGroupingFilter');
    const grouping = filterEl ? filterEl.value : 'month'; // 'day', 'month', 'year'

    if (!dEntries.length && !eEntries.length) {
        const ctxCanvas = document.getElementById('yearlyDonationChart');
        if (ctxCanvas && ctxCanvas.parentElement) {
            ctxCanvas.parentElement.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px 20px;font-size:.95rem;">No data available yet.</div>';
        }
        return;
    }

    const totals = {};
    const order = [];

    // Helper to process entries
    const processEntries = (entries, type, dateField) => {
        entries.forEach(e => {
            const d = new Date(e[dateField]);
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
                totals[label] = { donTotal: 0, expTotal: 0, sort: sortKey };
                order.push(label);
            }
            if (type === 'don') totals[label].donTotal += Number(e.amount) || 0;
            if (type === 'exp') totals[label].expTotal += Number(e.amount) || 0;
        });
    };

    processEntries(dEntries, 'don', 'submittedAt');
    processEntries(eEntries, 'exp', 'date');

    order.sort((a, b) => totals[a].sort - totals[b].sort);
    const labels  = order;
    const donAmounts = order.map(m => totals[m].donTotal);
    const expAmounts = order.map(m => totals[m].expTotal);
    const maxAmt  = Math.max(...donAmounts, ...expAmounts, 1);

    const ctxCanvas = document.getElementById('yearlyDonationChart');
    if (!ctxCanvas) return;
    const ctx = ctxCanvas.getContext('2d');
    
    if (window._donationChartInst) window._donationChartInst.destroy();

    const donGradient = ctx.createLinearGradient(0, 0, 0, 300);
    donGradient.addColorStop(0, 'rgba(46, 125, 50, 0.85)'); // Green
    donGradient.addColorStop(1, 'rgba(46, 125, 50, 0.10)');

    const expGradient = ctx.createLinearGradient(0, 0, 0, 300);
    expGradient.addColorStop(0, 'rgba(230, 81, 0, 0.85)'); // Orange
    expGradient.addColorStop(1, 'rgba(230, 81, 0, 0.10)');

    // Custom plugin to draw values on top of bars
    const drawValuesPlugin = {
        id: 'drawValues',
        afterDatasetsDraw(chart, args, options) {
            const { ctx } = chart;
            ctx.save();
            ctx.font = "bold 12px 'Inter', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (meta.hidden) return;
                
                ctx.fillStyle = dataset.borderColor; // Use the border color for the text
                meta.data.forEach((bar, index) => {
                    const data = dataset.data[index];
                    if (data > 0) {
                        let text = '₹' + (data >= 100000 ? (data/100000).toFixed(1)+'L' : (data >= 1000 ? (data/1000).toFixed(1)+'K' : data));
                        ctx.fillText(text, bar.x, bar.y - 5);
                    }
                });
            });
            ctx.restore();
        }
    };

    window._donationChartInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Donations (₹)',
                    data: donAmounts,
                    backgroundColor: donGradient,
                    borderColor: '#2E7D32',
                    borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
                    borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                    borderSkipped: false,
                    hoverBackgroundColor: 'rgba(46, 125, 50, 0.9)',
                    hoverBorderColor: '#1B5E20',
                    maxBarThickness: 50,
                    minBarLength: 6
                },
                {
                    label: 'Expenses (₹)',
                    data: expAmounts,
                    backgroundColor: expGradient,
                    borderColor: '#E65100',
                    borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
                    borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                    borderSkipped: false,
                    hoverBackgroundColor: 'rgba(230, 81, 0, 0.9)',
                    hoverBorderColor: '#BF360C',
                    maxBarThickness: 50,
                    minBarLength: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 25 } // Make room for the labels
            },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'top',
                    align: 'end',
                    labels: { font: { family: "'Inter', sans-serif", size: 13, weight: '600' }, usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    backgroundColor: 'rgba(30,30,30,0.92)',
                    titleFont: { size: 13, family: "'Inter', sans-serif", weight: '600' },
                    bodyFont:  { size: 15, family: "'Inter', sans-serif", weight: '700' },
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,
                    callbacks: {
                        title: ctx => ctx[0].label,
                        label: ctx => ctx.dataset.label.replace('(₹)','') + ': ₹ ' + ctx.parsed.y.toLocaleString('en-IN')
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: maxAmt * 1.20,
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
        },
        plugins: [drawValuesPlugin]
    });
};
`;

const newD = beforeFetch + newLogic + between + newRender;

fs.writeFileSync('admin.js', newD, 'utf8');
console.log('✅ Updated admin.js with expenses and datalabels!');
