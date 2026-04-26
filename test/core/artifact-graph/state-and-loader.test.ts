import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCompletedArtifacts } from '../../../src/core/artifact-graph/state.js';
import { loadInstructions } from '../../../src/core/artifact-graph/instruction-loader.js';
import { formatStatus, formatStatusHuman } from '../../../src/core/artifact-graph/outputs.js';
import { loadSchema } from '../../../src/core/artifact-graph/schema.js';
import type { SchemaYaml } from '../../../src/core/artifact-graph/types.js';

const PROJECT_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('state tracker', () => {
  let tempDir: string;
  let schema: SchemaYaml;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specpower-state-test-'));
    schema = loadSchema(join(PROJECT_ROOT, 'schemas', 'specpower', 'schema.yaml'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('detects completed artifacts from file existence in change dir', async () => {
    // Create a proposal.md file in the change dir to simulate completion
    const changeDir = join(tempDir, 'specpower', 'changes', 'my-change');
    await mkdir(changeDir, { recursive: true });
    await writeFile(join(changeDir, 'proposal.md'), '# My Proposal\n', 'utf-8');

    const completed = getCompletedArtifacts(changeDir, schema);
    expect(completed).toContain('proposal');
    // Other artifacts should not be completed
    expect(completed).not.toContain('specs');
    expect(completed).not.toContain('design');
    expect(completed).not.toContain('tasks');
  });
});

describe('instruction loader', () => {
  let schema: SchemaYaml;

  beforeEach(() => {
    schema = loadSchema(join(PROJECT_ROOT, 'schemas', 'specpower', 'schema.yaml'));
  });

  it('loads instructions for an artifact with template, context, instruction, and dependencies', () => {
    const changeDir = '/tmp/fake-change-dir';
    const config = {
      context: 'This is a test project for building a CLI tool.',
    };

    const instructions = loadInstructions('proposal', changeDir, schema, config);

    expect(instructions).toHaveProperty('instruction');
    expect(instructions).toHaveProperty('context');
    expect(instructions).toHaveProperty('dependencies');
    expect(instructions.instruction).toContain('WHY');
    expect(instructions.context).toBe(config.context);
    expect(instructions.dependencies).toEqual([]);
  });

  it('includes dependency info for artifacts with requirements', () => {
    const changeDir = '/tmp/fake-change-dir';

    const instructions = loadInstructions('specs', changeDir, schema);

    expect(instructions.dependencies).toHaveLength(1);
    expect(instructions.dependencies[0]).toEqual({
      id: 'proposal',
      generates: 'proposal.md',
      description: 'Initial proposal document outlining the change',
    });
  });
});

describe('output formatter', () => {
  let schema: SchemaYaml;

  beforeEach(() => {
    schema = loadSchema(join(PROJECT_ROOT, 'schemas', 'specpower', 'schema.yaml'));
  });

  it('formatStatus produces JSON with artifact statuses', () => {
    const artifacts = schema.artifacts;
    const completed = ['proposal'];

    const status = formatStatus(artifacts, completed);

    expect(status).toHaveProperty('artifacts');
    expect(status.artifacts).toHaveLength(5);

    const proposalStatus = status.artifacts.find(a => a.id === 'proposal');
    expect(proposalStatus?.status).toBe('done');

    const specsStatus = status.artifacts.find(a => a.id === 'specs');
    expect(specsStatus?.status).toBe('ready');

    const tasksStatus = status.artifacts.find(a => a.id === 'tasks');
    expect(tasksStatus?.status).toBe('blocked');
    expect(tasksStatus?.missingDeps).toContain('specs');
    expect(tasksStatus?.missingDeps).toContain('design');
  });

  it('formatStatusHuman produces checkbox-style text output', () => {
    const artifacts = schema.artifacts;
    const completed = ['proposal'];

    const text = formatStatusHuman(artifacts, completed);

    expect(text).toContain('[x] proposal');
    expect(text).toContain('[ ] specs');
    expect(text).toContain('[ ] design');
    expect(text).toContain('[ ] tasks');
  });
});
