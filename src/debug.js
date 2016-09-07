/* exported DEBUG, setDebug, log, stringify */
var
  DEBUG,

  logged = {},

  help = document.createElement('ul'),

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
      seen = [];

    return JSON.stringify(obj, function (key, val) {
      if (val !== null && typeof val === 'object') {
        if (seen.indexOf(val) >= 0) {
          return;
        }

        seen.push(val);
      }

      return val;
    }, 2);
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
