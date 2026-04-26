## MODIFIED Requirements

### Requirement: Requirements planning with baseline awareness
The system SHALL generate a **complete first-iteration artifact set** (proposal.md + delta specs + design.md + tasks.md) for a user-described change in a single workflow, referencing the existing specs baseline to identify affected behaviors. Each artifact in plan phase is the **first round of deep thinking** — substantive content, not placeholder skeletons. Further iteration happens in refine.

#### Scenario: Plan with existing baseline generates full artifact set
- **WHEN** user runs `/specpower:plan "add user export feature"` and `specpower/specs/` exists
- **THEN** system creates `specpower/changes/<change-name>/` with all four artifact files: proposal.md, specs/**/*.md, design.md (deep first-iteration), tasks.md (coarse-grained first-iteration). The `.specpower.yaml` is initialized with `phase: plan`.

#### Scenario: Plan without baseline
- **WHEN** user runs `/specpower:plan` and `specpower/specs/` does not exist
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

#### Scenario: User approval gate between artifact stages
- **WHEN** proposal generation completes
- **THEN** system SHALL pause for user confirmation that the proposal direction is correct before proceeding to specs. After specs, design and tasks are generated continuously without interrupting the user (these are first-iteration drafts that refine will deepen).

## ADDED Requirements

### Requirement: Deep first-iteration design in plan phase
The system SHALL generate a design.md in plan phase that represents the **first round of deep thinking** about the change. The content must be substantive — with real context, specific goals/non-goals, actual design decisions with options considered and rationale, identified risks, and explicit open questions. It is NOT a placeholder skeleton; it is a thinking artifact to be deepened in refine.

#### Scenario: Deep first-iteration design content
- **WHEN** design.md is generated in plan phase
- **THEN** it SHALL contain:
  - Context: real description of current project state and affected modules (not TBD)
  - Goals / Non-Goals: specific lists reflecting the capabilities in proposal
  - Design Decisions: actual decisions the AI identifies as needed, each with options considered + rationale; decisions may be marked `(plan-phase analysis, may revise in refine)` to acknowledge uncertainty
  - Risks: specific risks tied to this change, not generic ones
  - Open Questions: questions the AI wants refine to discuss with user

#### Scenario: Quality is user-judged, not quantity-enforced
- **WHEN** design.md is generated in plan phase
- **THEN** the system SHALL NOT enforce quantitative thresholds (e.g., "at least 2 decisions"). Quality is assured by: strong prompt directives ("identify real decisions, not generic ones"), reference examples (pointing to archived well-written design.md), and user review gate at end of plan phase.

### Requirement: Deep first-iteration tasks in plan phase
The system SHALL generate a tasks.md in plan phase containing coarse-grained but substantive tasks — actual implementation steps the AI believes are needed (not placeholder groups). These tasks will be **rewritten** (not just expanded) in build Phase A by writing-plans rules.

#### Scenario: Substantive first-iteration tasks
- **WHEN** tasks.md is generated in plan phase
- **THEN** it SHALL contain 3-8 task groups (`## N. <Group Name>`), each with 2-6 concrete task items describing implementation actions (e.g., "实现 searchNotes 纯函数", "添加 CLI tag 子命令"), not vague placeholders

### Requirement: Phase metadata tracking
The `.specpower.yaml` in each change directory SHALL contain a `phase` field tracking the change's current workflow stage: `plan`, `refined`, `built`, or `archived`.

#### Scenario: Plan phase initialization
- **WHEN** `/specpower:plan` completes successfully
- **THEN** `.specpower.yaml` SHALL have `phase: plan`

#### Scenario: Phase transitions driven by workflow completion
- **WHEN** `/specpower:refine` completes successfully
- **THEN** `.specpower.yaml` `phase` SHALL be updated to `refined`

#### Scenario: Build phase transition
- **WHEN** `/specpower:build` Phase B completes all tasks
- **THEN** `.specpower.yaml` `phase` SHALL be updated to `built`

### Requirement: Full-artifact-set presentation to user
The system SHALL present all four generated artifacts to the user at the end of plan phase, describing each as a "first iteration" that refine will deepen.

#### Scenario: End-of-plan summary
- **WHEN** all four artifacts are generated and phase is set to `plan`
- **THEN** system SHALL show: "Generated first-iteration artifacts: proposal.md (final intent), specs/<N> files (first pass), design.md (first-iteration analysis — refine will deepen), tasks.md (first-iteration grouping — build will rewrite to writing-plans precision). Next: run `/specpower:refine` for deep review."
