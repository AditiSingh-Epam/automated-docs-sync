const fs = require('fs');
const path = require('path');
const { discoverFiles } = require('./fileDiscovery');
const { analyzeFiles } = require('./endpointAnalyzer');
const { extractJSDocMetadata } = require('./jsdocExtractor');
const { aggregateDocumentation } = require('./aggregator');
const { generateMarkdown } = require('./markdownGenerator');
const { generateReport } = require('./reportGenerator');
const { checkOutputCollisions, createTimestamp, writeOutput } = require('./utils');

/**
 * Validate that output path directory exists and is writable.
 * @param {string} filePath - Output file path
 * @param {string} argName - Argument name for error messages
 * @throws {Error} If path is invalid
 */
function validateOutputPath(filePath, argName) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    throw new Error(`Cannot access directory for ${argName}: ${dir}`);
  }
}

/**
 * Main synchronous API for documentation sync.
 * @param {Object} config - Configuration object
 * @param {string} config.input - Input directory path
 * @param {string} config.output - Output Markdown file path
 * @param {string} config.report - Output JSON report file path
 * @param {string} [config.timestamp] - Optional ISO timestamp
 * @returns {Object} Result with status, warnings, errors, and summary
 * @throws {Error} On collision or validation failure
 */
function sync({ input, output, report, timestamp }) {
  const finalTimestamp = timestamp || createTimestamp();
  const warnings = [];
  const errors = [];

  // Validate output paths exist
  try {
    validateOutputPath(output, '--output');
    validateOutputPath(report, '--report');
  } catch (error) {
    errors.push(error.message);
    throw error;
  }

  // Check they're not the same
  if (path.resolve(output) === path.resolve(report)) {
    const err = new Error('--output and --report must point to different files');
    errors.push(err.message);
    throw err;
  }

  // Step 1: Discover JavaScript files
  let discoveryResult;
  try {
    discoveryResult = discoverFiles(input);
  } catch (error) {
    errors.push(`Failed to discover files in "${input}": ${error.message}`);
    return {
      success: false,
      status: 'FAILED',
      errors,
      warnings
    };
  }

  const discoveredFiles = discoveryResult.files || [];
  warnings.push(...(discoveryResult.warnings || []));

  // Step 2: Check for output collision
  try {
    checkOutputCollisions(output, report, discoveredFiles);
  } catch (error) {
    errors.push(error.message);
    throw error;
  }

  // Step 3: Analyze endpoints
  const analysis = analyzeFiles(discoveredFiles);
  const endpoints = analysis.endpoints || [];
  const allUnsupportedPatterns = analysis.unsupportedPatterns || [];

  warnings.push(...(analysis.warnings || []));

  // Step 4: Extract JSDoc metadata and attach to endpoints
  const endpointsWithDocs = extractJSDocMetadata(endpoints);

  // Step 5: Aggregate documentation
  const aggregated = aggregateDocumentation(endpointsWithDocs);

  // Generate warnings for missing/partial documentation
  aggregated.forEach((ep) => {
    if (ep.documentationStatus === 'notDocumented') {
      warnings.push(`Missing documentation: ${ep.method} ${ep.path}`);
    } else if (ep.documentationStatus === 'partial') {
      warnings.push(`Incomplete documentation: ${ep.method} ${ep.path}`);
    }
  });

  // Step 6: Generate Markdown
  const markdown = generateMarkdown(aggregated, finalTimestamp);

  // Step 7: Generate Report
  let generatedReport = generateReport(
      aggregated,
      finalTimestamp,
      allUnsupportedPatterns
  );

  // // Generate warnings for missing/partial documentation
  // aggregated.forEach((ep) => {
  //   if (ep.documentationStatus === 'notDocumented') {
  //     warnings.push(`Missing documentation: ${ep.method} ${ep.path}`);
  //   } else if (ep.documentationStatus === 'partial') {
  //     warnings.push(`Incomplete documentation: ${ep.method} ${ep.path}`);
  //   }
  // });

  // Update report status based on actual warnings
  if (warnings.length > 0) {
    generatedReport = {
      ...generatedReport,
      status: 'SUCCESS_WITH_WARNINGS',
      warningCount: warnings.length
    };
  }

  // Step 8: Write outputs

  // Step 8: Write outputs
  try {
    writeOutput(output, markdown);
    writeOutput(report, `${JSON.stringify(generatedReport, null, 2)}\n`);
  } catch (writeError) {
    errors.push(`Failed to write outputs: ${writeError.message}`);
    return {
      success: false,
      status: 'FAILED',
      errors,
      warnings
    };
  }

  return {
    success: true,
    status: warnings.length > 0 ? 'SUCCESS_WITH_WARNINGS' : 'SUCCESS',
    warningCount: warnings.length,
    warnings,
    summary: {
      endpointsDiscovered: aggregated.length,
      documentedEndpoints: aggregated.filter(e => e.documentationStatus === 'documented').length,
      partialEndpoints: aggregated.filter(e => e.documentationStatus === 'partial').length,
      missingDocumentation: aggregated.filter(e => e.documentationStatus === 'notDocumented').length,
      unsupportedPatternsCount: allUnsupportedPatterns.length,
      coverage: parseInt(generatedReport.metadata.coverage)
    },
    report: generatedReport
  };
}

module.exports = {
  sync,
  validateOutputPath,
  writeOutput
};