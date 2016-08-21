var
  test = window.test;

//
// Ensure proper markup for src/a.js
//
document.body.innerHTML = '<canvas id="c"></canvas>';

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
