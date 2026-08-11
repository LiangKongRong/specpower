import { describe, it, expect } from 'vitest';
import { parseTestPlan } from '../../../src/core/parsers/test-plan-parser.js';

const DOC = `# test-plan: demo

## Capability: tools

### Requirement: tool resolution → Scenario: unknown tool id throws

- **Case** T1: pass an unsupported id [negative]
  - Input: resolveTool('nope')
  - Expected: throw /Unknown tool 'nope'/
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

const NO_ID = `## Capability: c

### Requirement: r → Scenario: s

- **Case** X1: no id prefix [positive]
  - Input: a
  - Expected: b
  - it(): n
`;

const DUP = `## Capability: c

### Requirement: r → Scenario: s

- **Case** T1: a [positive]
  - Input: a
  - Expected: b
  - it(): n

- **Case** T1: dup [positive]
  - Input: a
  - Expected: b
  - it(): n2
`;

describe('parseTestPlan edge', () => {
  it('skips lines that do not match the Case pattern', () => {
    expect(parseTestPlan(NO_ID)).toEqual([]);
  });
  it('parses duplicate ids as separate entries (dedup is validator concern)', () => {
    expect(parseTestPlan(DUP).map((c) => c.id)).toEqual(['T1', 'T1']);
  });
  it('parses multiple capabilities', () => {
    const two = `## Capability: a

### Requirement: r → Scenario: s
- **Case** T1: x [positive]
  - Input: a
  - Expected: b
  - it(): n

## Capability: b

### Requirement: r2 → Scenario: s2
- **Case** T2: y [positive]
  - Input: a
  - Expected: b
  - it(): n2
`;
    const cases = parseTestPlan(two);
    expect(cases.map((c) => `${c.capability}/${c.id}`)).toEqual(['a/T1', 'b/T2']);
  });
});
