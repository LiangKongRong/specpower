## Context

Two open-source Claude Code frameworks exist today:

- **OpenSpec** (Fission-AI): Spec-driven development CLI with artifact dependency graph, change tracking, delta specs, and archiving. TypeScript/Node.js, ~22K lines. Core runtime handles complex operations (Markdown parsing, delta merge, validation).
- **Superpowers** (obra): Skills-based engineering methodology plugin with brainstorming, TDD, systematic debugging, subagent orchestration, code review, and verification. 14 SKILL.md files (~3K lines) + 3 subagent prompts + supporting reference materials (~45KB+).

Both are MIT-licensed. Using them together requires two separate plugin installations and manual coordination, creating skill hijacking risks.

The project root is `/Users/zhangyufeng/RawAI/ccDevFramework/specPowner/` — this IS the specPower framework.

## Goals / Non-Goals

**Goals:**
- Single npm package (`specpower`) with CLI + plugin capabilities
- Full self-containment: zero dependency on OpenSpec CLI or Superpowers plugin at runtime
- Port OpenSpec's 6 core TypeScript modules for artifact management, delta merge, and validation
- Embed and rewrite all 14 Superpowers skills + all supporting materials for specPower style
- Progressive prompt loading (SKILL.md as orchestrator, Read-loads detailed prompts per stage)
- Redesigned CLI command structure (not just OpenSpec rename)
- `specpower init` generates `.claude/skills/` and `.claude/commands/` in target projects
- Strict user confirmation mode: every task gets review + user approval
- Brownfield scanning via code-review-graph integration

**Non-Goals:**
- Supporting non-Claude-Code AI tools in V1 (single-platform focus)
- Visual companion / browser mockup server (Superpowers brainstorming feature — V1 skip)
- Full OpenSpec CLI feature parity (skip telemetry, shell completions, interactive dashboard, 25+ tool adapters)
- Building from scratch — port and adapt, don't reinvent

## Decisions

### D1: Unified npm package with CLI + plugin

**Choice**: `specpower` is an npm package that provides both a CLI binary (`specpower` command) and a plugin generator (`specpower init` writes `.claude/skills/` and `.claude/commands/` into the target project).

**Why**: Users need the CLI for complex operations (delta merge, artifact graph, validation) that can't be reliably done via natural language instructions. The plugin/skills provide the Claude Code slash command interface. Both ship in one package for zero-friction installation.

**Installation flow**:
```bash
npm install -g specpower        # Install CLI globally
cd my-project
specpower init                  # Generate .claude/skills/, .claude/commands/, openspec/
```

**Alternative considered**: Pure Markdown plugin (no TypeScript, no CLI) — rejected because delta spec merging and artifact graph require deterministic code, not AI interpretation of Markdown.

### D2: Port OpenSpec core TypeScript modules

**Choice**: Port 6 modules from OpenSpec source into specPower's TypeScript codebase:

| Module | Purpose | Approx size |
|--------|---------|-------------|
| `artifact-graph/` | Dependency resolution, build order, state tracking | ~800 lines |
| `specs-apply.ts` + `archive.ts` | Delta spec merge to main specs | ~600 lines |
| `validation/` | Spec format validation (WHEN/THEN, requirement structure) | ~400 lines |
| `change-utils.ts` + `change-metadata.ts` | Change management utilities | ~300 lines |
| `parsers/` | Markdown parsing for delta specs | ~400 lines |
| `templates/` + `instruction-loader.ts` | Template loading and instruction enrichment | ~300 lines |

**Total**: ~2800 lines of TypeScript to port.

**Why over CLI wrapping**: Self-contained. No `npm install -g openspec` required. We own the code and can evolve it.

**Why over pure prompt instructions**: Delta merge is a deterministic text operation (find section, match requirement name, apply ADDED/MODIFIED/REMOVED). Asking Claude to do this via natural language is unreliable and non-reproducible.

### D3: Redesigned CLI command structure

**Choice**: Design specPower's CLI commands from scratch rather than copying OpenSpec's structure. Aligned with specPower's 10-command workflow.

**Rationale**: OpenSpec's CLI was designed for a broader audience (25+ tools). SpecPower targets Claude Code specifically and has a different workflow (scan → plan → refine → build → ...). Commands should reflect this workflow.

CLI design is a separate task — will be defined during implementation based on the workflows that SKILL.md files need to invoke.

### D4: Progressive prompt loading architecture

**Choice**: SKILL.md files are lightweight orchestrators (~50-100 lines) that route execution through stages. Each stage loads its detailed prompt via Claude Code's Read tool from the `prompts/` directory.

**Structure example** (`specpower-build/SKILL.md`):
```
SKILL.md (orchestrator, ~80 lines)
├── Stage A: Read prompts/build/phase-a-plan.md → generate task plan
├── User confirmation gate
├── Stage B: Read prompts/build/phase-b-worktree.md → setup isolation
├── Stage C: Read prompts/build/phase-b-execute.md → per-task TDD
│   └── Each subagent: Read prompts/shared/implementer-prompt.md
├── Stage D: Read prompts/build/phase-b-review.md → two-phase review
│   ├── Read prompts/shared/spec-reviewer-prompt.md
│   └── Read prompts/shared/code-reviewer-prompt.md
└── User confirmation per task
```

**Why**: A single specpower-build SKILL.md with all content inline would be ~1300 lines. Claude Code follows smaller, focused prompts more reliably than monolithic ones. Progressive loading keeps each execution stage in a clean context.

**Target location in user projects**: `.claude/specpower/prompts/` (avoids conflicts with user's own directories). SKILL.md orchestrators use CWD-relative paths like `.claude/specpower/prompts/build/phase-a-plan.md`.

**Prompts directory organization** (hybrid):
```
.claude/specpower/
├── prompts/
│   ├── build/                      # Execution-layer: organized by command
│   │   ├── phase-a-plan.md
│   │   ├── phase-b-worktree.md
│   │   ├── phase-b-execute.md
│   │   ├── phase-b-review.md
│   │   ├── plan-document-reviewer.md
│   │   └── tdd.md                  # TDD copy customized for per-task build context
│   ├── refine/
│   │   ├── brainstorm.md
│   │   ├── design-output.md
│   │   └── spec-document-reviewer.md
│   ├── test/
│   │   ├── tdd.md                  # TDD copy customized for full-suite test context
│   │   └── verification.md         # Verification copy for test command
│   ├── verify/
│   │   └── verification.md         # Verification copy for verify command
│   ├── fix/
│   │   └── debug.md
│   ├── plan/
│   │   ├── proposal.md
│   │   └── specs.md
│   ├── review/
│   │   └── code-review.md
│   ├── done/
│   │   └── branch-finish.md
│   ├── scan/                       # (prompts for scan if needed)
│   ├── snap/                       # (prompts for snap if needed)
│   ├── shared/                     # Cross-command prompts
│   │   ├── implementer-prompt.md
│   │   ├── spec-reviewer-prompt.md
│   │   ├── code-reviewer-prompt.md
│   │   ├── dispatching-parallel-agents.md
│   │   ├── executing-plans.md
│   │   └── receiving-code-review.md
│   └── reference/                  # Source-layer: organized by origin
│       ├── openspec/
│       │   ├── proposal-instruction.md
│       │   ├── specs-instruction.md
│       │   ├── design-instruction.md
│       │   └── tasks-instruction.md
│       └── superpowers/
│           ├── brainstorming-original.md
│           ├── writing-plans-original.md
│           ├── tdd-original.md
│           ├── systematic-debugging-original.md
│           ├── anthropic-best-practices.md
│           ├── testing-anti-patterns.md
│           └── ... (all supporting materials)
├── schemas/
│   └── specpower/schema.yaml       # Artifact dependency definitions
└── templates/
    ├── proposal.md
    ├── spec.md
    ├── design.md
    └── tasks.md
```

**Cross-command prompts policy**: Prompts used by multiple commands (TDD, verification) are maintained as independent copies per command directory, each customized for its execution context. No symlinks or shared files — each copy can evolve independently.

### D5: User project directory named `specpower/`

**Choice**: When specPower is initialized in a user project, the specs/changes directory is `specpower/` (not `openspec/`). Change metadata files are `.specpower.yaml`.

**Why**: Brand consistency. Users installed specPower, not OpenSpec. Seeing `openspec/` in their project would be confusing.

**Structure in user projects**:
```
my-project/
├── specpower/
│   ├── changes/          # Active changes
│   ├── specs/            # Main specs (Source of Truth)
│   ├── config.yaml       # Project context, rules
│   └── archive/          # Archived changes
└── .claude/
    ├── skills/specpower-*/SKILL.md
    ├── commands/specpower/
    └── specpower/        # prompts, schemas, templates
```

### D6: Superpowers full integration — rewrite, not copy

**Choice**: All 14 Superpowers SKILL.md files + 3 subagent prompts + all supporting reference materials are included in specPower. Content is **rewritten** to specPower style (naming, paths, next-step references) while preserving original logic exactly.

**Integration map**:

| Superpowers skill | specPower destination | Type |
|---|---|---|
| brainstorming | prompts/refine/brainstorm.md | Command prompt |
| writing-plans | prompts/build/phase-a-plan.md | Command prompt |
| subagent-driven-development | prompts/build/phase-b-execute.md | Command prompt |
| using-git-worktrees | prompts/build/phase-b-worktree.md | Command prompt |
| test-driven-development | prompts/build/ + prompts/test/ | Shared |
| requesting-code-review + code-reviewer | prompts/review/ | Command prompt |
| systematic-debugging | prompts/fix/debug.md | Command prompt |
| verification-before-completion | prompts/test/ + prompts/verify/ | Shared |
| finishing-a-development-branch | prompts/done/branch-finish.md | Command prompt |
| dispatching-parallel-agents | prompts/shared/ | Shared utility |
| executing-plans | prompts/shared/ | Shared utility |
| receiving-code-review | prompts/shared/ | Shared utility |
| using-superpowers | prompts/reference/superpowers/ | Reference only |
| writing-skills | prompts/reference/superpowers/ | Reference only |

**Rewrite rules**:
- Skill name references: `brainstorming` → `specpower:refine`
- Path references: `docs/superpowers/specs/` → `openspec/changes/<name>/`
- Next-step invocations: "Invoke writing-plans skill" → "Proceed to specpower:build"
- All internal cross-references updated to specPower equivalents
- Logic, hard gates, fail-stops, verification requirements preserved exactly

### D7: Scan via code-review-graph

**Choice**: `/specpower:scan` uses code-review-graph (npm dependency) to analyze codebase structure, then converts the analysis output into OpenSpec specs format.

**Why**: Code analysis is a hard problem. Rather than building a custom AST parser for every language, leverage an existing tool that generates structured project knowledge. SpecPower's value-add is converting that knowledge into actionable specs.

**Install**: code-review-graph included as a dependency in specPower's package.json.

### D8: Dual delivery — plugin + .claude/ embed

**Choice**: SpecPower supports two usage modes:
1. **As installed CLI + generated skills**: `npm install -g specpower && specpower init` (recommended)
2. **As direct .claude/ embed**: Copy skills and commands directly into a project's `.claude/` directory (for users who can't or don't want to install globally)

**Why**: Plugin marketplace installation is convenient but introduces a loading layer. Direct `.claude/` embed is maximally deterministic. Supporting both gives users choice.

### D9: Strict user confirmation mode

**Choice**: Every task in `specpower:build` completes with a review summary and waits for user confirmation before proceeding to the next task.

**Confirmation points across workflow**:
1. `scan` → scan results confirmation
2. `plan` → proposal direction confirmation
3. `refine` → approach selection (2-3 options) + final design confirmation
4. `build` Phase A → task plan confirmation
5. `build` Phase B → per-task review result + user confirmation
6. `review` → critical issues require confirmation
7. `done` → 4 options (merge/PR/keep/discard)

### D10: Responsibility boundaries

**Choice**: Clear three-layer separation:
- **CLI** (`specpower` binary) = deterministic state machine: change CRUD, artifact status, delta merge, validation, scan. No AI involvement.
- **SKILL.md orchestrators** = interaction choreography: stage routing via Read instructions, user confirmation gates, hard gates. ~50-100 lines each.
- **Prompt files** (`.claude/specpower/prompts/`) = execution instructions: what AI should do at each stage. Loaded on-demand via Read.
- **AI** (Claude Code) = content generation: writes proposals, specs, designs, tasks, code, tests. Guided by prompts.

### D11: Hard gates — dual enforcement

**Choice**: Hard gates (e.g., "no code before design approval", "no completion claims without verification") are enforced at **both** layers:
1. **Orchestrator SKILL.md**: Controls flow — will not issue Read for next stage until gate condition met (e.g., user confirmation received)
2. **Prompt files**: Each prompt opens with its gate rules repeated, providing defense-in-depth if context drifts

**Why both**: Orchestrator is the primary barrier (structural). Prompt repetition is the backup (if Claude's context gets polluted or instructions blur across stages). Belt and suspenders.

### D12: CLI resource location — project-local

**Choice**: `specpower init` copies schemas and templates to `.claude/specpower/schemas/` and `.claude/specpower/templates/` in the user project. CLI reads from these local paths at runtime.

**Why over global-install path**: Project-local copies allow users to customize schemas or templates per project. No dependency on global install path resolution.

## Risks / Trade-offs

**[Port maintenance burden]** → 2800 lines of TypeScript ported from OpenSpec will diverge from upstream. Mitigation: This is intentional — specPower owns its runtime. Version-pinned extraction with clear attribution.

**[Progressive loading reliability]** → Claude Code must successfully Read and follow multi-file prompts across stages. Mitigation: Each stage is self-contained with clear entry/exit criteria. If a Read fails, the orchestrator SKILL.md has fallback instructions.

**[Large reference files]** → `anthropic-best-practices.md` is 45KB. Loading it consumes significant context. Mitigation: Only loaded on-demand when the writing-skills reference is needed, not during normal user workflows.

**[code-review-graph dependency]** → Adds a runtime dependency. Mitigation: Only needed for scan command. Other commands work without it.

**[CLI + plugin coherence]** → Must keep CLI behavior and SKILL.md instructions in sync. Mitigation: SKILL.md files call CLI commands for complex operations, so they're always aligned.

## Open Questions

- **CLI command naming**: Exact command structure for specpower CLI (to be designed during implementation)
- **code-review-graph output format**: Need to verify what output format it produces and how to map to OpenSpec specs
- **Plugin marketplace**: Should specPower register on Claude Code marketplace for V1, or start with manual installation only?
