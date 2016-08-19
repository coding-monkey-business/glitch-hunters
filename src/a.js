var
  win     = window,
  doc     = document,
  getE    = 'getElementById',
  WIDTH   = 600,
  HEIGHT  = 600,
  id      = 0,
  w       = 'width',
  h       = 'height',

  ctx,
  canvas,

  getId = function getId() {
    return ++id;
  },

  updateLoop = function updateLoop() {
    win.requestAnimationFrame(updateLoop);
  },

  startLoop = function startLoop() {
    updateLoop();
  },

  init = function init() {
    canvas  = doc[getE]('c');
    ctx     = canvas.getContext('2d');

    canvas[w] = WIDTH;
    canvas[h] = HEIGHT;

    // just testing
    ctx.fillStyle = '#f0f';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    startLoop();
  };

win.onload = init;

//
// DO NOT REMOVE THIS
//
// Export every function here which should be tested by karma,
// on build this block will be removed automatically by `replace`
// task.
//
win.test = {
  'getId' : getId
};
