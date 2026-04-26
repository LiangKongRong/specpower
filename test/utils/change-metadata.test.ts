import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtemp,
  rm,
  writeFile as fsWriteFile,
  readFile as fsReadFile,
  mkdir as fsMkdir,
  readdir as fsReaddir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readChangeMetadata,
  writeChangeMetadata,
} from '../../src/utils/change-metadata.js';
import { getChangeStatus } from '../../src/cli/commands/change-status.js';
import { archiveChangeCommand } from '../../src/cli/commands/change-archive.js';

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

/**
 * §12.1 Regression tests: ensure legacy 0.1.0-format `.specpower.yaml` files
 * (written without the `phase:` field) continue to work across the full
 * change-lifecycle surface: read, status, and archive.
 *
 * These tests lock in backward compatibility. If any one of them flips to
 * RED in a future refactor, we've broken the promise that archived v0.1.0
 * projects keep working with v0.2+ tooling.
 */
describe('legacy 0.1.0 .specpower.yaml backward compatibility (§12.1)', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'legacy-compat-test-'));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  /**
   * Scaffolds a minimal project for `change status`/`change archive` with a
   * legacy (no-phase) `.specpower.yaml`. Returns the absolute project root.
   *
   * Layout:
   *   <root>/
   *     schemas/specpower/schema.yaml
   *     specpower/config.yaml
   *     specpower/specs/auth.md                         (main spec)
   *     specpower/changes/legacy-change/.specpower.yaml (no phase line)
   *     specpower/changes/legacy-change/proposal.md
   *     specpower/changes/legacy-change/specs/auth.md   (valid delta)
   */
  async function scaffoldLegacyProject(changeName: string): Promise<string> {
    const changeDir = join(projectRoot, 'specpower', 'changes', changeName);
    const changeSpecsDir = join(changeDir, 'specs');
    const mainSpecsDir = join(projectRoot, 'specpower', 'specs');
    const schemaDir = join(projectRoot, 'schemas', 'specpower');
    const configDir = join(projectRoot, 'specpower');

    await fsMkdir(changeSpecsDir, { recursive: true });
    await fsMkdir(mainSpecsDir, { recursive: true });
    await fsMkdir(schemaDir, { recursive: true });

    // Legacy .specpower.yaml — NO phase field (as written by 0.1.0)
    await fsWriteFile(
      join(changeDir, '.specpower.yaml'),
      "schema: specpower\ncreated: '2026-04-26'\n",
      'utf-8',
    );

    // A proposal artifact so `status` has something to report
    await fsWriteFile(
      join(changeDir, 'proposal.md'),
      '# Proposal\n\nLegacy-format change.',
      'utf-8',
    );

    // Main spec
    await fsWriteFile(
      join(mainSpecsDir, 'auth.md'),
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

    // Valid delta spec (so archive's validator/applier sees valid work)
    await fsWriteFile(
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

    // Project-local schema copy so status can resolve it
    await fsWriteFile(
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

    // Project config
    await fsWriteFile(
      join(configDir, 'config.yaml'),
      'schema: specpower\n',
      'utf-8',
    );

    return projectRoot;
  }

  it('Case A: readChangeMetadata accepts legacy YAML without phase field and returns phase=undefined', async () => {
    const yamlContent = "schema: specpower\ncreated: '2026-04-26'\n";
    await fsWriteFile(join(projectRoot, '.specpower.yaml'), yamlContent, 'utf-8');

    const metadata = await readChangeMetadata(projectRoot);
    expect(metadata).not.toBeNull();
    expect(metadata!.phase).toBeUndefined();
    // The other fields must still round-trip correctly.
    expect(metadata!.schema).toBe('specpower');
    expect(metadata!.created).toBe('2026-04-26');
  });

  it('Case B: change status handles legacy phase=undefined gracefully (no throw, reports change)', async () => {
    const root = await scaffoldLegacyProject('legacy-change');

    const status = await getChangeStatus('legacy-change', root);

    expect(status.changeName).toBe('legacy-change');
    expect(status.artifacts).toBeInstanceOf(Array);
    expect(status.artifacts.length).toBeGreaterThan(0);
    // proposal.md exists so proposal should be "done"
    const proposalEntry = status.artifacts.find((a) => a.id === 'proposal');
    expect(proposalEntry).toBeDefined();
    expect(proposalEntry!.status).toBe('done');
  });

  it('Case C (refuse): change archive refuses legacy phase=undefined without --force', async () => {
    const root = await scaffoldLegacyProject('legacy-change');

    const err = await archiveChangeCommand('legacy-change', root)
      .then(() => null)
      .catch((e: unknown) => e as Error);

    expect(err).toBeInstanceOf(Error);
    // The error should clearly identify the bad phase and tell the user about --force.
    expect(err!.message).toMatch(/Cannot archive/);
    expect(err!.message).toMatch(/--force/);
    // An undefined phase is reported as 'unknown' in the error message.
    expect(err!.message).toMatch(/unknown|unset|undefined/);
  });

  it('Case C (force): change archive --force succeeds on legacy phase=undefined (rewrites phase to archived)', async () => {
    const root = await scaffoldLegacyProject('legacy-change');

    const result = await archiveChangeCommand('legacy-change', root, {
      force: true,
    });
    expect(result.success).toBe(true);

    // The archived .specpower.yaml should now carry phase=archived (current behavior).
    const archiveDir = join(root, 'specpower', 'changes', 'archive');
    const entries = await fsReaddir(archiveDir);
    expect(entries.length).toBe(1);

    const archivedMetaPath = join(archiveDir, entries[0], '.specpower.yaml');
    const archivedContent = await fsReadFile(archivedMetaPath, 'utf-8');
    expect(archivedContent).toContain('phase: archived');
  });
});
