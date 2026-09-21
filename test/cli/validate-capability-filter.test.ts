import { describe, it, expect } from 'vitest';
import { validateSpecFile } from '../../src/cli/commands/validate.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('validate capability filtering (multi-capability test-plan)', () => {
  it('does not report cross-capability Cases as dangling [cap-filter-T1]', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cap-filter-'));
    const changeDir = join(root, 'specpower', 'changes', 'multi-cap');
    const specsDir = join(changeDir, 'specs');
    mkdirSync(join(specsDir, 'cap-a'), { recursive: true });
    mkdirSync(join(specsDir, 'cap-b'), { recursive: true });
    writeFileSync(join(specsDir, 'cap-a', 'spec.md'),
      ['## ADDED Requirements', '', '### Requirement: Req A [testable]', 'desc', '',
       '#### Scenario: scen-a [negative]', '- **WHEN** bad', '- **THEN** reject', ''].join('\n'));
    writeFileSync(join(specsDir, 'cap-b', 'spec.md'),
      ['## ADDED Requirements', '', '### Requirement: Req B [testable]', 'desc', '',
       '#### Scenario: scen-b [negative]', '- **WHEN** bad', '- **THEN** reject', ''].join('\n'));
    writeFileSync(join(changeDir, '.specpower.yaml'), 'schema: specpower\nphase: built\n');
    writeFileSync(join(changeDir, 'test-plan.md'),
      ['## Capability: cap-a', '',
       '### Requirement: Req A → Scenario: scen-a', '',
       '- **Case** T1: reject bad [negative]', '  - Input: bad()',
       '  - Expected: reject', '  - it(): reject bad', '  - branch: reject-bad', '',
       '## Capability: cap-b', '',
       '### Requirement: Req B → Scenario: scen-b', '',
       '- **Case** T2: reject bad b [negative]', '  - Input: badb()',
       '  - Expected: reject', '  - it(): reject bad b', '  - branch: reject-bad-b', ''].join('\n'));
    try {
      const res = await validateSpecFile(join(specsDir, 'cap-a', 'spec.md'));
      expect(res.valid).toBe(true);
      expect(res.errors.some((e) => /dangling/i.test(e.message))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('single-capability test-plan is unaffected (filter is no-op) [cap-filter-T2]', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cap-filter-single-'));
    const changeDir = join(root, 'specpower', 'changes', 'single-cap');
    const specsDir = join(changeDir, 'specs');
    mkdirSync(join(specsDir, 'cap-a'), { recursive: true });
    writeFileSync(join(specsDir, 'cap-a', 'spec.md'),
      ['## ADDED Requirements', '', '### Requirement: Req A [testable]', 'desc', '',
       '#### Scenario: scen-a [negative]', '- **WHEN** bad', '- **THEN** reject', ''].join('\n'));
    writeFileSync(join(changeDir, '.specpower.yaml'), 'schema: specpower\nphase: built\n');
    writeFileSync(join(changeDir, 'test-plan.md'),
      ['## Capability: cap-a', '',
       '### Requirement: Req A → Scenario: scen-a', '',
       '- **Case** T1: reject bad [negative]', '  - Input: bad()',
       '  - Expected: reject', '  - it(): reject bad', '  - branch: reject-bad', ''].join('\n'));
    try {
      const res = await validateSpecFile(join(specsDir, 'cap-a', 'spec.md'));
      expect(res.valid).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
