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

    const status = !documentation.present
      ? 'missing'
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
      summary: documentation.summary,
      params: documentation.params,
      returns: documentation.returns,
      status,
      gaps: [...new Set(gaps)],
      gapDetails: {
        missingFields,
        invalidTags,
        tagMismatch
      }
    };
  });
}

module.exports = {
  aggregateEndpoints
};
