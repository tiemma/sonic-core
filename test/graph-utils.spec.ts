import { expect } from 'chai';
import { topologicalDependencySort, dependencyCycleDetection, satisfyDependencyConstraints } from '../src';

const { dependencyGraph } = require('./fixtures/spec.json');

describe('Graph utils tests', () => {
  const key = 'Organization';

  it('topologicalDependencySort works as expected', () => {
    const queue = topologicalDependencySort(dependencyGraph);

    expect(queue.getElements()).deep.equal(['Organization', 'OrganizationID', 'Cluster', 'Budget', 'GetBudget']);
  });

  it('dependencyCycleDetection works as expected', () => {
    expect(dependencyCycleDetection(dependencyGraph))
      .deep.equal({ status: false, stackHistory: [] });

    const data = dependencyGraph;
    data[key].dependencies.push(key);
    expect(dependencyCycleDetection(data)).deep.equal({
      status: true,
      stackHistory: [
        ['OrganizationID', key, key],
        ['GetBudget', 'Budget', key],
      ],
    });
  });

  it('satisfyDependencyConstraints works as expected', () => {
    expect(satisfyDependencyConstraints(dependencyGraph)).deep.equal([]);

    const data = dependencyGraph;
    delete data[key];
    expect(satisfyDependencyConstraints(data)).deep.equal([key]);
  });
});
