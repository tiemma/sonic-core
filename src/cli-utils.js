const { ensureFileSync } = require('fs-extra');
const { resolve } = require('path');

const commaSeparatedList = (value) => value.split(',');

// async by default since certain configs would
// require promise related calls
async function verifyFileIsRequirable(path) {
  if (!path) {
    return;
  }
  try {
    path = resolve(path);
    console.log(`Attempting to require file at path ${path}`);
    return await require(path);
  } catch (e) {
    throw Error(`File at ${path} must exist and be require-able`);
  }
}

const createFileIfNotExists = (path) => {
  if (!path) {
    console.log('Swagger response would be written to consoles standard output');
    return;
  }
  ensureFileSync(path);
  return path;
};

module.exports = { commaSeparatedList, verifyFileIsRequirable, createFileIfNotExists };
