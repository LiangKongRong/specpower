## ADDED Requirements

### Requirement: Build prompts for execution mode at build start (Stage 0)
At `/specpower:build` start — before Phase A — the controller SHALL determine and record the execution mode (Subagent-Driven vs Inline Execution). When no mode is recorded, the controller SHALL present both options and ask the user to choose (no silent default), then persist the choice. The mode choice is owned by Stage 0 of `specpower-build/SKILL.md`; Phase A's Execution Handoff SHALL NOT present this choice.

**Delivery:** Stage 0 reads the recorded mode via `specpower change mode <name>`. If set, it resumes that mode without re-asking. If unset, it presents Subagent-Driven (recommended) and Inline Execution, asks the user, and records the choice via `specpower change mode <name> --set <value>`. The controller SHALL NOT proceed to Phase A until a mode is recorded.

#### Scenario: Stage 0 presents both execution modes when mode is unset
- **WHEN** `/specpower:build` starts and `executionMode` is unset in `.specpower.yaml`
- **THEN** the controller SHALL present Subagent-Driven and Inline Execution as the two options
- **AND** SHALL ask the user to choose
- **AND** SHALL NOT silently default to either mode

#### Scenario: Stage 0 resumes a recorded mode without re-asking
- **WHEN** `/specpower:build` starts and `executionMode` is already recorded in `.specpower.yaml`
- **THEN** the controller SHALL use the recorded mode
- **AND** SHALL NOT re-ask the user
- **AND** SHALL announce it is resuming in that mode

#### Scenario: Phase A Execution Handoff defers the mode choice to Stage 0
- **WHEN** Phase A completes the rewrite and presents the Before/After audit
- **THEN** `phase-a-plan.md`'s Execution Handoff SHALL present the rewrite for confirmation only
- **AND** SHALL NOT ask the execution-mode question
- **AND** SHALL defer the mode choice to Stage 0 (already made at build start)

### Requirement: Execution mode persists in .specpower.yaml across interruption and restart
The execution mode decision SHALL be stored in the change's `.specpower.yaml` under an `executionMode` field whose value is one of `subagent` | `inline`. The field is optional (absent means "not yet chosen"). Setting it SHALL preserve all other metadata fields (schema, created, phase). An invalid value SHALL be rejected both on write (by the `change mode --set` command) and on read (by the metadata zod schema). Backward compatibility: changes created before this field existed (no `executionMode` key) SHALL read as unset, not error.

**Delivery:** `ChangeMetadata` gains an optional `executionMode: 'subagent' | 'inline'` field validated by the zod schema (passthrough preserves other fields). `updateExecutionMode` in `change-utils.ts` spreads existing metadata so phase/created/schema survive. The `specpower change mode <name> [--set <value>]` CLI command reads/writes it.

#### Scenario: setExecutionMode records the mode and preserves other fields
- **WHEN** `setExecutionMode(name, 'inline', root)` is called on a change with existing schema/created/phase
- **THEN** `.specpower.yaml` SHALL contain `executionMode: inline`
- **AND** the schema, created, and phase fields SHALL be unchanged

#### Scenario: getExecutionMode reads the recorded value
- **WHEN** `.specpower.yaml` contains `executionMode: subagent`
- **THEN** `getExecutionMode(name, root)` SHALL return `'subagent'`

#### Scenario: getExecutionMode returns undefined when unset (backward compat)
- **WHEN** `.specpower.yaml` has no `executionMode` key (pre-existing change)
- **THEN** `getExecutionMode(name, root)` SHALL return `undefined`
- **AND** SHALL NOT throw

#### Scenario: setExecutionMode is idempotent (resume survives restart)
- **WHEN** `setExecutionMode` is called with the same value already recorded
- **THEN** the field SHALL remain that value
- **AND** a restart that re-reads SHALL observe the same mode

#### Scenario: invalid executionMode is rejected on set
- **WHEN** `setExecutionMode(name, 'parallel', root)` is called with a value not in {subagent, inline}
- **THEN** the call SHALL throw an error listing `subagent` and `inline` as valid values
- **AND** SHALL NOT write the invalid value

#### Scenario: invalid executionMode is rejected on read
- **WHEN** `.specpower.yaml` contains `executionMode: parallel` (hand-edited corruption)
- **THEN** `readChangeMetadata` / `getExecutionMode` SHALL throw
- **AND** the error SHALL mention `subagent` and `inline`

### Requirement: Phase B hard-gates on a recorded execution mode
Phase B SHALL verify a recorded `executionMode` exists before any task runs. This guards against an interrupted/restarted build that skipped Stage 0, or a hand-edited `.specpower.yaml`. If a mode is recorded, Phase B SHALL route to the matching path (subagent path or inline path). If unset, Phase B SHALL STOP and run Stage 0 (prompt + record) before proceeding — it SHALL NOT silently default.

**Delivery:** Stage B0 (Execution Mode Hard Gate) in `specpower-build/SKILL.md` reads `specpower change mode <name>` at Phase B entry. The subagent path uses `.claude/specpower/prompts/build/phase-b-execute.md` + `phase-b-review.md`; the inline path uses `.claude/specpower/prompts/shared/executing-plans.md`. Stage B1 worktree setup is common to both paths.

#### Scenario: Phase B hard gate runs Stage 0 when mode is missing
- **WHEN** Phase B is entered and `executionMode` is unset in `.specpower.yaml`
- **THEN** the controller SHALL STOP and run Stage 0 (present choice, record)
- **AND** SHALL NOT silently default to either mode
- **AND** SHALL only proceed to Stage B1 after a mode is recorded

#### Scenario: Phase B routes to the subagent path when mode is subagent
- **WHEN** Phase B is entered and `executionMode` is `subagent`
- **THEN** the controller SHALL follow the subagent path (fresh implementer subagent per task via `phase-b-execute.md`, two-stage review via `phase-b-review.md`)

#### Scenario: Phase B routes to the inline path when mode is inline
- **WHEN** Phase B is entered and `executionMode` is `inline`
- **THEN** the controller SHALL follow the inline path by reading `.claude/specpower/prompts/shared/executing-plans.md`
- **AND** SHALL execute tasks in-session with per-task/per-group confirmation checkpoints as the inline equivalent of Gate B

#### Scenario: worktree setup is common to both execution paths
- **WHEN** either Phase B path begins
- **THEN** Stage B1 worktree setup SHALL run regardless of the chosen mode (isolated workspace setup is mode-independent)
