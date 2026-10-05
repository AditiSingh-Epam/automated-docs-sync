const { generateReport } = require('../src/reportGenerator');

describe('coverage report generation', () => {
  test('reports counts, percentage, synchronized timestamp, and per-endpoint gaps', () => {
    const report = generateReport([
      { id: '1', method: 'GET', path: '/', handler: 'home', filePath: 'a.js', line: 1, status: 'documented', gaps: [] },
      { id: '2', method: 'POST', path: '/', handler: 'create', filePath: 'a.js', line: 2, status: 'partial', gaps: ['summary'] },
      { id: '3', method: 'DELETE', path: '/', handler: 'remove', filePath: 'a.js', line: 3, status: 'missing', gaps: ['jsdoc'] }
    ], '2026-01-01T00:00:00.000Z');

    expect(report).toMatchObject({
      totalEndpoints: 3,
      documented: 1,
      notDocumented: 2,
      coverage: 33.33,
      timestamp: '2026-01-01T00:00:00.000Z'
    });
    expect(report.endpoints[1]).toMatchObject({ status: 'partial', gaps: ['summary'] });
  });

  test('defines zero-endpoint coverage as zero', () => {
    expect(generateReport([], 'stamp')).toMatchObject({
      totalEndpoints: 0,
      documented: 0,
      notDocumented: 0,
      coverage: 0,
      timestamp: 'stamp'
    });
  });

  test('includes structured gap details and scan warning metadata', () => {
    const report = generateReport([{
      id: '1',
      method: 'GET',
      path: '/users',
      handler: 'listUsers',
      filePath: 'routes.js',
      line: 1,
      status: 'partial',
      gaps: ['methodMismatch'],
      gapDetails: {
        missingFields: ['summary'],
        invalidTags: ['@param api_key: sk_live_1234567890abcdefghijk'],
        tagMismatch: [{ field: 'method', documented: 'POST', actual: 'GET' }]
      }
    }], 'stamp', {
      warningCount: 2,
      unsupportedPatterns: [{
        type: 'dynamicRoute',
        filePath: 'routes.js',
        line: 4,
        method: 'GET',
        description: 'Dynamic route is unsupported.'
      }]
    });

    expect(report).toMatchObject({
      status: 'SUCCESS_WITH_WARNINGS',
      partial: 1,
      missing: 0,
      warningCount: 2,
      unsupportedPatternsCount: 1
    });
    expect(report.endpoints[0].gapDetails).toEqual({
      missingFields: ['summary'],
      invalidTags: ['@param api_key: [REDACTED]'],
      tagMismatch: [{ field: 'method', documented: 'POST', actual: 'GET' }]
    });
    expect(report.unsupportedPatterns[0]).toMatchObject({
      type: 'dynamicRoute',
      filePath: 'routes.js',
      line: 4
    });
  });
});
