const { aggregateEndpoints } = require('../src/aggregator');

describe('endpoint aggregator', () => {
  const route = {
    id: 'route-1',
    method: 'GET',
    path: '/users',
    handler: 'listUsers',
    filePath: 'routes.js',
    line: 5
  };

  test('classifies complete, partial, and missing endpoint documentation', () => {
    const result = aggregateEndpoints([
      { ...route, documentation: { present: true, summary: 'Lists users.', params: [], returns: null, gaps: [] } },
      { ...route, path: '/partial', documentation: { present: true, summary: '', params: [], returns: null, gaps: ['summary'] } },
      { ...route, path: '/missing' }
    ]);
    expect(result[0].documentationStatus).toBe('documented');
    expect(result[1].documentationStatus).toBe('partial');
    expect(result[2].documentationStatus).toBe('notDocumented');
  });

  test('marks mismatching documented route metadata as partial without losing route identity', () => {
    const result = aggregateEndpoints([{
      ...route,
      documentation: {
        present: true,
        summary: 'Get a user.',
        method: 'POST',
        path: '/different',
        params: [],
        returns: null,
        gaps: [],
        invalidTags: []
      }
    }]);
    expect(result[0].documentationStatus).toBe('partial');
    expect(result[0].method).toBe('GET');
    expect(result[0].path).toBe('/users');
    expect(result[0].gaps.tagMismatch).toHaveLength(2);
    expect(result[0].gaps.tagMismatch[0]).toMatchObject({ field: 'method', documented: 'POST', actual: 'GET' });
    expect(result[0].gaps.tagMismatch[1]).toMatchObject({ field: 'path', documented: '/different', actual: '/users' });
  });

  test('records missing fields and invalid tags in explicit gap details', () => {
    const [undocumented, invalid] = aggregateEndpoints([
      { ...route },
      {
        ...route,
        path: '/other',
        documentation: {
          present: true,
          summary: '',
          params: [],
          returns: null,
          gaps: ['invalidTags'],
          invalidTags: ['@unknown', '@broken']
        }
      }
    ]);
    expect(undocumented.gaps.missingFields).toContain('jsdoc');
    expect(undocumented.gaps.missingFields).toContain('summary');
    expect(invalid.gaps.invalidTags).toEqual(['@unknown', '@broken']);
    expect(invalid.gaps.missingFields).toContain('summary');
  });
});