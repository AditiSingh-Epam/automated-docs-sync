const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { removeDirectory } = require('./helpers');
const { parseArgs, runCli } = require('../src/cli');
const { sync, validateOutputPath } = require('../src/index');
const { createTimestamp, escapeMarkdown, redactSecrets, writeOutput } = require('../src/utils');

describe('CLI and end-to-end workflow', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-sync-integration-'));
    fs.mkdirSync(path.join(root, 'api'));
  });

  afterEach(() => {
    removeDirectory(root);
  });

  test('generates synchronized Markdown and JSON for documented and undocumented routes', () => {
    const source = `/**
 * Lists all users.
 * @method GET
 * @path /users
 */
function listUsers(req, res) {}
app.get('/users', listUsers);
app.delete('/users/:id', (req, res) => {});
`;
    fs.writeFileSync(path.join(root, 'api', 'routes.js'), source);

    const result = sync({
      input: path.join(root, 'api'),
      output: path.join(root, 'api.md'),
      report: path.join(root, 'coverage.json'),
      timestamp: '2026-01-01T00:00:00.000Z'
    });
    const markdown = fs.readFileSync(path.join(root, 'api.md'), 'utf8');
    const report = JSON.parse(fs.readFileSync(path.join(root, 'coverage.json'), 'utf8'));

    expect(result.report.coverage).toBe(50);
    expect(markdown).toContain('Lists all users.');
    expect(markdown).toContain('Generated: 2026-01-01T00:00:00.000Z');
    expect(report.timestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(report.endpoints.map((endpoint) => endpoint.status)).toEqual(['documented', 'missing']);
    expect(result.warnings).toHaveLength(1);
  });

  test('validates CLI arguments and reports help without running the pipeline', () => {
    expect(parseArgs(['--input', 'api', '--output=api.md', '--report', 'report.json'])).toEqual({
      input: 'api',
      output: 'api.md',
      report: 'report.json'
    });
    expect(() => parseArgs(['--input'])).toThrow('requires a value');
    expect(() => parseArgs(['--unknown', 'x'])).toThrow('Unknown option');
    expect(() => parseArgs(['--input', 'a', '--input', 'b', '--output', 'o', '--report', 'r'])).toThrow('only be provided once');
    expect(() => parseArgs(['--input', 'a', '--output', 'o'])).toThrow('Missing required --report');

    const output = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    expect(runCli(['--help'], output)).toBe(0);
    expect(output.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(runCli(['--unknown'], output)).toBe(1);
    expect(output.error).toHaveBeenCalled();
  });

  test('runs through the CLI, surfaces warnings, and rejects invalid output locations', () => {
    fs.writeFileSync(path.join(root, 'api', 'routes.js'), 'app.get("/health", (req, res) => {});');
    const output = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const code = runCli([
      '--input', path.join(root, 'api'),
      '--output', path.join(root, 'api.md'),
      '--report', path.join(root, 'report.json')
    ], output);
    expect(code).toBe(0);
    expect(output.warn).toHaveBeenCalledWith(expect.stringContaining('Missing documentation'));
    expect(output.log).toHaveBeenCalledWith(expect.stringContaining('coverage 0%'));

    expect(() => validateOutputPath(path.join(root, 'missing', 'out.md'), '--output')).toThrow('Cannot access');
    expect(() => sync({
      input: path.join(root, 'api'),
      output: path.join(root, 'same.json'),
      report: path.join(root, 'same.json')
    })).toThrow('different files');
    expect(runCli([
      '--input', path.join(root, 'api'),
      '--output', path.join(root, 'missing', 'out.md'),
      '--report', path.join(root, 'report.json')
    ], output)).toBe(1);
  });

  test('launches the executable CLI as a child process', () => {
    fs.writeFileSync(path.join(root, 'api', 'routes.js'), 'app.get("/health", (req, res) => {});');
    const cliPath = path.resolve(__dirname, '../src/cli.js');
    const result = spawnSync(process.execPath, [
      cliPath,
      '--input', path.join(root, 'api'),
      '--output', path.join(root, 'cli.md'),
      '--report', path.join(root, 'cli.json')
    ], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Scanned 1 endpoints');
    expect(fs.existsSync(path.join(root, 'cli.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'cli.json'))).toBe(true);
  });

  test('redacts common credentials and writes output with a valid UTC timestamp', () => {
    expect(redactSecrets('password=hunter2')).toBe('password=[REDACTED]');
    expect(redactSecrets('password="hunter2"')).toBe('password=[REDACTED]');
    expect(redactSecrets('Bearer abc.def-123')).toBe('[REDACTED]');
    expect(redactSecrets('AKIA1234567890ABCDEF')).toBe('[REDACTED]');
    expect(redactSecrets('header: Bearer abc.def-123')).toBe('header: [REDACTED]');
    expect(redactSecrets('key AKIA1234567890ABCDEF')).toBe('key [REDACTED]');
    expect(escapeMarkdown('first|second\nthird')).toBe('first\\|second<br>third');
    expect(createTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    const destination = path.join(root, 'written.txt');
    writeOutput(destination, 'written');
    expect(fs.readFileSync(destination, 'utf8')).toBe('written');
  });
});
