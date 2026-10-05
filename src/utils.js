const fs = require('fs');
const path = require('path');

const KEY_VALUE_SECRET_PATTERN = /\b(password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi;

function createTimestamp() {
  return new Date().toISOString();
}

function redactSecrets(value) {
  return String(value)
    .replace(/\bauthorization\s*:\s*bearer\s+[A-Za-z0-9._~+/=-]+/gi, '[REDACTED]')
    .replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, '[REDACTED]')
    .replace(KEY_VALUE_SECRET_PATTERN, (match, label, separator) => (
      `${label}${separator}[REDACTED]`
    ))
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED]');
}

function escapeMarkdown(value) {
  return redactSecrets(value)
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim();
}

function writeOutput(filePath, contents) {
  fs.writeFileSync(path.resolve(filePath), contents, 'utf8');
}

module.exports = {
  createTimestamp,
  escapeMarkdown,
  redactSecrets,
  writeOutput
};
