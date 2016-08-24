var
  grunt,

  ALL_JS = ['*.js', 'src/**/*.js', 'test/**/*.js'],

  TASK_CONFIG = {
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
      'removetest': {
        'options': {
          'patterns': [{
            'match'       : /win.test[^]*/,
            'replacement' : ''
          }]
        },

        'files': [{
          'src'   : ['src/a.js'],
          'dest'  : 'build/a.js'
        }]
      }
    },

    'copy' : {
      'img' : {
        'expand'  : true,
        'cwd'     : 'src',
        'src'     : 'img.js',
        'dest'    : 'build/'
      }
    },

    'uglify': {
      'options' : {
        'enclose' : {},
        'mangle' : {
          'toplevel' : true
        }
      },

      'build': {
        'files': {
          'build/a.js'    : ['build/a.js'],
          'build/img.js'  : ['src/img.js']
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
            'src'   : 'src/a.css',
            'dest'  : 'build/a.css'
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
            'cwd'     : 'src',
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
          'it'        : true,
          'expect'    : true,
          'jasmine'   : true,
          'window'    : true,
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
        'indent'      : 2
      },

      'default' : ALL_JS,

      //
      // ATM this is not needed, as uglify wraps and removes unused stuff.
      //
      'strict' : {
        'options' : {
          'noempty' : true,
          'unused'  : 'vars'
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
        'files' : ['src/**/*'],
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
      'advzip': 'advzip -a dist/index.html.zip build/index.html -4 -i 100' // requires 'AdvanceCOMP' from http://www.advancemame.it/download, also available as AUR package
    }
  },

  TASKS = {
    'test' : [
      'jshint',
      'jscs',
      'karma'
    ],

    'test:dev' : [
      'jshint:default',
      'karma'
    ],

    'build:dev' : [
      'test:dev'
    ],

    'dev' : [
      'build:dev',
      'watch:dev'
    ],

    'compile:asset' : [
      'pngmin',
      'asset:stringify'
    ],

    'compile:js' : [
      'replace',
      'copy'
    ],

    'minify' : [
      'uglify',
      'htmlmin',
      'cssmin'
    ],

    'build' : [
      'clean',
      'compile:asset',
      'compile:js',
      'minify',
      'inline'
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

  fs        = require('fs'),
  path      = require('path'),
  chalk     = require('chalk'),
  filesize  = require('filesize'),

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
      result      = '// Generated file (grunt compile:asset), no point of modifying it by hand.\n\nwindow.img = [\n',
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

    // Alphabetical sort them files.
    list.sort();

    len = list.length;

    for (i = 0; i < len; i++) {
      filename  = list[i];
      filepath  = path.join(buildPath, filename);

      grunt.log.writeln(chalk.green('# stringifying: ' + filepath));

      suffix  = '\'' + (i < len - 1 ? ',\n' : '');
      result += format('// ' + filename);
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

        registerTasks(TASKS);
      };

    init();
  };

module.exports = runGrunt;
