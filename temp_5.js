document.addEventListener('DOMContentLoaded', () => {
            if (typeof loadDonationTrackingCards === 'function') loadDonationTrackingCards(); // Initial fetch
            const evtSource = new EventSource('/api/live-updates');
            evtSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'donations_updated') {
                        if (typeof loadDonationTrackingCards === 'function') {
                            loadDonationTrackingCards();
                        }
                        
                        if (typeof adeFetchData === 'function' && document.getElementById('donationDataEntry') && document.getElementById('donationDataEntry').style.display !== 'none') {
                            adeFetchData();
                        }
                        
                    }
                } catch (e) {
                    console.error('SSE Error:', e);
                }
            };
            evtSource.onerror = function() {
                console.log('SSE connection lost, reconnecting...');
            };
        });