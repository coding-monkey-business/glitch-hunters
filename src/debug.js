/* exported DEBUG, toggleDebug, log */
var
  DEBUG = true,

  logged = {},

  log = function log(message) {
    if (logged[message]) {
      logged[message]++;
      return;
    }

    logged[message] = 1;

    console.error(message);
  },

  toggleDebug = function toggleDebug() {
    DEBUG = !DEBUG;
  };
