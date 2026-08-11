import { describe, it, expect } from 'vitest';
import { parseTestPlan } from '../../../src/core/parsers/test-plan-parser.js';

const DOC = `# test-plan: demo

## Capability: tools

### Requirement: tool resolution → Scenario: unknown tool id throws

- **Case** T1: 传入 nope [negative]
  - 输入: resolveTool('nope')
  - 预期: throw /Unknown tool 'nope'/
  - it(): throws on unknown tool id
  - file: src/core/tools/adapters.test.ts
`;

describe('parseTestPlan', () => {
  it('parses a well-formed case with all fields', () => {
    const cases = parseTestPlan(DOC);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toEqual({
      id: 'T1',
      capability: 'tools',
      requirement: 'tool resolution',
      scenarioRef: 'unknown tool id throws',
      mark: 'negative',
      input: "resolveTool('nope')",
      expected: "throw /Unknown tool 'nope'/",
      itName: 'throws on unknown tool id',
      file: 'src/core/tools/adapters.test.ts',
    });
  });
});
