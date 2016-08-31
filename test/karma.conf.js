module.exports = function (config) {
  var
    options,
    browser   = process.env.KARMA_BROWSER,
    reporters = [];

  options = {
    'reporters'       : reporters,
    'basePath'        : '../',
    'frameworks'      : ['jasmine'],
    'colors'          : true,
    'logLevel'        : config.LOG_WARN, // config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    'autoWatch'       : false,
    'captureTimeout'  : 6000,
    'reportSlowerThan': 500,

    'files': [
      'node_modules/phantomjs-polyfill/bind-polyfill.js',
      'src/img.js',
      'src/main.js',
      'test/main.spec.js'
    ],

    'mochaReporter': {
      'ignoreSkipped': true
    },

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    // - PhantomJS
    // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
    //
    // You can run the tests in chrome by installing
    // 'npm install -g karma-chrome-launcher'
    // and by setting singleRun (see below) to false.
    //
    // Then, when executing runTest.sh a chrome/chromium will be launched,
    // click on debug, open a developer console and refresh a page.
    // After that you should land in debug mode, in the context of the
    // specific jasmine spec.
    'browsers': [
      browser || 'PhantomJS'
      // 'Chrome' // READ ABOVE PLS ^^^
    ],

    // Use this if you want to run the specs in a browser w/ UI.
    // Specs will be executed on every reload.
    // 'singleRun': false
    'singleRun': true
  };

  reporters.push('mocha');

  config.set(options);
};
