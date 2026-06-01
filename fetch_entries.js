const http = require('http');

http.get('http://localhost:3000/api/receipts', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const json = JSON.parse(data);
        console.log('Receipts length:', json.receipts ? json.receipts.length : 'no receipts property');
        if (json.receipts && json.receipts.length > 0) {
            const latest = json.receipts.slice(-5);
            latest.forEach(e => {
                console.log(`Receipt: ${e.firstName || ''} ${e.businessName || ''} | Area: ${e.area} | SubArea: ${e.subArea} | Landmark: ${e.landmark} | Building: ${e.buildingName}`);
            });
        }
    });
});
