const dns = require('dns');

dns.lookup('smtp.gmail.com', { family: 4, all: true }, (err, addresses) => {
    console.log('IPv4 Addresses:', addresses);
});

dns.lookup('smtp.gmail.com', { family: 6, all: true }, (err, addresses) => {
    console.log('IPv6 Addresses:', addresses);
});
