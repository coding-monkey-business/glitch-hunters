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
  drawDebugMap,
  jsfxr
*/

/* exported
  reset
*/

var
  APPLY_TYPES               = ['keydown', 'mousedown'],
  ANIMATION_TIME_UNIT       = 80,
  TIME_UNIT                 = 20,
  MAP_SIZE_X                = 32,
  MAP_SIZE_Y                = 22,
  TILESIZE_X                = 16, // everything is square right now
  SPACE                     = 32,
  ZERO_LIMIT                = 0.05,
  SHOOT                     = 1,
  STAGE_SCALE               = 3,
  DEFAULT_AMMO_AMOUNT       = 100,
  ENEMY_ENGAGEMENT_DISTANCE = 150,
  PLAYER                    = 1,
  MONSTER                   = 2,
  EXPLOSION                 = 3,
  BULLET                    = 4,
  AMMO                      = 5,
  ANTI_GLITCH_KIT           = 6,
  STAGE_STICKYNESS          = 10,

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
  score             = 0,
  currentLevel      = 0,
  currentAmmoAmount = DEFAULT_AMMO_AMOUNT,

  updaters          = [],
  images            = [],
  applied           = {},
  commands          = {},
  entities          = [],
  initializers      = [],
  mouseCoords       = [],
  margins           = [-480, -360],
  spawnPositions    = [],
  startingPositions = [MAP_SIZE_X * TILESIZE_X / 2, MAP_SIZE_Y * TILESIZE_X / 2],
  healthBarColors   = ['#ac3232','#df7126', '#99e550'],
  topScore          = localStorage.getItem('topScore'),

  DIRECTIONS = {
    '68' : VEC_UNIT[0], // d
    '83' : VEC_UNIT[1], // s
    '65' : VEC_UNIT[2], // a
    '87' : VEC_UNIT[3]  // w
  },

  createAudio = function createAudio(tones, audio) {
    audio = new Audio();
    audio.src = jsfxr(tones);
    return audio;
  },

  evenExplosionSfx  = createAudio([3,,0.29,0.44,0.56,0.0915,,0.0771,,,,,,,,,,-0.36,1,,,,,0.57]),
  oddExplosionSfx   = createAudio([3,0.05,0.51,0.67,0.25,0.05,,-0.3199,0.06,,,-0.72,0.56,,,0.42,0.6799,,1,-1,,,-1,0.5]),
  teleportSfx       = createAudio([2,,0.3429,,0.58,0.3034,,0.1785,,0.2982,0.4754,,,,,,,,0.77,,,,,0.57]),
  dropPickupSfx     = createAudio([0,,0.0884,0.3296,0.4575,0.4049,,,,,,0.2827,0.5488,,,,,,1,,,,,0.7]),
  shootSfx          = createAudio([
    3,,0.0847,0.5386,0.31,0.3093,,0.02,-0.0035,-0.4905,-0.6864,0.8999,
    -0.3426,0.2932,-0.6135,-0.3311,-0.4232,,0.4883,0.0005,0.1197,0.749,
    0.1926,0.79
  ]),

  totalTileCount,
  totalGlitchedTiles = [],
  totalShots,
  totalHits,
  enemyCount,
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
  ammoCfg,
  antiGlitchKitCfg,
  monsterCfg,
  explosionCfg,
  updater,
  tileset,
  abcImage,
  map2DArray,
  inputHandler,
  tweetTag,

  getId = function getId() {
    return ++id;
  },

  writeTopScore = function writeTopScore(d) {
    if (!topScore) {
      return;
    }

    d = doc.getElementById('l');

    if (!tweetTag) {
      tweetTag            = doc.createElement('a');
      tweetTag.innerHTML  = 'Tweet my record: ' + topScore;
      d.insertBefore(tweetTag, d.firstChild);
    }

    tweetTag.href =
      'https://www.twitter.com/intent/tweet?text=' +
      encodeURIComponent(
        'I\'ve made ' + topScore + ' points in glitch hunters! ' +
        '#glitchHunters #js13kgames by @cmonkeybusiness [@flo-, @p1100i]'
      );
  },

  roundToZero = function roundToZero(value) {
    return Math.abs(value) < ZERO_LIMIT ? 0 : value;
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
  createRoom = function createRoom(arr, xc, yc, w, h, color, iterationsLeft, totalIterations, circular, sizeX, sizeY, i, j, xi, x, y, m, n, totalRoomTiles) {
    if (w * h > 3) { // single tile wide rooms are stupid
      totalRoomTiles = i = 0;

      // center must not be outside of our map:
      if (xc < 0 || xc > sizeX || yc < 0 || yc > sizeY) {
        return;
      }

      // find top left corner of new room
      x = Math.min(Math.max(xc - (w >> 1), 1), sizeX - w);
      y = Math.min(Math.max(yc - (h >> 1), 1), sizeY - h);
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

          try {
            drawPath(arr, xc, yc, m, n);
          } catch (e) {
            console.warn(e);
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

    //create center room
    createRoom(arr, sizeX >> 1, sizeY >> 1, 9, 9, 1, 3, 3, true, sizeX, sizeY);
    return arr;
  },

  drawEntityDebugInfo = function drawEntityDebugInfo(entity, len) {
    bctx.fillStyle = '#000';
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

    if (entity.z > 1) {
      bctx.fillStyle = '#335';
      bctx.fillRect(entity.pos[0] - 3, entity.pos[1] - 1, 5, 2); // center point of entity, comment back in for debugging & stuff
    }

    if (entity === player && player.state !== 'tping') {
      bctx.save();
      // a bit hacky :/
      bctx.translate(entity.pos[0] + 2, entity.pos[1] - 5);
      bctx.save();
      bctx.rotate(rad(sub(player.pos.slice(), mouseCoords)) + Math.PI);
      // rifle should not change hands & stay on one side
      if (entity.dir[0] < 0) {
        bctx.transform(1, 0, 0, -1, -3, 0);
      }
      bctx.drawImage(
        images[8],
        0,
        -3
      );
      bctx.restore();
      if (player.say && --player.say[1] > 0) {
        text(player.say[0], - (player.say[0].length * 8)/2, -16, 3, frames);
      }
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

  tile = function tile(tilesIndex, val, tileRow) {
    tileRow = map2DArray[tilesIndex[0]];

    if (tileRow && val) {
      tileRow[tilesIndex[1]] = val;
    }

    return tileRow && tileRow[tilesIndex[1]];
  },

  drawWall = function drawWall(x, y, height, opt_ctx) {
    //
    // Meh, maybe this is not right here, but ATM it does what I need
    //
    if (tile([x, y])) {
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

  drawMap = function drawMap(isAnimationFrame, x, y, len, currentTile, entityTilesIndex) {
    entities.sort(zCompare);

    for (y = 0; y < map2DArray[0].length; y++) {
      for (x = 0; x < map2DArray.length; x++) {
        currentTile = tile([x, y]);
        if (currentTile) {
          drawField(x, y, currentTile);
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
    glitchiness = totalGlitchedTiles.length / totalTileCount;

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
   * @param  {HTMLAudioElement} audio
   */
  playSound = function playSound (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.play();
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
   * resets entitiy list, spawnPositions, health and ammo
   * creates a new map with monsters
   */
  createLevel = function createLevel(tmp) {
    entities      = [];
    player        = createEntity(startingPositions, playerCfg);
    player.movs   = [];
    player.mov    = [0, 0];
    player.tpCD   = 0;

    enemyCount        = totalTileCount = totalGlitchedTiles.length = 0;
    spawnPositions    = [];
    player.hp         = playerCfg.hp;
    currentAmmoAmount = DEFAULT_AMMO_AMOUNT;
    map2DArray        = mapGen(MAP_SIZE_X, MAP_SIZE_Y);
    monsterCfg.hp     = 20 + currentLevel * 2;

    if (currentLevel) {
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
        ).slice(0, currentLevel));
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

  setScreen = function setScreen(newScreen) {
    //
    // Remove all defined handlers.
    //
    screen = newScreen;

    initializers[screen]();

    updater = updaters[screen];
  },

  removeEntity = function removeEntity(entity, random) {
    remove(entities, entity);
    random = Math.random();

    if (entity.cfg.type === MONSTER) {
      // random drop:
      if (random < 0.33) {
        createEntity(entity.pos, ammoCfg);
      }
      if (random > 0.66) {
        createEntity(entity.pos, antiGlitchKitCfg);
      }
      if (!--enemyCount) {
        setScreen(1);
      }
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

    playSound(shootSfx);

    currentAmmoAmount--;
    totalShots++;

    bulletSpd     = mul(player.dir.slice(), 4);
    bullet        = createEntity(add(player.pos.slice(), bulletSpd), bulletCfg, bulletSpd);
    updateEntityDirection(bullet);

    bullet.z  = 7;
    bullet.dZ = bullet.z * len(bulletSpd) / dist(mouseCoords, bullet.pos);

  },

  teleport = function teleport(apply, code, finished, tpPos, safeGuard) {
    if (!apply) {
      return;
    }

    if (finished) {
      finished  = dist(tpPos, player.pos) < 60 && tile(getTilesIndex(tpPos));
      safeGuard = 300;

      while (!finished && safeGuard) {
        safeGuard--;
        sub(tpPos, player.dir);
        finished = dist(tpPos, player.pos) < 60 && tile(getTilesIndex(tpPos));
      }

      if (safeGuard > 0) {
        set(player.pos, tpPos);
      }

    } else if (!player.tpCD) {
      player.tpCD = 100;
      setEntityState(player, 'tping', 20, teleport.bind(0, 1, 0, 1, mouseCoords.slice()));
      playSound(teleportSfx);
    }
  },

  setCommands = function setCommands(keyCode) {
    for (keyCode in DIRECTIONS) {
      commands[keyCode] = accelerate;
    }

    commands[SPACE] = teleport;
    commands[SHOOT] = shoot;
  },

  /**
   * @param {Event} event
   */
  setMouseCoords = function setMouseCoords(event) {
    mouseCoords[0] = Math.floor((event.pageX - main.offsetLeft)  / STAGE_SCALE) - offsetX;
    mouseCoords[1] = Math.floor((event.pageY - main.offsetTop)   / STAGE_SCALE) - offsetY;
  },

  getInput = function getInput(event) {
    return [
      event.pageX ? SHOOT : event.keyCode || event.which,
      APPLY_TYPES.indexOf(event.type) !== -1,
      event
    ];
  },

  setCommand = function setCommand(event, apply, code, command) {
    if (event.pageX) {
      setMouseCoords(event);
    }

    event   = getInput(event);
    code    = event[0];
    apply   = event[1];
    command = applied[code]^apply && commands[code];

    if (!command) {
      return;
    }

    player.cmd.push(command, apply, code);

    applied[code] = apply;

    event[2].preventDefault();
  },

  screenSwitcher = function screenSwitcher(screenToSet, isMouse, event) {
    event = getInput(event);

    if (event[1] && (isMouse || event[0] === SPACE)) {
      setScreen(screenToSet);
    }
  },

  initIntro = function initIntro() {
    inputHandler = screenSwitcher.bind(0, 1, 1);
  },

  initGameInfo = function initGameInfo() {
    if (!currentLevel) {
      score = totalShots = totalHits = 0;
    }

    currentLevel++;
    inputHandler = screenSwitcher.bind(0, 2, 0);
  },

  initGame = function initGame() {
    createLevel();
    setCommands();
    inputHandler = setCommand;
  },

  initGameOver = function initGameOver() {
    // Not much now... remove if later stays the same.
    currentLevel = 0;

    if (score > topScore) {
      topScore = score;
      localStorage.setItem('topScore', topScore);
      writeTopScore();
    }

    inputHandler = screenSwitcher.bind(0, 1, 0);
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

        mul(norm(entity.acc), 1 + currentLevel / 8);
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
    axisSpd  = roundToZero(axisSpd);

    entity.spd[axis] = axisSpd;
  },

  isClose = function isClose(bulletPos, entity, pos) {
    pos     = entity.pos.slice();
    pos[1] -= entity.cfg.hSize;

    return dist(bulletPos, pos) < entity.cfg.hSize;
  },

  explode = function explode(entity) {
    entity.z = 0;
    setEntityState(entity, 'exploding', 12, removeEntity.bind(0, entity));
  },

  /**
   * @param  {Object} targetEntity
   * @param  {Object} sourceEntity not sure if needed
   */
  damage = function damage (targetEntity, sourceEntity, explosion) {
    score += sourceEntity.dmg;

    if (targetEntity.hp && (targetEntity.hp -= sourceEntity.dmg) <= 0) {
      explode(targetEntity);
      playSound(aFrames % 2 ? evenExplosionSfx : oddExplosionSfx);
      explosion = createEntity(targetEntity.pos.slice(), explosionCfg);
      setEntityState(explosion, 'exploding', 24, removeEntity.bind(0, explosion));

      // make the canvas wobble:
      shakeDuration = Math.min(shakeDuration + 20, 50);
    }

    if (player.hp <= 0) {
      gameOver();
    }
  },

  updateEntityPosition = function updateEntityPosition(entity, spd, pos, cfg, tilesIndex, entitiesLen, otherEntity) {
    pos   = entity.pos;
    spd   = entity.spd;
    cfg   = entity.cfg;

    entity.z -= entity.dZ;
    updateEntitySpeedAxis(entity, 0);
    updateEntitySpeedAxis(entity, 1);

    setEntityState(entity, len(spd) ? 'moving' : 'idling');
    add(pos, spd);
    tilesIndex = getTilesIndex(pos);

    if (entity.cfg.type === MONSTER && Math.random() > 0.7 && frames % 5 === 0) {
      if (tile(tilesIndex) !== 3) {
        totalGlitchedTiles.push(tilesIndex);
        score = Math.max(0, --score);
        tile(tilesIndex, 3);
      }
    }

    if (cfg.fragile) {
      entitiesLen = entities.length;

      while (entitiesLen--) {
        otherEntity = entities[entitiesLen];

        if (player !== otherEntity && entity !== otherEntity && otherEntity.hp > 0 && isClose(entity.pos, otherEntity)) {
          add(otherEntity.spd, mul(entity.dir.slice(), 10));
          totalHits++;

          damage(otherEntity, entity);

          return explode(entity);
        }
      }

      if (entity.z < 0) {
        return explode(entity);
      }
    }


    // monster drops
    if (dist(entity.pos, player.pos) < 8) {
      if (entity.cfg.type === AMMO) {
        removeEntity(entity);
        currentAmmoAmount += entity.cfg.amount;
        playSound(dropPickupSfx);
        player.say = [['GROOVY', 'OH YEAH!'][Math.random() * 2 | 0], 60];
      }

      if (entity.cfg.type === ANTI_GLITCH_KIT) {
        removeEntity(entity);
        entitiesLen = entity.cfg.amount;
        while (entitiesLen && totalGlitchedTiles.length) {
          score++;
          tile(totalGlitchedTiles.pop(), 1);
          entitiesLen--;
        }
        playSound(dropPickupSfx);
      }

      // entitites damaging the player:
      if (entity !== player && entity.hp > 0 && player.state !== 'tping') {
        damage(player, entity);
        player.say = ['OW!', 60];
      }
    }

    if (!tile(tilesIndex)) {
      if (cfg.fragile) {
        return explode(entity);
      }

      pos[0] -= spd[0];

      tilesIndex = getTilesIndex(pos);

      if (tile(tilesIndex)) {
        return;
      }

      pos[0] += spd[0];
      pos[1] -= spd[1];

      tilesIndex = getTilesIndex(pos);

      if (tile(tilesIndex)) {
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

  updatePlayerSpecifics = function updatePlayerSpecifics() {
    currentAmmoAmount += (!frames % 300) ? 1 : 0;
    player.tpCD = Math.max(0, --player.tpCD);
  },

  drawUI = function drawUI() {
    bctx.save();
    bctx.setTransform(1, 0, 0, 1, 0, 0);

    text('POINTS :' + score, 4, 4);
    text('AIM    :' + (totalShots === 0 ? 100 : Math.floor(totalHits / totalShots * 100)) + '%', 4, 13);
    text('GLITCH :' + Math.floor(totalGlitchedTiles.length / totalTileCount * 100) + '%', 4, 22);

    if (!player.tpCD) {
      text('BLINK - SPACE' , 200, 230);
    }

    text('AMMO:' + currentAmmoAmount, 4, 230);
    bctx.restore();
  },

  updateGame = function updateGame(isAnimationFrame, len, targetOffsetX, targetOffsetY) {
    // map should move/keep the player centered
    targetOffsetX = Math.max(
      Math.min(
        0,
        (-player.pos[0] | 0) + (WIDTH >> 1)
      ),
      WIDTH - (MAP_SIZE_X * TILESIZE_X)
    );

    offsetX = roundToZero(offsetX + (targetOffsetX - offsetX) / STAGE_STICKYNESS);

    targetOffsetY = Math.max(
      Math.min(
        0,
        (-player.pos[1] | 0) + (HEIGHT >> 1)
      ),
      HEIGHT - (MAP_SIZE_Y * TILESIZE_X)
    );

    offsetY = roundToZero(offsetY + (targetOffsetY - offsetY) / STAGE_STICKYNESS);

    bctx.setTransform(1, 0, 0, 1, offsetX, offsetY);

    len = entities.length;

    while (len--) {
      updateEntity(entities[len]);
    }

    updatePlayerSpecifics();

    drawMap(isAnimationFrame);
    glitch(buffer);
    drawUI();
  },

  updateIntro = function updateIntro() {
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    bctx.save();
    // bctx.globalAlpha = 0.9;
    bctx.drawImage(buffer, 0, 0);
    bctx.setTransform(4, 0, 0, 4, 0, 0);
    starField();
    bctx.drawImage(images[10], 0, 18);
    bctx.drawImage(images[11], 30, 0);
    bctx.setTransform(3, 0, 0, 3, 0, 0);
    bctx.drawImage(images[12], 2, 2);
    bctx.restore();
    text('START GAME', 8, 94, 2, aFrames);
    glitch(buffer);
  },

  updateGameInfo = function updateGameInfo() {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (currentLevel === 1) {
      text('GLITCHMONSTERS ARE TRYING', 10, 10);
      text('TO TAKE OVER THE WORLD!', 10, 20);
      text('THEY LOOK LIKE THIS:', 10, 40);
      //sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
      bctx.drawImage(monsterCfg.img, 0, 16, 16, 16, 190, 36, 16, 16);

      text('SHOOT THEM!', 10, 60);
      text('MOVE WITH WASD', 10, 70);

      text('PICK UP AMMO', 10, 90);
      bctx.drawImage(ammoCfg.img, 0, 0, 16, 16, 120, 86, 16, 16);

      text('AND ANTIGLITCH', 10, 100);
      bctx.drawImage(antiGlitchKitCfg.img, 0, 0, 16, 16, 140, 96, 16, 16);

    }

    text('LEVEL ' + currentLevel, (WIDTH >> 1) - 28, HEIGHT>>1);

    if (aFrames % 16 > 4) {
      text('- PRESS SPACE -', (WIDTH >> 1) - 65, (HEIGHT>>1) + 22);
    }

  },

  updateGameOver = function updateGameOver() {
    bctx.save();
    bctx.setTransform(2, 0, 0, 2, 0, 0);
    text('GAME OVER', 20, 20);
    text(score + ' POINTS', 20, 30);

    if (aFrames % 16 > 4) {
      text('- PRESS SPACE -', 14, 60);
    }
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

      if (shakeDuration) {
        main.style.marginLeft = (margins[0] + Math.sin(frames) * --shakeDuration) + 'px';
        main.style.marginTop  = (margins[1] + Math.cos(frames) * shakeDuration  ) + 'px';
      }

      updater(isAnimationFrame);

      mctx.drawImage(buffer, 0, 0, STAGE_SCALE * WIDTH, STAGE_SCALE * HEIGHT);
    }

    win.requestAnimationFrame(updateLoop);
  },

  startLoop = function startLoop() {
    updateLoop();
  },

  createImage = function createImage(src, onload, image) {
    image     = new win.Image();
    image.onload = onload;
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

  onImagesLoaded = function onImagesLoaded(cctx, cursorImg) {
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

    main.style.marginLeft = margins[0];
    main.style.marginTop  = margins[1];

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

    ammoCfg = createEntityConfig(
      images[6],
      [
        ['idling', 1]
      ],
      {
        'type'  : AMMO,
        'amount': 10
      }
    );

    antiGlitchKitCfg = createEntityConfig(
      images[5],
      [
        ['idling', 1]
      ],
      {
        'type'  : ANTI_GLITCH_KIT,
        'amount': 20
      }
    );

    playerCfg = createEntityConfig(
      images[7],
      [
        ['idling', 6],
        ['moving'],
        ['tping', 6]
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
    tileset         = images[9];

    writeTopScore();
    setScreen(screen);
    startLoop();
  },

  init = function init(len, outstanding) {
    // Set images created by img.js
    len = outstanding = win.img.length;

    while (len--) {
      // firefox still needs onload ... otherwise player & curser are invisible with an unprimed cache :/
      images.unshift(createImage(win.img[len], function () {
        if (!--outstanding) {
          onImagesLoaded();
        }
      }));
    }
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
    L   = 76,
    M   = 77,
    N   = 78,
    V   = 86,
    X   = 88,

    debugInit = function debugInit() {
      origOnload();
      // this is terrible ... but only debug ... so I guess we're fine
      window.setTimeout(function () {
        var
          origRequestAnimationFrame = win.requestAnimationFrame,

          origOnkeyDown = win.onkeydown,

          debugOnkeydown = function debugOnkeydown(event) {
            var
              input = getInput(event),
              code  = input[0];
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

            if (code === L) {
              if (Math.random() < 0.5) {
                createEntity(mouseCoords, ammoCfg);
              } else {
                createEntity(mouseCoords, antiGlitchKitCfg);
              }
            }
          };

        win.onkeydown = debugOnkeydown;
      }, 100);
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
    applied   = {};
    commands  = {};
    entities  = [];

    onImagesLoaded();
  };
