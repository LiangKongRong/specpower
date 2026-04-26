import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getChangeStatus,
  formatChangeStatus,
} from '../../src/cli/commands/change-status.js';

/**
 * Creates a temp project with:
 *   specpower/changes/test-change/proposal.md
 *   schemas/specpower/schema.yaml  (project-local copy)
 *   specpower/config.yaml
 */
async function createTestProject(): Promise<string> {
  const root = await fs.mkdtemp(join(tmpdir(), 'change-status-test-'));

  // Create the change directory with a proposal artifact
  const changeDir = join(root, 'specpower', 'changes', 'test-change');
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(
    join(changeDir, 'proposal.md'),
    '# Proposal\n\nThis is a test proposal.',
    'utf-8',
  );

  // Create a project-local schema copy
  const schemaDir = join(root, 'schemas', 'specpower');
  await fs.mkdir(schemaDir, { recursive: true });
  await fs.writeFile(
    join(schemaDir, 'schema.yaml'),
    [
      'name: specpower',
      'version: 3',
      'description: Test schema',
      '',
      'artifacts:',
      '  - id: proposal',
      '    generates: "proposal.md"',
      '    description: Initial proposal',
      '    requires: []',
      '',
      '  - id: specs',
      '    generates: "specs/**/*.md"',
      '    description: Detailed specifications',
      '    requires:',
      '      - proposal',
      '',
      '  - id: tasks',
      '    generates: "tasks.md"',
      '    description: Implementation checklist',
      '    requires:',
      '      - specs',
    ].join('\n'),
    'utf-8',
  );

  // Create config
  const configDir = join(root, 'specpower');
  await fs.writeFile(
    join(configDir, 'config.yaml'),
    'schema: specpower\n',
    'utf-8',
  );

  return root;
}

describe('getChangeStatus', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTestProject();
  });

  it('returns status with completed proposal artifact', async () => {
    const status = await getChangeStatus('test-change', tmpDir);

    expect(status.changeName).toBe('test-change');
    expect(status.artifacts).toBeInstanceOf(Array);
    expect(status.artifacts.length).toBeGreaterThan(0);
    expect(status.isComplete).toBe(false);

    const proposalEntry = status.artifacts.find((a) => a.id === 'proposal');
    expect(proposalEntry).toBeDefined();
    expect(proposalEntry!.status).toBe('done');
  });

  it('formats status as human-readable text', async () => {
    const status = await getChangeStatus('test-change', tmpDir);
    const output = formatChangeStatus(status);

    expect(output).toContain('[x] proposal');
    expect(output).toContain('[ ] specs');
  });

  it('throws error for non-existing change', async () => {
    await expect(
      getChangeStatus('non-existent', tmpDir),
    ).rejects.toThrow();
  });
});
