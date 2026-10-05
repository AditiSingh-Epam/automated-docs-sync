const path = require('path');

/**
 * Create ISO timestamp.
 */
function createTimestamp() {
  return new Date().toISOString();
}

/**
 * Escape special Markdown characters.
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for Markdown
 */
function escapeMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  // Escape pipes and convert newlines to <br>
  return text.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

/**
 * Write output to file.
 * @param {string} filePath - Output file path
 * @param {string} content - Content to write
 */
function writeOutput(filePath, content) {
  const fs = require('fs');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Redact common secret-like patterns from text.
 * WARNING: This is BEST-EFFORT ONLY.
 * @param {string} text - Text to redact
 * @returns {string} Text with secrets redacted
 */
function redactSecrets(text) {
  if (!text || typeof text !== 'string') return text;

  let redacted = text;

  // AWS Access Key IDs (AKIA...)
  redacted = redacted.replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED]');

  // AWS Secret Access Keys
  redacted = redacted.replace(/aws_secret_access_key\s*[:=]\s*['"]?[a-zA-Z0-9/+]{40}['"]?/gi, 'aws_secret_access_key=[REDACTED]');

  // Bearer tokens (standalone or in headers) - match word boundary, Bearer, and any alphanumeric/dots/hyphens/underscores
  redacted = redacted.replace(/\bBearer\s+[a-zA-Z0-9._-]+/gi, '[REDACTED]');
  // API keys: api_key=value (any length)

  redacted = redacted.replace(/\b(api[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9\-._]+['"]?/gi, (match) => {
    return match.replace(/[=:]\s*['"]?[a-zA-Z0-9\-._]+['"]?$/, '=[REDACTED]');
  });

  // Passwords: password=value
  redacted = redacted.replace(/\b(password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi, (match) => {
    return match.replace(/[=:]\s*['"]?[^\s'"]+['"]?$/, '=[REDACTED]');
  });

  // Authorization headers with value
  redacted = redacted.replace(/(authorization|auth)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi, '$1=[REDACTED]');

  // Generic secrets
  redacted = redacted.replace(/\b(secret|token)\s*[:=]\s*['"]?[a-z0-9\-._]{20,}['"]?/gi, (match) => {
    return match.replace(/[=:]\s*['"]?[a-z0-9\-._]{20,}['"]?$/, '=[REDACTED]');
  });

  // Connection strings
  redacted = redacted.replace(/\bconnection[_-]?string\s*[:=]\s*['"]?[a-zA-Z0-9\-._:/@]{20,}['"]?/gi, 'connection_string=[REDACTED]');

  // Private keys
  redacted = redacted.replace(/-----BEGIN.*PRIVATE KEY-----/gi, '[REDACTED]');

  // JWT tokens
  redacted = redacted.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED]');

  return redacted;
}

/**
 * Check if output paths would collide with scanned input files.
 * @param {string} markdownPath - Path to Markdown output
 * @param {string} reportPath - Path to JSON report output
 * @param {string[]} discoveredFiles - List of scanned JavaScript files
 * @throws {Error} If collision detected
 */
function checkOutputCollisions(markdownPath, reportPath, discoveredFiles) {
  if (!markdownPath || !reportPath || !discoveredFiles) {
    return;
  }

  const resolvedMarkdown = path.resolve(markdownPath);
  const resolvedReport = path.resolve(reportPath);

  for (const file of discoveredFiles) {
    const resolvedFile = path.resolve(file);

    if (resolvedMarkdown === resolvedFile) {
      throw new Error(
          `Markdown output path collides with an input file: ${markdownPath}\n` +
          'Choose a different output path (e.g., api-docs.md)'
      );
    }

    if (resolvedReport === resolvedFile) {
      throw new Error(
          `JSON report path collides with an input file: ${reportPath}\n` +
          'Choose a different output path (e.g., api-coverage.json)'
      );
    }
  }
}

module.exports = {
  createTimestamp,
  escapeMarkdown,
  writeOutput,
  redactSecrets,
  checkOutputCollisions
};