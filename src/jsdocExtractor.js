function cleanLines(comment) {
  return String(comment || '')
      .replace(/^\s*\*/, '')
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\* ?/, '').trim())
      .filter((line) => line.length > 0);
}

function parseParam(line) {
  const match = line.match(/^@param\s+(?:\{([^}]+)\}\s*)?(\[[^\]]+\]|[^\s-]+)?\s*(?:-\s*)?(.*)$/);
  if (!match || !match[2]) {
    return null;
  }
  return {
    name: match[2].replace(/^\[|\]$/g, ''),
    type: match[1] || '',
    description: match[3] || ''
  };
}

function parseReturns(line) {
  const match = line.match(/^@returns?\s+(?:\{([^}]+)\}\s*)?(?:-\s*)?(.*)$/);
  if (!match) {
    return null;
  }
  return { type: match[1] || '', description: match[2] || '' };
}

function extractJSDoc(comment) {
  const result = {
    present: Boolean(comment),
    method: null,
    path: null,
    summary: '',
    params: [],
    returns: null,
    invalidTags: [],
    gaps: []
  };
  if (!comment) {
    result.gaps.push('jsdoc');
    return result;
  }

  const lines = cleanLines(comment);
  const summaryLines = [];
  let inTags = false;

  lines.forEach((line) => {
    if (!line.startsWith('@') && !inTags) {
      summaryLines.push(line);
      return;
    }
    inTags = true;
    if (line.startsWith('@method ')) {
      result.method = line.slice(8).trim() || null;
    } else if (line.startsWith('@path ')) {
      result.path = line.slice(6).trim() || null;
    } else if (line.startsWith('@param')) {
      const param = parseParam(line);
      if (param) {
        result.params.push(param);
      } else {
        result.invalidTags.push(line);
      }
    } else if (line.startsWith('@return')) {
      const returns = parseReturns(line);
      if (returns) {
        result.returns = returns;
      } else {
        result.invalidTags.push(line);
      }
    } else if (line.startsWith('@')) {
      result.invalidTags.push(line);
    }
  });

  result.summary = summaryLines.join(' ').trim();
  if (!result.summary) {
    result.gaps.push('summary');
  }
  if (result.invalidTags.length) {
    result.gaps.push('invalidTags');
  }
  return result;
}

/**
 * Extract and attach JSDoc metadata to endpoints.
 * Takes endpoints with raw jsdoc text and returns them with parsed documentation.
 *
 * @param {Array} endpoints - Endpoints with jsdoc field
 * @returns {Array} Endpoints with attached documentation field
 */
function extractJSDocMetadata(endpoints) {
  return endpoints.map((endpoint) => {
    const documentation = extractJSDoc(endpoint.jsdoc);
    return {
      ...endpoint,
      documentation
    };
  });
}

module.exports = {
  extractJSDoc,
  extractJSDocMetadata
};