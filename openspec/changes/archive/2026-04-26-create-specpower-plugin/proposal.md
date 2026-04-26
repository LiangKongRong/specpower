## Why

OpenSpec and Superpowers are two complementary open-source frameworks for Claude Code: OpenSpec handles structured requirements planning (proposal -> specs -> design -> tasks), while Superpowers handles disciplined engineering execution (TDD, debugging, code review, subagent orchestration). Currently, using both requires installing two separate plugins and manually coordinating their workflows. Because both register as separate skill providers, Claude Code can experience "skill hijacking" where one plugin's skill loading interferes with another's execution context.

SpecPower merges both frameworks into a single, fully self-contained package — a Claude Code plugin with a unified slash command workflow (`scan -> plan -> refine -> build -> review -> test -> verify -> done`), plus a CLI tool for complex operations (artifact management, delta spec merging, validation). Zero external dependencies on OpenSpec CLI or Superpowers plugin.

## What Changes

- **Unified npm package**: `npm install -g specpower` installs both CLI and plugin capabilities. `specpower init` generates `.claude/skills/` and `.claude/commands/` in the target project.
- **10 slash commands**: `/specpower:scan`, `/specpower:plan`, `/specpower:refine`, `/specpower:build`, `/specpower:review`, `/specpower:test`, `/specpower:verify`, `/specpower:done`, `/specpower:fix`, `/specpower:snap`
- **specpower CLI**: Redesigned command structure for artifact management, change tracking, delta merge, validation — ported from OpenSpec's core TypeScript modules.
- **Progressive prompt loading**: SKILL.md files act as orchestrators; detailed prompts loaded on-demand via Read tool from `prompts/` directory, keeping each execution stage focused.
- **Full Superpowers integration**: All 14 SKILL.md skills + 3 subagent prompts + all supporting reference materials rewritten for specPower style, logic preserved.
- **OpenSpec core runtime**: 6 TypeScript modules ported (artifact-graph, specs-apply, validation, change-utils, parsers, templates) providing the engine behind CLI operations.
- **Brownfield scanning** (original): `/specpower:scan` using code-review-graph for codebase analysis, converting results to specs baseline.
- **Post-hoc documentation** (original): `/specpower:snap` for retroactively creating change records from git diffs.
- **Bugfix fast-track** (original): `/specpower:fix` combining debugging + TDD + auto-archiving.

## Capabilities

### New Capabilities
- `specpower-cli`: CLI tool with redesigned command structure for artifact management, change tracking, delta spec merging, and validation
- `specpower-scan`: Brownfield project scanner using code-review-graph to generate specs baseline and project context
- `specpower-plan`: Requirements planning combining OpenSpec proposal + specs artifact generation with baseline awareness
- `specpower-refine`: Technical deepening via rewritten Superpowers brainstorming workflow producing design.md
- `specpower-build`: Two-phase execution (plan generation + subagent-driven TDD) with progressive prompt loading and per-task user confirmation
- `specpower-review`: Spec-aware code review with regression checking against main specs
- `specpower-test`: Multi-level test execution (unit + integration + E2E + regression) with affected module targeting
- `specpower-verify`: Dual validation of delta specs and main specs regression
- `specpower-done`: Change archiving with delta-to-main specs merging and git branch cleanup
- `specpower-fix`: Bugfix fast-track with systematic debugging guided by specs
- `specpower-snap`: Post-hoc change documentation from git diff analysis
- `plugin-infrastructure`: Plugin registration, progressive prompt architecture, templates, and installation system

### Modified Capabilities

(No existing specs to modify - greenfield project)

## Impact

- **Plugin ecosystem**: Single package replaces need for separate OpenSpec + Superpowers installations
- **Skill execution**: Eliminates skill hijacking by embedding all prompt content directly, using progressive Read loading
- **Developer workflow**: Complete scan-to-archive lifecycle with strict user confirmation gates
- **CLI tooling**: New `specpower` CLI for terminal-based artifact management
- **Dependencies**: Ports source from OpenSpec (MIT) and Superpowers (MIT); adds code-review-graph as scan dependency
