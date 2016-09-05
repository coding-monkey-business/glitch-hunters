describe('vec', function () {
  var
    test;

  beforeEach(function () {
    test = window.test;
  });

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
