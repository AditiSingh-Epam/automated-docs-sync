const { redactSecrets, escapeMarkdown } = require('./utils');

/**
 * Render parameters section.
 * @param {Array} params - Parameter array
 * @returns {string} Formatted parameters
 */
function renderParams(params) {
  if (!params || params.length === 0) {
    return '';
  }
  return params
      .map(p => `\`${p.type || 'unknown'}\` \`${p.name}\`: ${redactSecrets(p.description || 'No description')}`)
      .join('\n');
}

/**
 * Render returns section.
 * @param {Object|string} returns - Return value object or string
 * @returns {string} Formatted return value
 */
function renderReturns(returns) {
  if (!returns) {
    return '';
  }
  if (typeof returns === 'string') {
    return redactSecrets(returns);
  }
  return `\`${returns.type || 'unknown'}\`: ${redactSecrets(returns.description || '')}`;
}

/**
 * Normalize endpoint to handle both flat and aggregated structures.
 * @param {Object} ep - Endpoint object
 * @returns {Object} Normalized endpoint
 */
function normalizeEndpoint(ep) {
  // If it has documentationStatus, it's already aggregated
  if (ep.documentationStatus) {
    return ep;
  }

  // Otherwise, convert flat test object to aggregated structure
  const doc = {
    summary: ep.summary || null,
    params: ep.params || [],
    returns: ep.returns || null,
    method: ep.method || null,
    path: ep.path || null
  };

  // Determine status from flat object
  let status = 'notDocumented';
  if (doc.summary) {
    status = (doc.params?.length > 0 || doc.returns) ? 'documented' : 'documented';
  }

  return {
    method: ep.method,
    path: ep.path,
    handler: ep.handler,
    filePath: ep.filePath || 'unknown',
    documentationStatus: status,
    documentation: doc,
    gaps: {
      missingFields: [],
      invalidTags: [],
      tagMismatch: [],
      other: []
    }
  };
}

/**
 * Generate Markdown API reference from aggregated endpoints.
 * @param {Array} endpoints - Endpoint objects (flat or aggregated)
 * @param {string} timestamp - ISO timestamp of generation
 * @returns {string} Markdown content
 */
function generateMarkdown(endpoints, timestamp) {
  const lines = [
    '# API Reference',
    '',
    `Generated: ${escapeMarkdown(timestamp)}`,
    ''
  ];

  if (!endpoints || endpoints.length === 0) {
    lines.push('No endpoints found.');
    return lines.join('\n');
  }

  // Normalize all endpoints
  const normalizedEndpoints = endpoints.map(normalizeEndpoint);

  // Group endpoints by HTTP method
  const byMethod = {};
  normalizedEndpoints.forEach(ep => {
    if (!byMethod[ep.method]) {
      byMethod[ep.method] = [];
    }
    byMethod[ep.method].push(ep);
  });

  // Render each method group
  const methodOrder = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  for (const method of methodOrder) {
    if (!byMethod[method]) continue;

    lines.push(`## ${method}`);
    lines.push('');

    for (const ep of byMethod[method]) {
      // Endpoint header
      lines.push(`### \`${method} ${escapeMarkdown(ep.path)}\``);
      lines.push('');

      // Handler
      lines.push(`**Handler:** \`${escapeMarkdown(ep.handler)}\``);

      // Documentation status
      const status = ep.documentationStatus || 'Undocumented';
      lines.push(`**Status:** ${status}`);
      lines.push('');

      // Description/Summary
      if (ep.documentation && ep.documentation.summary) {
        const summary = redactSecrets(ep.documentation.summary);
        lines.push(escapeMarkdown(summary));
        lines.push('');
      } else {
        lines.push('Undocumented endpoint.');
        lines.push('');
      }

      // Parameters
      if (ep.documentation && ep.documentation.params && ep.documentation.params.length > 0) {
        lines.push('**Parameters:**');
        lines.push('');
        for (const param of ep.documentation.params) {
          const paramName = escapeMarkdown(param.name || '');
          const paramDesc = redactSecrets(param.description || 'No description');
          lines.push(`- \`${param.type || 'unknown'}\` \`${paramName}\`: ${escapeMarkdown(paramDesc)}`);
        }
        lines.push('');
      }

      // Return value
      if (ep.documentation && ep.documentation.returns) {
        const returns = ep.documentation.returns;
        lines.push('**Returns:**');
        lines.push('');
        if (typeof returns === 'string') {
          lines.push(`\`${escapeMarkdown(redactSecrets(returns))}\``);
        } else {
          const returnDesc = redactSecrets(returns.description || '');
          lines.push(`\`${returns.type || 'unknown'}\`: ${escapeMarkdown(returnDesc)}`);
        }
        lines.push('');
      }

      // Gap information
      if (ep.gaps && (ep.gaps.missingFields?.length > 0 || ep.gaps.invalidTags?.length > 0)) {
        lines.push('**Documentation Gaps:**');
        lines.push('');
        if (ep.gaps.missingFields && ep.gaps.missingFields.length > 0) {
          lines.push(`- Missing: ${ep.gaps.missingFields.join(', ')}`);
        }
        if (ep.gaps.invalidTags && ep.gaps.invalidTags.length > 0) {
          lines.push(`- Invalid tags: ${ep.gaps.invalidTags.join(', ')}`);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

module.exports = {
  generateMarkdown,
  renderParams,
  renderReturns,
  escapeMarkdown
};