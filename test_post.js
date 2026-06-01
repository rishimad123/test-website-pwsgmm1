const http = require('http');

const data = JSON.stringify({
    bookNumber: 1,
    receiptNumber: 50,
    donorType: 'Individual',
    firstName: 'Test',
    middleName: 'M',
    lastName: 'SubArea',
    area: 'Andheri',
    subArea: 'East',
    amount: 500,
    paymentMode: 'Cash'
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/donation-entries',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let d = '';
    res.on('data', chunk => { d += chunk; });
    res.on('end', () => {
        console.log('Response:', d);
    });
});

req.write(data);
req.end();
