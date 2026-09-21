<!--
  Delta spec template.
  Only include the sections you need. A typical new-capability spec uses only ADDED.
  A modification may use ADDED + MODIFIED. Removals need REMOVED with Reason+Migration.

  CRITICAL format rules:
  - Scenarios MUST use exactly 4 hashtags (####). Three hashtags will fail validation.
  - Scenario steps MUST use bullet dash + bold: `- **WHEN** ...` and `- **THEN** ...`.
  - Every requirement MUST have at least one scenario.
-->

## ADDED Requirements

### Requirement: <!-- requirement name --> [testable]
<!-- requirement text using SHALL/MUST.
     Append [testable] to the heading when the requirement has runtime-assertable
     scenarios (function return, CLI exit code, emitted message, state transition,
     rejected error). Pure-declarative requirements (format/style only) are left unmarked.
     [testable] requirements MUST each get a test-plan Case — it is the contract
     test-plan-draft.md and /specpower:verify Pass 4 consume. -->

#### Scenario: <!-- scenario name -->
- **WHEN** <!-- condition -->
- **THEN** <!-- expected outcome -->

<!-- TIP: Every requirement SHOULD include at least one negative scenario covering a
     contract-violating or abnormal input (error path: invalid type, null where forbidden,
     permission denied; invalid state; resource exhaustion to failure).
     Mark a negative scenario with a trailing [negative]: `#### Scenario: <name> [negative]`.
     A [testable] requirement MUST have >=1 [negative] scenario (validator errors otherwise).
     NOTE: legitimate boundary values (empty array, extreme values, large input) are
     POSITIVE scenarios if the function accepts them — do not count them as negative.
     See negative-testing-guide.md for the positive/negative distinction. -->

#### Scenario: <!-- error/boundary scenario name --> [negative]
- **WHEN** <!-- invalid/boundary/empty condition -->
- **THEN** <!-- error handling, rejection, or graceful degradation -->

## MODIFIED Requirements

<!-- Include the FULL updated requirement block (not just the diff).
     The requirement name must match the existing spec exactly. -->

### Requirement: <!-- existing requirement name -->
<!-- full updated requirement text.
     CRITICAL: the heading MUST match the existing main-spec heading EXACTLY
     (whitespace-insensitive). Do NOT add [testable] here unless the main-spec
     original already has it — archive matches requirement names by exact string.
     [testable] is added only on ADDED requirements. -->

#### Scenario: <!-- updated or new scenario name -->
- **WHEN** <!-- condition -->
- **THEN** <!-- new expected outcome -->

## REMOVED Requirements

### Requirement: <!-- requirement name -->
**Reason**: <!-- why being removed -->
**Migration**: <!-- how users should adapt -->

## RENAMED Requirements

FROM: <!-- old requirement name -->
TO: <!-- new requirement name -->
