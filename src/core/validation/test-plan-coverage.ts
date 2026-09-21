import type { TestCase } from '../parsers/test-plan-parser.js';
import type { TestPlanIssue, TestPlanIssueKind } from './types.js';

export interface CoverageInput {
  readonly deltaScenarios: ReadonlyArray<{ requirement: string; scenario: string }>;
  readonly cases: readonly TestCase[];
  readonly baselineScenarios?: ReadonlyArray<{ requirement: string; scenario: string }>;
  readonly failureAdmittingRequirements?: readonly string[];
  /**
   * Minimum fraction of `[negative]` Cases a failure-admitting Requirement must
   * have to avoid a `low-negative-ratio` issue. Defaults to `0.30` (30%) — the
   * side-effect-bearing target from the spec authoring guide. Pure-function
   * capabilities naturally sit at 15-30% and may set this lower; a single flat
   * 30% will over-report on pure-function modules. `0` disables the check.
   */
  readonly negativeRatioThreshold?: number;
}

export interface CoverageResult {
  readonly issues: readonly TestPlanIssue[];
}

export function checkCoverage(input: CoverageInput): CoverageResult {
  const issues: TestPlanIssue[] = [];
  const baseline = input.baselineScenarios ?? [];
  const admit = new Set(input.failureAdmittingRequirements ?? []);

  const allScenarioNames = new Set<string>();
  for (const s of input.deltaScenarios) allScenarioNames.add(s.scenario);
  for (const s of baseline) allScenarioNames.add(s.scenario);

  // orphan case: no scenario ref
  for (const c of input.cases) {
    if (!c.scenarioRef) {
      issues.push({ kind: 'test-plan', issue: 'orphan-case' as TestPlanIssueKind, message: `Case ${c.id} has no scenario reference`, caseId: c.id });
    }
  }

  // dangling ref
  for (const c of input.cases) {
    if (c.scenarioRef && !allScenarioNames.has(c.scenarioRef)) {
      issues.push({ kind: 'test-plan', issue: 'dangling-ref', message: `Case ${c.id} references non-existent scenario "${c.scenarioRef}"`, caseId: c.id, scenario: c.scenarioRef });
    }
  }

  // duplicate id
  const seenId = new Set<string>();
  for (const c of input.cases) {
    if (seenId.has(c.id)) {
      issues.push({ kind: 'test-plan', issue: 'duplicate-id', message: `Duplicate case id ${c.id}`, caseId: c.id });
    }
    seenId.add(c.id);
  }

  // duplicate it() name
  const seenIt = new Set<string>();
  for (const c of input.cases) {
    if (c.itName && seenIt.has(c.itName)) {
      issues.push({ kind: 'test-plan', issue: 'duplicate-it-name', message: `Duplicate it() name "${c.itName}"`, caseId: c.id });
    }
    seenIt.add(c.itName);
  }

  // uncovered delta scenario
  const coveredScenarios = new Set(input.cases.map((c) => c.scenarioRef));
  for (const s of input.deltaScenarios) {
    if (!coveredScenarios.has(s.scenario)) {
      issues.push({ kind: 'test-plan', issue: 'uncovered-scenario', message: `Scenario "${s.scenario}" has no case`, scenario: s.scenario });
    }
  }

  // missing negative per failure-admitting requirement, plus low-negative-ratio.
  // Negative ratio is counted over DISTINCT error branches (via `branch:` tags),
  // not over Cases — so a requirement with 1 error branch cannot pad its ratio
  // by adding multiple negative Cases that all test the same branch (water-injection).
  // A negative Case with no `branch:` tag is counted individually (legacy) AND
  // emits a `missing-branch-tag` warning so the reviewer knows the distinct-branch
  // floor is not enforced for that Case. Two negative Cases sharing the same
  // `branch:` tag emit `duplicate-branch` (the reviewer sees the injection trace).
  const reqToNegBranches: Record<string, Set<string>> = {};
  const reqToNegUntagged: Record<string, number> = {};
  const reqToTotalCases: Record<string, number> = {};
  const reqBranchSeenBy: Record<string, Record<string, string[]>> = {}; // req -> branch -> caseIds
  for (const c of input.cases) {
    if (!c.scenarioRef) continue;
    // map case→requirement via delta or baseline
    const ds = input.deltaScenarios.find((s) => s.scenario === c.scenarioRef);
    const bs = baseline.find((s) => s.scenario === c.scenarioRef);
    const req = (ds ?? bs)?.requirement;
    if (!req) continue;
    reqToTotalCases[req] = (reqToTotalCases[req] ?? 0) + 1;
    if (c.mark !== 'negative') continue;
    if (!c.branch || !c.branch.trim()) {
      // untagged negative Case: counted individually (legacy), warn so reviewer
      // knows distinct-branch floor is not enforced for this Case.
      reqToNegUntagged[req] = (reqToNegUntagged[req] ?? 0) + 1;
      continue;
    }
    const branch = c.branch.trim();
    if (!reqToNegBranches[req]) reqToNegBranches[req] = new Set();
    reqToNegBranches[req].add(branch);
    if (!reqBranchSeenBy[req]) reqBranchSeenBy[req] = {};
    if (!reqBranchSeenBy[req][branch]) reqBranchSeenBy[req][branch] = [];
    reqBranchSeenBy[req][branch].push(c.id);
  }
  // duplicate-branch: >1 negative Case sharing a branch tag (injection trace)
  for (const req of Object.keys(reqBranchSeenBy)) {
    for (const [branch, caseIds] of Object.entries(reqBranchSeenBy[req])) {
      if (caseIds.length > 1) {
        issues.push({ kind: 'test-plan', issue: 'duplicate-branch', message: `Requirement "${req}": Cases ${caseIds.join(', ')} share branch "${branch}" — only one counts toward the distinct-branch ratio (possible ratio padding)`, scenario: req });
      }
    }
  }
  // missing-branch-tag: untagged negative Cases (distinct-branch floor not enforced)
  for (const req of Object.keys(reqToNegUntagged)) {
    if (reqToNegUntagged[req] > 0) {
      issues.push({ kind: 'test-plan', issue: 'missing-branch-tag', message: `Requirement "${req}": ${reqToNegUntagged[req]} negative case(s) lack a \`branch:\` tag — distinct-branch ratio not enforced for them (add \`branch:\` so ratio padding cannot hide)`, scenario: req });
    }
  }
  const threshold = input.negativeRatioThreshold ?? 0.30;
  for (const req of admit) {
    const distinctNegBranches = reqToNegBranches[req]?.size ?? 0;
    const untaggedNeg = reqToNegUntagged[req] ?? 0;
    const neg = distinctNegBranches + untaggedNeg; // tagged-distinct + untagged-individual
    const total = reqToTotalCases[req] ?? 0;
    if (neg === 0) {
      issues.push({ kind: 'test-plan', issue: 'missing-negative', message: `Requirement "${req}" admits failure but has no negative case`, scenario: req });
      continue;
    }
    // neg > 0 but below threshold → low-negative-ratio (more error branches likely uncovered).
    // neg counts DISTINCT branches (tagged) + untagged-individual, so padding by
    // repeating the same branch tag is already deduplicated above.
    if (threshold > 0 && total > 0 && neg / total < threshold) {
      const pct = Math.round((neg / total) * 100);
      const need = Math.ceil(threshold * total);
      issues.push({ kind: 'test-plan', issue: 'low-negative-ratio', message: `Requirement "${req}" has ${neg}/${total} (${pct}%) distinct negative branches/cases — below ${Math.round(threshold * 100)}% threshold (need ≥${need} negative); error branches likely uncovered`, scenario: req });
    }
  }

  return { issues };
}
