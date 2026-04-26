import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { ArtifactSchema, loadSchema, resolveSchema } from '../../../src/core/artifact-graph/index.js';

// Project root is three levels up from this test file's directory
const PROJECT_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('artifact graph types and schema loader', () => {
  describe('ArtifactSchema (Zod validation)', () => {
    it('validates a correct artifact object', () => {
      const validArtifact = {
        id: 'proposal',
        generates: 'proposal.md',
        description: 'Initial proposal document',
        requires: [],
      };

      const result = ArtifactSchema.safeParse(validArtifact);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('proposal');
        expect(result.data.generates).toBe('proposal.md');
        expect(result.data.requires).toEqual([]);
      }
    });

    it('rejects artifact missing generates field', () => {
      const invalid = {
        id: 'proposal',
        description: 'Missing generates',
        requires: [],
      };

      const result = ArtifactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.constructor.name).toBe('ZodError');
      }
    });
  });

  describe('loadSchema', () => {
    it('loads and parses the specpower schema.yaml with 5 artifacts', () => {
      const schemaPath = join(PROJECT_ROOT, 'schemas', 'specpower', 'schema.yaml');
      const schema = loadSchema(schemaPath);

      expect(schema.name).toBe('specpower');
      expect(schema.version).toBe(3);
      expect(schema.artifacts).toHaveLength(5);

      const ids = schema.artifacts.map(a => a.id);
      expect(ids).toContain('scan');
      expect(ids).toContain('proposal');
      expect(ids).toContain('specs');
      expect(ids).toContain('design');
      expect(ids).toContain('tasks');
    });
  });

  describe('resolveSchema', () => {
    it('resolves the built-in specpower schema from schemas/ dir', () => {
      const schema = resolveSchema('specpower');

      expect(schema.name).toBe('specpower');
      expect(schema.version).toBe(3);
      expect(schema.artifacts).toHaveLength(5);
      expect(schema.apply).toBeDefined();
      expect(schema.apply!.requires).toContain('tasks');
    });
  });
});
