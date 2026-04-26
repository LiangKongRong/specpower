import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applyDeltaSpec } from '../../src/core/specs-apply.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

async function loadFixture(name: string): Promise<string> {
  return readFile(join(FIXTURES_DIR, name), 'utf-8');
}

/**
 * Count `### Requirement:` headers in the result to determine requirement count.
 */
function countRequirements(content: string): number {
  const matches = content.match(/^###\s+Requirement:\s*.+$/gm);
  return matches ? matches.length : 0;
}

/**
 * Extract all requirement names from `### Requirement: <name>` headers.
 */
function extractRequirementNames(content: string): string[] {
  const matches = content.matchAll(/^###\s+Requirement:\s*(.+)$/gm);
  return [...matches].map((m) => m[1].trim());
}

describe('applyDeltaSpec', () => {
  it('adds a new requirement from ADDED delta', async () => {
    const mainSpec = await loadFixture('main-spec.md');
    const delta = await loadFixture('delta-added.md');

    const result = applyDeltaSpec(mainSpec, delta);

    expect(countRequirements(result)).toBe(4);
    const names = extractRequirementNames(result);
    expect(names).toContain('Email Export');
    expect(names).toContain('User Login');
    expect(names).toContain('User Logout');
    expect(names).toContain('Password Reset');
  });

  it('replaces requirement content from MODIFIED delta', async () => {
    const mainSpec = await loadFixture('main-spec.md');
    const delta = await loadFixture('delta-modified.md');

    const result = applyDeltaSpec(mainSpec, delta);

    expect(countRequirements(result)).toBe(3);
    expect(result).toContain('SSO');
    expect(result).toContain('JWT token');
    // Should have two scenarios for User Login now
    const ssoScenario = result.match(/####\s+Scenario:\s*SSO login/);
    expect(ssoScenario).not.toBeNull();
  });

  it('removes requirement from REMOVED delta', async () => {
    const mainSpec = await loadFixture('main-spec.md');
    const delta = await loadFixture('delta-removed.md');

    const result = applyDeltaSpec(mainSpec, delta);

    expect(countRequirements(result)).toBe(2);
    const names = extractRequirementNames(result);
    expect(names).not.toContain('Password Reset');
    expect(names).toContain('User Login');
    expect(names).toContain('User Logout');
  });

  it('renames requirement header from RENAMED delta', async () => {
    const mainSpec = await loadFixture('main-spec.md');
    const delta = await loadFixture('delta-renamed.md');

    const result = applyDeltaSpec(mainSpec, delta);

    expect(countRequirements(result)).toBe(3);
    const names = extractRequirementNames(result);
    expect(names).not.toContain('User Logout');
    expect(names).toContain('Session Logout');
  });

  it('applies all operations from combined delta', async () => {
    const mainSpec = await loadFixture('main-spec.md');
    const delta = await loadFixture('delta-combined.md');

    const result = applyDeltaSpec(mainSpec, delta);

    const names = extractRequirementNames(result);
    // Session Logout (renamed from User Logout)
    // User Login (modified with SSO)
    // Email Export (added)
    // Password Reset removed
    expect(names).toHaveLength(3);
    expect(names).toContain('Session Logout');
    expect(names).toContain('User Login');
    expect(names).toContain('Email Export');
    expect(names).not.toContain('Password Reset');
    expect(names).not.toContain('User Logout');
    expect(result).toContain('SSO');
  });

  it('throws when MODIFIED targets a non-existent requirement', async () => {
    const mainSpec = await loadFixture('main-spec.md');
    const delta = [
      '## MODIFIED Requirements',
      '',
      '### Requirement: Nonexistent Feature',
      'Updated description.',
      '',
      '#### Scenario: Updated behavior',
      '- **WHEN** user performs action',
      '- **THEN** new outcome occurs',
    ].join('\n');

    expect(() => applyDeltaSpec(mainSpec, delta)).toThrow('not found');
  });
});
