import {OpenAPI} from "openapi-types";
import {AxiosRequestConfig} from "axios"

export function getResponsesInDependencyOrder(swaggerSpec: OpenAPI.Document, requestOptions?: AxiosRequestConfig, bodyDefinitions?: any, dataPath?: string[]): Promise<{
    swaggerSpec: OpenAPI.Document;
    bodyDefinitions: any;
}>;
//# sourceMappingURL=api-utils.d.ts.map