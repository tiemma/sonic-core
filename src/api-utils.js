const { create } = require('axios');
const { dependencyCycleDetection, satisfyDependencyConstraints } = require('./graph-utils');

const { parseSwaggerRouteData, evaluateRoute, buildSwaggerJSON } = require('./swagger-utils');
const { topologicalDependencySort } = require('./graph-utils');
const { debugLogger } = require('./logger');

const cache = {};
const logger = debugLogger(__filename);

const swaggerRef = (contentType, responseRef) => ({
  content: {
    [contentType]: {
      schema: {
        $ref: responseRef,
      },
    },
  },
});

const setResponse = (swaggerSpec, node, requestData, response, dataPath) => {
  // eslint-disable-next-line max-len
  const responseTypes = swaggerSpec.paths[requestData.originalRoute][requestData.method].responses[response.status];
  const contentType = response.headers['content-type'].split(';')[0];
  let responseRef = Math.random().toString(36).substring(7);
  let { data } = response;

  if (!responseTypes) {
    logger(`Response code <${response.status}> not documented in swagger, adding under definition ${responseRef}`);

    // eslint-disable-next-line max-len
    swaggerSpec.paths[requestData.originalRoute][requestData.method].responses[response.status] = swaggerRef(contentType, responseRef);
  } else {
    responseRef = responseTypes.content[contentType].schema.$ref.split('/').slice(-1);
    logger(`Response code <${response.status}> documented in swagger, adding under definition ${responseRef}`);
  }

  for (const path of dataPath) {
    data = data[path];
  }

  cache[node] = data;
  swaggerSpec.definitions[responseRef] = buildSwaggerJSON(data);
};

const getResponsesInDependencyOrder = async (swaggerSpec,
  requestOptions = {},
  bodyDefinitions = {},
  dataPath = []) => {
  const { dependencyGraph } = parseSwaggerRouteData(swaggerSpec, bodyDefinitions);

  logger('Verifying all dependencies are satisfied in the dependency graph');
  const unsatisfiedDependencies = satisfyDependencyConstraints(dependencyGraph);
  if (unsatisfiedDependencies.length) {
    throw Error(`Dependencies are not satisfied: ${unsatisfiedDependencies}`);
  }
  logger('Successfully verified all dependencies are satisfied based on current swagger configuration 🎉');
  logger('-');

  logger('Verifying there are no cyclic dependency chains');
  const cycleData = dependencyCycleDetection(dependencyGraph);
  if (cycleData.status) {
    throw Error(`Cyclic detection found on route: \n${cycleData.stackHistory.map((history) => history.join('->')).join('\n')}`);
  }
  logger('No cyclic dependency chains were detected');
  logger('-');

  const dependencyOrderQueue = topologicalDependencySort(dependencyGraph);

  const axios = create(requestOptions);

  logger(`Iterating over queue in required order: ${dependencyOrderQueue.getElements()}`);
  while (!dependencyOrderQueue.isEmpty()) {
    const node = dependencyOrderQueue.dequeue();
    const { requestData } = dependencyGraph[node];
    logger(`Processing node ${node} with details: ${requestData.method.toUpperCase()} ${requestData.originalRoute}`);

    const context = {
      process,
      ...cache,
    };
    logger(`Evaluating route data ${requestData.apiRoute}`);
    const apiRoute = evaluateRoute(requestData.apiRoute, context);

    logger('Evaluating body data: <content omitted>');
    const requestBody = evaluateRoute(JSON.stringify(requestData.requestBody), context);

    if (['post', 'put'].includes(requestData.method)) {
      bodyDefinitions[requestData.definitionName] = JSON.parse(requestBody);
    }

    // eslint-disable-next-line no-await-in-loop
    await axios.request({
      method: requestData.method,
      data: JSON.parse(requestBody),
      url: apiRoute,
    })
      .then((response) => {
        setResponse(swaggerSpec, node, requestData, response, dataPath);
      })
      .catch((response) => {
        if (response.response) {
          setResponse(swaggerSpec, node, requestData, response.response, dataPath);
        } else {
          throw Error(
            `Error occurred querying route for dependency ${node}
               on ${requestData.method.toUpperCase()} ${apiRoute}`,
          );
        }
      });

    logger(`Successfully processed API call on node ${node}`);
    logger('-');
  }

  logger('Swagger response generation completed');
  return { swaggerSpec, bodyDefinitions, dependencyGraph };
};

module.exports = { getResponsesInDependencyOrder };
