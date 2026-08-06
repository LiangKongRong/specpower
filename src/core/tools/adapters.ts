/**
 * Concrete tool adapters + registry + resolver.
 *
 * Three adapters:
 * - `claude` (default): `.claude/skills/<dir>/SKILL.md`, `.claude/commands/specpower/<cmd>.md`.
 *   Passthrough; prompt refs stay relative under `.claude/` (current behavior).
 * - `cac`: same layout as claude but rooted at `.cac/`; rewrites prompt refs
 *   `.claude/specpower/prompts/` → `.cac/specpower/prompts/` (project) or the
 *   installed package (user).
 * - `opencode`: `.opencode/agent/<dir>.md` (flat) + `.opencode/command/<cmd>.md`;
 *   synthesizes agent frontmatter (`description`/`mode`/`tools`) and rewrites
 *   prompt refs to `.opencode/specpower/prompts/` (project) or package (user).
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import type { ToolAdapter, ToolId, UserConfig, SkillMeta, TransformCtx } from './types.js';

/** Tools available to the user config command (id + display name). */
export interface ToolListing {
  readonly id: ToolId;
  readonly name: string;
  readonly experimental: boolean;
}

/**
 * Rewrite `.claude/specpower/prompts/` references to `targetPrefix`. Used by
 * every adapter; for `claude` + project scope `targetPrefix` equals the source
 * prefix so this is a no-op (preserving exact current behavior).
 */
function rewritePromptRefs(content: string, targetPrefix: string): string {
  return content.replace(/\.claude\/specpower\/prompts\//g, targetPrefix);
}

/**
 * Split a SKILL.md into frontmatter (raw YAML block, including fences) and the
 * body that follows. Returns `fm: null` when the file has no leading frontmatter.
 */
function splitFrontmatter(content: string): { fm: string | null; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { fm: null, body: content };
  }
  return { fm: match[0], body: content.slice(match[0].length) };
}

/** Extract the `description:` value from a frontmatter block (or null). */
function descriptionFromFrontmatter(fm: string | null): string | null {
  if (!fm) return null;
  const m = fm.match(/^description:\s*["']?(.+?)["']?\s*$/m);
  return m ? m[1] : null;
}

/** Normalize a package root to forward slashes so refs read on every platform. */
function forward(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * `claude` adapter — the default, byte-compatible with prior `specpower init`/`sync`.
 */
const claudeAdapter: ToolAdapter = {
  id: 'claude',
  rootDir: '.claude',
  skillLayout: 'nested',
  skillsScanSubdir: 'skills',
  commandsScanSubdir: 'commands/specpower',
  skillDestRelPath: (skillDir) => `skills/${skillDir}/SKILL.md`,
  commandDestRelPath: (cmd) => `commands/specpower/${cmd}.md`,
  transformSkill: (src, _meta, ctx) => {
    const target =
      ctx.scope === 'user'
        ? `${forward(ctx.packageRoot)}/prompts/`
        : '.claude/specpower/prompts/';
    return rewritePromptRefs(src, target);
  },
};

/**
 * `cac` adapter — same layout as claude, rooted at `.cac/`. Prompt refs are
 * rewritten from the `.claude/` source prefix to `.cac/` (project) or the
 * installed package (user).
 */
const cacAdapter: ToolAdapter = {
  id: 'cac',
  rootDir: '.cac',
  skillLayout: 'nested',
  skillsScanSubdir: 'skills',
  commandsScanSubdir: 'commands/specpower',
  skillDestRelPath: (skillDir) => `skills/${skillDir}/SKILL.md`,
  commandDestRelPath: (cmd) => `commands/specpower/${cmd}.md`,
  transformSkill: (src, _meta, ctx) => {
    const target =
      ctx.scope === 'user'
        ? `${forward(ctx.packageRoot)}/prompts/`
        : '.cac/specpower/prompts/';
    return rewritePromptRefs(src, target);
  },
};

/** Tools the opencode agent body may use. Best-effort; see module docstring. */
const OPENCODE_TOOLS = ['read', 'write', 'edit', 'bash', 'glob', 'grep'];

/**
 * `opencode` adapter — flat agent files under `.opencode/agent/`, commands
 * under `.opencode/command/`. The source SKILL.md frontmatter (`name`/`description`)
 * is replaced with opencode's agent frontmatter (`description`/`mode`/`tools`),
 * and prompt refs are rewritten to `.opencode/specpower/prompts/` (project) or
 * the installed package (user).
 */
const opencodeAdapter: ToolAdapter = {
  id: 'opencode',
  rootDir: '.opencode',
  skillLayout: 'flat',
  skillsScanSubdir: 'agent',
  commandsScanSubdir: 'command',
  skillDestRelPath: (skillDir) => `agent/${skillDir}.md`,
  commandDestRelPath: (cmd) => `command/${cmd}.md`,
  transformSkill: (src, meta, ctx) => {
    const { fm, body } = splitFrontmatter(src);
    const description =
      descriptionFromFrontmatter(fm) ?? meta.description ?? `Specpower ${meta.command} skill`;
    const target =
      ctx.scope === 'user'
        ? `${forward(ctx.packageRoot)}/prompts/`
        : '.opencode/specpower/prompts/';
    const toolsBlock = OPENCODE_TOOLS.map((t) => `  - ${t}`).join('\n');
    const newFrontmatter =
      '---\n' +
      `description: "${description}"\n` +
      'mode: primary\n' +
      'tools:\n' +
      toolsBlock +
      '\n---\n\n';
    return newFrontmatter + rewritePromptRefs(body, target);
  },
};

/**
 * `chrys` adapter — same layout as claude/cac, rooted at `.agents/`. Passthrough
 * frontmatter; prompt refs rewritten `.claude/` → `.agents/` (project) or the
 * installed package (user).
 */
const chrysAdapter: ToolAdapter = {
  id: 'chrys',
  rootDir: '.agents',
  skillLayout: 'nested',
  skillsScanSubdir: 'skills',
  commandsScanSubdir: 'commands/specpower',
  skillDestRelPath: (skillDir) => `skills/${skillDir}/SKILL.md`,
  commandDestRelPath: (cmd) => `commands/specpower/${cmd}.md`,
  transformSkill: (src, _meta, ctx) => {
    const target =
      ctx.scope === 'user'
        ? `${forward(ctx.packageRoot)}/prompts/`
        : '.agents/specpower/prompts/';
    return rewritePromptRefs(src, target);
  },
};

/** All adapters in canonical order (claude first as the default). */
const ADAPTERS: readonly ToolAdapter[] = [
  claudeAdapter,
  opencodeAdapter,
  cacAdapter,
  chrysAdapter,
];

const ADAPTER_BY_ID: Readonly<Record<ToolId, ToolAdapter>> = Object.fromEntries(
  ADAPTERS.map((a) => [a.id, a]),
) as Readonly<Record<ToolId, ToolAdapter>>;

/** Human-readable list for the `specpower config list` command. */
export const TOOL_LISTINGS: readonly ToolListing[] = [
  { id: 'claude', name: 'Claude Code (.claude)', experimental: false },
  { id: 'opencode', name: 'OpenCode (.opencode)', experimental: true },
  { id: 'cac', name: 'CAC (.cac)', experimental: true },
  { id: 'chrys', name: 'Chrys (.agents)', experimental: true },
];

/** True when `id` is a supported tool id. */
export function isToolId(id: string): id is ToolId {
  return id in ADAPTER_BY_ID;
}

/** Look up an adapter by id. Throws on unknown ids. */
export function getToolAdapter(id: ToolId): ToolAdapter {
  return ADAPTER_BY_ID[id];
}

/** All adapters (for iteration; order matches {@link TOOL_LISTINGS}). */
export function allAdapters(): readonly ToolAdapter[] {
  return ADAPTERS;
}

// --- user-level config -----------------------------------------------------

/** Path to the user-level specpower config file. */
export function userConfigPath(): string {
  return join(homedir(), '.specpower', 'config.json');
}

/**
 * Read the user-level config. Returns only the recognized fields (`tool`,
 * `hinted`); anything else in the file is ignored. Never throws — a missing or
 * malformed file yields `{}` so `resolveTool`/`shouldShowToolHint` can fall back
 * to the claude default.
 */
export async function readUserConfig(): Promise<UserConfig> {
  try {
    const content = await fs.readFile(userConfigPath(), 'utf-8');
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const obj = parsed as Record<string, unknown>;
    return {
      ...(typeof obj.tool === 'string' && isToolId(obj.tool)
        ? { tool: obj.tool }
        : {}),
      ...(obj.hinted === true ? { hinted: true } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Persist the user-level config (overwrites the file). Callers that want to
 * preserve existing fields should merge with {@link readUserConfig} first.
 */
export async function writeUserConfig(config: UserConfig): Promise<void> {
  const path = userConfigPath();
  await fs.mkdir(join(path, '..'), { recursive: true });
  await fs.writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Resolve the active tool adapter.
 *
 * Precedence: explicit `override` (the `SPECPOWER_TOOL` env var, passed by the
 * CLI; mainly for CI/tests) → persisted user config → `claude` default. An
 * invalid override throws; an invalid persisted config is ignored (falls back
 * to claude) so a corrupted config never breaks init/sync.
 */
export async function resolveTool(override?: string): Promise<ToolAdapter> {
  if (override) {
    if (!isToolId(override)) {
      throw new Error(
        `Unknown tool '${override}'. Supported: ${TOOL_LISTINGS.map((t) => t.id).join(', ')}.`,
      );
    }
    return ADAPTER_BY_ID[override];
  }
  const cfg = await readUserConfig();
  if (cfg.tool) {
    return ADAPTER_BY_ID[cfg.tool];
  }
  return claudeAdapter;
}

/** Synchronous variant for callers that already have a tool id (no config read). */
export function resolveToolById(id: ToolId): ToolAdapter {
  return ADAPTER_BY_ID[id];
}

// --- first-run hint (model B) ---------------------------------------------

/**
 * Whether the first-run tool hint should be shown now. True only when no
 * `SPECPOWER_TOOL` override is active, no tool is persisted, and the hint has
 * not been shown before. Non-throwing: a malformed config is treated as
 * "not hinted".
 */
export async function shouldShowToolHint(): Promise<boolean> {
  if (process.env.SPECPOWER_TOOL) {
    return false;
  }
  const cfg = await readUserConfig();
  return !cfg.tool && !cfg.hinted;
}

/** Record that the hint has been shown so it does not repeat. Preserves `tool`. */
export async function markHinted(): Promise<void> {
  const cur = await readUserConfig();
  await writeUserConfig({ ...cur, hinted: true });
}

/**
 * Show the first-run tool hint exactly once (when no tool is configured and no
 * env override is active), then mark it shown. Safe to call on every CLI
 * invocation; it is a no-op after the first time. Intended for the `init`/`sync`
 * CLI actions, not the unit-level functions, so tests that call `initProject`/
 * `syncAssets` directly are not polluted and do not touch the real home config.
 */
export async function maybeToolHint(): Promise<void> {
  if (!(await shouldShowToolHint())) {
    return;
  }
  console.info(
    '\n提示：默认目标工具为 claude（skills 写入 .claude/）。' +
      '换用 opencode 或 cac，运行：specpower config set tool <id>  ' +
      '（或临时用 SPECPOWER_TOOL=<id> 环境变量）\n',
  );
  await markHinted();
}

export type { ToolAdapter, ToolId, UserConfig, SkillMeta, TransformCtx } from './types.js';
