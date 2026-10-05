#!/usr/bin/env node

const { sync } = require('./index');

const USAGE = 'Usage: automated-docs-sync --input <directory> --output <markdown-file> --report <json-file>';

function parseArgs(argv) {
  const options = {};
  const names = new Map([
    ['--input', 'input'],
    ['--output', 'output'],
    ['--report', 'report']
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      return { help: true };
    }
    const equalsIndex = argument.indexOf('=');
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const optionName = names.get(flag);
    if (!optionName) {
      throw new Error(`Unknown option "${flag}". ${USAGE}`);
    }
    const value = equalsIndex === -1 ? argv[index + 1] : argument.slice(equalsIndex + 1);
    if (!value || value.startsWith('--')) {
      throw new Error(`Option "${flag}" requires a value. ${USAGE}`);
    }
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      throw new Error(`Option "${flag}" may only be provided once.`);
    }
    options[optionName] = value;
    if (equalsIndex === -1) {
      index += 1;
    }
  }

  ['input', 'output', 'report'].forEach((name) => {
    if (!options[name]) {
      throw new Error(`Missing required --${name} option. ${USAGE}`);
    }
  });
  return options;
}

function runCli(argv, output = console) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      output.log(USAGE);
      return 0;
    }
    const result = sync(options);
    result.warnings.forEach((warning) => output.warn(`Warning: ${warning}`));
    output.log(`Scanned ${result.report.totalEndpoints} endpoints; coverage ${result.report.coverage}%.`);
    output.log(`Documentation: ${result.summary.documentedEndpoints} documented, ${result.summary.partialEndpoints} partial, ${result.summary.missingDocumentation} missing.`);
    output.log(`Status: ${result.status} (${result.warningCount} warning${result.warningCount === 1 ? '' : 's'}).`);
    return 0;
  } catch (error) {
    output.error(`Error: ${error.message}`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = runCli(process.argv.slice(2));
}

module.exports = {
  parseArgs,
  runCli
};
