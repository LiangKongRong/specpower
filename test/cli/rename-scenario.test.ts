import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renameScenario } from '../../src/cli/commands/rename-scenario.js';

describe('renameScenario', () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'rs-'));
    const specDir = join(root, 'specpower', 'specs', 'cap');
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(join(specDir, 'spec.md'),
      `### Requirement: r\n...\n#### Scenario: old name\n- **WHEN** x\n- **THEN** y\n`, 'utf-8');
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it('renames a baseline scenario in the spec file', async () => {
    await renameScenario(root, 'cap', 'old name', 'new name');
    const after = await fs.readFile(join(root, 'specpower', 'specs', 'cap', 'spec.md'), 'utf-8');
    expect(after).toContain('#### Scenario: new name');
    expect(after).not.toContain('#### Scenario: old name');
  });
});
