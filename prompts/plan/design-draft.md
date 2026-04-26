> **HARD GATE — READ THIS FIRST.** This is the **first iteration of deep design analysis**, NOT a placeholder skeleton and NOT a template to fill in later. If your output is "TBD", "to be decided in refine", empty bullets, or boilerplate section headers with no substance, you have failed this task. The refine phase will deepen and challenge this design — but it needs substantive material to challenge. Stub-quality output wastes the refine pass.

# Plan Phase: First-Iteration Design Draft

## Purpose

Generate a substantive `design.md` representing your **first round of deep thinking** on this change. This is v1 of the design — refine will produce v2 by challenging assumptions, proposing alternative options, probing edge cases, and questioning scope. Your job here is to give refine something real to work with.

## Inputs You Must Read

- `specpower/changes/<change-name>/proposal.md` — the approved proposal
- `specpower/changes/<change-name>/specs/<capability>/spec.md` — all delta specs
- `specpower/specs/` (if it exists) — current main specs for conflict awareness
- The codebase itself — read enough files to understand what exists today

## Reference Example (IMPORTANT)

**Before you start writing, read this example for structural and depth guidance:**

`.claude/specpower/prompts/reference/specpower/example-design.md`

That example is the archived design from the `create-specpower-plugin` change. Note specifically:

- Each Decision has a **name**, multiple **Options considered** with trade-offs, a **Chosen** option, and a **Rationale** tying the choice back to the goals
- Goals and Non-Goals are **specific to that change** (not generic software engineering platitudes)
- Risks are **tied to the actual change** (port maintenance burden, progressive loading reliability, dependency cost) — not generic project management risks
- Open Questions are concrete ("Should we register on marketplace for V1?") — not filler

**Use the example as a quality bar, NOT as a content template to copy.** Your change is different; your decisions, risks, and goals are different. Match the **depth and format**, not the words.

## What To Produce

Generate `design.md` with the following sections. Each section has specific instructions — follow them literally.

### 1. Context

Describe what exists today and why this change is needed. Include:

- Relevant subsystems and their current state
- Technical constraints (language, platform, existing patterns)
- Why now — what forces this change

Not a place for "we want to build feature X." That belongs in the proposal. Context is the **technical landscape** the change lands in.

### 2. Goals / Non-Goals

**Identify the real Goals and Non-Goals of THIS change specifically.**

- Goals: tied to success criteria from the proposal, but technically stated ("port 6 OpenSpec modules" — not "make the CLI better")
- Non-Goals: explicit scope exclusions that a reasonable reader might assume are included ("not supporting non-Claude-Code AI tools in V1" — not generic "we will not boil the ocean")

Generic goals like "maintainable code" or "good performance" are **not Goals** — those are engineering defaults. Only list Goals that are distinctive to this change.

### 3. Design Decisions

**Identify the real architectural decisions this change requires** — i.e., identify real branch points, not imagined ones. For each decision:

1. Give it a clear name (e.g., "D1: Unified npm package with CLI + plugin")
2. List **Options considered** — at least 2, usually 3. Each option with its trade-offs.
3. State **Chosen** — which option you're recommending
4. Give **Rationale** — the reasoning tying your chosen option to the Goals. Every decision needs its rationale spelled out.

**Find the decisions that actually branch.** Don't invent decisions where there's no real choice. Don't skip decisions because "the answer is obvious" — write it down with the options considered and the rationale for why it's obvious.

Signals that you've found a real decision:
- "We could do X or Y, and both have real costs"
- "The naive approach is X, but it breaks when Z"
- "The proposal implies X but there's a tension with Y"

If during this first iteration you are genuinely uncertain about an option, **mark the decision `(plan-phase analysis, may revise in refine)`**. Honesty about uncertainty is better than false certainty — refine exists precisely to close these gaps. Do NOT use this marker as an escape hatch for every decision; use it only where you actually lack information.

### 4. Risks / Trade-offs

**Identify specific risks tied to THIS change.** Each risk should:
- Be concrete enough that a reader can imagine it materializing
- Include a mitigation (what reduces likelihood or impact)

**Avoid generic risks** like "schedule delay", "scope creep", "team availability", "technical debt", "unknown unknowns" — unless the risk is genuinely tied to this change (e.g., "scope creep because spec has 7 capabilities that could each justify a separate change"). If a risk applies to every software project, it's not a design risk — it's a project management concern.

Good risks look like: "Port maintenance burden — 2800 lines diverging from upstream OpenSpec." Bad risks look like: "Delays may occur if the team is busy."

### 5. Migration Plan (if applicable)

If the change affects existing users, data, configs, or APIs, describe the migration path. If it's greenfield, you may write "N/A — greenfield change" and move on. Don't write a placeholder migration for a greenfield change.

### 6. Open Questions

List specific questions you genuinely cannot answer from proposal + specs + code alone. These will be addressed in refine. Examples:

- "Exact CLI command naming — to be designed during implementation"
- "Should we support operation X or defer to a future change?"

If you have no real open questions, write "None at this stage" rather than inventing filler.

## Quality Is Not Quantity-Gated

There is **no minimum number** of decisions, risks, or open questions. Two well-argued decisions are better than five shallow ones. The user reviewing the design is the quality judge, not a counter.

What matters:
- Decisions trace to real architectural branches
- Options have honest trade-offs, not strawmen
- Rationale ties to Goals
- Risks are specific and mitigable
- The reader finishes the document knowing **how** you'd build this, not just **what**

## Save and Proceed

Save the document to:

```
specpower/changes/<change-name>/design.md
```

**Do NOT ask the user to confirm this draft at this stage.** The end-of-plan summary (handled by the orchestrating SKILL) will present all four plan-phase artifacts together for one cohesive user review. Write the best first-iteration design you can, save it, and move on to the next plan-phase artifact.

## Remember

- First iteration, not placeholder
- Substance over structure — skip sections with "N/A" rather than fake-filling them
- Reference example is a depth guide, not a copy target
- Honest uncertainty > false certainty — use the `(plan-phase analysis, may revise in refine)` marker when genuinely uncertain
- No quantity gates — quality is judged by user review
- No confirmation gate here — the SKILL handles overall plan-phase review
