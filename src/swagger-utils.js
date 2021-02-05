const matchAll = require('match-all');
const { writeFileSync } = require('fs');

const { debugLogger } = require('./logger');
const {
  routeParametersRegex,
  requestBodyDependencyRegex,
  getDependency,
  routeDependencyRegex,
} = require('./regex-utils');

const logger = debugLogger(__filename);

const getType = (obj) => ({}.toString
  .call(obj)
  .match(/\s([a-zA-Z]+)/)[1]
  .toLowerCase());

const NonPrimitiveTypes = {
  ARRAY: 'array',
  OBJECT: 'object',
  NULL: 'null',
  UNDEFINED: 'undefined',
};

const findRequiredFields = (keys, existingData) => {
  if (existingData) {
    const existingKeys = existingData.required;
    return existingKeys.filter((val) => keys.indexOf(val) !== -1);
  }
  return keys;
};

const swaggerRef = (contentType, responseRef, prefix = '#/definitions') => ({
  content: {
    [contentType]: {
      schema: {
        $ref: `${prefix}/${responseRef}`,
      },
    },
  },
});

const generateResponseRef = (swaggerSpec, route, method, contentType) => {
  try {
    const existingResponseRef = swaggerSpec.paths[route][method]
      .requestBody.content[contentType].schema.$ref;
    const refWithoutPrefix = existingResponseRef.split('/')[2];
    return refWithoutPrefix;
  } catch {
    return Math.random().toString(36).substring(7);
  }
};

const generateResponse = (op, obj) => {
  if (!obj) {
    return op;
  }
  for (const key of Object.keys(obj)) {
    if (Object.keys(obj[key]).includes('properties')) {
      op[key] = {};
      op[key] = generateResponse(op[key], obj[key].properties);
    } else {
      switch (obj[key].type) {
        case 'object':
          op[key] = generateResponse(op, obj);
          break;
        default:
          op[key] = obj[key].example;
      }
    }
  }
  return op;
};

const buildSwaggerJSON = (data, existingData = null) => {
  if (!Object.values(NonPrimitiveTypes).includes(getType(data))) {
    return {
      type: getType(data),
      example: data,
    };
  }

  if (getType(data) === NonPrimitiveTypes.ARRAY) {
    return {
      type: NonPrimitiveTypes.ARRAY,
      items: {
        type: getType(data[0]),
        properties: buildSwaggerJSON(data[0]).properties,
      },
      example: data,
    };
  }

  const keys = Object.keys(data || {});
  const requiredKeys = findRequiredFields(keys, existingData);
  const op = {
    required: requiredKeys,
    properties: existingData ? existingData.properties : {},
  };

  for (const key of keys) {
    const value = data[key];
    switch (getType(value)) {
      case NonPrimitiveTypes.ARRAY:
        // eslint-disable-next-line no-case-declarations
        const typeData = getType(value[0]);
        if (typeData === NonPrimitiveTypes.ARRAY) {
          throw new Error(`Complex object (array of array etc...)', ${value[0]}`);
        } else if (typeData === NonPrimitiveTypes.OBJECT) {
          op.properties[key] = {
            type: NonPrimitiveTypes.ARRAY,
            items: {
              type: typeData,
              properties: buildSwaggerJSON(value[0]).properties,
            },
            example: value,
          };
        } else {
          op.properties[key] = {
            type: NonPrimitiveTypes.ARRAY,
            items: {
              type: typeData,
            },
          };
          op.properties[key].example = value;
        }
        break;
      case NonPrimitiveTypes.OBJECT:
        op.properties[key] = buildSwaggerJSON(value);
        op.properties[key].type = NonPrimitiveTypes.OBJECT;
        break;
      default:
        op.properties[key] = {
          type: getType(value),
          example: value,
        };
        break;
    }
  }
  return op;
};

const findBodyParameterIndexV2 = (parameterList) => {
  if (getType(parameterList) === NonPrimitiveTypes.ARRAY) {
    for (let idx = 0; idx < parameterList.length; idx += 1) {
      if (parameterList[idx].in === 'body') {
        return idx;
      }
    }
  }

  return false;
};

const findPathParameterIndex = (parameterList, key) => {
  if (getType(parameterList) === NonPrimitiveTypes.ARRAY) {
    // eslint-disable-next-line no-restricted-syntax
    for (let idx = 0; idx < parameterList.length; idx += 1) {
      if (parameterList[idx].in === 'path' && parameterList[idx].name === key) {
        return idx;
      }
    }
  }

  return false;
};

const findQueryParameterIndex = (parameterList, key) => {
  if (getType(parameterList) === NonPrimitiveTypes.ARRAY) {
    // eslint-disable-next-line no-restricted-syntax
    for (let idx = 0; idx < parameterList.length; idx += 1) {
      if (parameterList[idx].in === 'query' && parameterList[idx].name === key) {
        return idx;
      }
    }
  }

  return false;
};

const trimString = (path) => (!path.includes('?') ? path.substr(1) : path.substring(1, path.length - 1));
const replaceRoutes = (route, regex) => route.replace(regex, (x) => `{${trimString(x)}}`);

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

const initSwaggerPathForRouteAndMethod = (swaggerSpec, route, method) => {
  if (!swaggerSpec.paths) {
    swaggerSpec.paths = {
      [route]: {
        [method]: {},
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

  // @TODO: remove default init of definitions after fixing issue with using components/schemas
  if (!swaggerSpec.definitions) {
    swaggerSpec.definitions = [];
  }

  if (swaggerSpec.openapi) {
    initSwaggerSchemaSpecV3(swaggerSpec);
  } else if (swaggerSpec.swagger) {
    initSwaggerSchemaSpecV2(swaggerSpec);
  } else {
    throw new Error('Unknown swagger specification');
  }
};

const initSwaggerSchemaParameters = (
  swaggerSpec,
  originalRoute,
  parameterRegex,
  method,
) => {
  const route = replaceRoutes(originalRoute, parameterRegex);
  initSwaggerPathForRouteAndMethod(swaggerSpec, route, method);
  const parameterList = swaggerSpec.paths[route][method].parameters;
  const parameterPathList = originalRoute.match(parameterRegex);
  if (getType(parameterPathList) !== NonPrimitiveTypes.ARRAY) {
    return;
  }
  for (const path of parameterPathList) {
    if (findPathParameterIndex(parameterList, path) === false) {
      const parameterAlreadyAdded = swaggerSpec.paths[route][method].parameters.some(
        (x) => x.name === trimString(path),
      );
      if (parameterAlreadyAdded) return;

      swaggerSpec.paths[route][method].parameters.push({
        name: trimString(path),
        in: 'path',
        required: !path.includes('?'),
      });
    }
  }
};

const generateQueryParameterSpec = (
  swaggerSpec,
  route,
  method,
  queries,
) => {
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

const generateRequestBodySpec = (
  swaggerSpec,
  route,
  method,
  requestBody,
  contentType,
  definitionName,
) => {
  if (!Object.keys(requestBody).length) {
    return;
  }
  if (!definitionName) {
    definitionName = generateResponseRef(
      swaggerSpec,
      route,
      method,
      contentType,
    );
  }
  if (swaggerSpec.openapi) {
    swaggerSpec.paths[route][method].requestBody = swaggerRef(
      contentType,
      definitionName,
    );
    // Deferring from using component schemas cause WTF is the complexity in making this work
    // I'd revisit at a later time in a more calmer state of mind
    // swaggerSpec.components.schemas[definitionName] = buildSwaggerJSON(requestBody);
    swaggerSpec.definitions[definitionName] = buildSwaggerJSON(
      requestBody,
      swaggerSpec.definitions[definitionName],
    );
  } else if (swaggerSpec.swagger) {
    const parameterList = swaggerSpec[route][method].parameters;
    const bodyIndex = findBodyParameterIndexV2(parameterList);
    if (bodyIndex === false) {
      swaggerSpec.paths[route][method].parameters.push({ schema: {} });
    }
    swaggerSpec.paths[route][method].parameters[bodyIndex].schema.$ref = definitionName;
    swaggerSpec.definitions[definitionName] = buildSwaggerJSON(requestBody);
  } else {
    throw new Error('Unknown swagger specification');
  }
};

const generateResponseBodySpec = (
  swaggerSpec,
  route,
  method,
  responseBody,
  contentType,
  statusCode,
) => {
  if (!responseBody || !Object.keys(responseBody).length) {
    return;
  }
  const definitionName = generateResponseRef();
  if (!swaggerSpec.paths[route][method].responses) {
    swaggerSpec.paths[route][method].responses = {};
  }

  if (swaggerSpec.openapi) {
    const responseSpec = swaggerRef(contentType, definitionName);
    swaggerSpec.paths[route][method].responses[statusCode] = responseSpec;
  } else if (swaggerSpec.swagger) {
    if (!swaggerSpec.paths[route][method].responses[statusCode].schema) {
      swaggerSpec.paths[route][method].responses[statusCode].schema = {};
    }
    swaggerSpec.paths[route][method].responses[
      statusCode
    ].schema.$ref = `#/definitions/${definitionName}`;
  } else {
    throw new Error('Unknown swagger specification');
  }
  swaggerSpec.definitions[definitionName] = buildSwaggerJSON(responseBody);
};

const writeAsSwaggerDocToFile = (
  swaggerSpec,
  method,
  originalRoute,
  parameterRegex,
  responseBody,
  requestBody,
  queries,
  statusCode,
  contentType,
  requestDefinitionName,
  swaggerFilePath,
) => {
  try {
    responseBody = JSON.parse(responseBody);
  } catch (e) {
    logger("Response isn't a JSON object, ignoring parse");
  }
  initSwaggerSchemaParameters(
    swaggerSpec,
    originalRoute,
    parameterRegex,
    method,
  );

  const route = replaceRoutes(originalRoute, parameterRegex);
  if (statusCode < 400) {
    // eslint-disable-next-line max-len
    generateRequestBodySpec(
      swaggerSpec,
      route,
      method,
      requestBody,
      contentType,
      requestDefinitionName,
    );
    generateQueryParameterSpec(swaggerSpec, route, method, queries);
  }

  if (statusCode !== 204) {
    generateResponseBodySpec(
      swaggerSpec,
      route,
      method,
      responseBody,
      contentType,
      statusCode,
    );
  }
  writeFileSync(swaggerFilePath, JSON.stringify(swaggerSpec, null, 4));
};

const getBodyDependencies = (routes, method, swaggerSpec) => {
  const allowedBodyRoutes = ['post', 'put'];
  let definitionName;
  const defaultRef = { dependencies: [], body: {}, definitionName };
  let definitionRef = '';

  if (allowedBodyRoutes.includes(method)) {
    if (swaggerSpec.openapi) {
      if (!routes[method].requestBody) {
        return defaultRef;
      }
      const contentTypes = routes[method].requestBody.content;
      const type = Object.keys(contentTypes)[0];

      definitionRef = contentTypes[type].schema.$ref;
    } else if (swaggerSpec.swagger) {
      const bodyIdx = findBodyParameterIndexV2(routes[method].parameters);
      if (!routes[method].parameters || !bodyIdx) {
        return defaultRef;
      }

      definitionRef = routes[method].parameters[bodyIdx].schema.$ref;
    } else {
      throw new Error('Unknown swagger specification');
    }

    // Not necessarily definitions
    // This fixes the need to manage both swagger 2 or 3 definitions
    // by traversing the rote definition path in the swagger spec
    const definitionPaths = definitionRef.split('/').slice(1);
    [definitionName] = definitionPaths.slice(-1);
    let body = '';
    if (definitionName) {
      body = swaggerSpec;
      for (const path of definitionPaths) {
        body = body[path];
      }
    }

    if (body) {
      const rawDeps = matchAll(
        JSON.stringify(body),
        requestBodyDependencyRegex,
      ).toArray();
      return {
        dependencies: new Set(rawDeps.map(getDependency)),
        body,
        definitionName,
      };
    }
  }

  return defaultRef;
};

const getParameterDependencies = (
  route,
  method,
  parameters,
  name,
  strictMode = false,
) => {
  let dependencies = [];
  const templateKey = 'defaultTemplate';

  if (!parameters) {
    return { route, dependencies: [] };
  }

  if (getType(parameters) === NonPrimitiveTypes.ARRAY) {
    const routeParameters = matchAll(route, routeParametersRegex).toArray();
    parameters.forEach((params) => {
      const template = params[templateKey];

      if (template) {
        if (routeParameters.includes(params.name) && params.in === 'path') {
          route = route.replace(`{${params.name}}`, template);
        }

        dependencies = [...dependencies, getDependency(template)];
      }
    });
    if (!name && dependencies && strictMode) {
      throw Error(`All routes with dependencies must have a name: ${method} ${route}`);
    }
  } else {
    throw Error(`Parameters must be an array ${JSON.stringify(parameters)}`);
  }

  return { dependencies, route };
};

const evaluateRoute = (route, context) => {
  const routeDeps = matchAll(route, routeDependencyRegex).toArray();
  logger(`Evaluating route with context: ${JSON.stringify(context, null, 4)}`);
  for (const dependency of routeDeps) {
    // eslint-disable-next-line no-eval
    const value = eval(`context.${dependency.slice(1)}`);
    route = route.replace(dependency, value);
  }

  return route;
};

const getDefinitions = (swaggerSpec) => generateResponse({}, swaggerSpec.definitions);

const addDefinitions = (bodyDefinitions, swaggerSpec = {}) => {
  for (const name of Object.keys(bodyDefinitions)) {
    swaggerSpec.definitions[name] = buildSwaggerJSON(
      bodyDefinitions[name],
    );
  }
  return swaggerSpec;
};

const parseSwaggerRouteData = (
  swaggerSpec,
  bodyDefinitions,
  strictMode = false,
) => {
  logger('Generating JSON object representing decomposed swagger definitions');
  swaggerSpec.definitions = { ...getDefinitions(swaggerSpec), ...bodyDefinitions };
  const { paths } = swaggerSpec;
  const dependencyGraph = {};
  const definitionMap = {};

  for (const path of Object.keys(paths)) {
    const routes = paths[path];

    for (const method of Object.keys(routes)) {
      logger(`Parsing documentation under ${method.toUpperCase()} ${path}`);
      const { name } = routes[method];

      if (!name) {
        if (!strictMode) {
          // eslint-disable-next-line no-continue
          continue;
        } else {
          throw Error(`Define name for route: ${method.toUpperCase()} ${path}`);
        }
      }

      if (dependencyGraph[name] && strictMode) {
        throw Error(`Duplicate dependency name: ${name}`);
      }

      logger('Obtaining parameter dependencies');
      const {
        route,
        dependencies: parameterDependencies,
      } = getParameterDependencies(path, method, routes[method].parameters, name);

      logger('Obtaining request body dependencies');
      const {
        body,
        definitionName,
        dependencies: bodyDependencies,
      } = getBodyDependencies(routes, method, swaggerSpec);
      if (definitionName) {
        definitionMap[path] = { [method.toUpperCase()]: definitionName };
      }

      const dependencies = Array.from(
        new Set([...parameterDependencies, ...bodyDependencies]).values(),
      );
      dependencyGraph[name] = { dependencies };

      const reqObj = {
        requestBody: body,
        apiRoute: route,
        originalRoute: path,
        method,
      };

      if (Object.keys(body).length > 0) {
        reqObj.definitionName = definitionName;
      }

      if (dependencyGraph[name]) {
        dependencyGraph[name].requestData = reqObj;
      }

      logger(`Successfully obtained dependencies for node ${name}`);
      logger('-');
    }
  }

  return { dependencyGraph, definitionMap };
};

module.exports = {
  parseSwaggerRouteData,
  evaluateRoute,
  buildSwaggerJSON,
  addDefinitions,
  swaggerRef,
  generateResponseRef,
  generateResponse,
  getType,
  findBodyParameterIndexV2,
  findPathParameterIndex,
  findQueryParameterIndex,
  writeAsSwaggerDocToFile,
  replaceRoutes,
  trimString,
  NonPrimitiveTypes,
  generateResponseBodySpec,
};
