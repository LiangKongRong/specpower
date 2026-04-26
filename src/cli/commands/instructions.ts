/**
 * CLI command: specpower instructions <artifact-id> <change-name>
 *
 * Loads and displays instructions for creating an artifact.
 */

import { join } from 'node:path';
import * as fs from 'node:fs';
import yaml from 'js-yaml';
import type { Command } from 'commander';
import { resolveSchema } from '../../core/artifact-graph/resolver.js';
import { loadInstructions } from '../../core/artifact-graph/instruction-loader.js';
import type { ArtifactInstructions, ProjectConfig } from '../../core/artifact-graph/instruction-loader.js';
import { requireProjectRoot } from '../../utils/project-root.js';

/**
 * Reads the project config to determine the schema name and optional context.
 */
function readProjectConfig(projectRoot: string): { schemaName: string; config?: ProjectConfig } {
  const configPath = join(projectRoot, 'specpower', 'config.yaml');

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    const schemaName = typeof parsed?.schema === 'string' ? parsed.schema : 'specpower';
    const config: ProjectConfig = { context: typeof parsed?.context === 'string' ? parsed.context : undefined };
    return { schemaName, config };
  } catch {
    return { schemaName: 'specpower' };
  }
}

/**
 * Gets instructions for creating an artifact within a change.
 *
 * @param artifactId - The artifact ID to get instructions for
 * @param changeName - The name of the change
 * @param projectRoot - Absolute path to the project root
 * @returns The artifact instructions with dependencies and output path
 * @throws When the artifact or change is not found
 */
export async function getInstructions(
  artifactId: string,
  changeName: string,
  projectRoot: string,
): Promise<ArtifactInstructions> {
  const changeDir = join(projectRoot, 'specpower', 'changes', changeName);

  if (!fs.existsSync(changeDir)) {
    throw new Error(`Change "${changeName}" not found at ${changeDir}`);
  }

  const { schemaName, config } = readProjectConfig(projectRoot);
  const schema = resolveSchema(schemaName, projectRoot);

  return loadInstructions(artifactId, changeDir, schema, config);
}

/**
 * Registers the `instructions` command with Commander.
 */
export function registerInstructionsCommand(program: Command): void {
  program
    .command('instructions <artifact-id> <change-name>')
    .description('Show instructions for creating an artifact')
    .option('--json', 'Output as JSON')
    .action(async (artifactId: string, changeName: string, opts: { json?: boolean }) => {
      const projectRoot = requireProjectRoot();
      const instructions = await getInstructions(artifactId, changeName, projectRoot);

      if (opts.json) {
        console.info(JSON.stringify(instructions, null, 2));
      } else {
        console.info(`Artifact: ${artifactId}`);
        console.info(`Generates: ${instructions.generates}`);
        console.info(`Description: ${instructions.description}`);
        if (instructions.instruction) {
          console.info(`\nInstruction:\n${instructions.instruction}`);
        }
        if (instructions.dependencies.length > 0) {
          console.info('\nDependencies:');
          for (const dep of instructions.dependencies) {
            console.info(`  - ${dep.id}: ${dep.description}`);
          }
        }
      }
    });
}
