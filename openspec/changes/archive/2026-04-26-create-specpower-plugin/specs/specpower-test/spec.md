## ADDED Requirements

### Requirement: Multi-level test execution
The system SHALL execute tests at four levels: unit, integration, E2E, and regression.

#### Scenario: Full test suite
- **WHEN** user runs `/specpower:test`
- **THEN** system executes unit tests, integration tests, E2E tests, and regression tests in sequence, reporting results per level

#### Scenario: Targeted testing with scan baseline
- **WHEN** a scan baseline exists
- **THEN** system SHALL identify affected modules from the change's delta specs and target test execution to those modules first

### Requirement: Test failure handling
The system SHALL activate systematic debugging workflow on test failures.

#### Scenario: Failure triggers debugging
- **WHEN** any test level fails
- **THEN** system reports the failure details and activates the systematic-debugging workflow to investigate root cause

### Requirement: Verification before completion
The system SHALL provide fresh verification evidence before claiming test success — no "should work" or "probably passes" allowed.

#### Scenario: Evidence-based claims
- **WHEN** tests complete
- **THEN** system SHALL show actual command output with exit codes, not summarized or assumed results
