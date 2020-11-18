import { expect } from 'chai';
import {
  routeParametersRegex,
  requestBodyDependencyRegex,
  routeDependencyRegex,
  getDependency,
} from '../src';

describe('Regex utils test', () => {
  const specs: Record<string, any> = {
    routeParametersRegex: {
      regex: routeParametersRegex,
      tests: [
        {
          data: '/api/v1/{value}',
          expected: true,
        },
        {
          data: '/api/v1',
          expected: false,
        },
      ],
    },
    requestBodyDependencyRegex: {
      regex: requestBodyDependencyRegex,
      tests: [
        {
          data: '{ key: "$Param" }',
          expected: true,
        },
        // Over time, this should be possible
        {
          data: '{ key: "$Param.map((x) => x.id)" }',
          expected: false,
        },
        {
          data: '{ key: "$Param[0].id" }',
          expected: true,
        },
        {
          data: '{ key: "data" }',
          expected: false,
        },
      ],
    },
    routeDependencyRegex: {
      regex: routeDependencyRegex,
      tests: [
        {
          data: '/$params[0]/blanks',
          expected: true,
        },
        {
          data: '/api/v1',
          expected: false,
        },
      ],
    },
  };
  Object.keys(specs).forEach((spec) => {
    it(`${spec} works as expected`, () => {
      const data = specs[spec];

      for (const test of data.tests) {
        expect(data.regex.test(test.data)).equal(test.expected);
      }
    });
  });

  it('getDependency works as expected', () => {
    expect(getDependency('$Cluster[0].id')).equal('Cluster');
  });
});
