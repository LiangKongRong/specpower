import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { initProject } from '../../src/cli/commands/init.js';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..', '..');

describe('initProject', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'specpower-init-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates specpower/, specpower/changes/, specpower/specs/ directories', async () => {
    await initProject(tmpDir, PACKAGE_ROOT);

    const specpowerStat = await fs.stat(join(tmpDir, 'specpower'));
    expect(specpowerStat.isDirectory()).toBe(true);

    const changesStat = await fs.stat(join(tmpDir, 'specpower', 'changes'));
    expect(changesStat.isDirectory()).toBe(true);

    const specsStat = await fs.stat(join(tmpDir, 'specpower', 'specs'));
    expect(specsStat.isDirectory()).toBe(true);
  });

  it('creates specpower/config.yaml with schema: specpower', async () => {
    await initProject(tmpDir, PACKAGE_ROOT);

    const configContent = await fs.readFile(
      join(tmpDir, 'specpower', 'config.yaml'),
      'utf-8',
    );
    expect(configContent).toContain('schema: specpower');
  });

  it('creates .claude/skills/specpower-*/SKILL.md with 10 skill directories', async () => {
    await initProject(tmpDir, PACKAGE_ROOT);

    const skillsDir = join(tmpDir, '.claude', 'skills');
    const entries = await fs.readdir(skillsDir);
    const skillDirs = entries.filter((e) => e.startsWith('specpower-'));
    expect(skillDirs).toHaveLength(10);

    const expectedSkills = [
      'specpower-scan',
      'specpower-plan',
      'specpower-refine',
      'specpower-build',
      'specpower-review',
      'specpower-test',
      'specpower-verify',
      'specpower-done',
      'specpower-fix',
      'specpower-snap',
    ];

    for (const skill of expectedSkills) {
      const skillMdPath = join(skillsDir, skill, 'SKILL.md');
      const stat = await fs.stat(skillMdPath);
      expect(stat.isFile()).toBe(true);
    }
  });

  it('creates .claude/commands/specpower/ with 10 command alias .md files', async () => {
    await initProject(tmpDir, PACKAGE_ROOT);

    const commandsDir = join(tmpDir, '.claude', 'commands', 'specpower');
    const entries = await fs.readdir(commandsDir);
    const mdFiles = entries.filter((e) => e.endsWith('.md'));
    expect(mdFiles).toHaveLength(10);

    const expectedCommands = [
      'scan',
      'plan',
      'refine',
      'build',
      'review',
      'test',
      'verify',
      'done',
      'fix',
      'snap',
    ];

    for (const cmd of expectedCommands) {
      const cmdPath = join(commandsDir, `${cmd}.md`);
      const content = await fs.readFile(cmdPath, 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain(`specpower:${cmd}`);
    }
  });

  it('copies prompts to .claude/specpower/prompts/ with build/, refine/, shared/ subdirs', async () => {
    await initProject(tmpDir, PACKAGE_ROOT);

    const promptsDir = join(tmpDir, '.claude', 'specpower', 'prompts');
    const entries = await fs.readdir(promptsDir);

    expect(entries).toContain('build');
    expect(entries).toContain('refine');
    expect(entries).toContain('shared');

    // Verify at least one file exists in each expected subdir
    const buildEntries = await fs.readdir(join(promptsDir, 'build'));
    expect(buildEntries.length).toBeGreaterThan(0);

    const refineEntries = await fs.readdir(join(promptsDir, 'refine'));
    expect(refineEntries.length).toBeGreaterThan(0);

    const sharedEntries = await fs.readdir(join(promptsDir, 'shared'));
    expect(sharedEntries.length).toBeGreaterThan(0);
  });

  it('copies schema to .claude/specpower/schemas/specpower/schema.yaml', async () => {
    await initProject(tmpDir, PACKAGE_ROOT);

    const schemaPath = join(
      tmpDir,
      '.claude',
      'specpower',
      'schemas',
      'specpower',
      'schema.yaml',
    );
    const stat = await fs.stat(schemaPath);
    expect(stat.isFile()).toBe(true);

    const content = await fs.readFile(schemaPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('copies templates to .claude/specpower/templates/ with 4 .md files', async () => {
    await initProject(tmpDir, PACKAGE_ROOT);

    const templatesDir = join(tmpDir, '.claude', 'specpower', 'templates');
    const entries = await fs.readdir(templatesDir);
    const mdFiles = entries.filter((e) => e.endsWith('.md'));
    expect(mdFiles).toHaveLength(4);

    const expectedTemplates = ['proposal.md', 'spec.md', 'design.md', 'tasks.md'];
    for (const tmpl of expectedTemplates) {
      expect(mdFiles).toContain(tmpl);
    }
  });

  it('re-running init returns already_initialized and does NOT overwrite', async () => {
    const firstResult = await initProject(tmpDir, PACKAGE_ROOT);
    expect(firstResult.status).toBe('initialized');

    // Write a marker into config to verify no overwrite
    const configPath = join(tmpDir, 'specpower', 'config.yaml');
    await fs.writeFile(configPath, 'schema: specpower\nmarker: original\n', 'utf-8');

    const secondResult = await initProject(tmpDir, PACKAGE_ROOT);
    expect(secondResult.status).toBe('already_initialized');
    expect(secondResult.message).toContain('already initialized');

    // Verify config was NOT overwritten
    const configContent = await fs.readFile(configPath, 'utf-8');
    expect(configContent).toContain('marker: original');
  });
});
