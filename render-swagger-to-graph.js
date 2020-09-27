const swaggerSpec = require("./dist/swagger.json");
const matchAll = require("match-all");

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
                dependencyGraph[name] = dependencies
            }

            const allowedBodyRoutes = ["post", "put"]

            if(allowedBodyRoutes.includes(method)) {

                const contentTypes = routes[method]["requestBody"]["content"]

                for (const type of Object.keys(contentTypes)) {
                    const definitionRef = contentTypes[type]["schema"]["$ref"]
                    const [definitionName] = definitionRef.split("/").slice(-1)

                    body = definitions[definitionName];
                    if (body) {
                        const rawDeps = matchAll(JSON.stringify(body), requestBodyDependencyRegex).toArray()
                        dependencyGraph[name] = [...dependencies, ...new Set(rawDeps.map(getDependency))]
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
        }
    }
    dependencyCycleDetection(dependencyGraph)
    satisfyDependencyConstraints(dependencyGraph)

    return { dependencyGraph, data }
}

const isCyclicUtil = (graph, node, visited, stack) => {
    visited[node] = true
    stack[node] = true

    for (const neighbour of graph[node]) {
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
        for (const key of dependencyGraph[dependency]) {
            if (!dependencyGraph[key]) {
                unsatisfiedDependencies.add(key)
            }
        }
    }
    if (unsatisfiedDependencies.size) {
        throw Error("Dependencies are not satisfied: " + Array.from(unsatisfiedDependencies.values()))
   }
}

console.log(parseSwaggerRouteData(swaggerSpec))
