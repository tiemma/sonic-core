const routeParametersRegex = /{(\w+)}+/g;
const requestBodyDependencyRegex = /("\$\w+(((\[\w+\])+)?|((\.\w+)+)?)+")/g;
const routeDependencyRegex = /(\$\w+(((\[\w+\])+)?|((\.\w+)+)?)+)/g;

const getDependency = (deps) => deps.slice(1).match(/\w+/)[0];

module.exports = {
  routeParametersRegex, requestBodyDependencyRegex, routeDependencyRegex, getDependency,
};
