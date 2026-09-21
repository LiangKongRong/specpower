# enforce-coverage-floors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use specpower:build Phase B (recommended) or specpower:build Phase B (inline mode) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode the 30%-exception / 75%-branch coverage contract into the `test-planning` baseline spec + add a `coverage-attribution` capability spec, and ship the `validate <spec>` capability-filter fix that makes multi-capability test-plans validate correctly.

**Architecture:** Spec-only change (the coverage/validation mechanism shipped in `feat(coverage)`/`feat(validation)`); plus one small product-code fix to `validate.ts` (capability filtering). Most spec/test-plan artifacts are already authored in plan/refine — Phase B verifies them and adds test coverage for the validate fix.

**Tech Stack:** TypeScript, vitest, specpower CLI (local `node dist/cli/index.js` — the global published `specpower` 0.2.3-8 predates the new validator).

---

### Task 1: Verify coverage-attribution spec validates

**Files:**
- Verify: `specpower/changes/enforce-coverage-floors/specs/coverage-attribution/spec.md` (already authored)

- [ ] **Step 1: Run validate on the coverage-attribution spec**

Run: `node dist/cli/index.js validate specpower/changes/enforce-coverage-floors/specs/coverage-attribution/spec.md`
Verify: stdout contains `Valid: no errors or warnings found.` (exit 0)

- [ ] **Step 2: Confirm [testable]/[negative] markers accepted**

Run: `grep -c "\[testable\]" specpower/changes/enforce-coverage-floors/specs/coverage-attribution/spec.md`
Verify: prints `3` (three `[testable]` requirements: overall gate, per-Scenario attribution, report format support)

Run: `grep -c "\[negative\]" specpower/changes/enforce-coverage-floors/specs/coverage-attribution/spec.md`
Verify: prints `10` (eight `[negative]` scenarios + the `[negative]` markers in the spec body)

> Non-testable task: this task only runs validation against an already-authored spec file. No failing-test-then-pass TDD evidence applies — the spec is the artifact, validated structurally.

- [ ] **Step 3: Commit verification**

```bash
git add specpower/changes/enforce-coverage-floors/specs/coverage-attribution/spec.md
git commit -m "spec(coverage-attribution): ADDED capability spec for 75% gate + per-Scenario attribution"
```
Verify: `git log -1 --oneline` shows the new commit

---

### Task 2: Verify test-planning MODIFIED spec validates

**Files:**
- Verify: `specpower/changes/enforce-coverage-floors/specs/test-planning/spec.md` (already authored)

- [ ] **Step 1: Run validate on the test-planning spec**

Run: `node dist/cli/index.js validate specpower/changes/enforce-coverage-floors/specs/test-planning/spec.md`
Verify: stdout contains `Valid: no errors or warnings found.` (exit 0)

- [ ] **Step 2: Confirm MODIFIED headings match baseline (no [testable] added)**

Run: `grep "^### Requirement:" specpower/changes/enforce-coverage-floors/specs/test-planning/spec.md`
Verify: prints exactly two headings, neither containing `[testable]`:
  - `### Requirement: scenario→Case coverage`
  - `### Requirement: validation integration`

- [ ] **Step 3: Commit verification**

```bash
git add specpower/changes/enforce-coverage-floors/specs/test-planning/spec.md
git commit -m "spec(test-planning): MODIFIED scenario→Case coverage + validation integration for 30%/75% floors"
```
Verify: `git log -1 --oneline` shows the new commit

---

### Task 3: Verify test-plan self-compliance (30% floor + 75% gate)

**Files:**
- Verify: `specpower/changes/enforce-coverage-floors/test-plan.md` (already authored)

- [ ] **Step 1: Validate both specs against the test-plan (capability filtering)**

Run: `node dist/cli/index.js validate specpower/changes/enforce-coverage-floors/specs/coverage-attribution/spec.md`
Verify: `Valid: no errors or warnings found.` (no cross-capability dangling)

Run: `node dist/cli/index.js validate specpower/changes/enforce-coverage-floors/specs/test-planning/spec.md`
Verify: `Valid: no errors or warnings found.`

- [ ] **Step 2: Confirm no 30%-floor violations (no low-negative-ratio/duplicate-branch)**

Run: `node dist/cli/index.js validate specpower/changes/enforce-coverage-floors/specs/coverage-attribution/spec.md 2>&1 | grep -E "low-negative-ratio|duplicate-branch|missing-branch"`
Verify: prints nothing (no 30% floor violation — every `[negative]` Case has a distinct `branch:` tag, ratio ≥30%)

- [ ] **Step 3: Confirm 75% overall gate passes on specpower's own coverage**

Run: `node dist/cli/index.js coverage-attribution --overall --threshold 75`
Verify: stdout contains `PASS — overall branch coverage` and `>= 75%` (exit 0)

- [ ] **Step 4: Commit verification**

```bash
git add specpower/changes/enforce-coverage-floors/test-plan.md
git commit -m "test(enforce-coverage-floors): self-compliant test-plan (32 cases, 30% floor + 75% gate)"
```
Verify: `git log -1 --oneline` shows the new commit

---

### Task 4: Write failing test for validate capability filtering

**Files:**
- Create: `test/cli/validate-capability-filter.test.ts`
- Modify: `src/cli/commands/validate.ts` (already has `inferCapability` + filter; this task adds test coverage for it)

- [ ] **Step 1: Write the failing test**

Create `test/cli/validate-capability-filter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateSpecFile } from '../../../src/cli/commands/validate.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('validate capability filtering (multi-capability test-plan)', () => {
  it('does not report cross-capability Cases as dangling [cap-filter-T1]', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cap-filter-'));
    const changeDir = join(root, 'specpower', 'changes', 'multi-cap');
    const specsDir = join(changeDir, 'specs');
    // Two capabilities, each with one Scenario; test-plan has Cases for BOTH.
    mkdirSync(join(specsDir, 'cap-a'), { recursive: true });
    mkdirSync(join(specsDir, 'cap-b'), { recursive: true });
    writeFileSync(join(specsDir, 'cap-a', 'spec.md'),
      ['## ADDED Requirements', '', '### Requirement: Req A [testable]', 'desc', '',
       '#### Scenario: scen-a [negative]', '- **WHEN** bad', '- **THEN** reject', ''].join('\n'));
    writeFileSync(join(specsDir, 'cap-b', 'spec.md'),
      ['## ADDED Requirements', '', '### Requirement: Req B [testable]', 'desc', '',
       '#### Scenario: scen-b [negative]', '- **WHEN** bad', '- **THEN** reject', ''].join('\n'));
    writeFileSync(join(changeDir, '.specpower.yaml'), 'schema: specpower\nphase: built\n');
    // test-plan spans BOTH capabilities — without filtering, cap-b's Case dangles when validating cap-a.
    writeFileSync(join(changeDir, 'test-plan.md'),
      ['## Capability: cap-a', '',
       '### Requirement: Req A → Scenario: scen-a', '',
       '- **Case** T1: reject bad [negative]', '  - Input: bad()',
       '  - Expected: reject', '  - it(): reject bad', '  - branch: reject-bad', '',
       '## Capability: cap-b', '',
       '### Requirement: Req B → Scenario: scen-b', '',
       '- **Case** T2: reject bad b [negative]', '  - Input: badb()',
       '  - Expected: reject', '  - it(): reject bad b', '  - branch: reject-bad-b', ''].join('\n'));
    try {
      // Validating cap-a's spec must NOT flag cap-b's Case T2 as dangling.
      const res = await validateSpecFile(join(specsDir, 'cap-a', 'spec.md'));
      expect(res.valid).toBe(true);
      expect(res.errors.some((e) => /dangling/i.test(e.message))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('single-capability test-plan is unaffected (filter is no-op) [cap-filter-T2]', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cap-filter-single-'));
    const changeDir = join(root, 'specpower', 'changes', 'single-cap');
    const specsDir = join(changeDir, 'specs');
    mkdirSync(join(specsDir, 'cap-a'), { recursive: true });
    writeFileSync(join(specsDir, 'cap-a', 'spec.md'),
      ['## ADDED Requirements', '', '### Requirement: Req A [testable]', 'desc', '',
       '#### Scenario: scen-a [negative]', '- **WHEN** bad', '- **THEN** reject', ''].join('\n'));
    writeFileSync(join(changeDir, '.specpower.yaml'), 'schema: specpower\nphase: built\n');
    writeFileSync(join(changeDir, 'test-plan.md'),
      ['## Capability: cap-a', '',
       '### Requirement: Req A → Scenario: scen-a', '',
       '- **Case** T1: reject bad [negative]', '  - Input: bad()',
       '  - Expected: reject', '  - it(): reject bad', '  - branch: reject-bad', ''].join('\n'));
    try {
      const res = await validateSpecFile(join(specsDir, 'cap-a', 'spec.md'));
      expect(res.valid).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm it passes (implementation already shipped)**

Run: `npx vitest run test/cli/validate-capability-filter.test.ts`
Verify: `2 passed` (exit 0) — the `inferCapability` + filter already shipped in `validate.ts`, so the test passes immediately. This is NOT a TDD red→green; the implementation predated this change's test. **TDD gate exemption:** the product code (`inferCapability` + filter) was written during the plan phase as a necessary contract-execution fix (a multi-capability test-plan could not validate otherwise, blocking the very contract this change encodes). This task adds the regression test that pins that behavior. State the exemption explicitly in the task output: implementation predated the test (ship-fix-then-pin), not TDD red→green.

- [ ] **Step 3: Run full suite to confirm no regression**

Run: `npx vitest run`
Verify: `356 passed` (354 + 2 new) (exit 0)

- [ ] **Step 4: Commit**

```bash
git add test/cli/validate-capability-filter.test.ts
git commit -m "test(validate): capability filtering for multi-capability test-plans (regression pin)"
```
Verify: `git log -1 --oneline` shows the new commit

---

### Task 5: Run build B2b validate hard gate on the change's specs

**Files:**
- Verify: both spec files (already authored)

- [ ] **Step 1: Run validate on both specs (B2b hard gate)**

Run: `node dist/cli/index.js validate specpower/changes/enforce-coverage-floors/specs/coverage-attribution/spec.md`
Verify: `Valid: no errors or warnings found.` (no `low-negative-ratio`/`missing-negative`/`duplicate-branch` errors)

Run: `node dist/cli/index.js validate specpower/changes/enforce-coverage-floors/specs/test-planning/spec.md`
Verify: `Valid: no errors or warnings found.`

> Non-testable task: this is the B2b validate hard gate check — structural validation of specs, no product-runtime behavior to TDD.

- [ ] **Step 2: Confirm overall coverage gate still green**

Run: `npx vitest run --coverage 2>&1 | grep -E "All files|Branches"`
Verify: `All files` line shows branches ≥75%, and `Branches:` line ≥75% (thresholds raised to 75 in the prior change)

- [ ] **Step 3: No commit (verification-only task)**

Verify: no file changes; `git status --short` shows only the already-committed artifacts

---

## Rewrite summary

```
Group 1 "coverage-attribution spec": 3 coarse → 1 atomic (verify, already authored)
Group 2 "test-planning spec": 4 coarse → 1 atomic (verify, already authored)
Group 3 "test-plan self-compliance": 4 coarse → 1 atomic (verify 30% + 75%)
Group 4 "validate capability-filter fix": 3 coarse → 1 atomic (write regression test + pin)
Group 5 "B2b validate hard gate": 2 coarse → 1 atomic (verify gate)
Total: 5 coarse groups → 5 atomic tasks
```

Groups added: none. Groups removed: none (coarse groups 1-5 reorganized into 5 atomic verify/test tasks reflecting that most work shipped in plan/refine). Groups renamed: none.
