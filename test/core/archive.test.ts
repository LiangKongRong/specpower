import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { archiveChange } from '../../src/core/archive.js';

/**
 * Create a minimal project structure for archive tests.
 *
 * Layout:
 *   <tmpDir>/
 *     specpower/
 *       specs/
 *         auth.md           (main spec)
 *       changes/
 *         my-change/
 *           .specpower.yaml
 *           specs/
 *             auth.md       (delta spec)
 */
async function createTestProject(): Promise<string> {
  const root = await fs.mkdtemp(join(tmpdir(), 'archive-test-'));

  const mainSpecDir = join(root, 'specpower', 'specs');
  const changeDir = join(root, 'specpower', 'changes', 'my-change');
  const changeSpecsDir = join(changeDir, 'specs');

  await fs.mkdir(mainSpecDir, { recursive: true });
  await fs.mkdir(changeSpecsDir, { recursive: true });

  // Main spec
  await fs.writeFile(
    join(mainSpecDir, 'auth.md'),
    [
      '### Requirement: User Login',
      'The system SHALL authenticate users.',
      '',
      '#### Scenario: Successful login',
      '- **WHEN** user submits credentials',
      '- **THEN** system returns token',
    ].join('\n'),
    'utf-8',
  );

  // Delta spec
  await fs.writeFile(
    join(changeSpecsDir, 'auth.md'),
    [
      '## ADDED Requirements',
      '',
      '### Requirement: Two Factor Auth',
      'The system SHALL support 2FA.',
      '',
      '#### Scenario: Enable 2FA',
      '- **WHEN** user enables 2FA',
      '- **THEN** system requires OTP on next login',
    ].join('\n'),
    'utf-8',
  );

  // .specpower.yaml
  await fs.writeFile(
    join(changeDir, '.specpower.yaml'),
    'name: my-change\nstatus: verified\n',
    'utf-8',
  );

  return root;
}

describe('archiveChange', () => {
  it('validates delta specs before applying', async () => {
    const root = await createTestProject();

    // Write an invalid delta spec (missing WHEN)
    const changeSpecsDir = join(root, 'specpower', 'changes', 'my-change', 'specs');
    await fs.writeFile(
      join(changeSpecsDir, 'auth.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Bad Feature',
        'Description.',
        '',
        '#### Scenario: No when',
        '- **THEN** something happens',
      ].join('\n'),
      'utf-8',
    );

    const result = await archiveChange('my-change', root);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('WHEN'))).toBe(true);
  });

  it('applies deltas and updates the main spec', async () => {
    const root = await createTestProject();

    const result = await archiveChange('my-change', root);

    expect(result.success).toBe(true);

    const mainSpec = await fs.readFile(
      join(root, 'specpower', 'specs', 'auth.md'),
      'utf-8',
    );
    expect(mainSpec).toContain('Two Factor Auth');
    expect(mainSpec).toContain('User Login');
  });

  it('moves change dir to archive with date prefix', async () => {
    const root = await createTestProject();

    await archiveChange('my-change', root);

    // Original change directory should no longer exist
    const originalExists = await fs
      .stat(join(root, 'specpower', 'changes', 'my-change'))
      .then(() => true)
      .catch(() => false);
    expect(originalExists).toBe(false);

    // Archived directory should exist under archive/ with date prefix
    const archiveDir = join(root, 'specpower', 'changes', 'archive');
    const entries = await fs.readdir(archiveDir);
    expect(entries.length).toBe(1);
    // Format: YYYY-MM-DD-my-change
    expect(entries[0]).toMatch(/^\d{4}-\d{2}-\d{2}-my-change$/);
  });

  it('does not move directory when validation fails', async () => {
    const root = await createTestProject();

    // Write an invalid delta spec
    const changeSpecsDir = join(root, 'specpower', 'changes', 'my-change', 'specs');
    await fs.writeFile(
      join(changeSpecsDir, 'auth.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Broken',
        'No scenarios here.',
      ].join('\n'),
      'utf-8',
    );

    await archiveChange('my-change', root);

    // Original should still exist
    const originalExists = await fs
      .stat(join(root, 'specpower', 'changes', 'my-change'))
      .then(() => true)
      .catch(() => false);
    expect(originalExists).toBe(true);

    // Archive should NOT exist
    const archiveExists = await fs
      .stat(join(root, 'specpower', 'changes', 'archive'))
      .then(() => true)
      .catch(() => false);
    expect(archiveExists).toBe(false);
  });
});
