/**
 * CLI command: specpower change status <name>
 *
 * Shows the status of artifacts for a given change.
 */

import { join } from 'node:path';
import * as fs from 'node:fs';
import yaml from 'js-yaml';
import type { Command } from 'commander';
import { resolveSchema } from '../../core/artifact-graph/resolver.js';
import { getCompletedArtifacts } from '../../core/artifact-graph/state.js';
import { formatStatus, formatStatusHuman } from '../../core/artifact-graph/outputs.js';
import type { ArtifactStatusEntry, StatusOutput } from '../../core/artifact-graph/outputs.js';
import { requireProjectRoot } from '../../utils/project-root.js';
import { readChangeMetadata } from '../../utils/change-metadata.js';

/**
 * Extended status output with change-level metadata.
 */
export interface ChangeStatusOutput {
  readonly changeName: string;
  readonly artifacts: readonly ArtifactStatusEntry[];
  readonly isComplete: boolean;
}

/**
 * Reads the project config to determine the schema name.
 */
function readSchemaName(projectRoot: string): string {
  const configPath = join(projectRoot, 'specpower', 'config.yaml');

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    if (typeof parsed?.schema === 'string') {
      return parsed.schema;
    }
  } catch {
    // Fall through to default
  }

  return 'specpower';
}

/**
 * Gets the status of all artifacts for a given change.
 *
 * @param changeName - The name of the change
 * @param projectRoot - Absolute path to the project root
 * @returns Status output with per-artifact state and completion flag
 * @throws When the change directory does not exist
 */
export async function getChangeStatus(
  changeName: string,
  projectRoot: string,
): Promise<ChangeStatusOutput> {
  const changeDir = join(projectRoot, 'specpower', 'changes', changeName);

  if (!fs.existsSync(changeDir)) {
    throw new Error(`Change "${changeName}" not found at ${changeDir}`);
  }

  // Validate change metadata (including phase enum) before proceeding.
  // If .specpower.yaml contains an invalid phase, Zod will throw a clear error
  // listing the valid enum values. Missing metadata is tolerated (null return).
  await readChangeMetadata(changeDir);

  const schemaName = readSchemaName(projectRoot);

  // Resolve schema from project-local schemas/ directory, falling back to package schemas
  const schema = resolveSchema(schemaName, projectRoot);

  const completed = getCompletedArtifacts(changeDir, schema);
  const statusOutput = formatStatus(schema.artifacts, completed);

  const completedSet = new Set(completed);
  const allDone = schema.artifacts.every((a) => completedSet.has(a.id));

  return {
    changeName,
    artifacts: statusOutput.artifacts,
    isComplete: allDone,
  };
}

/**
 * Formats a ChangeStatusOutput as human-readable checkbox text.
 *
 * @param status - The status output to format
 * @returns Formatted string with [x] and [ ] checkboxes
 */
export function formatChangeStatus(status: ChangeStatusOutput): string {
  const lines = status.artifacts.map((entry) => {
    const checkbox = entry.status === 'done' ? '[x]' : '[ ]';
    const suffix =
      entry.missingDeps && entry.missingDeps.length > 0
        ? ` (blocked by: ${entry.missingDeps.join(', ')})`
        : '';
    return `${checkbox} ${entry.id}${suffix}`;
  });

  return lines.join('\n');
}

/**
 * Registers the `change status` subcommand with Commander.
 */
export function registerChangeStatusCommand(changeCmd: Command): void {
  changeCmd
    .command('status <name>')
    .description('Show artifact status for a change')
    .option('--json', 'Output as JSON')
    .action(async (name: string, opts: { json?: boolean }) => {
      const projectRoot = requireProjectRoot();
      const status = await getChangeStatus(name, projectRoot);

      if (opts.json) {
        console.info(JSON.stringify(status, null, 2));
      } else {
        console.info(formatChangeStatus(status));
      }
    });
}
