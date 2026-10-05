# Automated API Documentation Sync

A local Node.js CLI that discovers supported Express routes, associates JSDoc with their handlers, and writes a Markdown API reference plus a JSON documentation coverage report. It performs no network requests.

## Requirements and setup

Use Node.js 14 or later. Install dependencies with:

```sh
npm install
```

## Usage

```sh
node src/cli.js --input ./src --output ./docs/api-reference.md --report ./docs/api-coverage.json
```

The input must be an existing directory, and the parent directories for both output files must already exist. The CLI exits non-zero for invalid arguments and fatal input/output errors. Incomplete documentation, unsupported dynamic paths, and malformed source files are reported as warnings while other files continue to be processed.

Run quality checks with `npm test`, `npm run test:coverage`, and `npm run lint`.

## Supported routes and JSDoc

Phase 1 recognizes static calls of the form `app.get(path, handler)` and `router.get(path, handler)` for GET, POST, PUT, DELETE, and PATCH. Static quoted paths and template literals without interpolation are supported. Dynamic/computed paths and other registration APIs (including `app.route()`) are not inventoried. Only `.js` files are scanned; `node_modules`, `.git`, `coverage`, `vendor`, and hidden JavaScript files are skipped.

Put a JSDoc block immediately above a named handler or inline route call:

```js
/**
 * Returns a user by identifier.
 * @method GET
 * @path /users/:id
 * @param {string} id - User identifier
 * @returns {User} - The matching user
 */
function getUser(req, res) {
  // Route implementation
}

app.get('/users/:id', getUser);
```

The registered route and method are authoritative; `@method` and `@path` are extracted and reported as gaps when they conflict. A route is counted as documented when it has an associated JSDoc summary and no malformed tags or route-tag conflicts. Parameter and return tags are optional. Endpoints without JSDoc are `missing`; those with incomplete or conflicting JSDoc are `partial`. Both partial and missing endpoints count toward `notDocumented` for coverage.

## Output examples

Markdown is grouped by HTTP method:

```markdown
# API Reference

Generated: 2026-01-01T00:00:00.000Z

## GET

| Route | Handler | Description | Parameters | Returns |
| --- | --- | --- | --- | --- |
| `/users/:id` | `getUser` | Returns a user by identifier. | `string` `id`: User identifier | `User`: The matching user |
```

The JSON report includes aggregate coverage and endpoint-level gaps:

```json
{
  "totalEndpoints": 1,
  "documented": 1,
  "notDocumented": 0,
  "coverage": 100,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "endpoints": [
    {
      "id": "routes.js:12:0:GET:/users/:id",
      "method": "GET",
      "path": "/users/:id",
      "handler": "getUser",
      "filePath": "routes.js",
      "line": 12,
      "status": "documented",
      "gaps": []
    }
  ]
}
```

Both outputs share the same ISO 8601 UTC timestamp. A scan with no routes reports 0% coverage. Generated output redacts common secret-looking patterns, including credential assignments, bearer tokens, and AWS access-key identifiers. This heuristic is not a guarantee that all sensitive data can be detected, so avoid putting secrets in source comments.