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
