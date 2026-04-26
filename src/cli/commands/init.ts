/**
 * CLI command: specpower init
 *
 * Initializes a project with specpower directory structure,
 * skills, commands, prompts, schemas, and templates.
 */

import { promises as fs } from 'node:fs';
import { join, basename } from 'node:path';
import * as fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Command } from 'commander';

/**
 * Result of an init operation.
 */
export interface InitResult {
  readonly status: 'initialized' | 'already_initialized';
  readonly message: string;
}

/**
 * The 10 specpower commands, in canonical order.
 */
const COMMAND_NAMES = [
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
] as const;

type CommandName = (typeof COMMAND_NAMES)[number];

/**
 * Default descriptions for command aliases when no SKILL.md frontmatter is available.
 */
const DEFAULT_DESCRIPTIONS: Readonly<Record<CommandName, string>> = {
  scan: 'Brownfield project scanner via code-review-graph',
  plan: 'Create proposal and spec artifacts for a change',
  refine: 'Refine and iterate on spec artifacts',
  build: 'Implement tasks from a change spec',
  review: 'Review code changes against spec',
  test: 'Run tests and verify coverage',
  verify: 'Verify implementation matches spec',
  done: 'Finalize and archive a completed change',
  fix: 'Debug and fix failing tests or builds',
  snap: 'Snapshot current project state',
};

/**
 * Config YAML content for a new project.
 */
const CONFIG_YAML = `schema: specpower

# Project context (customize for your project)
# context: |
#   Tech stack: ...
#   Architecture: ...
`;

/**
 * Resolves the package root by walking up from the current module until
 * a directory containing package.json is found.
 */
function findPackageRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  let dir = join(currentFile, '..');
  const root = '/';

  while (dir !== root) {
    if (fsSync.existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    dir = join(dir, '..');
  }

  throw new Error(
    'Could not find package root (no package.json found in parent directories)',
  );
}

/**
 * Checks whether the project is already initialized.
 */
async function isAlreadyInitialized(projectRoot: string): Promise<boolean> {
  try {
    const specpowerPrompts = join(projectRoot, '.claude', 'specpower');
    const configYaml = join(projectRoot, 'specpower', 'config.yaml');

    const [promptsStat, configStat] = await Promise.allSettled([
      fs.stat(specpowerPrompts),
      fs.stat(configYaml),
    ]);

    return (
      (promptsStat.status === 'fulfilled' && promptsStat.value.isDirectory()) ||
      (configStat.status === 'fulfilled' && configStat.value.isFile())
    );
  } catch {
    return false;
  }
}

/**
 * Recursively copies a directory from src to dest.
 * Creates dest and all intermediate directories as needed.
 */
async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirRecursive(srcPath, destPath);
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, destPath);
      }
    }),
  );
}

/**
 * Extracts the description from SKILL.md frontmatter.
 * Returns the default description if no frontmatter is found.
 */
function extractSkillDescription(
  content: string,
  commandName: CommandName,
): string {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return DEFAULT_DESCRIPTIONS[commandName];
  }

  const descMatch = frontmatterMatch[1].match(
    /description:\s*["']?(.+?)["']?\s*$/m,
  );
  return descMatch ? descMatch[1] : DEFAULT_DESCRIPTIONS[commandName];
}

/**
 * Generates a command alias markdown file.
 */
function generateCommandAlias(
  commandName: CommandName,
  description: string,
): string {
  return [
    '---',
    `description: "${description}"`,
    '---',
    `Invoke the specpower:${commandName} skill.`,
    '',
  ].join('\n');
}

/**
 * Creates the specpower directory structure.
 */
async function createDirectoryStructure(projectRoot: string): Promise<void> {
  await Promise.all([
    fs.mkdir(join(projectRoot, 'specpower', 'changes'), { recursive: true }),
    fs.mkdir(join(projectRoot, 'specpower', 'specs'), { recursive: true }),
  ]);
}

/**
 * Writes the config.yaml file.
 */
async function writeConfig(projectRoot: string): Promise<void> {
  await fs.writeFile(
    join(projectRoot, 'specpower', 'config.yaml'),
    CONFIG_YAML,
    'utf-8',
  );
}

/**
 * Copies skill SKILL.md files and generates command aliases.
 */
async function copySkillsAndCommands(
  projectRoot: string,
  packageRoot: string,
): Promise<void> {
  const skillsSourceDir = join(packageRoot, 'skills');
  const skillsDestDir = join(projectRoot, '.claude', 'skills');
  const commandsDestDir = join(projectRoot, '.claude', 'commands', 'specpower');

  await fs.mkdir(commandsDestDir, { recursive: true });

  await Promise.all(
    COMMAND_NAMES.map(async (cmd) => {
      const skillDirName = `specpower-${cmd}`;
      const srcSkillDir = join(skillsSourceDir, skillDirName);
      const destSkillDir = join(skillsDestDir, skillDirName);
      const srcSkillMd = join(srcSkillDir, 'SKILL.md');

      // Copy SKILL.md if it exists, otherwise create a placeholder
      await fs.mkdir(destSkillDir, { recursive: true });

      let description = DEFAULT_DESCRIPTIONS[cmd];

      try {
        const content = await fs.readFile(srcSkillMd, 'utf-8');
        await fs.writeFile(join(destSkillDir, 'SKILL.md'), content, 'utf-8');
        description = extractSkillDescription(content, cmd);
      } catch {
        // SKILL.md not yet available; write a placeholder
        const placeholder = [
          '---',
          `name: ${skillDirName}`,
          `description: "${DEFAULT_DESCRIPTIONS[cmd]}"`,
          '---',
          '',
          `# SpecPower: ${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`,
          '',
          'Skill content pending.',
          '',
        ].join('\n');
        await fs.writeFile(join(destSkillDir, 'SKILL.md'), placeholder, 'utf-8');
      }

      // Generate command alias
      const aliasContent = generateCommandAlias(cmd, description);
      await fs.writeFile(join(commandsDestDir, `${cmd}.md`), aliasContent, 'utf-8');
    }),
  );
}

/**
 * Copies prompts directory recursively.
 */
async function copyPrompts(
  projectRoot: string,
  packageRoot: string,
): Promise<void> {
  const src = join(packageRoot, 'prompts');
  const dest = join(projectRoot, '.claude', 'specpower', 'prompts');
  await copyDirRecursive(src, dest);
}

/**
 * Copies schemas directory recursively.
 */
async function copySchemas(
  projectRoot: string,
  packageRoot: string,
): Promise<void> {
  const src = join(packageRoot, 'schemas');
  const dest = join(projectRoot, '.claude', 'specpower', 'schemas');
  await copyDirRecursive(src, dest);
}

/**
 * Copies templates directory recursively.
 */
async function copyTemplates(
  projectRoot: string,
  packageRoot: string,
): Promise<void> {
  const src = join(packageRoot, 'templates');
  const dest = join(projectRoot, '.claude', 'specpower', 'templates');
  await copyDirRecursive(src, dest);
}

/**
 * Initializes a project with specpower directory structure, skills,
 * commands, prompts, schemas, and templates.
 *
 * @param projectRoot - Absolute path to the target project root
 * @param packageRoot - Absolute path to the specpower package root
 * @returns InitResult indicating success or already-initialized
 */
export async function initProject(
  projectRoot: string,
  packageRoot: string,
): Promise<InitResult> {
  if (await isAlreadyInitialized(projectRoot)) {
    return {
      status: 'already_initialized',
      message: `Project at ${projectRoot} is already initialized. Remove specpower/config.yaml or .claude/specpower/ to reinitialize.`,
    };
  }

  await createDirectoryStructure(projectRoot);
  await writeConfig(projectRoot);

  await Promise.all([
    copySkillsAndCommands(projectRoot, packageRoot),
    copyPrompts(projectRoot, packageRoot),
    copySchemas(projectRoot, packageRoot),
    copyTemplates(projectRoot, packageRoot),
  ]);

  await updateGitignore(projectRoot);

  return {
    status: 'initialized',
    message: `Initialized specpower project at ${projectRoot}`,
  };
}

/**
 * Append specpower-generated paths to .gitignore if not already present.
 *
 * Rationale:
 * - `.claude/skills/` and `.claude/commands/` should be tracked (shared across team).
 * - `.claude/specpower/prompts|schemas|templates/` are regeneratable via `specpower init`
 *   and pollute diffs when tracked. These get ignored.
 */
async function updateGitignore(projectRoot: string): Promise<void> {
  const gitignorePath = join(projectRoot, '.gitignore');
  const markerStart = '# Added by specpower init (regeneratable assets)';
  const markerEnd = '# End specpower init';
  const block = [
    markerStart,
    '.claude/specpower/prompts/',
    '.claude/specpower/schemas/',
    '.claude/specpower/templates/',
    markerEnd,
    '',
  ].join('\n');

  let existing = '';
  try {
    existing = await fs.readFile(gitignorePath, 'utf-8');
  } catch (error: unknown) {
    if (
      !(error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT')
    ) {
      throw error;
    }
  }

  if (existing.includes(markerStart)) {
    return;
  }

  const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  await fs.writeFile(gitignorePath, existing + separator + '\n' + block, 'utf-8');
}

/**
 * Registers the `init` command with Commander.
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a project with specpower directory structure and assets')
    .action(async () => {
      const projectRoot = process.cwd();
      const packageRoot = findPackageRoot();
      const result = await initProject(projectRoot, packageRoot);

      if (result.status === 'already_initialized') {
        console.warn(`Warning: ${result.message}`);
      } else {
        console.info(result.message);
      }
    });
}
