/**
 * CLI command: specpower validate <file>
 *
 * Validates a spec file for structural correctness.
 */

import { promises as fs } from 'node:fs';
import type { Command } from 'commander';
import { validateSpec } from '../../core/validation/validator.js';
import type { ValidationResult } from '../../core/validation/types.js';

/**
 * Validates a spec file at the given path.
 *
 * Reads the file and runs the spec validator, returning structured results.
 *
 * @param filePath - Absolute path to the spec file
 * @returns Validation result with valid flag and any errors
 * @throws When the file cannot be read
 */
export async function validateSpecFile(filePath: string): Promise<ValidationResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  return validateSpec(content);
}

/**
 * Registers the `validate` command with Commander.
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate <file>')
    .description('Validate a spec file for structural correctness')
    .option('--json', 'Output as JSON')
    .action(async (file: string, opts: { json?: boolean }) => {
      const result = await validateSpecFile(file);

      if (opts.json) {
        console.info(JSON.stringify(result, null, 2));
      } else if (result.valid) {
        console.info('Valid: no errors found.');
      } else {
        console.error(`Found ${result.errors.length} error(s):`);
        for (const err of result.errors) {
          const lineInfo = err.line ? ` (line ${err.line})` : '';
          console.error(`  - ${err.message}${lineInfo}`);
        }
        process.exitCode = 1;
      }
    });
}
