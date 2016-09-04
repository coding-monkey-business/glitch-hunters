/* exported add, dist, eql, mul, norm, set, sub */
var
  VEC_ZERO = [0, 0],

  /**
   * Distance between two 2d-points.
   *
   * @return {number} Distance between (x1,y1) and (x2,y2).
   */
  dist = function dist(v1, v2) {
    return Math.sqrt(Math.pow(v1[0] - v2[0], 2) + Math.pow(v1[1] - v2[1], 2));
  },

  set = function set(v1, v2) {
    v1[0] = v2[0];
    v1[1] = v2[1];

    return v1;
  },

  mul = function mul(v, s1, s2) {
    v[0] *= s1;
    v[1] *= s2 || s1;

    return v;
  },

  div = function div(v, s1, s2) {
    v[0] /= s1;
    v[1] /= s2 || s1;

    return v;
  },

  sub = function sub(v1, v2) {
    v1[0] -= v2[0];
    v1[1] -= v2[1];

    return v1;
  },

  add = function add(v1, v2) {
    v1[0] += v2[0];
    v1[1] += v2[1];

    return v1;
  },

  eql = function eql(v1, v2) {
    return v1[0] === v2[0] && v1[1] === v2[1];
  },

  norm = function norm(v, vlength) {
    vlength = dist(VEC_ZERO, v);

    div(v, vlength);

    return v;
  };

