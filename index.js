const { getResponsesInDependencyOrder } = require("./src/api-utils");
const { addDefinitions } = require("./src/swagger-utils");
const {commaSeparatedList, verifyFileIsRequirable, createFileIfNotExists} = require("./src/cli-utils")
const {version} = require("./package.json");

const swaggerJSDoc = require("swagger-jsdoc");
const {textSync} = require("figlet")
const {yellow} = require("chalk")
const {program} = require("commander");
const {writeFileSync} = require("fs");


const init = async (options) => {

    console.log(options)
    const {requestOptions, swaggerOptions, bodyDefinitions, dataPath, outputFile}  = options;

    const swaggerSpec = await swaggerResponse(await requestOptions, await swaggerOptions, await bodyDefinitions, dataPath)


    if(!outputFile) {
        console.log(swaggerSpec);
    } else {
        const data = JSON.stringify(swaggerSpec, null, 4);
        writeFileSync(outputFile, data);
    }
}

const swaggerResponse = async (requestOptions = {}, swaggerOptions = {}, bodyDefinitions = {}, dataPath = []) => {
    const {swaggerSpec, bodyDefinitions: definitions} = await getResponsesInDependencyOrder(swaggerJSDoc(swaggerOptions), requestOptions, bodyDefinitions, dataPath);

    return addDefinitions(definitions, swaggerSpec);
}

(async () => {
    console.log(yellow(textSync("Swagger Response")));

    program.version(version);

    program.option("-d, --body-definitions <file>", "Path to the file exporting the definitions to be added to the swagger.json output", await verifyFileIsRequirable)
        .option("-r, --request-options <file>", "Path to the file exporting the axios config for accessing the backend", await verifyFileIsRequirable)
        .option("-s, --swagger-options <file>", "Path to the file exporting additional SwaggerJSDoc configuration in JSON", await verifyFileIsRequirable)
        .option("-p, --data-path <items>", "Comma delimited path to the actual response data to use in evaluating responses", commaSeparatedList, [])
        .option("-e, --entry-script <items>", "Package.json script to run the server")
        .option("-o, --output-file <type>", "Output file for the generated swagger spec.\nIf not provided, output is sent to the consoles standard output", createFileIfNotExists)

    program.parse(process.argv);

    await init(program.opts());
})()