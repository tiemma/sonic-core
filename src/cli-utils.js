const { ensureFileSync } = require('fs-extra');
const { resolve } = require('path');

const commaSeparatedList = (value) => value.split(',');

// async by default since certain configs would
// require promise related calls
const verifyFileIsRequirable = async (path) => {
  if (!path) {
    return '';
  }
  try {
    const resolvedPath = resolve(path);
    // eslint-disable-next-line no-console
    console.log(`Attempting to require file at path ${resolvedPath}`);
    // eslint-disable-next-line global-require,import/no-dynamic-require
    return require(resolvedPath);
  } catch (e) {
    throw Error(`File at ${path} must exist and be require-able`);
  }
};

const createFileIfNotExists = (path) => {
  if (!path) {
    // eslint-disable-next-line no-console
    console.log('Swagger response would be written to consoles standard output');
    return '';
  }
  ensureFileSync(path);
  return path;
};

module.exports = {
  commaSeparatedList, verifyFileIsRequirable, createFileIfNotExists,
};
