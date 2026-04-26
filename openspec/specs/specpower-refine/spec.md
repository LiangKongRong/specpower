# specpower-refine Specification

## Purpose
TBD - created by archiving change create-specpower-plugin. Update Purpose after archive.
## Requirements
### Requirement: Technical deepening via brainstorming
The system SHALL conduct an **attacking deep review** of all plan-phase artifacts using Superpowers brainstorming 9-step flow combined with 4 explicit challenge behaviors. Refine runs as **internal auto-multi-round loop** within a single invocation — at least 2 rounds, with AI semantically judging convergence after round 2 (no upper bound). Each round produces substantive updates to any affected artifact, not just design.md.

#### Scenario: Brainstorming activation with 9-step integration
- **WHEN** user runs `/specpower:refine` on an active change with proposal.md, specs/, design.md, and tasks.md from plan phase
- **THEN** system reads all four artifacts + main `specpower/specs/` baseline and initiates the full Superpowers brainstorming 9-step flow (examine existing → ask clarifying questions → propose 2-3 approaches with tradeoffs → present design sections → write/update → self-review → request user approval → next-step indication), with the 4 challenge behaviors injected into the "examine existing" and "clarifying questions" steps

#### Scenario: 4 challenge behaviors in each round
- **WHEN** refine starts a round
- **THEN** AI SHALL explicitly perform each of 4 behaviors, producing substantive output for each:
  1. **Challenge plan's assumptions** — identify assumptions in proposal/specs/design that were glossed over and explain why they matter
  2. **Propose new options** — revisit each existing design decision and offer alternative approaches not considered in plan
  3. **Explore omitted boundaries** — identify edge cases, permissions, error modes, non-functional concerns missing from specs
  4. **Question scope** — ask whether the change includes too much or too little, whether any capability should be split or merged

#### Scenario: Refine may update any plan-phase artifact
- **WHEN** discussion in any round reveals problems in any artifact
- **THEN** system SHALL update the affected artifact(s) in place (proposal, specs, design, or tasks) and inform the user at round end which files were modified

### Requirement: Multi-approach exploration
The system SHALL propose 2-3 technical approaches with trade-offs and a recommendation before asking the user to choose, for every non-trivial design decision being discussed.

#### Scenario: Approach presentation
- **WHEN** refine discusses a design decision (existing or newly identified)
- **THEN** system presents at least 2 approaches with pros/cons and a recommended option

#### Scenario: User approval gate
- **WHEN** refine judges itself converged and all updates are made
- **THEN** system SHALL present a summary and wait for explicit user confirmation before marking phase as `refined`

### Requirement: Impact analysis before updates
The system SHALL perform an **impact analysis** before making any artifact update, informing the user which artifacts would be affected and asking the user to choose the update scope for this round.

#### Scenario: Impact analysis pre-announcement
- **WHEN** refine decides an update is needed based on discussion
- **THEN** AI SHALL first announce: "Proposed update affects: [list of files]. This round can: (A) apply all updates together, (B) update only the primary file this round and defer cascaded updates to next round, (C) defer entirely and continue discussion. Which do you choose?"

#### Scenario: User scope choice execution
- **WHEN** user selects a scope option (A/B/C)
- **THEN** AI SHALL execute only the chosen scope; choices B and C defer work to the next round (and refine's multi-round loop will pick them up)

### Requirement: Multi-round convergence control
The system SHALL run refine as an internal loop of at least 2 rounds. After round 2, AI SHALL semantically judge whether convergence is achieved; if not, continue. If yes, exit the loop and present final summary.

#### Scenario: Minimum 2 rounds enforced
- **WHEN** the first round completes
- **THEN** system SHALL automatically start round 2 without asking the user whether to continue (the 2-round minimum is unconditional)

#### Scenario: AI semantic convergence judgment after round 2
- **WHEN** round 2 (or any subsequent round) completes
- **THEN** AI SHALL evaluate: "Are there still meaningful unaddressed challenges/questions/scope concerns? Is any artifact still in a state that doesn't reflect the full discussion?" If yes, continue another round; if no, exit loop.

#### Scenario: Round-end user visibility
- **WHEN** each round completes
- **THEN** system SHALL show the user: round number, which artifacts were modified in this round with a brief diff summary, and whether AI judges convergence reached (entering final confirmation) or another round starts

### Requirement: Design Decisions format preserves discussion trail
The system SHALL write refine discussion outcomes into `design.md` under `## Design Decisions`, with each decision containing: decision name, options considered, pros/cons of each, chosen option, rationale. This mirrors the style of archived `create-specpower-plugin` design.md.

#### Scenario: Decision recorded with full trail
- **WHEN** refine discusses and resolves a design decision
- **THEN** `design.md` SHALL contain a `### Decision N: <name>` subsection with:
  - "**Options considered:**" list with at least 2 options and their pros/cons
  - "**Chosen:**" line identifying the selection
  - "**Rationale:**" paragraph explaining why

#### Scenario: Decision deferred to open questions if unresolved
- **WHEN** discussion cannot resolve a decision in the current session
- **THEN** system SHALL move the unresolved question to `design.md` under `## Open Questions` rather than forcing a decision

### Requirement: Artifact update preserves format contracts
When refine updates `proposal.md`, `specs/**/*.md`, or `tasks.md`, updates MUST preserve format compatibility with `specpower validate` and `specpower change archive`.

#### Scenario: Proposal update format preservation
- **WHEN** refine updates proposal.md
- **THEN** the updated file SHALL retain `## Why`, `## What Changes`, `## Capabilities`, `## Impact` sections matching OpenSpec proposal format

#### Scenario: Spec update format preservation
- **WHEN** refine updates a delta spec file
- **THEN** the updated file SHALL pass `specpower validate` (retain `### Requirement:` headers, `#### Scenario:` headers with exactly 4 hashtags, `- **WHEN**`/`- **THEN**` bullet format)

#### Scenario: Tasks update preserves coarse granularity
- **WHEN** refine updates tasks.md
- **THEN** updates SHALL stay at coarse-grained level (add/remove/reorganize groups and coarse tasks). Detailed 2-5 minute atomic tasks come from build Phase A, not refine.

### Requirement: End-of-refine phase update
The system SHALL update `.specpower.yaml` `phase` field to `refined` only after user explicitly confirms the final state.

#### Scenario: Phase transition on confirmation
- **WHEN** AI judges convergence and user explicitly confirms (not just acknowledging a round)
- **THEN** system SHALL update `.specpower.yaml` `phase: refined`

#### Scenario: User requests more rounds after AI judges converged
- **WHEN** AI says it judges convergence but user requests additional exploration
- **THEN** system SHALL continue another round; phase remains `plan` until user confirms final

