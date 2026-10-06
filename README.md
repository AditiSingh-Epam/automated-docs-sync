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

Or use npm start:

```sh
npm start -- --input ./src --output ./docs/api-reference.md --report ./docs/api-coverage.json
```

The input must be an existing directory, and the parent directories for both output files must already exist. The CLI exits non-zero for invalid arguments and fatal input/output errors. Output paths that resolve to discovered source files are rejected to prevent overwriting source code. Incomplete documentation, unsupported route patterns, and malformed source files are reported as warnings while other files continue to be processed. The CLI distinguishes `SUCCESS` from `SUCCESS_WITH_WARNINGS`; either status exits zero, while fatal errors exit non-zero.

Run quality checks with:

```sh
npm test                # Run unit tests
npm run lint            # Run ESLint
npm run coverage        # Generate coverage report
```

## Supported routes and JSDoc

### Phase 1 Route Recognition

Phase 1 recognizes static calls of the form `app.get(path, handler)` and `router.get(path, handler)` for GET, POST, PUT, DELETE, and PATCH. Static quoted paths and template literals without interpolation are supported.

**Supported method names:**
- `app` or `router` identifiers only
- GET, POST, PUT, DELETE, PATCH methods

**Not supported:**
- Dynamic/computed paths (e.g., template literals with expressions)
- Other HTTP methods (OPTIONS, HEAD, all, connect, trace)
- Other registration APIs (e.g., `app.route()`)
- Router variable names other than `app` or `router` (e.g., `api`, `routes`, `server`)

Recognizable unsupported patterns are listed in the JSON report. Only `.js` files are scanned; `node_modules`, `.git`, `coverage`, `vendor`, and hidden JavaScript files (starting with `.`) are skipped.

### Route Discovery Limitations

**⚠️ Important:** The analyzer only recognizes route registration through variables explicitly named `app` or `router`. Other common names such as `api`, `routes`, or `server` are **not detected** and will be **silently skipped** without warning in the output or JSON report.

**Example - Will be detected:**
```javascript
const express = require('express');
const app = express();
const router = express.Router();

app.get('/users', handler);     // ✅ Detected
router.post('/posts', handler); // ✅ Detected
```

**Example - Will NOT be detected:**
```javascript
const api = express.Router();
const routes = express.Router();

api.get('/users', handler);     // ❌ Silently skipped
routes.post('/posts', handler); // ❌ Silently skipped
```

**Workaround:** If your codebase uses other variable names, refactor route registration to use `app` or `router` identifiers, or rename router instances for consistency.

### JSDoc Format

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

### Documentation Status and Coverage

A route is `documented` when it has an associated JSDoc summary and no malformed tags or route-tag conflicts. Parameter and return tags are optional.

**Status levels:**
- **documented** — Has JSDoc summary, no invalid tags or conflicts
- **partial** — Has JSDoc but missing summary or has invalid tags/conflicts
- **notDocumented** — No JSDoc present (includes both `missing` and `partial` for coverage calculation)
- **missing** — Alias for `notDocumented` in JSON report

Missing JSDoc or summary is listed in `gapDetails.missingFields`; malformed tags and method/path conflicts are provided in `gapDetails.invalidTags` and `gapDetails.tagMismatch`. The legacy `gaps` array remains available with concise reason codes.

**Coverage calculation:**
Coverage = (Fully Documented Endpoints / Total Endpoints) × 100


Only endpoints with `documented` status count toward coverage. Partial and missing endpoints are excluded. When no endpoints are discovered, coverage is 0%.

## Output Examples

### Markdown output

Grouped by HTTP method with redacted secrets:

```markdown
# API Reference

Generated: 2026-01-01T00:00:00.000Z

## GET

### `GET /users/:id`

**Handler:** `getUser`

**Status:** documented

Returns a user by identifier.

**Parameters:**

- `string` `id`: User identifier

**Returns:**

`User`: The matching user

---
```

### JSON Report

The JSON report includes aggregate coverage and endpoint-level details:

```json
{
  "status": "SUCCESS",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "warningCount": 0,
  "coverage": 100,
  "totalEndpoints": 1,
  "unsupportedPatternsCount": 0,
  "documented": 1,
  "partial": 0,
  "notDocumented": 0,
  "metadata": {
    "timestamp": "2026-01-01T00:00:00.000Z",
    "totalEndpoints": 1,
    "documentedCount": 1,
    "partialCount": 0,
    "notDocumentedCount": 0,
    "coverage": "100%",
    "unsupportedPatternsCount": 0
  },
  "endpoints": [
    {
      "method": "GET",
      "path": "/users/:id",
      "handler": "getUser",
      "filePath": "routes.js",
      "documentationStatus": "documented",
      "status": "documented",
      "gaps": {
        "missingFields": [],
        "invalidTags": [],
        "tagMismatch": [],
        "other": []
      },
      "documentation": {
        "present": true,
        "summary": "Returns a user by identifier.",
        "params": [
          {
            "name": "id",
            "type": "string",
            "description": "User identifier"
          }
        ],
        "returns": {
          "type": "User",
          "description": "The matching user"
        },
        "method": "GET",
        "path": "/users/:id"
      }
    }
  ],
  "unsupportedPatterns": []
}
```

Both outputs share the same ISO 8601 UTC timestamp. A scan with no routes reports 0% coverage.

## Security and Secret Handling

### Best-Effort Redaction

Generated output redacts a limited set of common secret-like patterns in both Markdown summaries and JSON report fields:

**Patterns redacted:**
- Password assignments: `password=value`, `password:value`
- API key assignments: `api_key=value`, `apikey:value`
- Bearer tokens: `Bearer <token>`
- AWS access keys: `AKIA...` (20-character AWS key IDs)
- Authorization headers: `authorization: <value>`
- AWS secret keys: `aws_secret_access_key=<value>`
- Private key blocks: `-----BEGIN...PRIVATE KEY-----`
- JWT tokens: `eyJ<base64>.<base64>.<base64>`
- Generic secrets: `secret=value`, `token=value`

**⚠️ Important Limitations:**
- Detection is **best-effort only** and is **NOT a security boundary**
- Custom or encoded secret formats may not be detected
- Redaction may miss context-specific sensitive values
- This tool is designed for local development; **do not rely on it for CI/CD or shared environments**

**Recommendations:**
- **Never put real credentials in JSDoc comments** — use environment variables or configuration files
- **Review generated artifacts before sharing or committing them**
- **In CI/CD and shared environments**, use a dedicated secret-scanning tool (e.g., git-secrets, TruffleHog) in addition to this tool
- **Store real credentials separately** from documentation and source code

### Redaction Scope

Redaction is applied to:
- JSDoc summaries in Markdown
- JSDoc parameter descriptions in Markdown
- JSDoc return descriptions in Markdown
- All documentation fields in JSON report
- Parameter descriptions in JSON report
- Return descriptions in JSON report

Redaction is **not** applied to:
- Route paths (legitimate API routes)
- Handler names (function names)
- File paths (source file names)
- Gap reason codes (internal classification)

## License

MIT