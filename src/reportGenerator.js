const { redactSecrets } = require('./utils');

function generateReport(endpoints, timestamp, metadata = {}) {
  const totalEndpoints = endpoints.length;
  const documented = endpoints.filter((endpoint) => endpoint.status === 'documented').length;
  const partial = endpoints.filter((endpoint) => endpoint.status === 'partial').length;
  const missing = endpoints.filter((endpoint) => endpoint.status === 'missing').length;
  const warningCount = metadata.warningCount === undefined
    ? endpoints.filter((endpoint) => endpoint.status !== 'documented').length
    : metadata.warningCount;
  const unsupportedPatterns = metadata.unsupportedPatterns || [];
  const reportEndpoints = endpoints.map((endpoint) => ({
    id: redactSecrets(endpoint.id),
    method: redactSecrets(endpoint.method),
    path: redactSecrets(endpoint.path),
    handler: redactSecrets(endpoint.handler),
    filePath: redactSecrets(endpoint.filePath),
    line: endpoint.line,
    status: endpoint.status,
    gaps: endpoint.gaps,
    gapDetails: {
      missingFields: (endpoint.gapDetails && endpoint.gapDetails.missingFields) || [],
      invalidTags: ((endpoint.gapDetails && endpoint.gapDetails.invalidTags) || [])
        .map((tag) => redactSecrets(tag)),
      tagMismatch: ((endpoint.gapDetails && endpoint.gapDetails.tagMismatch) || []).map((mismatch) => ({
        field: mismatch.field,
        documented: redactSecrets(mismatch.documented),
        actual: redactSecrets(mismatch.actual)
      }))
    }
  }));

  return {
    status: warningCount > 0 ? 'SUCCESS_WITH_WARNINGS' : 'SUCCESS',
    totalEndpoints,
    documented,
    partial,
    missing,
    notDocumented: totalEndpoints - documented,
    coverage: totalEndpoints === 0 ? 0 : Number(((documented / totalEndpoints) * 100).toFixed(2)),
    warningCount,
    unsupportedPatternsCount: unsupportedPatterns.length,
    unsupportedPatterns: unsupportedPatterns.map((pattern) => ({
      type: pattern.type,
      filePath: redactSecrets(pattern.filePath),
      line: pattern.line,
      method: redactSecrets(pattern.method),
      description: redactSecrets(pattern.description)
    })),
    timestamp,
    endpoints: reportEndpoints
  };
}

module.exports = {
  generateReport
};
