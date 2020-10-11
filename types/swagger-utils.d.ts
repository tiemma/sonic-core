import {OpenAPI} from "openapi-types";
import {DependencyGraph} from "./graph-utils";

export enum HTTPMethods {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    CONNECT = "CONNECT",
    DELETE = "DELETE",
    HEAD = "HEAD"
}

export interface RequestObject {
    requestBody: any,
    apiRoute: string,
    originalRoute: string,
    method: HTTPMethods,
    definitionName?: string
}

export function parseSwaggerRouteData(swaggerSpec: OpenAPI.Document, bodyDefinitions: any): {
    dependencyGraph: DependencyGraph;
};
export function evaluateRoute(route: string, context: any): string;
export function buildSwaggerJSON(data: OpenAPI.Document): {
    required: string[];
    properties: any;
};
export function addDefinitions(bodyDefinitions: any, swaggerSpec?: OpenAPI.Document): OpenAPI.Document;
//# sourceMappingURL=swagger-utils.d.ts.map