/* globals
  DEBUG,
  VEC_UNIT,
  aStar,
  getNeighborNodes,
  add,
  dist,
  div,
  mul,
  norm,
  len,
  rad,
  set,
  setDebug,
  sub,
  sum,
  zero,
  drawDebugMap
*/

/* exported
  reset
*/

var
  APPLY_TYPES         = ['keydown', 'mousedown'],
  ANIMATION_TIME_UNIT = 80,
  TIME_UNIT           = 20,
  MAP_SIZE_X          = 32,
  MAP_SIZE_Y          = 22,
  TILESIZE_X          = 16, // everything is square right now
  SPACE               = 32,
  ZERO_LIMIT          = 0.05,
  SHOOT               = 1,
  STAGE_SCALE         = 3,

  DEFAULT_AMMO_AMOUNT       = 100,
  ENEMY_ENGAGEMENT_DISTANCE = 150,

  win               = window,
  doc               = document,
  WIDTH             = 320,
  HEIGHT            = 240,
  id                = 0,
  frames            = 0,
  aFrames           = 0,
  screen            = 0, // 0 =  title, 1 = game, etc
  alphabet          = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:!-%',
  offsetX           = 0,
  offsetY           = 0,
  shakeDuration     = 0,
  currentAmmoAmount = DEFAULT_AMMO_AMOUNT,

  updaters          = [],
  images            = [],
  applied           = {},
  commands          = {},
  entities          = [],
  initializers      = [],
  mouseCoords       = [],
  spawnPositions    = [],
  startingPositions = [MAP_SIZE_X * TILESIZE_X / 2, MAP_SIZE_Y * TILESIZE_X / 2],
  healthBarColors   = ['#ac3232','#df7126', '#99e550'],
  DIRECTIONS = {
    '68' : VEC_UNIT[0], // d
    '83' : VEC_UNIT[1], // s
    '65' : VEC_UNIT[2], // a
    '87' : VEC_UNIT[3]  // w
  },

  totalTileCount,
  totalGlitchedTiles,
  enemyCount,
  PLAYER = 1,
  MONSTER = 2,
  EXPLOSION = 3,
  BULLET = 4,
  score        = 0,
  currentLevel = 0,
  mctx,
  bctx,
  main,
  frame,
  aFrame,
  buffer,
  cursor,
  player,
  playerCfg,
  bulletCfg,
  monsterCfg,
  explosionCfg,
  updater,
  tileset,
  abcImage,
  map2DArray,
  inputHandler,

  getId = function getId() {
    return ++id;
  },

  remove = function remove(arr, item) {
    arr.splice(arr.indexOf(item), 1);
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
    cfg.offY      = cfg.offY      || 0;
    cfg.hSize     = cfg.size       / 2;
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
    //
    // `cfg` can be a shared reference across entities
    //
    entity = {
      'id'    : getId(),
      'cfg'   : cfg,
      'hp'    : cfg.hp,
      'dmg'   : cfg.dmg,
      'z'     : 0,
      'dZ'    : 0,
      'pos'   : pos.slice(),
      'spd'   : spd || [0, 0],
      'dir'   : [1, 0],
      'acc'   : [0, 0],
      'cmd'   : []
    };

    if (cfg.type === MONSTER) {
      enemyCount++;
    }
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

    for (;ax !== bx && (ax > 0) && (ay > 0) && (ax < arr.length - 1) && (ay < arr[ax].length - 1); ax+= xIncrement) {
      arr[ax][ay] = arr[ax][ay] || 2;
    }

    for (;ay !== by && (ax > 0) && (ay > 0) && (ax < arr.length - 1) && (ay < arr[ax].length - 1); ay+= yIncrement) {
      arr[ax][ay] = arr[ax][ay] || 2;
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
   * @param {Number} iterationsLeft safety feature to prevent stack issues
   */
  createRoom = function createRoom(arr, xc, yc, w, h, color, iterationsLeft, totalIterations, circular, sizeX, sizeY, i, j, xi, yj, x, y, m, n, totalRoomTiles) {
    if (w * h > 3) { // single tile wide rooms are stupid
      totalRoomTiles = i = 0;

      // center must not be outside of our map:
      if (xc < 0 || xc > sizeX || yc < 0 || yc > sizeY) {
        return;
      }



      // find top left corner of new room
      x = Math.min(Math.max(xc - (w >> 1), 0), sizeX - w);
      y = Math.min(Math.max(yc - (h >> 1), 0), sizeY - h);
      if (w * h <= 9) {
        circular = false;
        color = 2;
      }

      while (i/*++*/ < w && (xi = x + i) < sizeX - 1) {
        j = 0;
        while (j/*++*/ < h && y + j < sizeY - 1) {
          try {
            if (arr[xi] && (
              !arr[xi + 1][y + j + 1] &&
              !arr[xi + 0][y + j + 1] &&
              !arr[xi + 1][y + j + 0]
            )) {
              if (circular) {
                if (dist([xc, yc], [xi, y + j]) < (w / 2)) {
                  arr[xi][y + j] = arr[xi][y + j] || color;
                  totalRoomTiles++;
                }
              } else {
                arr[xi][y + j] = arr[xi][y + j] || color;
                totalRoomTiles++;
              }
            }
          } catch (e) {
            console.error(e);
          }
          j++;
        }
        i++;
      }


      if (totalRoomTiles > 9 && totalIterations !== iterationsLeft) {
        spawnPositions.push([xc * TILESIZE_X, yc * TILESIZE_X]);
      }
      totalTileCount += totalRoomTiles;
      // spawn more rooms
      if (iterationsLeft) {
        i = 4;
        while (i--) {
          // TODO: fiddle around with those values
          // xi = Math.round(iterationsLeft * 2 + (1 - Math.random())) + 1;
          xi = iterationsLeft * 2 + 1;
          createRoom(
            arr,
            m = (xc + xi * ((+(Math.random() > 0.5) || -1) * 1.1) | 0), // (+(Math.random() > 0.5) || -1) -> 1 || -1
            n = (yc + xi * ((+(Math.random() > 0.5) || -1) * 1.1) | 0),
            xi,
            xi,
            1,
            iterationsLeft - 1,
            totalIterations,
            true,
            sizeX,
            sizeY
          );
          // if (xi * yj > 1) {
          try {
            drawPath(arr, xc, yc, m, n);
          } catch (e) {
            console.warn(e);
          }
          // }
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

    //create center room
    createRoom(arr, sizeX >> 1, sizeY >> 1, 9, 9, 1, 3, 3, true, sizeX, sizeY);
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

    if (entity.hp) {
      bctx.fillText(entity.hp, entity.pos[0] - TILESIZE_X/2, entity.pos[1] - TILESIZE_X);
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

  drawEntity = function drawEntity(entity, stepFrame, cfg, frame, frameCfg, healthFraction)  {
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

    // moving 'entity.pos[0] - cfg.hSize' to a var increases zip size :(
    bctx.drawImage(
      cfg.cnv,
      entity.pos[0] - cfg.hSize,                      // dx
      entity.pos[1] + cfg.offY - cfg.size - entity.z  // dy
    );

    if (entity === player) {
      bctx.save();
      // a bit hacky :/
      bctx.translate(entity.pos[0] + 2, entity.pos[1] - 5);
      bctx.rotate(rad(sub(player.pos.slice(), mouseCoords)) + Math.PI);
      // rifle should not change hands & stay on one side
      if (entity.dir[0] < 0) {
        bctx.transform(1, 0, 0, -1, -3, 0);
      }
      bctx.drawImage(
        images[6],
        0,
        -3
      );
      bctx.restore();
    }

    if (!entity.cnt && entity.hp) {
      bctx.fillStyle = '#000';
      bctx.fillRect(entity.pos[0] - cfg.hSize | 0, entity.pos[1] | 0, 16, 3);
      healthFraction = entity.hp / cfg.hp;
      bctx.fillStyle = healthBarColors[healthFraction * 2 | 0];
      bctx.fillRect(entity.pos[0] - cfg.hSize + 1 | 0, entity.pos[1] + 1 | 0, 14 * healthFraction, 1);
    }

    if (DEBUG) {
      drawEntityDebugInfo(entity);
    }

    entity.frame += stepFrame ? 1 : 0;
  },

  drawWall = function drawWall(x, y, height, opt_ctx) {
    //
    // Meh, maybe this is not right here, but ATM it does what I need
    //
    if (map2DArray[x] && map2DArray[x][y] > 0) {
      return;
    }

    height = height || 32;

    (opt_ctx || bctx).drawImage(
      tileset, //img
      48, //sx
      9, //sy
      TILESIZE_X, //sw
      height, //sh
      x * TILESIZE_X, //dx
      y * TILESIZE_X - 7, //dy
      TILESIZE_X, //dw
      height //dh
    );
  },

  drawField = function drawField(x, y, tileType, opt_ctx) {
    (opt_ctx || bctx).drawImage(
      tileset, //img
      (tileType - 1) * TILESIZE_X, //sx
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
          drawField(x, y, map2DArray[x][y]);
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
  glitch = function glitch(canvas, ctx, obj, data, i, glitchiness) {
    ctx  = canvas.getCtx();
    obj  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    data = obj.data;
    i    = data.length;
    glitchiness = totalGlitchedTiles / totalTileCount;

    while (i--) {
      switch (i%4) {
        case 1: {
          data[i] = data[i-4];
          break;
        }
        // TODO: unsure if this is a good idea
        case 0: {
          data[i] = data[i - (glitchiness * 4 | 0) * WIDTH];
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
  starField = function starField(i, f, z, width, height) {
    bctx.fillStyle = '#fff';
    i      = field.length;
    width  = WIDTH / 4;
    height = HEIGHT / 4;

    while (i--) {
      f = field[i];

      if ((z = f[2]) < 0.5) {
        field[i] = star(); // spawn new stars if they fade out
      }

      bctx.fillRect(
        width  / 1.2 + f[0] * z * width,
        height / 2.5 + f[1] * z * height,
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

  /**
   * resets entitiy list, spawnPositions, health and ammo
   * creates a new map with monsters
   */
  createLevel = function createLevel (difficulty, tmp) {
    entities      = [];
    player        = createEntity(startingPositions, playerCfg);
    player.movs   = [];
    player.mov    = [0, 0];

    enemyCount        = totalTileCount = totalGlitchedTiles = 0;
    spawnPositions    = [];
    player.hp         = playerCfg.hp;
    currentAmmoAmount = DEFAULT_AMMO_AMOUNT;
    map2DArray        = mapGen(MAP_SIZE_X, MAP_SIZE_Y);

    if (difficulty) {
      tmp = [];
      spawnPositions.forEach(function (position) {
        tmp = tmp.concat(getNeighborNodes(
          [
            // pixels to tiles:
            position[0] / TILESIZE_X,
            position[1] / TILESIZE_X
          ],
          map2DArray,
          1
        ).slice(0, difficulty));
      });
      // tiles to pixels:
      tmp.forEach(function (a) {
        a[0] *= TILESIZE_X;
        a[1] *= TILESIZE_X;
      });
      spawnPositions = spawnPositions.concat(tmp);
    }

    spawnPositions.forEach(createMonster);
  },


  removeEntity = function removeEntity(entity) {
    remove(entities, entity);
    if (entity.cfg.type === MONSTER && !--enemyCount) {
      createLevel(++currentLevel);
    }
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

  updateEntityDirection = function updateEntityDirection(entity) {
    // Set direction of entities, to draw them rigth.
    if (entity === player) {
      norm(sub(set(player.dir, mouseCoords), player.pos));
    } else {
      norm(set(entity.dir, entity.spd));
    }
  },

  shoot = function shoot(apply, bulletSpd, bullet) {
    if (!apply || !currentAmmoAmount) {
      return;
    }

    currentAmmoAmount--;

    bulletSpd     = mul(player.dir.slice(), 4);
    bullet        = createEntity(add(player.pos.slice(), bulletSpd), bulletCfg, bulletSpd);
    updateEntityDirection(bullet);

    bullet.z      = 7;
    bullet.dZ     = bullet.z * len(bulletSpd) / dist(mouseCoords, bullet.pos);

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

  setCommands = function setCommands(keyCode) {
    for (keyCode in DIRECTIONS) {
      commands[keyCode] = accelerate;
    }

    commands[SPACE] = teleport;
    commands[SHOOT] = shoot;
  },

  setScreen = function setScreen(newScreen) {
    //
    // Remove all defined handlers.
    //
    screen = newScreen;

    initializers[screen]();

    updater = updaters[screen];
  },

  /**
   * @param {Event} event
   */
  setMouseCoords = function setMouseCoords(event) {
    mouseCoords[0] = Math.floor((event.pageX - main.offsetLeft)  / STAGE_SCALE) - offsetX;
    mouseCoords[1] = Math.floor((event.pageY - main.offsetTop)   / STAGE_SCALE) - offsetY;
  },

  getCode = function getCode(event) {
    return event.pageX ? SHOOT : event.keyCode || event.which;
  },

  setCommand = function setCommand(event, apply, code, command) {
    if (event.pageX) {
      setMouseCoords(event);
    }

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

  //ugly copypaste ;/
  initIntro = function initIntro() {
    inputHandler = function (event) {
      if (APPLY_TYPES.indexOf(event.type) < 0) {
        setScreen(1);
      }
    };
  },

  initGameInfo = function initGameInfo() {
    inputHandler = function (event) {
      if (APPLY_TYPES.indexOf(event.type) < 0) {
        setScreen(2);
      }
    };
  },

  initGame = function initGame() {
    createLevel();
    setCommands();
    inputHandler = setCommand;
  },

  initGameOver = function initGameOver() {
    // Not much now... remove if later stays the same.
    initIntro();
  },

  onUserInput = function onUserInput(event) {
    inputHandler(event);
  },

  gameOver = function gameOver() {
    setScreen(3);
  },

  updateEntityDecision = function updateEntityDecision(entity, route) {
    if (entity.target) {
      // glitches shouldn't engage the player if he's too far away
      if (dist(entity.pos, entity.target.pos) > ENEMY_ENGAGEMENT_DISTANCE) {
        entity.acc[0] = 0;
        entity.acc[1] = 0;
        route = null;
      } else {
        route = aStar(
          getTilesIndex(entity.pos),
          getTilesIndex(entity.target.pos),
          map2DArray,
          {
            'range': 1
          }
        );
      }

      if (route && route[0]) {
        entity.acc[0] += ((route[0][0] * TILESIZE_X + (TILESIZE_X>>1)) - entity.pos[0]);
        entity.acc[1] += ((route[0][1] * TILESIZE_X + (TILESIZE_X>>1)) - entity.pos[1]);

        norm(entity.acc);

      }
      if (DEBUG) {
        entity.route = route;
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

  isClose = function isClose(bulletPos, entity, pos) {
    pos     = entity.pos.slice();
    pos[1] -= entity.cfg.hSize;

    return dist(bulletPos, pos) < entity.cfg.hSize;
  },

  explode = function explode(entity) {
    setEntityState(entity, 'exploding', 12, removeEntity.bind(0, entity));
  },

  /**
   * @param  {Object} targetEntity
   * @param  {Object} sourceEntity not sure if needed
   */
  damage = function damage (targetEntity, sourceEntity, explosion) {
    // if (targetEntity !== player) {
    //   return;
    // }
    score += sourceEntity.dmg;
    if (targetEntity.hp && (targetEntity.hp -= sourceEntity.dmg) <= 0) {
      explode(targetEntity);
      explosion = createEntity(targetEntity.pos.slice(), explosionCfg);
      setEntityState(explosion, 'exploding', 24, removeEntity.bind(0, explosion));

      // make the canvas wobble:
      shakeDuration = Math.min(shakeDuration + 20, 70);

    }
    if (player.hp <= 0) {
      gameOver();
    }
  },

  updateEntityPosition = function updateEntityPosition(entity, spd, pos, cfg, tilesIndex, len) {
    pos   = entity.pos;
    spd   = entity.spd;
    cfg   = entity.cfg;

    entity.z -= entity.dZ;
    updateEntitySpeedAxis(entity, 0);
    updateEntitySpeedAxis(entity, 1);

    setEntityState(entity, getAccDirection(entity) ? 'moving' : 'idling');
    add(pos, spd);
    tilesIndex = getTilesIndex(pos);

    if (entity.cfg.type === MONSTER && Math.random() > 0.7 && frames % 5 === 0) {
      if (map2DArray[tilesIndex[0]][tilesIndex[1]] !== 3) {
        totalGlitchedTiles++;
        map2DArray[tilesIndex[0]][tilesIndex[1]] = 3;
      }
    }


    if (cfg.fragile) {
      len = entities.length;

      while (len--) {
        if (player !== entities[len] && entity !== entities[len] && entities[len].hp > 0 && isClose(entity.pos, entities[len])) {
          add(entities[len].spd, mul(entity.dir.slice(), 10));
          damage(entities[len], entity);
          return explode(entity);
        }
      }

      if (entity.z < 0) {
        return explode(entity);
      }
    }

    // entitites damaging the player:
    if (entity !== player && entity.hp > 0 && dist(player.pos, entity.pos) < 8) {
      damage(player, entity);
    }

    if (!map2DArray[tilesIndex[0]] || !map2DArray[tilesIndex[0]][tilesIndex[1]]) {
      if (cfg.fragile) {
        return explode(entity);
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

  },

  updateEntityCounter = function updateEntityCounter(entity) {
    if (entity.cnt) {
      entity.cnt--;

      if (!entity.cnt) {
        entity.cntFn.apply(0, entity.cntPar);
      }
    } else {
      return 1;
    }
  },

  //this is hacky, sry
  splashDamage = function splashDamage(entity, i) {
    i = entities.length;
    while (i--) {
      if (entities[i] !== entity && entities[i].hp > 0 && dist(entities[i].pos, entity.pos) < 16) {
        damage(entities[i], entity);
      }
    }
  },

  updateEntity = function updateEntity(entity, command, entityCommands) {
    if (!updateEntityCounter(entity)) {
      // this is also hacky
      if (entity.hp === Infinity) {
        splashDamage(entity);
      }
      return;
    }

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
    updateEntityDirection(entity);
  },

  drawUI = function drawUI() {
    bctx.save();
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    text('AMMO:' + currentAmmoAmount, 5, 5, 0);
    text('GLITCHINESS:' + Math.floor(totalGlitchedTiles / totalTileCount * 100) + '%', 5, 12, 0);
    bctx.restore();
  },

  updateGame = function updateGame(isAnimationFrame, len) {
    len = entities.length;

    while (len--) {
      updateEntity(entities[len]);
    }

    drawMap(isAnimationFrame);
    drawUI();
    glitch(buffer);
  },

  updateIntro = function updateIntro() {
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    bctx.save();
    // bctx.globalAlpha = 0.9;
    bctx.drawImage(buffer, 0, 0);
    bctx.setTransform(4, 0, 0, 4, 0, 0);
    starField();
    bctx.drawImage(images[8], 0, 18);
    bctx.drawImage(images[9], 30, 0);
    bctx.setTransform(3, 0, 0, 3, 0, 0);
    bctx.drawImage(images[10], 4, 4);
    bctx.restore();
    text('START GAME', 14, 100, 2, aFrames);
    glitch(buffer);
  },

  updateGameInfo = function updateGameInfo() {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.fillRect(0, 0, WIDTH, HEIGHT);
    text('GLITCHES HAVE TAKEN OVER!', 20, 20);
    text('THEY LOOK LIKE THIS:', 20, 40);
    //sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
    bctx.drawImage(monsterCfg.img, 0, 16, 16, 16, 200, 30, 32, 32);
    text('SHOOT THEM!', 20, 60);
  },

  updateGameOver = function updateGameOver() {
    bctx.save();
    bctx.setTransform(2, 0, 0, 2, 0, 0);
    text('GAME OVER', 20, 20);
    text('' + score + ' POINTS', 20, 30);
    bctx.restore();
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

      if (screen === 2) { // map should move/keep the player centered
        offsetX = Math.max(
          Math.min(
            0,
            (-player.pos[0] | 0) +  (WIDTH >> 1)
          ),
          WIDTH - (MAP_SIZE_X * TILESIZE_X)
        );
        offsetY = Math.max(
          Math.min(
            0,
            (-player.pos[1] | 0) + (HEIGHT >> 1)
          ),
          HEIGHT - (MAP_SIZE_Y * TILESIZE_X)
        );
      }

      if (shakeDuration) {
        main.style.left = Math.sin(frames) * --shakeDuration + 'px';
        main.style.top = Math.cos(frames) * shakeDuration + 'px';
      }

      bctx.setTransform(1, 0, 0, 1, offsetX, offsetY);


      updater(isAnimationFrame);

      mctx.drawImage(buffer, 0, 0, STAGE_SCALE * WIDTH, STAGE_SCALE * HEIGHT);
    }

    win.requestAnimationFrame(updateLoop);
  },

  startLoop = function startLoop() {
    updateLoop();
  },

  createImage = function createImage(src, image) {
    image     = new win.Image();
    image.src = src;

    return image;
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
        x + cfg.hSize - w / 2, // dx
        img.height, // dy
        w, // dw
        cfg.size // dh
      );
    }

    return canvas;
  },

  init = function init(cctx, cursorImg, len) {
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
    //
    // Setup main canvas.
    //
    main    = createCanvas(STAGE_SCALE * WIDTH, STAGE_SCALE * HEIGHT);
    mctx    = main.getCtx();

    document.body.style.cursor = main.style.cursor = 'url("' + cursor.toDataURL() + '") 16 16, auto'; // firefox has issues with a body style cursor?

    doc.body.appendChild(main);

    buffer  = createCanvas();
    bctx    = buffer.getCtx();

    //
    // Define possible updaters.
    //
    updaters = [
      updateIntro,
      updateGameInfo,
      updateGame,
      updateGameOver
    ];

    initializers = [
      initIntro,
      initGameInfo,
      initGame,
      initGameOver
    ];

    explosionCfg = createEntityConfig(
      images[3],
      [['idling', 6]],
      {
        'type'     : EXPLOSION,
        'size'     : 32,
        'hp'       : Infinity,
        'dmg'      : 2
      }
    );

    monsterCfg = createEntityConfig(
      images[4],
      [
        ['idling', 6],
        ['moving', 6]
      ],
      {
        'type'     : MONSTER,
        'friction' : 0.5,
        'hp'       : 20,
        'dmg'      : 2
      }
    );

    bulletCfg = createEntityConfig(
      images[0],
      [['exploding']],
      {
        'type'      : BULLET,
        'friction'  : 1,
        'rotating'  : 1,
        'fragile'   : 1,
        'offY'      : 8,
        'dmg'       : 5
      }
    );

    playerCfg = createEntityConfig(
      images[5],
      [
        ['idling', 6],
        ['moving'],
        ['tping']
      ],
      {
        'type' : PLAYER,
        'hp'   : 100
      }
    );

    playerCfg.img = createPlayerSprites(playerCfg);

    win.onmousemove = setMouseCoords;
    main.onmouseup  = main.onmousedown = win.onkeydown = win.onkeyup = onUserInput;
    abcImage        = images[1];
    tileset         = images[7];

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
    G   = 71,
    K   = 75,
    M   = 77,
    N   = 78,
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

          if (code === N) {
            var explosion = createEntity(mouseCoords, explosionCfg);
            setEntityState(explosion, 'exploding', 24, removeEntity.bind(0, explosion));
          }

          if (code === M) {
            drawDebugMap();
          }

          if (code === G) {
            gameOver();
          }

          if (code === K) {
            entities.filter(function (entity) {
              return entity.cfg.type === MONSTER;
            }).forEach(function (entity) {
              removeEntity(entity);
            });
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
