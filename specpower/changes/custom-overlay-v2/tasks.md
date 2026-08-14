# custom-overlay-v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use specpower:build Phase B (recommended) or specpower:build Phase B (inline mode) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** custom 叠加层投递从 controller 内联改为 sync 烘焙进 prompt 占位符（消除 controller LLM 依赖）；失败策略全抛错 fail-fast；include-roots 默认最宽；worktree sync 不 stamp config；per-file once。

**Architecture:** `custom-bake.ts` 在 init/sync 时递归烘焙 `!include` + 烘焙 custom 内容进 4 处 prompt 占位符（确定性 TS，4 映射：coding→implementer-prompt+receiving-code-review；review→code-reviewer-prompt+code-review.md）；全抛错；worktree sync 自动检测跳过 stamp；D9 subagent 自检占位符残留 + D11 controller 检测 !include 残留兜底。

**Tech Stack:** TypeScript, commander, js-yaml, vitest

---

## 1. custom-bake.ts 改造

### Task 1.1: DEFAULT_INCLUDE_ROOTS 改默认值

**Files:**
- Modify: `src/cli/commands/custom-bake.ts`（`DEFAULT_INCLUDE_ROOTS` 常量）

- [ ] **Step 1: 改常量**

```ts
const DEFAULT_INCLUDE_ROOTS = ['specpower/', 'docs/', 'arch/', 'design/'];
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Verify: exit 0, 无 tsc 错误

### Task 1.2: D4 全抛错（file-not-found/越界从降级改抛错）

**Files:**
- Modify: `src/cli/commands/custom-bake.ts`（expandFile 的 target realpath catch + sandbox 检查）
- Modify: `test/cli/custom-bake.test.ts`（"degrades to comment" 用例改"throws"）

- [ ] **Step 1: 改测试反映全抛错**

`test/cli/custom-bake.test.ts` 的 "degrades a missing target to a visible comment" 和 "skips a target outside include-roots" 用例改为 expect throw：

```ts
it('throws on missing target (fail-fast)', async () => {
  await write(join(dir, 'specpower', 'config.yaml'),
    'schema: specpower\ncustom:\n  include-roots: [docs/]\n');
  await write(join(dir, 'specpower', 'custom', 'coding', 'a.md'),
    '!include docs/missing.md\n');
  await expect(bake()).rejects.toThrow(/file not found: docs\/missing\.md/);
});

it('throws on out-of-sandbox target (fail-fast, no leak)', async () => {
  await write(join(dir, '..', 'escape.md'), 'secret\n');
  await write(join(dir, 'specpower', 'custom', 'coding', 'a.md'),
    '!include ../escape.md\n');
  await expect(bake()).rejects.toThrow(/outside include-roots/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/cli/custom-bake.test.ts`
Verify: FAIL（现有降级逻辑不抛错）

- [ ] **Step 3: 改实现——target realpath catch 抛错**

`src/cli/commands/custom-bake.ts` expandFile 里 target realpath 的 catch 分支，从降级注释改抛错：

```ts
let realTarget: string;
try {
  realTarget = fsSync.realpathSync(target);
} catch {
  throw includeError(ctx, absFile, i + 1, directive, `file not found: ${inc}`);
}

if (!isUnderAnyRoot(realTarget, ctx.roots)) {
  const rootNames = ctx.roots.map((r) => relative(ctx.projectRoot, r) || r).join(', ');
  throw includeError(ctx, absFile, i + 1, directive, `target is outside include-roots [${rootNames}]`);
}
```

- [ ] **Step 4: 删过时的"degrade"测试用例 + 跑通过**

Run: `npx vitest run test/cli/custom-bake.test.ts`
Verify: PASS（全抛错用例通过）

### Task 1.3: D7 per-top-level-file seen

**Files:**
- Modify: `src/cli/commands/custom-bake.ts`（bakeCustomIncludes 的 ctx 改 per-file）
- Modify: `test/cli/custom-bake.test.ts`（加 cross-file 不去重用例）

- [ ] **Step 1: 加 cross-file 测试**

```ts
it('does NOT deduplicate cross-file includes (per-top-level-file seen)', async () => {
  await write(join(dir, 'specpower', 'config.yaml'),
    'schema: specpower\ncustom:\n  include-roots: [docs/]\n');
  await write(join(dir, 'docs', 'shared.md'), 'SHARED-MARKER\n');
  await write(join(dir, 'specpower', 'custom', 'coding', 'a.md'),
    '!include docs/shared.md\n');
  await write(join(dir, 'specpower', 'custom', 'review', 'b.md'),
    '!include docs/shared.md\n');
  await bake();
  const a = await read(join(dir, 'specpower', 'custom', 'coding', 'a.md'));
  const b = await read(join(dir, 'specpower', 'custom', 'review', 'b.md'));
  expect(a).toContain('SHARED-MARKER');
  expect(b).toContain('SHARED-MARKER'); // 不被 coding/a 的 seen 吞掉
});
```

- [ ] **Step 2: 跑确认失败**（现状 seen 跨文件共享，b.md 拿不到）

Run: `npx vitest run test/cli/custom-bake.test.ts -t "cross-file"`
Verify: FAIL（b.md 不含 SHARED-MARKER）

- [ ] **Step 3: 改实现——per-file ctx**

`bakeCustomIncludes` 的循环改为每个顶层文件新建 ctx（seen/stack 独立，totalBytes 全局）：

```ts
export async function bakeCustomIncludes(projectRoot: string): Promise<void> {
  const roots = await resolveIncludeRoots(projectRoot);
  let totalBytes = 0;
  for (const kind of ['coding', 'review'] as const) {
    const dir = join(projectRoot, 'specpower', 'custom', kind);
    let entries: fsSync.Dirent[];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { continue; }
    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name).sort();
    for (const name of mdFiles) {
      const file = join(dir, name);
      const ctx: BakeCtx = { projectRoot, roots, stack: new Set(), seen: new Set(), totalBytes };
      const expanded = await expandFile(file, ctx);
      await fs.writeFile(file, expanded, 'utf-8');
    }
  }
}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run test/cli/custom-bake.test.ts`
Verify: PASS（cross-file + 菱形 once 都过）

### Task 1.4: D1 prompt 占位符烘焙（4 映射）

**Files:**
- Modify: `src/cli/commands/custom-bake.ts`（加 bakePrompts 函数 + 4 映射 + 在 bakeCustomIncludes 末尾调）
- Modify: `test/cli/custom-bake.test.ts`（加 prompt 烘焙测试）

- [ ] **Step 1: 加 prompt 烘焙测试**

```ts
it('bakes custom content into prompt placeholder (4 mappings)', async () => {
  await write(join(dir, 'specpower', 'config.yaml'), 'schema: specpower\n');
  await write(join(dir, 'specpower', 'custom', 'coding', 'rules.md'), 'C-RULE\n');
  await write(join(dir, 'specpower', 'custom', 'review', 'rules.md'), 'R-RULE\n');
  // 4 prompt 副本含 [CONTROLLER: 占位符
  await write(join(dir, '.claude', 'specpower', 'prompts', 'shared', 'implementer-prompt.md'),
    'X\n[CONTROLLER: paste coding rules]\nY\n');
  await write(join(dir, '.claude', 'specpower', 'prompts', 'shared', 'code-reviewer-prompt.md'),
    'X\n[CONTROLLER: paste review rules]\nY\n');
  // ... receiving-code-review.md, review/code-review.md 同样
  await bake();
  const ip = await read(join(dir, '.claude', 'specpower', 'prompts', 'shared', 'implementer-prompt.md'));
  expect(ip).toContain('C-RULE');
  expect(ip).not.toMatch(/\[CONTROLLER:/);
  // review 映射同理
});
```

- [ ] **Step 2: 跑确认失败**

Run: `npx vitest run test/cli/custom-bake.test.ts -t "prompt placeholder"`
Verify: FAIL（无 prompt 烘焙逻辑）

- [ ] **Step 3: 加 bakePrompts 实现**

```ts
const PROMPT_PLACEHOLDER_MAP: Array<{ kind: 'coding' | 'review'; promptRel: string }> = [
  { kind: 'coding', promptRel: join('.claude', 'specpower', 'prompts', 'shared', 'implementer-prompt.md') },
  { kind: 'coding', promptRel: join('.claude', 'specpower', 'prompts', 'shared', 'receiving-code-review.md') },
  { kind: 'review', promptRel: join('.claude', 'specpower', 'prompts', 'shared', 'code-reviewer-prompt.md') },
  { kind: 'review', promptRel: join('.claude', 'specpower', 'prompts', 'review', 'code-review.md') },
];

async function readCustomConcat(projectRoot: string, kind: 'coding' | 'review'): Promise<string> {
  const dir = join(projectRoot, 'specpower', 'custom', kind);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const mds = entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name).sort();
    const parts = await Promise.all(mds.map((m) => fs.readFile(join(dir, m), 'utf-8')));
    return parts.length ? parts.join('\n') : 'none';
  } catch {
    return 'none';
  }
}

async function bakePrompts(projectRoot: string): Promise<void> {
  const byKind = { coding: await readCustomConcat(projectRoot, 'coding'),
                   review: await readCustomConcat(projectRoot, 'review') };
  for (const { kind, promptRel } of PROMPT_PLACEHOLDER_MAP) {
    const promptPath = join(projectRoot, promptRel);
    let text: string;
    try { text = await fs.readFile(promptPath, 'utf-8'); }
    catch { continue; } // prompt 副本不存在（未 init）跳过
    const replaced = text.replace(/\[CONTROLLER:[^\]]*\]/g, byKind[kind]);
    await fs.writeFile(promptPath, replaced, 'utf-8');
  }
}
```

在 `bakeCustomIncludes` 末尾加 `await bakePrompts(projectRoot);`。

- [ ] **Step 4: Verify**

Run: `npx vitest run test/cli/custom-bake.test.ts`
Verify: PASS（prompt 占位符被替换、4 映射正确）

---

## 2. prompt 占位符语义 + D9 自检

### Task 2.1: 4 个 prompt 占位符语义改"sync 烘焙替换"

**Files:**
- Modify: `prompts/shared/implementer-prompt.md`、`code-reviewer-prompt.md`、`receiving-code-review.md`、`prompts/review/code-review.md`

- [ ] **Step 1: 占位符说明改为"sync 烘焙替换"**

每个占位符段（现为"controller 读 custom 填入"）改为"由 specpower init/sync 烘焙时替换为 specpower/custom/{coding,review}/ 内容，缺失写 none"。例（implementer-prompt.md）：

```
## Project Coding Standards (sync-baked)

The placeholder below is replaced at `specpower init`/`sync` time with the
concatenated contents of `specpower/custom/coding/` top-level .md (lexicographic).
If the directory is empty/missing, it reads `none`. Do NOT read custom files
at runtime — they are already inlined here.

[CONTROLLER: paste coding rules here]
```

4 个 prompt 文件同改（coding→implementer/receiving；review→code-reviewer/code-review）。

- [ ] **Step 2: Verify**

Run: `grep -rln "\[CONTROLLER:" prompts/` → 4 文件命中
Run: `grep -rln "sync-baked\|sync 烘焙" prompts/shared/ prompts/review/` → 4 文件命中

### Task 2.2: D9 subagent 自检占位符残留

**Files:**
- Modify: 4 个 prompt 文件的占位符段

- [ ] **Step 1: 加自检指示**

每个占位符段加：

```
If you see the literal `[CONTROLLER:` text still in this prompt (sync bake
missing/failed), report DONE_WITH_CONCERNS — do not treat it as a rule.
```

- [ ] **Step 2: Verify**

Run: `grep -rln "sync bake missing" prompts/` → 4 文件命中

---

## 3. init/sync + D10 + D11

### Task 3.1: D10 sync 自动检测 worktree 跳过 stamp

**Files:**
- Modify: `src/cli/commands/sync.ts`（stampVersionInConfig 调用前检测 worktree）
- Modify: `test/cli/sync.test.ts`（加 worktree 不 stamp 用例）

- [ ] **Step 1: 加 worktree 检测测试**

```ts
it('worktree sync skips stampVersionInConfig (no config.yaml git diff)', async () => {
  // 在 worktree 里跑 sync，断言 config.yaml version 行不变
  // 需 worktree 环境——用 git worktree add 建，或 mock isWorktree
});
```

- [ ] **Step 2: 加 isWorktree 检测 + 条件跳过 stamp**

`src/cli/commands/sync.ts` 加 helper：

```ts
import { execSync } from 'node:child_process';
function isInsideWorktree(): boolean {
  try {
    const common = execSync('git rev-parse --git-common-dir', { encoding: 'utf-8' }).trim();
    const toplevel = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    // worktree: common-dir 的父 ≠ toplevel
    const commonParent = resolve(common, '..');
    return commonParent !== toplevel;
  } catch { return false; }
}
```

syncAssets project 分支 stamp 调用改：

```ts
if (!isInsideWorktree()) {
  await stampVersionInConfig(projectRoot, readPackageVersion(packageRoot));
}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run test/cli/sync.test.ts`
Verify: PASS（worktree 场景不 stamp）

### Task 3.2: D11 build 前残留检测（controller 指示）

**Files:**
- Modify: `prompts/build/phase-b-execute.md`、`phase-b-review.md`、`skills/specpower-review/SKILL.md`

- [ ] **Step 1: 加 controller 预检指示**

phase-b-execute.md dispatch implementer 前加：

```
Before dispatch: if `specpower/custom/coding/*.md` contains any unresolved
`!include` directive line, warn the user to run `specpower sync` (bake
incomplete). The baked prompt should have no `!include` residue.
```

phase-b-review.md / specpower-review SKILL.md 同（review/coding）。

- [ ] **Step 2: Verify**

Run: `grep -rln "unresolved.*!include" prompts/build/ .claude/skills/specpower-review/`
Verify: 命中

---

## 4. 文档

### Task 4.1: 验证文档已反映最终决策

**Files:**
- Verify: `custom/README.md`、`README.md`、`src/cli/commands/init.ts`（buildConfigYaml 注释）

- [ ] **Step 1: 检查文档一致**

Run: `grep -n "specpower/.*docs/.*arch/.*design" custom/README.md README.md`
Verify: default roots = specpower/+docs/+arch/+design/ 出现

Run: `grep -n "fail-fast\|全抛错\|throws" custom/README.md`
Verify: 失败策略全抛错

- [ ] **Step 2: 补 buildConfigYaml 注释（default roots）**

`init.ts` buildConfigYaml 的 include-roots 注释改：

```yaml
# custom:
#   include-roots: [wiki/]   # default: specpower/ + docs/ + arch/ + design/ (always); add more here
```

Run: `npm run build`
Verify: exit 0

---

## 5. 测试 + 端到端

### Task 5.1: 改 custom-bake 测试（全抛错 + per-file + prompt 烘焙）

**Files:**
- Modify: `test/cli/custom-bake.test.ts`

- [ ] **Step 1: 删所有"degrades to comment"用例，改"throws"**

见 Task 1.2/1.3/1.4 已加的用例。确认无残留 degrade 用例：

Run: `grep -n "degrades\|skipped -->" test/cli/custom-bake.test.ts`
Verify: 无输出（全删）

- [ ] **Step 2: 跑 custom-bake 测试**

Run: `npx vitest run test/cli/custom-bake.test.ts`
Verify: PASS（全抛错 + per-file + prompt 烘焙 + cross-file 用例通过）

### Task 5.2: prompts-custom-placeholder 测试更新

**Files:**
- Modify: `test/cli/prompts-custom-placeholder.test.ts`

- [ ] **Step 1: 占位符措辞断言更新（sync-baked 非 controller-inlined）**

```ts
it('prompts use sync-baked placeholder wording (not controller-inlined)', () => {
  for (const [dir, file] of TEMPLATES) {
    const text = readPrompt(dir, file);
    expect(text).toContain('[CONTROLLER:');
    expect(text.toLowerCase()).toMatch(/sync-baked|sync 烘焙/);
    expect(text).not.toContain('controller-inlined'); // 旧措辞删
  }
});
```

- [ ] **Step 2: Verify**

Run: `npx vitest run test/cli/prompts-custom-placeholder.test.ts`
Verify: PASS

### Task 5.3: 全测 + 端到端

- [ ] **Step 1: 跑全测**

Run: `npm test`
Verify: 全 pass（custom-bake + placeholder + init/sync/adapters 不回归）

- [ ] **Step 2: 端到端——包源 include + 项目 docs + sync 烘焙 prompt**

```bash
# 包源 custom/coding/coding-standards.md 写 !include docs/coding-style.md
# build → 临时项目 init（config 骨架，docs/ 是 default root）+ sync
# 验证 specpower/custom/coding/coding-standards.md 展开（无 !include）
# 验证 .claude/specpower/prompts/shared/implementer-prompt.md 占位符被替换为规则文本
# 反例：!include docs/missing.md → sync 抛错中断
```

Verify: custom 展开 + prompt 占位符替换；缺失抛错

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(custom): sync-bake overlay into prompt placeholders + fail-fast + per-file + worktree no-stamp"
```

Verify: `git log -1 --oneline` 显示新 commit
