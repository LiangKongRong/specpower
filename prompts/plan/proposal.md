> **HARD GATE**: User must confirm the proposal direction before proceeding to spec generation. Do NOT generate delta specs until the user has reviewed and approved the proposal.

# Proposal Generation

Generate a proposal document following the specPower format. The proposal establishes WHY a change is needed and WHAT it affects.

## Process

### Step 1: Baseline Awareness

Check if `specpower/specs/` exists and contains spec files:

```bash
ls specpower/specs/ 2>/dev/null
```

**If specs exist:**
1. List all existing spec files
2. Identify which specs may be affected by the proposed change
3. Note potential conflicts or dependencies
4. Report: "Found N existing specs. The following may be affected: [list]"

**If no specs exist:**
- This is a greenfield change; note that no baseline specs need to be considered

### Step 2: Gather Proposal Information

Ask the user (one question at a time):

1. **What is the change?** — One sentence summary
2. **Why is this needed?** — Motivation and context
3. **What is the expected outcome?** — Success criteria
4. **What areas are affected?** — Components, modules, interfaces

### Step 3: Generate Proposal Document

**CRITICAL: Use the exact format below.** The `Capabilities` section creates the contract between proposal and specs phases — each capability listed here will need a corresponding spec file.

```markdown
## Why

<!-- 1-2 sentences on the problem or opportunity. What problem does this solve? Why now? -->

## What Changes

<!-- Bullet list of changes. Be specific about new capabilities, modifications, or removals. Mark breaking changes with **BREAKING**. -->

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Use kebab-case names (e.g., user-auth, data-export). Each creates specs/<name>/spec.md -->
- `<name>`: <brief description>

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing. Use existing spec names from specpower/specs/. Leave empty if no requirement changes. -->
- `<existing-name>`: <what requirement is changing>

## Impact

<!-- Affected code, APIs, dependencies, systems -->
```

**Requirements:**
- Keep concise (1-2 pages)
- Focus on "why" not "how" — implementation details belong in design.md
- Research existing specs before filling in the Capabilities section
- Use the exact section headings shown above (`## Why`, `## What Changes`, `## Capabilities`, `## Impact`)

### Step 4: Save and Present

Save to: `specpower/changes/<change-name>/proposal.md`

Present to user for review:

> "Proposal saved to `specpower/changes/<change-name>/proposal.md`. Please review the direction and affected areas. Once you confirm, I'll proceed to generate delta specs for each affected capability."

### Step 5: Gate — Wait for User Confirmation

**Do NOT proceed to spec generation until the user confirms.**

If the user requests changes, update the proposal and re-present.

## Next Step

Once approved, proceed to generate delta specs.
