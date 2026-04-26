## MODIFIED Requirements

### Requirement: Dual validation
The system SHALL perform two-level validation: delta specs acceptance (Pass 1) and main specs regression checking (Pass 2). Pass 2 MUST be baseline-aware — when `specpower/specs/` is absent or empty, the system MUST explicitly mark Pass 2 as `skipped (no baseline)` rather than silently passing.

#### Scenario: Delta specs validation
- **WHEN** user runs `/specpower:verify` on a change
- **THEN** system reads all delta specs and validates each scenario as a test case, reporting pass/fail per scenario

#### Scenario: Main specs regression check with baseline present
- **WHEN** Pass 1 completes and `specpower/specs/` exists AND contains at least one `*.md` file under any capability subdirectory
- **THEN** system SHALL load every main spec, walk each `### Requirement:` and `#### Scenario:`, and verify the implementation still satisfies it, reporting pass/fail per spec with concrete evidence (test output or code inspection)

#### Scenario: Main specs regression check with no baseline
- **WHEN** Pass 1 completes and `specpower/specs/` is absent OR contains zero `*.md` files
- **THEN** system SHALL NOT silently pass Pass 2; it SHALL emit the exact literal string `Pass 2: skipped (no baseline — greenfield project or no archived changes yet)` and continue to Pass 3

## ADDED Requirements

### Requirement: Baseline-aware verdict reporting
The Stage 3 consolidated report MUST surface the baseline status of Pass 2 so `skipped` never hides under the "passed" umbrella.

#### Scenario: Skipped Pass 2 in report
- **WHEN** Pass 2 was skipped due to missing baseline
- **THEN** the Stage 3 report SHALL include the `skipped (no baseline)` line verbatim in the Regression entry, separate from any pass/fail summary; the overall verdict SHALL NOT claim "all passes green" when regression was skipped — it SHALL explicitly note that regression coverage was absent

#### Scenario: Skipped Pass 2 not foldable into pass count
- **WHEN** a reader of the verdict sees a summary like "Delta acceptance: 5/5 pass, Regression: ...",
- **THEN** the Regression field SHALL distinguish `skipped (no baseline)` from `N/N pass`; a `skipped` Pass 2 MUST NOT be counted toward the numerator or denominator of a pass ratio

### Requirement: Prerequisite tolerance for baseline absence
The verify skill's Prerequisites section SHALL treat `specpower/specs/` as optional, because a fresh project (no archived changes yet) is a legitimate state in which verify still runs usefully for Pass 1 and Pass 3.

#### Scenario: Fresh project verify run
- **WHEN** a user runs `/specpower:verify` on a change in a project that has no archived changes yet (`specpower/specs/` directory does not exist)
- **THEN** verify SHALL NOT abort or error on the prerequisites check; Pass 1 and Pass 3 SHALL run normally and Pass 2 SHALL emit the `skipped (no baseline)` marker
