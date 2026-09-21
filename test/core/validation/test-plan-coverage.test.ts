import { describe, it, expect } from 'vitest';
import { checkCoverage } from '../../../src/core/validation/test-plan-coverage.js';
import type { TestCase } from '../../../src/core/parsers/test-plan-parser.js';

const mk = (o: Partial<TestCase>): TestCase => ({
  id: o.id ?? 'T1', capability: 'c', requirement: 'r', scenarioRef: 's',
  mark: o.mark ?? 'positive', input: 'i', expected: 'e', itName: 'n', ...o,
});

describe('checkCoverage', () => {
  it('passes when every delta scenario has a case and negatives present [add-test-plan-artifact-T8] [enforce-coverage-floors-T25]', () => {
    const r = checkCoverage({
      deltaScenarios: [{ requirement: 'r', scenario: 's' }],
      cases: [mk({ scenarioRef: 's', mark: 'negative', branch: 'validate-null' })],
    });
    expect(r.issues).toEqual([]);
  });
  it('flags uncovered scenario [add-test-plan-artifact-T9] [enforce-coverage-floors-T23]', () => {
    const r = checkCoverage({
      deltaScenarios: [{ requirement: 'r', scenario: 's' }],
      cases: [],
    });
    expect(r.issues.some((i) => i.issue === 'uncovered-scenario')).toBe(true);
  });
  it('flags missing-negative for failure-admitting requirement [add-test-plan-artifact-T10]', () => {
    const r = checkCoverage({
      deltaScenarios: [{ requirement: 'r', scenario: 's' }],
      cases: [mk({ scenarioRef: 's', mark: 'positive' })],
      failureAdmittingRequirements: ['r'],
    });
    expect(r.issues.some((i) => i.issue === 'missing-negative')).toBe(true);
  });
  it('flags duplicate id', () => {
    const r = checkCoverage({
      deltaScenarios: [{ requirement: 'r', scenario: 's' }],
      cases: [mk({ id: 'T1', mark: 'negative' }), mk({ id: 'T1', scenarioRef: 's', mark: 'positive' })],
    });
    expect(r.issues.some((i) => i.issue === 'duplicate-id')).toBe(true);
  });
  it('flags dangling ref (scenario not in delta or baseline) [add-test-plan-artifact-T7]', () => {
    const r = checkCoverage({
      deltaScenarios: [{ requirement: 'r', scenario: 's' }],
      cases: [mk({ scenarioRef: 'nope', mark: 'negative' })],
      baselineScenarios: [],
    });
    expect(r.issues.some((i) => i.issue === 'dangling-ref')).toBe(true);
  });
  it('flags low-negative-ratio when failure-admitting req is below 30% [low-neg-ratio-T1] [enforce-coverage-floors-T10]', () => {
    // 1 negative / 4 total = 25% < 30% → low-negative-ratio
    const r = checkCoverage({
      deltaScenarios: [
        { requirement: 'r', scenario: 's-neg' },
        { requirement: 'r', scenario: 's-pos1' },
        { requirement: 'r', scenario: 's-pos2' },
        { requirement: 'r', scenario: 's-pos3' },
      ],
      cases: [
        mk({ id: 'T1', scenarioRef: 's-neg', mark: 'negative' }),
        mk({ id: 'T2', scenarioRef: 's-pos1', mark: 'positive' }),
        mk({ id: 'T3', scenarioRef: 's-pos2', mark: 'positive' }),
        mk({ id: 'T4', scenarioRef: 's-pos3', mark: 'positive' }),
      ],
      failureAdmittingRequirements: ['r'],
    });
    expect(r.issues.some((i) => i.issue === 'low-negative-ratio')).toBe(true);
    expect(r.issues.some((i) => i.issue === 'missing-negative')).toBe(false);
  });
  it('does NOT flag low-negative-ratio when at/above threshold [low-neg-ratio-T2]', () => {
    // 2 negative / 4 total = 50% ≥ 30% → clean (missing-negative also absent)
    const r = checkCoverage({
      deltaScenarios: [
        { requirement: 'r', scenario: 's-neg1' },
        { requirement: 'r', scenario: 's-neg2' },
        { requirement: 'r', scenario: 's-pos1' },
        { requirement: 'r', scenario: 's-pos2' },
      ],
      cases: [
        mk({ id: 'T1', scenarioRef: 's-neg1', mark: 'negative' }),
        mk({ id: 'T2', scenarioRef: 's-neg2', mark: 'negative' }),
        mk({ id: 'T3', scenarioRef: 's-pos1', mark: 'positive' }),
        mk({ id: 'T4', scenarioRef: 's-pos2', mark: 'positive' }),
      ],
      failureAdmittingRequirements: ['r'],
    });
    expect(r.issues.some((i) => i.issue === 'low-negative-ratio')).toBe(false);
    expect(r.issues.some((i) => i.issue === 'missing-negative')).toBe(false);
  });
  it('respects a custom negativeRatioThreshold [low-neg-ratio-T3]', () => {
    // 1 negative / 4 total = 25%; with threshold 0.20 → clean, with 0.30 → flagged
    const cases = [
      mk({ id: 'T1', scenarioRef: 's-neg', mark: 'negative' }),
      mk({ id: 'T2', scenarioRef: 's-pos1', mark: 'positive' }),
      mk({ id: 'T3', scenarioRef: 's-pos2', mark: 'positive' }),
      mk({ id: 'T4', scenarioRef: 's-pos3', mark: 'positive' }),
    ];
    const deltaScenarios = [
      { requirement: 'r', scenario: 's-neg' },
      { requirement: 'r', scenario: 's-pos1' },
      { requirement: 'r', scenario: 's-pos2' },
      { requirement: 'r', scenario: 's-pos3' },
    ];
    const loose = checkCoverage({ deltaScenarios, cases, failureAdmittingRequirements: ['r'], negativeRatioThreshold: 0.20 });
    const strict = checkCoverage({ deltaScenarios, cases, failureAdmittingRequirements: ['r'], negativeRatioThreshold: 0.30 });
    expect(loose.issues.some((i) => i.issue === 'low-negative-ratio')).toBe(false);
    expect(strict.issues.some((i) => i.issue === 'low-negative-ratio')).toBe(true);
  });

  // --- distinct-branch anti-water-injection (tier 2) ---
  it('deduplicates negative Cases sharing the same branch tag (blocks ratio padding) [branch-dedup-T1] [enforce-coverage-floors-T11]', () => {
    // 3 negative Cases, but all share branch "validate-null" → only 1 distinct branch.
    // 1 distinct + 0 untagged = 1 neg / 4 total = 25% < 30% → low-negative-ratio fires.
    // (Without dedup, 3/4 = 75% would PASS — that's the water-injection we block.)
    const r = checkCoverage({
      deltaScenarios: [
        { requirement: 'r', scenario: 's-neg' },
        { requirement: 'r', scenario: 's-pos1' },
        { requirement: 'r', scenario: 's-pos2' },
        { requirement: 'r', scenario: 's-pos3' },
      ],
      cases: [
        mk({ id: 'T1', scenarioRef: 's-neg', mark: 'negative', branch: 'validate-null' }),
        mk({ id: 'T2', scenarioRef: 's-neg', mark: 'negative', branch: 'validate-null' }),
        mk({ id: 'T3', scenarioRef: 's-neg', mark: 'negative', branch: 'validate-null' }),
        mk({ id: 'T4', scenarioRef: 's-pos1', mark: 'positive' }),
      ],
      failureAdmittingRequirements: ['r'],
    });
    expect(r.issues.some((i) => i.issue === 'low-negative-ratio')).toBe(true);
    expect(r.issues.some((i) => i.issue === 'duplicate-branch')).toBe(true);
  });

  it('counts distinct branches separately (legitimate multi-branch coverage) [branch-dedup-T2]', () => {
    // 2 negative Cases, 2 DISTINCT branches → 2 distinct / 4 total = 50% ≥ 30% → PASS.
    const r = checkCoverage({
      deltaScenarios: [
        { requirement: 'r', scenario: 's-neg1' },
        { requirement: 'r', scenario: 's-neg2' },
        { requirement: 'r', scenario: 's-pos1' },
        { requirement: 'r', scenario: 's-pos2' },
      ],
      cases: [
        mk({ id: 'T1', scenarioRef: 's-neg1', mark: 'negative', branch: 'validate-null' }),
        mk({ id: 'T2', scenarioRef: 's-neg2', mark: 'negative', branch: 'auth-reject' }),
        mk({ id: 'T3', scenarioRef: 's-pos1', mark: 'positive' }),
        mk({ id: 'T4', scenarioRef: 's-pos2', mark: 'positive' }),
      ],
      failureAdmittingRequirements: ['r'],
    });
    expect(r.issues.some((i) => i.issue === 'low-negative-ratio')).toBe(false);
    expect(r.issues.some((i) => i.issue === 'duplicate-branch')).toBe(false);
  });

  it('warns missing-branch-tag on untagged negative Cases [branch-dedup-T3] [enforce-coverage-floors-T12]', () => {
    const r = checkCoverage({
      deltaScenarios: [{ requirement: 'r', scenario: 's-neg' }],
      cases: [mk({ id: 'T1', scenarioRef: 's-neg', mark: 'negative' })], // no branch:
      failureAdmittingRequirements: ['r'],
    });
    expect(r.issues.some((i) => i.issue === 'missing-branch-tag')).toBe(true);
    // untagged negative Case still counts individually (legacy) → not missing-negative
    expect(r.issues.some((i) => i.issue === 'missing-negative')).toBe(false);
  });
});
