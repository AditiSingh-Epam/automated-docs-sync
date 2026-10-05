# Implementation Plan: Automated API Documentation Sync Tool

## 1. Overview

This plan is based on `architecture.md` and `design-review.md` as the approved source of truth and uses the user-confirmed implementation order: Foundation → Processing → Output → Testing. It decomposes the architecture into one implementation task per component, with each component task including the required unit tests, plus a dedicated project setup task and a final end-to-end integration validation task.

Estimated total effort: 25 hours for a single developer.
Critical path: Setup → File Discovery → Endpoint Analyzer → Aggregator → Markdown + Coverage Report → Integration validation.

The plan stays aligned with the approved architecture:
- CLI Orchestrator handles CLI parsing, validation, and process orchestration.
- File Discovery recursively enumerates JavaScript sources.
- Endpoint Discovery Analyzer uses an AST to find static Express route registrations.
- JSDoc Metadata Extractor reads leading JSDoc and records partial or missing metadata without aborting the scan.
- Documentation Aggregator merges route and documentation records into a single endpoint model.
- Markdown Generator writes a centralized API reference.
- Coverage Report Generator emits the JSON coverage report from the same run timestamp.
- Unit tests are included in each component task, while integration tests are reserved for the final workflow validation.

## 2. Task Breakdown by Phase

### Phase 1: Foundation & Setup

#### TASK-001: Project Setup & Configuration
- Description: Initialize the Node.js project, create the directory structure, pin the AST dependency stack, configure ESLint and Jest, and prepare the local CLI/build/test scripts required for project execution.
- Effort: S (Small, <2 hours)
- Dependencies: NONE
- Acceptance Criteria:
  - [ ] `package.json` created with scripts for install, test, lint, and the CLI entry point.
  - [ ] `src/`, `test/`, and `docs/` directories created as defined by the architecture.
  - [ ] ESLint configuration aligns with the project’s Node.js 14+ baseline.
  - [ ] Jest configuration is created for unit/integration tests and coverage reporting.
  - [ ] Project dependencies include the chosen AST stack (`@babel/parser` and `@babel/traverse`, or equivalent accepted parser/traversal libraries) with a pinned version.
  - [ ] Project setup documents the supported syntax assumptions and parse-error policy for the AST layer.
  - [ ] `npm install` succeeds without dependency or environment errors.

#### TASK-002: CLI Orchestrator
- Description: Implement the CLI entry point, parse `--input`, `--output`, and `--report`, validate paths, orchestrate the processing pipeline, and return correct exit codes for fatal errors versus warnings.
- Effort: S (Small, <2 hours)
- Dependencies: TASK-001
- Acceptance Criteria:
  - [ ] CLI accepts the required arguments and rejects missing/invalid ones with actionable errors.
  - [ ] Input directory validation fails fast for missing or unreadable project roots and exits non-zero for fatal CLI/filesystem problems.
  - [ ] Output paths are validated before processing begins.
  - [ ] CLI invokes the component pipeline in the approved order: discovery → analysis → extraction → aggregation → generation.
  - [ ] The CLI emits warnings for non-fatal issues and still continues processing when possible.
  - [ ] Exit codes match the design: successful run returns 0; fatal CLI/filesystem failures return non-zero.
  - [ ] Unit tests cover valid invocation, invalid arguments, missing input directory, and output write failures.
  - [ ] src/index.js created and exports the main sync() function for use by external callers.
  - [ ] CLI entry point (src/cli.js) properly invokes the main orchestrator from index.js.

### Phase 2: Processing

#### TASK-003: File Discovery Service
- Description: Walk the source tree, locate JavaScript files, filter unsupported artifacts, and return a stable candidate list for downstream analysis while handling empty/unreadable paths consistently.
- Effort: M (Medium, 2–4 hours)
- Dependencies: TASK-001
- Acceptance Criteria:
  - [ ] Recursively discovers JavaScript files under the input root while skipping directories and files that are explicitly unsupported.
  - [ ] The discovery result includes only relevant `.js` candidates and ignores non-source assets.
  - [ ] The implementation treats unreadable nested paths as warnings with a clear path-specific error message rather than silently dropping them.
  - [ ] Empty directories do not fail the scan and return an empty candidate list.
  - [ ] Unit tests cover nested directory scanning, unsupported file filtering, unreadable path handling, and empty-directory behavior.

#### TASK-004: Endpoint Discovery Analyzer
- Description: Parse all candidate JavaScript files using an AST, detect supported static Express route registrations (`app.METHOD()` and `router.METHOD()`), and produce the route inventory with associated handlers, route metadata, and explicit unsupported-pattern notices.
- Effort: L (Large, 4–8 hours)
- Dependencies: TASK-003
- Acceptance Criteria:
  - [ ] Detects supported static Express endpoints for GET, POST, PUT, DELETE, and PATCH.
  - [ ] Associates a route call with its handler function and file path as defined by the architecture.
  - [ ] Normalizes route strings and preserves method/path metadata for downstream aggregation.
  - [ ] Flags dynamic/computed route strings as unsupported in Phase 1 without crashing the overall scan.
  - [ ] Handles malformed source files as non-fatal warnings and continues with the rest of the tree.
  - [ ] Unit tests cover supported route patterns, malformed AST input, dynamic route limitations, and mixed static/dynamic project fixtures.

#### TASK-005: JSDoc Metadata Extractor
- Description: Read each discovered endpoint’s relevant source region, parse leading JSDoc blocks, and extract summary, params, return data, and route/method metadata while tolerating partial or malformed docs.
- Effort: M (Medium, 2–4 hours)
- Dependencies: TASK-003
- Acceptance Criteria:
  - [ ] Extracts `@method`, `@path`, function name, summary/description, `@param` entries, and `@returns`/`@return` metadata where present.
  - [ ] Handles missing or malformed JSDoc without aborting the rest of the scan.
  - [ ] Detects gaps such as missing summary, missing params, missing return block, and inconsistent tags as structured metadata.
  - [ ] Keeps the extractor independent from the route inventory so coverage can be computed even when documentation is incomplete.
  - [ ] Unit tests cover complete JSDoc, partially complete JSDoc, malformed tags, and no-JSDoc cases.

#### TASK-006: Documentation Aggregator
- Description: Merge route-discovery results and JSDoc output into a unified endpoint model, classify each endpoint as documented/partially documented/not documented, and encode per-endpoint gap information required by the JSON report contract.
- Effort: M (Medium, 2–4 hours)
- Dependencies: TASK-004, TASK-005
- Acceptance Criteria:
  - [ ] Uses a single endpoint model that includes route inventory, JSDoc details, and status metadata.
  - [ ] Classifies endpoints as documented, partially documented, or missing documentation using the approved completeness rule (complete fields required by the project contract; partial docs keep working metadata).
  - [ ] Adds explicit gap metadata for missing fields, invalid tags, or unsupported documentation states without losing the underlying route information.
  - [ ] Retains aggregate coverage totals from the same source of truth for both Markdown and JSON generation.
  - [ ] Unit tests cover all documented states, mixed endpoint projects, and zero-endpoint behavior.

### Phase 3: Output

#### TASK-007: Markdown Generator
- Description: Generate a centralized Markdown API reference grouped by HTTP method, rendering route, handler, description, parameters, and return values when available, with consistent formatting and a shared run timestamp.
- Effort: M (Medium, 2–4 hours)
- Dependencies: TASK-006
- Acceptance Criteria:
  - [ ] Produces a Markdown file grouped by HTTP method in the approved format.
  - [ ] Includes route, handler, description, parameters, and return information when present.
  - [ ] Omits sensitive-looking content or redacts obvious secret-like values extracted from JSDoc before writing output.
  - [ ] Writes the same UTC timestamp supplied by the CLI run so Markdown and JSON remain synchronized.
  - [ ] Unit tests cover method grouping, empty route sets, partial metadata rendering, and secret-sanitization behavior.

#### TASK-008: Coverage Report Generator
- Description: Compute totals and coverage statistics from the aggregated endpoint model and serialize the JSON report, including the required aggregate fields and an explicit per-endpoint gap structure for documentation quality.
- Effort: M (Medium, 2–4 hours)
- Dependencies: TASK-006
- Acceptance Criteria:
  - [ ] Produces a JSON report with `totalEndpoints`, `documented`, `notDocumented`, `coverage`, and `timestamp` as required by the architecture.
  - [ ] Includes a stable per-endpoint status and gap structure for documented vs. partially documented vs. missing documentation scenarios.
  - [ ] Defines zero-endpoint behavior and coverage calculation consistently (coverage = 0 when no endpoints exist or calculated as documented/total when endpoints exist).
  - [ ] Uses the same UTC timestamp generated at the start of execution as the Markdown output.
  - [ ] Unit tests cover complete projects, mixed documentation states, zero-endpoint projects, and timestamp alignment.

### Phase 4: Testing

#### TASK-009: End-to-End Integration Validation
- Description: Execute the complete CLI workflow against controlled fixtures to validate input validation, processing success, warning behavior, generated output files, and timestamp synchronization in a realistic repo scenario.
- Effort: M (Medium, 2–4 hours)
- Dependencies: TASK-002, TASK-007, TASK-008
- Acceptance Criteria:
  - [ ] The CLI runs successfully against a fixture project with complete JSDoc and produces both Markdown and JSON outputs.
  - [ ] Mixed documented and undocumented endpoint fixtures validate correct coverage numbers and warning output.
  - [ ] Malformed input directory and invalid CLI arguments produce the expected fatal errors and non-zero exits.
  - [ ] Unsupported dynamic route patterns are surfaced as warnings rather than hard failures.
  - [ ] Generated Markdown and JSON use the same timestamp for a single run.
  - [ ] Integration tests cover the required end-to-end workflow and confirm the success/failure semantics mandated by the design.
  - [ ] README.md created with clear documentation of:
    - [ ] CLI usage examples showing --input, --output, and --report flags
    - [ ] Expected JSDoc conventions for the tool to recognize endpoints
    - [ ] Sample output from a Markdown API reference
    - [ ] Sample output from a JSON coverage report
    - [ ] List of supported static Express route patterns (app.METHOD, router.METHOD)
    - [ ] Known Phase 1 limitations (dynamic routes not supported)
  - [ ] npm run lint, npm run test, and coverage reporting all pass
  - [ ] Project is ready for initial code review

## 3. Task List with Dependencies

| Task ID | Title | Phase | Effort | Dependencies | Status |
|---------|-------|-------|--------|--------------|--------|
| TASK-001 | Project Setup & Configuration | Foundation | S | NONE | ⏳ TODO |
| TASK-002 | CLI Orchestrator | Foundation | S | TASK-001 | ⏳ TODO |
| TASK-003 | File Discovery Service | Processing | M | TASK-001 | ⏳ TODO |
| TASK-004 | Endpoint Discovery Analyzer | Processing | L | TASK-003 | ⏳ TODO |
| TASK-005 | JSDoc Metadata Extractor | Processing | M | TASK-003 | ⏳ TODO |
| TASK-006 | Documentation Aggregator | Processing | M | TASK-004, TASK-005 | ⏳ TODO |
| TASK-007 | Markdown Generator | Output | M | TASK-006 | ⏳ TODO |
| TASK-008 | Coverage Report Generator | Output | M | TASK-006 | ⏳ TODO |
| TASK-009 | End-to-End Integration Validation | Testing | M | TASK-002, TASK-007, TASK-008 | ⏳ TODO |

## 4. Dependency Graph

```text
TASK-001 (Project Setup)
├─→ TASK-002 (CLI Orchestrator)
├─→ TASK-003 (File Discovery)
│   ├─→ TASK-004 (Endpoint Analyzer)
│   │   └─→ TASK-006 (Documentation Aggregator)
│   │       ├─→ TASK-007 (Markdown Generator)
│   │       └─→ TASK-008 (Coverage Report Generator)
│   │           └─→ TASK-009 (Integration Validation)
│   └─→ TASK-005 (JSDoc Extractor)
│       └─→ TASK-006 (Documentation Aggregator)
└─→ TASK-009 (Integration Validation via CLI path validation and generated outputs)
```

The critical dependency chain is:
TASK-001 → TASK-003 → TASK-004 → TASK-006 → TASK-007/TASK-008 → TASK-009
with TASK-005 running in parallel after TASK-003 and feeding TASK-006.

## 5. Implementation Sequence (Critical Path)

Sequential order for a single developer:

1. TASK-001 — Project Setup & Configuration (1.5 hours)
2. TASK-002 — CLI Orchestrator (1.5 hours)
3. TASK-003 — File Discovery Service (2.5 hours)
4. TASK-004 — Endpoint Discovery Analyzer (6 hours) — highest-risk and critical path task
5. TASK-005 — JSDoc Metadata Extractor (3 hours)
6. TASK-006 — Documentation Aggregator (3 hours)
7. TASK-007 — Markdown Generator (2.5 hours)
8. TASK-008 — Coverage Report Generator (2.5 hours)
9. TASK-009 — End-to-End Integration Validation (2.5 hours)

Total estimated time: 25 hours.

Parallelization opportunity: after TASK-003, TASK-004 and TASK-005 can proceed independently; their outputs converge in TASK-006 before output generation begins. Output generation tasks (TASK-007 and TASK-008) may be developed in parallel once TASK-006 is complete, but the final integration task still waits for both outputs and CLI behavior.

## 6. Critical Path & Risk Areas

Critical Path: Setup → File Discovery → Endpoint Analyzer → Aggregator → Markdown + JSON report → Integration validation.

Highest-risk / longest tasks:
- TASK-004 (Endpoint Discovery Analyzer, L): AST parsing, supported route pattern enforcement, and malformed-file handling are the most complex and highest-risk items because they directly determine whether endpoint totals are correct and resilient.
- TASK-008 (Coverage Report Generator, M): the design review explicitly calls out the need to define a valid per-endpoint gap structure and coverage formula; this must be nailed down before implementation to avoid inconsistent reporting.
- TASK-006 (Documentation Aggregator, M): this is the integration point between route inventory and documentation metadata; a weak contract here will produce incorrect `documented` vs. `partial` vs. `missing` classifications.

Risks and mitigation aligned to the design review:
- Parser dependency risk: resolve with a pinned AST library selection in TASK-001 and keep parse failures non-fatal under TASK-004.
- Per-endpoint gap schema risk: define the JSON report contract in TASK-006/TASK-008 before serializing the report; preserve the required aggregate fields while adding stable gap metadata.
- Unsupported route risk: document static route limitations in TASK-004 and warn on dynamic/computed patterns instead of failing the run.
- Secret sanitization risk: require redaction checks in both TASK-007 and TASK-008 as acceptance criteria to avoid writing sensitive-looking values from JSDoc into generated files.
- File-system error semantics: define unreadable nested paths as warnings with path-level context in TASK-003 so the scan remains resilient but transparent.

## 7. Effort Summary

| Category | Hours | % |
|----------|-------|---|
| Foundation & Setup | 5.5 | 22% |
| Core Processing (Discovery, Analysis, Extraction, Aggregation) | 12.0 | 48% |
| Output Generation | 5.0 | 20% |
| Testing & Integration | 2.5 | 10% |
| Total | 25.0 | 100% |

This summary reflects the approved dependency order and the user-confirmed size bands. The largest share of time is intentionally in the processing pipeline due to AST route analysis and aggregation logic.

## 8. Approval Checklist

- [ ] Task breakdown matches the approved seven-component architecture and the user-selected granularity.
- [ ] Project setup is a separate task, as requested.
- [ ] Each component has a dedicated implementation task with unit tests included in the task acceptance criteria.
- [ ] Final integration validation remains separate and runs after the output generators are complete.
- [ ] Dependencies follow strict order and no task starts before its prerequisites are complete.
- [ ] Phase grouping follows the required order: Foundation → Processing → Output → Testing.
- [ ] Effort estimates respect the confirmed size definitions (S <2h, M 2–4h, L 4–8h).
- [ ] AST parser choice, report-gap schema, secret sanitization policy, and unreadable-file handling are explicitly addressed in the plan.
- [ ] The plan reflects the design review’s approved recommendations and known Phase 1 limitations.
- [ ] Ready to proceed to implementation.

---

**Plan Created:** 2026-10-05  
**Next Step:** Proceed to implementation with the approved task order and acceptance criteria.

