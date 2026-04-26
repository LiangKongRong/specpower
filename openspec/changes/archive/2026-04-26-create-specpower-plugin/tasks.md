## 1. Project Foundation

- [x] 1.1 Initialize npm package with TypeScript
  - Files: `package.json`, `tsconfig.json`, `vitest.config.ts`
  - `package.json`: name `"specpower"`, type `"module"`, bin `{ "specpower": "./bin/specpower.js" }`, engines `{ "node": ">=20.19.0" }`
  - Dependencies: `commander`, `js-yaml`, `zod`, `chalk`
  - Dev dependencies: `typescript`, `vitest`, `@types/node`
  - `tsconfig.json`: target ES2022, module NodeNext, outDir `./dist`, rootDir `./src`, strict true
  - `vitest.config.ts`: minimal config with test include `['test/**/*.test.ts']`
  - Verify: `npm install && npx tsc --noEmit` exits 0

- [x] 1.2 Create directory scaffold
  - Source directories: `src/cli/commands/`, `src/core/artifact-graph/`, `src/core/parsers/`, `src/core/validation/`, `src/core/templates/`, `src/utils/`
  - Output directories: `bin/`
  - Plugin content: `skills/specpower-scan/`, `skills/specpower-plan/`, `skills/specpower-refine/`, `skills/specpower-build/`, `skills/specpower-review/`, `skills/specpower-test/`, `skills/specpower-verify/`, `skills/specpower-done/`, `skills/specpower-fix/`, `skills/specpower-snap/`
  - Prompts execution-layer: `prompts/build/`, `prompts/refine/`, `prompts/fix/`, `prompts/plan/`, `prompts/review/`, `prompts/test/`, `prompts/verify/`, `prompts/done/`, `prompts/scan/`, `prompts/snap/`
  - Prompts shared + reference: `prompts/shared/`, `prompts/reference/openspec/`, `prompts/reference/superpowers/`
  - Schema + templates: `schemas/specpower/`, `templates/`
  - Tests: `test/core/artifact-graph/`, `test/core/parsers/`, `test/core/validation/`, `test/core/templates/`, `test/cli/`, `test/utils/`, `test/integration/`, `test/fixtures/`
  - Verify: `find src test skills prompts schemas templates bin -type d | wc -l` ≥ 35

- [x] 1.3 Create CLI entry point skeleton
  - File: `bin/specpower.js` — `#!/usr/bin/env node` + `import '../dist/cli/index.js'`
  - File: `src/cli/index.ts` — Commander program, name "specpower", version read from package.json, empty command list
  - Verify: `npx tsc && node bin/specpower.js --version` outputs `3.0.0`

- [x] 1.4 Add code-review-graph as dependency
  - File: `package.json` — add `"code-review-graph"` to dependencies
  - Verify: `npm install && npm ls code-review-graph` shows installed version

## 2. Core Runtime — File System Utilities

- [x] 2.1 TEST: Write tests for file-system utilities
  - File: `test/utils/file-system.test.ts`
  - Test cases (5):
    - `directoryExists(existingDir)` returns `true`
    - `directoryExists(nonExisting)` returns `false`
    - `fileExists(existingFile)` returns `true`; `fileExists(nonExisting)` returns `false`
    - `readFile(path)` returns file content as UTF-8 string
    - `writeFile(path, content)` creates file with content, auto-creating parent dirs
    - `ensureDir(nested/path)` creates all intermediate directories
  - Verify: `npx vitest run test/utils/file-system.test.ts` → 5 tests, all FAIL (no implementation yet)

- [x] 2.2 IMPLEMENT: Port file-system utilities
  - Source: `Fission-AI/OpenSpec src/utils/file-system.ts`
  - Target: `src/utils/file-system.ts`
  - Functions to port: `directoryExists`, `fileExists`, `readFile`, `writeFile`, `ensureDir`, `canonicalizeExistingPath`
  - Replace all `openspec` namespace references with `specpower`
  - Verify: `npx vitest run test/utils/file-system.test.ts` → 5 tests, all PASS

- [x] 2.3 TEST: Write tests for change-metadata and change-utils
  - File: `test/utils/change-utils.test.ts`
  - Test cases (5):
    - `getChangeDir("my-feature")` returns `specpower/changes/my-feature/`
    - `getChangeMetadata("my-feature")` reads `.specpower.yaml`, returns `{ schema: "specpower", created: "2026-04-25" }`
    - `writeChangeMetadata("my-feature", data)` writes valid YAML parseable by js-yaml
    - `listChanges()` returns `["change-a", "change-b"]` from `specpower/changes/`
    - `listChanges()` returns `[]` when `specpower/changes/` is empty
  - Verify: `npx vitest run test/utils/change-utils.test.ts` → all FAIL

- [x] 2.4 IMPLEMENT: Port change-metadata and change-utils
  - Source: `Fission-AI/OpenSpec src/utils/change-metadata.ts` + `src/utils/change-utils.ts`
  - Target: `src/utils/change-metadata.ts`, `src/utils/change-utils.ts`
  - Key rename: `openspec/changes/` → `specpower/changes/`, `.openspec.yaml` → `.specpower.yaml`
  - Verify: `npx vitest run test/utils/change-utils.test.ts` → all PASS

- [x] 2.5 TEST: Write tests for task-progress utilities
  - File: `test/utils/task-progress.test.ts`
  - Test cases (4):
    - Parse `- [ ] 1.1 Task name` → `{ id: "1.1", status: "pending", text: "Task name" }`
    - Parse `- [x] 1.1 Task name` → `{ id: "1.1", status: "completed", text: "Task name" }`
    - `toggleTask("1.1", content)` flips `[ ]` to `[x]` in the Markdown string
    - `countTasks(content)` returns `{ total: 5, completed: 2, pending: 3 }`
  - Verify: `npx vitest run test/utils/task-progress.test.ts` → all FAIL

- [x] 2.6 IMPLEMENT: Port task-progress utilities
  - Source: `Fission-AI/OpenSpec src/utils/task-progress.ts`
  - Target: `src/utils/task-progress.ts`
  - Verify: `npx vitest run test/utils/task-progress.test.ts` → all PASS

- [x] 2.7 Create utils barrel export
  - File: `src/utils/index.ts`
  - Re-export: `file-system`, `change-metadata`, `change-utils`, `task-progress`
  - Verify: `npx tsc --noEmit` exits 0

## 3. Core Runtime — Parsers

- [x] 3.1 TEST: Write tests for Markdown delta-spec parser
  - File: `test/core/parsers/markdown-parser.test.ts`
  - Test fixtures in `test/fixtures/`:
    - `delta-added-only.md` — file with only `## ADDED Requirements` section (1 requirement, 1 scenario)
    - `delta-all-sections.md` — file with ADDED + MODIFIED + REMOVED + RENAMED sections
  - Test cases (7):
    - Parse `## ADDED Requirements` → extracts requirement blocks array
    - Parse `## MODIFIED Requirements` → extracts blocks tagged MODIFIED
    - Parse `## REMOVED Requirements` → extracts `{ name, reason, migration }`
    - Parse `## RENAMED Requirements` → extracts `{ from, to }` pairs
    - Parse `### Requirement: My Feature` → name = "My Feature"
    - Parse `#### Scenario: Happy path` with WHEN/THEN → structured scenario object
    - Parse multi-section file → all 4 section arrays populated correctly
  - Verify: `npx vitest run test/core/parsers/markdown-parser.test.ts` → 7 tests, all FAIL

- [x] 3.2 IMPLEMENT: Port Markdown delta-spec parser
  - Source: `Fission-AI/OpenSpec src/core/parsers/markdown-parser.ts`
  - Target: `src/core/parsers/markdown-parser.ts`
  - Verify: `npx vitest run test/core/parsers/markdown-parser.test.ts` → all PASS

- [x] 3.3 TEST: Write tests for requirement-blocks parser
  - File: `test/core/parsers/requirement-blocks.test.ts`
  - Test cases (3):
    - Extract requirement name from `### Requirement: User Auth` → `"User Auth"`
    - Extract full block (header through all scenarios until next `###` or `##`)
    - Multi-scenario requirement: 2 scenarios both included in block
  - Verify: `npx vitest run test/core/parsers/requirement-blocks.test.ts` → all FAIL

- [x] 3.4 IMPLEMENT: Port requirement-blocks parser
  - Source: `Fission-AI/OpenSpec src/core/parsers/requirement-blocks.ts`
  - Target: `src/core/parsers/requirement-blocks.ts`
  - Verify: `npx vitest run test/core/parsers/requirement-blocks.test.ts` → all PASS

- [x] 3.5 TEST: Write tests for change-parser and spec-structure
  - File: `test/core/parsers/change-parser.test.ts`
  - Test cases (2):
    - Parse complete delta spec file → `DeltaPlan { added: [...], modified: [...], removed: [...], renamed: [...] }`
    - Parse main spec file → structured requirements list with name, description, scenarios
  - Verify: `npx vitest run test/core/parsers/change-parser.test.ts` → all FAIL

- [x] 3.6 IMPLEMENT: Port change-parser and spec-structure
  - Source: `Fission-AI/OpenSpec src/core/parsers/change-parser.ts` + `spec-structure.ts`
  - Target: `src/core/parsers/change-parser.ts`, `src/core/parsers/spec-structure.ts`
  - Verify: `npx vitest run test/core/parsers/change-parser.test.ts` → all PASS

- [x] 3.7 Create parsers barrel export
  - File: `src/core/parsers/index.ts`
  - Re-export: `markdown-parser`, `requirement-blocks`, `change-parser`, `spec-structure`
  - Verify: `npx tsc --noEmit` exits 0

## 4. Core Runtime — Artifact Graph

- [x] 4.1 TEST: Write tests for artifact graph types and schema loader
  - File: `test/core/artifact-graph/types-and-schema.test.ts`
  - Test cases (4):
    - Zod schema validates `{ id: "proposal", generates: "proposal.md", description: "...", requires: [] }` → passes
    - Zod schema rejects `{ id: "proposal" }` (missing generates) → throws ZodError
    - `loadSchema("schemas/specpower/schema.yaml")` → returns typed `SchemaYaml` with artifacts array
    - `resolveSchema("specpower")` finds built-in schema by name
  - Verify: `npx vitest run test/core/artifact-graph/types-and-schema.test.ts` → all FAIL

- [x] 4.2 IMPLEMENT: Port artifact graph types, schema loader, resolver
  - Source: `Fission-AI/OpenSpec src/core/artifact-graph/types.ts`, `schema.ts`, `resolver.ts`
  - Target: `src/core/artifact-graph/types.ts`, `schema.ts`, `resolver.ts`
  - Key change: schema search path `schemas/specpower/` instead of `schemas/spec-driven/`
  - Verify: `npx vitest run test/core/artifact-graph/types-and-schema.test.ts` → all PASS

- [x] 4.3 TEST: Write tests for dependency graph operations
  - File: `test/core/artifact-graph/graph.test.ts`
  - Test cases (6):
    - `getBuildOrder()` → topological sort: `["proposal", "design", "specs", "tasks"]` or equivalent valid order
    - `getNextArtifacts([])` → `["proposal"]` (only root, no deps)
    - `getNextArtifacts(["proposal"])` → `["design", "specs"]` (both unblocked)
    - `getBlocked(["proposal"])` → `["tasks"]` (waiting on specs + design)
    - `isComplete(["proposal","design","specs","tasks"])` → `true`
    - Graph with cycle → throws error containing "cycle"
  - Verify: `npx vitest run test/core/artifact-graph/graph.test.ts` → all FAIL

- [x] 4.4 IMPLEMENT: Port ArtifactGraph class
  - Source: `Fission-AI/OpenSpec src/core/artifact-graph/graph.ts`
  - Target: `src/core/artifact-graph/graph.ts`
  - Implements Kahn's algorithm for topological sort
  - Methods: `getBuildOrder()`, `getNextArtifacts(completed)`, `getBlocked(completed)`, `isComplete(completed)`, `getArtifact(id)`
  - Verify: `npx vitest run test/core/artifact-graph/graph.test.ts` → all PASS

- [x] 4.5 TEST: Write tests for artifact state tracker and instruction loader
  - File: `test/core/artifact-graph/state-and-loader.test.ts`
  - Test cases (3):
    - State tracker: given `specpower/changes/my-change/proposal.md` exists → `proposal` status = `"done"`
    - Instruction loader: loads `templates/proposal.md` + injects context from `specpower/config.yaml`
    - Output formatter: produces JSON `{ artifacts: [{ id, status, missingDeps }] }` and human-readable `[x] proposal`
  - Verify: `npx vitest run test/core/artifact-graph/state-and-loader.test.ts` → all FAIL

- [x] 4.6 IMPLEMENT: Port artifact state tracker and instruction loader
  - Source: `Fission-AI/OpenSpec src/core/artifact-graph/state.ts`, `instruction-loader.ts`, `outputs.ts`
  - Target: `src/core/artifact-graph/state.ts`, `instruction-loader.ts`, `outputs.ts`
  - Key change: file existence check paths use `specpower/changes/` not `openspec/changes/`
  - Verify: `npx vitest run test/core/artifact-graph/state-and-loader.test.ts` → all PASS

- [x] 4.7 Create artifact-graph barrel export
  - File: `src/core/artifact-graph/index.ts`
  - Re-export: `ArtifactGraph`, `loadSchema`, `resolveSchema`, types, state, outputs
  - Verify: `npx tsc --noEmit` exits 0

## 5. Core Runtime — Validation

- [x] 5.1 TEST: Write tests for spec validation
  - File: `test/core/validation/validator.test.ts`
  - Test fixtures: `test/fixtures/valid-spec.md`, `test/fixtures/invalid-spec-no-scenario.md`, `test/fixtures/invalid-spec-wrong-heading.md`
  - Test cases (8):
    - Valid spec with `### Requirement:` + `#### Scenario:` + WHEN/THEN → result.valid = true
    - Missing `### Requirement:` header → result.errors contains "missing requirement header"
    - Scenario using `###` instead of `####` → error "incorrect heading level for scenario"
    - Requirement with zero scenarios → error "requirement has no scenarios"
    - Scenario missing WHEN → error "scenario missing WHEN clause"
    - Scenario missing THEN → error "scenario missing THEN clause"
    - REMOVED section missing Reason field → error
    - RENAMED section missing FROM/TO → error
  - Verify: `npx vitest run test/core/validation/validator.test.ts` → 8 tests, all FAIL

- [x] 5.2 IMPLEMENT: Port validator
  - Source: `Fission-AI/OpenSpec src/core/validation/validator.ts`, `constants.ts`, `types.ts`
  - Target: `src/core/validation/validator.ts`, `constants.ts`, `types.ts`
  - Verify: `npx vitest run test/core/validation/validator.test.ts` → all PASS

## 6. Core Runtime — Specs Apply & Archive

- [x] 6.1 Create test fixture files for delta merge
  - Directory: `test/fixtures/`
  - Files:
    - `main-spec.md` — 3 requirements (User Login, User Logout, Password Reset) each with 1 scenario
    - `delta-added.md` — `## ADDED Requirements` with 1 new requirement (Email Export)
    - `delta-modified.md` — `## MODIFIED Requirements` with updated User Login (changed THEN clause)
    - `delta-removed.md` — `## REMOVED Requirements` with Password Reset removal (reason + migration)
    - `delta-renamed.md` — `## RENAMED Requirements` FROM: User Logout TO: Session Logout
    - `delta-combined.md` — all 4 operations in one file
  - Verify: `ls test/fixtures/delta-*.md | wc -l` = 5; `ls test/fixtures/main-spec.md` exists

- [x] 6.2 TEST: Write tests for delta spec merge
  - File: `test/core/specs-apply.test.ts`
  - Test cases (6):
    - Apply ADDED → main spec now has 4 requirements (original 3 + Email Export)
    - Apply MODIFIED → User Login requirement text replaced with new THEN clause
    - Apply REMOVED → main spec has 2 requirements (Password Reset gone)
    - Apply RENAMED → "User Logout" header becomes "Session Logout", content preserved
    - Apply combined → 3 requirements remain (1 original + 1 added + 1 modified; 1 removed; 1 renamed)
    - MODIFIED with non-matching name → throws error containing "not found"
  - Verify: `npx vitest run test/core/specs-apply.test.ts` → 6 tests, all FAIL

- [x] 6.3 IMPLEMENT: Port specs-apply
  - Source: `Fission-AI/OpenSpec src/core/specs-apply.ts`
  - Target: `src/core/specs-apply.ts`
  - Verify: `npx vitest run test/core/specs-apply.test.ts` → all PASS

- [x] 6.4 TEST: Write tests for archive workflow
  - File: `test/core/archive.test.ts`
  - Test cases (4):
    - Archive validates delta specs before applying (calls validator)
    - Archive applies deltas to main specs via specs-apply module
    - Archive moves change dir to `specpower/changes/archive/2026-04-25-my-change/`
    - Archive fails with error if delta spec validation fails (does not move directory)
  - Verify: `npx vitest run test/core/archive.test.ts` → all FAIL

- [x] 6.5 IMPLEMENT: Port archive
  - Source: `Fission-AI/OpenSpec src/core/archive.ts`
  - Target: `src/core/archive.ts`
  - Key change: archive path `specpower/changes/archive/` not `openspec/changes/archive/`
  - Verify: `npx vitest run test/core/archive.test.ts` → all PASS

## 7. Core Runtime — Templates & Schema

- [x] 7.1 TEST: Write tests for template system
  - File: `test/core/templates/templates.test.ts`
  - Test cases (2):
    - `loadTemplate("proposal")` reads `templates/proposal.md` → returns Markdown string containing `## Why`
    - `loadTemplate("nonexistent")` → throws error containing "not found"
  - Verify: `npx vitest run test/core/templates/templates.test.ts` → all FAIL

- [x] 7.2 IMPLEMENT: Port template system
  - Source: `Fission-AI/OpenSpec src/core/templates/index.ts`, `types.ts`
  - Target: `src/core/templates/index.ts`, `types.ts`
  - Verify: `npx vitest run test/core/templates/templates.test.ts` → all PASS

- [x] 7.3 Create specpower schema.yaml
  - File: `schemas/specpower/schema.yaml`
  - Content: name `specpower`, version 3, artifacts: scan (requires []), proposal (requires []), specs (requires [proposal]), design (requires [proposal]), tasks (requires [specs, design])
  - Apply phase: requires [tasks], tracks `tasks.md`, instruction references Superpowers TDD execution
  - Verify: schema loads without error in existing types-and-schema test → `npx vitest run test/core/artifact-graph/types-and-schema.test.ts` still PASS

- [x] 7.4 Copy 4 OpenSpec templates
  - Source: `Fission-AI/OpenSpec schemas/spec-driven/templates/proposal.md` → `templates/proposal.md`
  - Source: `Fission-AI/OpenSpec schemas/spec-driven/templates/spec.md` → `templates/spec.md`
  - Source: `Fission-AI/OpenSpec schemas/spec-driven/templates/design.md` → `templates/design.md`
  - Source: `Fission-AI/OpenSpec schemas/spec-driven/templates/tasks.md` → `templates/tasks.md`
  - Verify: `ls templates/*.md | wc -l` = 4

## 8. CLI Commands — Core

- [x] 8.1 TEST: Write tests for `specpower change new`
  - File: `test/cli/change-new.test.ts`
  - Test cases (4):
    - `specpower change new my-feature` → creates `specpower/changes/my-feature/` with `.specpower.yaml`
    - `.specpower.yaml` contains `schema: specpower` and `created: YYYY-MM-DD`
    - Duplicate name → exit code 1, stderr contains "already exists"
    - Invalid name `"has spaces"` → exit code 1, stderr contains "invalid"
  - Verify: `npx vitest run test/cli/change-new.test.ts` → all FAIL

- [x] 8.2 IMPLEMENT: specpower change new
  - File: `src/cli/commands/change-new.ts`
  - Register: `program.command("change").command("new <name>")`
  - Uses: `writeChangeMetadata`, `ensureDir` from utils
  - Verify: `npx vitest run test/cli/change-new.test.ts` → all PASS

- [x] 8.3 TEST: Write tests for `specpower change status`
  - File: `test/cli/change-status.test.ts`
  - Test cases (3):
    - JSON output: `{ changeName, artifacts: [{ id, status, missingDeps? }], isComplete }`
    - Human-readable output: `[x] proposal`, `[ ] design`, etc.
    - Non-existing change → exit code 1
  - Verify: `npx vitest run test/cli/change-status.test.ts` → all FAIL

- [x] 8.4 IMPLEMENT: specpower change status
  - File: `src/cli/commands/change-status.ts`
  - Register: `program.command("change").command("status <name>")`, option `--json`
  - Uses: `ArtifactGraph`, `getArtifactState`, `formatOutput`
  - Verify: `npx vitest run test/cli/change-status.test.ts` → all PASS

- [x] 8.5 TEST: Write tests for `specpower change archive`
  - File: `test/cli/change-archive.test.ts`
  - Test cases (3):
    - Archive success: delta merged → change moved to `specpower/changes/archive/`
    - Validation failure → exit code 1, change NOT moved
    - Non-existing change → exit code 1
  - Verify: `npx vitest run test/cli/change-archive.test.ts` → all FAIL

- [x] 8.6 IMPLEMENT: specpower change archive
  - File: `src/cli/commands/change-archive.ts`
  - Uses: `archive()` from `src/core/archive.ts`
  - Verify: `npx vitest run test/cli/change-archive.test.ts` → all PASS

- [x] 8.7 TEST: Write tests for `specpower instructions`
  - File: `test/cli/instructions.test.ts`
  - Test cases (2):
    - `specpower instructions proposal --change my-feature --json` → JSON with `template`, `context`, `rules`, `dependencies`, `outputPath`
    - Blocked artifact → `missingDeps` array non-empty in JSON output
  - Verify: `npx vitest run test/cli/instructions.test.ts` → all FAIL

- [x] 8.8 IMPLEMENT: specpower instructions
  - File: `src/cli/commands/instructions.ts`
  - Uses: `loadInstructions` from artifact-graph instruction-loader
  - Verify: `npx vitest run test/cli/instructions.test.ts` → all PASS

- [x] 8.9 TEST: Write tests for `specpower validate`
  - File: `test/cli/validate.test.ts`
  - Test cases (2):
    - Valid spec file → exit code 0, stdout contains "valid"
    - Invalid spec file → exit code 1, stderr lists errors with line numbers
  - Verify: `npx vitest run test/cli/validate.test.ts` → all FAIL

- [x] 8.10 IMPLEMENT: specpower validate
  - File: `src/cli/commands/validate.ts`
  - Uses: `Validator` from `src/core/validation/`
  - Verify: `npx vitest run test/cli/validate.test.ts` → all PASS

## 9. CLI Commands — Scan

- [x] 9.1 TEST: Write tests for `specpower scan`
  - File: `test/cli/scan.test.ts`
  - Test cases (3):
    - Invokes code-review-graph, captures output (mock for test)
    - Converts analysis → creates `specpower/specs/` with spec files + `specpower/config.yaml`
    - `--module auth` flag → scoped scan of auth module only
  - Verify: `npx vitest run test/cli/scan.test.ts` → all FAIL

- [x] 9.2 IMPLEMENT: specpower scan
  - File: `src/cli/commands/scan.ts`
  - Register: `program.command("scan")`, option `--module <name>`
  - Uses: code-review-graph API, spec file generation, config.yaml generation
  - Verify: `npx vitest run test/cli/scan.test.ts` → all PASS

## 10. Extract OpenSpec Instructions as Reference

- [x] 10.1 Extract proposal instruction
  - Source: `Fission-AI/OpenSpec schemas/spec-driven/schema.yaml` → `artifacts[id=proposal].instruction` field
  - Target: `prompts/reference/openspec/proposal-instruction.md`
  - Verify: file exists, contains "Create the proposal document that establishes WHY"

- [x] 10.2 Extract specs instruction
  - Source: schema.yaml → `artifacts[id=specs].instruction`
  - Target: `prompts/reference/openspec/specs-instruction.md`
  - Verify: file exists, contains "Create specification files that define WHAT"

- [x] 10.3 Extract design instruction
  - Source: schema.yaml → `artifacts[id=design].instruction`
  - Target: `prompts/reference/openspec/design-instruction.md`
  - Verify: file exists, contains "Create the design document that explains HOW"

- [x] 10.4 Extract tasks instruction
  - Source: schema.yaml → `artifacts[id=tasks].instruction`
  - Target: `prompts/reference/openspec/tasks-instruction.md`
  - Verify: file exists, contains "Create the task list that breaks down"

- [x] 10.5 Extract apply instruction
  - Source: schema.yaml → `apply.instruction`
  - Target: `prompts/reference/openspec/apply-instruction.md`
  - Verify: file exists

## 11. Extract & Rewrite Superpowers — Command-level Prompts

Global rewrite rules for all tasks in this phase:
- `"brainstorming skill"` / `"brainstorming"` → `"specpower:refine"`
- `"writing-plans skill"` → `"specpower:build Phase A"`
- `"subagent-driven development"` → `"specpower:build Phase B"`
- `"executing-plans"` → `"specpower:build Phase B (inline mode)"`
- `"test-driven-development"` → `"specpower:test"` or `"specpower:build TDD"`
- `"systematic-debugging"` → `"specpower:fix"`
- `"requesting-code-review"` → `"specpower:review"`
- `"finishing-a-development-branch"` → `"specpower:done"`
- `"verification-before-completion"` → `"specpower:verify"` or `"specpower:test verification"`
- `"docs/superpowers/specs/"` / `"docs/superpowers/plans/"` → `"specpower/changes/<change-name>/"`
- Remove all visual-companion references (V1 skip)
- Verify per file: `grep -ci "superpowers\|brainstorming skill\|writing-plans skill" <file>` = 0

- [x] 11.1 Rewrite brainstorming → `prompts/refine/brainstorm.md`
  - Source: `obra/superpowers skills/brainstorming/SKILL.md` (~164 lines)
  - Preserve: 9-step flow, hard gate ("no code until design approved"), user interaction points
  - Add at top: hard gate preamble per D11 (dual enforcement)
  - Verify: 9 `## Step` headings present; no "superpowers" or "brainstorming skill" strings

- [x] 11.2 Rewrite brainstorming reviewer → `prompts/refine/spec-document-reviewer.md`
  - Source: `obra/superpowers skills/brainstorming/spec-document-reviewer-prompt.md`
  - Verify: file exists, `grep -ci superpowers` = 0

- [x] 11.3 Rewrite writing-plans → `prompts/build/phase-a-plan.md`
  - Source: `obra/superpowers skills/writing-plans/SKILL.md` (~150 lines)
  - Preserve: task atomicity (2-5 min), no-placeholder rule, checkbox format, self-review step
  - Output path change: plans go to `specpower/changes/<name>/tasks.md` (not `docs/superpowers/plans/`)
  - Add at top: hard gate ("user must confirm plan before Phase B proceeds")
  - Verify: no stale references; "TBD" / "fill in details" prohibition text preserved

- [x] 11.4 Rewrite plan reviewer → `prompts/build/plan-document-reviewer.md`
  - Source: `obra/superpowers skills/writing-plans/plan-document-reviewer-prompt.md`
  - Verify: file exists, no stale references

- [x] 11.5 Rewrite subagent-driven-development → `prompts/build/phase-b-execute.md`
  - Source: `obra/superpowers skills/subagent-driven-development/SKILL.md` (~300 lines)
  - Rewrite internal prompt paths:
    - `"implementer-prompt.md"` → `".claude/specpower/prompts/shared/implementer-prompt.md"`
    - `"spec-reviewer-prompt.md"` → `".claude/specpower/prompts/shared/spec-reviewer-prompt.md"`
    - `"code-quality-reviewer-prompt.md"` → `".claude/specpower/prompts/shared/code-reviewer-prompt.md"`
  - Preserve: per-task workflow (implement → spec-review → code-review), sequential dispatch, controller isolation
  - Add at top: hard gate ("wait for user confirmation after each task's review")
  - Verify: per-task 3-step review logic intact; all Read paths use `.claude/specpower/prompts/` prefix

- [x] 11.6 Rewrite using-git-worktrees → `prompts/build/phase-b-worktree.md`
  - Source: `obra/superpowers skills/using-git-worktrees/SKILL.md` (~140 lines)
  - Preserve: 3-tier directory selection, .gitignore safety check, dependency install, baseline test
  - Verify: 3 directory selection tiers present; baseline test instruction present

- [x] 11.7 Rewrite test-driven-development → `prompts/build/tdd.md` (build variant)
  - Source: `obra/superpowers skills/test-driven-development/SKILL.md` (~250 lines)
  - Customize: emphasize per-task atomic TDD within build phase, reference `specpower:build` context
  - Preserve: strict RED-GREEN-REFACTOR order, "write test BEFORE implementation" mandate
  - Add at top: hard gate ("test must FAIL before writing implementation")
  - Verify: RED/GREEN/REFACTOR sections present; test-first mandate preserved

- [x] 11.8 Rewrite test-driven-development → `prompts/test/tdd.md` (standalone test variant)
  - Source: same as 11.7
  - Customize: emphasize full-suite execution, multi-level (unit/integration/E2E/regression), affected module targeting
  - Preserve: same core TDD logic
  - Verify: "unit", "integration", "E2E" mentioned; RED-GREEN-REFACTOR present

- [x] 11.9 Rewrite requesting-code-review + code-reviewer → `prompts/review/code-review.md`
  - Source: `obra/superpowers skills/requesting-code-review/SKILL.md` + `skills/requesting-code-review/code-reviewer.md`
  - Merge into single file: dispatch mechanism + review criteria + severity tiers
  - Add specPower enhancement: regression check section against main `specpower/specs/`
  - Preserve: severity tiers (Critical/Important/Minor), subagent dispatch, spec compliance
  - Verify: "Critical" / "Important" / "Minor" present; regression check section present

- [x] 11.10 Rewrite systematic-debugging → `prompts/fix/debug.md`
  - Source: `obra/superpowers skills/systematic-debugging/SKILL.md` (~250 lines)
  - Add specPower enhancement: "Read relevant specs from specpower/specs/ to understand expected behavior before debugging"
  - Preserve: 4-phase flow (investigate → pattern → hypothesis → implement), 3-fail architectural stop rule
  - Verify: 4 phase headings present; "3 attempts" stop rule present

- [x] 11.11 Rewrite verification-before-completion → `prompts/test/verification.md` (test variant)
  - Source: `obra/superpowers skills/verification-before-completion/SKILL.md` (~100 lines)
  - Customize: test command context — verify test results with actual output
  - Preserve: "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE" rule
  - Add at top: hard gate (per D11)
  - Verify: "FRESH VERIFICATION EVIDENCE" string present

- [x] 11.12 Rewrite verification-before-completion → `prompts/verify/verification.md` (verify variant)
  - Source: same as 11.11
  - Customize: verify command context — spec acceptance + regression checking + scope creep detection
  - Verify: "FRESH VERIFICATION EVIDENCE" string present; scope creep section added

- [x] 11.13 Rewrite finishing-a-development-branch → `prompts/done/branch-finish.md`
  - Source: `obra/superpowers skills/finishing-a-development-branch/SKILL.md` (~110 lines)
  - Preserve: 4 options (merge locally / push+PR / keep / discard), test gate, discard typed confirmation
  - Verify: all 4 options listed; "tests must pass" gate present

## 12. Create specPower-original Command Prompts

These prompts are NOT from Superpowers — they are specPower orchestration layers that combine OpenSpec instructions with specPower workflow logic.

- [x] 12.1 Create `prompts/plan/proposal.md`
  - Content: specPower orchestration (check baseline, identify affected specs) + embed/reference OpenSpec proposal instruction from `prompts/reference/openspec/proposal-instruction.md`
  - Hard gate at top: "user must confirm proposal direction before proceeding to specs"
  - Verify: file references `specpower/specs/` for baseline check; OpenSpec instruction content included

- [x] 12.2 Create `prompts/plan/specs.md`
  - Content: specPower orchestration (create delta specs per capability) + embed/reference OpenSpec specs instruction from `prompts/reference/openspec/specs-instruction.md`
  - Verify: file references ADDED/MODIFIED/REMOVED/RENAMED format; WHEN/THEN scenario format

- [x] 12.3 Create `prompts/refine/design-output.md`
  - Content: specPower orchestration (conflict checking against main specs) + embed/reference OpenSpec design instruction from `prompts/reference/openspec/design-instruction.md`
  - Verify: conflict detection logic present; design.md sections (Context, Goals, Decisions, Risks) referenced

- [x] 12.4 Create `prompts/build/phase-b-review.md`
  - Content: two-phase review routing — spec compliance first (Read `prompts/shared/spec-reviewer-prompt.md`), then code quality (Read `prompts/shared/code-reviewer-prompt.md`). Results summary + user confirmation prompt.
  - Hard gate: "spec compliance must pass before code quality review"
  - Verify: two-phase sequence documented; Read paths correct

## 13. Extract & Rewrite Superpowers — Shared Prompts

- [x] 13.1 Rewrite implementer-prompt → `prompts/shared/implementer-prompt.md`
  - Source: `obra/superpowers skills/subagent-driven-development/implementer-prompt.md`
  - Rewrite: all skill name and path references
  - Verify: no "superpowers" strings; implementation guidance preserved

- [x] 13.2 Rewrite spec-reviewer-prompt → `prompts/shared/spec-reviewer-prompt.md`
  - Source: `obra/superpowers skills/subagent-driven-development/spec-reviewer-prompt.md`
  - Verify: spec compliance criteria preserved

- [x] 13.3 Rewrite code-quality-reviewer-prompt → `prompts/shared/code-reviewer-prompt.md`
  - Source: `obra/superpowers skills/subagent-driven-development/code-quality-reviewer-prompt.md`
  - Verify: code quality criteria preserved

- [x] 13.4 Rewrite dispatching-parallel-agents → `prompts/shared/dispatching-parallel-agents.md`
  - Source: `obra/superpowers skills/dispatching-parallel-agents/SKILL.md`
  - Verify: when-to-use / not-for criteria preserved

- [x] 13.5 Rewrite executing-plans → `prompts/shared/executing-plans.md`
  - Source: `obra/superpowers skills/executing-plans/SKILL.md`
  - Verify: 3-phase workflow (load → execute → complete) preserved; stop triggers list preserved

- [x] 13.6 Rewrite receiving-code-review → `prompts/shared/receiving-code-review.md`
  - Source: `obra/superpowers skills/receiving-code-review/SKILL.md`
  - Verify: 5-step response cycle preserved; pushback authority rules preserved

## 14. Copy Superpowers Reference Materials

- [x] 14.1 Copy using-superpowers → `prompts/reference/superpowers/using-superpowers.md`
  - Source: `obra/superpowers skills/using-superpowers/SKILL.md`
  - Copy as-is (reference only)

- [x] 14.2 Copy writing-skills → `prompts/reference/superpowers/writing-skills.md`
  - Source: `obra/superpowers skills/writing-skills/SKILL.md` (~22KB)
  - Copy as-is

- [x] 14.3 Copy anthropic-best-practices.md (~45KB)
  - Source: `obra/superpowers skills/writing-skills/anthropic-best-practices.md`
  - Target: `prompts/reference/superpowers/anthropic-best-practices.md`

- [x] 14.4 Copy testing-anti-patterns.md
  - Source: `obra/superpowers skills/test-driven-development/testing-anti-patterns.md`
  - Target: `prompts/reference/superpowers/testing-anti-patterns.md`

- [x] 14.5 Copy systematic-debugging reference files (5 files)
  - `condition-based-waiting.md`, `condition-based-waiting-example.ts`, `defense-in-depth.md`, `root-cause-tracing.md`, `find-polluter.sh`
  - Source dir: `obra/superpowers skills/systematic-debugging/`
  - Target: `prompts/reference/superpowers/`
  - Verify: `ls prompts/reference/superpowers/ | wc -l` ≥ 10

- [x] 14.6 Copy writing-skills reference files (3 files)
  - `persuasion-principles.md`, `graphviz-conventions.dot`, `testing-skills-with-subagents.md`
  - Source dir: `obra/superpowers skills/writing-skills/`
  - Target: `prompts/reference/superpowers/`

## 15. Create SKILL.md Orchestrators

Each orchestrator: 50-100 lines max, YAML frontmatter + numbered stages with Read instructions + hard gates at orchestrator level (D11) + user confirmation gates.

- [x] 15.1 Create `skills/specpower-scan/SKILL.md`
  - Frontmatter: `name: specpower-scan`, `description: "Brownfield project scanner via code-review-graph"`
  - Stages: run `specpower scan` CLI → present SCAN_REPORT.md → user confirms/edits → lock baseline
  - For `--module`: Read `.claude/specpower/prompts/shared/dispatching-parallel-agents.md`
  - Hard gate: "user must confirm scan results before they become Source of Truth"
  - Verify: file ≤ 100 lines; all Read paths exist

- [x] 15.2 Create `skills/specpower-plan/SKILL.md`
  - Stages: check `specpower/specs/` exists (suggest scan if not) → `specpower change new <name>` → Read `.claude/specpower/prompts/plan/proposal.md` → generate proposal.md → user confirms → Read `.claude/specpower/prompts/plan/specs.md` → generate delta specs
  - Hard gate: "user must confirm proposal before specs generation"
  - Verify: file ≤ 100 lines

- [x] 15.3 Create `skills/specpower-refine/SKILL.md`
  - Stages: read proposal + specs → Read `.claude/specpower/prompts/refine/brainstorm.md` → interactive exploration → Read `.claude/specpower/prompts/refine/design-output.md` → generate design.md → user confirms
  - Hard gate: "no implementation or scaffolding until design confirmed"
  - Verify: file ≤ 100 lines

- [x] 15.4 Create `skills/specpower-build/SKILL.md`
  - Most complex orchestrator.
  - Phase A: Read `.claude/specpower/prompts/build/phase-a-plan.md` → generate tasks.md → user confirms
  - Phase B: Read `.claude/specpower/prompts/build/phase-b-worktree.md` → setup worktree → for each task: Read `.claude/specpower/prompts/build/phase-b-execute.md` → TDD execute → Read `.claude/specpower/prompts/build/phase-b-review.md` → present review → user confirms
  - Hard gates: "plan must be confirmed before execution"; "each task must pass review + user confirm before next"
  - Verify: file ≤ 120 lines; all Read paths exist; both hard gates documented

- [x] 15.5 Create `skills/specpower-review/SKILL.md`
  - Stages: Read `.claude/specpower/prompts/review/code-review.md` → dispatch reviewer → severity triage → if Critical: block merge, enter fix-review loop
  - Verify: file ≤ 80 lines

- [x] 15.6 Create `skills/specpower-test/SKILL.md`
  - Stages: detect affected modules → Read `.claude/specpower/prompts/test/tdd.md` → execute tests → Read `.claude/specpower/prompts/test/verification.md` → report with evidence
  - On failure: Read `.claude/specpower/prompts/fix/debug.md`
  - Hard gate: "no 'should work' claims — verification evidence required"
  - Verify: file ≤ 80 lines

- [x] 15.7 Create `skills/specpower-verify/SKILL.md`
  - Stages: `specpower validate` CLI → Read `.claude/specpower/prompts/verify/verification.md` → delta acceptance → regression check → scope creep check → report
  - Verify: file ≤ 80 lines

- [x] 15.8 Create `skills/specpower-done/SKILL.md`
  - Stages: run tests (gate) → `specpower change archive` CLI → Read `.claude/specpower/prompts/done/branch-finish.md` → present 4 options → execute user choice
  - Hard gate: "tests must pass before archive options"
  - Verify: file ≤ 80 lines

- [x] 15.9 Create `skills/specpower-fix/SKILL.md`
  - Stages: `specpower change new fix-<desc>` → locate specs → Read `.claude/specpower/prompts/fix/debug.md` → diagnose → Read `.claude/specpower/prompts/build/tdd.md` → TDD fix → Read `.claude/specpower/prompts/review/code-review.md` → review → run tests → `specpower change archive`
  - `--urgent` flag: skip review step, add `⚠️ URGENT` marker to change, generate review TODO
  - Verify: file ≤ 100 lines; `--urgent` handling documented

- [x] 15.10 Create `skills/specpower-snap/SKILL.md`
  - Stages: `git diff` + `git log` analysis → generate change with all tasks ✅ → infer delta specs → user confirms → `specpower change archive`
  - Verify: file ≤ 80 lines

## 16. Implement specpower init Command

- [x] 16.1 TEST: Write tests for specpower init
  - File: `test/cli/init.test.ts`
  - Test in temp directory, test cases (8):
    - Creates `specpower/`, `specpower/changes/`, `specpower/specs/`
    - Creates `specpower/config.yaml` with schema reference
    - Creates `.claude/skills/specpower-*/SKILL.md` (10 files)
    - Creates `.claude/commands/specpower/` with command aliases (10 files)
    - Copies prompts to `.claude/specpower/prompts/` (all subdirs: build, refine, fix, plan, review, test, verify, done, scan, snap, shared, reference)
    - Copies schemas to `.claude/specpower/schemas/specpower/schema.yaml`
    - Copies templates to `.claude/specpower/templates/` (4 .md files)
    - Re-running init → prints "already initialized", does NOT overwrite existing files
  - Verify: `npx vitest run test/cli/init.test.ts` → 8 tests, all FAIL

- [x] 16.2 IMPLEMENT: specpower init
  - File: `src/cli/commands/init.ts`
  - Register: `program.command("init")`
  - Logic:
    - Create `specpower/` directory structure
    - Copy `skills/specpower-*/SKILL.md` → `.claude/skills/specpower-*/SKILL.md`
    - Generate command alias files → `.claude/commands/specpower/<cmd>.md`
    - Copy `prompts/**` → `.claude/specpower/prompts/**`
    - Copy `schemas/**` → `.claude/specpower/schemas/**`
    - Copy `templates/**` → `.claude/specpower/templates/**`
    - Generate `specpower/config.yaml` with project context placeholders
    - Detect project type (package.json/go.mod/Cargo.toml) for config hints
  - Verify: `npx vitest run test/cli/init.test.ts` → all PASS

## 17. Integration Tests

- [x] 17.1 Integration test: full change lifecycle
  - File: `test/integration/change-lifecycle.test.ts`
  - Steps:
    - `specpower change new "test-feature"` → dir created
    - Write proposal.md → `specpower change status "test-feature" --json` shows proposal `done`
    - Write specs/, design.md, tasks.md → status shows all `done`
    - `specpower change archive "test-feature"` → delta specs merged into `specpower/specs/`, change moved to `specpower/changes/archive/`
  - Verify: `npx vitest run test/integration/change-lifecycle.test.ts` → PASS

- [x] 17.2 Integration test: delta merge round-trip
  - File: `test/integration/delta-merge.test.ts`
  - Steps:
    - Seed `specpower/specs/auth/spec.md` with 3 requirements
    - Create change with delta: ADDED (1), MODIFIED (1), REMOVED (1)
    - Archive
    - Assert: main spec has 3 requirements (1 original + 1 added + 1 modified; 1 removed)
    - Assert: archived change in `specpower/changes/archive/`
  - Verify: `npx vitest run test/integration/delta-merge.test.ts` → PASS

- [x] 17.3 Integration test: progressive loading paths
  - File: `test/integration/prompt-paths.test.ts`
  - Logic: for each SKILL.md in `skills/`, regex-extract all `.claude/specpower/prompts/...` paths → assert each file exists in `prompts/`
  - Verify: `npx vitest run test/integration/prompt-paths.test.ts` → PASS

- [x] 17.4 Verify npm package build and install
  - Steps:
    - `npm run build` → exits 0, `dist/` dir created
    - `npm pack` → creates `specpower-3.0.0.tgz`
    - Install in temp dir: `npm install -g ./specpower-3.0.0.tgz` → `specpower --version` outputs `3.0.0`
    - `specpower init` in temp dir → creates expected file structure
    - Count: 10 SKILL.md files, 10 command files, ≥ 20 prompt files, 4 templates, 1 schema
  - Verify: all steps exit 0

## 18. Documentation

- [x] 18.1 Create README.md
  - Sections: Overview, Installation (`npm install -g specpower && specpower init`), Quick Start (scan→plan→refine→build→done), Command Reference Card (all 10 commands), Architecture (CLI + SKILL.md + prompts diagram), Prompt Directory Map, License (MIT)
  - Verify: all 10 `/specpower:*` commands listed; install command present

- [x] 18.2 Create CONTRIBUTING.md
  - Sections: Project Structure Map, How to Update Prompts (with rewrite rules), How to Port Upstream Changes (from OpenSpec/Superpowers), Running Tests (`npx vitest`), Source Attribution Convention (`<!-- SOURCE: ... -->`)
  - Verify: file exists
