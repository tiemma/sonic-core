const version = process.env.VERSION;
const swaggerDefinition = {
    openapi: "3.0.1",
    info: {
        title: "Replex Server",
        version,
        description:
            "API documentation describing endpoints and parameters needed to interact with the Replex Server. Sample calls and response included.",
    },
    servers: [
        {
            url: "/api/v1",
            description: "Host system path",
        },
    ],
    definitions: {
        pathID: {
            type: "string",
            format: "UUID",
            required: true,
        },
        workload: {
            type: "string",
            required: true,
        },
    },
    components: {
        securitySchemes: {
            jwt: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Token to authenticate requests with",
            },
        },
    },
    security: [
        {
            jwt: [],
        },
    ],
};

// options for the swagger docs
const options = {
    // import swaggerDefinitions
    swaggerDefinition,
    // path to the API docs
    // apis: ["/home/bakman/WebstormProjects/server/**/*.ts"],
    apis: ["*.ts"],
};

module.exports = options;
