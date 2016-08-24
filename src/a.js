var
  win       = window,
  doc       = document,
  WIDTH     = 320,
  HEIGHT    = 240,
  id        = 0,
  aFrames   = 0,
  screen    = 0, // 0 =  title, 1 = game, etc

  MAP_SIZE_X= 20,
  MAP_SIZE_Y= 20,
  buffer    = doc.createElement('canvas'),

  alphabet  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-',
  rand      = Math.random,
  floor     = Math.floor,
  min       = Math.min,
  max       = Math.max,
  updaters  = [],
  imgs      = [],
  applied   = {},

  ANIMATION_TIME_UNIT = 90,
  runLoop   = true,
  ctx,
  bctx,
  buffer,
  canvas,
  player,
  updater,
  abcImage,
  tileset,
  map,
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
   * [drawPath description]
   * @param {Array} arr
   * @param {Number} ax
   * @param {Number} ay
   * @param {Number} bx
   * @param {Number} by
   */
  drawPath = function drawPath(arr, ax, ay, bx, by, xIncrement, yIncrement) {
    xIncrement = yIncrement = 1;
    if (ax > bx) {
      xIncrement = -1;
    }
    if (ay > by) {
      yIncrement = -1;
    }

    // var r = 255; // temporary, debugging purposes
    for (;ax !== bx && ax < arr.length - 1; ax+= xIncrement) {
      arr[ax][ay] = arr[ax][ay] || 3;

      // temporary, debugging purposes
      // if (bctx) {
      //   bctx.fillStyle = 'rgb(' + (r-=20) + ',0,0)';
      //   bctx.fillRect(ax * 5 + 1, ay * 5 + 1, 2, 2);
      // }
    }

    for (;ay !== by && ay < arr[ax].length - 1; ay+= yIncrement) {
      arr[ax][ay] = arr[ax][ay] || 3;

      // temporary, debugging purposes
      // if (bctx) {
      //   bctx.fillStyle = 'rgb(' + (r-=20) + ',0,0)';
      //   bctx.fillRect(ax * 5 + 1, ay * 5 + 1, 2, 2);
      // }
    }

  },
  /**
   * Creates rooms and connects them with paths
   * @param {Array.<Array>} arr [description]
   * @param {Number} xc centered x coordinate of this room
   * @param {Number} yc see xc
   * @param {Number} w width
   * @param {Number} h height
   * @param {Number} color base color (or base tile) of this room
   * @param {Number} iteration safety feature to prevent stack issues
   */
  createRoom = function createRoom(arr, xc, yc, w, h, color, iteration, sizeX, sizeY, i, j, xi, yj, x, y, m, n) {
    if (w * h > 3) { // single tile wide rooms are stupid
      i = 0;
      // find top left corner of new room
      x = Math.min(Math.max(xc - (w >> 1), 0), sizeX - 1);
      y = Math.min(Math.max(yc - (h >> 1), 0), sizeY - 1);

      bctx.fillStyle = '#555';// temporary, debugging purposes
      while (i++ < w && (xi = x + i) < sizeX) {
        j = 0;
        while (j++ < h && y + j < sizeY) {
          arr[xi][y + j] = arr[xi][y + j] || color;
          // temporary, debugging purposes
          // bctx.fillRect(xi * 5, (y + j) * 5, 4, 4);
        }
      }

      // spawn more rooms
      if (iteration < 3) {
        i = 4;
        while (i--) {
          // TODO: fiddle around with those values
          createRoom(
            arr,
            m = (xc + w * (+(rand() > 0.5) || -1)), // (+(rand() > 0.5) || -1) -> 1 || -1
            n = (yc + h * (+(rand() > 0.5) || -1)),
            xi = (3 - iteration * (rand() * w) | 0),
            yj = (3 - iteration * (rand() * h) | 0),
            rand() * 3 | 0,
            iteration + 1,
            sizeX,
            sizeY
          );
          if (xi * yj > 3) {
            drawPath(arr, xc, yc, m, n);
          }
        }
      }
    }
  },
  /**
   * [mapGen description]
   * @param {Number} sizeX [description]
   * @param {Number} sizeY [description]
   */
  mapGen = function mapGen(sizeX, sizeY, x, arr) {
    arr = [];
    arr.length = sizeX;

    x = sizeX;
    while (x--) {
      arr[x] = [];
      arr[x].length = sizeY;
    }

    // create center room
    createRoom(arr, sizeX >> 1, sizeY >> 1, 4, 4, 1, 0, sizeX, sizeY);
    return arr;
  },

  renderMap = function renderMap(arr, x, y) {
    x = 0;
    for (x = 0; x < arr.length; x++) {
      for (y = 0; y < arr[x].length; y++) {
        bctx.drawImage(
          tileset, //img
          arr[x][y] ? 16 : 32, //sx
          arr[x][y] ? 16 : 9, //sy
          16, //sw
          arr[x][y] ? 16 : 32, //sh
          x * 16, //dx
          y * 16 - (arr[x][y] ? 0 : 9), //dy
          16, //dh
          arr[x][y] ? 16 : 32 //dw
        );
      }
    }
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

  updateEntity = function updateEntity(entity, dx, dy, friction) {
    friction = 0.8;

    dx = getSpeed(entity.dx, entity.ddx, entity.md, friction);
    dy = getSpeed(entity.dy, entity.ddy, entity.md, friction);

    entity.x   += dx;
    entity.dx   = dx;
    entity.y   += dy;
    entity.dy   = dy;
  },

  updateGame = function updateGame() {
    updateEntity(player);
    renderMap(map);
    drawEntity(player, aFrames);
    // runLoop = false;
    // glitch();
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

    bctx.fillStyle = '#000';
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    updater();

    ctx.drawImage(buffer, 0, 0, 3 * WIDTH, 3 * HEIGHT);
    if (runLoop) {
      win.requestAnimationFrame(updateLoop);
    }
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

  command = function command(event, apply, code, ddvalue) {
    code = getCode(event);

    if (!(applied[code]^apply)) {
      return;
    }

    applied[code] = apply;
    ddvalue       = apply ? 0.5 : -0.5;

    switch (code) {
      case UP: {
        player.ddy += -ddvalue;
        break;
      }
      case DOWN: {
        player.ddy += ddvalue;
        break;
      }
      case RIGHT: {
        player.ddx += ddvalue;
        break;
      }
      case LEFT: {
        player.ddx += -ddvalue;
        break;
      }
    }
  },

  /**
   * @param {Event} event
   */
  onkeyup = function onkeyup(event) {
    command(event);
  },

  /**
   * @param {Event} event
   */
  onkeydown = function onkeydown(event) {
    command(event, true);
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
    tileset       = imgs[3];
    player        = createEntity(100, 100, imgs[2]);
    buffer.width  = WIDTH;
    buffer.height = HEIGHT;
    canvas.width  = 3 * WIDTH;
    canvas.height = 3 * HEIGHT;

    win.onclick   = onclick;
    win.onkeydown = onkeydown;
    win.onkeyup   = onkeyup;

    map = mapGen(MAP_SIZE_X, MAP_SIZE_Y);

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
  'getId'     : getId,
  'field'     : field,
  'drawPath'  : drawPath,
  'createRoom': createRoom
};
