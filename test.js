const fs = require('fs');
let js = fs.readFileSync('tshirts.js', 'utf8');

const prefix = 
  const document = {
    getElementById: (id) => {
      if (id === 'adminName') return {}; 
      if (id === 'topBarName') return {}; 
      if (id === 'tshirtSection') return { set innerHTML(val) { console.log('innerHTML length:', val.length); } };
      return null;
    }
  };
  const window = { location: { pathname: '/admin.html' } };
  const fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
;

fs.writeFileSync('temp_tshirt.js', prefix + js);
