## ADDED Requirements

### Requirement: Command alias body forces skill loading and full-stage execution

Each generated command alias file (`.claude/commands/specpower/<cmd>.md`, or the active tool's flat equivalent) is the user-facing entry point for `/specpower:<cmd>`. Its body SHALL NOT be a bare declarative sentence such as `Invoke the specpower:<cmd> skill.` — that form is too weak and the model frequently (a) never calls the Skill tool, acting on the `ARGUMENTS` block directly, or (b) loads the skill but runs only some stages, skipping the rest. The alias body SHALL instead be an imperative, exhaustive instruction that:

- names the exact skill to load (`specpower:<cmd>`) and explicitly directs the model to load it by calling the **Skill tool** (not narrating, not substituting its own understanding);
- requires executing **every stage** the loaded skill defines, in order, from start to finish, with no skipping, summarizing, or replacement by ad-hoc steps;
- forbids beginning any work before the skill is loaded;
- treats any `ARGUMENTS:` block provided at invocation as the **task input to forward into the skill**, not as a standalone task to act on directly before the skill is loaded.

The body MAY remain terse (it is a dispatch stub, not the procedure itself — the SKILL.md remains the single source of the staged procedure), but it MUST carry all four guarantees above so the dispatch is reliable regardless of whether arguments are present.

#### Scenario: alias body names the skill and the Skill tool
- **WHEN** `specpower init`/`sync` generates the command alias for any `<cmd>`
- **THEN** the alias body contains the literal `specpower:<cmd>`
- **AND** the body explicitly references the `Skill tool` as the loading mechanism

#### Scenario: alias body forbids skipping stages
- **WHEN** the command alias body is generated
- **THEN** the body instructs the model to execute every stage the skill defines, in order
- **AND** the body explicitly says not to skip (or summarize/replace) stages

#### Scenario: alias body forwards ARGUMENTS into the skill
- **WHEN** the command alias body is generated
- **THEN** the body references an `ARGUMENTS:` block
- **AND** instructs the model to treat it as task input forwarded into the skill
- **AND** instructs the model not to act on it directly before the skill is loaded

#### Scenario: bare single-sentence alias body is rejected by regression test
- **WHEN** `generateCommandAlias` is invoked for any command name
- **THEN** the returned body matches `/Skill tool/i`, `/every stage/i`, `/do not skip/i`, and `/ARGUMENTS/i`
- **AND** a body consisting solely of `Invoke the specpower:<cmd> skill.` fails these matches
