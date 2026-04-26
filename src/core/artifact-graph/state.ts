import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SchemaYaml } from './types.js';

/**
 * Checks if an artifact's generated file(s) exist in the change directory.
 * Supports simple file paths and basic glob patterns with "**".
 */
function artifactFileExists(changeDir: string, generates: string): boolean {
  if (!isGlobPattern(generates)) {
    const fullPath = path.join(changeDir, generates);
    try {
      return fs.statSync(fullPath).isFile();
    } catch {
      return false;
    }
  }

  // For glob patterns, check if any matching files exist
  return globHasMatch(changeDir, generates);
}

/**
 * Checks if a path pattern contains glob characters.
 */
function isGlobPattern(pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?') || pattern.includes('[');
}

/**
 * Simple glob matching: checks if any files match a glob-style pattern.
 * Avoids external dependencies by walking the directory tree.
 */
function globHasMatch(baseDir: string, pattern: string): boolean {
  // Extract the extension pattern (e.g., "*.md" from "specs/**/*.md")
  const parts = pattern.split('/');
  const filePattern = parts[parts.length - 1];
  const extension = filePattern.startsWith('*') ? filePattern.slice(1) : '';

  // Get the starting directory path (before any glob segment)
  const dirParts: string[] = [];
  for (const part of parts) {
    if (part.includes('*') || part.includes('?')) break;
    dirParts.push(part);
  }
  const startDir = dirParts.length > 0
    ? path.join(baseDir, ...dirParts)
    : baseDir;

  if (!fs.existsSync(startDir)) {
    return false;
  }

  return walkForMatch(startDir, extension);
}

/**
 * Recursively walks a directory looking for files matching the extension.
 */
function walkForMatch(dir: string, extension: string): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (walkForMatch(fullPath, extension)) return true;
    } else if (entry.isFile()) {
      if (extension === '' || entry.name.endsWith(extension)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detects which artifacts are completed by checking file existence in the change directory.
 *
 * @param changeDir - The change directory to scan
 * @param schema - The workflow schema with artifact definitions
 * @returns Array of completed artifact IDs
 */
export function getCompletedArtifacts(changeDir: string, schema: SchemaYaml): string[] {
  if (!fs.existsSync(changeDir)) {
    return [];
  }

  const completed: string[] = [];

  for (const artifact of schema.artifacts) {
    if (artifactFileExists(changeDir, artifact.generates)) {
      completed.push(artifact.id);
    }
  }

  return completed;
}
