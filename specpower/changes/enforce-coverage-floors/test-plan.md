# test-plan: enforce-coverage-floors

## Capability: coverage-attribution

### Requirement: overall branch coverage gate → Scenario: aggregate above threshold passes

- **Case** T1: aggregate 89% passes 75% threshold [positive]
  - Input: `coverage-attribution --overall --threshold 75` on specpower's own lcov (89% aggregate)
  - Expected: exit 0, `PASS — overall branch coverage 89% >= 75% threshold`
  - it(): overall aggregate above threshold passes [enforce-coverage-floors-T1]
  - covers: src/core/coverage-attribution.ts

### Requirement: overall branch coverage gate → Scenario: aggregate below threshold fails [negative]

- **Case** T2: aggregate 50% fails 75% threshold [negative]
  - Input: `coverage-attribution --overall --threshold 75` on a 50% aggregate lcov fixture
  - Expected: exit non-zero, `FAIL — overall branch coverage 50% < 75% threshold`
  - it(): overall aggregate below threshold fails [enforce-coverage-floors-T2]
  - branch: overall-below-threshold
  - covers: src/core/coverage-attribution.ts

### Requirement: overall branch coverage gate → Scenario: untested module pulls aggregate below threshold fails [negative]

- **Case** T3: zero-coverage module pulls aggregate below threshold [negative]
  - Input: `--overall --threshold 75` on a report with one 0%-coverage module and no compensation
  - Expected: exit non-zero (a4adapter-style whole-module-zero-tests caught)
  - it(): untested module pulls aggregate below threshold [enforce-coverage-floors-T3]
  - branch: untested-module-aggregate
  - covers: src/core/coverage-attribution.ts

### Requirement: overall branch coverage gate → Scenario: missing coverage report fails [negative]

- **Case** T4: no coverage report found fails [negative]
  - Input: `coverage-attribution --overall` with no report at default paths or --report
  - Expected: exit non-zero, message to run coverage command first
  - it(): missing coverage report fails [enforce-coverage-floors-T4]
  - branch: missing-report
  - covers: src/cli/commands/coverage-attribution.ts

### Requirement: overall branch coverage gate → Scenario: invalid threshold rejected [negative]

- **Case** T5: invalid threshold value rejected [negative]
  - Input: `--threshold abc` (or `-1`, `101`)
  - Expected: exit non-zero, threshold invalid
  - it(): invalid threshold rejected [enforce-coverage-floors-T5]
  - branch: invalid-threshold
  - covers: src/cli/commands/coverage-attribution.ts

### Requirement: per-Scenario branch coverage attribution → Scenario: one scenario below threshold fails the change [negative]

- **Case** T6: one scenario at 50% fails the change (no majority leniency) [negative]
  - Input: `coverage-attribution <change> --threshold 75` with 1/3 scenarios at 50%, others 90%
  - Expected: exit non-zero, that scenario `[FAIL]`
  - it(): one scenario below threshold fails change [enforce-coverage-floors-T6]
  - branch: per-scenario-below-threshold
  - covers: src/core/coverage-attribution.ts

### Requirement: per-Scenario branch coverage attribution → Scenario: scenario with no covers fails [negative]

- **Case** T7: testable scenario with no covers: fails [negative]
  - Input: a Scenario whose Cases have no `covers:`
  - Expected: `no covers:` with `branch n/a`, counts as below-threshold (FAIL)
  - it(): no covers fails scenario [enforce-coverage-floors-T7]
  - branch: no-covers-fail
  - covers: src/core/coverage-attribution.ts

### Requirement: coverage report format support → Scenario: lcov zero-hit branch counted as uncovered [negative]

- **Case** T8: lcov BRDA 4th field '0' counted as uncovered [negative]
  - Input: lcov with `BRDA:...,0` (v8 format, reachable-but-unexecuted)
  - Expected: that branch counted as NOT hit (0 and - both uncovered)
  - it(): lcov zero-hit branch uncovered [enforce-coverage-floors-T8]
  - branch: lcov-zero-uncovered
  - covers: src/core/coverage-attribution.ts

### Requirement: overall branch coverage gate → Scenario: low-coverage file masked by high-coverage files is surfaced

- **Case** T15: masked 0% file surfaced in lowFiles [positive]
  - Input: `--overall --threshold 40` on a report where aggregate passes but one file is 0%
  - Expected: PASS for aggregate, but that file listed in `lowFiles`
  - it(): masked file surfaced in lowFiles [enforce-coverage-floors-T15]
  - covers: src/core/coverage-attribution.ts

### Requirement: overall branch coverage gate → Scenario: lowFiles list truncated when many files below threshold

- **Case** T32: lowFiles truncated to 20 with more indicator [positive]
  - Input: `--overall` on a report with >20 files below threshold
  - Expected: prints first 20 lowFiles + `... and N more` line
  - it(): lowFiles truncated to 20 [enforce-coverage-floors-T32]
  - covers: src/cli/commands/coverage-attribution.ts

### Requirement: per-Scenario branch coverage attribution → Scenario: all scenarios above threshold pass

- **Case** T16: all scenarios above threshold pass [positive]
  - Input: `coverage-attribution <change> --threshold 75` with every Scenario's covers: files ≥75%
  - Expected: exit 0, each Scenario `[PASS]` with attributed %
  - it(): all scenarios above threshold pass [enforce-coverage-floors-T16]
  - covers: src/core/coverage-attribution.ts

### Requirement: per-Scenario branch coverage attribution → Scenario: covers path absent from report contributes zero

- **Case** T17: absent covers path contributes zero [negative]
  - Input: a Case's `covers:` points to a file with no entry in the coverage report
  - Expected: that file contributes 0%, Scenario's attributed minimum drops
  - it(): absent covers path contributes zero [enforce-coverage-floors-T17]
  - branch: absent-covers-zero
  - covers: src/core/coverage-attribution.ts

### Requirement: per-Scenario branch coverage attribution → Scenario: backslash covers path normalized to forward slashes

- **Case** T18: backslash covers path normalized [positive]
  - Input: `covers: src\cli\init.ts` (Windows backslashes), lcov `SF:src/cli/init.ts`
  - Expected: normalized to forward slashes, file's branch coverage attributed
  - it(): backslash covers normalized [enforce-coverage-floors-T18]
  - covers: src/core/coverage-attribution.ts

### Requirement: per-Scenario branch coverage attribution → Scenario: threshold overridable per invocation

- **Case** T19: custom threshold 60 used [positive]
  - Input: `--threshold 60` for a pure-function module
  - Expected: CLI uses 60 as threshold instead of default 75
  - it(): custom threshold used [enforce-coverage-floors-T19]
  - covers: src/cli/commands/coverage-attribution.ts

### Requirement: coverage report format support → Scenario: lcov report parsed for branch coverage

- **Case** T20: lcov report parsed [positive]
  - Input: report is `coverage/lcov.info`
  - Expected: CLI counts `BRDA` lines per `SF` record, computes hit/total per file
  - it(): lcov report parsed [enforce-coverage-floors-T20]
  - covers: src/core/coverage-attribution.ts

### Requirement: coverage report format support → Scenario: jacoco report parsed for branch coverage

- **Case** T21: jacoco report parsed [positive]
  - Input: report is `target/site/jacoco/jacoco.xml`
  - Expected: CLI sums `<counter type="BRANCH">` per `<class filename>`, computes covered/(covered+missed)
  - it(): jacoco report parsed [enforce-coverage-floors-T21]
  - covers: src/core/coverage-attribution.ts

### Requirement: coverage report format support → Scenario: stale or malformed coverage report fails

- **Case** T29: stale malformed report fails [negative]
  - Input: `coverage-attribution --overall` on an empty/truncated/malformed lcov (e.g. half-written from aborted run)
  - Expected: exit non-zero with underlying read/parse error (no silent 0% / false PASS from partial data)
  - it(): stale malformed report fails [enforce-coverage-floors-T29]
  - branch: stale-malformed-report
  - covers: src/core/coverage-attribution.ts

### Requirement: per-Scenario branch coverage attribution → Scenario: change with empty test-plan (zero cases) reports no scenarios

- **Case** T30: empty test-plan reports no scenarios [negative]
  - Input: `coverage-attribution <change>` on a change whose test-plan.md exists but has zero Cases
  - Expected: `No Scenarios with Cases found in test-plan.md.`, exit 0 (no fabrication)
  - it(): empty test-plan reports no scenarios [enforce-coverage-floors-T30]
  - branch: empty-test-plan-no-scenarios
  - covers: src/cli/commands/coverage-attribution.ts

## Capability: test-planning

### Requirement: scenario→Case coverage → Scenario: fully-covered change passes validation

- **Case** T22: fully-covered change passes [positive]
  - Input: `specpower validate` on a change where every Scenario has a Case, every [testable] Requirement has ≥1 [negative] scenario + ≥30% distinct-branch ratio
  - Expected: valid, zero errors, zero warnings
  - it(): fully-covered change passes [enforce-coverage-floors-T22]
  - covers: src/cli/commands/validate.ts

### Requirement: scenario→Case coverage → Scenario: uncovered scenario fails validation (fail)

- **Case** T23: uncovered scenario fails [negative]
  - Input: `specpower validate` on a change where a Scenario has no Case
  - Expected: invalid, reports the uncovered Scenario
  - it(): uncovered scenario fails [enforce-coverage-floors-T23]
  - branch: uncovered-scenario-fail
  - covers: src/core/validation/test-plan-coverage.ts

### Requirement: scenario→Case coverage → Scenario: mislabeled-negative boundary Case (wrong) is a review item, not auto-rejected

- **Case** T24: mislabeled boundary case is review item not error [positive]
  - Input: a Case marked `[negative]` but input is a legitimate boundary value the contract accepts
  - Expected: validator does not auto-reject; flagged as refine/review item
  - it(): mislabeled boundary is review item [enforce-coverage-floors-T24]
  - covers: src/core/validation/validator.ts

### Requirement: scenario→Case coverage → Scenario: testable requirement with all boundary scenarios mislabeled as negative is a review item, not auto-rejected

- **Case** T31: testable requirement all-boundary-mislabeled is review item [positive]
  - Input: a `[testable]` Requirement whose `[negative]` scenarios are legitimate boundary values mislabeled to satisfy the structural floor
  - Expected: validator does not auto-reject; flagged as refine/review item (floor checks count + branch distinctness, not semantic negativity)
  - it(): testable all-boundary-mislabeled review item [enforce-coverage-floors-T31]
  - covers: src/core/validation/validator.ts

### Requirement: scenario→Case coverage → Scenario: testable requirement with no negative scenario fails validation (fail) [negative]

- **Case** T9: testable requirement missing [negative] scenario fails [negative]
  - Input: `specpower validate` on a spec with `[testable]` requirement, zero `[negative]` scenarios
  - Expected: validation error naming the requirement (structural, not keyword-guess)
  - it(): testable requirement no negative fails [enforce-coverage-floors-T9]
  - branch: testable-no-negative
  - covers: src/core/validation/validator.ts

### Requirement: scenario→Case coverage → Scenario: requirement below 30 percent negative ratio fails validation (missing) [negative]

- **Case** T10: distinct-branch ratio below 30% fails low-negative-ratio [negative]
  - Input: `specpower validate` on a [testable] requirement with 1 distinct branch / 4 total cases (25%)
  - Expected: `low-negative-ratio` error naming requirement and ratio
  - it(): low negative ratio fails [enforce-coverage-floors-T10]
  - branch: low-negative-ratio
  - covers: src/core/validation/test-plan-coverage.ts

### Requirement: scenario→Case coverage → Scenario: negative cases sharing a branch tag report duplicate-branch (fail) [negative]

- **Case** T11: shared branch tag reports duplicate-branch [negative]
  - Input: two [negative] Cases sharing `branch: validate-null`
  - Expected: `duplicate-branch` naming cases + shared branch; only one counts toward ratio
  - it(): duplicate branch reported [enforce-coverage-floors-T11]
  - branch: duplicate-branch-report
  - covers: src/core/validation/test-plan-coverage.ts

### Requirement: scenario→Case coverage → Scenario: negative case without branch tag warns missing-branch-tag [negative]

- **Case** T12: untagged negative case warns missing-branch-tag [negative]
  - Input: a `[negative]` Case with no `branch:` tag
  - Expected: `missing-branch-tag` warning (not error); Case counted individually
  - it(): missing branch tag warns [enforce-coverage-floors-T12]
  - branch: missing-branch-tag-warn
  - covers: src/core/validation/test-plan-coverage.ts

### Requirement: validation integration → Scenario: testable change lacking test-plan fails verify Pass 4 (fail) [negative]

- **Case** T13: testable change no test-plan fails Pass 4 [negative]
  - Input: verify Pass 4 on a testable change (≥1 delta Scenario) with no `test-plan.md`
  - Expected: Pass 4 FAILs naming the change (not a warning)
  - it(): testable change no test-plan fails pass4 [enforce-coverage-floors-T13]
  - branch: pass4-no-testplan-fail
  - covers: src/cli/commands/validate.ts

### Requirement: validation integration → Scenario: verify Pass 5 fails a scenario below 75% branch coverage (fail) [negative]

- **Case** T14: Pass 5 scenario at 50% fails change [negative]
  - Input: verify Pass 5 on a Scenario attributed at 50% (below 75%)
  - Expected: change FAILs Pass 5 (no majority leniency)
  - it(): pass5 below threshold fails [enforce-coverage-floors-T14]
  - branch: pass5-below-threshold
  - covers: src/cli/commands/coverage-attribution.ts

### Requirement: validation integration → Scenario: compliant test-plan passes validation

- **Case** T25: compliant test-plan passes validation [positive]
  - Input: `specpower validate <spec>` on a spec whose test-plan covers all Scenarios, has required [negative] cases, meets 30% distinct-branch ratio
  - Expected: valid, zero errors, zero warnings
  - it(): compliant test-plan passes [enforce-coverage-floors-T25]
  - covers: src/cli/commands/validate.ts

### Requirement: validation integration → Scenario: coverage gap fails validation (fail)

- **Case** T26: coverage gap fails validation [negative]
  - Input: `specpower validate <spec>` where some Scenario has no Case in test-plan
  - Expected: invalid, reports the uncovered Scenario
  - it(): coverage gap fails [enforce-coverage-floors-T26]
  - branch: coverage-gap-fail
  - covers: src/core/validation/test-plan-coverage.ts

### Requirement: validation integration → Scenario: build Phase B runs validate and fails on low-negative-ratio (fail) [negative]

- **Case** T27: build B2b fails on low-negative-ratio [negative]
  - Input: build Phase B B2b runs `specpower validate`, validation reports `low-negative-ratio` or `missing-negative`
  - Expected: task FAILED, returns to B2a
  - it(): build b2b fails on low-negative-ratio [enforce-coverage-floors-T27]
  - branch: b2b-low-negative-fail
  - covers: src/core/validation/test-plan-coverage.ts

### Requirement: validation integration → Scenario: strict mode upgrades missing-file warning

- **Case** T28: strict mode upgrades missing-file to error [negative]
  - Input: `specpower validate --strict` on a spec belonging to a testable change lacking test-plan.md
  - Expected: missing-file reported as error (not warning)
  - it(): strict upgrades missing-file [enforce-coverage-floors-T28]
  - branch: strict-missing-file-error
  - covers: src/cli/commands/validate.ts
