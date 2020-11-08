const swaggerJSDoc = require('swagger-jsdoc');
const { yellow, red } = require('chalk');
const { writeFileSync } = require('fs');
const { exec } = require('child_process');
const ws = require('ws');

const { dependencyCycleDetection, satisfyDependencyConstraints, topologicalDependencySort } = require('./src/graph-utils');

const { addDefinitions, parseSwaggerRouteData } = require('./src/swagger-utils');
const { getResponsesInDependencyOrder } = require('./src/api-utils');
const { debugLogger } = require('./src/logger');
const { getResponse } = require('./src/middleware');

const logger = debugLogger(__filename);

const swaggerResponse = async (
  swaggerDoc,
  requestOptions = {},
  bodyDefinitions = {},
  dataPath = [],
  strict = false,
) => {
  const {
    swaggerSpec,
    bodyDefinitions: definitions,
    dependencyGraph,
  } = await getResponsesInDependencyOrder(
    swaggerDoc,
    requestOptions,
    bodyDefinitions,
    dataPath,
    strict,
  );

  return { swaggerSpec: addDefinitions(definitions, swaggerSpec), dependencyGraph };
};

const execCommand = (command) => {
  const child = exec(command, {
    stdio: 'inherit',
    shell: true,
    cwd: './frontend',
    detached: true,
  });

  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', (data) => {
    logger(data);
  });

  child.stderr.setEncoding('utf-8');
  child.stderr.on('data', (data) => {
    logger(data);
  });

  child.stdout.on('close', (code) => {
    logger(code);

    logger('Shutting down...');
  });
};

const initWebSocketServer = async (swaggerOptions, inputFile, bodyDefinitions, port) => {
  const PORT = port || 6060;
  const server = new ws.Server(
    { port: PORT, path: '/metrics' },
    () => {
      logger(`Websocket server is up and running on port: ${PORT}`);
    },
  );

  server.on('connection', async (socket) => {
    const swaggerDoc = await inputFile || swaggerJSDoc(await swaggerOptions);
    const { dependencyGraph } = parseSwaggerRouteData(swaggerDoc, await bodyDefinitions);

    const metrics = {
      dependencyGraph,
      cycleData: dependencyCycleDetection(dependencyGraph),
      unsatisfiedDependencies: satisfyDependencyConstraints(dependencyGraph),
      dependencyOrderQueue: topologicalDependencySort(dependencyGraph),
    };

    socket.send(JSON.stringify(metrics));
  });
};

const serveFrontend = (swaggerOptions, inputFile, bodyDefinitions, port) => {
  initWebSocketServer(swaggerOptions, inputFile, bodyDefinitions, port);
  execCommand('npm start');
};

const init = async (options) => {
  const {
    requestOptions, swaggerOptions, bodyDefinitions, dataPath, outputFile, inputFile, strict, port,
  } = options;

  const swaggerDoc = await inputFile || swaggerJSDoc(await swaggerOptions);
  let swaggerSpec = '';
  try {
    swaggerSpec = (await swaggerResponse(
      swaggerDoc,
      await requestOptions,
      await bodyDefinitions,
      dataPath,
      strict,
    )).swaggerSpec;
  } catch (e) {
    logger(yellow(e));
    logger(red('Error whilst obtaining swagger response, defaulting to writing swagger spec without response'));
    throw e;
  }

  serveFrontend(swaggerOptions, inputFile, bodyDefinitions, port);

  if (!outputFile) {
    logger(swaggerSpec);
  } else {
    const data = JSON.stringify(swaggerSpec, null, 4);
    writeFileSync(outputFile, data);
  }
};

module.exports = { getResponse, init };
