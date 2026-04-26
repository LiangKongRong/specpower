import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateId } from './types.js';

export type { TemplateId } from './types.js';

/**
 * All valid template IDs.
 */
const TEMPLATE_IDS: readonly TemplateId[] = [
  'proposal',
  'spec',
  'design',
  'tasks',
] as const;

/**
 * Error thrown when a template cannot be found or loaded.
 */
export class TemplateNotFoundError extends Error {
  constructor(
    public readonly templateId: string,
    public readonly templatePath: string,
  ) {
    super(`Template "${templateId}" not found at ${templatePath}`);
    this.name = 'TemplateNotFoundError';
  }
}

/**
 * Resolves the package root by walking up from the current module until
 * a directory containing package.json is found.
 */
function findPackageRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  let dir = path.dirname(currentFile);
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (fsSync.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  throw new Error(
    'Could not find package root (no package.json found in parent directories)',
  );
}

/**
 * Returns the absolute path to a template file.
 *
 * @param id - The template identifier
 * @returns Absolute path to the template markdown file
 */
export function getTemplatePath(id: TemplateId): string {
  const packageRoot = findPackageRoot();
  return path.join(packageRoot, 'templates', `${id}.md`);
}

/**
 * Loads a template file and returns its contents as a string.
 *
 * @param id - The template identifier
 * @returns The template content
 * @throws TemplateNotFoundError if the template file does not exist
 */
export async function loadTemplate(id: TemplateId): Promise<string> {
  const templatePath = getTemplatePath(id);

  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      throw new TemplateNotFoundError(id, templatePath);
    }
    const readError = err instanceof Error ? err : new Error(String(err));
    throw new Error(
      `Failed to load template "${id}": ${readError.message}`,
    );
  }
}

/**
 * Returns the list of all available template IDs.
 *
 * @returns Array of valid template identifiers
 */
export function listTemplates(): TemplateId[] {
  return [...TEMPLATE_IDS];
}
