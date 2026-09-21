import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// CLI integration tests for `specpower coverage-attribution`. These exercise
// the CLI action handler (src/cli/commands/coverage-attribution.ts) which the
// pure-function tests do not cover — including --overall display, lowFiles
// truncation, invalid threshold, missing report, and missing change.

const CLI = join(process.cwd(), 'dist', 'cli', 'index.js');

// The CLI test spawns the built dist/cli/index.js. If dist is absent (e.g. a
// local `npx vitest run` without a prior `npm run build`), the tests would
// fail confusingly against a missing file. Guard: skip the whole suite if dist
// is missing, with a clear message. CI runs `npm run build` before tests, so CI
// always has dist and runs the suite.
const describeOrSkip = existsSync(CLI) ? describe : describe.skip;

function runCli(cwd: string, args: string[]): { stdout: string; stderr: string; status: number } {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf-8' });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status ?? 0 };
}

describeOrSkip('coverage-attribution CLI (action handler)', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'cli-cov-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  function setupProject(lcov: string): void {
    // specpower project root marker
    mkdirSync(join(dir, 'specpower'), { recursive: true });
    writeFileSync(join(dir, 'specpower', 'config.yaml'), 'schema: specpower\n');
    mkdirSync(join(dir, 'coverage'), { recursive: true });
    writeFileSync(join(dir, 'coverage', 'lcov.info'), lcov);
  }

  it('--overall PASS prints aggregate + no lowFiles when all >= threshold [cli-overall-T1]', () => {
    const lcov = ['SF:src/a.ts', 'BRDA:1,0,0,1', 'BRDA:2,1,0,1', 'end_of_record', ''].join('\n');
    setupProject(lcov);
    const r = runCli(dir, ['coverage-attribution', '--overall', '--threshold', '75']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('PASS');
    expect(r.stdout).toContain('100%');
  });

  it('--overall FAIL prints FAIL when aggregate below threshold [cli-overall-T2]', () => {
    const lcov = ['SF:src/a.ts', 'BRDA:1,0,0,-', 'BRDA:2,1,0,-', 'end_of_record', ''].join('\n');
    setupProject(lcov);
    const r = runCli(dir, ['coverage-attribution', '--overall', '--threshold', '75']);
    expect(r.status).not.toBe(0);
    expect(r.stdout).toContain('FAIL');
  });

  it('--overall surfaces lowFiles even when aggregate passes [cli-overall-T3]', () => {
    // a.ts 100% (2/2), b.ts 0% (0/2) → aggregate 50%. Use threshold 40 so aggregate passes.
    const lcov = [
      'SF:src/a.ts', 'BRDA:1,0,0,1', 'BRDA:2,1,0,1', 'end_of_record',
      'SF:src/b.ts', 'BRDA:1,0,0,-', 'BRDA:2,1,0,-', 'end_of_record', '',
    ].join('\n');
    setupProject(lcov);
    const r = runCli(dir, ['coverage-attribution', '--overall', '--threshold', '40']);
    expect(r.status).toBe(0); // aggregate 50% >= 40% PASS
    expect(r.stdout).toContain('src/b.ts'); // lowFiles surfaces the masked 0% file
  });

  it('--overall truncates lowFiles to 20 with "... and N more" [cli-overall-T4]', () => {
    const lines: string[] = [];
    for (let i = 0; i < 25; i++) {
      lines.push(`SF:src/file${i}.ts`, 'BRDA:1,0,0,-', 'end_of_record');
    }
    setupProject(lines.join('\n'));
    const r = runCli(dir, ['coverage-attribution', '--overall', '--threshold', '75']);
    expect(r.stdout).toContain('... and 5 more'); // 25 - 20 = 5
  });

  it('invalid threshold rejected [cli-overall-T5]', () => {
    setupProject('SF:src/a.ts\nBRDA:1,0,0,1\nend_of_record\n');
    const r = runCli(dir, ['coverage-attribution', '--overall', '--threshold', 'abc']);
    expect(r.status).not.toBe(0);
    expect(r.stderr.toLowerCase()).toContain('invalid threshold');
  });

  it('missing coverage report fails with guidance [cli-overall-T6]', () => {
    mkdirSync(join(dir, 'specpower'), { recursive: true });
    writeFileSync(join(dir, 'specpower', 'config.yaml'), 'schema: specpower\n');
    const r = runCli(dir, ['coverage-attribution', '--overall', '--threshold', '75']);
    expect(r.status).not.toBe(0);
    expect(r.stderr.toLowerCase()).toContain('no coverage report found');
  });

  it('stale/malformed lcov fails (no false PASS from partial data) [cli-overall-T7]', () => {
    // Truncated: SF without end_of_record.
    setupProject('SF:src/a.ts\nBRDA:1,0,0,1\n'); // no end_of_record
    const r = runCli(dir, ['coverage-attribution', '--overall', '--threshold', '75']);
    expect(r.status).not.toBe(0);
    expect(r.stderr.toLowerCase() + r.stdout.toLowerCase()).toMatch(/malformed|truncat/i);
  });

  it('per-Scenario <change-name> mode: PASS when covers: files >= threshold [cli-scenario-T1]', () => {
    const lcov = ['SF:src/a.ts', 'BRDA:1,0,0,1', 'BRDA:2,1,0,1', 'end_of_record', ''].join('\n');
    setupProject(lcov);
    const changeDir = join(dir, 'specpower', 'changes', 'c1');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(join(changeDir, 'test-plan.md'),
      ['## Capability: cap', '',
       '### Requirement: R → Scenario: s', '',
       '- **Case** T1: pass [negative]',
       '  - Input: foo()', '  - Expected: reject', '  - it(): pass',
       '  - branch: pass', '  - covers: src/a.ts', ''].join('\n'));
    const r = runCli(dir, ['coverage-attribution', 'c1', '--threshold', '75']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('[PASS]');
    expect(r.stdout).toContain('PASS — all');
  });

  it('per-Scenario <change-name> mode: FAIL when a Scenario below threshold [cli-scenario-T2]', () => {
    // a.ts: 1 hit / 2 total (one '1', one '0') = 50% < 75%.
    const lcov = ['SF:src/a.ts', 'BRDA:1,0,0,1', 'BRDA:2,1,0,0', 'end_of_record', ''].join('\n');
    setupProject(lcov);
    const changeDir = join(dir, 'specpower', 'changes', 'c2');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(join(changeDir, 'test-plan.md'),
      ['## Capability: cap', '',
       '### Requirement: R → Scenario: s', '',
       '- **Case** T1: low [negative]',
       '  - Input: foo()', '  - Expected: reject', '  - it(): low',
       '  - branch: low', '  - covers: src/a.ts', ''].join('\n'));
    const r = runCli(dir, ['coverage-attribution', 'c2', '--threshold', '75']);
    expect(r.status).not.toBe(0);
    expect(r.stdout).toContain('[FAIL]');
    expect(r.stdout).toContain('FAIL —');
  });

  it('per-Scenario <change-name> mode: missing change fails with not-found [cli-scenario-T3]', () => {
    const lcov = ['SF:src/a.ts', 'BRDA:1,0,0,1', 'end_of_record', ''].join('\n');
    setupProject(lcov);
    const r = runCli(dir, ['coverage-attribution', 'no-such-change', '--threshold', '75']);
    expect(r.status).not.toBe(0);
    expect(r.stderr.toLowerCase()).toContain('not found');
  });

  it('per-Scenario <change-name> mode: empty test-plan reports no scenarios [cli-scenario-T4]', () => {
    const lcov = ['SF:src/a.ts', 'BRDA:1,0,0,1', 'end_of_record', ''].join('\n');
    setupProject(lcov);
    const changeDir = join(dir, 'specpower', 'changes', 'empty-tp');
    mkdirSync(changeDir, { recursive: true });
    // test-plan.md exists but has zero Cases (header-only / empty).
    writeFileSync(join(changeDir, 'test-plan.md'), '# test-plan: empty\n');
    const r = runCli(dir, ['coverage-attribution', 'empty-tp', '--threshold', '75']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('No Scenarios with Cases found in test-plan.md.');
  });
});
