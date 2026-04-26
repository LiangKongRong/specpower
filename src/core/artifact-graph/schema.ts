import * as fs from 'node:fs';
import yaml from 'js-yaml';
import { SchemaYamlSchema, type SchemaYaml, type Artifact } from './types.js';

/**
 * Error thrown when schema validation fails.
 */
export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Loads and validates an artifact schema from a YAML file path.
 *
 * @param filePath - Absolute path to the schema.yaml file
 * @returns The validated schema object
 * @throws SchemaValidationError if the YAML is invalid
 */
export function loadSchema(filePath: string): SchemaYaml {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseSchema(content);
}

/**
 * Parses and validates an artifact schema from YAML content string.
 *
 * @param yamlContent - Raw YAML string
 * @returns The validated schema object
 * @throws SchemaValidationError if validation fails
 */
export function parseSchema(yamlContent: string): SchemaYaml {
  const parsed = yaml.load(yamlContent);

  const result = SchemaYamlSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new SchemaValidationError(`Invalid schema: ${errors}`);
  }

  const schema = result.data;

  validateNoDuplicateIds(schema.artifacts);
  validateRequiresReferences(schema.artifacts);
  validateNoCycles(schema.artifacts);

  return schema;
}

/**
 * Validates that there are no duplicate artifact IDs.
 */
function validateNoDuplicateIds(artifacts: readonly Artifact[]): void {
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    if (seen.has(artifact.id)) {
      throw new SchemaValidationError(`Duplicate artifact ID: ${artifact.id}`);
    }
    seen.add(artifact.id);
  }
}

/**
 * Validates that all `requires` references point to valid artifact IDs.
 */
function validateRequiresReferences(artifacts: readonly Artifact[]): void {
  const validIds = new Set(artifacts.map(a => a.id));

  for (const artifact of artifacts) {
    for (const req of artifact.requires) {
      if (!validIds.has(req)) {
        throw new SchemaValidationError(
          `Invalid dependency reference in artifact '${artifact.id}': '${req}' does not exist`
        );
      }
    }
  }
}

/**
 * Validates that there are no cyclic dependencies.
 * Uses DFS with path reconstruction for clear error messages.
 */
function validateNoCycles(artifacts: readonly Artifact[]): void {
  const artifactMap = new Map(artifacts.map(a => [a.id, a]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const parent = new Map<string, string>();

  function dfs(id: string): string | null {
    visited.add(id);
    inStack.add(id);

    const artifact = artifactMap.get(id);
    if (!artifact) return null;

    for (const dep of artifact.requires) {
      if (!visited.has(dep)) {
        parent.set(dep, id);
        const cycle = dfs(dep);
        if (cycle) return cycle;
      } else if (inStack.has(dep)) {
        const cyclePath = [dep];
        let current = id;
        while (current !== dep) {
          cyclePath.unshift(current);
          current = parent.get(current)!;
        }
        cyclePath.unshift(dep);
        return cyclePath.join(' -> ');
      }
    }

    inStack.delete(id);
    return null;
  }

  for (const artifact of artifacts) {
    if (!visited.has(artifact.id)) {
      const cycle = dfs(artifact.id);
      if (cycle) {
        throw new SchemaValidationError(`Cyclic dependency detected: ${cycle}`);
      }
    }
  }
}
