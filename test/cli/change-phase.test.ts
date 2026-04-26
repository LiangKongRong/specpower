import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPhase, setPhase } from '../../src/cli/commands/change-phase.js';

describe('change phase subcommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'change-phase-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createChangeWithPhase(
    name: string,
    yaml: string,
  ): Promise<void> {
    const dir = join(tempDir, 'specpower', 'changes', name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, '.specpower.yaml'), yaml, 'utf-8');
  }

  it('getPhase reads the current phase value', async () => {
    await createChangeWithPhase(
      'my-feature',
      'schema: specpower\ncreated: "2026-04-25"\nphase: plan\n',
    );

    const phase = await getPhase('my-feature', tempDir);
    expect(phase).toBe('plan');
  });

  it('setPhase updates the phase in the metadata file', async () => {
    await createChangeWithPhase(
      'my-feature',
      'schema: specpower\ncreated: "2026-04-25"\nphase: plan\n',
    );

    await setPhase('my-feature', 'refined', tempDir);

    const phase = await getPhase('my-feature', tempDir);
    expect(phase).toBe('refined');
  });

  it('setPhase throws for an invalid phase value listing valid enum names', async () => {
    await createChangeWithPhase(
      'my-feature',
      'schema: specpower\ncreated: "2026-04-25"\nphase: plan\n',
    );

    await expect(setPhase('my-feature', 'invalid', tempDir)).rejects.toThrow(
      /plan.*refined.*built.*archived/,
    );
  });

  it('getPhase throws "Change not found" when the change directory is missing', async () => {
    await expect(getPhase('nonexistent', tempDir)).rejects.toThrow(
      /Change not found/,
    );
  });

  it('getPhase returns undefined for 0.1.0-format files without a phase field (backward compat)', async () => {
    await createChangeWithPhase(
      'legacy-change',
      'schema: specpower\ncreated: "2026-04-25"\n',
    );

    const phase = await getPhase('legacy-change', tempDir);
    expect(phase).toBeUndefined();
  });
});
