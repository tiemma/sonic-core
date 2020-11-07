const swaggerJSDoc = require('swagger-jsdoc');
const { debugLogger } = require('./logger');
const { parseSwaggerRouteData } = require('./swagger-utils');

const logger = debugLogger(__filename);

const replaceRoutes = (route) => {
  const regex = /(:\w+)/g;
  return route.replace(regex, (x) => `{${x.substr(1)}}`);
};

const getResponse = (app, swaggerOptions) => {
  const { definitionMap } = parseSwaggerRouteData(swaggerJSDoc(swaggerOptions), {});
  logger(definitionMap);

  (function (send) {
    app.response.send = function (body) {
      this.outputData = body;
      logger(body);
      return send.call(this, body);
    };
  }(app.response.send));
  return (req, res, next) => {
    // Set state of routes and definitions on first request
    // Deferred afterwards until a restart is done
    // @todo: find res object containing object responses
    res.on('finish', () => {
      const route = res.req.route ? res.req.route.path : req.url;
      const method = res.req.method.toUpperCase();
      const definitionName = definitionMap[replaceRoutes(route)];
      logger(res.req.body,
        method,
        route,
        res.req.query,
        res.outputData,
        definitionName ? definitionName[method] : 'Not included');
    });
    return next();
  };
};
module.exports = { getResponse };
