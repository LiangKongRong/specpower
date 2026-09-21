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
 * summary, so we count: hit = 4th field !== '-' and !== '0', total = all BRDA lines for SF.
 *
 * Files with zero BRDA lines (no branches) are omitted (no branch coverage to
 * attribute — they contribute nothing and would skew the min toward 100% or
 * cause divide-by-zero).
 *
 * Integrity check: a well-formed lcov has one `end_of_record` per `SF:`. A
 * truncated/malformed report (e.g. half-written from an aborted coverage run)
 * may have `SF:` without matching `end_of_record`, yielding partial data that
 * could fabricate a (false) PASS. This function throws on such malformation
 * rather than silently reporting partial figures — so the spec scenario
 * "stale or malformed coverage report fails" holds (no false PASS from partial data).
 */
export function parseLcovBranchCoverage(lcovPath: string): Map<string, number> {
  const content = readFileSync(lcovPath, 'utf-8');
  return parseLcovContent(content);
}

/**
 * Parse lcov content (shared by file-path and content-based callers). Throws
 * on malformed/truncated lcov (SF count != end_of_record count). Pure (no I/O).
 */
function parseLcovContent(content: string): Map<string, number> {
  const out = new Map<string, number>();
  let curFile: string | null = null;
  let total = 0;
  let hit = 0;
  let sfCount = 0;
  let eorCount = 0;
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
      sfCount++;
    } else if (line.startsWith('BRDA:')) {
      const parts = line.slice(5).split(',');
      total++;
      // lcov BRDA 4th field: hit count. '-' = unreachable, '0' = reachable
      // but never executed — both mean uncovered. (v8 lcov uses '0'.)
      // An empty/truncated 4th field is malformed — guard against counting it as hit.
      const hitCount = parts[3];
      if (hitCount && hitCount !== '-' && hitCount !== '0') hit++;
    } else if (line === 'end_of_record') {
      flush();
      eorCount++;
    }
  }
  flush();
  // Integrity: each SF must have a matching end_of_record. A mismatch means
  // the report is truncated/malformed (partial data) — fail loudly, do not
  // fabricate coverage figures from partial data.
  if (sfCount !== eorCount) {
    throw new Error(
      `Malformed lcov: ${sfCount} SF: record(s) but ${eorCount} end_of_record line(s) — report is truncated or malformed (refuse to compute coverage from partial data)`,
    );
  }
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
/**
 * Parse a jacoco XML report into a Map of source-file basename -> branch %.
 * Standard jacoco emits <class name="com/pkg/Class" sourcefilename="Class.java">;
 * we key per source file by the sourcefilename basename (jacoco does not carry
 * the package path on <class>). For per-Scenario attribution, `covers:` paths
 * must be basenames to match. For --overall the aggregate is key-independent.
 */
export function parseJacocoBranchCoverage(xmlPath: string): Map<string, number> {
  const content = readFileSync(xmlPath, 'utf-8');
  return parseJacocoContent(content);
}

/**
 * Parse jacoco content (shared, pure). Returns Map<sourcefile basename, branch%>.
 */
function parseJacocoContent(content: string): Map<string, number> {
  const out = new Map<string, number>();
  const perFile: Map<string, { covered: number; missed: number }> = new Map();
  const tagRe = /<class\s+([^>]*)>([\s\S]*?)<\/class>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(content)) !== null) {
    const classAttrs = m[1];
    const body = m[2];
    const sfMatch = /sourcefilename="([^"]+)"/.exec(classAttrs);
    const nameMatch = /\bname="([^"]+)"/.exec(classAttrs);
    const file = normalizePath(sfMatch ? sfMatch[1] : (nameMatch ? nameMatch[1].split('/').pop()! : 'unknown'));
    const counterMatch = /<counter\s+[^>]*type="BRANCH"[^>]*\/>/.exec(body);
    if (!counterMatch) continue;
    const counterTag = counterMatch[0];
    const missedMatch = /missed="(\d+)"/.exec(counterTag);
    const coveredMatch = /covered="(\d+)"/.exec(counterTag);
    if (!missedMatch || !coveredMatch) continue;
    const missed = parseInt(missedMatch[1], 10);
    const covered = parseInt(coveredMatch[1], 10);
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
    // jacoco: sum <counter type="BRANCH" missed/covered> per <class>. Standard
    // jacoco emits <class name="com/pkg/Class" sourcefilename="Class.java"> —
    // NOT filename="full/path". The per-source-file key is the sourcefilename
    // basename (jacoco does not carry the package path on <class>; the package
    // is on <package name="com/pkg">, the sourcefile on <sourcefile name="Class.java">).
    // We key per-source-file by sourcefilename basename. For --overall the
    // aggregate is correct (key-independent). For per-Scenario attribution,
    // `covers:` paths must therefore be basenames (e.g. `DeviceManagementService.java`)
    // to match jacoco's sourcefilename — documented as a known limitation.
    // Parse attributes order-independently (counter attributes may be reordered
    // by XSL transforms); extract each attribute by name, not by position.
    const perFileAgg: Map<string, { covered: number; missed: number }> = new Map();
    const tagRe = /<class\s+([^>]*)>([\s\S]*?)<\/class>/g;
    let cm: RegExpExecArray | null;
    while ((cm = tagRe.exec(content)) !== null) {
      const classAttrs = cm[1];
      const body = cm[2];
      // sourcefilename="Class.java" (basename). Fall back to name="com/pkg/Class"
      // basename if sourcefilename absent (non-standard but defensive).
      const sfMatch = /sourcefilename="([^"]+)"/.exec(classAttrs);
      const nameMatch = /\bname="([^"]+)"/.exec(classAttrs);
      const file = normalizePath(sfMatch ? sfMatch[1] : (nameMatch ? nameMatch[1].split('/').pop()! : 'unknown'));
      // Counter: order-independent attribute parsing.
      const counterMatch = /<counter\s+[^>]*type="BRANCH"[^>]*\/>/.exec(body);
      if (!counterMatch) continue;
      const counterTag = counterMatch[0];
      const missedMatch = /missed="(\d+)"/.exec(counterTag);
      const coveredMatch = /covered="(\d+)"/.exec(counterTag);
      if (!missedMatch || !coveredMatch) continue;
      const missed = parseInt(missedMatch[1], 10);
      const covered = parseInt(coveredMatch[1], 10);
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
    // lcov.info: call parseLcovContent first to enforce the SF/end_of_record
    // integrity check (throws on truncated/malformed — no false PASS from
    // partial data), then inline the raw-count aggregation (parseLcovContent
    // only returns pct; aggregate needs raw hit/total).
    parseLcovContent(content);
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
        const hitCount = parts[3];
        if (hitCount && hitCount !== '-' && hitCount !== '0') fileHit++;
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
