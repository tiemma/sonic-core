import { expect } from 'chai';
import swaggerJSDoc from 'swagger-jsdoc';
import {
  getType,
  swaggerRef,
  buildSwaggerJSON,
  evaluateRoute,
  generateResponse,
  findBodyParameterIndexV2,
  findPathParameterIndex,
  findQueryParameterIndex,
  trimString,
  replaceRoutes,
  parseSwaggerRouteData,
  generateResponseRef,
  generateResponseBodySpec
} from '../src';
import options from '../examples/swagger-config';
import { getSpec } from './fixtures';

const swaggerSamples = require('../examples/swagger-samples.json');

describe('Swagger utils tests', () => {
  const specs = [
    {
      data: 'A',
      type: 'string',
    },
    {
      data: 1,
      type: 'number',
    },
    {
      data: false,
      type: 'boolean',
    },
    {
      data: [],
      type: 'array',
    },
    {
      data: {},
      type: 'object',
    },
    {
      data: null,
      type: 'null',
    },
    {
      data: undefined,
      type: 'undefined',
    },
  ];
  specs.forEach((spec) => {
    it('getType works as expected', () => {
      expect(getType(spec.data)).equal(spec.type);
    });
  });

  it('swaggerRef returns correct spec', () => {
    const contentType = 'application/json';
    const prefix = '#/definitions';
    const responseRef = '12345';
    const data = {
      content: {
        [contentType]: {
          schema: {
            $ref: `${prefix}/${responseRef}`,
          },
        },
      },
    };
    expect(data).deep.equal(swaggerRef(contentType, responseRef));
  });

  it('buildSwaggerJSON works as expected', () => {
    const expectedData = {
      required: [
        'status',
        'data',
      ],
      properties: {
        status: {
          type: 'boolean',
          example: true,
        },
        data: {
          required: [
            'totalCost',
            'target',
            'resourceIDs',
          ],
          properties: {
            totalCost: {
              type: 'number',
              example: 0,
            },
            target: {
              type: 'string',
              example: 'bigPathName',
            },
            resourceIDs: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: [
                '1b310f81-e49e-48fa-ae8c-3a7c29ca034e',
              ],
            },
          },
          type: 'object',
        },
      },
    };
    // Uses all possible types in different forms
    const data = {
      status: true,
      data: {
        totalCost: 0,
        target: 'bigPathName',
        resourceIDs: ['1b310f81-e49e-48fa-ae8c-3a7c29ca034e'],
      },
    };
    expect(buildSwaggerJSON(data)).deep.equal(expectedData);
  });

  it('buildSwaggerJSON remove "data" from required without removing the example from existing documentation', () => {
    const existingData = {
      required: [
        'status',
        'data',
      ],
      properties: {
        status: {
          type: 'boolean',
          example: true,
        },
        data: {
          required: [
            'totalCost',
            'target',
            'resourceIDs',
          ],
          properties: {
            totalCost: {
              type: 'number',
              example: 0,
            },
            target: {
              type: 'string',
              example: 'bigPathName',
            },
            resourceIDs: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: [
                '1b310f81-e49e-48fa-ae8c-3a7c29ca034e',
              ],
            },
          },
          type: 'object',
        },
      },
    };
    const expectedData = {
      ...existingData,
      required: [
        'status',
      ],
    };

    // Uses subset of possible data to find which fields are actually required
    const data = {
      status: true,
    };
    expect(buildSwaggerJSON(data, existingData)).deep.equal(expectedData);
  });

  it('generateResponse works as expected', () => {
    const data = {
      status: {
        type: 'boolean',
        example: true,
      },
      data: {
        required: [
          'totalCost',
          'target',
          'resourceIDs',
        ],
        properties: {
          totalCost: {
            type: 'number',
            example: 0,
          },
          target: {
            type: 'string',
            example: 'bigPathName',
          },
          resourceIDs: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: [
              '1b310f81-e49e-48fa-ae8c-3a7c29ca034e',
            ],
          },
        },
        type: 'object',
      },
    };
    const expectedData = {
      status: true,
      data: {
        totalCost: 0,
        target: 'bigPathName',
        resourceIDs: ['1b310f81-e49e-48fa-ae8c-3a7c29ca034e'],
      },
    };
    expect(generateResponse({}, data)).deep.equal(expectedData);
  });

  it('find methods work as expected', () => {
    const data = [{
      in: 'path',
      name: 'user',
      required: true,
    },
    {
      in: 'body',
      name: 'user',
      schema: {
        $ref: '#/definitions/name',
      },
    },
    {
      in: 'query',
      name: 'name',
    },
    {
      in: 'path',
      name: 'name',
      required: true,
    },
    ];
    expect(findQueryParameterIndex(data, 'name')).equal(2);
    expect(findBodyParameterIndexV2(data)).equal(1);
    expect(findPathParameterIndex(data, 'user')).equal(0);
    expect(findPathParameterIndex(data, 'name')).equal(3);
    expect(findPathParameterIndex(data, 'unknown')).equal(false);
  });

  it('finding existing ref name for requestBody works as expected', () => {
    const contentType = 'application/json';
    const responseRef = '12345';
    const route = '/user';
    const method = 'post';
    const data = {
      paths: {
        '/user': {
          post: {
            requestBody: swaggerRef(contentType, responseRef),
          },
        },
      },
    } as any;
    expect(generateResponseRef(data, route, method, contentType)).equal(responseRef);
    expect(generateResponseRef()).not.equal(responseRef);
  });

  it('trimString works as expected', () => {
    const expected = 'param';
    expect(trimString(':param?')).equal(expected);
    expect(trimString(':param')).equal(expected);
  });

  it('replaceRoutes works as expected', () => {
    const expected = '{param}';
    // Express style routes
    const parameterRegex = /(:\w+\??)/g;
    expect(replaceRoutes(':param?', parameterRegex)).equal(expected);
    expect(replaceRoutes(':param', parameterRegex)).equal(expected);
  });

  it('parseSwaggerJSON works as expected', () => {
    const swaggerSpec = swaggerJSDoc(options as any);
    const data = parseSwaggerRouteData(swaggerSpec as any, swaggerSamples);

    expect(data).deep.equal(getSpec());
  });

  it('evaluateRoute works as expected', () => {
    const route = '/api/v1/$Organization.id';
    const context = { Organization: { id: 1 } };
    expect(evaluateRoute(route, context)).to.equal('/api/v1/1');
  });

  it('generateResponseBodySpec should return undefined on empty input', () => {
    expect(generateResponseBodySpec()).to.equal(undefined);
  });
});
