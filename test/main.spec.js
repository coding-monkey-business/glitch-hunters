/* globals
  createEntity,
  createEntityConfig,
  drawPath,
  entities,
  field,
  getAccDirection,
  getId,
  getTilesIndex,
  map2DArray : true,
  set,
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

        'fillRect' : function fillRect() {
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

        'getContext' : function getContext() {
          return fakeContext;
        }
      };

    document.body.appendChild = function appendChild() {
    };

    document.createElement = function createElement() {
      if (arguments[0] === 'canvas') {
        return fakeCanvas;
      }

      return origCreateElement.apply(document, arguments);
    };

    if (loaded) {
      done();
      return;
    }

    var
      origOnload = window.onload;

    window.onload = function () {
      origOnload();
      loaded = true;
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
      arr.length = 4;

      var x = 4;
      while (x--) {
        arr[x] = [];
        arr[x].length = 4;
      }
    });

    it('drawPath should connect 2 points', function () {
      expect(function () {
        drawPath(arr, 0, 0, 3, 3);
      }).not.toThrow();
      expect(arr).toEqual(jasmine.arrayContaining([
        jasmine.arrayContaining([3, u, u, u]),
        jasmine.arrayContaining([3, u, u, u]),
        jasmine.arrayContaining([3, u, u, u]),
        jasmine.arrayContaining([3, 3, 3, u])
      ]));
    });
    it('createRoom should create rooms', function () {
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
      expect(entities.length).toBe(1);
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
});
