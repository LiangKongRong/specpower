import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile as fsWriteFile, mkdir, readFile as fsReadFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  directoryExists,
  fileExists,
  readFile,
  writeFile,
  ensureDir,
} from '../../src/utils/file-system.js';

describe('file-system utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specpower-fs-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('directoryExists', () => {
    it('returns true for an existing directory', async () => {
      const result = await directoryExists(tempDir);
      expect(result).toBe(true);
    });

    it('returns false for a non-existent path', async () => {
      const result = await directoryExists(join(tempDir, 'nope'));
      expect(result).toBe(false);
    });

    it('returns false when path is a file, not a directory', async () => {
      const filePath = join(tempDir, 'afile.txt');
      await fsWriteFile(filePath, 'hello', 'utf-8');
      const result = await directoryExists(filePath);
      expect(result).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('returns true for an existing file', async () => {
      const filePath = join(tempDir, 'exists.txt');
      await fsWriteFile(filePath, 'content', 'utf-8');
      const result = await fileExists(filePath);
      expect(result).toBe(true);
    });

    it('returns false for a non-existent path', async () => {
      const result = await fileExists(join(tempDir, 'missing.txt'));
      expect(result).toBe(false);
    });

    it('returns false when path is a directory, not a file', async () => {
      const result = await fileExists(tempDir);
      expect(result).toBe(false);
    });
  });

  describe('readFile', () => {
    it('returns UTF-8 string content of an existing file', async () => {
      const filePath = join(tempDir, 'read-me.txt');
      await fsWriteFile(filePath, 'hello world', 'utf-8');
      const content = await readFile(filePath);
      expect(content).toBe('hello world');
    });

    it('throws when file does not exist', async () => {
      await expect(readFile(join(tempDir, 'nope.txt'))).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('creates a file with given content', async () => {
      const filePath = join(tempDir, 'output.txt');
      await writeFile(filePath, 'written content');
      const content = await fsReadFile(filePath, 'utf-8');
      expect(content).toBe('written content');
    });

    it('auto-creates parent directories', async () => {
      const filePath = join(tempDir, 'nested', 'deep', 'file.txt');
      await writeFile(filePath, 'deep content');
      const content = await fsReadFile(filePath, 'utf-8');
      expect(content).toBe('deep content');
    });

    it('overwrites an existing file', async () => {
      const filePath = join(tempDir, 'overwrite.txt');
      await fsWriteFile(filePath, 'old', 'utf-8');
      await writeFile(filePath, 'new');
      const content = await fsReadFile(filePath, 'utf-8');
      expect(content).toBe('new');
    });
  });

  describe('ensureDir', () => {
    it('creates a new directory', async () => {
      const dirPath = join(tempDir, 'new-dir');
      await ensureDir(dirPath);
      const exists = await directoryExists(dirPath);
      expect(exists).toBe(true);
    });

    it('creates nested directories', async () => {
      const dirPath = join(tempDir, 'a', 'b', 'c');
      await ensureDir(dirPath);
      const exists = await directoryExists(dirPath);
      expect(exists).toBe(true);
    });

    it('does not throw when directory already exists', async () => {
      await ensureDir(tempDir);
      const exists = await directoryExists(tempDir);
      expect(exists).toBe(true);
    });
  });
});
