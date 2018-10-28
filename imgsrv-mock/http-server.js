#!/root/.nvm/versions/node/v8.12.0/bin/node

// simple echo server from
// https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/
const http = require('http');

let server = http.createServer((request, response) => {
  const { headers, method, url } = request;
  let body = [];
  request.on('error', (err) => {
    console.error(err);
  }).on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    
    response.on('error', (err) => {
      console.error(err);
    });

    response.writeHead(200, {'Content-Type': 'application/json'})

    const responseBody = { headers, method, url, body };
    response.end(JSON.stringify(responseBody))
  });
}).listen(80); 
