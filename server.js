#!/usr/bin/env node

var
  // Require necessary npm modules.
  path          = require('path'),
  chalk         = require('chalk'),
  http          = require('http'),
  nodeStatic    = require('node-static'),

  // Require local modules.
  // pkgConfig     = require('./package.json'),

  // Chalks for logging.
  title         = chalk.bgBlack.white,
  important     = chalk.bgGreen.white,
  comment       = chalk.blue,
  error         = chalk.red,
  processEnv    = process.env,

  // Pretty date stamp.
  date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),

  port,
  nodeEnv,
  mainServer,
  staticServer,
  staticServerTarget,
  staticServerHandler;

console.log(title('====== server-bootstrap start:', date, 'UTC ======'));

// If there is no env, then use development.
if (!processEnv.NODE_ENV) {
  processEnv.NODE_ENV = 'development';
}

nodeEnv = processEnv.NODE_ENV;

mainServer  = http.createServer();

// Create a server for static files.
staticServerTarget  = path.join(__dirname, nodeEnv === 'development' ? 'src' : 'build');
staticServer        = new nodeStatic.Server(staticServerTarget);
staticServerHandler = function staticServerHandler(req,  res) { console.log('=== Request =====>', req.url); staticServer.serve(req, res); };

mainServer.addListener('request', staticServerHandler);

console.log(comment('=== NodeStatic ==>'), important(staticServerTarget));

port = '3000';

mainServer.on('listening', function () {
  console.log(comment('=== Server ======>'), important('listening on', port));
});

mainServer.on('error',function (e) {
  console.error(error('=== Server ======>'), important(e));
});

mainServer.listen(port, '0.0.0.0');

console.log(comment('=== Server ======>'), important('started on', port));
