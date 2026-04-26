import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getInstructions } from '../../src/cli/commands/instructions.js';

/**
 * Creates a temp project with:
 *   schemas/specpower/schema.yaml
 *   specpower/config.yaml
 *   specpower/changes/test-change/proposal.md (completed artifact)
 */
async function createTestProject(): Promise<string> {
  const root = await fs.mkdtemp(join(tmpdir(), 'instructions-test-'));

  // Schema
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
      '    instruction: "Create the proposal document."',
      '    requires: []',
      '',
      '  - id: specs',
      '    generates: "specs/**/*.md"',
      '    description: Detailed specifications',
      '    instruction: "Create specification files."',
      '    requires:',
      '      - proposal',
      '',
      '  - id: tasks',
      '    generates: "tasks.md"',
      '    description: Implementation checklist',
      '    instruction: "Create the task list."',
      '    requires:',
      '      - specs',
    ].join('\n'),
    'utf-8',
  );

  // Config
  const specpowerDir = join(root, 'specpower');
  await fs.mkdir(specpowerDir, { recursive: true });
  await fs.writeFile(
    join(specpowerDir, 'config.yaml'),
    'schema: specpower\n',
    'utf-8',
  );

  // Change directory with completed proposal
  const changeDir = join(root, 'specpower', 'changes', 'test-change');
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(
    join(changeDir, 'proposal.md'),
    '# Proposal\n\nTest proposal content.',
    'utf-8',
  );

  return root;
}

describe('getInstructions', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTestProject();
  });

  it('returns instructions for an artifact', async () => {
    const result = await getInstructions('proposal', 'test-change', tmpDir);

    expect(result.instruction).toBeDefined();
    expect(result.instruction).toContain('proposal');
    expect(result.dependencies).toBeInstanceOf(Array);
    expect(result.generates).toBe('proposal.md');
    expect(result.description).toContain('proposal');
  });

  it('returns non-empty missingDeps for blocked artifact', async () => {
    // tasks requires specs, which is not done
    const result = await getInstructions('tasks', 'test-change', tmpDir);

    expect(result.dependencies.length).toBeGreaterThan(0);

    // specs is not completed, so tasks depends on it
    const specsDep = result.dependencies.find((d) => d.id === 'specs');
    expect(specsDep).toBeDefined();
  });
});
