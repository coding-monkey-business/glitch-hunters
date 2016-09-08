/* globals
  DEBUG,
  VEC_UNIT,
  aStar,
  add,
  div,
  mul,
  norm,
  rad,
  set,
  setDebug,
  sub,
  sum,
  zero
*/

/* exported
  reset
*/

var
  win       = window,
  doc       = document,
  WIDTH     = 320,
  HEIGHT    = 240,
  id        = 0,
  frames    = 0,
  aFrames   = 0,
  screen    = 0, // 0 =  title, 1 = game, etc
  alphabet  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-',
  updaters  = [],
  images    = [],
  applied   = {},
  commands  = {},
  entities  = [],

  mouseCoords   = [],

  DIRECTIONS = {
    '68' : VEC_UNIT[0], // d
    '83' : VEC_UNIT[1], // s
    '65' : VEC_UNIT[2], // a
    '87' : VEC_UNIT[3]  // w
  },

  APPLY_TYPES         = ['keydown', 'mousedown'],
  ANIMATION_TIME_UNIT = 80,
  TIME_UNIT           = 20,
  MAP_SIZE_X          = 20,
  MAP_SIZE_Y          = 20,
  TILESIZE_X          = 16, // everything is square right now
  SPACE               = 32,
  ZERO_LIMIT          = 0.05,
  SHOOT               = 1,
  STAGE_SCALE         = 3,

  mctx,
  bctx,
  main,
  frame,
  aFrame,
  buffer,
  player,
  playerCfg,
  bulletCfg,
  monsterCfg,
  updater,
  tileset,
  abcImage,
  map2DArray,

  getId = function getId() {
    return ++id;
  },

  remove = function remove(arr, item) {
    arr.splice(arr.indexOf(item), 1);
  },

  removeEntity = function removeEntity(entity) {
    remove(entities, entity);
  },

  createCanvas = function createCanvas(width, height, canvas) {
    canvas        = doc.createElement('canvas');
    canvas.width  = width  || WIDTH;
    canvas.height = height || HEIGHT;

    canvas.getCtx = function getCtx(ctx) {
      ctx = canvas.getContext('2d');
      ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
      return ctx;
    };

    return canvas;
  },

  setEntityState = function setEntityState(entity, state, cnt, cntFn) {
    if (state !== entity.state) {
      entity.frame = 0;
    }

    entity.state  = state;
    entity.cnt    = cnt;
    entity.cntFn  = cntFn;
  },

  createEntityConfig = function createEntityConfig(img, states, cfg, state, i) {
    cfg           = cfg           || {};
    cfg.size      = cfg.size      || 16;
    cfg.friction  = cfg.friction  || 0.8;
    cfg.img       = img;

    cfg.cnv   = createCanvas(cfg.size, cfg.size);
    cfg.cnvX  = cfg.cnv.width  / -2;
    cfg.cnvY  = cfg.cnv.height / -2;
    cfg.ctx   = cfg.cnv.getCtx();

    cfg.ctx.translate(-cfg.cnvX, -cfg.cnvY);

    i       = 0;
    states  = states || [];
    state   = states[0];

    if (!state || state[0] !== 'idling') {
      states.unshift(['idling', 4]);
    }

    while (i < states.length) {
      cfg[states[i][0]] = {
        'frames'  : states[i][1] || 4,
        'y'       : i * cfg.size
      };

      i++;
    }

    return cfg;
  },

  createEntity = function createEntity(pos, cfg, spd, entity) {
    entity = {
      'id'    : getId(),
      'cfg'   : cfg, // `cfg` can be a shared reference across entities
      'pos'   : pos.slice(),
      'spd'   : spd || [0, 0],
      'dir'   : [1, 0],
      'acc'   : [0, 0],
      'cmd'   : []
    };

    setEntityState(entity, 'idling');
    entities.push(entity);

    return entity;
  },

  createMonster = function createMonster(pos, monster) {
    monster         = createEntity(pos, monsterCfg);
    monster.target  = player;
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
          try {
            arr[xi][y + j] = arr[xi][y + j] || color;
          } catch (e) {

          }
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

  drawEntityDebugInfo = function drawEntityDebugInfo(entity, len) {
    bctx.fillRect(entity.pos[0] - 1, entity.pos[1] - 1, 2, 2); // center point of entity, comment back in for debugging & stuff

    if (entity.route) {
      bctx.fillStyle = '#f0f';
      len = entity.route.length;
      while (len--) {
        bctx.fillRect(
          entity.route[len][0] * TILESIZE_X + TILESIZE_X / 2 - 2,
          entity.route[len][1] * TILESIZE_X + TILESIZE_X / 2 - 2,
          4,
          4
        );
      }
    }

    bctx.beginPath();

    bctx.moveTo(
      entity.pos[0],
      entity.pos[1]
    );

    bctx.lineTo(
      entity.pos[0] + entity.acc[0] * 10,
      entity.pos[1] + entity.acc[1] * 10
    );
    bctx.stroke();
  },

  drawEntity = function drawEntity(entity, stepFrame, cfg, frame, frameCfg)  {
    cfg       = entity.cfg;
    frameCfg  = cfg[entity.state] || cfg.idling;
    frame     = entity.frame % frameCfg.frames;

    cfg.ctx.clearRect(cfg.cnvX, cfg.cnvY, cfg.cnv.width, cfg.cnv.height);

    cfg.ctx.save();

    if (cfg.rotating) {
      cfg.ctx.rotate(rad(entity.dir));
    } else {
      cfg.ctx.scale(entity.dir[0] < 0 ? -1 : 1, 1);
    }

    cfg.ctx.drawImage(
      cfg.img,
      frame * cfg.size,
      frameCfg.y,
      cfg.size,
      cfg.size,
      cfg.cnvX,
      cfg.cnvY,
      cfg.size,
      cfg.size
    );

    cfg.ctx.restore();

    bctx.drawImage(
      cfg.cnv,
      entity.pos[0] - cfg.size / 2, //dx
      entity.pos[1] - cfg.size //dy
    );

    if (DEBUG) {
      drawEntityDebugInfo(entity);
    }

    entity.frame += stepFrame ? 1 : 0;
  },

  drawWall = function drawWall(x, y, height) {
    //
    // Meh, maybe this is not right here, but ATM it does what I need
    //
    if (map2DArray[x][y]) {
      return;
    }

    height = height || 32;

    bctx.drawImage(
      tileset, //img
      32, //sx
      9, //sy
      TILESIZE_X, //sw
      height, //sh
      x * TILESIZE_X, //dx
      y * TILESIZE_X - 7, //dy
      TILESIZE_X, //dw
      height //dh
    );
  },

  drawField = function drawField(x, y) {
    bctx.drawImage(
      tileset, //img
      ((x + y) % 2) * TILESIZE_X, //sx
      TILESIZE_X, //sy
      TILESIZE_X, //sw
      TILESIZE_X, //sh
      x * TILESIZE_X, //dx
      y * TILESIZE_X, //dy
      TILESIZE_X, //dw
      TILESIZE_X //dh
    );
  },

  getTilesIndex = function getTilesIndex(pos) {
    return [
      Math.floor(pos[0] / TILESIZE_X),
      Math.floor(pos[1] / TILESIZE_X)
    ];
  },

  zCompare = function zCompare(a, b) {
    return b.pos[1] - a.pos[1];
  },

  drawMap = function drawMap(isAnimationFrame, x, y, len, entityTilesIndex) {
    entities.sort(zCompare);

    for (y = 0; y < map2DArray[0].length; y++) {
      for (x = 0; x < map2DArray.length; x++) {
        if (map2DArray[x][y]) {
          drawField(x, y);
        } else {
          drawWall(x, y);
        }
      }
    }

    len = entities.length;

    while (len--) {
      drawEntity(entities[len], isAnimationFrame);

      entityTilesIndex = getTilesIndex(entities[len].pos);

      drawWall(entityTilesIndex[0],     entityTilesIndex[1] + 1, 16);
      drawWall(entityTilesIndex[0] - 1, entityTilesIndex[1] + 1, 16);
      drawWall(entityTilesIndex[0] + 1, entityTilesIndex[1] + 1, 16);
    }
  },

  /**
   * Just some color jittering (for now)
   * @param {Number} type e.g. JITTER
   */
  glitch = function glitch(canvas, ctx, obj, data, i) {
    ctx  = canvas.getCtx();
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
  })([], 200),

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
        WIDTH  / 1.2 + f[0] * z * WIDTH,
        HEIGHT / 2.5 + f[1] * z * HEIGHT,
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

  getAccDirection = function getAccDirection(entity, acc, res) {
    acc = entity.acc;
    res = [Math.sign(acc[0]), Math.sign(acc[1])];

    return !res[0] && !res[1] ? 0 : res;
  },

  setUpdater = function setUpdater(fn) {
    updater = fn;
  },

  updateEntityDecision = function updateEntityDecision(entity, route, target) {
    target = entity.target;

    if (target) {
      route = aStar(
        getTilesIndex(entity.pos),
        getTilesIndex(target.pos),
        map2DArray,
        {
          'range': 1
        }
      );

      if (route && route[0]) {
        entity.acc[0] += ((route[0][0] * TILESIZE_X + (TILESIZE_X>>1)) - entity.pos[0]);
        entity.acc[1] += ((route[0][1] * TILESIZE_X + (TILESIZE_X>>1)) - entity.pos[1]);

        norm(entity.acc);

        if (DEBUG) {
          entity.route = route;
        }
      }
    }
  },

  updateEntitySpeedAxis = function updateEntitySpeedAxis(entity, axis, axisSpd) {
    axisSpd  = entity.spd[axis];
    axisSpd += entity.acc[axis];
    axisSpd *= entity.cfg.friction;

    // Round it to zero if its close enough.
    axisSpd  = Math.abs(axisSpd) < ZERO_LIMIT ? 0 : axisSpd;

    entity.spd[axis] = axisSpd;
  },

  updateEntityPosition = function updateEntityPosition(entity, spd, pos, cfg, tilesIndex) {
    pos   = entity.pos;
    spd   = entity.spd;
    cfg   = entity.cfg;

    updateEntitySpeedAxis(entity, 0);
    updateEntitySpeedAxis(entity, 1);

    setEntityState(entity, getAccDirection(entity) ? 'moving' : 'idling');

    add(pos, spd);

    tilesIndex = getTilesIndex(pos);

    // Handle collisions.
    if (!map2DArray[tilesIndex[0]][tilesIndex[1]]) {
      if (cfg.fragile) {
        setEntityState(entity, 'breaking', 12, removeEntity.bind(0, entity));
        return;
      }

      pos[0] -= spd[0];

      tilesIndex = getTilesIndex(pos);

      if (map2DArray[tilesIndex[0]][tilesIndex[1]]) {
        return;
      }

      pos[0] += spd[0];
      pos[1] -= spd[1];

      tilesIndex = getTilesIndex(pos);

      if (map2DArray[tilesIndex[0]][tilesIndex[1]]) {
        return;
      }

      pos[0] -= spd[0];
    }

    // Set direction of entities, to draw them rigth.
    if (entity === player) {
      norm(sub(set(player.dir, mouseCoords), player.pos));
    } else {
      norm(set(entity.dir, entity.spd));
    }
  },

  teleport = function teleport(apply, code, finished, direction, pos) {
    direction = direction || getAccDirection(player);
    apply     = direction && apply;

    if (!apply) {
      return;
    }

    pos = player.pos;

    if (finished) {
      pos[0] += direction[0] * 40;
      pos[1] += direction[1] * 40;
    } else {
      setEntityState(player, 'tping', 12, teleport.bind(0, 1, 0, 1, direction));
    }
  },

  updateEntityCounter = function updateEntityCounter(entity) {
    if (entity.cnt) {
      entity.cnt--;

      if (!entity.cnt) {
        entity.cntFn.apply(0, entity.cntPar);

        setEntityState(entity, 'idling');
      }
    }
  },

  updateEntity = function updateEntity(entity, command, entityCommands) {
    updateEntityCounter(entity);

    entityCommands = entity.cmd;

    while (entityCommands.length) {
      command = entityCommands.shift();
      command(entityCommands.shift(), entityCommands.shift());
    }

    if (entity.cnt) {
      return;
    }

    updateEntityDecision(entity);
    updateEntityPosition(entity);
  },

  updateGame = function updateGame(isAnimationFrame, len) {
    len = entities.length;

    while (len--) {
      updateEntity(entities[len]);
    }

    drawMap(isAnimationFrame);
  },

  updateIntro = function updateIntro() {
    starField();
    bctx.save();
    bctx.setTransform(4, 0, 0, 4, 0, 0);
    bctx.drawImage(images[6], 0, 18);
    bctx.drawImage(images[7], 30, 0);
    bctx.setTransform(3, 0, 0, 3, 0, 0);
    bctx.drawImage(images[8], 4, 4);
    bctx.restore();
    text('START GAME', 14, 100, 2, aFrames);
    glitch(buffer);
  },

  /**
   * rendering loop
   */
  updateLoop = function updateLoop(timestamp, isFrame, isAnimationFrame) {
    frames  = Math.floor(timestamp / TIME_UNIT);
    aFrames = Math.floor(timestamp / ANIMATION_TIME_UNIT);

    isFrame           = frame   !== frames;
    isAnimationFrame  = aFrame  !== aFrames;

    if (isFrame) {
      frame   = frames;
      aFrame  = aFrames;

      bctx.fillStyle = '#000';
      bctx.fillRect(0, 0, WIDTH, HEIGHT);

      updater(isAnimationFrame);

      mctx.drawImage(buffer, 0, 0, STAGE_SCALE * WIDTH, STAGE_SCALE * HEIGHT);
    }

    win.requestAnimationFrame(updateLoop);
  },

  startLoop = function startLoop() {
    updateLoop();
  },

  getCode = function getCode(event) {
    return event.pageX ? SHOOT : event.keyCode || event.which;
  },

  setCommand = function setCommand(event, apply, code, command) {
    apply   = APPLY_TYPES.indexOf(event.type) !== -1;
    code    = getCode(event);
    command = applied[code]^apply && commands[code];

    if (!command) {
      return;
    }

    player.cmd.push(command, apply, code);

    applied[code] = apply;

    event.preventDefault();
  },

  createImage = function createImage(src, image) {
    image     = new win.Image();
    image.src = src;

    return image;
  },

  accelerate = function accelerate(apply, code) {
    sub(player.acc, player.mov);

    if (apply) {
      player.movs.push(DIRECTIONS[code]);
    } else {
      remove(player.movs, DIRECTIONS[code]);
    }

    add(player.acc, div(norm(sum(zero(player.mov), player.movs)), 2));
  },

  shoot = function shoot(apply) {
    if (!apply) {
      return;
    }

    createEntity(player.pos, bulletCfg, mul(player.dir.slice(), 3));
  },

  setCommands = function setCommands(keyCode) {
    for (keyCode in DIRECTIONS) {
      commands[keyCode] = accelerate;
    }

    commands[SPACE] = teleport;
    commands[SHOOT] = shoot;
  },

  /**
   * Creates different animations based on the original
   * player spritesheet.
   *
   * 1 - copy original sheet
   * 2 - add extra states
   *
   * @param {Image} img
   * @return {HTMLCanvasElement}
   */
  createPlayerSprites = function createPlayerSprites(cfg, img, canvas, ctx, x, i, w, h, frames) {
    img       = cfg.img;
    h         = img.height + cfg.size;
    canvas    = createCanvas(img.width, 2 * h);
    ctx       = canvas.getCtx();
    frames    = cfg.tping.frames;

    ctx.drawImage(img, 0, 0);

    // Create the TP animation.
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

  setScreen = function setScreen(newScreen) {
    screen = newScreen;

    if (screen) {
      setCommands();
    }

    setUpdater(updaters[screen]);
  },

  /**
   * @param {Event} event
   */
  onmousemove = function onmousemove(event) {
    mouseCoords[0] = Math.floor((event.pageX - main.offsetLeft)  / STAGE_SCALE);
    mouseCoords[1] = Math.floor((event.pageY - main.offsetTop)   / STAGE_SCALE);
  },

  onclick = function onclick() {
    setScreen(1);
  },

  init = function init(cursor, cctx, cursorImg, len) {
    // Set images created by img.js
    len = win.img.length;

    while (len--) {
      images.unshift(createImage(win.img[len]));
    }

    // Setup cursor.
    cursorImg = images[2];
    cursor    = createCanvas(32, 32);
    cctx      = cursor.getCtx();

    cctx.drawImage(cursorImg, 0, 0, 32, 32);
    document.body.style.cursor = 'url("' + cursor.toDataURL() + '") 16 16, auto';

    //
    // Setup main canvas.
    //
    main    = createCanvas(STAGE_SCALE * WIDTH, STAGE_SCALE * HEIGHT);
    mctx    = main.getCtx();

    doc.body.appendChild(main);

    buffer  = createCanvas();
    bctx    = buffer.getCtx();

    //
    // Define possible updaters.
    //
    updaters = [
      updateIntro,
      updateGame
    ];


    monsterCfg = createEntityConfig(
      images[3],
      0,
      {
        'friction' : 0.5
      }
    );

    bulletCfg = createEntityConfig(
      images[0],
      [['breaking']],
      {
        'friction' : 0.99,
        'rotating' : 1,
        'fragile'  : 1
      }
    );

    //
    // (MAP_SIZE_X * TILESIZE_X) >> 1 ===> [160, 160]
    // there should always be some room in the center
    //
    playerCfg = createEntityConfig(
      images[4],
      [
        ['idling', 6],
        ['moving'],
        ['tping']
      ]
    );

    playerCfg.img = createPlayerSprites(playerCfg);
    player        = createEntity([160, 160], playerCfg);
    player.movs   = [];
    player.mov    = [0, 0];

    abcImage        = images[1];
    tileset         = images[5];
    win.onclick     = onclick;
    win.onmousemove = onmousemove;
    main.onmouseup  = main.onmousedown = win.onkeydown = win.onkeyup = setCommand;

    map2DArray = mapGen(MAP_SIZE_X, MAP_SIZE_Y);

    setScreen(screen);

    startLoop();
  };

win.onload = init;

if (DEBUG) {
  var
    origOnload = win.onload,

    ESC = 27,
    B   = 66,
    C   = 67,
    V   = 86,
    X   = 88,

    debugInit = function debugInit() {
      origOnload();

      var
        origRequestAnimationFrame = win.requestAnimationFrame,

        origOnkeyDown = win.onkeydown,

        debugOnkeydown = function debugOnkeydown(event) {
          var
            code = getCode(event);

          origOnkeyDown(event);

          //
          // Toggle debug with V
          //
          if (code === V) {
            setDebug();
          }

          if (!DEBUG) {
            return;
          }

          //
          // By pushing the `esc` key, you can land in sort of debug
          // mode for the whole updateLoop. The execution will step
          // by pressing the `esc` again.
          //
          if (code === ESC || code === B) {
            setDebug('break', true);

            win.requestAnimationFrame = function () {};

            updateLoop();
          }

          //
          // Continue execution by pressing C
          //
          if (code === C) {
            setDebug('break', false);

            win.requestAnimationFrame = origRequestAnimationFrame;
            win.requestAnimationFrame(updateLoop);
          }

          //
          // Add a monster under the cursor.
          //
          if (code === X) {
            createMonster(mouseCoords);
          }
        };

      win.onkeydown = debugOnkeydown;
    };

  win.onload = debugInit;
}

//
// GRUNT WILL REMOVE FROM HERE, DO NOT REMOVE THIS!
//
// On build the previous comment and everything after
// will be removed automatically by `replace` grunt task.
//
var
  reset = function reset() {
    updaters  = [];
    images    = [];
    applied   = {};
    commands  = {};
    entities  = [];

    init();
  };
