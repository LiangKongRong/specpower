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
