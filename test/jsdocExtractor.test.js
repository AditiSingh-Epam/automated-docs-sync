const { extractJSDoc } = require('../src/jsdocExtractor');

describe('JSDoc extraction', () => {
  test('extracts summary, route tags, parameters, and return metadata', () => {
    const result = extractJSDoc(`*
 * Fetches one user by identifier.
 * @method GET
 * @path /users/:id
 * @param {string} id - User identifier
 * @returns {User} - The matching user
 `);

    expect(result).toMatchObject({
      present: true,
      method: 'GET',
      path: '/users/:id',
      summary: 'Fetches one user by identifier.',
      params: [{ name: 'id', type: 'string', description: 'User identifier' }],
      returns: { type: 'User', description: 'The matching user' },
      gaps: []
    });
  });

  test('records missing docs, absent summaries, and malformed tags', () => {
    expect(extractJSDoc(null)).toMatchObject({ present: false, gaps: ['jsdoc'] });
    const incomplete = extractJSDoc('* @param\n * @unknown value');
    expect(incomplete.present).toBe(true);
    expect(incomplete.gaps).toEqual(['summary', 'invalidTags']);
    expect(incomplete.invalidTags).toHaveLength(2);
  });

  test('accepts optional parameter names and the singular return tag', () => {
    const result = extractJSDoc('* A description.\n * @param {number} [limit] Maximum rows\n * @return {number} Count');
    expect(result.params[0]).toEqual({ name: 'limit', type: 'number', description: 'Maximum rows' });
    expect(result.returns).toEqual({ type: 'number', description: 'Count' });
  });
});
