## Why

The `test-planning` baseline spec encodes an *old* contract: failure-admitting is detected by a keyword heuristic, the test-plan-missing case is a warning, and there is no `[testable]`/`[negative]`/`branch:`/`covers:` contract and no measured branch-coverage gate. The recent `feat(coverage)` + `feat(validation)` change already shipped the *new* mechanism (explicit `[testable]`/`[negative]` markers, distinct-`branch:` negative-ratio floor at 30%, `covers:` + `coverage-attribution` CLI measuring a 75% branch gate), but the baseline spec that governs **projects developed with specpower** was never updated. So projects developed under specpower still see the old (weaker, advisory) contract, and a4adapter-style "spec present, tests absent / branches uncovered" gaps are not contractually blocked. This change updates the `test-planning` baseline to make the 30%-exception and 75%-branch floors a tested Requirement for developed code.

## What Changes

- Update the `test-planning` baseline spec to encode the new contract:
  - A Requirement that has runtime-assertable behavior SHALL be marked `[testable]`; a `[testable]` Requirement SHALL have ≥1 `[negative]` scenario (structural, validated as an error — replaces the keyword heuristic).
  - The negative-case floor is a measured **30% distinct-`branch:` ratio** (not a presence-only check); `low-negative-ratio` is a validation error; `duplicate-branch` flags shared-branch padding; `missing-branch-tag` warns untagged negative Cases.
  - A `[negative]` Case SHALL carry a `branch:` tag and a `covers:` (product files) field; `specpower coverage-attribution <change> --threshold 75` measures per-Scenario branch coverage; `coverage-attribution --overall --threshold 75` measures the project-wide aggregate gate (applies even to legacy projects with no markers).
  - The test-plan-missing case for a testable change is a validation **error** (was a warning), enforced in build Phase B (B2b runs `specpower validate`) and verify Pass 4.
  - verify Pass 5 measures branch coverage via `coverage-attribution` (Step 0 overall baseline + Step 1 per-Scenario); a testable Scenario below 75% FAILs the change.
- Document the honest scope: the 30% floor is structural (opt-in via `[testable]`); the 75% gate is a floor not a ceiling (a low-coverage file can be masked above the aggregate, surfaced as `lowFiles`); per-Scenario attribution is file-level (needs `covers:`, not per-test instrumentation).

## Capabilities

### New Capabilities

- `coverage-attribution`: measured per-Scenario + overall branch-coverage attribution and the 75% gate (CLI + core), with its own testable spec — the mechanism projects developed with specpower rely on.

### Modified Capabilities

- `test-planning`: the `[testable]`/`[negative]`/`branch:`/`covers:` contract and the 30%-negative / 75%-branch floors become tested Requirements (was advisory + heuristic).

## Impact

- Specs: `test-planning/spec.md` MODIFIED (existing requirements updated); new `coverage-attribution/spec.md` ADDED.
- Developed-code contract: projects developed with specpower after this change MUST mark `[testable]`/`[negative]`, fill `branch:`/`covers:`, and pass the 30% + 75% gates in build/verify; legacy projects (no markers) are still covered by the `--overall` aggregate gate.
- Product code: one small fix to `validate.ts` — `validate <spec>` now filters test-plan Cases to the spec's capability (inferred from the spec path), so a multi-capability test-plan no longer reports cross-capability Cases as dangling. (The plan phase framed this as "spec-only"; refine corrected it: the multi-capability dangling gap is a contract-execution defect that must ship with this change for the contract to hold.)
- Tools: projects use the specpower CLI that includes the new validator + `coverage-attribution` (≥ this branch's build).
