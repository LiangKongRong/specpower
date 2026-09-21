---
name: specpower-verify
description: "Dual validation -- delta specs + main specs regression"
---

# SpecPower: Verify

## Prerequisites

- An active change must exist with delta specs and implementation.
- `specpower` CLI must be available on PATH.
- Main specs in `specpower/specs/` are optional: if present, regression is verified against them; if absent (greenfield project that has not archived any change yet), Pass 2 is explicitly skipped (see Stage 2 Pass 2 below). Never silently pass Pass 2 when the directory is missing — always report `skipped (no baseline)` so a main-specs deletion in a brownfield project cannot hide behind a green verify.

## Stage 1: CLI Validation

Run `specpower validate` to perform structural validation of specs.

If validation fails, report errors and stop. The user must fix spec issues before proceeding.

## Stage 2: Verification

Read the file at `.claude/specpower/prompts/verify/verification.md` and follow its instructions.

Perform three verification passes:

### Pass 1: Delta Acceptance
Verify that the implementation satisfies all delta specs in the active change.
Check each spec scenario against actual behavior.

### Pass 2: Regression
Verify that existing main specs still pass.
Flag any regressions introduced by the change.

**Baseline-aware execution:**
- Check whether `specpower/specs/` exists AND contains at least one `*.md` file under any capability subdirectory.
- **If baseline present** — load every main spec, walk each `### Requirement:` and `#### Scenario:`, and verify the implementation still satisfies it. Report pass/fail per spec with concrete evidence (test output, code inspection).
- **If baseline absent** — do NOT implicitly pass. Emit the exact line `Pass 2: skipped (no baseline — greenfield project or no archived changes yet)` and move on to Pass 3. The explicit marker prevents a deleted/moved `specpower/specs/` in a brownfield project from silently hiding real regressions.

### Pass 3: Scope Creep
Check that the implementation does not introduce behavior beyond what the delta specs describe.
Flag any undocumented changes.

### Pass 4: Test-plan coverage

**Testability triage (do this first):** determine whether the change is *testable*.
- The change is **testable** if it has ≥1 delta Scenario (a `#### Scenario:` under any `### Requirement:` in `specs/**/*.md`), OR any regression Case against existing main specs.
- The change is **non-testable** only if it is purely docs/asset/scaffold with no behavioral Scenario at all (e.g. a README-only change, a template/skill prompt edit, a release-version bump).

**Hard gate — testable change MUST have a test-plan.md.**
- **If testable AND `specpower/changes/<name>/test-plan.md` is missing → FAIL** with the exact reason: `test-plan.md missing for testable change <name> (run /specpower:plan Stage 5b or create test-plan.md before verify)`. Do NOT proceed to the Case→test check. A testable change with no test plan is a coverage hole — this is the gate that prevents a4adapter-style "spec present, tests absent" gaps.
- **If non-testable AND no test-plan.md → PASS 4 with marker** `Pass 4: skipped (non-testable change — no delta Scenario)`. Emit the marker verbatim so the skip is visible, not inferred.
- **If a test-plan.md exists → run the two-step Case→test check below.**

Two-step Case→test coverage check (run when a test-plan.md exists):

**Step 1 — omission (reliable, fails hard):** for each Case in `specpower/changes/<name>/test-plan.md`, scan the project's test files (`*.test.*` / `*.spec.*`) for its token `[<changeName>-<id>]`. Any Case whose token is absent → **FAIL** naming the Case (no-omission). Reliable because the token is globally unique and stable.

**Step 2 — Semantic match (deep, fails on mismatch):** for each located `it()`, read the test code and verify its semantics match the Case's definition in `test-plan.md`:
- (a) the test calls the function-under-test with the Case's `Input`;
- (b) the test asserts the Case's `Expected` outcome (e.g., Case `Expected: throw /Unknown tool/` ↔ test `.toThrow(/Unknown tool/)`; Case `Expected: return 42` ↔ test `.toBe(42)` or `=== 42`).
- **FAIL** if the test asserts a *different* outcome than the Case's `Expected` (semantics mismatch — the test does not verify what the plan says it should).
- **WARN** (not fail) only when you genuinely cannot determine the correspondence (e.g., complex setup, framework-specific idiom, the `it()` body is too indirect to map). State what you could not determine.
- You ARE judging semantic correspondence here — that is the point of Step 2. Step 1 proved the test exists; Step 2 proves it tests the *right thing*. An `it()` that exercises a different input or asserts a different expectation than the Case is a coverage lie and must FAIL.

### Pass 5: Per-Scenario branch coverage attribution

Pass 5 attributes **measured** branch coverage back to each Scenario, so a change cannot ship with a test-plan that passes the structural checks (Pass 4) yet leaves the exercised code's branches uncovered. This is the measured counterpart to Pass 4's structural Case→test check.

**Step 0 — Overall branch coverage baseline (run FIRST):**
Run `specpower coverage-attribution --overall --threshold 75` (after a fresh `npm run test:cov` / `mvn test jacoco:report`). This computes the project-wide **aggregate** branch coverage (hit/total branches across all files) and exits non-zero if below threshold. This is the standard coverage gate — it applies to **legacy projects with no `[testable]`/`covers:` annotations at all** (e.g. a4adapter), unlike per-Scenario attribution which needs `covers:`. A whole module with zero tests pulls the aggregate down and FAILs here. It also prints files below threshold (`lowFiles`) so a reviewer sees low-coverage files even when high-coverage files mask them above the aggregate.

```bash
npm run test:cov        # or: mvn test jacoco:report  (fresh re-run)
specpower coverage-attribution --overall --threshold 75
```

**Overall is a floor, not a ceiling.** A PASS here means the project-wide aggregate ≥ threshold — it does NOT prove every Scenario's branches are covered (a low-coverage file can be masked by high-coverage files, surfaced as `lowFiles` but not failed). Per-Scenario attribution (below) is the precise complement; run both. If the project has no `covers:` annotations (legacy), Step 0 is the only measurable gate — per-Scenario attribution reports `no covers:` for every Scenario and FAILs, so for legacy projects rely on Step 0 + the structural Pass 4.

**Step 1 — Per-Scenario attribution (run AFTER Step 0, for projects with `covers:`):**
Run `specpower coverage-attribution <change-name> --threshold 75`. This CLI reads the change's `test-plan.md` (Cases with `covers:` fields) and a coverage report (`coverage/lcov.info` for JS/TS v8/istanbul, or `target/site/jacoco/jacoco.xml` for Java; override with `--report`), attributes file-level branch coverage to each Scenario via its Cases' `covers:` union (a Scenario's attributed % = the minimum branch-coverage % across its `covers:` files), and exits non-zero if any testable Scenario is below the threshold. Options: `--threshold <n>` (default 75), `--report <path>`.

```bash
specpower coverage-attribution <change-name> --threshold 75
```

The CLI output lists per-Scenario `[PASS]`/`[FAIL]` with attributed branch % and the `covers:` file breakdown. A non-zero exit code = Pass 5 FAIL. Use the CLI output as the Pass 5 evidence in the Stage 3 report — do not hand-compute BRDA.

**Prerequisite — a coverage report must exist (fresh).** Run the project's coverage command in this verification pass (do not reuse a stale report). If no coverage tool is configured → the CLI reports "No coverage report found" → **FAIL** Pass 5 with: `Pass 5: cannot measure — no coverage tool configured (configure v8/istanbul/jacoco; Pass 5 measures branch coverage)`.

**Coverage report formats the CLI supports:**
- JS/TS (vitest v8 or istanbul): `coverage/lcov.info`. v8/istanbul lcov lists branches as `BRDA:<line>,<block>,<branch>,<hitCount>` (a `hitCount` of `-` = uncovered) under each `SF:<file>` record; there is no `BRH`/`BRF` summary, so the CLI counts per file: hit = `BRDA` 4th field ≠ `-`, total = all `BRDA` lines for that `SF`. (If `coverage-final.json` exists, lcov is still preferred for branch data.)
- Java (jacoco): `target/site/jacoco/jacoco.xml` (per-class `<counter type="BRANCH" missed=".." covered="..">`; the CLI aggregates per source file; branch % = covered / (covered+missed)).

**Attribution rule (what the CLI computes):** group Cases by `scenarioRef` (Scenario); for each Scenario, take the union of `covers:` paths across its Cases; read each `covers:` file's branch-coverage % from the report; the Scenario's attributed branch coverage = the **minimum** % across its `covers:` files (a Scenario is only as covered as its least-covered file). A Case with no `covers:` contributes no file. A `covers:` path absent from the report → contributes **0%**.

**Hard gate (configurable threshold):** a testable change FAILS Pass 5 if **any** testable Scenario is below the threshold. Concretely, a Scenario is below threshold when either (a) its attributed branch coverage < threshold, or (b) it has no `covers:` on any Case and thus cannot be attributed (`no covers:` counts as below-threshold, NOT a harmless WARN — without `covers:` there is no evidence the Scenario's branches are covered). Default threshold is **75%**. Override per-project in `specpower/config.yaml` under `verify.branchCoverageThreshold` (e.g. a pure-function module may set 60%) — pass it to the CLI as `--threshold <n>`. One Scenario below threshold → the whole change FAILS Pass 5 (no "majority passes" leniency); the CLI exits non-zero.

**Honest scope of Pass 5:**
- Pass 5 measures **file-level branch coverage attributed to Scenarios via `covers:`** — it is real measured coverage, not a proxy. But it does NOT attribute individual branches to individual Scenarios (that needs per-test coverage instrumentation, not provided by default v8/jacoco). A Scenario attributed 75% means "the product files this Scenario's tests exercise have ≥75% of their branches covered" — some of those branches may be exercised by other Scenarios' tests too. This is the honest attribution granularity achievable without per-test instrumentation.
- If you need per-Scenario (not per-file) attribution, that requires per-test coverage runs (e.g. one coverage run per test file) — out of Pass 5's default scope; flag it to the user as a known limitation.

## Stage 3: Report

Present a consolidated verification report:
- Delta acceptance: pass/fail per spec
- Regression: pass/fail summary, or `skipped (no baseline)` when applicable
- Scope creep: any findings
- Test-plan coverage (Pass 4): structural Case→test check result
- Per-Scenario branch coverage (Pass 5): per-Scenario attributed branch % vs threshold (75% default), and any FAILs below threshold
- Overall verdict: PASS or FAIL with reasons

A `skipped` Pass 2 MUST appear verbatim in the report — do not fold it into the "pass" summary. The user needs to see that regression coverage was absent, not inferred as clean.
