const fs = require('fs');

function addSseClient(filePath, isDashboard) {
    let content = fs.readFileSync(filePath, 'utf8');

    const sseCode = `
    <!-- Live Updates (SSE) -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const evtSource = new EventSource('/api/live-updates');
            evtSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'donations_updated') {
                        if (typeof loadDonationTrackingCards === 'function') {
                            loadDonationTrackingCards();
                        }
                        ${!isDashboard ? `
                        if (typeof adeFetchData === 'function' && document.getElementById('donationDataEntry') && document.getElementById('donationDataEntry').style.display !== 'none') {
                            adeFetchData();
                        }` : ''}
                        ${isDashboard ? `
                        // Refresh volunteer data if function exists
                        if (typeof loadRecentEntries === 'function') loadRecentEntries();
                        ` : ''}
                    }
                } catch (e) {
                    console.error('SSE Error:', e);
                }
            };
            evtSource.onerror = function() {
                console.log('SSE connection lost, reconnecting...');
            };
        });
    </script>
</body>`;

    if (!content.includes('new EventSource(\'/api/live-updates\')')) {
        content = content.replace('</body>', sseCode);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Injected SSE into ' + filePath);
    } else {
        console.log('SSE already in ' + filePath);
    }
}

addSseClient('admin.html', false);
addSseClient('dashboard.html', true);
