import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateSpec } from '../../../src/core/validation/validator.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', 'fixtures');

async function loadFixture(name: string): Promise<string> {
  return readFile(join(FIXTURES_DIR, name), 'utf-8');
}

describe('validateSpec', () => {
  it('returns valid for a well-formed spec', async () => {
    const content = await loadFixture('valid-spec.md');
    const result = validateSpec(content);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports error when requirement header is missing', () => {
    const content = [
      '## ADDED Requirements',
      '',
      'Some text without a requirement header.',
      '',
      '#### Scenario: Orphan scenario',
      '- **WHEN** something happens',
      '- **THEN** something results',
    ].join('\n');

    const result = validateSpec(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('missing requirement header'))).toBe(true);
  });

  it('reports error when scenario uses ### instead of ####', async () => {
    const content = await loadFixture('invalid-spec-wrong-heading.md');
    const result = validateSpec(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('incorrect heading level'))).toBe(true);
  });

  it('reports error when requirement has zero scenarios', async () => {
    const content = await loadFixture('invalid-spec-no-scenario.md');
    const result = validateSpec(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('has no scenarios'))).toBe(true);
  });

  it('reports error when scenario is missing WHEN', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: No When',
      'Description.',
      '',
      '#### Scenario: Missing when clause',
      '- **THEN** something happens',
    ].join('\n');

    const result = validateSpec(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('missing WHEN'))).toBe(true);
  });

  it('reports error when scenario is missing THEN', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: No Then',
      'Description.',
      '',
      '#### Scenario: Missing then clause',
      '- **WHEN** something happens',
    ].join('\n');

    const result = validateSpec(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('missing THEN'))).toBe(true);
  });

  it('reports error when REMOVED section is missing Reason', () => {
    const content = [
      '## REMOVED Requirements',
      '',
      '### Requirement: Gone Feature',
      '**Migration**: Use the new thing',
    ].join('\n');

    const result = validateSpec(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.toLowerCase().includes('reason'))).toBe(true);
  });

  it('reports error when RENAMED section is missing FROM/TO', () => {
    const content = [
      '## RENAMED Requirements',
      '',
      'FROM: Old Name',
    ].join('\n');

    const result = validateSpec(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.message.toLowerCase().includes('from') || e.message.toLowerCase().includes('to')
    )).toBe(true);
  });
});
