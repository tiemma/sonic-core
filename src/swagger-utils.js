const matchAll = require('match-all');
const safeEval = require('safe-eval');
const { debugLogger } = require('./logger');
const {
  routeParametersRegex, requestBodyDependencyRegex, getDependency, routeDependencyRegex,
} = require('./regex-utils');

const logger = debugLogger(__filename);

const getType = (obj) => ({}.toString
  .call(obj)
  .match(/\s([a-zA-Z]+)/)[1]
  .toLowerCase());

const DataTypes = {
  ARRAY: 'array',
  OBJECT: 'object',
  NULL: 'null',
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

const generateResponseRef = () => Math.random().toString(36).substring(7);

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

const buildSwaggerJSON = (data) => {
  const keys = Object.keys(data || {});
  const op = {
    required: keys,
    properties: {},
  };

  if (getType(data) === DataTypes.ARRAY) {
    const { properties } = buildSwaggerJSON(data[0]);
    op.type = DataTypes.ARRAY;
    op.items = {
      type: getType(data[0]),
      properties,
    };
    op.required = Object.keys(properties);
    op.example = data;
    return op;
  }

  for (const key of keys) {
    const value = data[key];
    let typeData = getType(value);
    const nonSingularTypes = [DataTypes.ARRAY, DataTypes.OBJECT, DataTypes.NULL];

    if (!nonSingularTypes.includes(typeData)) {
      op.properties[key] = {
        type: typeData,
      };
      op.properties[key].example = value;
    } else {
      switch (typeData) {
        case DataTypes.ARRAY:
          typeData = getType(data[key][0]);
          if (typeData === DataTypes.ARRAY) {
            throw new Error(
              'Complex object (array of array etc...)',
              data[key][0],
            );
          }
          if (typeData === DataTypes.OBJECT) {
            op.properties[key] = {
              type: DataTypes.ARRAY,
              items: {
                type: typeData,
                properties: buildSwaggerJSON(data[key][0]).properties,
              },
            };
            break;
          }
          op.properties[key] = {
            type: DataTypes.ARRAY,
            items: {
              type: typeData,
            },
          };
          op.properties[key].example = value;
          break;
        case DataTypes.OBJECT:
          op.properties[key] = buildSwaggerJSON(data[key]);
          op.properties[key].type = DataTypes.OBJECT;
          break;
        default:
          logger(`skipping ${typeData}`);
          break;
      }
    }
  }
  return op;
};

const getBodyDependencies = (routes, method, swaggerSpec) => {
  const allowedBodyRoutes = ['post', 'put'];
  let definitionName;

  if (allowedBodyRoutes.includes(method) && routes[method].requestBody) {
    const contentTypes = routes[method].requestBody.content;

    for (const type of Object.keys(contentTypes)) {
      const definitionRef = contentTypes[type].schema.$ref;
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
        const rawDeps = matchAll(JSON.stringify(body), requestBodyDependencyRegex).toArray();
        return { dependencies: new Set(rawDeps.map(getDependency)), body, definitionName };
      }
    }
  }

  return { dependencies: [], body: {}, definitionName };
};

const getParameterDependencies = (route, method, parameters, name, strictMode = false) => {
  let dependencies = [];
  const templateKey = 'defaultTemplate';

  if (!parameters) {
    return { route, dependencies: [] };
  }

  if (getType(parameters) === DataTypes.ARRAY) {
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
  for (const dependency of routeDeps) {
    const value = safeEval(dependency.slice(1), context);
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

const parseSwaggerRouteData = (swaggerSpec, bodyDefinitions, strictMode = false) => {
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
  getType,
  DataTypes,
};
