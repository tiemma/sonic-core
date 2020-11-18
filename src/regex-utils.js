// Matches swagger routes: /api/v1/{value}
const routeParametersRegex = /{(\w+)}+/g;

// Both regexes parse strings like "$Value[0].id" etc
// Mainly javascript expressions with the dollar sign
// routeDependencyRegex => "/$params[0]/blanks"
// requestBodyDependencyRegex => "{ key: "$Param" }"
const routeDependencyRegex = /(\$\w+(((\[\w+\])+)?|((\.\w+)+)?)+)/g;
const requestBodyDependencyRegex = /("\$\w+(((\[\w+\])+)?|((\.\w+)+)?)+")/g;

const getDependency = (deps) => deps.slice(1).match(/\w+/)[0];

module.exports = {
  routeParametersRegex, requestBodyDependencyRegex, routeDependencyRegex, getDependency,
};
