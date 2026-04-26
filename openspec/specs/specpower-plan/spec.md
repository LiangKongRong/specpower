# specpower-plan Specification

## Purpose
TBD - created by archiving change create-specpower-plugin. Update Purpose after archive.
## Requirements
### Requirement: Requirements planning with baseline awareness
The system SHALL generate structured requirements (proposal.md + specs/) for a user-described change, referencing the existing specs baseline to identify affected behaviors.

#### Scenario: Plan with existing baseline
- **WHEN** user runs `/specpower:plan "add user export feature"` and `openspec/specs/` exists
- **THEN** system creates `openspec/changes/<change-name>/` with proposal.md and specs/**/*.md, listing affected existing specs

#### Scenario: Plan without baseline
- **WHEN** user runs `/specpower:plan` and `openspec/specs/` does not exist
- **THEN** system SHALL suggest running `/specpower:scan` first

### Requirement: Proposal generation following OpenSpec schema
The system SHALL generate proposal.md containing Why, What Changes, Capabilities, and Impact sections per the OpenSpec proposal instruction.

#### Scenario: Proposal content structure
- **WHEN** proposal.md is generated
- **THEN** it SHALL contain: motivation (Why), specific changes list (What Changes), new/modified capabilities with kebab-case identifiers (Capabilities), and affected systems (Impact)

### Requirement: Delta specs generation
The system SHALL generate delta spec files for each capability listed in the proposal, using ADDED/MODIFIED/REMOVED/RENAMED sections with WHEN/THEN scenarios.

#### Scenario: Spec file creation
- **WHEN** proposal lists new capability `user-export`
- **THEN** system creates `specs/user-export/spec.md` with ADDED Requirements section containing at least one scenario per requirement

#### Scenario: User approval gate
- **WHEN** proposal generation completes
- **THEN** system SHALL pause for user confirmation that the proposal direction is correct before proceeding

