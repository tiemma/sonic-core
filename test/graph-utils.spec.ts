import { expect } from 'chai';
import { topologicalDependencySort, dependencyCycleDetection, satisfyDependencyConstraints } from '../src';
import { getSpec } from './fixtures';

describe('Graph utils tests', () => {
  const key = 'man';

  it('topologicalDependencySort works as expected', () => {
    const data = getSpec();
    const queue = topologicalDependencySort(data.dependencyGraph);

    expect(queue.getElements()).deep.equals(['man', 'dog', 'mouse', 'cat', 'animals']);
  });

  it('dependencyCycleDetection works as expected', () => {
    const data = getSpec();

    expect(dependencyCycleDetection(data.dependencyGraph))
      .deep.equal({ status: false, stackHistory: [] });

    data.dependencyGraph[key].dependencies.push(key);
    expect(dependencyCycleDetection(data.dependencyGraph)).deep.equal({
      status: true,
      stackHistory: [
        ['dog', key, key],
        ['cat', 'mouse', key],
      ],
    });
  });

  it('satisfyDependencyConstraints works as expected', () => {
    const data = getSpec();
    expect(satisfyDependencyConstraints(data.dependencyGraph)).deep.equal([]);

    delete data.dependencyGraph[key];
    expect(satisfyDependencyConstraints(data.dependencyGraph)).deep.equal([key]);
  });
});
