const debug = require('debug');
const { name } = require('../package.json');

const debugLogger = (namespace) => debug(`${name}: ${namespace}`);

module.exports = { debugLogger };
