const fs = require('fs');

const bad1 = 'ðŸ“…';
const bad2 = 'â­ ';

function test(bad) {
    const buf = Buffer.from(bad, 'binary'); // or 'latin1'
    console.log(bad, '->', buf.toString('utf8'));
}

test(bad1);
test(bad2);
test('â‚¹');
test('â”€');
