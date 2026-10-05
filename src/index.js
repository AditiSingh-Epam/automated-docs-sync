const fs = require('fs');
const path = require('path');
const { aggregateEndpoints } = require('./aggregator');
const { analyzeFiles } = require('./endpointAnalyzer');
const { discoverFiles } = require('./fileDiscovery');
const { extractJSDoc } = require('./jsdocExtractor');
const { generateMarkdown } = require('./markdownGenerator');
const { generateReport } = require('./reportGenerator');
const { checkOutputCollisions, createTimestamp, writeOutput } = require('./utils');

function validateOutputPath(outputPath, label) {
  if (typeof outputPath !== 'string' || outputPath.trim() === '') {
    throw new Error(`Missing ${label} output path.`);
  }
  const resolved = path.resolve(outputPath);
  const parent = path.dirname(resolved);
  let parentStats;
  try {
    parentStats = fs.statSync(parent);
  } catch (error) {
    throw new Error(`Cannot access ${label} output directory "${parent}": ${error.message}`);
  }
  if (!parentStats.isDirectory()) {
    throw new Error(`${label} output parent is not a directory: "${parent}"`);
  }
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    throw new Error(`${label} output path is a directory: "${resolved}"`);
  }
  return resolved;
}

function sync(options) {
  if (!options || typeof options.input !== 'string' || options.input.trim() === '') {
    throw new Error('Missing required --input directory.');
  }
  const markdownPath = validateOutputPath(options.output, '--output');
  const reportPath = validateOutputPath(options.report, '--report');
  if (markdownPath.toLowerCase() === reportPath.toLowerCase()) {
    throw new Error('--output and --report must refer to different files.');
  }

  const timestamp = options.timestamp || createTimestamp();
  const discovery = discoverFiles(options.input);
  checkOutputCollisions(markdownPath, reportPath, discovery.files);
  const analysis = analyzeFiles(discovery.files);
  const documentedEndpoints = analysis.endpoints.map((endpoint) => ({
    ...endpoint,
    documentation: extractJSDoc(endpoint.jsdoc)
  }));
  const endpoints = aggregateEndpoints(documentedEndpoints);
  const warnings = [...discovery.warnings, ...analysis.warnings];

  endpoints.forEach((endpoint) => {
    if (endpoint.status !== 'documented') {
      warnings.push(`${endpoint.status === 'missing' ? 'Missing' : 'Incomplete'} documentation for ${endpoint.method} ${endpoint.path} in "${endpoint.filePath}" at line ${endpoint.line}`);
    }
  });

  const markdown = generateMarkdown(endpoints, timestamp);
  const status = warnings.length > 0 ? 'SUCCESS_WITH_WARNINGS' : 'SUCCESS';
  const report = generateReport(endpoints, timestamp, {
    warningCount: warnings.length,
    unsupportedPatterns: analysis.unsupportedPatterns
  });
  writeOutput(markdownPath, markdown);
  writeOutput(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  return {
    endpoints,
    report,
    timestamp,
    warnings,
    warningCount: warnings.length,
    status,
    summary: {
      endpointsDiscovered: endpoints.length,
      documentedEndpoints: endpoints.filter((endpoint) => endpoint.status === 'documented').length,
      partialEndpoints: endpoints.filter((endpoint) => endpoint.status === 'partial').length,
      missingDocumentation: endpoints.filter((endpoint) => endpoint.status === 'missing').length,
      coverage: report.coverage
    },
    output: markdownPath,
    reportPath
  };
}

module.exports = {
  sync,
  validateOutputPath
};
