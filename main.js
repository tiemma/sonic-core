const swaggerJSDoc = require("swagger-jsdoc");
const { options } = require("./swagger-config.js");
const { getResponsesInDependencyOrder } = require("./api-utils");
const { addDefinitions } = require("./swagger-utils");

const token = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JRCI6ImJiZTU1MGVhLWQ1NjQtNDA5OS1hMGE1LWJiNjA5NDA1MjlkMSIsInRlbmFudE9yZ0lEIjoiYmJlNTUwZWEtZDU2NC00MDk5LWEwYTUtYmI2MDk0MDUyOWQxIiwicm9sZSI6IlNVUEVSX0FETUlOIiwic3ViIjoiYmYxZjE4NDItMTU5ZS00MDFiLWIzMTItMDE0ZWI4OTQxYmRjIiwiYXVkIjoicmVwbGV4X3NlcnZlciIsImlhdCI6MTYwMTc1MjEwNCwiZXhwIjoxNjA0MzQ0MTA0LCJpc3MiOiJyZXBsZXgifQ.BygSvT9KT6lqmRFrX6R37z2-FHkOO60-1Di_nC3SlhpRo14f-HeibJv2dF10ApYNhyGJ5oIQaC04W35UWXpJ239iXM8TfrbHZN_63eeroprb_3dtd3QYw-JWqk8V95bTOI5weGxnAcaVC1tjLOhqP3TAQcx6ISi4h3sU-mGztxI`
const requestOptions = {
    headers: {"Authorization": `Bearer ${token}`},
    timeout: 10000,
    baseURL: "http://localhost:3100" + "/api/v1",
}

const bodyDefinitions = require("./swagger-samples.json");

const swaggerResponse = async (requestOptions = {}, swaggerOptions = {}, bodyDefinitions = {}, dataPath = []) => {
    const {swaggerSpec, bodyDefinitions: definitions} = await getResponsesInDependencyOrder(swaggerJSDoc(options), requestOptions, bodyDefinitions, dataPath);

    return addDefinitions(definitions, swaggerSpec)
}

(async () => {
        const fs = require("fs");
        const swaggerSpec = await swaggerResponse(requestOptions, options, bodyDefinitions, ["data"])

        fs.writeFileSync("./dist/swagger.json", JSON.stringify(swaggerSpec, null, 4));
    }
)()

module.exports = {
    swaggerResponse,
}