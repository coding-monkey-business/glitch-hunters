describe('vec', function () {
  var
    test;

  beforeEach(function () {
    test = window.test;
  });

  describe('.rad()', function () {
    it('should work with unit vectors', function () {
      expect(test.rad([ 1,  0])).toBe(0);
      expect(test.rad([ 0,  1])).toBe(Math.PI /  2);

      expect(test.rad([ 1,  1])).toBe(Math.PI /  4);
      expect(test.rad([ 1, -1])).toBe(Math.PI * -1/4);

      expect(test.rad([ 0, -1])).toBe(Math.PI / -2);
      expect(test.rad([-1, -1])).toBe(Math.PI * -3/4);
      expect(test.rad([-1,  0])).toBe(-Math.PI);
    });
  });

  describe('.norm()', function () {
    it('should work with scaled vectors', function () {
      expect(test.norm([  2,    0])).toEqual([1,    0]);
      expect(test.norm([  0,10.23])).toEqual([0,    1]);
      expect(test.norm([0.3,    0])).toEqual([1,    0]);
      expect(test.norm([  0, -5.5])).toEqual([0,   -1]);
      expect(test.norm([  3,   -3])).toEqual([Math.sqrt(2)/2, -Math.sqrt(2)/2]);
    });

    it('should work with zero vectors', function () {
      expect(test.norm([0, 0])).toEqual([0, 0]);
    });
  });
});
