const version = process.env.VERSION;
const swaggerDefinition = {
  openapi: '3.0.1',
  info: {
    title: 'Demo server',
    version,
    description: 'Random description on API related stuff',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Host system path',
    },
  ],
  definitions: {},
  paths: {},
  components: {
    securitySchemes: {
      jwt: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token to authenticate requests with',
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
  apis: ['./examples/route.ts'],
};

module.exports = options;
