## ADDED Requirements

### Requirement: Technical deepening via brainstorming
The system SHALL conduct a structured brainstorming workflow (from Superpowers) to explore technical approaches, then output design.md following OpenSpec's design instruction.

#### Scenario: Brainstorming activation
- **WHEN** user runs `/specpower:refine` on an active change with proposal.md and specs/
- **THEN** system reads proposal + specs + main specs, activates the brainstorming 9-step process, and interacts with user to explore approaches

#### Scenario: Design output with conflict detection
- **WHEN** brainstorming completes with user approval
- **THEN** system generates design.md and checks for conflicts between the change's delta specs and main openspec/specs/

### Requirement: Multi-approach exploration
The system SHALL propose 2-3 technical approaches with trade-offs and a recommendation before asking the user to choose.

#### Scenario: Approach presentation
- **WHEN** brainstorming reaches the proposal step
- **THEN** system presents at least 2 approaches with pros/cons and a recommended option

#### Scenario: User approval gate
- **WHEN** technical design is drafted
- **THEN** system SHALL NOT proceed until user confirms all technical details are correct
