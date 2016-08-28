var
  win       = window,
  doc       = document,
  WIDTH     = 320,
  HEIGHT    = 240,
  id        = 0,
  aFrames   = 0,
  gFrames   = 0,
  screen    = 0, // 0 =  title, 1 = game, etc
  alphabet  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-',
  updaters  = [],
  imgs      = [],
  applied   = {},
  commands  = {},
  execute   = [],
  entities  = [],

  ANIMATION_TIME_UNIT = 80,
  GAME_TIME_UNIT      = 20,
  MAP_SIZE_X          = 20,
  MAP_SIZE_Y          = 20,
  TILESIZE_X          = 16, // everything is square right now
  UP                  = 87, // w
  DOWN                = 83, // s
  RIGHT               = 68, // d
  LEFT                = 65, // a
  SPACE               = 32,
  FRICTION            = 0.8,
  ZERO_LIMIT          = 0.2,

  mctx,
  bctx,
  main,
  aFrame,
  gFrame,
  buffer,
  player,
  updater,
  tileset,
  abcImage,
  map2DArray,

  getId = function getId() {
    return ++id;
  },

  createCanvas = function createCanvas(factor, canvas) {
    canvas        = doc.createElement('canvas');
    canvas.width  = factor * WIDTH;
    canvas.height = factor * HEIGHT;

    return canvas;
  },

  createEntity = function createEntity(x, y, img, cfg) {
    return {
      'img' : img,
      'cfg' : cfg,
      'pos' : [x, y],
      'spd' : [0, 0],
      'acc' : [0, 0]
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

    for (;ax !== bx && ax < arr.length - 1; ax+= xIncrement) {
      arr[ax][ay] = arr[ax][ay] || 3;
    }

    for (;ay !== by && ay < arr[ax].length - 1; ay+= yIncrement) {
      arr[ax][ay] = arr[ax][ay] || 3;
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

      while (i++ < w && (xi = x + i) < sizeX) {
        j = 0;
        while (j++ < h && y + j < sizeY) {
          arr[xi][y + j] = arr[xi][y + j] || color;
        }
      }

      // spawn more rooms
      if (iteration < 3) {
        i = 4;
        while (i--) {
          // TODO: fiddle aMath.round with those values
          createRoom(
            arr,
            m = (xc + w * (+(Math.random() > 0.5) || -1)), // (+(Math.random() > 0.5) || -1) -> 1 || -1
            n = (yc + h * (+(Math.random() > 0.5) || -1)),
            xi = (3 - iteration * (Math.random() * w) | 0),
            yj = (3 - iteration * (Math.random() * h) | 0),
            Math.random() * 3 | 0,
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

  renderMap = function renderMap(arr, x, y, tilesizeX, tilesizeY) {
    tilesizeX = tilesizeY = 16;
    for (x = 0; x < arr.length; x++) {
      for (y = 0; y < arr[x].length; y++) {
        if (arr[x][y] !== undefined) {
          bctx.drawImage(
            tileset, //img
            ((x + y) % 2) * tilesizeX, //sx
            tilesizeY, //sy
            tilesizeX, //sw
            tilesizeY, //sh
            x * tilesizeX, //dx
            y * tilesizeY, //dy
            tilesizeX, //dw
            tilesizeY //dh
          );
        } else {
          //wall
          bctx.drawImage(
            tileset, //img
            32, //sx
            9, //sy
            tilesizeX, //sw
            32, //sh
            x * tilesizeX, //dx
            y * tilesizeY - 7, //dy
            tilesizeX, //dw
            32 //dh
          );
        }
      }
    }
  },

  /**
   * Just some color jittering (for now)
   * @param {Number} type e.g. JITTER
   */
  glitch = function glitch(canvas, ctx, obj, data, i) {
    ctx  = canvas.getContext('2d');
    obj  = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

    ctx.putImageData(obj, 0, 0);
  },

  /**
   * Creates a basic star [x, y, z]
   * @return {Array.<Number>}
   */
  star = function star() {
    return [
      0.5 - Math.random(),
      0.5 - Math.random(),
      Math.random() * 3
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

  getMovingDirection = function getMovingDirection(entity, spd, res) {
    spd = entity.spd;
    res = [Math.sign(spd[0]), Math.sign(spd[1])];

    return res[0] === 0 && res[1] === 0 ? 0 : res;
  },

  drawEntity = function drawEntity(entity, stepFrame, cfg, frame, frameCfg) {
    cfg       = entity.cfg;
    frameCfg  = cfg[entity.state];
    frame     = entity.frame % frameCfg.frames;

    bctx.drawImage(
      entity.img, //img
      frame * cfg.size, //sx
      frameCfg.y || 0, //sy
      cfg.size, //sw
      cfg.size, //sh
      entity.pos[0], //dx
      entity.pos[1], //dy
      cfg.size,
      cfg.size
    );

    if (stepFrame) {
      entity.frame++;
    }
  },

  setUpdater = function setUpdater(fn) {
    updater = fn;
  },

  getAxisSpeed = function getAxisSpeed(axisSpd, axisAcc) {
    axisSpd += axisAcc;
    axisSpd *= FRICTION;
    axisSpd  = Math.abs(axisSpd) < ZERO_LIMIT ? 0 : axisSpd;

    return axisSpd;
  },

  setEntityState = function setEntityState(entity, state, counter) {
    // ATM reset global frames, but should be entity specific.
    if (state !== entity.state) {
      entity.frame = 0;
    }

    entity.state    = state;
    entity.counter  = counter;
  },

  updateEntitySpeed = function updateEntitySpeed(entity, acc, spd) {
    acc = entity.acc;
    spd = entity.spd;

    spd[0] = getAxisSpeed(spd[0], acc[0]);
    spd[1] = getAxisSpeed(spd[1], acc[1]);

    return spd;
  },

  updateEntityPosition = function updateEntityPosition(entity, spd, pos, oldX, oldY, tileX, tileY) {
    pos  = entity.pos;
    spd  = entity.spd;

    if (!getMovingDirection(entity)) {
      setEntityState(entity, 'idling');
      return;
    }

    oldX = pos[0];
    oldY = pos[1];

    pos[0] += spd[0];
    pos[1] += spd[1];

    tileX = Math.round(pos[0] / TILESIZE_X);
    tileY = Math.round(pos[1] / TILESIZE_X);

    setEntityState(entity, 'moving');

    // TODO: this is the naive implementation
    if (!map2DArray[tileX][tileY]) {
      pos[0] = oldX;
      pos[1] = oldY;
    }
  },

  teleport = function teleport(apply, finished, direction, pos) {
    direction = getMovingDirection(player);
    apply     = direction && apply;

    if (!apply) {
      return;
    }

    pos = player.pos;

    if (finished) {
      pos[0] += direction[0] * 40;
      pos[1] += direction[1] * 40;
    } else {
      setEntityState(player, 'tping', 12);
    }
  },

  updateEntityCounter = function updateEntityCounter(entity) {
    if (entity.state === 'tping') {
      entity.counter--;

      if (entity.counter === 0) {
        teleport(1, 1);

        setEntityState(entity, 'idling');
      }
    }
  },

  updateEntity = function updateEntity(entity, command, apply) {
    updateEntityCounter(entity);

    while (execute.length) {
      command = execute.shift();
      apply   = execute.shift();
      command(apply);
    }

    if (entity.counter) {
      return;
    }

    updateEntitySpeed(entity);
    updateEntityPosition(entity);
  },

  updateGame = function updateGame(len, stepFrame) {
    renderMap(map2DArray);

    if (gFrame !== gFrames) {
      gFrame  = gFrames;
      len     = entities.length;

      while (len--) {
        updateEntity(entities[len]);
      }
    }

    stepFrame = aFrame !== aFrames;
    aFrame    = aFrames;
    len       = entities.length;

    while (len--) {
      drawEntity(entities[len], stepFrame);
    }
  },

  updateIntro = function updateIntro() {
    starField();
    text(doc.title = '- GLITCHBUSTERS -', 90, 120, 2, aFrames);
    glitch(buffer);
  },

  /**
   * rendering loop
   */
  updateLoop = function updateLoop(timestamp) {
    aFrames = Math.floor(timestamp / ANIMATION_TIME_UNIT);
    gFrames = Math.floor(timestamp / GAME_TIME_UNIT);

    bctx.fillStyle = '#000';
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    updater();

    mctx.drawImage(buffer, 0, 0, 3 * WIDTH, 3 * HEIGHT);
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

  setCommand = function setCommand(event, apply, code, command) {
    code    = getCode(event);
    command = applied[code]^apply && commands[code];

    if (!command) {
      return;
    }

    execute.push(command, apply);

    applied[code] = apply;

    event.preventDefault();
  },

  /**
   * @param {Event} event
   */
  onkeyup = function onkeyup(event) {
    setCommand(event);
  },

  /**
   * @param {Event} event
   */
  onkeydown = function onkeydown(event) {
    setCommand(event, true);
  },

  /**
   * @param {Event} event
   */
  onclick = function onclick() {
    setScreen(1);
  },

  createImage = function createImage(src, image) {
    image     = new win.Image();
    image.src = src;

    return image;
  },

  loadImages = function loadImages(len) {
    len = win.img.length;

    while (len--) {
      imgs.unshift(createImage(win.img[len]));
    }
  },

  accelerate = function accelerate(entity, newAcc, apply, acc) {
    acc     = entity.acc;
    newAcc  = newAcc.slice();

    if (!apply) {
      newAcc[0] *= -1;
      newAcc[1] *= -1;
    }

    acc[0] += newAcc[0];
    acc[1] += newAcc[1];
  },

  setCommands = function setCommands() {
    commands[UP]    = accelerate.bind(0, player, [0, -0.5]);
    commands[DOWN]  = accelerate.bind(0, player, [0,  0.5]);
    commands[LEFT]  = accelerate.bind(0, player, [-0.5, 0]);
    commands[RIGHT] = accelerate.bind(0, player, [0.5,  0]);
    commands[SPACE] = teleport;
  },

  /**
   * Creates different animations based on the original
   * player spritesheet.
   *
   * 1 - copy original sheet
   * 2 - add extra states
   * 3 - mirror sheet
   *
   * @param {Image} img
   * @return {HTMLCanvasElement}
   */
  createPlayerSprites = function createPlayerSprites(cfg, img, canvas, ctx, x, i, w, frames) {
    canvas    = createCanvas(1);
    ctx       = canvas.getContext('2d');
    frames    = cfg.tping.frames;

    ctx.drawImage(img, 0, 0);

    for (i = 0; i < frames; i++) {
      x = cfg.size * i;
      w = cfg.size * (frames - i) / frames;

      ctx.drawImage(
        img,
        x, // sx
        cfg.size, // sy
        cfg.size, // sw
        cfg.size, // sh
        x + cfg.size / 2 - w / 2, // dx
        img.height, // dy
        w, // dw
        cfg.size // dh
      );
    }

    return canvas;
  },

  init = function init() {
    main    = createCanvas(3);
    mctx    = main.getContext('2d');

    doc.body.appendChild(main);

    buffer  = createCanvas(1);
    bctx    = buffer.getContext('2d');

    updaters = [
      updateIntro,
      updateGame
    ];

    loadImages();

    //
    // TODO pliz explain, not sure if that is where this comment belongs
    //
    // (MAP_SIZE_X * TILESIZE_X) >> 1,
    // there should always be some room in the center
    //
    player = {
      'size' : 16,

      'idling' : {
        'frames' : 6
      },

      'moving' : {
        'frames'  : 4,
        'y'       : 16
      },

      'tping' : {
        'frames'  : 4,
        'y'       : 32
      }
    };

    player = createEntity(160, 160, createPlayerSprites(player, imgs[2]), player);
    entities.push(player);

    setCommands();

    abcImage      = imgs[0];
    tileset       = imgs[3];

    win.onclick   = onclick;
    win.onkeydown = onkeydown;
    win.onkeyup   = onkeyup;

    map2DArray = mapGen(MAP_SIZE_X, MAP_SIZE_Y);

    setScreen(screen);

    // just testing
    mctx.mozImageSmoothingEnabled = mctx.imageSmoothingEnabled = false;
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
  'getId'               : getId,
  'field'               : field,
  'drawPath'            : drawPath,
  'createRoom'          : createRoom,
  'getMovingDirection'  : getMovingDirection
};
