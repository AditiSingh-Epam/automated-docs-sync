const { generateReport } = require('../src/reportGenerator');

describe('Report status with unsupported patterns (regression)', () => {
  it('should return SUCCESS_WITH_WARNINGS when unsupported patterns exist', async () => {
    const endpoints = [
      {
        method: 'GET',
        path: '/users',
        handler: 'getUsers',
        filePath: 'routes.js',
        documentationStatus: 'documented',
        gaps: {
          missingFields: [],
          invalidTags: [],
          tagMismatch: [],
          other: []
        },
        documentation: {
          summary: 'Get all users',
          params: [],
          returns: 'Array of users',
          method: 'GET',
          path: '/users'
        }
      }
    ];

    const unsupportedPatterns = [
      {
        type: 'dynamicRoute',
        filePath: 'routes.js',
        line: 42,
        description: 'Dynamic route registration not supported'
      }
    ];

    const report = await generateReport(
        endpoints,
        '2026-10-05T12:00:00Z',
        unsupportedPatterns
    );

    // REGRESSION TEST: Verify status reflects unsupported patterns
    expect(report.status).toBe('SUCCESS_WITH_WARNINGS');
    expect(report.warningCount).toBe(1); // From unsupported pattern
    expect(report.metadata.unsupportedPatternsCount).toBe(1);
    expect(report.unsupportedPatterns.length).toBe(1);
  });

  it('should return SUCCESS when no unsupported patterns and all documented', async () => {
    const endpoints = [
      {
        method: 'GET',
        path: '/users',
        handler: 'getUsers',
        filePath: 'routes.js',
        documentationStatus: 'documented',
        gaps: {
          missingFields: [],
          invalidTags: [],
          tagMismatch: [],
          other: []
        },
        documentation: {
          summary: 'Get users',
          params: [],
          returns: 'Array',
          method: 'GET',
          path: '/users'
        }
      }
    ];

    const report = await generateReport(
        endpoints,
        '2026-10-05T12:00:00Z',
        [] // No unsupported patterns
    );

    expect(report.status).toBe('SUCCESS');
    expect(report.warningCount).toBe(0);
  });

  it('should count both partial endpoints and unsupported patterns as warnings', async () => {
    const endpoints = [
      {
        method: 'GET',
        path: '/users',
        handler: 'getUsers',
        filePath: 'routes.js',
        documentationStatus: 'partial', // This is a warning
        gaps: {
          missingFields: ['returns'],
          invalidTags: [],
          tagMismatch: [],
          other: []
        },
        documentation: {
          summary: 'Get users',
          params: [],
          returns: null,
          method: 'GET',
          path: '/users'
        }
      }
    ];

    const unsupportedPatterns = [
      {
        type: 'dynamicRoute',
        filePath: 'routes.js',
        line: 42,
        description: 'Dynamic route not supported'
      },
      {
        type: 'dynamicRoute',
        filePath: 'routes.js',
        line: 58,
        description: 'Dynamic route not supported'
      }
    ];

    const report = await generateReport(
        endpoints,
        '2026-10-05T12:00:00Z',
        unsupportedPatterns
    );

    // 1 partial endpoint + 2 unsupported patterns = 3 total warnings
    expect(report.status).toBe('SUCCESS_WITH_WARNINGS');
    expect(report.warningCount).toBe(3); // 1 partial + 2 unsupported
  });

  it('should handle direct call with empty unsupported patterns gracefully', async () => {
    const endpoints = [];
    const report = await generateReport(
        endpoints,
        '2026-10-05T12:00:00Z',
        undefined // Edge case: undefined instead of empty array
    );

    expect(report.status).toBe('SUCCESS');
    expect(report.warningCount).toBe(0);
    expect(report.unsupportedPatterns).toEqual([]);
  });
});