/**
 * CLI command: specpower validate <file>
 *
 * Validates a spec file for structural correctness.
 * With --strict, treats warnings (e.g., missing negative scenarios) as errors.
 *
 * Test-plan coverage stage: if the spec belongs to a change directory (a
 * `.specpower.yaml` marker or a `changes/<name>/` ancestor is found), the
 * validator additionally checks the change's `test-plan.md`:
 * - present  → run checkCoverage and add its issues as errors
 * - absent   → warn (promoted to error under --strict) when the delta has scenarios
 */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Command } from 'commander';
import { validateSpec } from '../../core/validation/validator.js';
import {
  SCENARIO_HEADER_CORRECT,
  REQUIREMENT_HEADER,
  TESTABLE_MARKER,
  NEGATIVE_MARKER,
} from '../../core/validation/constants.js';
import type { ValidationError, ValidationResult, ValidationWarning } from '../../core/validation/types.js';
import { parseTestPlanFile, findMalformedCases } from '../../core/parsers/test-plan-parser.js';
import { checkCoverage } from '../../core/validation/test-plan-coverage.js';

/**
 * Validates a spec file at the given path.
 *
 * Reads the file and runs the spec validator, then (if the file belongs to a
 * change directory) runs the test-plan coverage stage. Under `strict`, all
 * warnings are promoted to errors.
 *
 * @param filePath - Absolute path to the spec file
 * @param opts - Optional flags; `strict` promotes warnings to errors
 * @returns Validation result with valid flag, errors, and warnings
 * @throws When the file cannot be read
 */
export async function validateSpecFile(
  filePath: string,
  opts?: { strict?: boolean },
): Promise<ValidationResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  const base = validateSpec(content);

  const tp = await checkTestPlan(filePath, content);

  const errors: ValidationError[] = [...base.errors, ...tp.errors];
  const warnings: ValidationWarning[] = [...base.warnings, ...tp.warnings];

  if (opts?.strict) {
    errors.push(...warnings.map((w) => ({ message: w.message, line: w.line })));
    warnings.length = 0;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Locate the change directory a spec file belongs to.
 *
 * Walks up from the spec file's directory; a directory is the change root if
 * it contains a `.specpower.yaml` marker, or its parent is named `changes`
 * (i.e. it sits at `changes/<name>/`). Returns the change root path, or
 * `null` if the spec does not belong to any change.
 */
function findChangeRoot(specPath: string): string | null {
  let dir = dirname(specPath);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (existsSync(join(dir, '.specpower.yaml'))) {
      return dir;
    }
    if (basename(dirname(dir)) === 'changes') {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

/**
 * Infer the capability name from a spec file path of the form
 * `.../specs/<capability>/spec.md`. Returns null if the path does not match
 * this shape (so the caller falls back to using all Cases).
 */
function inferCapability(specPath: string): string | null {
  const dir = dirname(specPath);
  const parent = dirname(dir);
  if (basename(parent) === 'specs' && basename(specPath) === 'spec.md') {
    return basename(dir);
  }
  return null;
}

/**
 * Extract delta scenarios (requirement + scenario name pairs) from a spec
 * markdown string by scanning `### Requirement:` and `#### Scenario:` headers.
 * Requirement `[testable]` and scenario `[negative]` trailing markers are
 * stripped from the names (they are metadata, not part of the name) so names
 * match across spec, test-plan, and main-spec archive.
 */
function extractDeltaScenarios(content: string): { requirement: string; scenario: string; testable: boolean }[] {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const out: { requirement: string; scenario: string; testable: boolean }[] = [];
  let currentReq = '';
  let currentReqTestable = false;
  for (const line of lines) {
    const rm = REQUIREMENT_HEADER.exec(line);
    if (rm) {
      const raw = rm[1].trim();
      currentReqTestable = TESTABLE_MARKER.test(raw);
      currentReq = raw.replace(TESTABLE_MARKER, '').trim();
      continue;
    }
    const sm = SCENARIO_HEADER_CORRECT.exec(line);
    if (sm) {
      const raw = sm[1].trim();
      const scenario = raw.replace(NEGATIVE_MARKER, '').trim();
      out.push({ requirement: currentReq, scenario, testable: currentReqTestable });
    }
  }
  return out;
}

/**
 * Run the test-plan coverage stage for a spec file.
 *
 * Returns errors (from checkCoverage when a test-plan.md exists, plus
 * malformed-id Case lines) and a warning when a testable change lacks a
 * test-plan.md. The warning is NOT promoted to an error here; `--strict`
 * promotion happens in `validateSpecFile` (the caller), which maps all
 * warnings to errors after this function returns.
 */
async function checkTestPlan(
  specPath: string,
  content: string,
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const changeRoot = findChangeRoot(specPath);
  if (!changeRoot) return { errors, warnings };

  const deltaScenarios = extractDeltaScenarios(content);
  if (deltaScenarios.length === 0) return { errors, warnings };

  const changeName = basename(changeRoot);
  const testPlanPath = join(changeRoot, 'test-plan.md');

  if (!existsSync(testPlanPath)) {
    warnings.push({
      message: `test-plan.md missing for change ${changeName} (run plan Stage 5b; --strict to enforce)`,
    });
    return { errors, warnings };
  }

  const testPlanContent = await fs.readFile(testPlanPath, 'utf-8');
  for (const m of findMalformedCases(testPlanContent)) {
    errors.push({
      message: `Case line ${m.line} has malformed/missing id (expected T<n>): ${m.raw}`,
    });
  }

  const cases = await parseTestPlanFile(testPlanPath);
  // Filter to Cases whose capability matches the spec being validated. A
  // change's test-plan may span multiple capabilities (one `## Capability:`
  // per group); validate <file> checks one spec file, so only that spec's
  // capability's Cases are relevant — cross-capability Cases would otherwise
  // all dangle (their Scenarios live in other spec files). The capability is
  // inferred from the spec path `.../specs/<capability>/spec.md`.
  const specCapability = inferCapability(specPath);
  let relevantCases = cases;
  if (specCapability) {
    const filtered = cases.filter((c) => c.capability === specCapability);
    // Foot-gun guard: if the filter produced zero Cases but Cases exist, the
    // test-plan's `## Capability:` names do not match the spec's directory name
    // (e.g. author wrote `## Capability: Test Planning` but the dir is
    // `test-planning`). Rather than reporting every delta Scenario as
    // `uncovered-scenario` (misleading), fall back to all Cases and warn so the
    // author fixes the capability-name mismatch.
    if (filtered.length === 0 && cases.length > 0) {
      warnings.push({
        message: `Capability name mismatch: spec capability "${specCapability}" (from path) matches no ` +
          `## Capability: in test-plan.md (found: ${[...new Set(cases.map((c) => c.capability))].filter(Boolean).join(', ') || '(none)'}). ` +
          `Falling back to all Cases; fix the ## Capability: name to match the spec directory to enable per-capability filtering.`,
      });
    } else {
      relevantCases = filtered;
    }
  }
  const baselineScenarios = await loadBaselineScenarios(changeRoot);
  const failureAdmittingRequirements = collectFailureAdmittingRequirements(deltaScenarios);
  const result = checkCoverage({
    deltaScenarios,
    cases: relevantCases,
    baselineScenarios,
    failureAdmittingRequirements,
  });
  for (const issue of result.issues) {
    // missing-branch-tag is a backward-compat warning, not an error: existing
    // test-plans without `branch:` tags would otherwise all fail validate.
    // The distinct-branch floor is still enforced for tagged Cases; the warning
    // nudges authors to add `branch:` so the floor also covers their Cases.
    // duplicate-branch and low-negative-ratio remain errors (real defects).
    if (issue.issue === 'missing-branch-tag') {
      warnings.push({ message: issue.message });
    } else {
      errors.push({ message: issue.message });
    }
  }
  return { errors, warnings };
}

/**
 * Collect the set of Requirement names that are failure-admitting — i.e. that
 * MUST have negative-case coverage in the test-plan.
 *
 * This is NO LONGER a keyword heuristic. A Requirement is failure-admitting
 * when the spec author marked it `[testable]` in its heading. This makes
 * "tests are mandatory" enforceable: the author explicitly opts a Requirement
 * into the test-plan-coverage regime by marking it, instead of the validator
 * guessing from scenario-name keywords (which missed requirements whose author
 * simply didn't write an error-path scenario — the a4adapter root cause).
 *
 * Unmarked requirements fall back to the legacy keyword heuristic ONLY to
 * preserve the `missing-negative` back-compat warning; the structural
 * `[testable]` → negative floor lives in the validator (validateSpec), which
 * errors (not warns) on a `[testable]` requirement with zero `[negative]`
 * scenarios.
 */
function collectFailureAdmittingRequirements(
  deltaScenarios: readonly { requirement: string; scenario: string; testable: boolean }[],
): string[] {
  const out = new Set<string>();
  for (const s of deltaScenarios) {
    if (s.testable) {
      out.add(s.requirement);
    }
  }
  return [...out];
}

/**
 * Walk up from a change root to locate the project's baseline specs directory
 * (`<projectRoot>/specpower/specs`). Returns null when no such directory exists
 * (e.g. the fixture-style layout without a `specpower/` wrapper), in which case
 * no baseline scenarios are loaded and baseline-regression refs would be
 * reported as dangling — but only for layouts that genuinely lack baseline specs.
 */
function findBaselineSpecsDir(changeRoot: string): string | null {
  let dir = changeRoot;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'specpower', 'specs');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Load all baseline `{requirement, scenario}` pairs from the project's
 * `specpower/specs/` tree by scanning `### Requirement:` + `#### Scenario:`
 * headers in every `.md` file. Returns an empty array when the baseline specs
 * directory cannot be found.
 */
async function loadBaselineScenarios(
  changeRoot: string,
): Promise<{ requirement: string; scenario: string }[]> {
  const specsDir = findBaselineSpecsDir(changeRoot);
  if (!specsDir) return [];
  const files = await listMarkdownFiles(specsDir);
  const out: { requirement: string; scenario: string }[] = [];
  for (const rel of files) {
    const content = await fs.readFile(join(specsDir, rel), 'utf-8');
    out.push(...extractDeltaScenarios(content));
  }
  return out;
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listMarkdownFiles(full)).map((p) => join(entry.name, p)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(entry.name);
    }
  }
  return out;
}

/**
 * Registers the `validate` command with Commander.
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate <file>')
    .description('Validate a spec file for structural correctness')
    .option('--json', 'Output as JSON')
    .option('--strict', 'Treat warnings (e.g., missing negative scenarios) as errors')
    .action(async (file: string, opts: { json?: boolean; strict?: boolean }) => {
      const result = await validateSpecFile(file, { strict: opts.strict });

      const output: ValidationResult = result;

      if (opts.json) {
        console.info(JSON.stringify(output, null, 2));
      } else if (output.valid && output.warnings.length === 0) {
        console.info('Valid: no errors or warnings found.');
      } else if (output.valid) {
        console.info('Valid: no errors found.');
        if (output.warnings.length > 0) {
          console.warn(`\n${output.warnings.length} warning(s):`);
          for (const w of output.warnings) {
            const lineInfo = w.line ? ` (line ${w.line})` : '';
            console.warn(`  ⚠ ${w.message}${lineInfo}`);
          }
        }
      } else {
        console.error(`Found ${output.errors.length} error(s):`);
        for (const err of output.errors) {
          const lineInfo = err.line ? ` (line ${err.line})` : '';
          console.error(`  - ${err.message}${lineInfo}`);
        }
        process.exitCode = 1;
      }
    });
}
