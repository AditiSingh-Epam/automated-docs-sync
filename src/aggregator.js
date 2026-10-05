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
    const gaps = [...documentation.gaps];

    if (documentation.method && documentation.method.toUpperCase() !== endpoint.method) {
      gaps.push('methodMismatch');
    }
    if (documentation.path && documentation.path !== endpoint.path) {
      gaps.push('pathMismatch');
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
      gaps: [...new Set(gaps)]
    };
  });
}

module.exports = {
  aggregateEndpoints
};
