import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createChange } from '../../src/cli/commands/change-new.js';

describe('createChange', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'change-new-test-'));
  });

  it('creates a change directory with .specpower.yaml', async () => {
    await createChange('my-feature', tmpDir);

    const changeDir = join(tmpDir, 'specpower', 'changes', 'my-feature');
    const stat = await fs.stat(changeDir);
    expect(stat.isDirectory()).toBe(true);

    const metaPath = join(changeDir, '.specpower.yaml');
    const metaStat = await fs.stat(metaPath);
    expect(metaStat.isFile()).toBe(true);
  });

  it('writes .specpower.yaml with schema and created date', async () => {
    await createChange('my-feature', tmpDir);

    const metaPath = join(
      tmpDir,
      'specpower',
      'changes',
      'my-feature',
      '.specpower.yaml',
    );
    const content = await fs.readFile(metaPath, 'utf-8');

    expect(content).toContain('schema: specpower');

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(content).toContain(`created: '${today}'`);
  });

  it('throws error when change name already exists', async () => {
    await createChange('my-feature', tmpDir);

    await expect(createChange('my-feature', tmpDir)).rejects.toThrow(
      /already exists/,
    );
  });

  it('throws error for invalid change name with spaces', async () => {
    await expect(createChange('has spaces', tmpDir)).rejects.toThrow(
      /[Ii]nvalid/,
    );
  });

  it('initializes phase to "plan" in .specpower.yaml', async () => {
    await createChange('my-feature', tmpDir);

    const metaPath = join(
      tmpDir,
      'specpower',
      'changes',
      'my-feature',
      '.specpower.yaml',
    );
    const content = await fs.readFile(metaPath, 'utf-8');
    expect(content).toContain('phase: plan');
  });
});
