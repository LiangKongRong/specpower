import { z } from 'zod';

/**
 * Zod schema for a single artifact definition in a workflow schema.
 */
export const ArtifactSchema = z.object({
  id: z.string().min(1, { message: 'Artifact ID is required' }),
  generates: z.string().min(1, { message: 'generates field is required' }),
  description: z.string(),
  instruction: z.string().optional(),
  requires: z.array(z.string()).default([]),
});

/**
 * Zod schema for the apply phase configuration.
 */
export const ApplyPhaseSchema = z.object({
  requires: z.array(z.string()).min(1, { message: 'At least one required artifact' }),
  tracks: z.string().nullable().optional(),
  instruction: z.string().optional(),
});

/**
 * Zod schema for the full schema YAML structure.
 */
export const SchemaYamlSchema = z.object({
  name: z.string().min(1, { message: 'Schema name is required' }),
  version: z.number().int().positive({ message: 'Version must be a positive integer' }),
  description: z.string().optional(),
  artifacts: z.array(ArtifactSchema).min(1, { message: 'At least one artifact required' }),
  apply: ApplyPhaseSchema.optional(),
});

/** A single artifact definition. */
export type Artifact = z.infer<typeof ArtifactSchema>;

/** Apply phase configuration. */
export type ApplyPhase = z.infer<typeof ApplyPhaseSchema>;

/** Full schema YAML structure. */
export type SchemaYaml = z.infer<typeof SchemaYamlSchema>;

/** Set of completed artifact IDs. */
export type CompletedSet = Set<string>;

/** Blocked artifacts mapped to their missing dependency IDs. */
export interface BlockedArtifacts {
  readonly [artifactId: string]: readonly string[];
}
