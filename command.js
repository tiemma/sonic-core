const { textSync } = require('figlet');
const { program } = require('commander');
const { yellow } = require('chalk');
const { version } = require('./package.json');
const { init } = require('.');

const {
  commaSeparatedList, verifyFileIsRequirable, createFileIfNotExists,
} = require('./src/cli-utils');

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
