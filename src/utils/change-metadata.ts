import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const METADATA_FILENAME = '.specpower.yaml';

/**
 * Metadata stored in each change's .specpower.yaml file.
 */
export interface ChangeMetadata {
  readonly schema: string;
  readonly created: string;
  readonly [key: string]: unknown;
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

  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    const parsed = yaml.load(content);

    if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
      throw new Error(`Invalid metadata format in ${metaPath}`);
    }

    return parsed as ChangeMetadata;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
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
