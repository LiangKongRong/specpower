/**
 * CLI command: specpower change archive <name>
 *
 * Archives a completed change by validating, applying deltas, and moving to archive.
 */

import { join } from 'node:path';
import * as fs from 'node:fs';
import type { Command } from 'commander';
import { archiveChange } from '../../core/archive.js';
import type { ArchiveOptions, ArchiveResult } from '../../core/archive.js';
import { requireProjectRoot } from '../../utils/project-root.js';

/**
 * Archives a change, throwing on failure.
 *
 * This is a thin wrapper around the core archiveChange function that:
 * 1. Validates the change directory exists
 * 2. Delegates to archiveChange (with optional --force)
 * 3. Throws with error details if validation or archiving fails
 *
 * @param changeName - The name of the change to archive
 * @param projectRoot - Absolute path to the project root
 * @param options - Optional archive options (e.g. force to bypass phase gate)
 * @returns The archive result on success
 * @throws When the change does not exist, validation fails, or archiving fails
 */
export async function archiveChangeCommand(
  changeName: string,
  projectRoot: string,
  options: ArchiveOptions = {},
): Promise<ArchiveResult> {
  const changeDir = join(projectRoot, 'specpower', 'changes', changeName);

  if (!fs.existsSync(changeDir)) {
    throw new Error(`Change "${changeName}" not found at ${changeDir}`);
  }

  const result = await archiveChange(changeName, projectRoot, options);

  if (!result.success) {
    throw new Error(
      `Archive failed for "${changeName}":\n${result.errors.join('\n')}`,
    );
  }

  return result;
}

/**
 * Registers the `change archive` subcommand with Commander.
 */
export function registerChangeArchiveCommand(changeCmd: Command): void {
  changeCmd
    .command('archive <name>')
    .description('Archive a completed change')
    .option('--force', 'Archive even if the change is not in phase=built')
    .action(async (name: string, opts: { force?: boolean }) => {
      const projectRoot = requireProjectRoot();
      const result = await archiveChangeCommand(name, projectRoot, {
        force: opts.force ?? false,
      });
      console.info(`Archived change "${name}" to ${result.archivePath}`);
    });
}
