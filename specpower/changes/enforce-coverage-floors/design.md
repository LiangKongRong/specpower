# Design: enforce-coverage-floors

## 1. Context

`specpower` governs test planning for **projects developed with specpower** via the `test-planning` baseline spec. The baseline currently encodes an *old* contract: failure-admitting is a keyword heuristic, the test-plan-missing case is a warning, and there is no `[testable]`/`[negative]`/`branch:`/`covers:` contract and no measured branch-coverage gate. The recent `feat(coverage)` + `feat(validation)` change already shipped the *new* mechanism (explicit markers, distinct-`branch:` 30% floor, `covers:` + `coverage-attribution` CLI measuring a 75% gate), but the baseline spec that governs developed code was never updated. So projects developed under specpower still see the old (weaker, advisory) contract.

This change is **spec-only**: the product mechanism already exists in `src/` (shipped + tested in the prior change). This change encodes the shipped contract into the `test-planning` baseline + adds a `coverage-attribution` capability spec, so developed-code obligations are contractual, not advisory.

## 2. Goals / Non-Goals

**Goals:**
- Encode the `[testable]`/`[negative]` structural floor (≥1 `[negative]` scenario per `[testable]` Requirement) as a tested Requirement in `test-planning`.
- Encode the 30% distinct-`branch:` negative ratio + `duplicate-branch`/`missing-branch-tag` as a tested Requirement.
- Encode the 75% branch gate (verify Pass 5 `coverage-attribution`, overall + per-Scenario) as a tested Requirement.
- Encode build Phase B B2b running `specpower validate` as a tested Requirement (so the 30% floor cannot be skipped by omitting verify).
- Add a `coverage-attribution` capability spec for the new CLI (overall gate, per-Scenario attribution, format support).

**Non-Goals:**
- No product-code changes (mechanism already shipped).
- No new CI wiring for specpower's own repo (the prior change already set thresholds 75 + CI `test:cov`).
- No migration of existing archived changes' test-plans to the new `branch:`/`covers:` format (legacy projects are covered by the `--overall` aggregate gate without markers).
- Not closing the honest gaps: opt-in `[testable]` blind spot, file-level (not per-test) attribution, aggregate-masking. These are documented as scope, not fixed here.

## 3. Design Decisions

### D1: `test-planning` as MODIFIED vs new capability

**Options considered:**
- (A) MODIFIED `test-planning`: update the existing `scenario→Case coverage` + `validation integration` requirements in place.
- (B) New capability `coverage-floors`: add the 30%/75% contract as a separate capability, leave `test-planning` untouched.

**Chosen:** (A) MODIFIED `test-planning`.

**Rationale:** the 30%/75% floors ARE the test-planning contract — splitting them into a separate capability would leave `test-planning` describing the old (advisory, heuristic) contract while a new capability describes the real one, creating contradictory governance. MODIFIED keeps one source of truth. (B) would also orphan the old `scenario→Case coverage` requirement describing keyword heuristics that no longer exist.

### D2: `coverage-attribution` as a new ADDED capability

**Options considered:**
- (A) ADDED `coverage-attribution`: its own capability spec for the CLI.
- (B) Fold the CLI into `test-planning` as another MODIFIED requirement.

**Chosen:** (A) ADDED.

**Rationale:** `coverage-attribution` is a distinct, independently testable CLI capability (overall gate + per-Scenario attribution + format parsing), not a test-plan-structure concern. It has its own scenarios (aggregate threshold, masking, `lowFiles`, format support, `0`-vs-`-` branch counting) that don't belong in `test-planning`. Keeping it separate lets `test-planning` reference it ("verify Pass 5 measures via `coverage-attribution`") without duplicating its contract.

### D3: Honest-scope statements inside the spec, not just docs

**Options considered:**
- (A) Encode honest limitations (opt-in `[testable]` blind spot, aggregate-masking, file-level attribution) as scenarios/notes inside the spec itself.
- (B) Keep the spec normative-only; document limitations in SKILL.md / design only.

**Chosen:** (A) — encode a "low-coverage file masked by high-coverage files is surfaced (not failed)" scenario in the `coverage-attribution` spec, and state the opt-in nature in `test-planning`.

**Rationale:** the limitations are part of the contract a developed project accepts. Hiding them in docs lets a project believe "75% gate = every branch covered", which is false. A spec scenario stating "masked files are surfaced as `lowFiles`, not failed" makes the floor-vs-ceiling distinction contractual.

### D4: MODIFIED requirement heading stability (no `[testable]` added)

**Options considered:**
- (A) Keep MODIFIED requirement headings verbatim (no `[testable]` added), because archive matches names by exact string.
- (B) Add `[testable]` to the MODIFIED headings to signal they're now testable.

**Chosen:** (A).

**Rationale:** the archive name-matching constraint is real and already documented in `specs.md`. Adding `[testable]` to `### Requirement: scenario→Case coverage` would break archiving (the baseline heading lacks it). The `[testable]` mark is added only on ADDED requirements. This is a constraint, not a choice — recorded so refine doesn't "fix" it and break archive.

### D5: validate capability filtering for multi-capability test-plans

**Options considered:**
- (A) `validate <spec>` filters test-plan Cases to the spec's capability (inferred from the spec path `.../specs/<capability>/spec.md`), so cross-capability Cases don't dangle.
- (B) Keep validate unfiltered; require each change's test-plan to be single-capability (split multi-capability changes into one test-plan per capability — but test-plan is a single change-level file).
- (C) Make `checkCoverage` match Cases to Scenarios by `capability` field (parseTestPlan already captures it) instead of by scenario-name globally.

**Chosen:** (A).

**Rationale:** test-plan is a single change-level file that legitimately spans multiple capabilities (this change has `coverage-attribution` + `test-planning`). (B) would force an unnatural split. (C) changes the core matching semantics and risks single-capability regressions. (A) is the smallest change at the validate boundary: infer capability from the spec path, filter Cases to that capability before `checkCoverage`. Single-capability test-plans are unaffected (the filter is a no-op when all Cases match). This was surfaced in refine (Round 1, Behavior #4 scope check): the plan framed the change as "spec-only" but the multi-capability dangling gap is a contract-execution defect that must ship with this change — a test-plan that cannot validate multi-capability changes blocks the very contract this change encodes.

## 4. Risks / Trade-offs

- **Spec drift from shipped mechanism:** the spec describes behavior implemented in `feat(coverage)`/`feat(validation)`. If that code is later refactored, the spec could drift. Mitigation: the shipped code has tests (354 green) pinning the behavior; spec scenarios mirror those tests' assertions.
- **Opt-in `[testable]` blind spot remains contractual:** a project can still skip `[testable]` marking and evade the 30% floor. The `--overall` aggregate gate (75%) covers legacy/unmarked projects, but the 30% floor specifically is opt-in. This is an accepted scope limit, documented in the spec, not fixed here.
- **Aggregate-masking:** overall 75% can pass with a 0% file masked. Mitigation: `lowFiles` surfaces masked files; per-Scenario attribution (Step 1) catches local gaps when `covers:` is filled. Both are encoded as scenarios.

## 5. Migration Plan

N/A — spec-only change. Developed projects using a specpower CLI with the new validator (`≥ this branch`) are governed by the new contract on their next change; legacy archived changes' test-plans (no `branch:`/`covers:`) remain valid and are covered by the `--overall` gate without markers.

## 6. Open Questions

None at this stage — the mechanism is shipped and tested; this change only encodes the contract. Refine may challenge whether `coverage-attribution` should additionally specify a `--json` output mode for CI consumption, but that is a future capability question, not a blocker for this spec.
