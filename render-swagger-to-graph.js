const swaggerSpec = require("./dist/swagger.json");
const { Queue } = require("./queue");
const matchAll = require("match-all");

const apiExtension = swaggerSpec["servers"][0].url
const axios = require("axios").create({
    baseURL: "http://localhost:3000" + apiExtension,
    timeout: 10000,
    headers: {"X-API-KEY": "somerandomstring"}
})

const globalResponseCache = {}

const generateResponse = (op, obj) => {
    if(!obj) {
        return op
    }
    for (const key of Object.keys(obj)) {
        if (Object.keys(obj[key]).includes("properties")) {
            op[key] = {}
            op[key] = generateResponse(op[key], obj[key]["properties"])
        } else {
            switch (obj[key].type) {
                case "object":
                    op[key] = generateResponse(op, obj)
                    break;
                default:
                    op[key] = obj[key].example
            }
        }
    }
    return op
}

const getDefinitions = (swaggerSpec) => {
    return generateResponse({}, swaggerSpec["definitions"])
}

const parameterRegex = /{(\w+)}+/g
const requestBodyDependencyRegex = /("\$\w+(((\[\w+\])+)?|((\.\w+)+)?)+")/g
const parseSwaggerRouteData = (swaggerSpec) => {
    const definitions = getDefinitions(swaggerSpec)
    const paths = swaggerSpec["paths"]
    const dependencyGraph = {}
    const data = []

    for(const path of Object.keys(paths)) {
        const routes = paths[path]
        let dependencies = []

        const getDependency = (deps) => deps.slice(1).match(/\w+/)[0]

        for(const method of Object.keys(routes)) {
            const name = routes[method]["name"]
            const routeParameters = matchAll(path, parameterRegex).toArray()

            let route = path
            let body = {}

            if (dependencyGraph[name]) {
                throw Error("Duplicate dependency name: " + name)
            }

            const parameters = routes[method]["parameters"]
            if (parameters) {
                parameters.forEach(params => {
                    const template = params["defaultTemplate"]

                    if(routeParameters.includes(params["name"]) && params["in"] === "path") {
                        route = route.replace(`{${params["name"]}}`, params["defaultTemplate"])
                    }

                    if (template) {
                        dependencies = [...dependencies, getDependency(template)]
                    }
                })
                if (!name && dependencies) {
                    throw Error("All routes with dependencies must have a name: " + method + " " + path)
                }
            }
            dependencyGraph[name] = { dependencies }

            const allowedBodyRoutes = ["post", "put"]

            if(allowedBodyRoutes.includes(method) && routes[method]["requestBody"]) {

                const contentTypes = routes[method]["requestBody"]["content"]

                for (const type of Object.keys(contentTypes)) {
                    const definitionRef = contentTypes[type]["schema"]["$ref"]
                    const [definitionName] = definitionRef.split("/").slice(-1)

                    body = definitions[definitionName];
                    if (body) {
                        const rawDeps = matchAll(JSON.stringify(body), requestBodyDependencyRegex).toArray()
                        dependencyGraph[name]["dependencies"] = [...dependencies, ...new Set(rawDeps.map(getDependency))]
                    }
                }
            }

            const reqObj = {
                "dependencies": dependencyGraph[name] || [],
                "requestBody": body,
                "apiRoute": route,
                "method": method,
            }
            data.push(reqObj);

            if (dependencyGraph[name]) {
                delete reqObj["dependencies"]
                dependencyGraph[name]["requestData"] = reqObj
            }
        }
    }

    dependencyCycleDetection(dependencyGraph)
    satisfyDependencyConstraints(dependencyGraph)

    return { dependencyGraph, data }
}

const isCyclicUtil = (graph, node, visited, stack) => {
    visited[node] = true
    stack[node] = true

    for (const neighbour of graph[node]["dependencies"]) {
        if (visited[neighbour] === false) {
            if (isCyclicUtil(graph, neighbour, visited, stack)) {
                return true
            }
        } else if (stack[neighbour] === true) {
            return true
        }
    }
    stack[node] = true
    return false
}

const dependencyCycleDetection = (dependencyGraph) => {
    // Converted to JS from here: https://www.geeksforgeeks.org/detect-cycle-in-a-graph/
     const visited = {}
     const stack = {}
     for (const node of Object.keys(dependencyGraph)) {
        if (!visited[node]) {
            if (isCyclicUtil(dependencyGraph, node, visited, stack)) {
                throw Error("Cyclic detection found on route: " + node)
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
        let nonCyclic = false

        let node // Last node with no dependency
        for(node of Object.keys(dependencyGraph)) {
            if(inDegreeMap[node] === 0) {
                nonCyclic = true
                break
            }
        }
        if (!nonCyclic) {
            throw Error("Dependencies cannot be sorted, cyclic loop detected")
        }
        inDegreeMap[node]--;
        dependencyQueue.enqueue(node)
        for (const neighbour of adjList[node]) {
            inDegreeMap[neighbour]--;
        }
    }

    return dependencyQueue
}

const getResponsesInDependencyOrder = async (dependencyGraph) => {
    const dependencyOrderQueue = topologicalDependencySort(dependencyGraph)

    while(!dependencyOrderQueue.isEmpty()) {
        const node = dependencyOrderQueue.dequeue()
        const {requestData} = dependencyGraph[node]
        const response = await axios.request({
            method: requestData.method,
            data: requestData.requestBody,
            url: requestData.apiRoute
        }).catch((response) => {
            console.log(response.config)
        })
        if(200 <= response.status <= 400) {
            globalResponseCache[node] = response.data;
        } else {
            console.info("Request failed: " + JSON.stringify(response.config))
        }
        console.log(globalResponseCache)
    }
}

(async() => {
    const {dependencyGraph} = parseSwaggerRouteData(swaggerSpec)
    console.log(await getResponsesInDependencyOrder(dependencyGraph))
})()
