# test-plan: fix-command-alias-skill-loading

<!-- Cases reference spec Scenarios by name (delta or baseline); do not copy WHEN/THEN.
     Every delta Scenario MUST have >=1 Case; every failure-admitting Requirement >=1 [negative].
     Case ids are stable and change-unique; test code embeds the token [fix-command-alias-skill-loading-<id>].

     This change dogfoods specpower's own command-alias generator: the Cases below
     are backed by real unit tests in test/cli/init.test.ts (generateCommandAlias
     direct assertions + the init-generated .claude/commands/specpower/*.md assertions). -->

## Capability: tool-adapters

### Requirement: Command alias body forces skill loading and full-stage execution → Scenario: alias body names the skill and the Skill tool

- **Case** T1: the generated alias body names `specpower:<cmd>` and explicitly references the Skill tool as the loading mechanism [positive]
  - Input: generateCommandAlias(cmd, 'desc') for every command in COMMAND_NAMES
  - Expected: body contains `specpower:<cmd>` and matches /Skill tool/i
  - it(): generateCommandAlias produces a body that forces skill loading + full-stage execution
  - file: test/cli/init.test.ts

### Requirement: Command alias body forces skill loading and full-stage execution → Scenario: alias body forbids skipping stages

- **Case** T2: the generated alias body instructs executing every stage in order and explicitly says not to skip [positive]
  - Input: generateCommandAlias(cmd, 'desc')
  - Expected: body matches /every stage/i and /do not skip/i
  - it(): generateCommandAlias produces a body that forces skill loading + full-stage execution
  - file: test/cli/init.test.ts

### Requirement: Command alias body forces skill loading and full-stage execution → Scenario: alias body forwards ARGUMENTS into the skill

- **Case** T3: the generated alias body references an ARGUMENTS block and tells the model to forward it into the skill, not act on it directly [positive]
  - Input: generateCommandAlias(cmd, 'desc')
  - Expected: body matches /ARGUMENTS/i and /do not act on it directly/i
  - it(): generateCommandAlias produces a body that forces skill loading + full-stage execution
  - file: test/cli/init.test.ts

### Requirement: Command alias body forces skill loading and full-stage execution → Scenario: bare single-sentence alias body is rejected by regression test

- **Case** T4: a bare `Invoke the specpower:<cmd> skill.` body fails the generateCommandAlias regression matches (Skill tool / every stage / ARGUMENTS) [negative]
  - Input: the pre-fix body string `Invoke the specpower:fix skill.`
  - Expected: fails to match /Skill tool/i, /every stage/i, /do not skip/i, /ARGUMENTS/i — proving the regression guard catches the weak form
  - it(): generateCommandAlias produces a body that forces skill loading + full-stage execution
  - file: test/cli/init.test.ts

### Requirement: Command alias body forces skill loading and full-stage execution → Scenario: alias body forbids skipping stages (init-generated file)

- **Case** T5: initProject writes .claude/commands/specpower/<cmd>.md whose body carries the Skill-tool + every-stage + ARGUMENTS guarantees [positive]
  - Input: initProject(tmpDir, PACKAGE_ROOT); read each .claude/commands/specpower/<cmd>.md
  - Expected: each file matches /Skill tool/i, /every stage/i, /ARGUMENTS/i
  - it(): creates .claude/commands/specpower/ with 10 command alias .md files
  - file: test/cli/init.test.ts
