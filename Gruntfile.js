var
  grunt,

  ALL_JS = ['*.js', 'src/**/*.js', 'test/**/*.js'],

  TASK_CONFIG = {
    'clean' : {
      'build' : 'build/**/*',
      'dist'  : 'dist/**/*'
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
          'define'    : false,
          'requirejs' : false,
          'inject'    : false
        },

        'jasmine'     : true,
        'browser'     : true,
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

      'default' : ALL_JS

      //
      // ATM this is not needed, as uglify wraps and removes unused stuff.
      //
      // 'strict' : {
      //   'options' : {
      //     'noempty' : true,
      //     'unused'  : 'vars'
      //   },

      //   'files' : {
      //     'default' : ALL_JS
      //   }
      // }
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
      'jshint',
      'karma'
    ],

    'build:dev' : [
      'test:dev'
    ],

    'dev' : [
      'build:dev',
      'watch:dev'
    ],

    'compile' : [
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
      'compile',
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

  reportSizes = function reportSizes() {
    var
      dirPath = 'dist',
      done    = this.async();

    fs.readdir(dirPath, function (err, list) {
      var
        stat,
        size,
        filename,
        len = list.length;

      while (len--) {
        filename  = path.join(dirPath, list[len]);
        stat      = fs.statSync(filename);
        size      = stat.size;

        grunt.log.writeln(chalk.green('# ' + filename + ' <=== ' + filesize(size)));
      }

      done();
    });
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

        grunt.registerTask('report:size',     'Display file sizes in dir', reportSizes);

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
        grunt.loadNpmTasks('grunt-replace');
        grunt.loadNpmTasks('grunt-zopfli');

        registerTasks(TASKS);
      };

    init();
  };

module.exports = runGrunt;
