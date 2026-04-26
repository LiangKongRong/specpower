import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { readChangeMetadata, writeChangeMetadata as writeMetaInternal } from './change-metadata.js';
import type { ChangeMetadata } from './change-metadata.js';

const CHANGES_REL_PATH = 'specpower/changes';

const VALID_CHANGE_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validates that a change name uses only lowercase alphanumeric characters
 * separated by single hyphens. Prevents path traversal and invalid directory names.
 *
 * @param name - The change name to validate
 * @throws When the name does not match the required pattern
 */
export function validateChangeName(name: string): void {
  if (!VALID_CHANGE_NAME.test(name)) {
    throw new Error(`Invalid change name "${name}". Use lowercase alphanumeric with hyphens (e.g., "my-feature").`);
  }
}

/**
 * Returns the relative path for a change directory (with trailing slash).
 *
 * @param changeName - Name of the change (kebab-case)
 * @returns The relative path, e.g. "specpower/changes/my-feature/"
 */
export function getChangeDir(changeName: string): string {
  validateChangeName(changeName);
  return `${CHANGES_REL_PATH}/${changeName}/`;
}

/**
 * Reads the .specpower.yaml metadata for a given change.
 *
 * @param changeName - Name of the change
 * @param projectRoot - Absolute path to the project root
 * @returns The parsed metadata, or null if the file does not exist
 */
export async function getChangeMetadata(
  changeName: string,
  projectRoot: string,
): Promise<ChangeMetadata | null> {
  validateChangeName(changeName);
  const changeDir = join(projectRoot, CHANGES_REL_PATH, changeName);
  return await readChangeMetadata(changeDir);
}

/**
 * Writes .specpower.yaml metadata for a given change.
 * Creates the change directory and parent directories if needed.
 *
 * @param changeName - Name of the change
 * @param metadata - The metadata to write
 * @param projectRoot - Absolute path to the project root
 */
export async function writeChangeMetadata(
  changeName: string,
  metadata: ChangeMetadata,
  projectRoot: string,
): Promise<void> {
  validateChangeName(changeName);
  const changeDir = join(projectRoot, CHANGES_REL_PATH, changeName);
  await writeMetaInternal(changeDir, metadata);
}

/**
 * Lists all change directory names under specpower/changes/.
 * Returns an empty array if the directory does not exist or is empty.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns Array of change directory names
 */
export async function listChanges(projectRoot: string): Promise<string[]> {
  const changesDir = join(projectRoot, CHANGES_REL_PATH);

  try {
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
