import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Checks whether a directory exists at the given path.
 *
 * @param dirPath - Absolute path to check
 * @returns true if the path is an existing directory, false otherwise
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Checks whether a file (not a directory) exists at the given path.
 *
 * @param filePath - Absolute path to check
 * @returns true if the path is an existing file, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Reads a file and returns its contents as a UTF-8 string.
 *
 * @param filePath - Absolute path to the file
 * @returns The file contents
 * @throws When the file does not exist or cannot be read
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Writes content to a file, auto-creating parent directories as needed.
 *
 * @param filePath - Absolute path where the file should be written
 * @param content - The string content to write
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Ensures a directory exists, creating it and all parent directories as needed.
 *
 * @param dirPath - Absolute path to the directory
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
