const swaggerJSDoc = require('swagger-jsdoc');
const { textSync } = require('figlet');
const { yellow, red } = require('chalk');
const { program } = require('commander');
const { writeFileSync } = require('fs');
const { exec } = require('child_process');
const ws = require('ws');

const { dependencyCycleDetection, satisfyDependencyConstraints, topologicalDependencySort } = require('./src/graph-utils');
const { version } = require('./package.json');
const {
  commaSeparatedList, verifyFileIsRequirable, createFileIfNotExists,
} = require('./src/cli-utils');
const { addDefinitions, parseSwaggerRouteData } = require('./src/swagger-utils');
const { getResponsesInDependencyOrder } = require('./src/api-utils');
const { debugLogger } = require('./src/logger');

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

(() => {
  // eslint-disable-next-line no-console
  console.log(yellow(textSync('Swagger Response')));

  program.version(version);

  program.option('-d, --body-definitions <file>', 'Path to the file exporting the definitions to be added to the swagger.json output', verifyFileIsRequirable)
    .option('-r, --request-options <file>', 'Path to the file exporting the axios config for accessing the backend', verifyFileIsRequirable)
    .option('-s, --swagger-options <file>', 'Path to the file exporting additional SwaggerJSDoc configuration in JSON', verifyFileIsRequirable)
    .option('-p, --data-path <items>', 'Comma separated path to the actual response data to use in evaluating responses', commaSeparatedList, [])
    .option('-e, --entry-script <items>', 'Package.json script to run the server')
    .option('-i, --input-file <file>', 'Path to an input swagger file to process, defaults to swaggerJSDoc parse', verifyFileIsRequirable)
    .option('-o, --output-file <type>', 'Output file for the generated swagger spec.\nIf not provided, output is sent to the consoles standard output', createFileIfNotExists)
    .option('--strict', 'Enable strict mode on swagger data  validation', false);

  program.command('serve')
    .option('-p, --port <port>', 'Port to host the websocket server on', process.env.WEBSOCKET_PORT || '8080');

  program.parse(process.argv);

  init(program.opts());
})();
