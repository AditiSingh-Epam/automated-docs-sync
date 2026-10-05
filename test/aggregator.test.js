const { aggregateEndpoints } = require('../src/aggregator');

const route = {
  id: 'users.js:1',
  method: 'GET',
  path: '/users',
  handler: 'listUsers',
  filePath: 'users.js',
  line: 1
};

describe('endpoint aggregator', () => {
  test('classifies complete, partial, and missing endpoint documentation', () => {
    const result = aggregateEndpoints([
      { ...route, documentation: { present: true, summary: 'Lists users.', params: [], returns: null, gaps: [] } },
      { ...route, path: '/partial', documentation: { present: true, summary: '', params: [], returns: null, gaps: ['summary'] } },
      { ...route, path: '/missing' }
    ]);

    expect(result.map((endpoint) => endpoint.status)).toEqual(['documented', 'partial', 'missing']);
    expect(result[2].gaps).toContain('jsdoc');
  });

  test('marks mismatching documented route metadata as partial without losing route identity', () => {
    const result = aggregateEndpoints([{
      ...route,
      documentation: {
        present: true,
        method: 'POST',
        path: '/other',
        summary: 'Lists users.',
        params: [],
        returns: null,
        gaps: []
      }
    }]);
    expect(result[0]).toMatchObject({
      method: 'GET',
      path: '/users',
      status: 'partial',
      gaps: ['methodMismatch', 'pathMismatch']
    });
  });
});
