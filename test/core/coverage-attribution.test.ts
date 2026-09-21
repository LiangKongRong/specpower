import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { attributeCoverage, normalizePath, overallBranchCoverage } from '../../src/core/coverage-attribution.js';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
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
});
