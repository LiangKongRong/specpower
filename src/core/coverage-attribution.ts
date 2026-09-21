/**
 * Per-Scenario branch coverage attribution.
 *
 * Reads a test-plan (Cases with optional `covers:` product source files) and a
 * coverage report (lcov.info for JS/TS v8/istanbul, or jacoco.xml for Java),
 * and attributes measured file-level branch coverage back to each Scenario.
 *
 * Honest granularity: branch coverage is natively per-file. A Scenario's
 * attributed branch coverage is the MINIMUM branch-coverage % across the union
 * of `covers:` files its Cases declare (a Scenario is only as covered as its
 * least-covered file). This is real measured coverage, not a proxy — but it
 * does not attribute individual branches to individual Scenarios (that needs
 * per-test instrumentation).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseTestPlanFile } from './parsers/test-plan-parser.js';
import type { TestCase } from './parsers/test-plan-parser.js';

export interface ScenarioCoverage {
  readonly scenario: string;
  readonly requirement: string;
  /** Attributed branch coverage %, or null if no Case had `covers:`. */
  readonly branchPct: number | null;
  /** The `covers:` files (normalized, forward-slash) attributed to this Scenario. */
  readonly coversFiles: readonly string[];
  /** Per-file branch % for each covers file (0 if not in report). */
  readonly filePcts: readonly { file: string; pct: number }[];
  readonly pass: boolean;
  readonly reason: string;
}

export interface AttributionInput {
  readonly cases: readonly TestCase[];
  /** Map of normalized file path -> branch coverage % (0-100). */
  readonly fileBranchPct: ReadonlyMap<string, number>;
  readonly threshold: number;
}

export interface AttributionResult {
  readonly scenarios: readonly ScenarioCoverage[];
  readonly pass: boolean;
  readonly failures: readonly ScenarioCoverage[];
}

/**
 * Attribute branch coverage to Scenarios from parsed Cases + a per-file branch%
 * map. Pure function — no I/O — so it is unit-testable.
 *
 * Rules (mirror specpower-verify Pass 5):
 * - Group Cases by scenarioRef (Scenario).
 * - Union of `covers:` files across the Scenario's Cases.
 * - A Scenario with no `covers:` on any Case → branchPct null → FAIL (no
 *   evidence the Scenario's branches are covered; `covers:` is required for
 *   testable Cases).
 * - A `covers:` file absent from the coverage report → contributes 0%.
 * - Scenario branchPct = min(filePcts); below threshold → FAIL.
 */
export function attributeCoverage(input: AttributionInput): AttributionResult {
  // Group Cases by scenarioRef, preserving first-seen requirement.
  const scenarios = new Map<string, { requirement: string; coversFiles: Set<string> }>();
  for (const c of input.cases) {
    if (!c.scenarioRef) continue;
    let entry = scenarios.get(c.scenarioRef);
    if (!entry) {
      entry = { requirement: c.requirement, coversFiles: new Set<string>() };
      scenarios.set(c.scenarioRef, entry);
    }
    if (c.covers) {
      // covers may be comma/space-separated list of files
      for (const f of c.covers.split(/[, ]+/)) {
        const norm = normalizePath(f.trim());
        if (norm) entry.coversFiles.add(norm);
      }
    }
  }

  const out: ScenarioCoverage[] = [];
  for (const [scenario, entry] of scenarios) {
    const coversFiles = [...entry.coversFiles];
    if (coversFiles.length === 0) {
      out.push({
        scenario,
        requirement: entry.requirement,
        branchPct: null,
        coversFiles,
        filePcts: [],
        pass: false,
        reason: `no covers: — cannot attribute (covers: required for testable Cases)`,
      });
      continue;
    }
    const filePcts = coversFiles.map((file) => {
      const pct = input.fileBranchPct.get(file);
      return { file, pct: pct === undefined ? 0 : pct };
    });
    const min = Math.min(...filePcts.map((fp) => fp.pct));
    const pass = min >= input.threshold;
    out.push({
      scenario,
      requirement: entry.requirement,
      branchPct: min,
      coversFiles,
      filePcts,
      pass,
      reason: pass
        ? `branch ${min}% >= ${input.threshold}% across ${filePcts.length} file(s)`
        : `branch ${min}% < ${input.threshold}% threshold across ${filePcts.length} file(s)`,
    });
  }

  const failures = out.filter((s) => !s.pass);
  return { scenarios: out, pass: failures.length === 0, failures };
}

/**
 * Parse a v8/istanbul lcov.info file into a Map of normalized file path -> branch
 * coverage %. v8/istanbul lcov lists branches as `BRDA:<line>,<block>,<branch>,<hit>`
 * under each `SF:<file>` record (hit `-` = uncovered). There is no BRH/BRF
 * summary, so we count: hit = 4th field !== '-', total = all BRDA lines for SF.
 *
 * Files with zero BRDA lines (no branches) are omitted (no branch coverage to
 * attribute — they contribute nothing and would skew the min toward 100% or
 * cause divide-by-zero).
 */
export function parseLcovBranchCoverage(lcovPath: string): Map<string, number> {
  const content = readFileSync(lcovPath, 'utf-8');
  const out = new Map<string, number>();
  let curFile: string | null = null;
  let total = 0;
  let hit = 0;
  const flush = (): void => {
    if (curFile !== null && total > 0) {
      out.set(curFile, Math.round((hit / total) * 100));
    }
    curFile = null;
    total = 0;
    hit = 0;
  };
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      flush();
      curFile = normalizePath(line.slice(3));
    } else if (line.startsWith('BRDA:')) {
      const parts = line.slice(5).split(',');
      total++;
      // lcov BRDA 4th field: hit count. '-' = unreachable, '0' = reachable
      // but never executed — both mean uncovered. (v8 lcov uses '0'.)
      const hitCount = parts[3];
      if (hitCount !== '-' && hitCount !== '0') hit++;
    } else if (line === 'end_of_record') {
      flush();
    }
  }
  flush();
  return out;
}

/**
 * Parse a jacoco XML report into a Map of normalized file path -> branch %.
 * jacoco groups counters per class; we aggregate per source file by summing
 * BRANCH counter covered/missed across all classes in the same file. The path
 * key is the package/class java path (e.g. com/huawei/a4adapter/dma/service/
 * DeviceManagementService.java). This is an approximation — jacoco keys by
 * class, not file; for `covers:` matching use the class's source file path.
 */
export function parseJacocoBranchCoverage(xmlPath: string): Map<string, number> {
  const content = readFileSync(xmlPath, 'utf-8');
  const out = new Map<string, number>();
  // Aggregate <counter type="BRANCH" missed="X" covered="Y"> per <class filename="...">.
  const classRe = /<class\s+[^>]*filename="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g;
  let m: RegExpExecArray | null;
  const perFile: Map<string, { covered: number; missed: number }> = new Map();
  while ((m = classRe.exec(content)) !== null) {
    const file = normalizePath(m[1]);
    const body = m[2];
    const branchCounter = /<counter\s+type="BRANCH"\s+missed="(\d+)"\s+covered="(\d+)"/.exec(body);
    if (!branchCounter) continue;
    const missed = parseInt(branchCounter[1], 10);
    const covered = parseInt(branchCounter[2], 10);
    const cur = perFile.get(file) ?? { covered: 0, missed: 0 };
    cur.covered += covered;
    cur.missed += missed;
    perFile.set(file, cur);
  }
  for (const [file, { covered, missed }] of perFile) {
    const total = covered + missed;
    if (total > 0) out.set(file, Math.round((covered / total) * 100));
  }
  return out;
}

/**
 * Resolve a coverage report to a per-file branch% map. Auto-detects lcov.info
 * vs jacoco.xml by content/extension. Returns null if no report found.
 */
export function resolveBranchCoverage(reportPath: string): Map<string, number> | null {
  if (!existsSync(reportPath)) return null;
  if (reportPath.endsWith('.xml') || reportPath.endsWith('jacoco.xml')) {
    return parseJacocoBranchCoverage(reportPath);
  }
  // Default: lcov.info
  return parseLcovBranchCoverage(reportPath);
}

/** Normalize a path to forward slashes (v8 lcov on Windows uses backslashes). */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').trim();
}

export interface OverallBranchResult {
  /** Aggregate branch coverage % across all files in the report (0-100). */
  readonly branchPct: number;
  readonly totalBranches: number;
  readonly hitBranches: number;
  readonly pass: boolean;
  readonly threshold: number;
  /** Per-file breakdown (file -> {hit, total, pct}), for surfacing low files. */
  readonly perFile: readonly { file: string; hit: number; total: number; pct: number }[];
  /** Files below the threshold (sorted ascending by pct), for the report. */
  readonly lowFiles: readonly { file: string; hit: number; total: number; pct: number }[];
}

/**
 * Compute the OVERALL branch coverage across a coverage report — the aggregate
 * hit/total branches across ALL files (not an average of per-file %). This is
 * the standard coverage-gate metric (what `vitest --coverage thresholds.branches`
 * and jacoco `<limit counter="BRANCH">` check), independent of any test-plan
 * `covers:` self-tagging — so it applies to legacy projects (e.g. a4adapter)
 * with no `[testable]`/`covers:` annotations at all.
 *
 * Unlike per-Scenario attribution, overall coverage CANNOT be padded by
 * `covers:` soft targets or hidden behind a single high-coverage file's
 * per-Scenario min — but it CAN be masked by high-coverage files pulling the
 * aggregate above threshold while a low-coverage file hides underneath. The
 * `lowFiles` list surfaces those so a reviewer sees the masking.
 */
export function overallBranchCoverage(reportPath: string, threshold = 75): OverallBranchResult {
  const content = readFileSync(reportPath, 'utf-8');
  let total = 0;
  let hit = 0;
  const perFile: { file: string; hit: number; total: number; pct: number }[] = [];

  if (reportPath.endsWith('.xml') || reportPath.endsWith('jacoco.xml')) {
    // jacoco: sum <counter type="BRANCH" missed/covered> per <class filename>.
    const classRe = /<class\s+[^>]*filename="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g;
    let m: RegExpExecArray | null;
    const perFileAgg: Map<string, { covered: number; missed: number }> = new Map();
    while ((m = classRe.exec(content)) !== null) {
      const file = normalizePath(m[1]);
      const bc = /<counter\s+type="BRANCH"\s+missed="(\d+)"\s+covered="(\d+)"/.exec(m[2]);
      if (!bc) continue;
      const missed = parseInt(bc[1], 10);
      const covered = parseInt(bc[2], 10);
      const cur = perFileAgg.get(file) ?? { covered: 0, missed: 0 };
      cur.covered += covered;
      cur.missed += missed;
      perFileAgg.set(file, cur);
    }
    for (const [file, { covered, missed }] of perFileAgg) {
      const t = covered + missed;
      if (t === 0) continue;
      total += t;
      hit += covered;
      perFile.push({ file, hit: covered, total: t, pct: Math.round((covered / t) * 100) });
    }
  } else {
    // lcov.info: count BRDA per SF.
    let curFile: string | null = null;
    let fileTotal = 0;
    let fileHit = 0;
    const flush = (): void => {
      if (curFile !== null && fileTotal > 0) {
        total += fileTotal;
        hit += fileHit;
        perFile.push({ file: curFile, hit: fileHit, total: fileTotal, pct: Math.round((fileHit / fileTotal) * 100) });
      }
      curFile = null;
      fileTotal = 0;
      fileHit = 0;
    };
    for (const line of content.split(/\r?\n/)) {
      if (line.startsWith('SF:')) {
        flush();
        curFile = normalizePath(line.slice(3));
      } else if (line.startsWith('BRDA:')) {
        const parts = line.slice(5).split(',');
        fileTotal++;
        // lcov BRDA 4th field: hit count. '-' = unreachable, '0' = reachable
        // but never executed — both mean uncovered. (v8 lcov uses '0'.)
        const hitCount = parts[3];
        if (hitCount !== '-' && hitCount !== '0') fileHit++;
      } else if (line === 'end_of_record') {
        flush();
      }
    }
    flush();
  }

  const branchPct = total > 0 ? Math.round((hit / total) * 100) : 0;
  const lowFiles = perFile
    .filter((f) => f.pct < threshold)
    .sort((a, b) => a.pct - b.pct);
  return {
    branchPct,
    totalBranches: total,
    hitBranches: hit,
    pass: branchPct >= threshold,
    threshold,
    perFile,
    lowFiles,
  };
}

/**
 * Run attribution for a change: read its test-plan.md, read the coverage
 * report, attribute branch coverage per Scenario, return result.
 *
 * @param changeRoot - Absolute path to the change directory (contains test-plan.md)
 * @param reportPath - Absolute path to coverage report (lcov.info or jacoco.xml)
 * @param threshold - Branch coverage threshold (0-100), default 75
 */
export async function attributeChangeCoverage(
  changeRoot: string,
  reportPath: string,
  threshold = 75,
): Promise<AttributionResult & { testPlanPath: string; reportPath: string }> {
  const testPlanPath = join(changeRoot, 'test-plan.md');
  const cases = await parseTestPlanFile(testPlanPath);
  const fileBranchPct = resolveBranchCoverage(reportPath);
  if (!fileBranchPct) {
    throw new Error(`Coverage report not found or unreadable: ${reportPath}`);
  }
  const result = attributeCoverage({ cases, fileBranchPct, threshold });
  return { ...result, testPlanPath, reportPath };
}
