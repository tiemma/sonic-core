const fs = require("fs");
const swaggerJSDoc = require("swagger-jsdoc");
const { options } = require("./swagger-config.js");

const hasOnlyOneSimilarElement = (haystack, needle) => {
    let count = 0;
    for (const el of needle) {
        if (haystack.includes(el)) {
            count++;
        }
        if (count > 1) {
            break;
        }
    }
    return count === 1;
};

const isEmpty = (obj) =>
    Object.keys(obj).length === 0 && obj.constructor === Object;

const generateSwaggerDoc = (tagsToKeep, suffix) => {
    let swaggerSpec = swaggerJSDoc(options);
    if (tagsToKeep) {
        if (!suffix) {
            throw "Suffix must be provided with a tag filter";
        }

        for (const path of Object.keys(swaggerSpec["paths"])) {
            for (const verb of Object.keys(swaggerSpec["paths"][path])) {
                const tags = swaggerSpec["paths"][path][verb]["tags"];
                if (hasOnlyOneSimilarElement(tags, tagsToKeep)) {
                    if (tags.includes("Stats")) {
                        swaggerSpec["paths"][path][verb]["tags"] = ["Stats"];
                    } else if (tags.includes("Auth")) {
                        swaggerSpec["paths"][path][verb]["tags"] = ["Auth"];
                    } else if (tags.includes("Cluster")) {
                        swaggerSpec["paths"][path][verb]["tags"] = ["Cluster"];
                    }
                } else {
                    delete swaggerSpec["paths"][path][verb];
                }
            }
            // Delete the path entirely if it's empty
            isEmpty(swaggerSpec["paths"][path]) && delete swaggerSpec["paths"][path];
        }
    }

    let path = suffix ? `./dist/swagger-${suffix}.json` : `./dist/swagger.json`;
    swaggerSpec = addDefinitions(swaggerSpec);
    fs.writeFileSync(path, JSON.stringify(swaggerSpec, null, 4));

    return swaggerSpec;
};

const getType = (obj) => {
    return {}.toString
        .call(obj)
        .match(/\s([a-zA-Z]+)/)[1]
        .toLowerCase();
};

const
    buildSwaggerJSON = (data) => {
    const keys = Object.keys(data);
    const op = {
        required: keys,
        properties: {},
    };
    for (const key of keys) {
        const value = data[key];
        let typeData = getType(value);
        const nonSingularTypes = ["array", "object", "null"];
        if (!nonSingularTypes.includes(typeData)) {
            op.properties[key] = {
                type: typeData,
            };
            op.properties[key].example = value;
            continue;
        }

        switch (typeData) {
            case "array":
                typeData = getType(data[key][0]);
                if (typeData === "array") {
                    throw new Error(
                        "Complex object (array of array etc...)",
                        data[key][0]
                    );
                }
                if (typeData === "object") {
                    op.properties[key] = {
                        type: "array",
                        items: {
                            type: typeData,
                            properties: buildSwaggerJSON(data[key][0]).properties,
                        },
                    };
                    break;
                }
                op.properties[key] = {
                    type: "array",
                    items: {
                        type: typeData,
                    },
                };
                op.properties[key].example = value;
                break;
            case "object":
                op.properties[key] = buildSwaggerJSON(data[key]);
                op.properties[key].type = "object";
                break;
            default:
                console.warn("skipping ", typeData);
                break;
        }
    }
    return op;
};

const addDefinitions = (swaggerSpec) => {
    const responseDefinitions = require("./swagger-samples.json");
    for (const namespace of Object.keys(responseDefinitions)) {
        for (const name of Object.keys(responseDefinitions[namespace]))
            swaggerSpec["definitions"][name] = buildSwaggerJSON(
                responseDefinitions[namespace][name]
            );
    }
    return swaggerSpec;
};

try {
    // Generate Swagger doc
    generateSwaggerDoc();
    generateSwaggerDoc(["Stats", "External"], "external");
} catch (err) {
    console.error(err);
    process.exit(1);
}

module.exports = {
    generateSwaggerDoc,
    buildSwaggerJSON,
    hasOnlyOneSimilarElement,
    isEmpty,
    getType,
};
