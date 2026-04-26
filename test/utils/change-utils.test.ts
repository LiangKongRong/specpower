import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile as fsWriteFile, readFile as fsReadFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getChangeDir,
  getChangeMetadata,
  writeChangeMetadata,
  listChanges,
} from '../../src/utils/change-utils.js';

describe('change-utils', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specpower-change-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getChangeDir', () => {
    it('returns the correct change directory path', () => {
      const result = getChangeDir('my-feature');
      expect(result).toBe('specpower/changes/my-feature/');
    });

    it('returns a trailing slash', () => {
      const result = getChangeDir('another-change');
      expect(result).toMatch(/\/$/);
    });
  });

  describe('getChangeMetadata', () => {
    it('reads .specpower.yaml and returns metadata', async () => {
      const changeDir = join(tempDir, 'specpower', 'changes', 'my-feature');
      await mkdir(changeDir, { recursive: true });
      const yamlContent = 'schema: specpower\ncreated: "2026-04-25"\n';
      await fsWriteFile(join(changeDir, '.specpower.yaml'), yamlContent, 'utf-8');

      const metadata = await getChangeMetadata('my-feature', tempDir);
      expect(metadata).toEqual({ schema: 'specpower', created: '2026-04-25' });
    });

    it('returns null when metadata file does not exist', async () => {
      const changeDir = join(tempDir, 'specpower', 'changes', 'no-meta');
      await mkdir(changeDir, { recursive: true });

      const metadata = await getChangeMetadata('no-meta', tempDir);
      expect(metadata).toBeNull();
    });
  });

  describe('writeChangeMetadata', () => {
    it('writes valid YAML to .specpower.yaml', async () => {
      const changeDir = join(tempDir, 'specpower', 'changes', 'my-feature');
      await mkdir(changeDir, { recursive: true });

      await writeChangeMetadata('my-feature', { schema: 'specpower', created: '2026-04-25' }, tempDir);

      const content = await fsReadFile(join(changeDir, '.specpower.yaml'), 'utf-8');
      expect(content).toContain('schema: specpower');
      expect(content).toContain('created:');
      expect(content).toContain('2026-04-25');
    });

    it('creates parent directories if needed', async () => {
      await writeChangeMetadata('brand-new', { schema: 'specpower', created: '2026-04-25' }, tempDir);

      const content = await fsReadFile(
        join(tempDir, 'specpower', 'changes', 'brand-new', '.specpower.yaml'),
        'utf-8'
      );
      expect(content).toContain('schema: specpower');
    });
  });

  describe('listChanges', () => {
    it('returns change directory names', async () => {
      const changesDir = join(tempDir, 'specpower', 'changes');
      await mkdir(join(changesDir, 'change-a'), { recursive: true });
      await mkdir(join(changesDir, 'change-b'), { recursive: true });

      const changes = await listChanges(tempDir);
      expect(changes.sort()).toEqual(['change-a', 'change-b']);
    });

    it('returns empty array when no changes exist', async () => {
      const changes = await listChanges(tempDir);
      expect(changes).toEqual([]);
    });

    it('returns empty array when changes directory does not exist', async () => {
      const emptyRoot = join(tempDir, 'empty-project');
      const changes = await listChanges(emptyRoot);
      expect(changes).toEqual([]);
    });
  });
});
