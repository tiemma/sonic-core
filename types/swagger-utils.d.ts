import {OpenAPI, OpenAPIV2} from "openapi-types";
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
export function buildSwaggerJSON(data: any): {
    required: string[];
    properties: any;
    type: string;
    example: any;
};
export function addDefinitions(bodyDefinitions: any, swaggerSpec?: OpenAPI.Document): OpenAPI.Document;

export function getType(obj: any): string;

export const NonPrimitiveTypes: Record<string, string>

export function swaggerRef(contentType: string, responseRef: string, prefix: string): any;

export function generateResponseRef(): string;

export function buildSwaggerJSON(data: any): any;

export function findBodyParameterIndexV2(parameterList: OpenAPIV2.ParameterObject): number | boolean;

export function findPathParameterIndex(parameterList: OpenAPIV2.ParameterObject, key: string): number | boolean;

export function findQueryParameterIndex(parameterList: OpenAPIV2.ParameterObject, key: string): number | boolean;

export function trimString(path: string): string;

export function replaceRoutes(route: string, regex: RegExp): string;

export function writeAsSwaggerDocToFile(
    swaggerSpec: OpenAPI.Document,
    method: string,
    route: string,
    parameterRegex: RegExp,
    responseBody: any,
    queries: Record<string, string>,
    statusCode: number,
    contentType: string,
    requestDefinitionName: string | null,
    swaggerFilePath: string
): void;
//# sourceMappingURL=swagger-utils.d.ts.map