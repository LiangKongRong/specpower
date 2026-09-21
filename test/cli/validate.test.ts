import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSpecFile } from '../../src/cli/commands/validate.js';

describe('validateSpecFile', () => {
  it('returns valid result for a correct spec file', async () => {
    const tmpDir = await fs.mkdtemp(join(tmpdir(), 'validate-test-'));
    const specPath = join(tmpDir, 'valid.md');

    await fs.writeFile(
      specPath,
      [
        '## ADDED Requirements',
        '',
        '### Requirement: User Login',
        'The system SHALL authenticate users.',
        '',
        '#### Scenario: Successful login',
        '- **WHEN** user submits credentials',
        '- **THEN** system returns token',
      ].join('\n'),
      'utf-8',
    );

    const result = await validateSpecFile(specPath);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns invalid result with errors for a broken spec file [enforce-coverage-floors-T26]', async () => {
    const tmpDir = await fs.mkdtemp(join(tmpdir(), 'validate-test-'));
    const specPath = join(tmpDir, 'invalid.md');

    await fs.writeFile(
      specPath,
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Bad Feature',
        'Description.',
        '',
        '#### Scenario: Missing when',
        '- **THEN** something happens',
      ].join('\n'),
      'utf-8',
    );

    const result = await validateSpecFile(specPath);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('WHEN'))).toBe(true);
  });
});

describe('validate test-plan integration', () => {
  const withPlanSpec = join(
    import.meta.dirname,
    '..',
    'fixtures',
    'test-plan',
    'with-plan',
    'specs',
    'cap',
    'spec.md',
  );
  const withoutPlanSpec = join(
    import.meta.dirname,
    '..',
    'fixtures',
    'test-plan',
    'without-plan',
    'specs',
    'cap',
    'spec.md',
  );

  it('passes (valid) when a change has a covering test-plan.md [add-test-plan-artifact-T15] [enforce-coverage-floors-T22]', async () => {
    const res = await validateSpecFile(withPlanSpec);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('warns (not errors) when a testable change lacks test-plan.md [add-test-plan-artifact-T1] [enforce-coverage-floors-T13]', async () => {
    const res = await validateSpecFile(withoutPlanSpec);
    expect(res.valid).toBe(true);
    expect(res.warnings.some((w) => /test-plan/i.test(w.message))).toBe(true);
  });

  it('promotes the missing test-plan warning to an error under --strict [add-test-plan-artifact-T17] [enforce-coverage-floors-T28]', async () => {
    const res = await validateSpecFile(withoutPlanSpec, { strict: true });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /test-plan/i.test(e.message))).toBe(true);
  });

  it('does not flag baseline-regression refs as dangling when baseline specs exist [add-test-plan-artifact-T6]', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'validate-baseline-'));
    // baseline spec
    const baselineDir = join(root, 'specpower', 'specs');
    await fs.mkdir(baselineDir, { recursive: true });
    await fs.writeFile(
      join(baselineDir, 'cap.md'),
      [
        '### Requirement: Baseline Req',
        'System SHALL ...',
        '',
        '#### Scenario: existing baseline scenario',
        '- **WHEN** x',
        '- **THEN** y',
      ].join('\n'),
      'utf-8',
    );
    // change dir with delta spec + test-plan
    const changeDir = join(root, 'specpower', 'changes', 'c1');
    const deltaSpecsDir = join(changeDir, 'specs');
    await fs.mkdir(deltaSpecsDir, { recursive: true });
    await fs.writeFile(
      join(deltaSpecsDir, 'cap.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: New Req',
        'System SHALL new.',
        '',
        '#### Scenario: new scenario',
        '- **WHEN** a',
        '- **THEN** b',
      ].join('\n'),
      'utf-8',
    );
    await fs.writeFile(
      join(changeDir, '.specpower.yaml'),
      'schema: specpower\nphase: built\n',
      'utf-8',
    );
    await fs.writeFile(
      join(changeDir, 'test-plan.md'),
      [
        '## Capability: cap',
        '',
        '### Requirement: New Req → Scenario: new scenario',
        '',
        '- **Case** T1: covers new [positive]',
        '  - Input: do()',
        '  - Expected: ok',
        '  - it(): new case',
        '',
        '### Requirement: Baseline Req → Scenario: existing baseline scenario',
        '',
        '- **Case** T2: regression for baseline [positive]',
        '  - Input: do2()',
        '  - Expected: ok2',
        '  - it(): baseline regression',
      ].join('\n'),
      'utf-8',
    );

    const res = await validateSpecFile(join(deltaSpecsDir, 'cap.md'));
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('reports missing-negative when a [testable] requirement lacks a negative case', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'validate-neg-'));
    const changeDir = join(root, 'specpower', 'changes', 'c2');
    const deltaSpecsDir = join(changeDir, 'specs');
    await fs.mkdir(deltaSpecsDir, { recursive: true });
    await fs.writeFile(
      join(deltaSpecsDir, 'cap.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Neg Req [testable]',
        'System SHALL reject invalid input.',
        '',
        '#### Scenario: rejects invalid input [negative]',
        '- **WHEN** bad input',
        '- **THEN** system rejects',
      ].join('\n'),
      'utf-8',
    );
    await fs.writeFile(
      join(changeDir, '.specpower.yaml'),
      'schema: specpower\nphase: built\n',
      'utf-8',
    );
    // test-plan covers the scenario with a POSITIVE case only — no negative case
    await fs.writeFile(
      join(changeDir, 'test-plan.md'),
      [
        '## Capability: cap',
        '',
        '### Requirement: Neg Req → Scenario: rejects invalid input',
        '',
        '- **Case** T1: happy path [positive]',
        '  - Input: valid()',
        '  - Expected: ok',
        '  - it(): happy',
      ].join('\n'),
      'utf-8',
    );

    const res = await validateSpecFile(join(deltaSpecsDir, 'cap.md'));
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /no negative case/i.test(e.message))).toBe(true);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('errors when a [testable] requirement has zero [negative] scenarios [testable-negative-floor-T1] [enforce-coverage-floors-T9]', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'validate-testable-floor-'));
    const changeDir = join(root, 'specpower', 'changes', 'ctf');
    const deltaSpecsDir = join(changeDir, 'specs');
    await fs.mkdir(deltaSpecsDir, { recursive: true });
    // [testable] requirement with only positive scenarios → structural error
    // (not just a test-plan missing-negative; the spec itself is invalid)
    await fs.writeFile(
      join(deltaSpecsDir, 'cap.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Positive Only [testable]',
        'System SHALL accept valid input.',
        '',
        '#### Scenario: accepts valid input',
        '- **WHEN** valid input',
        '- **THEN** system accepts',
      ].join('\n'),
      'utf-8',
    );
    const res = await validateSpecFile(join(deltaSpecsDir, 'cap.md'));
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /\[testable\].*\[negative\]/i.test(e.message))).toBe(true);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('does NOT error when a [testable] requirement has a [negative] scenario [testable-negative-floor-T2]', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'validate-testable-ok-'));
    const changeDir = join(root, 'specpower', 'changes', 'ctok');
    const deltaSpecsDir = join(changeDir, 'specs');
    await fs.mkdir(deltaSpecsDir, { recursive: true });
    await fs.writeFile(
      join(deltaSpecsDir, 'cap.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: With Neg [testable]',
        'System SHALL reject invalid input.',
        '',
        '#### Scenario: accepts valid input',
        '- **WHEN** valid input',
        '- **THEN** system accepts',
        '',
        '#### Scenario: rejects invalid input [negative]',
        '- **WHEN** bad input',
        '- **THEN** system rejects',
      ].join('\n'),
      'utf-8',
    );
    const res = await validateSpecFile(join(deltaSpecsDir, 'cap.md'));
    expect(res.errors.some((e) => /\[testable\].*\[negative\]/i.test(e.message))).toBe(false);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('reports malformed-id Case lines in test-plan.md instead of silently dropping them [add-test-plan-artifact-T16]', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'validate-malformed-'));
    const changeDir = join(root, 'specpower', 'changes', 'c3');
    const deltaSpecsDir = join(changeDir, 'specs');
    await fs.mkdir(deltaSpecsDir, { recursive: true });
    await fs.writeFile(
      join(deltaSpecsDir, 'cap.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Demo Req',
        'System SHALL do something.',
        '',
        '#### Scenario: happy path',
        '- **WHEN** good input',
        '- **THEN** system works',
      ].join('\n'),
      'utf-8',
    );
    await fs.writeFile(
      join(changeDir, '.specpower.yaml'),
      'schema: specpower\nphase: built\n',
      'utf-8',
    );
    // test-plan with a malformed-id Case (X1 instead of T1) — silently dropped
    // by the parser, but the validator must surface it.
    await fs.writeFile(
      join(changeDir, 'test-plan.md'),
      [
        '## Capability: cap',
        '',
        '### Requirement: Demo Req → Scenario: happy path',
        '',
        '- **Case** X1: bad id [positive]',
        '  - Input: do()',
        '  - Expected: ok',
        '  - it(): bad case',
      ].join('\n'),
      'utf-8',
    );

    const res = await validateSpecFile(join(deltaSpecsDir, 'cap.md'));
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /malformed.*id/i.test(e.message))).toBe(true);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('low-negative-ratio error makes validate exit non-zero (build B2b gate equivalent) [enforce-coverage-floors-T27]', async () => {
    // build Phase B B2b runs `specpower validate`; a low-negative-ratio error
    // there fails the task. The equivalent machine check: validate reports the
    // error (non-valid). 1 distinct branch / 4 total cases = 25% < 30%.
    const root = await fs.mkdtemp(join(tmpdir(), 'validate-b2b-'));
    const changeDir = join(root, 'specpower', 'changes', 'b2b');
    const deltaSpecsDir = join(changeDir, 'specs');
    await fs.mkdir(join(deltaSpecsDir, 'cap'), { recursive: true });
    await fs.writeFile(join(deltaSpecsDir, 'cap', 'spec.md'),
      ['## ADDED Requirements', '', '### Requirement: R [testable]', 'desc', '',
       '#### Scenario: pos1', '- **WHEN** w', '- **THEN** t', '',
       '#### Scenario: pos2', '- **WHEN** w', '- **THEN** t', '',
       '#### Scenario: pos3', '- **WHEN** w', '- **THEN** t', '',
       '#### Scenario: neg [negative]', '- **WHEN** bad', '- **THEN** reject', ''].join('\n'),
      'utf-8');
    await fs.writeFile(join(changeDir, '.specpower.yaml'), 'schema: specpower\nphase: built\n', 'utf-8');
    await fs.writeFile(join(changeDir, 'test-plan.md'),
      ['## Capability: cap', '',
       '### Requirement: R → Scenario: pos1', '',
       '- **Case** T1: p1 [positive]', '  - Input: a()', '  - Expected: ok', '  - it(): p1', '',
       '### Requirement: R → Scenario: pos2', '',
       '- **Case** T2: p2 [positive]', '  - Input: a()', '  - Expected: ok', '  - it(): p2', '',
       '### Requirement: R → Scenario: pos3', '',
       '- **Case** T3: p3 [positive]', '  - Input: a()', '  - Expected: ok', '  - it(): p3', '',
       '### Requirement: R → Scenario: neg', '',
       '- **Case** T4: neg [negative]', '  - Input: bad()', '  - Expected: reject', '  - it(): neg',
       '  - branch: only-branch', ''].join('\n'),
      'utf-8');
    const res = await validateSpecFile(join(deltaSpecsDir, 'cap', 'spec.md'));
    // 1 distinct branch / 4 total = 25% < 30% → low-negative-ratio → non-valid.
    expect(res.valid).toBe(false);
    // message text: "distinct negative branches/cases — below 30% threshold"
    expect(res.errors.some((e) => /below 30% threshold/i.test(e.message))).toBe(true);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('[testable] requirement with boundary scenarios mislabeled [negative] is not auto-rejected [enforce-coverage-floors-T31]', async () => {
    // A [testable] requirement whose [negative] scenario is actually a legitimate
    // boundary value (empty input the contract accepts) mislabeled [negative] to
    // satisfy the structural floor. The validator checks COUNT + branch
    // distinctness, NOT semantic negativity — so it does NOT auto-reject. This is
    // the spec scenario "testable requirement with all boundary scenarios
    // mislabeled as negative is a review item, not auto-rejected".
    const root = await fs.mkdtemp(join(tmpdir(), 'validate-mislabel-'));
    const changeDir = join(root, 'specpower', 'changes', 'mislabel');
    const deltaSpecsDir = join(changeDir, 'specs');
    await fs.mkdir(join(deltaSpecsDir, 'cap'), { recursive: true });
    await fs.writeFile(join(deltaSpecsDir, 'cap', 'spec.md'),
      ['## ADDED Requirements', '', '### Requirement: R [testable]', 'desc', '',
       '#### Scenario: accept valid', '- **WHEN** valid', '- **THEN** ok', '',
       '#### Scenario: empty input [negative]', '- **WHEN** empty', '- **THEN** accept-empty', ''].join('\n'),
      'utf-8');
    await fs.writeFile(join(changeDir, '.specpower.yaml'), 'schema: specpower\nphase: built\n', 'utf-8');
    await fs.writeFile(join(changeDir, 'test-plan.md'),
      ['## Capability: cap', '',
       '### Requirement: R → Scenario: accept valid', '',
       '- **Case** T1: valid [positive]', '  - Input: valid()', '  - Expected: ok', '  - it(): valid',
       '  - branch: valid-branch', '',
       '### Requirement: R → Scenario: empty input', '',
       '- **Case** T2: empty [negative]', '  - Input: empty()', '  - Expected: accept-empty', '  - it(): empty',
       '  - branch: empty-branch', ''].join('\n'),
      'utf-8');
    const res = await validateSpecFile(join(deltaSpecsDir, 'cap', 'spec.md'));
    // Structurally valid: [testable] has a [negative] scenario; the [negative]
    // scenario is a boundary value mislabeled, but the validator does not judge
    // semantics — it accepts structurally (no error about mislabeling).
    expect(res.errors.some((e) => /\[testable\].*\[negative\]/i.test(e.message))).toBe(false);
    await fs.rm(root, { recursive: true, force: true });
  });
});
