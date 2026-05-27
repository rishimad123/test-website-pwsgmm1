const fs = require('fs');
['admin.html', 'dashboard.html'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const target = "const evtSource = new EventSource('/api/live-updates');";
    if (content.includes(target) && !content.includes('loadDonationTrackingCards(); // Initial fetch')) {
        content = content.replace(target, "if (typeof loadDonationTrackingCards === 'function') loadDonationTrackingCards(); // Initial fetch\n            " + target);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Added initial fetch to ' + file);
    }
});
