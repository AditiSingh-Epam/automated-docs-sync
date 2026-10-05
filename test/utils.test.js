const { checkOutputCollisions, redactSecrets } = require('../src/utils');

describe('shared utilities', () => {
  test('redacts common secret-like patterns and treats detection as best effort', () => {
    expect(redactSecrets('api_key: sk_live_1234567890abcdefghijk')).toContain('[REDACTED]');
    expect(redactSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9')).toContain('[REDACTED]');
    expect(redactSecrets('AKIA1234567890ABCDEF')).toBe('[REDACTED]');
    expect(redactSecrets('ordinary documentation')).toBe('ordinary documentation');
  });

  test('rejects output paths that resolve to scanned source files', () => {
    const sourceFile = __filename;
    expect(() => checkOutputCollisions(sourceFile, 'coverage.json', [sourceFile]))
      .toThrow('Markdown output path collides with an input file');
    expect(() => checkOutputCollisions('api.md', sourceFile, [sourceFile]))
      .toThrow('JSON report path collides with an input file');
    expect(() => checkOutputCollisions('api.md', 'coverage.json', [sourceFile])).not.toThrow();
  });
});
