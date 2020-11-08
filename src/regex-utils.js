const routeParametersRegex = /{(\w+)}+/g;

// Both regexes parse strings like "$Cluster[0].id" etc
// Mainly javascript expressions with the dollar sign
// routeDependencyRegex => "/organizations/$organizationID[0]/blanks"
// requestBodyDependencyRegex => "{ cluster: "$Cluster" }"
const requestBodyDependencyRegex = /("\$\w+(((\[\w+\])+)?|((\.\w+)+)?)+")/g;
const routeDependencyRegex = /(\$\w+(((\[\w+\])+)?|((\.\w+)+)?)+)/g;

const getDependency = (deps) => deps.slice(1).match(/\w+/)[0];

module.exports = {
  routeParametersRegex, requestBodyDependencyRegex, routeDependencyRegex, getDependency,
};
