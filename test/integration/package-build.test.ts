/**
 * Integration test: Package build verification.
 *
 * Verifies that the TypeScript build produces valid output and
 * that the package structure contains all expected assets.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_ROOT = resolve(import.meta.dirname, '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively counts files matching a predicate.
 */
function countFiles(
  dir: string,
  predicate: (name: string) => boolean,
): number {
  if (!existsSync(dir)) return 0;

  let count = 0;
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(fullPath, predicate);
    } else if (entry.isFile() && predicate(entry.name)) {
      count += 1;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Package build verification', () => {
  it('TypeScript compiles without errors', () => {
    const result = execSync('npx tsc --noEmit', {
      cwd: PACKAGE_ROOT,
      encoding: 'utf-8',
      timeout: 30_000,
    });
    // tsc exits 0 on success; execSync throws on non-zero exit
    expect(result).toBeDefined();
  });

  it('dist/ directory contains the CLI entry point', () => {
    const cliEntry = join(PACKAGE_ROOT, 'dist', 'cli', 'index.js');
    expect(existsSync(cliEntry)).toBe(true);
  });

  it('bin/specpower.js outputs the correct version', () => {
    const pkg = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'),
    );
    const output = execSync('node bin/specpower.js --version', {
      cwd: PACKAGE_ROOT,
      encoding: 'utf-8',
      timeout: 10_000,
    }).trim();
    expect(output).toBe(pkg.version);
  });

  it('has exactly 10 SKILL.md files', () => {
    const skillsDir = join(PACKAGE_ROOT, 'skills');
    const skillCount = countFiles(skillsDir, (name) => name === 'SKILL.md');
    expect(skillCount).toBe(10);
  });

  it('has at least 20 prompt files', () => {
    const promptsDir = join(PACKAGE_ROOT, 'prompts');
    const promptCount = countFiles(promptsDir, (name) => name.endsWith('.md'));
    expect(promptCount).toBeGreaterThanOrEqual(20);
  });

  it('has exactly 4 templates', () => {
    const templatesDir = join(PACKAGE_ROOT, 'templates');
    const templateCount = countFiles(
      templatesDir,
      (name) => name.endsWith('.md'),
    );
    expect(templateCount).toBe(4);
  });

  it('has the specpower schema', () => {
    const schemaPath = join(
      PACKAGE_ROOT,
      'schemas',
      'specpower',
      'schema.yaml',
    );
    expect(existsSync(schemaPath)).toBe(true);
  });

  it('has code-review-graph as a dependency in package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'),
    );
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.optionalDependencies,
    };
    expect(allDeps).toHaveProperty('code-review-graph');
  });

  it('has no stale superpowers references in execution prompts', () => {
    const executionDirs = [
      'prompts/build', 'prompts/refine', 'prompts/fix',
      'prompts/plan', 'prompts/review', 'prompts/test',
      'prompts/verify', 'prompts/done', 'prompts/shared',
    ];
    const stalePatterns = /\b(superpowers|brainstorming skill|writing-plans skill)\b/i;
    const violations: string[] = [];

    for (const dir of executionDirs) {
      const fullDir = join(PACKAGE_ROOT, dir);
      if (!existsSync(fullDir)) continue;
      const files = readdirSync(fullDir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const content = readFileSync(join(fullDir, file), 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('<!-- SOURCE:')) continue;
          if (stalePatterns.test(lines[i])) {
            violations.push(`${dir}/${file}:${i + 1}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
