const swaggerJSDoc = require("swagger-jsdoc");
const { getResponsesInDependencyOrder } = require("./api-utils");
const { addDefinitions } = require("./swagger-utils");
const {commaSeparatedList, verifyFileIsRequirable} = require("./cli-utils")
const {version} = require("./package.json");

const {textSync} = require("figlet")
const {yellow} = require("chalk")
const {program} = require("commander");
const {writeFileSync} = require("fs");


const init = async () => {
    console.log(yellow(textSync("Swagger Response")))

    program.version(version);

    program.option("-d, --body-definitions <file>", "Path to the file exporting the definitions to be added to the swagger.json output", verifyFileIsRequirable)
        .option("-r, --request-options <file>", "Path to the file exporting the axios config for accessing the backend", verifyFileIsRequirable)
        .option("-s, --swagger-options <file>", "Path to the file exporting additional SwaggerJSDoc configuration in JSON", verifyFileIsRequirable)
    .option("-p, --data-path <items>", "Comma delimited path to the actual response data to use in evaluating responses", commaSeparatedList, [])
    .option("-e, --entry-script <items>", "Package.json script to run the server")

    program.parse(process.argv);

    const {requestOptions, swaggerOptions, bodyDefinitions, dataPath}  = program.opts();

    const swaggerSpec = await swaggerResponse(requestOptions, swaggerOptions, bodyDefinitions, dataPath)
    writeFileSync("./dist/swagger.json", JSON.stringify(swaggerSpec, null, 4));
}

const swaggerResponse = async (requestOptions = {}, swaggerOptions = {}, bodyDefinitions = {}, dataPath = []) => {
    const {swaggerSpec, bodyDefinitions: definitions} = await getResponsesInDependencyOrder(swaggerJSDoc(swaggerOptions), requestOptions, bodyDefinitions, dataPath);

    return addDefinitions(definitions, swaggerSpec)
}

init()

module.exports = {
    swaggerResponse,
}