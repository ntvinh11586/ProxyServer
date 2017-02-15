// "use strict"
let http = require('http')
let request = require('request')
let url = require('url')
let path = require('path')
let fs = require('fs')
let map = require('through2-map')
let argv = require('yargs').argv

let logPath = argv.log && path.join(__dirname, argv.log)
let logStream = logPath ? fs.createWriteStream(logPath) : process.stdout

let localhost = '127.0.0.1'
let scheme = 'http://'
let host = argv.host || localhost
let port = argv.port || (host === localhost ? 8000 : 80)
let destinationUrl = scheme + host + ':' + port

http.createServer((req, res) => {
  console.log(`Request received at: ${req.url}`)
  console.log(req.headers)
  for (let header in req.headers) {
    res.setHeader(header, req.headers[header])
  }
  req.pipe(res)
}).listen(8000)

http.createServer((req, res) => {
  console.log(`Proxying request to: ${destinationUrl + req.url}`)

  let url = destinationUrl
  if (req.headers['x-destination-url']) {
    let url = scheme + req.headers['x-destination-url']
  }

  let options = {
    headers: req.headers,
    // Use the same HTTP verb
    method: req.method,
    url: url + req.url
  }
  console.log(options)

  // In your server's request handler, log the incoming request headers
  logStream.write('req.headers ' + JSON.stringify(req.headers) + '\n')
  // req.pipe(logStream)  // async pipe() function

  // Log the proxy request headers and content in the **server callback**
  let outboundResponse = request(options)
  req.pipe(outboundResponse)

  logStream.write('\n' + 'outboundResponse.headers ' + JSON.stringify(outboundResponse.headers) + '\n')
  // outboundResponse.pipe(logStream) // async pipe() function
  outboundResponse.pipe(res)
  // old: req.pipe(request(options)).pipe(res)
}).listen(8001)