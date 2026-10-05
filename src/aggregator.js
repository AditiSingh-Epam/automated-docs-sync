/**
 * Aggregate endpoints with documentation analysis results.
 * Enriches endpoint data with documentation status and gap tracking.
 *
 * @param {Array} endpoints - Analyzed endpoints with documentation metadata
 * @returns {Array} Aggregated endpoints with status and gap details
 */
function aggregateEndpoints(endpoints) {
  return endpoints.map((endpoint) => {
    const documentation = endpoint.documentation || {
      present: false,
      method: null,
      path: null,
      summary: '',
      params: [],
      returns: null,
      invalidTags: [],
      gaps: ['jsdoc']
    };

    const gaps = [...(documentation.gaps || [])];
    const missingFields = [];
    const invalidTags = [...(documentation.invalidTags || [])];
    const tagMismatch = [];

    if (!documentation.present) {
      missingFields.push('jsdoc');
    }
    if (!documentation.summary) {
      missingFields.push('summary');
    }

    if (documentation.method && documentation.method.toUpperCase() !== endpoint.method) {
      gaps.push('methodMismatch');
      tagMismatch.push({
        field: 'method',
        documented: documentation.method,
        actual: endpoint.method
      });
    }
    if (documentation.path && documentation.path !== endpoint.path) {
      gaps.push('pathMismatch');
      tagMismatch.push({
        field: 'path',
        documented: documentation.path,
        actual: endpoint.path
      });
    }

    const documentationStatus = !documentation.present
        ? 'notDocumented'
        : documentation.summary && !gaps.includes('invalidTags') && !gaps.includes('methodMismatch') && !gaps.includes('pathMismatch')
            ? 'documented'
            : 'partial';

    return {
      id: endpoint.id,
      method: endpoint.method,
      path: endpoint.path,
      handler: endpoint.handler,
      filePath: endpoint.filePath,
      line: endpoint.line,
      documentationStatus,
      documentation: {
        present: documentation.present,
        summary: documentation.summary,
        params: documentation.params || [],
        returns: documentation.returns || null,
        method: documentation.method,
        path: documentation.path
      },
      gaps: {
        missingFields,
        invalidTags,
        tagMismatch,
        other: [...new Set(gaps)]
      }
    };
  });
}

module.exports = {
  aggregateEndpoints,
  aggregateDocumentation: aggregateEndpoints
};