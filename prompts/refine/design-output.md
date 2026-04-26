# Design Output Generation

Orchestration prompt for generating `design.md` from an approved proposal and delta specs.

## Overview

The design document captures architectural decisions, technical approach, and risk assessment for a change. It bridges the gap between "what" (specs) and "how" (implementation plan).

## Prerequisites

- Approved proposal at `specpower/changes/<change-name>/proposal.md`
- Delta specs at `specpower/changes/<change-name>/specs/`

## Process

### Step 1: Conflict Check Against Main Specs

If `specpower/specs/` exists:

1. Read all spec files in `specpower/specs/`
2. Read all delta specs in `specpower/changes/<change-name>/specs/`
3. Check for conflicts:
   - Do any delta spec scenarios contradict existing main spec scenarios?
   - Do any REMOVED items break dependencies in other specs?
   - Do any RENAMED items have references elsewhere that need updating?
4. Report findings:
   - **No conflicts:** Proceed to design
   - **Conflicts found:** List each conflict with the affected spec files and ask the user how to resolve before proceeding

### Step 2: Gather Design Context

Review:
- The codebase structure (files, architecture, patterns)
- The proposal's affected areas
- The delta spec scenarios that need to be supported
- Existing technical constraints

### Step 3: Generate Design Document

**Design document sections:**

```markdown
# Design: [Change Name]

**Date:** YYYY-MM-DD
**Proposal:** specpower/changes/<change-name>/proposal.md
**Delta Specs:** specpower/changes/<change-name>/specs/

## Context

[What exists today, why it needs to change, relevant technical background]

## Goals

- [Goal 1 -- tied to a success criterion from the proposal]
- [Goal 2]

## Non-Goals

- [Explicitly out of scope item 1]
- [Explicitly out of scope item 2]

## Design Decisions

### [Decision 1: e.g., "Data Storage Approach"]

**Options considered:**
1. [Option A] -- [trade-offs]
2. [Option B] -- [trade-offs]
3. [Option C] -- [trade-offs]

**Chosen:** [Option X]
**Rationale:** [Why this option best serves the goals]

### [Decision 2]
...

## Architecture

[High-level architecture description]

### Component Overview
- [Component 1]: [responsibility]
- [Component 2]: [responsibility]

### Data Flow
[How data moves through the system for key scenarios]

### Interfaces
[Key interfaces between components]

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [How to address] |
| [Risk 2] | ... | ... | ... |

## Spec Conflict Resolution
[If conflicts were found in Step 1, document how each was resolved]

## Open Questions
[Any remaining questions that need answers before implementation]
```

### Step 4: Save Design Document

Save to: `specpower/changes/<change-name>/design.md`

Commit the design document to git.

### Step 5: Present for Review

> "Design document saved to `specpower/changes/<change-name>/design.md`. Please review the decisions and architecture before we proceed to implementation planning."

## Principles

- **Decisions must have rationale** -- "we chose X" is not a decision; "we chose X because Y" is
- **Non-goals are as important as goals** -- explicitly state what you are NOT building
- **Risks are not optional** -- every design has risks; listing none means you haven't thought about it
- **Conflict resolution is mandatory** -- don't skip spec conflicts hoping they'll resolve themselves
- **Keep it proportional** -- a simple change gets a short design; a complex change gets a thorough one

## Next Step

Once the design is approved, invoke specpower:build Phase A to create the implementation plan.
