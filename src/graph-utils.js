const Queue = require('./structures');
const { debugLogger } = require('./logger');

const logger = debugLogger(__filename);

const resolveDependencyIfUnknown = (node) => {
  if (node && node.dependencies) {
    return node.dependencies;
  }

  return [];
};

const isCyclicUtil = (graph, node, visited, stack, history = []) => {
  visited[node] = true;
  stack[node] = true;

  for (const neighbour of resolveDependencyIfUnknown(graph[node])) {
    const stackHistory = [...history, neighbour];
    if (!visited[neighbour]) {
      const data = isCyclicUtil(graph, neighbour, visited, stack, stackHistory);
      if (data.status) {
        return { status: true, stackHistory: data.stackHistory };
      }
    } else if (stack[neighbour] === true) {
      return { status: true, stackHistory };
    }
  }

  stack[node] = false;

  return { status: false };
};

const dependencyCycleDetection = (dependencyGraph) => {
  // Converted to JS from here: https://www.geeksforgeeks.org/detect-cycle-in-a-graph/
  const visited = {};
  const stack = {};
  const stackHistory = [];
  for (const node of Object.keys(dependencyGraph)) {
    if (!visited[node]) {
      const cycleData = isCyclicUtil(dependencyGraph, node, visited, stack);
      if (cycleData.status) {
        stackHistory.push([node, ...cycleData.stackHistory]);
      }
    }
  }
  return { status: stackHistory.length > 0, stackHistory };
};

const satisfyDependencyConstraints = (dependencyGraph) => {
  const unsatisfiedDependencies = new Set();
  for (const dependency of Object.keys(dependencyGraph)) {
    for (const key of resolveDependencyIfUnknown(dependencyGraph[dependency])) {
      if (!dependencyGraph[key]) {
        unsatisfiedDependencies.add(key);
      }
    }
  }
  return Array.from(unsatisfiedDependencies.values());
};

const getIndegreeAndAdjacencyList = (dependencyGraph) => {
  logger('Generating in-degree map and adjacency list off dependency graph');
  const inDegreeMap = {};
  const adjList = {};

  for (const node of Object.keys(dependencyGraph)) {
    inDegreeMap[node] = dependencyGraph[node].dependencies.length;
    adjList[node] = [];
  }

  for (const node of Object.keys(dependencyGraph)) {
    for (const neighbour of resolveDependencyIfUnknown(dependencyGraph[node])) {
      if (!adjList[neighbour]) {
        adjList[neighbour] = [];
      }
      adjList[neighbour].push(node);
    }
  }

  for (const node of Object.keys(adjList)) {
    if (!inDegreeMap[node]) {
      inDegreeMap[node] = 0;
    }
  }

  logger('Completed generation of in-degree map and adjacency list');
  logger('-');
  return { inDegreeMap, adjList };
};

const topologicalDependencySort = (dependencyGraph) => {
  // Kahn's algorithm
  logger('Starting sorting process for correct dependency API call order');
  const { inDegreeMap, adjList } = getIndegreeAndAdjacencyList(dependencyGraph);
  const dependencyQueue = new Queue();

  Object.keys(dependencyGraph).forEach(() => {
    // Check for nodes with zero in-degrees across each iteration
    // If none are found, there is no solution since all nodes are
    // cyclically dependent on each other
    let cyclic = true;

    let node; // Last node with no dependency
    for (node of Object.keys(dependencyGraph)) {
      // In the event of an unresolved dependency
      // The count of in-degrees is negative to the number of its
      // dependencies hence why it can fall below 0
      // since it has zero dependencies at the start
      if (inDegreeMap[node] === 0) {
        cyclic = false;
        break;
      }
    }
    if (cyclic) {
      throw Error('Dependencies cannot be sorted, missing dependency causing cyclic loop detected}');
    }

    inDegreeMap[node] -= 1;
    dependencyQueue.enqueue(node);
    for (const neighbour of adjList[node]) {
      inDegreeMap[neighbour] -= 1;
    }
  });

  logger('-');
  return dependencyQueue;
};

module.exports = {
  satisfyDependencyConstraints,
  dependencyCycleDetection,
  topologicalDependencySort,
};
