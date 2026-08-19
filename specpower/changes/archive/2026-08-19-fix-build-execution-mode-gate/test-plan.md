# test-plan: fix-build-execution-mode-gate

<!-- Cases reference spec Scenarios by name (delta or baseline); do not copy WHEN/THEN.
     Every delta Scenario MUST have >=1 Case; every failure-admitting Requirement >=1 [negative].
     Case ids are stable and change-unique; test code embeds the token [fix-build-execution-mode-gate-<id>].

     Two token prefixes are used so the parser can distinguish the two test files
     that back this change:
       [fix-build-execution-mode-gate-T<n>]  -> test/integration/build-execution-mode-gate.test.ts
                                                 (build SKILL.md / phase-a-plan.md content)
       [fix-build-execution-mode-gate-C<n>]  -> test/cli/change-mode.test.ts
                                                 (executionMode persistence CLI + metadata schema)

     Skill-behavior Scenarios (Stage 0 prompt surface, Phase B routing, Phase A deferral)
     are backed by the integration content test; persistence/enum/backward-compat Scenarios
     are backed by the real CLI + metadata unit tests. -->

## Capability: specpower-build

### Requirement: Build prompts for execution mode at build start (Stage 0) → Scenario: Stage 0 presents both execution modes when mode is unset

- **Case** T1: when build starts with executionMode unset, SKILL.md's Stage 0 presents Subagent-Driven and Inline and instructs the controller to ask the user (no silent default) [positive]
  - Input: read skills/specpower-build/SKILL.md
  - Expected: content matches /execution mode (selection|gate)/i, contains "subagent" and "inline", and an ask-the-user phrase
  - it(): Stage 0 presents both execution modes at build start when unset [fix-build-execution-mode-gate-T1]
  - file: test/integration/build-execution-mode-gate.test.ts

### Requirement: Build prompts for execution mode at build start (Stage 0) → Scenario: Stage 0 resumes a recorded mode without re-asking

- **Case** T2: Stage 0 reads the recorded mode via `specpower change mode` and references resume/.specpower.yaml so a recorded mode is reused [positive]
  - Input: read skills/specpower-build/SKILL.md
  - Expected: content matches /specpower change mode/i and /record|resume|already|\.specpower\.yaml/i
  - it(): Stage 0 reads and resumes the recorded mode via change mode CLI [fix-build-execution-mode-gate-T2]
  - file: test/integration/build-execution-mode-gate.test.ts

### Requirement: Build prompts for execution mode at build start (Stage 0) → Scenario: Phase A Execution Handoff defers the mode choice to Stage 0

- **Case** T7: phase-a-plan.md's Execution Handoff does NOT ask the mode question (no "Which approach?") and references the build-start Stage 0 gate [negative]
  - Input: read prompts/build/phase-a-plan.md
  - Expected: content has an "Execution Handoff" section and does NOT match /Which approach\?/
  - it(): Phase A handoff no longer presents the mode choice [fix-build-execution-mode-gate-T7]
  - file: test/integration/build-execution-mode-gate.test.ts

### Requirement: Execution mode persists in .specpower.yaml across interruption and restart → Scenario: setExecutionMode records the mode and preserves other fields

- **Case** C3: setExecutionMode('inline') writes executionMode and leaves schema/created/phase intact [positive]
  - Input: setExecutionMode on a change with existing schema/created/phase
  - Expected: .specpower.yaml has executionMode: inline; phase unchanged
  - it(): setExecutionMode records the mode and preserves other fields [fix-build-execution-mode-gate-C3]
  - file: test/cli/change-mode.test.ts

### Requirement: Execution mode persists in .specpower.yaml across interruption and restart → Scenario: getExecutionMode reads the recorded value

- **Case** C1: getExecutionMode returns the recorded value ('subagent') [positive]
  - Input: .specpower.yaml with executionMode: subagent
  - Expected: getExecutionMode returns 'subagent'
  - it(): getExecutionMode reads the recorded executionMode value [fix-build-execution-mode-gate-C1]
  - file: test/cli/change-mode.test.ts

### Requirement: Execution mode persists in .specpower.yaml across interruption and restart → Scenario: getExecutionMode returns undefined when unset (backward compat)

- **Case** C2: getExecutionMode returns undefined (not throw) for a change with no executionMode key [negative]
  - Input: .specpower.yaml without an executionMode key
  - Expected: getExecutionMode returns undefined
  - it(): getExecutionMode returns undefined when executionMode is unset (backward compat) [fix-build-execution-mode-gate-C2]
  - file: test/cli/change-mode.test.ts

### Requirement: Execution mode persists in .specpower.yaml across interruption and restart → Scenario: setExecutionMode is idempotent (resume survives restart)

- **Case** C4: re-setting the same value is a no-op write; a re-read after "restart" observes the same mode [positive]
  - Input: setExecutionMode twice with 'subagent', then getExecutionMode
  - Expected: mode is 'subagent' throughout
  - it(): setExecutionMode is idempotent across re-sets (resume survives restart) [fix-build-execution-mode-gate-C4]
  - file: test/cli/change-mode.test.ts

### Requirement: Execution mode persists in .specpower.yaml across interruption and restart → Scenario: invalid executionMode is rejected on set

- **Case** C5: setExecutionMode('parallel') throws an error listing subagent and inline, and does not write [negative]
  - Input: setExecutionMode with an invalid value
  - Expected: rejects with /subagent.*inline/; .specpower.yaml unchanged
  - it(): setExecutionMode throws for an invalid mode listing valid enum names [fix-build-execution-mode-gate-C5]
  - file: test/cli/change-mode.test.ts

### Requirement: Execution mode persists in .specpower.yaml across interruption and restart → Scenario: invalid executionMode is rejected on read

- **Case** C6: a hand-edited .specpower.yaml with executionMode: parallel is rejected on read [negative]
  - Input: .specpower.yaml with executionMode: parallel
  - Expected: getExecutionMode rejects matching /subagent.*inline|invalid.*executionMode/i
  - it(): metadata schema rejects an invalid executionMode on read [fix-build-execution-mode-gate-C6]
  - file: test/cli/change-mode.test.ts

### Requirement: Phase B hard-gates on a recorded execution mode → Scenario: Phase B hard gate runs Stage 0 when mode is missing

- **Case** T3: SKILL.md declares a Phase B hard gate that verifies the recorded executionMode and routes to Stage 0 when missing (no silent default) [negative]
  - Input: read skills/specpower-build/SKILL.md
  - Expected: content matches /hard gate|execution[\s-]?mode.*(record|gate)|verify.*execution[\s-]?mode/i and /Stage 0/i
  - it(): Phase B has a hard gate verifying a recorded mode [fix-build-execution-mode-gate-T3]
  - file: test/integration/build-execution-mode-gate.test.ts

### Requirement: Phase B hard-gates on a recorded execution mode → Scenario: Phase B routes to the subagent path when mode is subagent

- **Case** T4: SKILL.md labels a subagent path wired to phase-b-execute.md [positive]
  - Input: read skills/specpower-build/SKILL.md
  - Expected: content contains /subagent path/i and ".claude/specpower/prompts/build/phase-b-execute.md"
  - it(): Phase B routes to the subagent path [fix-build-execution-mode-gate-T4]
  - file: test/integration/build-execution-mode-gate.test.ts

### Requirement: Phase B hard-gates on a recorded execution mode → Scenario: Phase B routes to the inline path when mode is inline

- **Case** T5: SKILL.md labels an inline path wired to shared/executing-plans.md, and that prompt file exists [positive]
  - Input: read skills/specpower-build/SKILL.md and prompts/shared/executing-plans.md
  - Expected: content contains /inline path/i and ".claude/specpower/prompts/shared/executing-plans.md"; the file exists
  - it(): Phase B routes to the inline path via executing-plans.md [fix-build-execution-mode-gate-T5]
  - file: test/integration/build-execution-mode-gate.test.ts

### Requirement: Phase B hard-gates on a recorded execution mode → Scenario: worktree setup is common to both execution paths

- **Case** T6: Stage B1 worktree setup references phase-b-worktree.md and is labeled common to both paths [positive]
  - Input: read skills/specpower-build/SKILL.md
  - Expected: content contains ".claude/specpower/prompts/build/phase-b-worktree.md" and /common to both paths/i
  - it(): worktree setup is common to both execution paths [fix-build-execution-mode-gate-T6]
  - file: test/integration/build-execution-mode-gate.test.ts
