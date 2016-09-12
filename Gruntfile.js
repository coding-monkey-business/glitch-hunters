var
  grunt,

  fs        = require('fs'),
  path      = require('path'),
  chalk     = require('chalk'),
  filesize  = require('filesize'),

  ALL_JS = ['*.js', 'src/**/*.js', 'test/**/*.js' ,'!src/jsfxr.js'],

  TASK_CONFIG = {
    'mkdir' : {
      'dist': {
        'options': {
          'mode'    : 0755,
          'create'  : ['dist']
        }
      }
    },

    'clean' : {
      'build' : 'build/**/*',
      'dist'  : 'dist/**/*'
    },

    'pngmin' : {
      'compile' : {
        'options' : {
          'ext' : '.png'
        },

        'files' : [
          {
            'expand': true,
            'src'   : ['**/*.png'],
            'cwd'   : 'img',
            'dest'  : 'build'
          }
        ]
      }
    },

    'replace' : {
      'html': {
        'options': {
          'patterns': [{
            'match'       : /<script[^]*<\/script>/,
            'replacement' : '<script src="all.js" type="text/javascript"></script>'
          }]
        },

        'files': [{
          'src'   : ['src/index.html'],
          'dest'  : 'build/index.html'
        }]
      },

      'js': {
        'options': {
          'patterns': [{
            'match'       : /\/\/\ GRUNT\ WILL\ REMOVE[^]*/,
            'replacement' : ''
          }]
        },

        'files': [{
          'src'   : ['src/main.js'],
          'dest'  : 'build/main.js'
        }]
      }
    },

    'copy' : {
      'img' : {
        'expand'  : true,
        'cwd'     : 'src',
        'src'     : ['img.js', 'vec.js', 'a-star.js', 'jsfxr.js'],
        'dest'    : 'build/'
      }
    },

    'uglify': {
      'options' : {
        'enclose' : {},
        'mangle' : {
          'toplevel' : true
        },
        'compress': {
          'global_defs': {
            'DEBUG' : false
          },
          'dead_code' : true
        }
      },

      'build': {
        'files': {
          'build/all.js'  : ['build/img.js', 'build/vec.js', 'build/a-star.js', 'build/jsfxr.js', 'build/main.js']
        }
      }
    },

    'cssmin' : {
      'options': {
        'shorthandCompacting': false,
        'roundingPrecision': -1
      },

      'build': {
        'files': [
          {
            'src'   : 'src/main.css',
            'dest'  : 'build/main.css'
          }
        ]
      }
    },

    'htmlmin' : {
      'build': {
        'options': {
          'removeComments'      : true,
          'collapseWhitespace'  : true
        },

        'files': [
          {
            'expand'  : true,
            'cwd'     : 'build',
            'src'     : ['*.html'],
            'dest'    : 'build'
          }
        ]
      }
    },

    'jscs' : {
      'options' : {/* moved to .jscsrc */},
      'default' : ALL_JS
    },

    'jshint' : {
      'options': {
        'globals'     : {
          'describe'  : true,
          'fdescribe' : true,
          'xdescribe' : true,
          'beforeEach': true,
          'it'        : true,
          'fit'       : true,
          'xit'       : true,
          'expect'    : true,
          'jasmine'   : true,
          'window'    : true,
          'Audio'     : true,
          'document'  : true
        },
        'curly'       : true,
        'eqeqeq'      : true,
        'eqnull'      : true,
        'latedef'     : true,
        'newcap'      : true,
        'node'        : true,
        'nonew'       : true,
        'nonbsp'      : true,
        'quotmark'    : 'single',
        'undef'       : true,
        'debug'       : true,
        'elision'     : true,
        'indent'      : 2
      },

      'default' : ALL_JS,

      'unused' : {
        'options' : {
          'noempty' : true,
          'unused'  : true
        },

        'files' : {
          'default' : ALL_JS
        }
      },

      'strict' : {
        'options' : {
          'noempty' : true,
          'unused'  : 'strict'
        },

        'files' : {
          'default' : ALL_JS
        }
      }
    },

    'karma' : {
      'unit' : {
        'configFile' : 'test/karma.conf.js'
      }
    },

    'compress' : {
      'main' : {
        'options' : {
          'mode'    : 'zip',
          'archive' : 'dist/index.html.zip'
        },

        'files': [
          {
            'expand'  : true,
            'cwd'     : 'build',
            'src'     : ['index.html']
          }
        ]
      }
    },

    'watch' : {
      'dev' : {
        'files' : ['src/**/*', 'test/**/*'],
        'tasks' : ['build:dev']
      }
    },

    'inline': {
      'dist': {
        'options': {
          'tag': ''
        },
        'src' : 'build/index.html',
        'dest': 'build/index.html'
      }
    },

    'zopfli': {
      'inlined': {
        'options': {
          'format': 'gzip'
        },
        'files': {
          'dist/index.html.gz': 'build/index.html' // unfortunately this cannot create zip files
        }
        // 'path': '' // Optional full path to `zopfli` binary; defaults to `zopfli` in `$PATH`
      }
    },

    'exec': {
      'advzip': 'advzip -a dist/index.html.zip build/index.html -4 -i 100', // requires 'AdvanceCOMP' from http://www.advancemame.it/download, also available as AUR package
      'zopflipng': require('zopflipng-bin') + ' --lossy_transparent -m -y --prefix=""' + path.resolve('build/*.png')
    }
  },

  TASKS = {
    'test' : [
      'jshint:unused',
      'jscs',
      'karma'
    ],

    'test:dev' : [
      'karma'
    ],

    'build:dev' : [
      'test:dev'
    ],

    'dev' : [
      'watch:dev'
    ],

    'asset' : [
      'clean',
      'pngmin',
      'exec:zopflipng',
      'asset:stringify'
    ],

    'compile:js' : [
      'replace:js',
      'copy'
    ],

    'minify:js' : [
      'uglify',
      'cssmin'
    ],

    'compile:html' : [
      'replace:html',
      'inline'
    ],

    'minify:html' : [
      'htmlmin'
    ],

    'build' : [
      'clean',
      'mkdir',
      'compile:js',
      'minify:js',
      'compile:html',
      'minify:html'
    ],

    'info' : [
      'report:size'
    ],

    'build:compress' : [
      'build',
      'compress',
      'info'
    ],

    'build:zopfli' : [
      'build',
      'zopfli',
      'info'
    ],

    'build:advzip' : [
      'build',
      'exec:advzip',
      'info'
    ],

    'default' : [
      'test',
      'build:compress'
    ]
  },

  reportSize = function reportSize() {
    var
      MAX_SIZE = 13312,
      dirPath = 'dist',
      list    = fs.readdirSync(dirPath),
      len     = list.length,
      stat,
      size,
      filename;

    while (len--) {
      filename  = path.join(dirPath, list[len]);
      stat      = fs.statSync(filename);
      size      = stat.size;

      if (size > MAX_SIZE) {
        grunt.fail.fatal('Final zipped size is above 13,312 bytes!');
      }

      grunt.log.writeln(chalk.green('# ' + filename + ' <=== ' + filesize(size) + ' (' + filesize(size, {'exponent': 0}) + ')'));
    }
  },

  base64Encode = function base64Encode(filepath) {
    var
      img = fs.readFileSync(filepath);

    return new Buffer(img).toString('base64');
  },

  format = function format(string) {
    return '  ' + string + '\n';
  },

  assetStringify = function assetStringify() {
    var
      i,
      result      = '// Generated file (grunt asset), no point of modifying it by hand.\n\nwindow.img = [\n',
      buildPath   = 'build',
      targetPath  = path.join('src', 'img.js'),
      list        = fs.readdirSync(buildPath),
      len,
      suffix,
      filename,
      filepath;


    list = list.filter(function (filename) {
      return filename.indexOf('png') !== -1;
    });


    // if exec:zopflipng has been run before:
    if (list.some(function (filename) {
      return filename.indexOf('zopfli_') >= 0;
    })) {
      list = list.filter(function (filename) {
        return filename.indexOf('zopfli_') === 0;
      });
    }

    // Alphabetical sort them files.
    list.sort();

    len = list.length;

    for (i = 0; i < len; i++) {
      filename  = list[i];
      filepath  = path.join(buildPath, filename);

      grunt.log.writeln(chalk.green('# stringifying: ' + filepath));

      suffix  = '\'' + (i < len - 1 ? ',\n' : '');
      result += format('// imgs[' + i + '] - ' + filename);
      result += format('\'data:image/png;base64,' + base64Encode(filepath) + suffix);
    }

    result += '];\n';

    fs.writeFileSync(targetPath, result);
  },

  runGrunt = function runGrunt(gruntObj) {
    grunt = gruntObj;

    var
      registerTask = function registerTask(taskName, task) {
        grunt.registerTask(taskName, task);
      },

      registerTasks = function registerTasks(tasks) {
        var
          taskName;

        for (taskName in tasks) {
          registerTask(taskName, tasks[taskName]);
        }
      },

      init = function init() {
        TASK_CONFIG.pkg = grunt.file.readJSON('package.json');
        TASK_CONFIG.jscs.options = grunt.file.readJSON('.jscsrc');

        grunt.initConfig(TASK_CONFIG);

        grunt.registerTask('report:size',     'Display file sizes in dir', reportSize);
        grunt.registerTask('asset:stringify', 'Convert all png to base64', assetStringify);

        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-contrib-compress');
        grunt.loadNpmTasks('grunt-contrib-copy');
        grunt.loadNpmTasks('grunt-contrib-cssmin');
        grunt.loadNpmTasks('grunt-contrib-htmlmin');
        grunt.loadNpmTasks('grunt-contrib-jshint');
        grunt.loadNpmTasks('grunt-contrib-uglify');
        grunt.loadNpmTasks('grunt-contrib-watch');
        grunt.loadNpmTasks('grunt-exec');
        grunt.loadNpmTasks('grunt-inline');
        grunt.loadNpmTasks('grunt-jscs');
        grunt.loadNpmTasks('grunt-karma');
        grunt.loadNpmTasks('grunt-pngmin');
        grunt.loadNpmTasks('grunt-replace');
        grunt.loadNpmTasks('grunt-zopfli');
        grunt.loadNpmTasks('grunt-mkdir');

        registerTasks(TASKS);
      };

    init();
  };

module.exports = runGrunt;
