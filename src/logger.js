const { createLogger, format, transports } = require('winston');
const {
  blue, white,
} = require('chalk');

const { printf, combine } = format;

const logger = () => {
  const plainFormat = printf(({
    level, message, label, time, color,
  }) => `${blue(time)} [${JSON.stringify(label)}] ${color(level)}: ${color(message)}`);

  const instance = createLogger({
    format: combine(
      plainFormat,
    ),
    transports: new transports.Console({ handleExceptions: true }),
  });

  return (msg, label) => instance.log(
    'info',
    JSON.stringify(msg, null, 4),
    {
      label: label || {},
      time: new Date().toISOString(),
      color: white,
    },
  );
};

module.exports = logger;
