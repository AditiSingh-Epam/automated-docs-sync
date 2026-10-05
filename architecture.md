# Architecture: Automated API Documentation Sync Tool

## 1. System Overview

This project is a local Node.js CLI tool that scans an Express.js API codebase, identifies route registrations and JSDoc metadata, and produces a centralized Markdown API reference plus a JSON documentation-coverage report. The codebase itself is treated as the source of truth, so documentation is generated from the application source instead of relying on a separate manual wiki.

The system is designed for teams managing Node.js REST APIs with 50+ endpoints. It must remain fast, resilient to malformed files, and suitable for local development and CI/CD execution. It accepts three required CLI inputs: an input directory, a Markdown output path, and a JSON report path.

## 2. Design Principles

- Source-of-truth design: Documentation is generated from code and JSDoc comments rather than a secondary manual system.
- Resilience over hard failure: A malformed file, partial JSDoc, or missing metadata should not stop other files from being processed.
- Static route-first discovery: Phase 1 focuses on static Express route registration patterns (`app.METHOD()`, `router.METHOD()`) and documents dynamic or computed route limitations explicitly.
- AST-driven extraction: Use a real JavaScript parser to reliably find route registrations and associated handlers without brittle regex matching across large codebases.
- CI-friendly output: The CLI must run non-interactively, emit summary data, and exit non-zero only for fatal CLI or filesystem problems.
- Shared generation timestamp: Markdown and JSON outputs are generated from the same run timestamp to keep them synchronized.
- Minimal external dependency surface: Keep the tool local-only and filesystem-based; no network calls or secret-bearing output.

## 3. Component Architecture

### Component 1: CLI Orchestrator
- Responsibility: Parse command-line arguments, validate the required input and output paths, initialize the processing pipeline, and manage exit codes.
- Input: `--input`, `--output`, and `--report` arguments from the process invocation.
- Output: Structured process execution, fatal errors for invalid input, warnings for partial metadata, and final status summary.
- Key Methods/Functions: `parseArgs()`, `validatePaths()`, `run()`, `exitWithError()`.

### Component 2: File Discovery Service
- Responsibility: Recursively walk the source tree and locate JavaScript files, maintaining a list of candidate source artifacts for analysis.
- Input: Root input directory.
- Output: Array of file paths to be scanned.
- Key Methods/Functions: `discoverFiles(dir)`, `isJavaScriptFile(path)`, `shouldSkipFile(path)`.

### Component 3: Endpoint Discovery Analyzer
- Responsibility: Parse JavaScript source using an AST and identify Express route registrations, associated handler functions, and endpoint metadata independent of documentation. This produces the complete endpoint inventory.
- Input: JavaScript source file contents.
- Output: List of discovered endpoints with method, path, handler name, file path, and route registration metadata.
- Key Methods/Functions: `analyzeFile(filePath)`, `findRouteCalls(ast)`, `normalizeRoutePath(expression)`, `collectEndpointCandidates()`.
- Supported patterns: Static `app.get/post/put/delete/patch()` and `router.get/post/put/delete/patch()` calls.
- Known limitation: Dynamic or computed route strings are treated as unsupported in Phase 1 and are flagged as incomplete or unhandled.

### Component 4: JSDoc Metadata Extractor
- Responsibility: For each discovered endpoint, read the associated function's leading JSDoc and extract method/path/summary/param/return metadata. It must parse partially complete documentation without aborting the overall scan.
- Input: Endpoint candidate and its relevant source region.
- Output: A structured documentation record for each endpoint, including gap metadata for missing or malformed fields.
- Key Methods/Functions: `extractJSDoc(endpoint)`, `parseParamTags()`, `parseReturnTags()`, `normalizeDocumentation()`.
- Parsed fields: `@method`, `@path`, function name, summary/description, `@param` entries, and `@returns`/`@return` data.

### Component 5: Documentation Aggregator
- Responsibility: Merge route-discovery data with JSDoc metadata to create a unified endpoint model. This step decides whether each endpoint is documented, partially documented, or missing documentation.
- Input: Discovered endpoints + extracted JSDoc records.
- Output: One combined endpoint model used for both Markdown generation and coverage reporting.
- Key Methods/Functions: `aggregateEndpoints()`, `evaluateCoverageStatus()`, `markDocumentationGaps()`.

### Component 6: Markdown Generator
- Responsibility: Create a readable centralized Markdown reference grouped by HTTP method and include the route, handler, description, parameters, and return information when available.
- Input: Aggregated endpoint model and UTC timestamp.
- Output: Markdown file written to the requested output path.
- Key Methods/Functions: `generateMarkdown(documentation, timestamp)`, `renderMethodSection(method, endpoints)`, `renderTableRow(endpoint)`.

### Component 7: Coverage Report Generator
- Responsibility: Compute totals and coverage stats according to the requirements and emit a JSON report with a synchronized timestamp.
- Input: Aggregated endpoint model and timestamp.
- Output: JSON file containing `totalEndpoints`, `documented`, `notDocumented`, `coverage`, and `timestamp`.
- Key Methods/Functions: `generateReport(endpointModel, timestamp)`, `calculateCoverage()`, `serializeReport()`.

## 4. Data Flow Diagram

```text
Input Directory
    ↓
[File Discovery]
    ↓
[AST Route Analysis]
    ↓
[JSDoc Extraction]
    ↓
[Endpoint Aggregation + Gap Analysis]
    ↓
[Markdown Generation]
    ↓
[JSON Coverage Report Generation]
    ↓
Output Files (Markdown + JSON)
```

The processing pipeline uses a single shared timestamp generated at the beginning of execution so both outputs remain aligned and reproducible.

## 5. Technology Stack

| Layer                  | Technology                                                           | Reasoning                                                                                   |
|------------------------|----------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| Runtime                | Node.js 14+                                                          | Matches project requirements and long-term support baseline                                 |
| Language               | JavaScript (ES6+)                                                    | Required by the project and compatible with the target runtime                              |
| AST Parsing            | `@babel/parser` and `@babel/traverse` (or equivalent parser library) | Robust handling of route registration patterns and associated handler functions             |
| File System Operations | Built-in `fs` and `path` modules                                     | No network dependency and fully local operation                                             |
| Testing                | Jest                                                                 | Common, reliable unit/integration test framework for Node.js                                |
| Linting                | ESLint                                                               | Required for maintainability and compliance with coding standards                           |
| Output                 | Markdown + JSON                                                      | Matches the project requirement for a readable reference file and machine-consumable report |

## 6. File Structure

```text
project/
├── src/
│   ├── cli.js                     # CLI parsing and process orchestration
│   ├── fileDiscovery.js           # Recursive JavaScript file discovery
│   ├── endpointAnalyzer.js        # AST-based route registration analysis
│   ├── jsdocExtractor.js          # JSDoc parsing and metadata extraction
│   ├── aggregator.js              # Merge endpoints + documentation quality status
│   ├── markdownGenerator.js       # Generate Markdown API reference
│   ├── reportGenerator.js         # Generate JSON coverage report
│   ├── utils.js                   # Shared formatters, logging, and helpers
│   └── index.js                   # Main entry point
├── test/
│   ├── cli.test.js                # CLI validation and exit-code tests
│   ├── fileDiscovery.test.js      # Discovery behavior and edge cases
│   ├── endpointAnalyzer.test.js   # Route detection from static Express patterns
│   ├── jsdocExtractor.test.js     # JSDoc extraction and incomplete metadata handling
│   ├── markdownGenerator.test.js  # Output formatting tests
│   ├── reportGenerator.test.js    # Coverage math and timestamp generation
│   └── integration.test.js        # End-to-end CLI workflow validation
├── package.json
├── .eslintrc.json
├── README.md
├── requirements.md
├── architecture.md
├── .gitignore
└── docs/
    └── generated-api-reference.md
```

## 7. Module Responsibilities

- `src/cli.js`: Handles command-line arguments, validates required options, and invokes the main processing flow.
- `src/fileDiscovery.js`: Recursively enumerates JavaScript files while tolerating empty directories and unreadable nested paths gracefully.
- `src/endpointAnalyzer.js`: Parses files, locates route registrations, and tracks endpoint metadata independent of JSDoc.
- `src/jsdocExtractor.js`: Extracts JSDoc data from relevant handlers and normalizes incomplete or malformed metadata without crashing.
- `src/aggregator.js`: Combines route inventory with JSDoc quality to establish documented vs undocumented endpoint status.
- `src/markdownGenerator.js`: Formats Markdown grouped by HTTP method and includes route, handler, description, params, and return values where present.
- `src/reportGenerator.js`: Emulates the JSON report contract and includes totals, counts, coverage percentage, and timestamp.
- `src/utils.js`: Centralizes ISO timestamp generation, file-writing helpers, safe logging, and status-formatting utilities.
- `src/index.js`: Main entry point used by the CLI and future automation.

## 8. Error Handling Strategy

- Fatal Errors: Invalid CLI arguments, inaccessible input directories, and output path write failures are treated as non-zero process exits with actionable messages. These are surfaced immediately and do not continue processing.
- Non-Fatal Errors: Malformed files, missing or incomplete JSDoc, invalid route metadata, or unsupported dynamic route patterns are logged as warnings and included in the report. Processing continues for the rest of the codebase.
- Warnings: Warnings are concise, include the file or endpoint involved, and explain the kind of gap detected. They are intended to be readable in both terminal logs and CI output.
- Output consistency: A single generation timestamp is emitted for the run so both the Markdown and JSON outputs clearly belong to the same scan.

## 9. Performance Considerations

- Requirement: complete scanning and reporting for a typical 50+ endpoint project in under 10 seconds.
- Strategy: limit parsing to JavaScript files under the input directory, avoid network I/O, and perform a single AST traversal per file.
- Efficiency choices: keep route detection static and load relevant file sections only; avoid re-reading files unnecessarily; maintain a combined in-memory model for both outputs.
- Potential bottlenecks: extremely large source trees or deeply nested directories, large files with repeated route registration patterns, or AST parse time on unusually large single files. These are mitigated by targeted traversal and per-file processing.

## 10. Security Considerations

- Filesystem-only operation: The tool reads source files and writes output files on disk only; it never calls external APIs or network endpoints.
- Secret-sanitization: Generated Markdown and report content should not directly echo source comments or tokens if they appear in JSDoc. Any sensitive-looking content should be filtered or redacted before output.
- Input validation: CLI arguments and paths are validated before processing, reducing the risk of writing outside the expected project scope.
- Output discipline: Generated content uses only normalized endpoint metadata instead of raw unfiltered source comments.

## 11. Testing Strategy

- Unit tests: validate each module in isolation, including file discovery, route detection, JSDoc extraction, coverage calculation, and Markdown rendering.
- Integration tests: run the CLI end-to-end against a controlled fixture project to verify input validation, generated outputs, timestamp synchronization, and warning behavior.
- Coverage target: greater than 80% code coverage, in line with the project’s quality requirement.
- Critical scenarios:
  - valid project with complete JSDoc
  - project with mixed documented and undocumented endpoints
  - malformed JSDoc or missing route metadata
  - unreadable or missing input directory
  - zero-endpoint project
  - generated Markdown + JSON outputs share one timestamp

## 12. Deployment & Usage

- Installation: `npm install`
- CLI usage: `node src/cli.js --input ./api --output ./docs/api-reference.md --report ./report.json`
- CI/CD suitability: the tool runs without prompting and exits clearly for fatal errors; warnings are emitted without stopping a full scan.
- Platform support: any system running Node.js 14 or later with a local filesystem.
- Documentation: README must explain CLI options, supported JSDoc conventions, output artifacts, and usage examples for local and pipeline execution.

## Resulting Design Summary

The tool is implemented as a small, resilient CLI pipeline with seven concrete modules centered around file discovery, AST-based route analysis, JSDoc extraction, endpoint aggregation, Markdown generation, and JSON coverage reporting. The architecture intentionally favors correctness and resilience over generic route inference, which aligns with the project’s requirement for reliable documentation sync in expressive but often inconsistent Express codebases.
