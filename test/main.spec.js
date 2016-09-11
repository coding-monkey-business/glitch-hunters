/* globals
  createEntity,
  createEntityConfig,
  dist,
  drawPath,
  entities,
  field,
  getAccDirection,
  getId,
  getTilesIndex,
  map2DArray : true,
  mapGen,
  MAP_SIZE_X,
  MAP_SIZE_Y,
  player,
  reset,
  removeEntity,
  set,
  setScreen,
  updater,
  updateEntityPosition
*/

/**
 * phantomjs does not have Math.sign ... yay
 */
Math.sign = function sign(a) {
  if (!a) {
    return 0;
  }

  return a / Math.abs(a);
};

var
  loaded,
  RIGHT = '68',
  DOWN  = '83',
  origCreateElement = document.createElement;

describe('main', function () {
  beforeEach(function (done) {
    var
      fakeImageObject = {
        'data' : {
          'length' : 0
        }
      },

      fakeContext = {
        'setTransform' : function setTransform() {
        },

        'restore' : function restore() {
        },

        'getImageData' : function getImageData() {
          return fakeImageObject;
        },

        'putImageData' : function putImageData() {
        },

        'save' : function save() {
        },

        'scale' : function scale() {
        },

        'rotate' : function rotate() {
        },

        'beginPath' : function beginPath() {
        },

        'moveTo' : function moveTo() {
        },

        'lineTo' : function lineTo() {
        },

        'stroke' : function stroke() {
        },

        'clearRect' : function clearRect() {
        },

        'fillRect' : function fillRect() {
        },
        'fillText' : function fillText() {

        },
        'translate' : function translate() {
        },

        'drawImage' : function drawImage() {
        }
      },

      fakeCanvas = {
        'toDataURL' : function toDataURL() {
          // Fake returning any of the images.
          return window.img[0];
        },
        'style' : {

        },
        'getContext' : function getContext() {
          return fakeContext;
        }
      },

      createKeyEvent = function createKeyEvent(isUp, keyCode) {
        return {
          'keyCode' : keyCode,
          'type'    : isUp ? 'keyup' : 'keydown',

          'preventDefault' : function preventDefault() {
          }
        };
      },

      fakeCreateElement = function fakeCreateElement() {
        if (arguments[0] === 'canvas') {
          return fakeCanvas;
        }

        return origCreateElement.apply(document, arguments);
      },

      fakeAppendChild = function fakeAppendChild() {
      },

      fakeRequestAnimationFrame = function fakeRequestAnimationFrame() {
      },

      setMapWithoutWalls = function setMapWithoutWalls() {
        var
          i,
          j;
        map2DArray = mapGen(MAP_SIZE_X, MAP_SIZE_Y);
        for (i = 0; i < map2DArray.length; i++) {
          for (j = 0; j < map2DArray[i].length; j++) {
            map2DArray[i][j] = 1;
          }
        }
      },

      update = function update() {
        var
          times = 20;

        while (times--) {
          updater();
        }
      };


    this.update             = update;
    this.createKeyUpEvent   = createKeyEvent.bind(0, true);
    this.createKeyDownEvent = createKeyEvent.bind(0, false);

    reset();
    setMapWithoutWalls();

    if (loaded) {
      done();
      return;
    }

    window.requestAnimationFrame  = fakeRequestAnimationFrame;
    document.body.appendChild     = fakeAppendChild;
    document.createElement        = fakeCreateElement;

    var
      origOnload = window.onload;

    window.onload = function () {
      origOnload();
      loaded = true;
      setScreen(1);
      done();
    };
  });

  describe('.getId', function () {
    it('should return newer ids on every call', function () {
      var oldId;
      expect(function () {
        oldId = getId();
      }).not.toThrow();
      expect(getId()).toBeGreaterThan(oldId);
    });
  });

  describe('title: field', function () {
    it('should be an array', function () {
      expect(field).toEqual(jasmine.any(Array));
      expect(field[0]).toEqual([
        jasmine.any(Number),
        jasmine.any(Number),
        jasmine.any(Number)
      ]);
    });
  });

  describe('map', function () {
    var arr = [],
      u;
    beforeEach(function () {
      arr.length = 5;

      var x = 5;
      while (x--) {
        arr[x] = [];
        arr[x].length = 5;
      }
    });

    it('drawPath should connect 2 points', function () {
      expect(function () {
        drawPath(arr, 1, 1, 3, 3);
      }).not.toThrow();
      expect(arr).toEqual(jasmine.arrayContaining([
        jasmine.arrayContaining([u, u, u, u, u]),
        jasmine.arrayContaining([u, 2, u, u, u]),
        jasmine.arrayContaining([u, 2, u, u, u]),
        jasmine.arrayContaining([u, 2, u, u, u]),
        jasmine.arrayContaining([u, 2, 2, 2, u])
      ]));
    });

    xit('createRoom should create rooms', function () {
      // TODO
    });
  });

  describe('.getAccDirection()', function () {
    it('should return correct values', function () {

      var
        createEntity = function createEntity(x, y) {
          return {
            'acc' : [x, y]
          };
        };

      expect(getAccDirection(createEntity(1, 2))).toEqual([1, 1]);
      expect(getAccDirection(createEntity(-1, 2))).toEqual([-1, 1]);
      expect(getAccDirection(createEntity(1, -200))).toEqual([1, -1]);
      expect(getAccDirection(createEntity(0, -200))).toEqual([0, -1]);
      expect(getAccDirection(createEntity(100, 0))).toEqual([1, 0]);
      expect(getAccDirection(createEntity(0, 0))).toEqual(0);
    });
  });

  describe('.entities', function () {
    it('should have the player', function () {
      expect(entities).toContain(player);
    });
  });

  describe('.createEntityConfig()', function () {
    beforeEach(function () {
      this.cfg = createEntityConfig();
    });

    it('should set idling as default', function () {
      expect(this.cfg.idling).toEqual({
        'frames'  : 4,
        'y'       : 0
      });
    });

    it('should have size property', function () {
      expect(this.cfg.size).toBe(16);
    });

    it('should have friction property', function () {
      expect(this.cfg.friction).toBe(0.8);
    });

    describe('with one count for idling frames', function () {
      beforeEach(function () {
        this.cfg = createEntityConfig(0, [
          ['idling', 1]
        ]);
      });

      it('should set frames for idling to 1', function () {
        expect(this.cfg.idling.frames).toBe(1);
      });
    });

    describe('with player config', function () {
      beforeEach(function () {
        this.cfg = createEntityConfig(0, [
          ['idling', 6],
          ['moving'],
          ['tping']
        ]);
      });

      it('should override default idling frames', function () {
        expect(this.cfg.idling.frames).toBe(6);
      });

      it('should set y coords according to size', function () {
        expect(this.cfg.moving.y).toBe(16);
        expect(this.cfg.tping.y).toBe(32);
      });
    });

    describe('with friction and size parameter', function () {
      beforeEach(function () {
        this.cfg = createEntityConfig(0, [
          ['moving'],
          ['tping']
        ], {
          'friction'  : 10,
          'size'      : 22
        });
      });

      it('should have the friction property set', function () {
        expect(this.cfg.friction).toBe(10);
      });

      it('should have the given size property set', function () {
        expect(this.cfg.size).toBe(22);
      });

      it('should set y coords according to the given size', function () {
        expect(this.cfg.idling.y).toBe(0);
        expect(this.cfg.moving.y).toBe(22);
        expect(this.cfg.tping.y).toBe(44);
      });
    });
  });

  describe('.updateEntityPosition()', function () {
    describe('with an entity trying to step into a tile from bottom left', function () {
      beforeEach(function () {
        this.entity = createEntity([20, 20], createEntityConfig());

        map2DArray = [
          [1, 1, 1],
          [0, 1, 1],
          [0, 1, 1]
        ];

        set(this.entity.acc, [15, -10]);
      });

      it('should slide along the wall (not land in a collided part of the map)', function () {
        updateEntityPosition(this.entity);

        var
          tilesIndex = getTilesIndex(this.entity.pos);

        expect(map2DArray[tilesIndex[0]][tilesIndex[1]]).toBeTruthy();
      });
    });
  });

  xdescribe('.onmousedown', function () {
    it('should shoot in the given direction', function () {
    });
  });

  describe('.onkeydown', function () {
    describe('with pressing (d) - right', function () {
      beforeEach(function () {
        this.positions = [player.pos.slice()];

        window.onkeydown(this.createKeyDownEvent(RIGHT));

        this.update();

        this.positions.push(player.pos.slice());
        this.firstPos   = this.positions[0];
        this.secondPos  = this.positions[1];
        this.firstDist  = dist(this.firstPos, this.secondPos);
      });

      it('should move the players first coordinate', function () {
        expect(this.firstPos[0]).toBeLessThan(this.secondPos[0]);
        expect(this.firstPos[1]).toBe(this.secondPos[1]);
      });

      describe('with releasing (d) - right', function () {
        beforeEach(function () {
          window.onkeydown(this.createKeyUpEvent(RIGHT));
          // entities = [player];
          var i = entities.length;
          while (i--) {
            if (entities[i] !== player) {
              removeEntity(entities[i]);
            }
          }
          this.update();

          this.curPos   = player.pos.slice();

          this.curDist  = dist(this.curPos, this.secondPos);
        });

        it('should finish moving by sliding a bit more', function () {
          expect(this.curDist).toBeGreaterThan(0);
          expect(this.secondPos[0] - this.firstPos[0]).toBeGreaterThan(this.curPos[0] - this.secondPos[0]);
          expect(player.spd).toEqual([0, 0]);
        });

        describe('with down and right keydown events', function () {
          beforeEach(function () {
            this.lastPosition = player.pos.slice();

            window.onkeydown(this.createKeyDownEvent(RIGHT));
            window.onkeydown(this.createKeyDownEvent(DOWN));

            this.update();
          });

          it('should move the player down-right, however just as the same amount as right before', function () {
            var
              curDist = dist(player.pos, this.lastPosition);

            expect(curDist).toBeCloseTo(this.firstDist, 8);
          });
        });
      });
    });
  });
});
