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
} from '../../core/validation/constants.js';
import type { ValidationError, ValidationResult, ValidationWarning } from '../../core/validation/types.js';
import { parseTestPlanFile } from '../../core/parsers/test-plan-parser.js';
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
 * Extract delta scenarios (requirement + scenario name pairs) from a spec
 * markdown string by scanning `### Requirement:` and `#### Scenario:` headers.
 */
function extractDeltaScenarios(content: string): { requirement: string; scenario: string }[] {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const out: { requirement: string; scenario: string }[] = [];
  let currentReq = '';
  for (const line of lines) {
    const rm = REQUIREMENT_HEADER.exec(line);
    if (rm) {
      currentReq = rm[1].trim();
      continue;
    }
    const sm = SCENARIO_HEADER_CORRECT.exec(line);
    if (sm) {
      out.push({ requirement: currentReq, scenario: sm[1].trim() });
    }
  }
  return out;
}

/**
 * Run the test-plan coverage stage for a spec file.
 *
 * Returns errors (from checkCoverage when a test-plan.md exists) and a warning
 * when a testable change lacks a test-plan.md. The warning is NOT promoted
 * here; the caller handles `--strict`.
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

  const cases = await parseTestPlanFile(testPlanPath);
  const result = checkCoverage({
    deltaScenarios,
    cases,
    baselineScenarios: [],
  });
  for (const issue of result.issues) {
    errors.push({ message: issue.message });
  }
  return { errors, warnings };
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
