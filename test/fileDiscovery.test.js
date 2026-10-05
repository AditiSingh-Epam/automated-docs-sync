const fs = require('fs');
const os = require('os');
const path = require('path');
const { discoverFiles, isJavaScriptFile, shouldSkipFile } = require('../src/fileDiscovery');
const { removeDirectory } = require('./helpers');

describe('file discovery', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-sync-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    removeDirectory(root);
  });

  test('recursively returns sorted JavaScript files and skips dependency and hidden files', () => {
    fs.mkdirSync(path.join(root, 'nested'));
    fs.mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true });
    fs.writeFileSync(path.join(root, 'z.js'), '');
    fs.writeFileSync(path.join(root, 'nested', 'a.JS'), '');
    fs.writeFileSync(path.join(root, '.hidden.js'), '');
    fs.writeFileSync(path.join(root, 'node_modules', 'pkg', 'ignored.js'), '');
    fs.writeFileSync(path.join(root, 'notes.ts'), '');

    const result = discoverFiles(root);
    expect(result.files.map((file) => path.basename(file))).toEqual(['a.JS', 'z.js']);
    expect(result.warnings).toEqual([]);
  });

  test('returns an empty list for an empty root and reports missing roots', () => {
    expect(discoverFiles(root)).toEqual({ files: [], warnings: [] });
    expect(() => discoverFiles(path.join(root, 'missing'))).toThrow('Cannot access input directory');
  });

  test('rejects a regular file as the input root and exposes file filters', () => {
    const file = path.join(root, 'file.js');
    fs.writeFileSync(file, '');
    expect(() => discoverFiles(file)).toThrow('not a directory');
    expect(isJavaScriptFile('source.JS')).toBe(true);
    expect(isJavaScriptFile('source.ts')).toBe(false);
    expect(shouldSkipFile(path.join(root, '.private.js'))).toBe(true);
    expect(shouldSkipFile(path.join(root, 'public.js'))).toBe(false);
  });

  test('continues when a nested directory cannot be read and records its path', () => {
    const blocked = path.join(root, 'blocked');
    fs.mkdirSync(blocked);
    fs.writeFileSync(path.join(root, 'root.js'), '');
    const readDirectory = fs.readdirSync;
    jest.spyOn(fs, 'readdirSync').mockImplementation((directory, options) => {
      if (directory === blocked) {
        throw new Error('permission denied');
      }
      return readDirectory(directory, options);
    });

    const result = discoverFiles(root);
    expect(result.files).toEqual([path.join(root, 'root.js')]);
    expect(result.warnings[0]).toContain(`Cannot read directory "${blocked}"`);
  });

  test('treats an unreadable input root as a fatal filesystem error', () => {
    jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
      throw new Error('permission denied');
    });
    expect(() => discoverFiles(root)).toThrow(`Cannot read input directory "${root}"`);
  });
});
