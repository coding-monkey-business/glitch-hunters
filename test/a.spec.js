Math.sign = function (a) {
  if (!a) {
    return 0;
  }

  return a / Math.abs(a);
};

var
  test = window.test;

describe('.getId', function () {
  it('should return newer ids on every call', function () {
    expect(test.getId()).toBe(1);
    expect(test.getId()).toBe(2);
  });
});

describe('title: field', function () {
  it('should be an array', function () {
    expect(test.field).toEqual(jasmine.any(Array));
    expect(test.field[0]).toEqual([
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
      test.drawPath(arr, 0, 0, 3, 3);
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

describe('.getMovingDirection()', function () {
  it('should return correct values', function () {

    var
      createEntity = function createEntity(x, y) {
        return {
          'spd' : [x, y]
        };
      };

    expect(test.getMovingDirection(createEntity(1, 2))).toEqual([1, 1]);
    expect(test.getMovingDirection(createEntity(-1, 2))).toEqual([-1, 1]);
    expect(test.getMovingDirection(createEntity(1, -200))).toEqual([1, -1]);
    expect(test.getMovingDirection(createEntity(0, -200))).toEqual([0, -1]);
    expect(test.getMovingDirection(createEntity(100, 0))).toEqual([1, 0]);
    expect(test.getMovingDirection(createEntity(0, 0))).toEqual(0);
  });
});
