const swaggerJSDoc = require('swagger-jsdoc');
const { textSync } = require('figlet');
const { yellow } = require('chalk');
const { program } = require('commander');
const { writeFileSync } = require('fs');
const { version } = require('./package.json');
const {
  commaSeparatedList, verifyFileIsRequirable, createFileIfNotExists,
} = require('./src/cli-utils');
const { addDefinitions } = require('./src/swagger-utils');
const { getResponsesInDependencyOrder } = require('./src/api-utils');
const loggerInstantiator = require('./src/logger');

const swaggerResponse = async (
  requestOptions = {},
  swaggerOptions = {},
  bodyDefinitions = {},
  dataPath = [],
) => {
  const {
    swaggerSpec,
    bodyDefinitions: definitions,
  } = await getResponsesInDependencyOrder(
    swaggerJSDoc(swaggerOptions),
    requestOptions,
    bodyDefinitions,
    dataPath,
  );

  return addDefinitions(definitions, swaggerSpec);
};

const init = async (options) => {
  const {
    requestOptions, swaggerOptions, bodyDefinitions, dataPath, outputFile, verbose,
  } = options;

  process.log = () => {};
  if (verbose) {
    process.log = loggerInstantiator(7);
  }

  const swaggerSpec = await swaggerResponse(
    await requestOptions,
    await swaggerOptions,
    await bodyDefinitions,
    dataPath,
  );

  if (!outputFile) {
    process.log(swaggerSpec);
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
  program.parse(process.argv);

  init(program.opts());
})();
