// "use strict"
let https = require('https')
let http = require('http')
let request = require('request')
let url = require('url')
let path = require('path')
let fs = require('fs')
let map = require('through2-map')
let argv = require('yargs')
    .usage('Usage: $0 [options]')

    .alias('p', 'port')
    .nargs('p', 1)
    .describe('p', 'Specify a forwarding port')

    .alias('x', 'host')
    .nargs('x', 1)
    .describe('x', 'Specify a forwarding host')

    .alias('e', 'exec')
    .describe('e', 'Specify a process to proxy instead')

    .alias('l', 'log')
    .nargs('l', 1)
    .describe('l', 'Specify a output log file')

    .help('h')
    .alias('h', 'help')
    .describe('h', 'Show help')

    .epilog('copyright 2017')
    .argv

let exec = require('child_process').exec

let logPath = argv.logfile && path.join(__dirname, argv.logfile)
let logStream = logPath ? fs.createWriteStream(logPath) : process.stdout

let localhost = '127.0.0.1'
let scheme = 'https://'
let host = argv.host || localhost
let port = argv.port || (host === localhost ? 8000 : 80)
let destinationUrl = scheme + host + ':' + port

let options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

// Read more: http://stackoverflow.com/a/21961005/5557789
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function executeCLI() {
  let execCommand = argv.exec
  if (execCommand) {
  	execCommand = `${argv.exec} ${argv._.join(' ')}`
  	exec(execCommand, (err, stdout) => {
  		if (err) {
  			console.log ('Oops! Something went wrong!')
  			return
  		}
  		console.log(stdout)
  	})
  }
}

https.createServer(options, (req, res) => {
  console.log(`Request received at: ${req.url}`)
  console.log(req.headers)
  for (let header in req.headers) {
    res.setHeader(header, req.headers[header])
  }
  req.pipe(res)
}).listen(8000)

https.createServer(options, (req, res) => {
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
  req.pipe(logStream, { end: false })  // async pipe() function

  // Log the proxy request headers and content in the **server callback**
  let outboundResponse = request(options)
  req.pipe(outboundResponse)

  logStream.write('\n' + 'outboundResponse.headers ' + JSON.stringify(outboundResponse.headers) + '\n')
  outboundResponse.pipe(logStream, { end: false }) // async pipe() function
  outboundResponse.pipe(res)
  // old: req.pipe(request(options)).pipe(res)
}).listen(8001)

executeCLI()
