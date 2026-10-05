const { generateMarkdown, renderParams, renderReturns } = require('../src/markdownGenerator');

describe('Markdown generation', () => {
  test('groups routes by method and renders available metadata and timestamp', () => {
    const markdown = generateMarkdown([
      {
        method: 'POST',
        path: '/users',
        handler: 'createUser',
        summary: 'Creates a user',
        params: [{ name: 'name', type: 'string', description: 'Display name' }],
        returns: { type: 'User', description: 'Created user' }
      },
      { method: 'GET', path: '/users', handler: 'listUsers', summary: '', params: [], returns: null }
    ], '2026-01-01T00:00:00.000Z');

    expect(markdown.indexOf('## GET')).toBeLessThan(markdown.indexOf('## POST'));
    expect(markdown).toContain('Generated: 2026-01-01T00:00:00.000Z');
    expect(markdown).toContain('`string` `name`: Display name');
    expect(markdown).toContain('`User`: Created user');
    expect(markdown).toContain('Undocumented');
  });

  test('redacts secrets, escapes table separators, and handles empty endpoints', () => {
    const markdown = generateMarkdown([{
      method: 'GET',
      path: '/users',
      handler: 'getUser',
      summary: 'Uses api_key=topsecret | safely',
      params: [],
      returns: null
    }], 'now');
    expect(markdown).toContain('api_key=[REDACTED] \\| safely');
    expect(markdown).not.toContain('topsecret');
    expect(generateMarkdown([], 'now')).toContain('No endpoints found.');
  });

  test('renders missing parameter and return values as empty cells', () => {
    expect(renderParams([])).toBe('');
    expect(renderReturns(null)).toBe('');
  });
});
