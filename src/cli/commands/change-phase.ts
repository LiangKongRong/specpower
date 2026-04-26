/**
 * CLI command: specpower change phase <name> [--set <value>]
 *
 * Read or update the lifecycle phase of a change.
 */

import type { Command } from 'commander';
import {
  CHANGE_PHASES,
  getChangeMetadata,
  updatePhase,
} from '../../utils/change-utils.js';
import type { ChangePhase } from '../../utils/change-utils.js';
import { requireProjectRoot } from '../../utils/project-root.js';

/**
 * Returns true if the candidate value is a valid ChangePhase.
 */
function isChangePhase(value: string): value is ChangePhase {
  return (CHANGE_PHASES as readonly string[]).includes(value);
}

/**
 * Reads the current phase of a change.
 *
 * @param name - Name of the change
 * @param projectRoot - Absolute path to the project root
 * @returns The current phase, or undefined for legacy files without a phase field
 * @throws When the change does not exist
 */
export async function getPhase(
  name: string,
  projectRoot: string,
): Promise<ChangePhase | undefined> {
  const metadata = await getChangeMetadata(name, projectRoot);
  if (metadata === null) {
    throw new Error(`Change not found: "${name}"`);
  }
  return metadata.phase;
}

/**
 * Sets the phase of a change, validating the phase value first.
 *
 * @param name - Name of the change
 * @param phase - The new phase value (validated against CHANGE_PHASES)
 * @param projectRoot - Absolute path to the project root
 * @throws When the phase is invalid or the change does not exist
 */
export async function setPhase(
  name: string,
  phase: string,
  projectRoot: string,
): Promise<void> {
  if (!isChangePhase(phase)) {
    const valid = CHANGE_PHASES.join(' | ');
    throw new Error(
      `Invalid phase "${phase}": expected one of ${valid}`,
    );
  }
  await updatePhase(name, phase, projectRoot);
}

/**
 * Registers the `change phase` subcommand with Commander.
 *
 * Usage:
 *   specpower change phase <name>            # print current phase
 *   specpower change phase <name> --set plan # update phase
 */
export function registerChangePhaseCommand(changeCmd: Command): void {
  changeCmd
    .command('phase <name>')
    .description('Show or set the lifecycle phase of a change')
    .option('--set <value>', 'Set the phase to the given value')
    .action(async (name: string, opts: { set?: string }) => {
      const projectRoot = requireProjectRoot();
      if (opts.set !== undefined) {
        await setPhase(name, opts.set, projectRoot);
        console.info(`Change "${name}" phase set to ${opts.set}`);
        return;
      }
      const phase = await getPhase(name, projectRoot);
      console.info(phase ?? '(unset)');
    });
}
