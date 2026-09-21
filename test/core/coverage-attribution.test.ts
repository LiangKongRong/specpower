import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { attributeCoverage, normalizePath, overallBranchCoverage, parseLcovBranchCoverage, parseJacocoBranchCoverage } from '../../src/core/coverage-attribution.js';
import { writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { TestCase } from '../../src/core/parsers/test-plan-parser.js';

const mk = (o: Partial<TestCase>): TestCase => ({
  id: o.id ?? 'T1', capability: 'c', requirement: 'r', scenarioRef: 's',
  mark: o.mark ?? 'positive', input: 'i', expected: 'e', itName: 'n', ...o,
});

describe('attributeCoverage', () => {
  it('attributes min branch coverage across a scenario\'s covers files [cov-attr-T1]', () => {
    const cases = [
      mk({ id: 'T1', scenarioRef: 'scen-a', covers: 'src/a.ts, src/b.ts' }),
    ];
    const fileBranchPct = new Map([
      ['src/a.ts', 90],
      ['src/b.ts', 60],
    ]);
    const r = attributeCoverage({ cases, fileBranchPct, threshold: 75 });
    expect(r.scenarios).toHaveLength(1);
    expect(r.scenarios[0].scenario).toBe('scen-a');
    expect(r.scenarios[0].branchPct).toBe(60); // min(90, 60)
    expect(r.scenarios[0].pass).toBe(false); // 60 < 75
    expect(r.pass).toBe(false);
  });

  it('PASSes when all covers files are at/above threshold [cov-attr-T2]', () => {
    const cases = [
      mk({ id: 'T1', scenarioRef: 'scen-a', covers: 'src/a.ts, src/b.ts' }),
    ];
    const fileBranchPct = new Map([['src/a.ts', 80], ['src/b.ts', 90]]);
    const r = attributeCoverage({ cases, fileBranchPct, threshold: 75 });
    expect(r.scenarios[0].branchPct).toBe(80);
    expect(r.scenarios[0].pass).toBe(true);
    expect(r.pass).toBe(true);
  });

  it('FAILs a scenario with no covers: (covers: required for testable) [cov-attr-T3]', () => {
    const cases = [mk({ id: 'T1', scenarioRef: 'scen-a' })]; // no covers
    const r = attributeCoverage({ cases, fileBranchPct: new Map(), threshold: 75 });
    expect(r.scenarios[0].branchPct).toBe(null);
    expect(r.scenarios[0].pass).toBe(false);
    expect(r.pass).toBe(false);
  });

  it('treats a covers: file absent from the report as 0% [cov-attr-T4]', () => {
    const cases = [mk({ id: 'T1', scenarioRef: 'scen-a', covers: 'src/missing.ts' })];
    const r = attributeCoverage({ cases, fileBranchPct: new Map(), threshold: 75 });
    expect(r.scenarios[0].branchPct).toBe(0);
    expect(r.scenarios[0].pass).toBe(false);
  });

  it('unions covers: across multiple cases in the same scenario [cov-attr-T5]', () => {
    const cases = [
      mk({ id: 'T1', scenarioRef: 'scen-a', covers: 'src/a.ts' }),
      mk({ id: 'T2', scenarioRef: 'scen-a', covers: 'src/b.ts' }),
    ];
    const fileBranchPct = new Map([['src/a.ts', 100], ['src/b.ts', 40]]);
    const r = attributeCoverage({ cases, fileBranchPct, threshold: 75 });
    expect(r.scenarios).toHaveLength(1); // grouped by scenarioRef
    expect(r.scenarios[0].coversFiles).toHaveLength(2);
    expect(r.scenarios[0].branchPct).toBe(40); // min(100, 40)
  });

  it('one scenario below threshold fails the whole change (no majority leniency) [cov-attr-T6]', () => {
    const cases = [
      mk({ id: 'T1', scenarioRef: 'scen-good', covers: 'src/good.ts' }),
      mk({ id: 'T2', scenarioRef: 'scen-bad', covers: 'src/bad.ts' }),
    ];
    const fileBranchPct = new Map([['src/good.ts', 90], ['src/bad.ts', 50]]);
    const r = attributeCoverage({ cases, fileBranchPct, threshold: 75 });
    expect(r.scenarios).toHaveLength(2);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0].scenario).toBe('scen-bad');
    expect(r.pass).toBe(false);
  });

  it('normalizes backslash paths to forward slashes [cov-attr-T7]', () => {
    expect(normalizePath('src\\cli\\init.ts')).toBe('src/cli/init.ts');
    // A covers: path with backslashes should match an SF with forward slashes
    const cases = [mk({ id: 'T1', scenarioRef: 'scen-a', covers: 'src\\a.ts' })];
    const fileBranchPct = new Map([['src/a.ts', 80]]);
    const r = attributeCoverage({ cases, fileBranchPct, threshold: 75 });
    expect(r.scenarios[0].branchPct).toBe(80); // matched after normalization
    expect(r.scenarios[0].pass).toBe(true);
  });
});

describe('overallBranchCoverage', () => {
  // Build a minimal lcov.info with two files: one fully covered, one at 50%.
  // Aggregate = (2 hit + 1 hit) / (2 + 2) = 75%.
  const LCOV = [
    'SF:src/a.ts',
    'BRDA:1,0,0,1',
    'BRDA:2,1,0,1',
    'end_of_record',
    'SF:src/b.ts',
    'BRDA:1,0,0,1',
    'BRDA:2,1,0,-',
    'end_of_record',
    '',
  ].join('\n');

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cov-overall-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('computes aggregate branch coverage across all files (not average of %) [overall-T1]', () => {
    const path = join(dir, 'lcov.info');
    writeFileSync(path, LCOV);
    // a.ts: 2/2=100%, b.ts: 1/2=50%. Average of % = 75%. Aggregate = 3/4 = 75%.
    // (Here average and aggregate coincide; the point is aggregate uses raw counts.)
    const r = overallBranchCoverage(path, 75);
    expect(r.hitBranches).toBe(3);
    expect(r.totalBranches).toBe(4);
    expect(r.branchPct).toBe(75);
    expect(r.pass).toBe(true);
  });

  it('FAILs when aggregate is below threshold [overall-T2]', () => {
    const path = join(dir, 'lcov.info');
    writeFileSync(path, LCOV);
    const r = overallBranchCoverage(path, 80); // 75% < 80%
    expect(r.branchPct).toBe(75);
    expect(r.pass).toBe(false);
  });

  it('surfaces low-coverage files even when aggregate passes (masking detection) [overall-T3]', () => {
    // a.ts 100% (2/2), b.ts 0% (0/2). Aggregate = 2/4 = 50% → FAIL.
    // But if threshold were 40%, aggregate 50% PASS yet b.ts 0% is masked.
    const lcov = [
      'SF:src/a.ts',
      'BRDA:1,0,0,1',
      'BRDA:2,1,0,1',
      'end_of_record',
      'SF:src/b.ts',
      'BRDA:1,0,0,-',
      'BRDA:2,1,0,-',
      'end_of_record',
      '',
    ].join('\n');
    const path = join(dir, 'lcov.info');
    writeFileSync(path, lcov);
    const r = overallBranchCoverage(path, 40); // 50% >= 40% → pass, but b.ts masked
    expect(r.pass).toBe(true);
    expect(r.lowFiles.some((f) => f.file === 'src/b.ts' && f.pct === 0)).toBe(true);
  });

  it('treats BRDA 4th field "0" as uncovered (v8 lcov format) [overall-T4]', () => {
    // v8 lcov uses '0' (not '-') for reachable-but-unexecuted branches.
    // a.ts: 1 hit / 2 total (one '1', one '0') = 50%.
    const lcov = [
      'SF:src/a.ts',
      'BRDA:1,0,0,1',
      'BRDA:2,1,0,0',
      'end_of_record',
      '',
    ].join('\n');
    const path = join(dir, 'lcov.info');
    writeFileSync(path, lcov);
    const r = overallBranchCoverage(path, 75);
    expect(r.hitBranches).toBe(1);
    expect(r.totalBranches).toBe(2);
    expect(r.branchPct).toBe(50);
    expect(r.pass).toBe(false); // 50% < 75%
  });

  it('throws on truncated/malformed lcov (no false PASS from partial data) [overall-T5]', () => {
    // Truncated: SF: without matching end_of_record → must throw, not fabricate %.
    const lcov = [
      'SF:src/a.ts',
      'BRDA:1,0,0,1',
      'BRDA:2,1,0,1',
      // missing end_of_record — truncated
      '',
    ].join('\n');
    const path = join(dir, 'lcov.info');
    writeFileSync(path, lcov);
    expect(() => overallBranchCoverage(path, 75)).toThrow(/Malformed lcov/);
  });

  it('parses jacoco XML aggregate branch coverage by sourcefilename [overall-T6]', () => {
    // Standard jacoco <class name="pkg/Foo" sourcefilename="Foo.java"> with
    // <counter type="BRANCH" missed="1" covered="2"/> → 2/(1+2) = 67%.
    // Attributes order-independent; key is sourcefilename basename.
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <package name="pkg">',
      '    <class name="pkg/Foo" sourcefilename="Foo.java">',
      '      <counter type="BRANCH" missed="1" covered="2"/>',
      '    </class>',
      '  </package>',
      '</report>',
      '',
    ].join('\n');
    const path = join(dir, 'jacoco.xml');
    writeFileSync(path, xml);
    const r = overallBranchCoverage(path, 60);
    expect(r.hitBranches).toBe(2);
    expect(r.totalBranches).toBe(3);
    expect(r.branchPct).toBe(67);
    expect(r.pass).toBe(true); // 67% >= 60%
  });

  it('jacoco counter attributes parsed order-independently [overall-T7]', () => {
    // covered before missed (XSL-reordered) — must still parse correctly.
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <class name="pkg/Bar" sourcefilename="Bar.java">',
      '    <counter covered="3" missed="1" type="BRANCH"/>',
      '  </class>',
      '</report>',
      '',
    ].join('\n');
    const path = join(dir, 'jacoco.xml');
    writeFileSync(path, xml);
    const r = overallBranchCoverage(path, 75);
    expect(r.hitBranches).toBe(3);
    expect(r.totalBranches).toBe(4);
    expect(r.branchPct).toBe(75);
  });

  it('lowFiles list truncated when >20 files below threshold [overall-T8]', () => {
    // 25 files each at 0% (1 SF, 1 uncovered BRDA each), threshold 75 → all low.
    const lines: string[] = [];
    for (let i = 0; i < 25; i++) {
      lines.push(`SF:src/file${i}.ts`, 'BRDA:1,0,0,-', 'end_of_record');
    }
    const path = join(dir, 'lcov.info');
    writeFileSync(path, lines.join('\n'));
    const r = overallBranchCoverage(path, 75);
    expect(r.lowFiles.length).toBe(25);
    // The CLI truncates display to 20; overallBranchCoverage returns all 25
    // (truncation is a CLI presentation concern, tested at the CLI layer).
    expect(r.pass).toBe(false); // 0% aggregate
  });
});

describe('parseLcovBranchCoverage malformed guard', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'lcov-malformed-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('throws on truncated lcov (SF without end_of_record) [lcov-malformed-T1]', () => {
    const path = join(dir, 'lcov.info');
    writeFileSync(path, ['SF:src/a.ts', 'BRDA:1,0,0,1', ''].join('\n'));
    expect(() => parseLcovBranchCoverage(path)).toThrow(/Malformed lcov/);
  });
});

describe('parseJacocoBranchCoverage sourcefilename key', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jacoco-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('keys per sourcefile basename (standard jacoco) [jacoco-T1]', () => {
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <class name="pkg/Foo" sourcefilename="Foo.java">',
      '    <counter type="BRANCH" missed="1" covered="3"/>',
      '  </class>',
      '</report>',
      '',
    ].join('\n');
    const path = join(dir, 'jacoco.xml');
    writeFileSync(path, xml);
    const m = parseJacocoBranchCoverage(path);
    expect(m.get('Foo.java')).toBe(75); // 3/(1+3)
    expect(m.has('pkg/Foo.java')).toBe(false); // not keyed by package path
  });

  it('uses class-level aggregate counter, not method-level (real jacoco) [jacoco-T2]', () => {
    // Real jacoco: <class> body has method-level <counter> nested in <method>,
    // then the class-level aggregate <counter> (the correct one to use).
    // method bar: missed=1 covered=2; method baz: missed=0 covered=3;
    // class aggregate: missed=1 covered=5. We must use class (5/6=83%), not the
    // first method (2/3=67%) — this is the bug the fix addresses.
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <class name="pkg/Foo" sourcefilename="Foo.java">',
      '    <method name="bar"><counter type="BRANCH" missed="1" covered="2"/></method>',
      '    <method name="baz"><counter type="BRANCH" missed="0" covered="3"/></method>',
      '    <counter type="BRANCH" missed="1" covered="5"/>',
      '  </class>',
      '</report>',
      '',
    ].join('\n');
    const path = join(dir, 'jacoco.xml');
    writeFileSync(path, xml);
    const m = parseJacocoBranchCoverage(path);
    expect(m.get('Foo.java')).toBe(83); // class-level 5/(1+5)=83%, NOT method bar 67%
  });

  it('throws on truncated jacoco (<class> without </class>) [jacoco-T3]', () => {
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <class name="pkg/Foo" sourcefilename="Foo.java">',
      '    <counter type="BRANCH" missed="1" covered="2"/>',
      // missing </class> and </report> — truncated
      '',
    ].join('\n');
    const path = join(dir, 'jacoco.xml');
    writeFileSync(path, xml);
    expect(() => parseJacocoBranchCoverage(path)).toThrow(/Malformed jacoco/);
  });

  it('throws on partial truncation (some classes closed, one unclosed) [jacoco-T3b]', () => {
    // Realistic partial-truncation: 1 closed class + 1 trailing unclosed class.
    // The old check (hasClassPair) would NOT throw (a pair exists) and silently
    // drop the unclosed class — potentially false-PASSing by discarding a
    // low-coverage file. The open/close count check must throw.
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <class name="pkg/Foo" sourcefilename="Foo.java">',
      '    <counter type="BRANCH" missed="1" covered="9"/>',
      '  </class>',
      '  <class name="pkg/Bar" sourcefilename="Bar.java">',
      '    <counter type="BRANCH" missed="9" covered="1"/>',
      // Bar's </class> missing — truncated mid-class
      '</report>',
      '',
    ].join('\n');
    const path = join(dir, 'jacoco.xml');
    writeFileSync(path, xml);
    expect(() => parseJacocoBranchCoverage(path)).toThrow(/Malformed jacoco.*open.*close|open\/close/i);
  });

  it('skips classes without sourcefilename (no misleading fallback key) [jacoco-T4]', () => {
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <class name="pkg/NoSource">',
      '    <counter type="BRANCH" missed="1" covered="2"/>',
      '  </class>',
      '  <class name="pkg/Foo" sourcefilename="Foo.java">',
      '    <counter type="BRANCH" missed="1" covered="3"/>',
      '  </class>',
      '</report>',
      '',
    ].join('\n');
    const path = join(dir, 'jacoco.xml');
    writeFileSync(path, xml);
    const m = parseJacocoBranchCoverage(path);
    expect(m.has('NoSource')).toBe(false); // skipped (no sourcefilename)
    expect(m.has('unknown')).toBe(false); // no misleading fallback key
    expect(m.get('Foo.java')).toBe(75);
  });
});

describe('attributeChangeCoverage jacoco end-to-end (T33)', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'attr-jacoco-e2e-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('jacoco + full-path covers: false-FAILs (basename mismatch) [attr-jacoco-T1]', async () => {
    const { attributeChangeCoverage } = await import('../../src/core/coverage-attribution.js');
    // jacoco report: Foo.java class-level 5/6 = 83%.
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <class name="pkg/Foo" sourcefilename="Foo.java">',
      '    <counter type="BRANCH" missed="1" covered="5"/>',
      '  </class>',
      '</report>',
      '',
    ].join('\n');
    const reportPath = join(dir, 'jacoco.xml');
    writeFileSync(reportPath, xml);
    // test-plan with a Case whose covers: is the FULL package path (not basename).
    // This must NOT match jacoco's sourcefilename basename key → 0% → false FAIL.
    const changeDir = join(dir, 'change');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(join(changeDir, 'test-plan.md'),
      ['## Capability: cap', '',
       '### Requirement: R → Scenario: s', '',
       '- **Case** T1: jacoco full-path [negative]',
       '  - Input: foo()', '  - Expected: reject', '  - it(): jacoco fullpath',
       '  - branch: jacoco-fullpath', '  - covers: com/pkg/Foo.java', ''].join('\n'));
    const r = await attributeChangeCoverage(changeDir, reportPath, 75);
    expect(r.scenarios).toHaveLength(1);
    // full path does not match basename key → 0% → FAIL
    expect(r.scenarios[0].branchPct).toBe(0);
    expect(r.scenarios[0].pass).toBe(false);
    expect(r.pass).toBe(false);
  });

  it('jacoco + basename covers: PASSes when matched [attr-jacoco-T2]', async () => {
    const { attributeChangeCoverage } = await import('../../src/core/coverage-attribution.js');
    const xml = [
      '<?xml version="1.0"?>',
      '<report>',
      '  <class name="pkg/Foo" sourcefilename="Foo.java">',
      '    <counter type="BRANCH" missed="1" covered="5"/>',
      '  </class>',
      '</report>',
      '',
    ].join('\n');
    const reportPath = join(dir, 'jacoco.xml');
    writeFileSync(reportPath, xml);
    const changeDir = join(dir, 'change');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(join(changeDir, 'test-plan.md'),
      ['## Capability: cap', '',
       '### Requirement: R → Scenario: s', '',
       '- **Case** T1: jacoco basename [negative]',
       '  - Input: foo()', '  - Expected: reject', '  - it(): jacoco basename',
       '  - branch: jacoco-basename', '  - covers: Foo.java', ''].join('\n'));
    const r = await attributeChangeCoverage(changeDir, reportPath, 75);
    expect(r.scenarios[0].branchPct).toBe(83); // 5/(1+5)
    expect(r.scenarios[0].pass).toBe(true);
    expect(r.pass).toBe(true);
  });
});
