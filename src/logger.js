const { createLogger, format, transports } = require('winston');
const debug = require('debug');
const { dirname, relative } = require('path');
const {
  blue,
} = require('chalk');
const { name } = require('../package.json');

const { printf, combine } = format;

const logLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

const debugLogger = (namespace) => debug(`${name}: ${new Date().toISOString()} ${relative(dirname(require.main.filename.replace('bin', '')), namespace)}`);

const logger = (logLevel) => {
  const plainFormat = printf(({
    level, message, label, time,
  }) => `${blue(time)} [${JSON.stringify(label)}] ${level}: ${message}`);

  const instance = createLogger({
    format: combine(
      plainFormat,
    ),
    transports: new transports.Console({ handleExceptions: true }),
  });

  return (msg, label) => instance.log(
    logLevel,
    msg,
    {
      label: label || {},
      time: new Date().toISOString(),
    },
  );
};

module.exports = { logger, logLevels, debugLogger };
