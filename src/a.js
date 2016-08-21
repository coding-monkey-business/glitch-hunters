var
  win     = window,
  doc     = document,
  getE    = 'getElementById',
  WIDTH   = 320,
  HEIGHT  = 240,
  id      = 0,
  frames  = 0,
  screen  = 0, // 0 =  title, 1 = game, etc
  w       = 'width',
  h       = 'height',
  abc     = new Image(),
  ctx,
  bctx,
  canvas,
  buffer = doc.createElement('canvas'),
  alphabet= 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-',

  getId = function getId() {
    return ++id;
  },

  /**
   * Just some color jittering (for now)
   * @param  {CanvasRenderingContext2D} context
   */
  glitch = function glitch(context, obj, data, i) {
    obj  = context.getImageData(0, 0, WIDTH, HEIGHT);
    data = obj.data;
    i    = data.length;

    while (i--) {
      switch (i%4) {
        case 1: {
          data[i] = data[i-4];
          break;
        }
        case 2: {
          data[i] = data[i-8];
          break;
        }
      }
    }
    context.putImageData(obj, 0, 0);
  },

  /**
   * Creates a basic star [x, y, z]
   * @return {Array.<Number>}
   */
  star = function star(r, a) {
    r = Math.random;
    return [a = 0.5 - r(), 0.5 - r(), r()* 3 ];
  },
  /**
   * @type {Array.<Array.<Number>>}
   */
  field = (function (a, amount) {
    while (amount--) {
      a[amount] = star();
    }
    return a;
  })([], 100),

  /**
   * renders the title starfield effect
   * can be thrown away if we need the additional bytes.
   * @param  {CanvasRenderingContext2D}
   */
  starField = function starField(context, i, f, z) {
    context.fillStyle = '#fff';
    i = field.length;

    while (i--) {
      f = field[i];
      if ((z = f[2]) < 0.5) {
        field[i] = star(); // spawn new stars if they fade out
      }
      context.fillRect(
        WIDTH / 2  + f[0] * z * WIDTH,
        HEIGHT / 2 + f[1] * z * HEIGHT,
        z,
        f[2] -= (z * (i%3 + 1) * 0.01)
      );
    }
  },

  /**
   * Renders a given string
   * @param  {String} str must be uppercase
   * @param  {CanvasRenderingContext2D} context
   * @param  {Number} x
   * @param  {Number} y
   * @param  {Number} wave make waving text
   * @param  {Number} frame current frame
   */
  text = function text(str, context, x, y, wave, frame, i) {
    // text = function (str, context, x, y, wave = 0, frame, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-', i = 0)
    // no ES6 support in uglify :/
    wave = wave || 0;
    for (i = 0;i < str.length; i++) {
      context.drawImage(
        abc, //img
        alphabet.indexOf(str[i]) * 8, //sx
        0, //sy
        8, //sw
        8, //sh
        x + i * 9, //dx
        y + (wave * Math.sin(frame / 10 + i) | 0) || 0, //dy
        8, //dh
        8 //dw
      );
    }
  },

  /**
   * rendering loop
   */
  updateLoop = function updateLoop() {
    ++frames;
    bctx.fillStyle = '#222';
    bctx.fillRect(0, 0, WIDTH, HEIGHT);
    switch (screen) {
      case 0: {
        starField(bctx);
        text(doc.title = '- GLITCHBUSTERS -', bctx, 90, 120, 2, frames);
        glitch(bctx);
        break;
      }
      case 1: {
        text('GAME SHOULD BE HERE', bctx, 1, 1);
      }
    }

    ctx.drawImage(buffer, 0, 0, 2 * WIDTH, 2 * HEIGHT);
    win.requestAnimationFrame(updateLoop);
  },

  startLoop = function startLoop() {
    updateLoop();
  },

  /**
   * @param {Event} event
   */
  onclick = function onclick(event) {
    if (!screen) {
      return (screen = 1);
    }
    console.log(event);
  },
  init = function init() {
    canvas  = doc[getE]('c'); // just 'c' would also work ... not sure if mangling breaks that
    ctx     = canvas.getContext('2d');
    bctx    = buffer.getContext('2d');
    abc.src = win.img.abc;

    buffer[w] = WIDTH;
    buffer[h] = HEIGHT;
    canvas[w] = 2 * WIDTH;
    canvas[h] = 2 * HEIGHT;

    win.onclick = onclick;

    // just testing
    ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
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
  'getId' : getId,
  'field' : field
};
