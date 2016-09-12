/* exported
  DEBUG,
  log,
  setDebug,
  stringify,
  consolify,
  drawDebugMap
*/
/* globals TILESIZE_X, map2DArray, drawField, drawWall */

if (!window.Audio) {
  Audio = function Audio() {
    return {
      'pause' : function pause()  {},
      'play'  : function play()   {}
    };
  };
}
var
  DEBUG,

  logged = {},

  help = document.createElement('ul'),
  debugMap = document.createElement('canvas'),

  createHelpItem = function createHelpItem(item) {
    return '<li>' + item + '</li>';
  },

  setHelpHTML = function setHelpHTML(HTML) {
    var
      message;

    if (HTML !== undefined) {
      help.innerHTML = HTML;
      return;
    }

    HTML  = createHelpItem('x - monster');
    HTML += createHelpItem('c - continue');
    HTML += createHelpItem('v - debug');
    HTML += createHelpItem('b - break');
    HTML += createHelpItem('g - game over');
    HTML += createHelpItem('m - show map');
    HTML += createHelpItem('n - explosion');
    HTML += createHelpItem('k - kill everything');
    HTML += createHelpItem('l - random drop');

    for (message in logged) {
      HTML += createHelpItem(message);
    }

    help.innerHTML = HTML;
  },

  initDebug = function initDebug() {
    DEBUG = {
      'break' : false
    };
  },

  toggleDebug = function toggleDebug() {
    DEBUG = !DEBUG;

    if (DEBUG) {
      initDebug();
      setHelpHTML();
    } else {
      setHelpHTML('');
    }
  },

  setDebug = function setDebug(key, value) {
    if (key === undefined || value === undefined) {
      toggleDebug();
    } else {
      DEBUG[key] = value;
    }
  },

  drawDebugMap = function drawDebugMap (ctx, x, y) {
    document.body.appendChild(debugMap);
    debugMap.height = map2DArray[0].length * TILESIZE_X;
    debugMap.width = map2DArray.length * TILESIZE_X;

    ctx = debugMap.getContext('2d');

    for (y = 0; y < map2DArray[0].length; y++) {
      for (x = 0; x < map2DArray.length; x++) {
        if (map2DArray[x][y]) {
          drawField(x, y, map2DArray[x][y], ctx);
          ctx.fillText(map2DArray[x][y], x * TILESIZE_X, y * TILESIZE_X + TILESIZE_X / 2);
        } else {
          drawWall(x, y, 32, ctx);
        }
      }
    }
  },

  log = function log(message) {
    if (!logged[message]) {
      logged[message] = 0;
      console.error(message);
    }

    logged[message]++;
    setHelpHTML();
  },

  stringify = function stringify(obj) {
    var
      string      = '',
      seenVals    = [],
      cyclicKeys  = [];

    string += JSON.stringify(obj, function (key, val) {
      if (val !== null && typeof val === 'object') {
        if (seenVals.indexOf(val) !== -1) {
          if (cyclicKeys.indexOf(key) === -1) {
            cyclicKeys.push(key);
          }

          return;
        }

        seenVals.push(val);
      }

      return val;
    }, 2);


    if (cyclicKeys.length) {
      string += '\nCyclic keys: ' + JSON.stringify(cyclicKeys) + '.';
    } else {
      string += '\nThere were no cyclic keys.';
    }

    return string;
  },

  consolify = function consolify(param) {
    var
      key,
      value,
      element,
      isObject;

    for (key in param) {
      isObject  = true;
      element   = param[key];
      value     = (element !== null && typeof element === 'object') ? Object.keys(element) : element;

      console.log(key, value);
    }

    if (!isObject) {
      console.log(param);
    }
  },

  init = function init() {
    initDebug();

    help.style = '' +
      'list-style-type  : none;'      +
      'text-align       : left;'      +
      'position         : absolute;'  +
      'color            : white;'     +
      'margin-left      : 15px;'      +
      'padding-left     : 0;'         +
      'left             : 0;';

    setHelpHTML();

    document.body.appendChild(help);
  };

init();
