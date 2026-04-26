import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDeltaSpec } from '../../../src/core/parsers/markdown-parser.js';
import type { DeltaSpec } from '../../../src/core/parsers/markdown-parser.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', 'fixtures');

async function loadFixture(name: string): Promise<string> {
  return readFile(join(FIXTURES_DIR, name), 'utf-8');
}

describe('markdown-parser', () => {
  describe('parseDeltaSpec', () => {
    it('parses ADDED Requirements section into requirement blocks', async () => {
      const content = await loadFixture('delta-added-only.md');
      const result = parseDeltaSpec(content);

      expect(result.added).toHaveLength(1);
      expect(result.added[0].name).toBe('Email Export');
      expect(result.added[0].description).toContain('export data via email');
      expect(result.added[0].scenarios).toHaveLength(1);
    });

    it('parses MODIFIED Requirements section into blocks tagged MODIFIED', async () => {
      const content = await loadFixture('delta-all-sections.md');
      const result = parseDeltaSpec(content);

      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].name).toBe('Existing Feature (MODIFIED)');
      expect(result.modified[0].description).toContain('Updated description');
    });

    it('parses REMOVED Requirements with reason and migration', async () => {
      const content = await loadFixture('delta-all-sections.md');
      const result = parseDeltaSpec(content);

      expect(result.removed).toHaveLength(1);
      expect(result.removed[0]).toEqual({
        name: 'Legacy Feature',
        reason: 'Replaced by new system',
        migration: 'Use new API endpoint',
      });
    });

    it('parses RENAMED Requirements with from/to', async () => {
      const content = await loadFixture('delta-all-sections.md');
      const result = parseDeltaSpec(content);

      expect(result.renamed).toHaveLength(1);
      expect(result.renamed[0]).toEqual({
        from: 'Old Name',
        to: 'New Name',
      });
    });

    it('extracts requirement name from header line', async () => {
      const content = await loadFixture('delta-added-only.md');
      const result = parseDeltaSpec(content);

      expect(result.added[0].name).toBe('Email Export');
    });

    it('parses scenario with WHEN/THEN into structured arrays', async () => {
      const content = await loadFixture('delta-added-only.md');
      const result = parseDeltaSpec(content);

      const scenario = result.added[0].scenarios[0];
      expect(scenario.name).toBe('Successful export');
      expect(scenario.when).toContain('user clicks export button');
      expect(scenario.then).toContain('system sends email with CSV attachment');
    });

    it('parses multi-section file with all 4 section arrays populated', async () => {
      const content = await loadFixture('delta-all-sections.md');
      const result = parseDeltaSpec(content);

      expect(result.added).toHaveLength(1);
      expect(result.modified).toHaveLength(1);
      expect(result.removed).toHaveLength(1);
      expect(result.renamed).toHaveLength(1);
    });
  });
});
