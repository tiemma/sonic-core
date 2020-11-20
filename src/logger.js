const debug = require('debug');
const { dirname, relative } = require('path');
const { name } = require('../package.json');

const debugLogger = (namespace) => debug(`${name}: ${namespace}`);

module.exports = { debugLogger };
