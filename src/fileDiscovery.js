const fs = require('fs');
const path = require('path');

const SKIPPED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'coverage',
  'vendor'
]);

function isJavaScriptFile(filePath) {
  return filePath.toLowerCase().endsWith('.js');
}

function shouldSkipFile(filePath) {
  return path.basename(filePath).startsWith('.');
}

function discoverFiles(rootDirectory) {
  const root = path.resolve(rootDirectory);
  let rootStats;
  try {
    rootStats = fs.statSync(root);
  } catch (error) {
    throw new Error(`Cannot access input directory "${root}": ${error.message}`);
  }
  if (!rootStats.isDirectory()) {
    throw new Error(`Input path is not a directory: "${root}"`);
  }

  const files = [];
  const warnings = [];

  function walk(directory, isRoot = false) {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      if (isRoot) {
        throw new Error(`Cannot read input directory "${directory}": ${error.message}`);
      }
      warnings.push(`Cannot read directory "${directory}": ${error.message}`);
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    entries.forEach((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) {
          walk(entryPath);
        }
      } else if (entry.isFile() && isJavaScriptFile(entryPath) && !shouldSkipFile(entryPath)) {
        files.push(entryPath);
      }
    });
  }

  walk(root, true);
  return { files, warnings };
}

module.exports = {
  discoverFiles,
  isJavaScriptFile,
  shouldSkipFile
};
