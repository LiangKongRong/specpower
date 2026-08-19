/**
 * Integration test: Build execution-mode selection gate (Stage 0) + Phase B
 * hard gate, backed by .specpower.yaml persistence.
 *
 * Backs the delta spec fix-build-execution-mode-gate/specs/specpower-build/spec.md.
 * Each `it()` embeds a stable token [fix-build-execution-mode-gate-T<n>] for verify.
 *
 * Contract: build SHALL prompt for execution mode (subagent vs inline) at build
 * start (Stage 0), persist the decision in .specpower.yaml so it survives
 * interruption/restart, and Phase B SHALL hard-gate on a recorded mode (running
 * Stage 0 if missing). Phase A's handoff no longer presents the choice.
 */

import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..', '..');
const SKILLS_DIR = join(PACKAGE_ROOT, 'skills');
const PROMPTS_DIR = join(PACKAGE_ROOT, 'prompts');
const BUILD_SKILL = join(SKILLS_DIR, 'specpower-build', 'SKILL.md');
const PHASE_A_PLAN = join(PROMPTS_DIR, 'build', 'phase-a-plan.md');
const INLINE_PROMPT = join(PROMPTS_DIR, 'shared', 'executing-plans.md');

describe('Build execution-mode gate [fix-build-execution-mode-gate]', () => {
  it('Stage 0 presents both execution modes at build start when unset [fix-build-execution-mode-gate-T1]', async () => {
    // Scenario: Stage 0 presents both execution modes when mode is unset
    const content = await fs.readFile(BUILD_SKILL, 'utf-8');

    expect(/execution[\s-]?mode\s+(selection|gate)/i.test(content)).toBe(true);
    expect(content).toContain('subagent');
    expect(content).toContain('inline');
    // Must ask the user (no silent default).
    expect(/ask the user|which (approach|mode)|user.*(choose|select)/i.test(content)).toBe(
      true,
    );
  });

  it('Stage 0 reads and resumes the recorded mode via change mode CLI [fix-build-execution-mode-gate-T2]', async () => {
    // Scenario: Stage 0 resumes a recorded mode without re-asking
    const content = await fs.readFile(BUILD_SKILL, 'utf-8');

    expect(content).toMatch(/specpower change mode/i);
    expect(/record|resume|already|\.specpower\.yaml/i.test(content)).toBe(true);
  });

  it('Phase B has a hard gate verifying a recorded mode [fix-build-execution-mode-gate-T3]', async () => {
    // Scenario: Phase B hard gate runs Stage 0 when mode is missing
    const content = await fs.readFile(BUILD_SKILL, 'utf-8');

    expect(/hard gate|execution[\s-]?mode.*(record|gate)|verify.*execution[\s-]?mode/i.test(content)).toBe(true);
    expect(/Stage 0/i.test(content)).toBe(true);
  });

  it('Phase B routes to the subagent path [fix-build-execution-mode-gate-T4]', async () => {
    // Scenario: Phase B routes to the subagent path when mode is subagent
    const content = await fs.readFile(BUILD_SKILL, 'utf-8');

    expect(/subagent path/i.test(content)).toBe(true);
    expect(content).toContain('.claude/specpower/prompts/build/phase-b-execute.md');
  });

  it('Phase B routes to the inline path via executing-plans.md [fix-build-execution-mode-gate-T5]', async () => {
    // Scenario: Phase B routes to the inline path when mode is inline
    const content = await fs.readFile(BUILD_SKILL, 'utf-8');

    expect(/inline path/i.test(content)).toBe(true);
    expect(content).toContain('.claude/specpower/prompts/shared/executing-plans.md');
    expect(existsSync(INLINE_PROMPT)).toBe(true);
  });

  it('worktree setup is common to both execution paths [fix-build-execution-mode-gate-T6]', async () => {
    // Scenario: worktree setup is common to both execution paths
    const content = await fs.readFile(BUILD_SKILL, 'utf-8');

    expect(content).toContain('.claude/specpower/prompts/build/phase-b-worktree.md');
    expect(/common to both paths/i.test(content)).toBe(true);
  });

  it('Phase A handoff no longer presents the mode choice [fix-build-execution-mode-gate-T7]', async () => {
    // Scenario (negative): Phase A Execution Handoff defers to Stage 0
    const content = await fs.readFile(PHASE_A_PLAN, 'utf-8');

    expect(/Execution Handoff/.test(content)).toBe(true);
    expect(content).not.toMatch(/Which approach\?/);
  });
});
