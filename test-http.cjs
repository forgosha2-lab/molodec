const http = require('http');

console.log('Testing HTTP connection to localhost:3003...');

const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/api/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    console.log(`Body: ${chunk}`);
  });
  
  res.on('end', () => {
    console.log('Request completed');
  });
});

req.on('error', (error) => {
  console.error(`Problem with request: ${error.message}`);
});

req.end();