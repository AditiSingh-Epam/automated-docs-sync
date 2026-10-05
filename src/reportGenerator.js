/**
 * Generate JSON coverage report with per-endpoint gap details.
 * Accounts for unsupported patterns in status and warning count.
 *
 * @param {Array} endpoints - Aggregated endpoint objects with documentation status and gaps
 * @param {string} timestamp - ISO timestamp of report generation
 * @param {Array} unsupportedPatterns - Array of unsupported route patterns found during analysis
 * @returns {Object} Report object with status, metadata, endpoints, and unsupported patterns
 */
function generateReport(endpoints, timestamp, unsupportedPatterns = []) {
  // Safely handle undefined/null inputs
  const safeEndpoints = endpoints || [];
  const safePatterns = unsupportedPatterns || [];

  // Count documentation status
  const documented = safeEndpoints.filter(e => e.documentationStatus === 'documented').length;
  const partial = safeEndpoints.filter(e => e.documentationStatus === 'partial').length;
  const notDocumented = safeEndpoints.filter(e => e.documentationStatus === 'notDocumented').length;

  // Calculate coverage
  const coverage = safeEndpoints.length > 0
      ? Math.round((documented / safeEndpoints.length) * 100)
      : 0;

  // Count warnings: partial endpoints + unsupported patterns
  // This ensures status reflects BOTH documentation gaps AND unsupported patterns
  const warningCount = partial + safePatterns.length;

  // Status reflects warnings from any source
  const status = warningCount > 0 ? 'SUCCESS_WITH_WARNINGS' : 'SUCCESS';

  return {
    // Status section
    status,
    timestamp,
    generatedAt: timestamp,
    warningCount,

    // Top-level fields (for test compatibility)
    coverage,
    totalEndpoints: safeEndpoints.length,
    unsupportedPatternsCount: safePatterns.length,

    // Metadata section
    metadata: {
      timestamp,
      totalEndpoints: safeEndpoints.length,
      documentedCount: documented,
      partialCount: partial,
      notDocumentedCount: notDocumented,
      coverage: `${coverage}%`,
      unsupportedPatternsCount: safePatterns.length
    },

    // Per-endpoint details
    endpoints: safeEndpoints.map(ep => ({
      method: ep.method,
      path: ep.path,
      handler: ep.handler,
      filePath: ep.filePath,
      documentationStatus: ep.documentationStatus,
      status: ep.documentationStatus === 'notDocumented' ? 'missing' : ep.documentationStatus,

      // Rich gap details (Issue #1 fix)
      gaps: {
        missingFields: ep.gaps?.missingFields || [],
        invalidTags: ep.gaps?.invalidTags || [],
        tagMismatch: ep.gaps?.tagMismatch || [],
        other: ep.gaps?.other || []
      },

      // Documentation metadata
      documentation: ep.documentation || {}
    })),

    // Unsupported patterns for transparency (Issue #6 fix)
    unsupportedPatterns: safePatterns.map(p => ({
      type: p.type,
      filePath: p.filePath,
      line: p.line,
      method: p.method || 'unknown',
      description: p.description
    }))
  };
}

module.exports = { generateReport };