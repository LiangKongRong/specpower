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

### Requirement: <!-- requirement name -->
<!-- requirement text using SHALL/MUST -->

#### Scenario: <!-- scenario name -->
- **WHEN** <!-- condition -->
- **THEN** <!-- expected outcome -->

## MODIFIED Requirements

<!-- Include the FULL updated requirement block (not just the diff).
     The requirement name must match the existing spec exactly. -->

### Requirement: <!-- existing requirement name -->
<!-- full updated requirement text -->

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
