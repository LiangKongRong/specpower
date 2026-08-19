# test-plan: fix-command-alias-skill-loading

<!-- Cases reference spec Scenarios by name (delta or baseline); do not copy WHEN/THEN.
     Every delta Scenario MUST have >=1 Case; every failure-admitting Requirement >=1 [negative].
     Case ids are stable and change-unique; test code embeds the token [fix-command-alias-skill-loading-<id>].

     This change dogfoods specpower's own command-alias generator across all four
     tool adapters: the Cases below are backed by real unit + integration tests
     in test/cli/init.test.ts (generateCommandAlias per-tool assertions + the
     init-generated command-alias body assertions, for claude AND opencode). -->

## Capability: tool-adapters

### Requirement: Command alias body forces skill loading and full-stage execution, via a tool-appropriate mechanism → Scenario: skill-tool tools name the skill and the Skill tool, with no embedded path

- **Case** T1: for claude/cac/chrys the generated alias body names `specpower-<cmd>` and directs the model to call the Skill tool, with no embedded `Read <path>` [positive]
  - Input: generateCommandAlias(cmd, 'desc', getToolAdapter(id), projectCtx) for id in {claude,cac,chrys} and every cmd
  - Expected: body contains `specpower-<cmd>`, matches /Skill tool/i, /every stage/i, /do not skip/i, /ARGUMENTS/i, and does not match /Read `/
  - it(): generateCommandAlias: skill-tool tools (claude/cac/chrys) name the skill + Skill tool + every stage, no path
  - file: test/cli/init.test.ts

- **Case** T7: an init-generated claude command alias carries the same skill-tool + every-stage + ARGUMENTS guarantees and names `specpower-<cmd>` [positive]
  - Input: initProject(tmpDir, PACKAGE_ROOT) (claude default); read each .claude/commands/specpower/<cmd>.md
  - Expected: each file contains `specpower-<cmd>`, matches /Skill tool/i, /every stage/i, /do not skip/i, /ARGUMENTS/i
  - it(): creates .claude/commands/specpower/ with 10 command alias .md files
  - file: test/cli/init.test.ts

### Requirement: … → Scenario: read-file tool (opencode) points at the flat agent file

- **Case** T2: for opencode (project scope) the body tells the model to Read `.opencode/agent/specpower-<cmd>.md` and does NOT reference a Skill tool [positive]
  - Input: generateCommandAlias(cmd, 'desc', getToolAdapter('opencode'), projectCtx)
  - Expected: body contains `Read \`.opencode/agent/specpower-<cmd>.md\``, matches /every stage/i, /do not skip/i, /ARGUMENTS/i, and does not match /Skill tool/i
  - it(): generateCommandAlias: opencode (read-file) points at the flat agent path, no Skill tool
  - file: test/cli/init.test.ts

- **Case** T5: an init-generated opencode command alias (integration) carries the Read-the-flat-agent-file body and no Skill tool reference [positive]
  - Input: initProject(tmpDir, PACKAGE_ROOT) with SPECPOWER_TOOL=opencode; read .opencode/command/plan.md
  - Expected: contains `Read \`.opencode/agent/specpower-plan.md\``, matches /every stage/i, not /Skill tool/i
  - it(): opencode: emits .opencode/agent/*.md + .opencode/command/*.md + assets, no .claude/
  - file: test/cli/init.test.ts

### Requirement: … → Scenario: read-file tool user-scope path is prefixed with ~/

- **Case** T3: for opencode with user scope the body points at `~/.opencode/agent/specpower-<cmd>.md` [positive]
  - Input: generateCommandAlias(cmd, 'desc', getToolAdapter('opencode'), userCtx)
  - Expected: body contains `Read \`~/.opencode/agent/specpower-<cmd>.md\``
  - it(): (opencode user-scope ~/ path assertion — covered by generateCommandAlias: opencode (read-file) points at the flat agent path, no Skill tool)
  - file: test/cli/init.test.ts

### Requirement: … → Scenario: every mechanism forbids skipping stages and forwards ARGUMENTS

- **Case** T4: regardless of tool/scope the body matches /every stage/i, /do not skip/i, /ARGUMENTS/i and tells the model not to act on ARGUMENTS directly before load [positive]
  - Input: generateCommandAlias across all four adapters and both scopes
  - Expected: every body matches /every stage/i, /do not skip/i, /ARGUMENTS/i, /do not act on it directly/i
  - it(): (cross-mechanism assertions — covered by both generateCommandAlias tests above)
  - file: test/cli/init.test.ts

### Requirement: … → Scenario: bare single-sentence alias body is rejected by regression test

- **Case** T6: a bare `Invoke the specpower:<cmd> skill.` body fails the generateCommandAlias regression matches (every stage / do not skip / ARGUMENTS) [negative]
  - Input: the pre-fix body string `Invoke the specpower:fix skill.`
  - Expected: fails to match /every stage/i, /do not skip/i, /ARGUMENTS/i — proving the regression guard catches the weak form
  - it(): (regression guard — covered by generateCommandAlias tests above)
  - file: test/cli/init.test.ts
