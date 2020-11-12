const swaggerJSDoc = require('swagger-jsdoc');
const { writeFileSync } = require('fs');
const { debugLogger } = require('./logger');
const {
  parseSwaggerRouteData,
  swaggerRef, generateResponseRef, buildSwaggerJSON,
  getType, DataTypes,
} = require('./swagger-utils');

const logger = debugLogger(__filename);
const parameterRegex = /(:\w+\??)/g;

const trimString = (path) => (!path.includes('?') ? path.substr(1) : path.substring(1, path.length - 1));
const replaceRoutes = (route) => route.replace(parameterRegex, (x) => `{${trimString(x)}}`);

const findBodyParameterIndexV2 = (parameterList) => {
  for (const idx in parameterList) {
    if (parameterList[idx].in === 'body') {
      return idx;
    }
  }

  // If no index found, return false
  return false;
};

const findPathParameterIndex = (pathList, key) => {
  for (const idx in pathList) {
    if (pathList[idx].in === 'path' && pathList[idx].name === key) {
      return idx;
    }
  }

  // If no index found, return false
  return false;
};

const findQueryParameterIndex = (parameterList, key) => {
  for (const idx in parameterList) {
    if (parameterList[idx].in === 'query' && parameterList[idx].name === key) {
      return idx;
    }
  }

  // If no index found, return false
  return false;
};

const initSwaggerSchemaParameters = (swaggerSpec, originalRoute, method) => {
  const route = replaceRoutes(originalRoute);
  if (!swaggerSpec.paths) {
    swaggerSpec.paths = {
      [route]: {
        [method]: {

        },
      },
    };
  }
  if (!swaggerSpec.paths[route]) {
    swaggerSpec.paths[route] = {};
  }
  if (!swaggerSpec.paths[route][method]) {
    swaggerSpec.paths[route][method] = {};
  }
  if (!swaggerSpec.paths[route][method].parameters) {
    swaggerSpec.paths[route][method].parameters = [];
  }

  const parameterList = swaggerSpec.paths[route][method].parameters;
  const pathList = originalRoute.match(parameterRegex);
  if (getType(pathList) !== DataTypes.ARRAY) {
    return;
  }
  for (const path of pathList) {
    if (findPathParameterIndex(parameterList, path) === false) {
      swaggerSpec.paths[route][method].parameters.push({
        name: trimString(path),
        in: 'path',
        required: !path.includes('?'),
      });
    }
  }
};

const initSwaggerSchemaSpecV3 = (swaggerSpec) => {
  if (!swaggerSpec.components) {
    swaggerSpec.components = {
      schemas: {},
    };
  }
  if (!swaggerSpec.components.schemas) {
    swaggerSpec.components.schemas = {};
  }
};

const initSwaggerSchemaSpecV2 = (swaggerSpec) => {
  if (!swaggerSpec.definitions) {
    swaggerSpec.definitions = {};
  }
};

const generateQueryParameterSpec = (swaggerSpec, route, method, queries) => {
  const parameterList = swaggerSpec.paths[route][method].parameters;
  for (const key of Object.keys(queries)) {
    const pIdx = findQueryParameterIndex(parameterList, key);
    if (pIdx === false) {
      swaggerSpec.paths[route][method].parameters.push({
        name: key,
        in: 'query',
        type: getType(queries[key]),
      });
    }
  }
};

const generateRequestBodySpec = (swaggerSpec,
  route, method, requestBody, contentType, definitionName) => {
  if (!Object.keys(requestBody).length) {
    return;
  }
  if (!definitionName) {
    definitionName = generateResponseRef();
  }
  if (swaggerSpec.openapi) {
    swaggerSpec.paths[route][method].requestBody = swaggerRef(contentType, definitionName, '#/components/schemas');
    swaggerSpec.components.schemas[definitionName] = buildSwaggerJSON(requestBody);
  } else if (swaggerSpec.swagger) {
    const parameterList = swaggerSpec[route][method].parameters;
    const bodyIndex = findBodyParameterIndexV2(parameterList);
    if (bodyIndex === false) {
      swaggerSpec.paths[route][method].parameters.push({ schema: {} });
    }
    swaggerSpec.paths[route][method].parameters[bodyIndex].schema.$ref = `#/definitions/${definitionName}`;
    swaggerSpec.definitions[definitionName] = buildSwaggerJSON(requestBody);
  } else {
    throw new Error('Unknown swagger specification');
  }
};

const generateResponseBodySpec = (swaggerSpec,
  route, method, responseBody, contentType, statusCode) => {
  if (!Object.keys(responseBody).length) {
    return;
  }
  const definitionName = generateResponseRef();

  if (!swaggerSpec.paths[route][method].responses) {
    swaggerSpec.paths[route][method].responses = {};
  }

  if (swaggerSpec.openapi) {
    swaggerSpec.paths[route][method].responses[statusCode] = swaggerRef(contentType, definitionName, '#/components/schemas');
    swaggerSpec.components.schemas[definitionName] = buildSwaggerJSON(responseBody);
  } else if (swaggerSpec.swagger) {
    if (!swaggerSpec.paths[route][method].responses[statusCode].schema) {
      swaggerSpec.paths[route][method].responses[statusCode].schema = {};
    }
    swaggerSpec.paths[route][method].responses[statusCode].schema.$ref = `#/definitions/${definitionName}`;
    swaggerSpec.definitions[definitionName] = buildSwaggerJSON(responseBody);
  } else {
    throw new Error('Unknown swagger specification');
  }
};

const writeFile = (swaggerSpec,
  method, originalRoute, responseBody, res, requestDefinitionName, swaggerFilePath) => {
  const { body: requestBody, query } = res.req;
  const contentType = (res.get('Content-Type') || 'text/html').split(';')[0];
  const { statusCode } = res;
  try {
    responseBody = JSON.parse(responseBody);
  } catch (e) {
    logger("Response isn't a JSON object, ignoring parse");
  }
  const route = replaceRoutes(originalRoute);
  initSwaggerSchemaParameters(swaggerSpec, originalRoute, method);
  if (swaggerSpec.openapi) {
    initSwaggerSchemaSpecV3(swaggerSpec);
  } else if (swaggerSpec.swagger) {
    initSwaggerSchemaSpecV2(swaggerSpec);
  } else {
    throw new Error('Unknown swagger specification');
  }

  if (statusCode < 400) {
    // eslint-disable-next-line max-len
    generateRequestBodySpec(swaggerSpec, route, method, requestBody, contentType, requestDefinitionName);
    generateQueryParameterSpec(swaggerSpec, route, method, query);
  }

  if (statusCode !== 204) {
    generateResponseBodySpec(swaggerSpec, route, method, responseBody, contentType, statusCode);
  }
  logger(swaggerSpec);
  writeFileSync(swaggerFilePath, JSON.stringify(swaggerSpec, null, 4));
};

const getResponse = (app, swaggerOptions, swaggerFilePath) => {
  const swaggerSpec = swaggerJSDoc(swaggerOptions);
  const { definitionMap } = parseSwaggerRouteData(swaggerSpec, {});
  return (req, res, next) => {
    // Set state of routes and definitions on first request
    // Deferred afterwards until a restart is done
    const { send } = res;
    // eslint-disable-next-line func-names
    res.send = function (body) {
      if (req.originalUrl.includes('/api/v1')) {
        const route = res.req.route ? res.req.route.path : req.url;
        const { method } = res.req;
        // eslint-disable-next-line max-len
        const definitionName = definitionMap[replaceRoutes(route)] && definitionMap[replaceRoutes(route)][method]
          ? definitionMap[replaceRoutes(route)][method][method]
          : undefined;
        // logger(res.req.body,
        //   method,
        //   route,
        //   res.req.query,
        //   body,
        //   res.req.headers.cookie,
        //   res.req.headers,
        //   res.get('Content-Type'),
        //   definitionName);
        logger(body);
        writeFile(swaggerSpec,
          method.toLowerCase(),
          route,
          body,
          res,
          definitionName,
          swaggerFilePath);
      }
      // eslint-disable-next-line prefer-rest-params
      return send.apply(this, arguments);
    };
    return next();
  };
};
module.exports = { getResponse };
