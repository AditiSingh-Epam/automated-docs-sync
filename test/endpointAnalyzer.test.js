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
    expect(dynamic.unsupportedPatterns).toMatchObject([
      { type: 'dynamicRoute', filePath: 'dynamic.js', method: 'GET', line: 1 }
    ]);

    const malformed = analyzeFile('broken.js', 'app.get(');
    expect(malformed.endpoints).toEqual([]);
    expect(malformed.warnings[0]).toContain('Cannot parse "broken.js"');
    expect(malformed.unsupportedPatterns).toEqual([]);
  });

  test('handles read failures and combines analysis across files', () => {
    expect(analyzeFile('missing.js').warnings[0]).toContain('Cannot read source file');
    const combined = analyzeFiles([]);
    expect(combined).toEqual({ endpoints: [], warnings: [], unsupportedPatterns: [] });
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

  test('associates JSDoc only with its handler declaration or inline route call', () => {
    const source = `/**
 * Correct handler documentation.
 */
const getUsers = (req, res) => {};
app.get('/users', getUsers);

/**
 * Documentation for a different helper.
 */
function helper() {}



app.get('/anonymous', (req, res) => {});

/**
 * Inline route documentation.
 */
app.get('/inline', (req, res) => {});
`;
    const result = analyzeFile('routes.js', source);
    expect(result.endpoints[0].jsdoc).toContain('Correct handler documentation.');
    expect(result.endpoints[1].jsdoc).toBeNull();
    expect(result.endpoints[2].jsdoc).toContain('Inline route documentation.');
  });

  test('captures computed and app.route registrations as structured unsupported patterns', () => {
    const result = analyzeFile('routes.js', "app[method]('/users', handler); app.route('/users'); app.options('/users', handler);");
    expect(result.unsupportedPatterns.map(({ type }) => type)).toEqual([
      'unsupportedRouteRegistration',
      'unsupportedRouteRegistration',
      'unsupportedHttpMethod'
    ]);
    expect(result.warnings).toHaveLength(3);
  });
});
