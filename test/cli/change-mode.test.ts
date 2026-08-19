import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getExecutionMode, setExecutionMode } from '../../src/cli/commands/change-mode.js';
import { getChangeMetadata } from '../../src/utils/change-utils.js';

describe('change mode subcommand [fix-build-execution-mode-gate]', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'change-mode-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createChange(name: string, yaml: string): Promise<void> {
    const dir = join(tempDir, 'specpower', 'changes', name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, '.specpower.yaml'), yaml, 'utf-8');
  }

  it('getExecutionMode reads the recorded executionMode value [fix-build-execution-mode-gate-C1]', async () => {
    await createChange(
      'my-feature',
      'schema: specpower\ncreated: "2026-04-25"\nphase: refined\nexecutionMode: subagent\n',
    );

    const mode = await getExecutionMode('my-feature', tempDir);
    expect(mode).toBe('subagent');
  });

  it('getExecutionMode returns undefined when executionMode is unset (backward compat) [fix-build-execution-mode-gate-C2]', async () => {
    await createChange(
      'legacy-change',
      'schema: specpower\ncreated: "2026-04-25"\nphase: refined\n',
    );

    const mode = await getExecutionMode('legacy-change', tempDir);
    expect(mode).toBeUndefined();
  });

  it('setExecutionMode records the mode and preserves other fields [fix-build-execution-mode-gate-C3]', async () => {
    await createChange(
      'my-feature',
      'schema: specpower\ncreated: "2026-04-25"\nphase: refined\n',
    );

    await setExecutionMode('my-feature', 'inline', tempDir);

    const mode = await getExecutionMode('my-feature', tempDir);
    expect(mode).toBe('inline');

    // phase must survive
    const meta = await getChangeMetadata('my-feature', tempDir);
    expect(meta?.phase).toBe('refined');
    expect(meta?.schema).toBe('specpower');
  });

  it('setExecutionMode is idempotent across re-sets (resume survives restart) [fix-build-execution-mode-gate-C4]', async () => {
    await createChange(
      'my-feature',
      'schema: specpower\ncreated: "2026-04-25"\nphase: refined\n',
    );

    await setExecutionMode('my-feature', 'subagent', tempDir);
    // simulate restart: re-read
    expect(await getExecutionMode('my-feature', tempDir)).toBe('subagent');
    // re-set same value is a no-op write
    await setExecutionMode('my-feature', 'subagent', tempDir);
    expect(await getExecutionMode('my-feature', tempDir)).toBe('subagent');
  });

  it('setExecutionMode throws for an invalid mode listing valid enum names [fix-build-execution-mode-gate-C5]', async () => {
    await createChange(
      'my-feature',
      'schema: specpower\ncreated: "2026-04-25"\nphase: refined\n',
    );

    await expect(setExecutionMode('my-feature', 'parallel', tempDir)).rejects.toThrow(
      /subagent.*inline/,
    );
  });

  it('metadata schema rejects an invalid executionMode on read [fix-build-execution-mode-gate-C6]', async () => {
    await createChange(
      'bad-change',
      'schema: specpower\ncreated: "2026-04-25"\nphase: refined\nexecutionMode: parallel\n',
    );

    await expect(getExecutionMode('bad-change', tempDir)).rejects.toThrow(
      /subagent.*inline|invalid.*executionMode/i,
    );
  });

  it('getExecutionMode throws "Change not found" when the change directory is missing [fix-build-execution-mode-gate-C7]', async () => {
    await expect(getExecutionMode('nonexistent', tempDir)).rejects.toThrow(
      /Change not found/,
    );
  });
});
