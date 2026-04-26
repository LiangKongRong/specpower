## ADDED Requirements

### Requirement: Dual validation
The system SHALL perform two-level validation: delta specs acceptance and main specs regression checking.

#### Scenario: Delta specs validation
- **WHEN** user runs `/specpower:verify` on a change
- **THEN** system reads all delta specs and validates each scenario as a test case, reporting pass/fail per scenario

#### Scenario: Main specs regression check
- **WHEN** delta validation completes
- **THEN** system checks the implementation against main openspec/specs/ to detect any regression in existing requirements

### Requirement: Scope creep detection
The system SHALL detect implementation that exceeds spec scope.

#### Scenario: Scope creep flagging
- **WHEN** verification runs
- **THEN** system SHALL flag any implemented behavior not covered by either delta specs or main specs as potential scope creep
