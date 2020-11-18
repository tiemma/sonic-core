// eslint-disable-next-line import/prefer-default-export,global-require,import/no-dynamic-require
export const getSpec = (file = './spec.json') => JSON.parse(JSON.stringify(require(file)));
