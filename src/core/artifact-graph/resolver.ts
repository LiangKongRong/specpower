import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSchema, SchemaValidationError } from './schema.js';
import type { SchemaYaml } from './types.js';

/**
 * Error thrown when loading a schema file fails.
 */
export class SchemaLoadError extends Error {
  constructor(
    message: string,
    public readonly schemaPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SchemaLoadError';
  }
}

/**
 * Gets the package's built-in schemas directory path.
 * Resolves from the compiled module location back to the package root.
 */
export function getPackageSchemasDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // Navigate from src/core/artifact-graph/ (or dist/core/artifact-graph/) to package root
  return path.join(path.dirname(currentFile), '..', '..', '..', 'schemas');
}

/**
 * Gets the project-local schemas directory path.
 *
 * @param projectRoot - The project root directory
 * @returns The path to the project's schemas directory
 */
export function getProjectSchemasDir(projectRoot: string): string {
  return path.join(projectRoot, 'specpower', 'schemas');
}

/**
 * Resolves a schema name to its directory path.
 *
 * Resolution order:
 * 1. Project-local: <projectRoot>/specpower/schemas/<name>/schema.yaml
 * 2. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * @param name - Schema name (e.g., "specpower")
 * @param projectRoot - Optional project root directory for project-local resolution
 * @returns The path to the schema directory, or null if not found
 */
export function getSchemaDir(
  name: string,
  projectRoot?: string
): string | null {
  // 1. Check project-local directory
  if (projectRoot) {
    const projectDir = path.join(getProjectSchemasDir(projectRoot), name);
    const projectSchemaPath = path.join(projectDir, 'schema.yaml');
    if (fs.existsSync(projectSchemaPath)) {
      return projectDir;
    }
  }

  // 2. Check package built-in directory
  const packageDir = path.join(getPackageSchemasDir(), name);
  const packageSchemaPath = path.join(packageDir, 'schema.yaml');
  if (fs.existsSync(packageSchemaPath)) {
    return packageDir;
  }

  return null;
}

/**
 * Resolves a schema name to a validated SchemaYaml object.
 *
 * Resolution order:
 * 1. Project-local: <projectRoot>/specpower/schemas/<name>/schema.yaml
 * 2. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * @param name - Schema name (e.g., "specpower")
 * @param projectRoot - Optional project root directory for project-local resolution
 * @returns The resolved and validated schema object
 * @throws Error if schema not found in any location
 * @throws SchemaLoadError if schema file cannot be read or parsed
 */
export function resolveSchema(name: string, projectRoot?: string): SchemaYaml {
  const normalizedName = name.replace(/\.ya?ml$/, '');

  const schemaDir = getSchemaDir(normalizedName, projectRoot);
  if (!schemaDir) {
    const available = listSchemas(projectRoot);
    throw new Error(
      `Schema '${normalizedName}' not found. Available schemas: ${available.join(', ')}`
    );
  }

  const schemaPath = path.join(schemaDir, 'schema.yaml');

  let content: string;
  try {
    content = fs.readFileSync(schemaPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Failed to read schema at '${schemaPath}': ${ioError.message}`,
      schemaPath,
      ioError
    );
  }

  try {
    return parseSchema(content);
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      throw new SchemaLoadError(
        `Invalid schema at '${schemaPath}': ${err.message}`,
        schemaPath,
        err
      );
    }
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Failed to parse schema at '${schemaPath}': ${parseError.message}`,
      schemaPath,
      parseError
    );
  }
}

/**
 * Lists all available schema names.
 *
 * @param projectRoot - Optional project root directory for project-local resolution
 * @returns Sorted array of schema names
 */
export function listSchemas(projectRoot?: string): string[] {
  const schemas = new Set<string>();

  // Package built-in schemas
  const packageDir = getPackageSchemasDir();
  if (fs.existsSync(packageDir)) {
    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const schemaPath = path.join(packageDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          schemas.add(entry.name);
        }
      }
    }
  }

  // Project-local schemas
  if (projectRoot) {
    const projectDir = getProjectSchemasDir(projectRoot);
    if (fs.existsSync(projectDir)) {
      for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const schemaPath = path.join(projectDir, entry.name, 'schema.yaml');
          if (fs.existsSync(schemaPath)) {
            schemas.add(entry.name);
          }
        }
      }
    }
  }

  return Array.from(schemas).sort();
}
