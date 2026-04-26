---
name: specpower-scan
description: "[PLANNED v0.3] Brownfield project scanner -- not yet functional"
---

# SpecPower: Scan (Planned — v0.3)

> **NOT YET FUNCTIONAL.** The `specpower scan` CLI subcommand does not exist in v0.2.x. Invoking this skill would immediately fail when it tries to run `specpower scan`. The skill is kept registered so its slot is reserved in the command namespace; the implementation is planned for v0.3.

## Behavior in v0.2.x

If the user triggers `/specpower:scan`, do NOT attempt to run `specpower scan` (the CLI will return an unknown-command error). Instead respond:

> "`/specpower:scan` is planned for v0.3 and not yet implemented in v0.2.x. For a brownfield project that has no `specpower/specs/` baseline yet, the workable alternative today is:
>
> 1. Run `specpower init` if not already done (sets up `.claude/skills/` and `.specpower/`).
> 2. Identify one capability area you are about to change (e.g. `user-auth`, `billing`).
> 3. Run `/specpower:plan \"<your change description>\"` directly. In the proposal Q&A, describe the existing behavior in the affected area — plan will generate both the delta spec for your change and an implicit first pass at the capability's contract. After the first archive, the delta becomes the main spec baseline for that capability.
>
> This is not a perfect substitute for a full code scan, but it keeps the spec-driven flow moving without waiting for v0.3."

Then stop. Do not proceed to any Stage 1/2/3 behavior below — those describe the planned v0.3 flow.

## Planned design (v0.3) — for reference, not currently executable

### Planned Stage 1: Execute Scan

Run `specpower scan` against the target project. If `--module` flag is provided, read `.claude/specpower/prompts/shared/dispatching-parallel-agents.md` and scan modules in parallel; otherwise run a single pass.

### Planned Stage 2: Present Results

Scan produces `specpower/SCAN_REPORT.md`. Present a summary highlighting detected modules, identified specs and coverage gaps, and suggested next actions.

### Planned Gate: User Confirmation

Ask the user to confirm the scan results. Do NOT proceed until explicit confirmation. Confirmed results become the Source of Truth for all downstream commands.

### Planned Stage 3: Finalize

Once confirmed, the scan results are locked and the user can run `/specpower:plan` to begin requirements planning.

The v0.3 design rationale, scope, and risks will be captured in a dedicated `openspec` change at v0.3 planning time.
