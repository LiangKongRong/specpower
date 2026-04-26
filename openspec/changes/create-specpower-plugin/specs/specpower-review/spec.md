## ADDED Requirements

### Requirement: Spec-aware code review
The system SHALL perform code review that checks both code quality and regression against main openspec/specs/ baseline.

#### Scenario: Review with regression checking
- **WHEN** user runs `/specpower:review` on a change
- **THEN** system dispatches a code reviewer subagent that evaluates code quality AND checks for regressions against main specs

#### Scenario: Severity-based triage
- **WHEN** review findings are generated
- **THEN** each finding SHALL be classified as Critical (blocks merge), Warning (should fix), or Info (minor improvement)

#### Scenario: Critical issue blocking
- **WHEN** a Critical finding is identified
- **THEN** system SHALL block merge and enter a fix-review loop until the critical issue is resolved

### Requirement: Delta specs compliance
The system SHALL verify that implemented code matches the delta specs defined in the change.

#### Scenario: Spec compliance check
- **WHEN** review runs
- **THEN** system checks each delta spec scenario against the implemented behavior and reports compliance status
