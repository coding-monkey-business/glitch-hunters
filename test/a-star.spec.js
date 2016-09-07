/* globals
  aStar
*/

describe('a-star', function () {
  var
    test,
    grid,
    n = null;

  beforeEach(function () {
    test = this;

    this.errors = [];

    window.console.error = function (m) {
      test.errors.push(m);
    };

    grid = [
      [n, 3, 3, 3, 3, 3, 3, 3], //<< (0|0)
      [n, 1, 1, 1, 3, n, n, n],
      [n, 1, 1, 1, 3, n, n, n],
      [n, 1, 1, 1, 1, 1, 1, n],
      [n, n, n, 1, 1, 1, 1, n],
      [n, n, n, 1, 1, 1, 1, n],
      [n, n, n, 1, 1, 1, 1, n],
      [n, 3, 3, 3, 3, 3, 3, n]
    ];
  });

  it('life ... should find a way', function () {
    var result;

    expect(aStar).toBeDefined();

    expect(function () {
      result = aStar([0, 1], [5, 3], grid);
    }).not.toThrow();

    expect(result).toEqual([
      [1, 1],
      [2, 2],
      [3, 2],
      [4, 3],
      [5, 3]
    ]);
  });

  describe('with a dispositioning-mistake', function () {
    it('should not freeze the game', function () {
      expect(function () {
        aStar([5, 0], [5, 3], grid);
      }).not.toThrow();

      expect(this.errors.indexOf('ERROR_aStar')).not.toBe(-1);
      expect(this.errors.indexOf('ERROR_getNeighborNodes')).not.toBe(-1);
      expect(this.errors.length).toBe(2);
    });
  });
});
