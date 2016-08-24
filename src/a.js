var
  win       = window,
  doc       = document,
  WIDTH     = 320,
  HEIGHT    = 240,
  id        = 0,
  aFrames   = 0,
  screen    = 0, // 0 =  title, 1 = game, etc
  alphabet  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-',
  rand      = Math.random,
  floor     = Math.floor,
  min       = Math.min,
  max       = Math.max,
  updaters  = [],
  imgs      = [],

  ANIMATION_TIME_UNIT = 90,
  ctx,
  bctx,
  buffer,
  canvas,
  player,
  updater,
  abcImage,

  UP    = 87,
  DOWN  = 83,
  RIGHT = 68,
  LEFT  = 65,

  getId = function getId() {
    return ++id;
  },

  createEntity = function createEntity(x, y, i) {
    return {
      'i'   : i,
      'x'   : x,
      'y'   : y,
      'md'  : 3,
      'dx'  : 0,
      'dy'  : 0,
      'ddx' : 0,
      'ddy' : 0
    };
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
      bctx.drawImage(
        abcImage, //img
        alphabet.indexOf(str[i]) * 8, //sx
        0, //sy
        8, //sw
        8, //sh
        x + i * 9, //dx
        y + (wave * Math.sin(frame / 2 + i) | 0) || 0, //dy
        8, //dh
        8 //dw
      );
    }
  },

  drawEntity = function drawEntity(entity, frame) {
    frame %= 2;

    bctx.drawImage(
      entity.i, //img
      frame * 20, //sx
      0, //sy
      20, //sw
      20, //sh
      entity.x, //dx
      entity.y, //dy
      20,
      20
    );
  },

  setUpdater = function setUpdater(fn) {
    updater = fn;
  },

  getSpeed = function getSpeed(dx, ddx, md, friction) {
    dx += ddx;
    dx *= friction;
    dx = min(dx, md);
    dx = max(dx, -md);

    return dx;
  },

  updateEntity = function updateEntity(entity, dx, dy) {
    dx = getSpeed(entity.dx, entity.ddx, entity.md, 0.8);
    dy = getSpeed(entity.dy, entity.ddy, entity.md, 0.8);

    entity.x += dx;
    entity.dx = dx;
    entity.y += dy;
    entity.dy = dy;
  },

  updateGame = function updateGame() {
    updateEntity(player);
    drawEntity(player, aFrames);
    glitch();
  },

  updateIntro = function updateIntro() {
    starField();
    text(doc.title = '- GLITCHBUSTERS -', 90, 120, 2, aFrames);
    glitch();
  },

  /**
   * rendering loop
   */
  updateLoop = function updateLoop(timestamp) {
    aFrames = floor(timestamp / ANIMATION_TIME_UNIT);

    bctx.fillStyle = '#222';
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    updater();

    ctx.drawImage(buffer, 0, 0, 2 * WIDTH, 2 * HEIGHT);
    win.requestAnimationFrame(updateLoop);
  },

  startLoop = function startLoop() {
    updateLoop();
  },

  setScreen = function setScreen(newScreen) {
    screen = newScreen;

    setUpdater(updaters[screen]);
  },

  getCode = function getCode(event) {
    return event.keyCode || event.which;
  },

  /**
   * @param {Event} event
   */
  onkeyup = function onkeyup(event, code) {
    code = getCode(event);

    switch (code) {
      case UP:
      case DOWN: {
        player.ddy = 0;
        break;
      }

      case RIGHT:
      case LEFT: {
        player.ddx = 0;
        break;
      }
    }
  },

  /**
   * @param {Event} event
   */
  onkeydown = function onkeydown(event, code, ddvalue) {
    code    = getCode(event);
    ddvalue = 0.5;

    switch (code) {
      case UP: {
        player.ddy = -ddvalue;
        break;
      }
      case DOWN: {
        player.ddy = ddvalue;
        break;
      }
      case RIGHT: {
        player.ddx = ddvalue;
        break;
      }
      case LEFT: {
        player.ddx = -ddvalue;
        break;
      }
    }
  },

  /**
   * @param {Event} event
   */
  onclick = function onclick(event) {
    setScreen(1);
  },

  createImage = function createImage(src, image) {
    image     = new win.Image();
    image.src = src;

    return image;
  },

  createBuffer = function createBuffer() {
    return doc.createElement('canvas');
  },

  loadImages = function loadImages(len) {
    len = win.img.length;

    while (len--) {
      imgs.unshift(createImage(win.img[len]));
    }
  },

  init = function init() {
    canvas  = createBuffer();
    ctx     = canvas.getContext('2d');

    doc.body.appendChild(canvas);

    buffer  = createBuffer();
    bctx    = buffer.getContext('2d');

    updaters = [
      updateIntro,
      updateGame
    ];

    loadImages();

    abcImage      = imgs[0];
    player        = createEntity(100, 100, imgs[1]);
    buffer.width  = WIDTH;
    buffer.height = HEIGHT;
    canvas.width  = 2 * WIDTH;
    canvas.height = 2 * HEIGHT;

    win.onclick   = onclick;
    win.onkeydown = onkeydown;
    win.onkeyup   = onkeyup;

    setScreen(screen);

    // just testing
    ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
    startLoop();
  };

win.onload = init;

//
// GRUNT WILL REMOVE FROM HERE, DO NOT REMOVE THIS!
//
// Any kind of debug logic can be placed here.
//
// Export every function here which should be tested by karma,
// on build this block will be removed automatically by `replace`
// task.
//
win.test = {
  'getId' : getId,
  'field' : field
};
