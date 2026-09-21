# coverage-attribution

## ADDED Requirements

### Requirement: overall branch coverage gate [testable]

`specpower coverage-attribution --overall --threshold <n>` SHALL compute the project-wide aggregate branch coverage (hit/total branches across all files in the coverage report, NOT an average of per-file percentages) and exit non-zero when the aggregate is below the threshold. The gate SHALL apply to any project with a coverage report, including legacy projects with no `[testable]`/`[negative]`/`covers:` annotations — so a whole untested module pulling the aggregate down FAILs regardless of annotation opt-in. The default threshold SHALL be 75.

The CLI SHALL read a coverage report at `coverage/lcov.info` (JS/TS v8/istanbul) or `target/site/jacoco/jacoco.xml` (Java), overridable with `--report <path>`. For lcov, a branch is hit when the `BRDA` 4th field is neither `-` (unreachable) nor `0` (reachable but unexecuted); for jacoco, branch % = covered / (covered + missed) summed per source file.

The CLI SHALL surface `lowFiles` — files below the threshold — even when the aggregate passes, so a reviewer sees low-coverage files masked by higher-coverage files.

#### Scenario: aggregate above threshold passes

- **WHEN** `coverage-attribution --overall --threshold 75` runs on a report whose aggregate branch coverage is 89% (890/995 branches hit)
- **THEN** the CLI exits 0 and reports `PASS — overall branch coverage 89% >= 75% threshold`

#### Scenario: aggregate below threshold fails [negative]

- **WHEN** `coverage-attribution --overall --threshold 75` runs on a report whose aggregate is 50%
- **THEN** the CLI exits non-zero and reports `FAIL — overall branch coverage 50% < 75% threshold`

#### Scenario: untested module pulls aggregate below threshold fails [negative]

- **WHEN** a project has one module with 0% branch coverage and no other modules to compensate, and `--overall --threshold 75` runs
- **THEN** the aggregate is below 75% and the CLI exits non-zero (the gate catches a4adapter-style whole-module-zero-tests)

#### Scenario: low-coverage file masked by high-coverage files is surfaced

- **WHEN** the aggregate passes threshold but one file is at 0% (masked above the aggregate)
- **THEN** the CLI reports PASS for the aggregate AND lists that file in `lowFiles` so the reviewer sees the masking

#### Scenario: lowFiles list truncated when many files below threshold

- **WHEN** more than 20 files are below the threshold (a large project with widespread low coverage)
- **THEN** the CLI prints the first 20 `lowFiles` and a `... and N more` line, so the output stays readable while signaling that more masked files exist

#### Scenario: missing coverage report fails [negative]

- **WHEN** `coverage-attribution --overall` runs and no coverage report is found at the default paths or via `--report`
- **THEN** the CLI exits non-zero with a message telling the user to run the project's coverage command first

#### Scenario: invalid threshold rejected [negative]

- **WHEN** `--threshold` is not a number in 0-100 (e.g. `abc`, `-1`, `101`)
- **THEN** the CLI exits non-zero and reports the threshold invalid

### Requirement: per-Scenario branch coverage attribution [testable]

`specpower coverage-attribution <change-name> --threshold <n>` SHALL attribute file-level branch coverage to each Scenario in the change's `test-plan.md` via its Cases' `covers:` fields. A Scenario's attributed branch coverage SHALL be the MINIMUM branch-coverage percentage across the union of `covers:` files its Cases declare (a Scenario is only as covered as its least-covered file). The CLI SHALL exit non-zero if ANY testable Scenario is below the threshold. The default threshold SHALL be 75.

A Scenario with no `covers:` on any Case SHALL count as below-threshold (`no covers:` — `covers:` is required for testable Cases, not an optional warning), because without `covers:` there is no evidence the Scenario's branches are covered. A `covers:` path absent from the coverage report SHALL contribute 0%.

#### Scenario: all scenarios above threshold pass

- **WHEN** every testable Scenario's `covers:` files have branch coverage ≥ 75%
- **THEN** the CLI exits 0 and reports each Scenario `[PASS]` with its attributed percentage

#### Scenario: one scenario below threshold fails the change [negative]

- **WHEN** one of three Scenarios is at 50% branch coverage (below 75%) and the other two are at 90%
- **THEN** the CLI exits non-zero and reports that Scenario `[FAIL]`; there is no "majority passes" leniency

#### Scenario: scenario with no covers fails [negative]

- **WHEN** a testable Scenario has no `covers:` on any of its Cases
- **THEN** the CLI reports `no covers:` for that Scenario with `branch n/a` and counts it as below-threshold (FAIL)

#### Scenario: covers path absent from report contributes zero [negative]

- **WHEN** a Case's `covers:` points to a file with no entry in the coverage report (not exercised at all)
- **THEN** that file contributes 0% and the Scenario's attributed minimum drops accordingly

#### Scenario: backslash covers path normalized to forward slashes

- **WHEN** a Case declares `covers: src\cli\init.ts` (Windows backslashes) and the lcov `SF:` is `src/cli/init.ts`
- **THEN** the CLI normalizes both to forward slashes and attributes the file's branch coverage to the Scenario

#### Scenario: threshold overridable per invocation

- **WHEN** `--threshold 60` is passed for a pure-function module
- **THEN** the CLI uses 60 as the threshold instead of the default 75

### Requirement: coverage report format support [testable]

The CLI SHALL support two coverage report formats: lcov.info (JS/TS v8/istanbul) and jacoco.xml (Java). The format SHALL be auto-detected by extension/content. For lcov, branches are counted from `BRDA` lines per `SF` record (no `BRH`/`BRF` summary exists). For jacoco, branches are summed from per-class `<counter type="BRANCH" missed covered>` aggregated per source file.

#### Scenario: lcov report parsed for branch coverage

- **WHEN** the report is `coverage/lcov.info`
- **THEN** the CLI counts `BRDA` lines per `SF` record and computes hit/total per file

#### Scenario: jacoco report parsed for branch coverage

- **WHEN** the report is `target/site/jacoco/jacoco.xml`
- **THEN** the CLI sums `<counter type="BRANCH" missed covered>` per `<class filename>` and computes covered/(covered+missed) per source file

#### Scenario: lcov zero-hit branch counted as uncovered [negative]

- **WHEN** a `BRDA` line's 4th field is `0` (reachable but unexecuted, the v8 lcov format)
- **THEN** the CLI counts that branch as NOT hit (treating `0` and `-` both as uncovered)

#### Scenario: stale or malformed coverage report fails [negative]

- **WHEN** the coverage report at the resolved path is empty, truncated, or not a valid lcov/jacoco document (e.g. a half-written report from a concurrent/aborted coverage run)
- **THEN** the CLI exits non-zero with the underlying read/parse error (it does not silently report 0% or a false PASS from partial data); the CLI does not promise to classify the malformation, only to fail loudly rather than fabricate coverage figures from a bad report

#### Scenario: change with empty test-plan (zero cases) reports no scenarios [negative]

- **WHEN** `coverage-attribution <change>` runs on a change whose `test-plan.md` exists but contains zero Cases (empty or header-only)
- **THEN** the CLI reports `No Scenarios with Cases found in test-plan.md.` and exits 0 (no Scenario to attribute), surfacing the empty plan rather than fabricating coverage figures
