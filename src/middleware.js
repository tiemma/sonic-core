const swaggerJSDoc = require('swagger-jsdoc');
const { debugLogger } = require('./logger');
const { parseSwaggerRouteData } = require('./swagger-utils');

const logger = debugLogger(__filename);

const getResponse = (swaggerOptions) => {
  const { definitionMap } = parseSwaggerRouteData(swaggerJSDoc(swaggerOptions), {});
  return (req, res, next) => {
    // Set state of routes and definitions on first request
    // Deferred afterwards until a restart is done
    logger(definitionMap);
    res.on('finish', () => {
      logger(res.req.body,
        res.req.method.toUpperCase(),
        res.req.route ? res.req.route.path : req.url,
        res.req.query,
        res.outputData);
    });
    return next();
  };
};
module.exports = { getResponse };
