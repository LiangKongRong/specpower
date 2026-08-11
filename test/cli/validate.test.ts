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

  it('returns invalid result with errors for a broken spec file', async () => {
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

  it('passes (valid) when a change has a covering test-plan.md', async () => {
    const res = await validateSpecFile(withPlanSpec);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('warns (not errors) when a testable change lacks test-plan.md', async () => {
    const res = await validateSpecFile(withoutPlanSpec);
    expect(res.valid).toBe(true);
    expect(res.warnings.some((w) => /test-plan/i.test(w.message))).toBe(true);
  });

  it('promotes the missing test-plan warning to an error under --strict', async () => {
    const res = await validateSpecFile(withoutPlanSpec, { strict: true });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /test-plan/i.test(e.message))).toBe(true);
  });
});
