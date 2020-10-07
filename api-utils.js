const {parseSwaggerRouteData, evaluateRoute, buildSwaggerJSON} = require("./swagger-utils");
const {topologicalDependencySort} = require("./graph-utils")

const _cache = {}

const setResponse = (swaggerSpec, node, requestData, response, dataPath) => {
    const responseTypes = swaggerSpec["paths"][requestData.originalRoute][requestData.method]["responses"][response.status];

    if (!responseTypes) {
        throw Error("Response code not documented in swagger: " + response.status)
    }

    for(const responseType of Object.keys(responseTypes["content"])) {
        const responseRef = responseTypes["content"][responseType]["schema"]["$ref"].split("/").slice(-1)
        let data = response.data;
        for (const path of dataPath) {
            data = data[path];
        }
        _cache[node] = data;
        swaggerSpec["definitions"][responseRef] = buildSwaggerJSON(data);
    }
}

const getResponsesInDependencyOrder = async (swaggerSpec, requestOptions = {}, bodyDefinitions = {}, dataPath = []) => {
    const {dependencyGraph} = parseSwaggerRouteData(swaggerSpec, bodyDefinitions);

    const dependencyOrderQueue = topologicalDependencySort(dependencyGraph);

    const axios = require("axios").create(requestOptions)

    while(!dependencyOrderQueue.isEmpty()) {
        const node = dependencyOrderQueue.dequeue();
        const {requestData} = dependencyGraph[node];

        const context = {
            process: process,
            ..._cache
        };
        const apiRoute = evaluateRoute(requestData.apiRoute, context);
        const requestBody = evaluateRoute(JSON.stringify(requestData.requestBody), context);

        if(["post", "put"].includes(requestData.method)) {
            bodyDefinitions[requestData.definitionName] = JSON.parse(requestBody);
        }

        await axios.request({
            method: requestData.method,
            data: JSON.parse(requestBody),
            url: apiRoute
        })
            .then((response) => {
                setResponse(swaggerSpec, node, requestData, response, dataPath)
        })
            .catch((response) => {
                if(response.isAxiosError) {
                    setResponse(swaggerSpec, node, requestData, response.response, dataPath)
                }
        });
    }

    return {swaggerSpec, bodyDefinitions}
}


module.exports = {getResponsesInDependencyOrder}