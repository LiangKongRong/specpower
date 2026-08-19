/**
 * CLI command: specpower change mode <name> [--set subagent|inline]
 *
 * Read or update the execution mode recorded for a change's `/specpower:build`
 * run. The mode is persisted in `.specpower.yaml` so the build resumes the same
 * execution path (subagent vs inline) after interruption/restart. Phase B
 * hard-gates on a recorded mode.
 */

import type { Command } from 'commander';
import {
  EXECUTION_MODES,
  getChangeMetadata,
  updateExecutionMode,
} from '../../utils/change-utils.js';
import type { ExecutionMode } from '../../utils/change-utils.js';
import { requireProjectRoot } from '../../utils/project-root.js';

/**
 * Returns true if the candidate value is a valid ExecutionMode.
 */
function isExecutionMode(value: string): value is ExecutionMode {
  return (EXECUTION_MODES as readonly string[]).includes(value);
}

/**
 * Reads the recorded execution mode of a change.
 *
 * @param name - Name of the change
 * @param projectRoot - Absolute path to the project root
 * @returns The recorded execution mode, or undefined if not yet chosen
 * @throws When the change does not exist
 */
export async function getExecutionMode(
  name: string,
  projectRoot: string,
): Promise<ExecutionMode | undefined> {
  const metadata = await getChangeMetadata(name, projectRoot);
  if (metadata === null) {
    throw new Error(`Change not found: "${name}"`);
  }
  return metadata.executionMode;
}

/**
 * Records the execution mode for a change, validating the value first.
 *
 * @param name - Name of the change
 * @param mode - The execution mode (subagent|inline), validated against EXECUTION_MODES
 * @param projectRoot - Absolute path to the project root
 * @throws When the mode is invalid or the change does not exist
 */
export async function setExecutionMode(
  name: string,
  mode: string,
  projectRoot: string,
): Promise<void> {
  if (!isExecutionMode(mode)) {
    const valid = EXECUTION_MODES.join(' | ');
    throw new Error(
      `Invalid executionMode "${mode}": expected one of ${valid}`,
    );
  }
  await updateExecutionMode(name, mode, projectRoot);
}

/**
 * Registers the `change mode` subcommand with Commander.
 *
 * Usage:
 *   specpower change mode <name>                 # print recorded mode (or "(unset)")
 *   specpower change mode <name> --set subagent  # record the mode
 */
export function registerChangeModeCommand(changeCmd: Command): void {
  changeCmd
    .command('mode <name>')
    .description('Show or set the execution mode recorded for a change')
    .option('--set <value>', 'Set the execution mode (subagent|inline)')
    .action(async (name: string, opts: { set?: string }) => {
      const projectRoot = requireProjectRoot();
      if (opts.set !== undefined) {
        await setExecutionMode(name, opts.set, projectRoot);
        console.info(`Change "${name}" execution mode set to ${opts.set}`);
        return;
      }
      const mode = await getExecutionMode(name, projectRoot);
      console.info(mode ?? '(unset)');
    });
}
