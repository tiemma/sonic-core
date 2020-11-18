const debug = require('debug');
const { dirname, relative } = require('path');
const { name } = require('../package.json');

const debugLogger = (namespace) => debug(`${name}: ${new Date().toISOString()} ${relative(dirname(require.main.filename.replace('bin', '')), namespace)}`);

module.exports = { debugLogger };
