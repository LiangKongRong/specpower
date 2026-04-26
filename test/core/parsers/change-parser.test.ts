import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDeltaSpecFile } from '../../../src/core/parsers/change-parser.js';
import { parseMainSpec } from '../../../src/core/parsers/spec-structure.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', 'fixtures');

async function loadFixture(name: string): Promise<string> {
  return readFile(join(FIXTURES_DIR, name), 'utf-8');
}

describe('change-parser', () => {
  describe('parseDeltaSpecFile', () => {
    it('parses delta spec into DeltaPlan with all four arrays', async () => {
      const content = await loadFixture('delta-all-sections.md');
      const result = parseDeltaSpecFile(content);

      expect(result.added).toHaveLength(1);
      expect(result.added[0].name).toBe('New Feature');
      expect(result.added[0].scenarios).toHaveLength(1);

      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].name).toBe('Existing Feature (MODIFIED)');

      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].name).toBe('Legacy Feature');
      expect(result.removed[0].reason).toBe('Replaced by new system');
      expect(result.removed[0].migration).toBe('Use new API endpoint');

      expect(result.renamed).toHaveLength(1);
      expect(result.renamed[0].from).toBe('Old Name');
      expect(result.renamed[0].to).toBe('New Name');
    });
  });
});

describe('spec-structure', () => {
  describe('parseMainSpec', () => {
    it('parses a main spec file into requirements with scenarios', async () => {
      const content = [
        '# My Spec',
        '',
        '## Purpose',
        'This spec defines the system.',
        '',
        '## Requirements',
        '',
        '### Requirement: Auth',
        'Authentication is required.',
        '',
        '#### Scenario: Valid login',
        '- **WHEN** user enters credentials',
        '- **THEN** access is granted',
        '',
        '### Requirement: Export',
        'Export data to CSV.',
        '',
        '#### Scenario: CSV download',
        '- **WHEN** user clicks download',
        '- **THEN** CSV file is generated',
      ].join('\n');

      const result = parseMainSpec(content);

      expect(result.requirements).toHaveLength(2);

      expect(result.requirements[0].name).toBe('Auth');
      expect(result.requirements[0].description).toContain('Authentication is required');
      expect(result.requirements[0].scenarios).toHaveLength(1);
      expect(result.requirements[0].scenarios[0].name).toBe('Valid login');

      expect(result.requirements[1].name).toBe('Export');
      expect(result.requirements[1].description).toContain('Export data to CSV');
      expect(result.requirements[1].scenarios).toHaveLength(1);
    });
  });
});
