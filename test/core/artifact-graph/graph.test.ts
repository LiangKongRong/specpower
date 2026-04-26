import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { ArtifactGraph } from '../../../src/core/artifact-graph/graph.js';
import { loadSchema, parseSchema } from '../../../src/core/artifact-graph/schema.js';

const PROJECT_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('ArtifactGraph', () => {
  function loadSpecpowerGraph(): ArtifactGraph {
    const schemaPath = join(PROJECT_ROOT, 'schemas', 'specpower', 'schema.yaml');
    const schema = loadSchema(schemaPath);
    return ArtifactGraph.fromSchema(schema);
  }

  describe('getBuildOrder', () => {
    it('returns valid topological sort: proposal before specs/design, specs+design before tasks', () => {
      const graph = loadSpecpowerGraph();
      const order = graph.getBuildOrder();

      expect(order).toHaveLength(5);

      const indexOf = (id: string): number => order.indexOf(id);

      // proposal must come before specs and design
      expect(indexOf('proposal')).toBeLessThan(indexOf('specs'));
      expect(indexOf('proposal')).toBeLessThan(indexOf('design'));

      // specs and design must come before tasks
      expect(indexOf('specs')).toBeLessThan(indexOf('tasks'));
      expect(indexOf('design')).toBeLessThan(indexOf('tasks'));
    });
  });

  describe('getNextArtifacts', () => {
    it('returns root artifacts when nothing is completed', () => {
      const graph = loadSpecpowerGraph();
      const next = graph.getNextArtifacts(new Set());

      // scan and proposal have no deps, so both are roots
      expect(next).toContain('proposal');
      expect(next).toContain('scan');
      expect(next).toHaveLength(2);
    });

    it('unblocks design and specs after proposal is completed', () => {
      const graph = loadSpecpowerGraph();
      const next = graph.getNextArtifacts(new Set(['proposal']));

      expect(next).toContain('design');
      expect(next).toContain('specs');
      // scan is still available (it has no deps and is not completed)
      expect(next).toContain('scan');
    });
  });

  describe('getBlocked', () => {
    it('returns tasks as blocked when only proposal is completed', () => {
      const graph = loadSpecpowerGraph();
      const blocked = graph.getBlocked(new Set(['proposal']));

      expect(blocked).toHaveProperty('tasks');
      // tasks needs specs and design, neither of which are completed
      expect(blocked['tasks']).toContain('specs');
      expect(blocked['tasks']).toContain('design');
    });
  });

  describe('isComplete', () => {
    it('returns true when all artifacts are completed', () => {
      const graph = loadSpecpowerGraph();
      const allCompleted = new Set(['scan', 'proposal', 'design', 'specs', 'tasks']);
      expect(graph.isComplete(allCompleted)).toBe(true);
    });

    it('returns false when some artifacts are missing', () => {
      const graph = loadSpecpowerGraph();
      const partial = new Set(['proposal', 'design']);
      expect(graph.isComplete(partial)).toBe(false);
    });
  });

  describe('cycle detection', () => {
    it('throws error containing "cycle" for schema with cyclic dependencies', () => {
      const cyclicYaml = `
name: cyclic
version: 1
description: Schema with a cycle
artifacts:
  - id: a
    generates: "a.md"
    description: Artifact A
    requires:
      - b
  - id: b
    generates: "b.md"
    description: Artifact B
    requires:
      - a
`;
      expect(() => parseSchema(cyclicYaml)).toThrow(/cyclic/i);
    });
  });
});
