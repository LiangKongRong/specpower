/**
 * Project root detection utility.
 *
 * Walks upward from a starting directory looking for `specpower/config.yaml`,
 * similar to how `git` finds `.git/`. This lets the CLI work from any
 * subdirectory within a specpower-initialized project.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const CONFIG_MARKER = join('specpower', 'config.yaml');

/**
 * Find the specpower project root by walking up from a starting directory.
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Absolute path to the project root, or null if not found
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(join(current, CONFIG_MARKER))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/**
 * Resolve project root with a clear error if not found.
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Absolute path to the project root
 * @throws Error with actionable message if no specpower project is detected
 */
export function requireProjectRoot(startDir: string = process.cwd()): string {
  const root = findProjectRoot(startDir);
  if (root === null) {
    throw new Error(
      `No specpower project found at or above ${startDir}. ` +
        `Run \`specpower init\` in your project root to initialize one.`,
    );
  }
  return root;
}
