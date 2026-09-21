# test-planning

## MODIFIED Requirements

### Requirement: scenario→Case coverage
Every Scenario in the change's delta specs SHALL have at least one Case in `test-plan.md`. A Requirement that has runtime-assertable behavior (a function return, CLI exit code, emitted message, state transition, or rejected error) SHALL be marked `[testable]` in its heading by the author; a `[testable]` Requirement SHALL have at least one `[negative]` scenario in its delta spec (a structural validation error, replacing the prior keyword heuristic that missed Requirements whose author did not write an error scenario). Legitimate boundary values the contract accepts (empty collection, extremes, large input) SHALL be classified as `[positive]`, not labeled `[negative]`.

The negative-case floor SHALL be a measured **30% distinct-`branch:` ratio** per `[testable]` Requirement, where the ratio counts DISTINCT error branches (via `branch:` tags on `[negative]` Cases), not raw Case count — so a Requirement with one error branch cannot pad its ratio by adding multiple `[negative]` Cases that all test that same branch. A `[testable]` Requirement below 30% SHALL fail validation with `low-negative-ratio`. Two `[negative]` Cases sharing the same `branch:` tag SHALL report `duplicate-branch` (the reviewer sees the padding trace). A `[negative]` Case with no `branch:` tag SHALL be counted individually (legacy) and report `missing-branch-tag` as a warning (the distinct-branch floor is not enforced for that Case).

A `[negative]` Case SHALL carry a `branch:` tag (a short stable id of the product error branch) and a `covers:` field (the product source file(s) the test exercises), so `specpower coverage-attribution` can attribute measured branch coverage to the Scenario and `branch:` dedup blocks ratio padding.

#### Scenario: fully-covered change passes validation
- **WHEN** every Scenario has at least one Case, every `[testable]` Requirement has at least one `[negative]` scenario and ≥30% distinct-`branch:` negative ratio
- **THEN** validation passes with no coverage errors

#### Scenario: uncovered scenario fails validation (fail)
- **WHEN** a Scenario has no Case in `test-plan.md`
- **THEN** validation fails and reports the uncovered Scenario

#### Scenario: testable requirement with no negative scenario fails validation (fail) [negative]
- **WHEN** a `[testable]` Requirement has zero `[negative]` scenarios in its delta spec
- **THEN** validation fails with a structural error naming the Requirement (not a keyword-guess warning)

#### Scenario: requirement below 30 percent negative ratio fails validation (missing) [negative]
- **WHEN** a `[testable]` Requirement's distinct-`branch:` negative ratio is below 30% (e.g. 1 error branch padded by repeated Cases, or too few error branches vs Cases)
- **THEN** validation fails with `low-negative-ratio` naming the Requirement and the ratio

#### Scenario: negative cases sharing a branch tag report duplicate-branch (fail) [negative]
- **WHEN** two or more `[negative]` Cases share the same `branch:` tag
- **THEN** validation reports `duplicate-branch` naming the Cases and the shared branch (the padding trace), and only one counts toward the distinct-branch ratio

#### Scenario: negative case without branch tag warns missing-branch-tag [negative]
- **WHEN** a `[negative]` Case has no `branch:` tag
- **THEN** validation reports `missing-branch-tag` as a warning (not an error), and the Case is counted individually (the distinct-branch floor is not enforced for it)

#### Scenario: testable requirement with all boundary scenarios mislabeled as negative is a review item, not auto-rejected
- **WHEN** a `[testable]` Requirement's `[negative]` scenarios are actually legitimate boundary values the contract accepts (empty/extreme/large valid inputs mislabeled `[negative]` to satisfy the structural floor)
- **THEN** the validator does not auto-reject (it does not judge classification semantics); the mislabeling is flagged as a `refine`/review check item, not a validation error — the structural floor only checks COUNT and `[branch:]` distinctness, not whether a `[negative]` scenario is semantically negative

#### Scenario: mislabeled-negative boundary Case (wrong) is a review item, not auto-rejected
- **WHEN** a Case is marked `[negative]` but its input is a legitimate boundary value within the contract (e.g. the function accepts an empty collection as valid input)
- **THEN** the validator shall not automatically reject (it does not judge classification semantics); misclassification is flagged as a `refine`/review check item, not a validation error

### Requirement: validation integration
When `specpower validate` validates a spec file that belongs to a change directory containing `test-plan.md`, it SHALL parse `test-plan.md` and enforce the scenario→Case coverage, the `[testable]`→`[negative]` structural floor, the 30% distinct-`branch:` ratio, and the `duplicate-branch`/`missing-branch-tag` rules. When the spec belongs to a testable change lacking `test-plan.md`, validation SHALL emit a warning; under `--strict`, that warning SHALL be upgraded to an error. `specpower build` Phase B (B2b) SHALL run `specpower validate` and treat errors (including `low-negative-ratio`, `missing-negative`, `duplicate-branch`) as task failure, so the 30% floor cannot be skipped by omitting `/specpower:verify`.

`specpower verify` Pass 4 SHALL hard-gate a testable change: a testable change lacking `test-plan.md` FAILs Pass 4 (was a warning). `specpower verify` Pass 5 SHALL measure branch coverage via `specpower coverage-attribution --overall --threshold 75` (Step 0, applies to legacy projects) followed by `coverage-attribution <change> --threshold 75` (Step 1, per-Scenario); a testable Scenario below 75% FAILs the change.

#### Scenario: compliant test-plan passes validation
- **WHEN** `specpower validate <spec>` runs on a spec whose change directory's `test-plan.md` covers all Scenarios, has the required `[negative]` cases, and meets the 30% distinct-`branch:` ratio
- **THEN** validation returns valid, with zero errors and zero warnings

#### Scenario: coverage gap fails validation (fail)
- **WHEN** `specpower validate <spec>` runs and some Scenario has no Case in the change's `test-plan.md`
- **THEN** validation returns invalid and reports the uncovered Scenario

#### Scenario: testable change lacking test-plan fails verify Pass 4 (fail) [negative]
- **WHEN** a testable change (≥1 delta Scenario) has no `test-plan.md` at verify time
- **THEN** verify Pass 4 FAILs with the exact reason naming the change (not a warning)

#### Scenario: build Phase B runs validate and fails on low-negative-ratio (fail) [negative]
- **WHEN** build Phase B B2b runs `specpower validate` on the change's spec and validation reports `low-negative-ratio` or `missing-negative`
- **THEN** the task is FAILED and returns to B2a to add the missing negative cases

#### Scenario: verify Pass 5 fails a scenario below 75% branch coverage (fail) [negative]
- **WHEN** verify Pass 5 measures a testable Scenario's attributed branch coverage at 50% (below 75%)
- **THEN** the change FAILs Pass 5 (no majority-passes leniency)

#### Scenario: strict mode upgrades missing-file warning
- **WHEN** `specpower validate --strict` runs on a spec belonging to a testable change lacking `test-plan.md`
- **THEN** the missing-file case is reported as an error rather than a warning
