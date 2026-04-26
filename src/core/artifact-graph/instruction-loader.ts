import type { Artifact, SchemaYaml } from './types.js';

/**
 * Dependency information included in artifact instructions.
 */
export interface DependencyInfo {
  /** Artifact ID */
  readonly id: string;
  /** File path pattern this dependency generates */
  readonly generates: string;
  /** Description of the dependency artifact */
  readonly description: string;
}

/**
 * Loaded instructions for creating an artifact.
 */
export interface ArtifactInstructions {
  /** The artifact's instruction text from the schema */
  readonly instruction: string | undefined;
  /** Project context from the config */
  readonly context: string | undefined;
  /** Dependencies with their metadata */
  readonly dependencies: readonly DependencyInfo[];
  /** The artifact's generates path */
  readonly generates: string;
  /** The artifact's description */
  readonly description: string;
}

/**
 * Optional project config with context for instruction loading.
 */
export interface ProjectConfig {
  readonly context?: string;
  readonly [key: string]: unknown;
}

/**
 * Loads enriched instructions for creating an artifact.
 *
 * @param artifactId - The artifact ID to load instructions for
 * @param changeDir - Path to the change directory
 * @param schema - The workflow schema
 * @param config - Optional project configuration with context
 * @returns The loaded artifact instructions
 * @throws Error if the artifact ID is not found in the schema
 */
export function loadInstructions(
  artifactId: string,
  changeDir: string,
  schema: SchemaYaml,
  config?: ProjectConfig
): ArtifactInstructions {
  const artifact = schema.artifacts.find(a => a.id === artifactId);
  if (!artifact) {
    throw new Error(
      `Artifact '${artifactId}' not found in schema '${schema.name}'`
    );
  }

  const dependencies = buildDependencyInfo(artifact, schema);

  return {
    instruction: artifact.instruction,
    context: config?.context ?? undefined,
    dependencies,
    generates: artifact.generates,
    description: artifact.description,
  };
}

/**
 * Builds dependency information for an artifact's requirements.
 */
function buildDependencyInfo(
  artifact: Artifact,
  schema: SchemaYaml
): readonly DependencyInfo[] {
  return artifact.requires.map(reqId => {
    const depArtifact = schema.artifacts.find(a => a.id === reqId);
    return {
      id: reqId,
      generates: depArtifact?.generates ?? reqId,
      description: depArtifact?.description ?? '',
    };
  });
}
