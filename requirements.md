# Requirements: Automated API Documentation Sync Tool

## 1. Project Overview

Build a local Node.js command-line tool that scans an Express.js API codebase, extracts endpoint and JSDoc metadata, generates a centralized Markdown API reference, and writes a JSON documentation-coverage report. The codebase is the source of truth; the tool must not require external services or network access.

**Priority:** High  
**Target runtime:** Node.js 14 or later  
**Primary users:** Development team leads and developers maintaining Node.js REST APIs

## 2. User Story

As a development team lead managing a Node.js REST API with 50 or more endpoints, I want an automated system that synchronizes API documentation from JSDoc comments in my codebase to a centralized Markdown file, so documentation stays current, developers avoid manual updates, API consumers receive accurate information, and documentation gaps are visible in a validation report.

The current process maintains JSDoc and a separate manual wiki, which can become inconsistent and takes two to three hours per release to reconcile. The desired state uses the codebase as the source of truth and minimizes manual documentation maintenance.

## 3. Functional Requirements

- **REQ-F1 — CLI inputs:** The tool shall provide a CLI accepting `--input <directory>`, `--output <markdown-file>`, and `--report <json-file>`. It shall validate required arguments and report invalid or inaccessible paths with actionable errors.
- **REQ-F2 — Source discovery:** The tool shall recursively discover JavaScript source files under the input directory, including nested directories, and shall tolerate files that contain no JSDoc without aborting the scan.
- **REQ-F3 — Endpoint discovery:** The tool shall identify endpoint candidates in the source and associate them with their handler functions so it can count both documented and undocumented endpoints. It shall support the HTTP methods GET, POST, PUT, DELETE, and PATCH.
- **REQ-F4 — JSDoc extraction:** For each endpoint with associated JSDoc, the tool shall extract the HTTP method (`@method`), route path (`@path`), handler function name, summary/description, parameter names, types and descriptions (`@param`), and return type and description (`@returns` or `@return`).
- **REQ-F5 — Incomplete documentation:** The tool shall warn about endpoints with absent, malformed, or incomplete JSDoc, continue processing other files and endpoints, and include documentation gaps in the generated report. It shall distinguish an endpoint with no documentation from one with partially missing metadata.
- **REQ-F6 — Markdown generation:** The tool shall write a Markdown API reference containing all discovered endpoints, grouped by HTTP method and presented in readable tables. The output shall include the route, handler function, description, parameters (including types and descriptions when present), and return information when present.
- **REQ-F7 — Timestamp:** The Markdown file and JSON report shall include a generation timestamp in ISO 8601 UTC format. Both outputs from the same run shall use the same timestamp.
- **REQ-F8 — Coverage report:** The tool shall write a JSON report containing `totalEndpoints`, `documented`, `notDocumented`, `coverage`, and `timestamp`. Coverage shall be calculated as `documented / totalEndpoints * 100`, expressed as a percentage; when no endpoints are found, coverage shall be `0`.
- **REQ-F9 — CI usability:** The CLI shall run without interactive prompts and be suitable for invocation from local development and CI/CD pipelines. Incomplete documentation shall produce warnings and a report rather than stopping the scan; fatal input or output errors shall be reported and return a non-zero process exit code.
- **REQ-F10 — Filesystem-only operation:** The tool shall read source files and write the requested outputs using local filesystem access only. It shall not make external API calls or include hardcoded secrets in generated output.

## 4. Non-Functional Requirements

- **REQ-NF1 — Performance:** Scanning and generating outputs for a typical project with at least 50 endpoints distributed across nested JavaScript directories shall complete in less than 10 seconds.
- **REQ-NF2 — Compatibility:** The tool shall run on Node.js 14 or later and use JavaScript with ES6-or-later language features supported by the target runtime.
- **REQ-NF3 — Quality:** Source code shall be ESLint compliant and follow maintainable coding practices.
- **REQ-NF4 — Test coverage:** Unit tests shall cover more than 80% of the tool's code, and the project shall include integration tests for the CLI workflow.
- **REQ-NF5 — Usability documentation:** The README shall document installation/setup, CLI options, expected JSDoc conventions, generated outputs, and usage examples.
- **REQ-NF6 — Reliability:** A malformed file or incomplete endpoint documentation shall not prevent processing of other readable source files. Filesystem and argument errors shall be surfaced clearly rather than silently ignored.
- **REQ-NF7 — Security:** Generated documentation and reports shall not expose secrets found in source comments or other scanned content.

## 5. Acceptance Criteria

- [ ] `--input`, `--output`, and `--report` are accepted and validated by the CLI.
- [ ] JavaScript source files are scanned recursively; files without JSDoc do not abort the run.
- [ ] Endpoint discovery identifies documented and undocumented endpoint candidates for GET, POST, PUT, DELETE, and PATCH.
- [ ] JSDoc method, path, function name, summary, parameter metadata, and return metadata are extracted where present.
- [ ] Missing or malformed documentation is warned about and represented in the report while processing continues.
- [ ] A Markdown reference is generated with endpoints grouped by method in readable tables and with all available metadata.
- [ ] A JSON report contains accurate endpoint totals, documented and undocumented counts, percentage coverage, and a timestamp.
- [ ] Markdown and JSON outputs share an ISO 8601 UTC generation timestamp.
- [ ] A typical scan of at least 50 endpoints completes in under 10 seconds.
- [ ] Unit-test coverage exceeds 80%, integration tests are included, and ESLint passes.
- [ ] The README contains clear setup and CLI examples.
- [ ] Fatal CLI or filesystem errors are clearly reported and return a non-zero exit code.
- [ ] No external API calls are made, and generated outputs do not contain secrets.

## 6. In-Scope & Out-of-Scope

**In scope:** A local Node.js/JavaScript CLI for scanning an Express.js API codebase; recursive JavaScript source discovery; endpoint and JSDoc metadata extraction; Markdown API reference generation; JSON documentation-coverage reporting; warnings for incomplete documentation; CI/CD-friendly non-interactive execution; tests, ESLint compliance, and README documentation.

**Out of scope for Phase 1:** OpenAPI/Swagger JSON generation, a web UI or dashboard, Confluence/Slack integration, database storage, scheduled runs, multi-language source support, and a pre-commit hook. A pre-commit hook was identified as optional but is not included in the selected Phase 1 scope.

## 7. Success Metrics

- All supported endpoint metadata is extracted accurately.
- The generated Markdown is readable and reflects the scanned source.
- JSON endpoint counts and coverage percentage are accurate.
- A scan of a typical project with 50 or more endpoints completes in under 10 seconds.
- Unit-test coverage is greater than 80%, integration tests are present, and there are no failing tests.
- The code passes ESLint and review.
- The README enables developers to run the tool without additional guidance.

## Assumptions Requiring Review

- Endpoint totals require identifying endpoint registrations independently of JSDoc. The story does not specify the exact Express registration syntax or how dynamically constructed routes should be handled; Phase 1 should document the supported static route patterns and treat unrecognized dynamic registrations as a limitation.
- The story asks for breaking changes to be tracked, but does not define a comparison baseline, change definition, or CLI input for a previous version. The report requirements above cover current-scan completeness only; cross-version breaking-change detection needs a separately agreed baseline and behavior.
- The story does not define what makes documentation “complete.” For initial implementation, an endpoint is considered documented when its method, route, handler name, and summary are available from source/JSDoc; parameter and return details are included when declared, and missing fields are reported as gaps. Confirm whether missing return documentation should make an endpoint incomplete.
