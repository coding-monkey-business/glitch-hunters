/* exported aStar */
/* globals dist, eql */
/* globals DEBUG, log */
var
  /**
   * @param {Array<Object>} nodeList a list with the nodes that should be checked
   * @param {Object<Object>} fScoreTable 2-dimensional table
   * @return {Object<string, number>} an object with x/y-coordinates
   */
  getNodeWithLowestFScore = function getNodeWithLowestFScore(nodeList, fScoreTable) {
    var current = nodeList[0],
      index = nodeList.length;

    while (index--) {
      if (fScoreTable[current[0]][current[1]] > fScoreTable[nodeList[index][0]][nodeList[index][1]]) {
        current = nodeList[index];
      }
    }

    return current;
  },

  /**
   * @return {Array<Object>} path between start and goal
   */
  reconstructPath = function reconstructPath(cameFrom, currentNode) {
    var p = [];

    while (cameFrom[currentNode[0]] && cameFrom[currentNode[0]][currentNode[1]]) {
      p.push(currentNode);
      currentNode = cameFrom[currentNode[0]][currentNode[1]];
    }

    return p.reverse();
  },

  /**
   * @param {Object<string, number>} node
   * @param {Array<Array<Object>>} grid
   * @return {Array}
   */
  getNeighborNodes = function getNeighborNodes(node, grid, maxRange) {
    var result = [],
      x,
      y;

    if (DEBUG) {
      if (!grid[node[0]] || !grid[node[0]][node[1]]) {
        log('ERROR_getNeighborNodes');
      }
    }

    for (x = node[0] - 1; x <= node[0] + 1; x++) {
      if (grid[x]) {
        for (y = node[1] - 1; y <= node[1] + 1; y++) {
          if (grid[x][y] && !(x === node[0] && y === node[1]) && (!maxRange || dist([x, y], node) <= maxRange)) {
            result.push([
              x,
              y
            ]);
          }
        }
      }
    }

    return result;
  },
  /**
   * @param {Array.<Number>} start
   * @param {Array.<Number>} goal
   * @param {Array.<Array.<Number>} grid TODO FIX THIS
   * @param {Object=} opt_data
   * @return {Array.<Array.<Number>>} path from start to goal
   */
  aStar = function aStar(start, goal, grid, opt_data) {
    var closedset = {}, // The set of nodes already evaluated.
      openset     = {}, // The set of tentative nodes to be evaluated, initially containing the start node (see below)
      openlist    = [start.slice()],
      cameFrom    = {}, // The map of navigated nodes.
      gScore      = {},
      fScore      = {},
      maxRange    = (opt_data && opt_data.range) ? opt_data.range : false,
      current,
      neighbor,
      i,
      neighborNodes,
      tentativeGScore;

    openset[start[0]] = {};
    openset[start[0]][start[1]] = start.slice();

    gScore[start[0]] = {}; // Cost from start along best known path.
    gScore[start[0]][start[1]] = 0; // Cost from start along best known path.
    // Estimated total cost from start to goal through y.
    fScore[start[0]] = {};
    fScore[start[0]][start[1]] = gScore[start[0]][start[1]] + dist(start, goal);

    while (openlist.length) {
      // TODO: getNodeWithLowestFScore should return a coordinate pair instead of a node?
      current = getNodeWithLowestFScore(openlist, fScore);

      if (eql(current, goal)) {
        return reconstructPath(cameFrom, goal.slice());
      }

      // remove current from openset && openlist
      openset[current[0]][current[1]] = null;
      openlist.splice(openlist.indexOf(current), 1);

      // add current to closedset
      closedset[current[0]] = closedset[current[0]] || {};
      closedset[current[0]][current[1]] = current;

      neighborNodes = getNeighborNodes(current, grid, maxRange);

      for (i = 0; i < neighborNodes.length; i++) {
        neighbor = neighborNodes[i];
        tentativeGScore = gScore[current[0]][current[1]] + dist(current, neighbor);

        if (!closedset[neighbor[0]] || !closedset[neighbor[0]][neighbor[1]] || !gScore[neighbor[0]] || (gScore[neighbor[0]][neighbor[1]] === null) || tentativeGScore < gScore[neighbor[0]][neighbor[1]]) {
          // add to navigated nodes:
          cameFrom[neighbor[0]] = cameFrom[neighbor[0]] || {};
          cameFrom[neighbor[0]][neighbor[1]] = current;

          // set gScore:
          gScore[neighbor[0]] = gScore[neighbor[0]] || {};
          gScore[neighbor[0]][neighbor[1]] = tentativeGScore;

          // set fScore:
          fScore[neighbor[0]] = fScore[neighbor[0]] || {};
          fScore[neighbor[0]][neighbor[1]] = tentativeGScore + dist(neighbor, goal);

          if (!(openset[neighbor[0]] && openset[neighbor[0]][neighbor[1]])) {
            // add neighbor to openset & openlist
            openset[neighbor[0]] = openset[neighbor[0]] || {};
            openset[neighbor[0]][neighbor[1]] = neighbor;
            openlist.push(neighbor);
          }
        } else {
          if (closedset[neighbor[0]][neighbor[1]] && tentativeGScore >= gScore[neighbor[0]][neighbor[1]]) {
            continue;
          }
        }
      }
    }

    if (DEBUG) {
      log('ERROR_aStar');
    }

    return [];
  };
