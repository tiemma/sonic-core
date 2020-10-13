const swaggerJSDoc = require('swagger-jsdoc');
const { textSync } = require('figlet');
const { yellow } = require('chalk');
const { program } = require('commander');
const { writeFileSync } = require('fs');
const { exec } = require('child_process');
const ws = require('ws');
const { dependencyCycleDetection, satisfyDependencyConstraints } = require('./src/graph-utils');

const { version } = require('./package.json');
const {
  commaSeparatedList, verifyFileIsRequirable, createFileIfNotExists,
} = require('./src/cli-utils');
const { addDefinitions, parseSwaggerRouteData } = require('./src/swagger-utils');
const { getResponsesInDependencyOrder } = require('./src/api-utils');
const { logger: loggerInstantiator, logLevels } = require('./src/logger');

const swaggerResponse = async (
  requestOptions = {},
  swaggerOptions = {},
  bodyDefinitions = {},
  dataPath = [],
) => {
  const {
    swaggerSpec,
    bodyDefinitions: definitions,
    dependencyGraph,
  } = await getResponsesInDependencyOrder(
    swaggerJSDoc(swaggerOptions),
    requestOptions,
    bodyDefinitions,
    dataPath,
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
    global.log(data);
  });

  child.stderr.setEncoding('utf-8');
  child.stderr.on('data', (data) => {
    global.log(data);
  });

  child.stdout.on('close', (code) => {
    global.log(code);

    global.log('Shutting down...');
  });
};

const initWebSocketServer = (metrics) => {
  const server = new ws.Server(
    { port: 8080, path: '/metrics' },
    () => {
      global.log('Websocket server is up and running');
    },
  );

  server.on('connection', (socket) => {
    socket.send(metrics);
  });
};

const serveFrontend = (metrics) => {
  initWebSocketServer(metrics);
  execCommand('npm start');
};

const init = async (options) => {
  const {
    requestOptions, swaggerOptions, bodyDefinitions, dataPath, outputFile, verbose,
  } = options;

  if (verbose) {
    global.log = loggerInstantiator(logLevels.INFO);
  }

  // const { swaggerSpec, dependencyGraph } = await swaggerResponse(
  //   await requestOptions,
  //   await swaggerOptions,
  //   await bodyDefinitions,
  //   dataPath,
  // );

  const { dependencyGraph } = parseSwaggerRouteData(
    swaggerJSDoc(await swaggerOptions),
    await bodyDefinitions,
  );

  const metrics = {
    dependencyGraph,
    cycleData: dependencyCycleDetection(dependencyGraph),
    unsatisfiedDependencies: satisfyDependencyConstraints(dependencyGraph),
  };
  serveFrontend(JSON.stringify(metrics));

  if (!outputFile) {
    global.log(swaggerSpec);
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
    .option('-o, --output-file <type>', 'Output file for the generated swagger spec.\nIf not provided, output is sent to the consoles standard output', createFileIfNotExists)
    .option('-v, --verbose', 'Outputs task logs to console');

  program.command('serve')
    .option('-p, --port <port>', 'Port to host the websocket server on', '8080');

  program.parse(process.argv);

  init(program.opts());
})();
