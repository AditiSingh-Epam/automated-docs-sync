const { analyzeFile, analyzeFiles, staticRoutePath } = require('../src/endpointAnalyzer');

describe('endpoint analyzer', () => {
  test('finds supported static routes and resolves named handlers with JSDoc', () => {
    const source = `/**
 * Fetches a user.
 */
function getUser(req, res) {}
const createUser = (req, res) => {};
app.get('/users/:id', getUser);
router.post(\`/users\`, createUser);
app.patch('/users/:id', (req, res) => {});
`;
    const result = analyzeFile('routes.js', source);
    expect(result.warnings).toEqual([]);
    expect(result.endpoints.map(({ method, path, handler }) => [method, path, handler])).toEqual([
      ['GET', '/users/:id', 'getUser'],
      ['POST', '/users', 'createUser'],
      ['PATCH', '/users/:id', 'anonymous']
    ]);
    expect(result.endpoints[0].jsdoc).toContain('Fetches a user.');
  });

  test('reports dynamic routes and malformed source as non-fatal warnings', () => {
    const dynamic = analyzeFile('dynamic.js', 'app.get(`/users/${id}`, handler);');
    expect(dynamic.endpoints).toEqual([]);
    expect(dynamic.warnings[0]).toContain('Unsupported dynamic GET route');

    const malformed = analyzeFile('broken.js', 'app.get(');
    expect(malformed.endpoints).toEqual([]);
    expect(malformed.warnings[0]).toContain('Cannot parse "broken.js"');
  });

  test('handles read failures and combines analysis across files', () => {
    expect(analyzeFile('missing.js').warnings[0]).toContain('Cannot read source file');
    const combined = analyzeFiles([]);
    expect(combined).toEqual({ endpoints: [], warnings: [] });
  });

  test('normalizes supported route strings and rejects computed paths', () => {
    expect(staticRoutePath({ type: 'StringLiteral', value: '/items' })).toBe('/items');
    expect(staticRoutePath({
      type: 'TemplateLiteral',
      expressions: [],
      quasis: [{ value: { cooked: '/items' } }]
    })).toBe('/items');
    expect(staticRoutePath({ type: 'Identifier', name: 'route' })).toBeNull();
  });
});
