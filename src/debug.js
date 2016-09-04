/* exported DEBUG, toggleDebug, log */
var
  DEBUG = true,

  logged = {},

  help = document.createElement('ul'),

  toggleDebug = function toggleDebug() {
    DEBUG = !DEBUG;
  },

  createHelpItem = function createHelpItem(item) {
    return '<li>' + item + '</li>';
  },

  setHelpHTML = function setHelpHTML() {
    var
      message,
      HTML;

    HTML  = createHelpItem('x - monster');
    HTML += createHelpItem('c - continue');
    HTML += createHelpItem('v - debug');
    HTML += createHelpItem('b - break');

    for (message in logged) {
      HTML += createHelpItem(message);
    }

    help.innerHTML = HTML;
  },

  log = function log(message) {
    if (!logged[message]) {
      logged[message] = 0;
      console.error(message);
    }

    logged[message]++;
    setHelpHTML();
  },

  init = function init() {
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
