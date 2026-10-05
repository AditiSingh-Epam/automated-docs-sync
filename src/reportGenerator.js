const { redactSecrets } = require('./utils');

function generateReport(endpoints, timestamp) {
  const totalEndpoints = endpoints.length;
  const documented = endpoints.filter((endpoint) => endpoint.status === 'documented').length;
  const reportEndpoints = endpoints.map((endpoint) => ({
    id: redactSecrets(endpoint.id),
    method: redactSecrets(endpoint.method),
    path: redactSecrets(endpoint.path),
    handler: redactSecrets(endpoint.handler),
    filePath: redactSecrets(endpoint.filePath),
    line: endpoint.line,
    status: endpoint.status,
    gaps: endpoint.gaps
  }));

  return {
    totalEndpoints,
    documented,
    notDocumented: totalEndpoints - documented,
    coverage: totalEndpoints === 0 ? 0 : Number(((documented / totalEndpoints) * 100).toFixed(2)),
    timestamp,
    endpoints: reportEndpoints
  };
}

module.exports = {
  generateReport
};
