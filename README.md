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

The input must be an existing directory, and the parent directories for both output files must already exist. The CLI exits non-zero for invalid arguments and fatal input/output errors. Output paths that resolve to discovered source files are rejected to prevent overwriting source code. Incomplete documentation, unsupported route patterns, and malformed source files are reported as warnings while other files continue to be processed. The CLI distinguishes `SUCCESS` from `SUCCESS_WITH_WARNINGS`; either status exits zero, while fatal errors exit non-zero.

Run quality checks with `npm test`, `npm run test:coverage`, and `npm run lint`.

## Supported routes and JSDoc

Phase 1 recognizes static calls of the form `app.get(path, handler)` and `router.get(path, handler)` for GET, POST, PUT, DELETE, and PATCH. Static quoted paths and template literals without interpolation are supported. Dynamic/computed paths, other HTTP methods (such as OPTIONS and HEAD), and other registration APIs (including `app.route()`) are not inventoried; recognizable unsupported patterns are listed in the JSON report. Only `.js` files are scanned; `node_modules`, `.git`, `coverage`, `vendor`, and hidden JavaScript files are skipped.

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

The registered route and method are authoritative; `@method` and `@path` are extracted and reported as gaps when they conflict. JSDoc is associated with the specific named handler declaration or inline route registration when the comment directly precedes that node; unrelated or distant comments are not attributed to a route.

### Documentation status and coverage

A route is `documented` when it has an associated JSDoc summary and no malformed tags or route-tag conflicts. Parameter and return tags are optional. Missing JSDoc or summary is listed in `gapDetails.missingFields`; malformed tags and method/path conflicts are provided in `gapDetails.invalidTags` and `gapDetails.tagMismatch`. The legacy `gaps` array remains available with concise reason codes.

Endpoints without JSDoc are `missing`; those with incomplete or conflicting JSDoc are `partial`. Both partial and missing endpoints count toward `notDocumented` and are excluded from coverage:

```text
Coverage = (Fully Documented Endpoints / Total Endpoints) * 100
```

When no endpoints are discovered, coverage is 0%. The JSON report also includes `partial`, `missing`, `warningCount`, `status`, and structured `unsupportedPatterns`.

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
  "status": "SUCCESS",
  "totalEndpoints": 1,
  "documented": 1,
  "partial": 0,
  "missing": 0,
  "notDocumented": 0,
  "coverage": 100,
  "warningCount": 0,
  "unsupportedPatternsCount": 0,
  "unsupportedPatterns": [],
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
      "gaps": [],
      "gapDetails": {
        "missingFields": [],
        "invalidTags": [],
        "tagMismatch": []
      }
    }
  ]
}
```

Both outputs share the same ISO 8601 UTC timestamp. A scan with no routes reports 0% coverage.

## Security and secret handling

Generated output redacts a limited set of common secret-like patterns, including assignments labeled `password`, `secret`, `api_key`, `access_token`, or `client_secret`, bearer tokens, and AWS access-key identifiers. This detection is best-effort only: it may miss custom formats, encoded values, and other sensitive content, and must not be treated as a security boundary. Do not put real credentials in JSDoc comments; use placeholders and review generated artifacts before sharing or committing them. For CI or shared environments, use a dedicated secret-scanning tool as an additional control.