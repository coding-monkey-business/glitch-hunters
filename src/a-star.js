/* exported aStar, distance */
/* globals DEBUG: false, log: false */
var
  /**
   * Distance between two 2d-points.
   *
   * @param {number} x1 X-coord of first point.
   * @param {number} y1 Y-coord of first point.
   * @param {number} x2 X-coord of second point.
   * @param {number} y2 Y-coord of second point.
   * @return {number} Distance between (x1,y1) and (x2,y2).
   */
  distance = function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  },

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
   * this could probably be removed later
   * @param {Number} startX
   * @param {Number} startY
   * @param {Number} goalX
   * @param {Number} goalY
   * @return {Number}
   */
  heuristicCostEstimate = function heuristicCostEstimate(startX, startY, goalX, goalY) {
    var dist = distance(startX, startY, goalX, goalY) /* * start.val*/ ; // TODO: maybe add some other magic value

    return dist;
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
          if (grid[x][y] && !(x === node[0] && y === node[1]) && (!maxRange || distance(x, y, node[0], node[1]) <= maxRange)) {
            result.push([
              x,
              y
            ]);
          }
        }
      }
    }

    // console.log('neighbor nodes for ', node.x, node.y, result);
    return result;
  },
  /**
   * @param {Number} startX
   * @param {Number} startY
   * @param {Number} goalX
   * @param {Number} goalY
   * @param {Array.<Array.<Number>} grid TODO FIX THIS
   * @param {Object=} opt_data
   * @return {Array.<Array.<Number>>} path from start to goal
   */
  aStar = function aStar(startX, startY, goalX, goalY, grid, opt_data) {
    var closedset = {}, // The set of nodes already evaluated.
      openset     = {}, // The set of tentative nodes to be evaluated, initially containing the start node (see below)
      openlist    = [
        [startX, startY]
      ], // this is somewhat hacky ...<
      cameFrom    = {}, // The map of navigated nodes.
      gScore      = {},
      fScore      = {},
      maxRange    = (opt_data && opt_data.range) ? opt_data.range : false,
      current,
      neighbor,
      i,
      neighborNodes,
      tentativeGScore;

    openset[startX] = {};
    openset[startX][startY] = [startX, startY];

    gScore[startX] = {}; // Cost from start along best known path.
    gScore[startX][startY] = 0; // Cost from start along best known path.
    // Estimated total cost from start to goal through y.
    fScore[startX] = {};
    fScore[startX][startY] = gScore[startX][startY] + heuristicCostEstimate(startX, startY, goalX, goalY);

    while (openlist.length) {
      // TODO: getNodeWithLowestFScore should return a coordinate pair instead of a node?
      current = getNodeWithLowestFScore(openlist, fScore);
      if (current[0] === goalX && current[1] === goalY) {
        return reconstructPath(cameFrom, [goalX, goalY]);
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
        tentativeGScore = gScore[current[0]][current[1]] + distance(current[0], current[1], neighbor[0], neighbor[1]);

        if (!closedset[neighbor[0]] || !closedset[neighbor[0]][neighbor[1]] || !gScore[neighbor[0]] || (gScore[neighbor[0]][neighbor[1]] === null) || tentativeGScore < gScore[neighbor[0]][neighbor[1]]) {
          // add to navigated nodes:
          cameFrom[neighbor[0]] = cameFrom[neighbor[0]] || {};
          cameFrom[neighbor[0]][neighbor[1]] = current;

          // set gScore:
          gScore[neighbor[0]] = gScore[neighbor[0]] || {};
          gScore[neighbor[0]][neighbor[1]] = tentativeGScore;
          // set fScore:
          fScore[neighbor[0]] = fScore[neighbor[0]] || {};
          fScore[neighbor[0]][neighbor[1]] = tentativeGScore + heuristicCostEstimate(neighbor[0], neighbor[1], goalX, goalY);

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
