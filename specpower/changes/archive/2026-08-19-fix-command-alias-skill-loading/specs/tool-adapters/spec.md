## ADDED Requirements

### Requirement: Command alias body forces skill loading and full-stage execution, via a tool-appropriate mechanism

Each generated command alias file (`.claude/commands/specpower/<cmd>.md`, or the active tool's flat equivalent) is the user-facing entry point for `/specpower:<cmd>`. Its body SHALL NOT be a bare declarative sentence such as `Invoke the specpower:<cmd> skill.` — that form is too weak and the model frequently (a) never loads the skill, acting on the `ARGUMENTS` block directly, or (b) loads the skill but runs only some stages, skipping the rest. The alias body SHALL instead be an imperative, exhaustive instruction whose loading mechanism is chosen per tool (`tool.skillLoadMechanism`) so it is reliable on EVERY supported runtime, not just Claude:

- **`skill-tool` tools (claude/cac/chrys)** — these runtimes expose a host Skill tool that resolves skills by name. The body SHALL name the skill by its canonical directory name (`specpower-<cmd>`) and direct the model to load it by calling the **Skill tool**. Path-free and scope-agnostic, so it works unchanged for both project and user scope and avoids `~` path expansion.
- **`read-file` tools (opencode)** — this runtime exposes no Skill tool (only read/write/edit/bash/glob/grep). The body SHALL direct the model to **Read** the skill file at its layout-correct path: project scope → `<rootDir>/agent/specpower-<cmd>.md` (cwd-relative); user scope → `~/<rootDir>/agent/specpower-<cmd>.md`. The path is derived from the adapter's own `skillDestRelPath` so it tracks each tool's layout automatically.

Regardless of mechanism, EVERY alias body MUST additionally:
- require executing **every stage** the loaded skill defines, in order, from start to finish, with no skipping, summarizing, or replacement by ad-hoc steps;
- forbid beginning any work before the skill is loaded (or, for read-file, before the file is read);
- treat any `ARGUMENTS:` block provided at invocation as the **task input to forward into the skill**, not as a standalone task to act on directly before the skill is loaded.

#### Scenario: skill-tool tools name the skill and the Skill tool, with no embedded path
- **WHEN** `specpower init`/`sync` generates the command alias for any `<cmd>` with a `skill-tool` tool (claude, cac, or chrys)
- **THEN** the alias body contains the canonical skill name `specpower-<cmd>`
- **AND** the body explicitly directs the model to call the `Skill tool`
- **AND** the body contains no `Read `<path>`` instruction (path-free, scope-agnostic)

#### Scenario: read-file tool (opencode) points at the flat agent file
- **WHEN** the command alias is generated for opencode (project scope)
- **THEN** the body contains `Read \`.opencode/agent/specpower-<cmd>.md\``
- **AND** the body does NOT reference a `Skill tool` (opencode exposes none)

#### Scenario: read-file tool user-scope path is prefixed with ~/
- **WHEN** the command alias is generated for opencode with user scope
- **THEN** the body contains `Read \`~/.opencode/agent/specpower-<cmd>.md\``

#### Scenario: every mechanism forbids skipping stages and forwards ARGUMENTS
- **WHEN** the command alias body is generated for any tool and any scope
- **THEN** the body instructs the model to execute every stage the skill defines, in order
- **AND** explicitly says not to skip stages
- **AND** references an `ARGUMENTS:` block and tells the model not to act on it directly before the skill is loaded

#### Scenario: bare single-sentence alias body is rejected by regression test
- **WHEN** `generateCommandAlias` is invoked for any command name and any tool
- **THEN** the returned body matches `/every stage/i`, `/do not skip/i`, and `/ARGUMENTS/i`
- **AND** a body consisting solely of `Invoke the specpower:<cmd> skill.` fails these matches
