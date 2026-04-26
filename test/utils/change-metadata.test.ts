import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile as fsWriteFile, readFile as fsReadFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readChangeMetadata,
  writeChangeMetadata,
} from '../../src/utils/change-metadata.js';

describe('change-metadata phase field', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'change-metadata-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('reads a .specpower.yaml file with phase: plan and returns phase="plan"', async () => {
    const yamlContent = 'schema: specpower\ncreated: "2026-04-25"\nphase: plan\n';
    await fsWriteFile(join(tempDir, '.specpower.yaml'), yamlContent, 'utf-8');

    const metadata = await readChangeMetadata(tempDir);
    expect(metadata).not.toBeNull();
    expect(metadata!.phase).toBe('plan');
  });

  it('reads an old 0.1.0-format file without phase and returns undefined phase (backward compat)', async () => {
    const yamlContent = 'schema: specpower\ncreated: "2026-04-25"\n';
    await fsWriteFile(join(tempDir, '.specpower.yaml'), yamlContent, 'utf-8');

    const metadata = await readChangeMetadata(tempDir);
    expect(metadata).not.toBeNull();
    expect(metadata!.phase).toBeUndefined();
  });

  it('writes phase: refined to the YAML file when given phase in metadata', async () => {
    await writeChangeMetadata(tempDir, {
      schema: 'specpower',
      created: '2026-04-25',
      phase: 'refined',
    });

    const content = await fsReadFile(join(tempDir, '.specpower.yaml'), 'utf-8');
    expect(content).toContain('phase: refined');
  });

  it('throws a Zod error listing valid phases when phase is an invalid value', async () => {
    const yamlContent = 'schema: specpower\ncreated: "2026-04-25"\nphase: invalid-value\n';
    await fsWriteFile(join(tempDir, '.specpower.yaml'), yamlContent, 'utf-8');

    await expect(readChangeMetadata(tempDir)).rejects.toThrow(
      /plan.*refined.*built.*archived/,
    );
  });

  it('throws "Invalid metadata format" when schema or created is missing', async () => {
    const yamlContent = 'random: value\n';
    await fsWriteFile(join(tempDir, '.specpower.yaml'), yamlContent, 'utf-8');

    await expect(readChangeMetadata(tempDir)).rejects.toThrow(/Invalid metadata/);
  });
});
