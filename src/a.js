var
  win       = window,
  doc       = document,
  getE      = 'getElementById',
  WIDTH     = 320,
  HEIGHT    = 240,
  TIME_UNIT = 35,
  id        = 0,
  frames    = 0,
  screen    = 0, // 0 =  title, 1 = game, etc
  w         = 'width',
  h         = 'height',
  buffer    = doc.createElement('canvas'),
  alphabet  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-',
  rand      = Math.random,
  floor     = Math.floor,
  drawImage = 'drawImage',
  updaters  = [],

  ctx,
  bctx,
  canvas,
  updater,
  abcImage,
  playerImage,

  getId = function getId() {
    return ++id;
  },

  /**
   * Just some color jittering (for now)
   */
  glitch = function glitch(obj, data, i) {
    obj  = bctx.getImageData(0, 0, WIDTH, HEIGHT);
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

    bctx.putImageData(obj, 0, 0);
  },

  /**
   * Creates a basic star [x, y, z]
   * @return {Array.<Number>}
   */
  star = function star() {
    return [
      0.5 - rand(),
      0.5 - rand(),
      rand() * 3
    ];
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
   */
  starField = function starField(i, f, z) {
    bctx.fillStyle = '#fff';
    i = field.length;

    while (i--) {
      f = field[i];

      if ((z = f[2]) < 0.5) {
        field[i] = star(); // spawn new stars if they fade out
      }

      bctx.fillRect(
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
   * @param  {Number} x
   * @param  {Number} y
   * @param  {Number} wave make waving text
   * @param  {Number} frame current frame
   */
  text = function text(str, x, y, wave, frame, i) {
    // text = function (str, x, y, wave = 0, frame, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-', i = 0)
    // no ES6 support in uglify :/
    wave = wave || 0;

    for (i = 0; i < str.length; i++) {
      bctx[drawImage](
        abcImage, //img
        alphabet.indexOf(str[i]) * 8, //sx
        0, //sy
        8, //sw
        8, //sh
        x + i * 9, //dx
        y + (wave * Math.sin(frame / 4 + i) | 0) || 0, //dy
        8, //dh
        8 //dw
      );
    }
  },

  drawPlayer = function drawPlayer(x, y, frame) {
    frame = 0;

    bctx[drawImage](
      playerImage, //img
      frame * 40, //sx
      0, //sy
      40, //sw
      40, //sh
      x, //dx
      y, //dy
      40,
      40
    );
  },

  setUpdater = function setUpdater(fn) {
    updater = fn;
  },

  updateGame = function updateGame() {
    drawPlayer(0, 0, frames);
    glitch();
  },

  updateIntro = function updateIntro() {
    starField();
    text(doc.title = '- GLITCHBUSTERS -', 90, 120, 2, frames);
    glitch();
  },

  /**
   * rendering loop
   */
  updateLoop = function updateLoop(timestamp) {
    frames = floor(timestamp / TIME_UNIT);

    bctx.fillStyle = '#222';
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    updater();

    ctx[drawImage](buffer, 0, 0, 2 * WIDTH, 2 * HEIGHT);
    win.requestAnimationFrame(updateLoop);
  },

  startLoop = function startLoop() {
    updateLoop();
  },

  setScreen = function setScreen(newScreen) {
    screen = newScreen;

    setUpdater(updaters[screen]);
  },

  /**
   * @param {Event} event
   */
  onclick = function onclick(event) {
    setScreen(1);
  },

  createImage = function createImage(src, image) {
    image     = new Image();
    image.src = src;

    return image;
  },

  loadImages = function loadImages(imgs) {
    imgs        = win.img;
    abcImage    = createImage(imgs[0]);
    playerImage = createImage(imgs[1]);
  },

  init = function init() {
    canvas  = doc[getE]('c'); // just 'c' would also work ... not sure if mangling breaks that
    ctx     = canvas.getContext('2d');
    bctx    = buffer.getContext('2d');

    updaters = [
      updateIntro,
      updateGame
    ];

    loadImages();

    buffer[w] = WIDTH;
    buffer[h] = HEIGHT;
    canvas[w] = 2 * WIDTH;
    canvas[h] = 2 * HEIGHT;

    win.onclick = onclick;
    setScreen(0);

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
