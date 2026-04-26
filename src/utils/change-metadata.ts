import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

const METADATA_FILENAME = '.specpower.yaml';

/**
 * All valid lifecycle phases a change can be in.
 *
 * - `plan`: Initial phase, created by `specpower change new`.
 * - `refined`: After `/specpower:refine` iterative deep review completes.
 * - `built`: After `/specpower:build` Phase B execution finishes.
 * - `archived`: Post-archive state; assigned automatically on successful archive.
 */
export const CHANGE_PHASES = ['plan', 'refined', 'built', 'archived'] as const;

/**
 * Union type of valid lifecycle phases.
 */
export type ChangePhase = (typeof CHANGE_PHASES)[number];

/**
 * Metadata stored in each change's .specpower.yaml file.
 */
export interface ChangeMetadata {
  readonly schema: string;
  readonly created: string;
  readonly phase?: ChangePhase;
  readonly [key: string]: unknown;
}

/**
 * Zod schema for validating change metadata.
 *
 * Uses `passthrough` so that unknown fields (e.g. user-added comments) survive
 * round-tripping rather than being stripped silently.
 */
const changeMetadataSchema = z
  .object({
    schema: z.string(),
    created: z.string(),
    phase: z.enum(CHANGE_PHASES).optional(),
  })
  .passthrough();

/**
 * Formats a Zod error into a user-friendly message.
 *
 * - Invalid phase values get a canonical enum list.
 * - Missing schema/created fields get the legacy "Invalid metadata format" message.
 */
function formatZodError(error: z.ZodError, metaPath: string): Error {
  const hasInvalidPhase = error.issues.some(
    (issue) => issue.path[0] === 'phase' && issue.code === 'invalid_enum_value',
  );

  if (hasInvalidPhase) {
    return new Error(
      'Invalid phase in metadata: expected one of plan|refined|built|archived',
    );
  }

  return new Error(`Invalid metadata format in ${metaPath}: ${error.message}`);
}

/**
 * Reads change metadata from .specpower.yaml in the change directory.
 *
 * @param changeDir - Absolute path to the change directory
 * @returns The parsed metadata, or null if the file does not exist
 * @throws When the file exists but cannot be read or parsed
 */
export async function readChangeMetadata(changeDir: string): Promise<ChangeMetadata | null> {
  const metaPath = join(changeDir, METADATA_FILENAME);

  let content: string;
  try {
    content = await fs.readFile(metaPath, 'utf-8');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  const parsed = yaml.load(content);
  if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
    throw new Error(`Invalid metadata format in ${metaPath}`);
  }

  const result = changeMetadataSchema.safeParse(parsed);
  if (!result.success) {
    throw formatZodError(result.error, metaPath);
  }

  return result.data as ChangeMetadata;
}

/**
 * Writes change metadata to .specpower.yaml in the change directory.
 * Creates parent directories if they do not exist.
 *
 * @param changeDir - Absolute path to the change directory
 * @param metadata - The metadata to write
 */
export async function writeChangeMetadata(changeDir: string, metadata: ChangeMetadata): Promise<void> {
  await fs.mkdir(changeDir, { recursive: true });

  const metaPath = join(changeDir, METADATA_FILENAME);
  const content = yaml.dump(metadata);
  await fs.writeFile(metaPath, content, 'utf-8');
}
