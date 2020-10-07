const {Queue} = require("./structures")


const isCyclicUtil = (graph, node, visited, stack, history = []) => {
    if(stack[node]) {
        return true
    }

    if(visited[node]) {
        return false
    }

    visited[node] = true
    stack[node] = true

    for (const neighbour of graph[node]["dependencies"]) {
        const stackHistory = [...history, neighbour]
        if (visited[neighbour] === false) {
            if (isCyclicUtil(graph, neighbour, visited, stack, stackHistory)) {
                return {status: true, stackHistory}
            }
        } else if (stack[neighbour] === true) {
            return {status: true, stackHistory}
        }
    }
    stack[node] = false

    return {status: false, stackHistory: [...history, node]}
}

const dependencyCycleDetection = (dependencyGraph) => {
    // Converted to JS from here: https://www.geeksforgeeks.org/detect-cycle-in-a-graph/
    const visited = {}
    const stack = {}
    for (const node of Object.keys(dependencyGraph)) {
        if (!visited[node]) {
            const cycleData = isCyclicUtil(dependencyGraph, node, visited, stack)
            if (cycleData.status) {
                throw Error("Cyclic detection found on route: " + [node, ...cycleData.stackHistory])
            }
        }
    }
}

const satisfyDependencyConstraints = (dependencyGraph) => {
    const unsatisfiedDependencies = new Set()
    for (const dependency of Object.keys(dependencyGraph)) {
        for (const key of dependencyGraph[dependency]["dependencies"]) {
            if (!dependencyGraph[key]) {
                unsatisfiedDependencies.add(key)
            }
        }
    }
    if (unsatisfiedDependencies.size) {
        throw Error("Dependencies are not satisfied: " + Array.from(unsatisfiedDependencies.values()))
    }
}


const getIndegreeAndAdjacencyList = (dependencyGraph) => {
    const inDegreeMap = {}
    const adjList = {}

    for(const node of Object.keys(dependencyGraph)) {
        inDegreeMap[node] = dependencyGraph[node]["dependencies"].length
        adjList[node] = []
    }

    for(const node of Object.keys(dependencyGraph)) {
        for (const neighbour of dependencyGraph[node]["dependencies"]) {
            adjList[neighbour].push(node)
        }
    }

    return {inDegreeMap, adjList}
}

const topologicalDependencySort = (dependencyGraph) => {
    // Kahn's algorithm
    const {inDegreeMap, adjList} = getIndegreeAndAdjacencyList(dependencyGraph)
    const dependencyQueue = new Queue()

    for(const _ of Object.keys(dependencyGraph)) {
        // Check for nodes with zero in-degrees across each iteration
        // If none are found, there is no solution since all nodes are
        // cyclically dependant on each other
        let cyclic = true

        let node // Last node with no dependency
        for(node of Object.keys(dependencyGraph)) {
            if(inDegreeMap[node] === 0) {
                cyclic = false
                break
            }
        }
        if (cyclic) {
            throw Error("Dependencies cannot be sorted, cyclic loop detected")
        }

        inDegreeMap[node]--;
        dependencyQueue.enqueue(node);
        for (const neighbour of adjList[node]) {
            inDegreeMap[neighbour]--;
        }
    }

    return dependencyQueue
}


module.exports = { satisfyDependencyConstraints, dependencyCycleDetection, topologicalDependencySort}