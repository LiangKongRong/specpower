/**
 * CLI command: specpower coverage-attribution <change-name>
 *
 * Attributes measured branch coverage (from a coverage report) back to each
 * Scenario in a change's test-plan.md, via each Case's `covers:` field. This is
 * the machine implementation of `/specpower:verify` Pass 5 — it reads lcov.info
 * (v8/istanbul) or jacoco.xml and outputs per-Scenario branch %, exiting
 * non-zero if any testable Scenario is below the threshold.
 *
 * Usage:
 *   specpower coverage-attribution <change-name> [--report <path>] [--threshold <n>]
 *
 * Default --report: coverage/lcov.info (JS/TS) or target/site/jacoco/jacoco.xml (Java).
 * Default --threshold: 75.
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { Command } from 'commander';
import { requireProjectRoot } from '../../utils/project-root.js';
import { attributeChangeCoverage, overallBranchCoverage } from '../../core/coverage-attribution.js';

const DEFAULT_REPORTS = [
  'coverage/lcov.info',
  'target/site/jacoco/jacoco.xml',
];

function resolveReportPath(projectRoot: string, explicit?: string): string | null {
  if (explicit) {
    return existsSync(join(projectRoot, explicit)) ? join(projectRoot, explicit) : null;
  }
  for (const rel of DEFAULT_REPORTS) {
    if (existsSync(join(projectRoot, rel))) return join(projectRoot, rel);
  }
  return null;
}

export function registerCoverageAttributionCommand(program: Command): void {
  program
    .command('coverage-attribution [change-name]')
    .description('Attribute measured branch coverage to test-plan Scenarios via covers: fields, or with --overall check the project-wide branch coverage gate')
    .option('--overall', 'Check the project-wide (aggregate) branch coverage gate instead of per-Scenario attribution — applies to legacy projects with no covers: annotations', false)
    .option('--report <path>', 'Coverage report path (lcov.info or jacoco.xml)', '')
    .option('--threshold <n>', 'Branch coverage threshold (0-100)', '75')
    .action(async (changeName: string | undefined, opts: { overall?: boolean; report?: string; threshold?: string }) => {
      const projectRoot = requireProjectRoot();

      const reportPath = resolveReportPath(projectRoot, opts.report);
      if (!reportPath) {
        console.error(
          `No coverage report found. Run the project's coverage command first (e.g. npm run test:cov / mvn test jacoco:report), or pass --report <path>. Looked for: ${DEFAULT_REPORTS.join(', ')}${opts.report ? `, ${opts.report}` : ''}`,
        );
        process.exitCode = 1;
        return;
      }

      const threshold = parseInt(opts.threshold ?? '75', 10);
      if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
        console.error(`Invalid threshold: ${opts.threshold} (must be 0-100)`);
        process.exitCode = 1;
        return;
      }

      // --- --overall mode: project-wide aggregate branch coverage gate ---
      if (opts.overall) {
        let overall;
        try {
          overall = overallBranchCoverage(reportPath, threshold);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Coverage attribution failed: ${message}`);
          process.exitCode = 1;
          return;
        }
        console.info(`Coverage report: ${reportPath}`);
        console.info(`Threshold: ${threshold}% (overall aggregate)\n`);
        console.info(`Overall branch coverage: ${overall.branchPct}% (${overall.hitBranches}/${overall.totalBranches}) — ${overall.pass ? 'PASS' : 'FAIL'}`);
        if (overall.lowFiles.length > 0) {
          console.info(`\n${overall.lowFiles.length} file(s) below ${threshold}% (may be masked by higher-coverage files):`);
          for (const f of overall.lowFiles.slice(0, 20)) {
            console.info(`  ${f.pct}%  ${f.hit}/${f.total}  ${f.file}`);
          }
          if (overall.lowFiles.length > 20) {
            console.info(`  ... and ${overall.lowFiles.length - 20} more`);
          }
        }
        console.info('');
        if (overall.pass) {
          console.info(`PASS — overall branch coverage ${overall.branchPct}% >= ${threshold}% threshold.`);
        } else {
          console.info(`FAIL — overall branch coverage ${overall.branchPct}% < ${threshold}% threshold.`);
          process.exitCode = 1;
        }
        return;
      }

      // --- per-Scenario attribution mode (requires change-name) ---
      if (!changeName) {
        console.error('coverage-attribution requires a <change-name> (or pass --overall for the project-wide gate).');
        process.exitCode = 1;
        return;
      }

      const changeRoot = join(projectRoot, 'specpower', 'changes', changeName);
      if (!existsSync(changeRoot)) {
        console.error(`Change "${changeName}" not found at ${changeRoot}`);
        process.exitCode = 1;
        return;
      }

      let result;
      try {
        result = await attributeChangeCoverage(changeRoot, reportPath, threshold);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Coverage attribution failed: ${message}`);
        process.exitCode = 1;
        return;
      }

      console.info(`Coverage report: ${result.reportPath}`);
      console.info(`Threshold: ${threshold}%\n`);

      if (result.scenarios.length === 0) {
        console.info('No Scenarios with Cases found in test-plan.md.');
        return;
      }

      for (const s of result.scenarios) {
        const status = s.pass ? 'PASS' : 'FAIL';
        const pct = s.branchPct === null ? 'n/a' : `${s.branchPct}%`;
        console.info(`[${status}] ${s.scenario} — branch ${pct}`);
        if (s.branchPct === null) {
          console.info(`       ${s.reason}`);
        } else {
          const files = s.filePcts.map((fp) => `${fp.file}: ${fp.pct}%`).join(', ');
          console.info(`       ${s.reason} [${files}]`);
        }
      }

      console.info('');
      if (result.pass) {
        console.info(`PASS — all ${result.scenarios.length} Scenario(s) at or above ${threshold}% branch coverage.`);
      } else {
        console.info(
          `FAIL — ${result.failures.length} of ${result.scenarios.length} Scenario(s) below ${threshold}% branch coverage (or missing covers:).`,
        );
        process.exitCode = 1;
      }
    });
}
