## 1. 基础设施：phase 元数据类型

- [ ] 1.1 TEST: 为 ChangeMetadata 的 phase 字段写测试
  - File: `test/utils/change-metadata.test.ts` (新建)
  - Test cases (5):
    - `readChangeMetadata(dir)` 读取含 `phase: plan` 的文件 → 返回对象含 `phase: "plan"`
    - 读取不含 phase 字段的老文件（0.1.0 格式）→ 返回对象的 `phase` 字段为 `undefined`（向后兼容）
    - `writeChangeMetadata(dir, {schema, created, phase: "refined"})` → YAML 文件含 `phase: refined` 行
    - 读取 `phase: invalid-value` → Zod 校验抛错，错误消息含 `"plan" | "refined" | "built" | "archived"` 四个 enum 值
    - 读取无 schema/created 字段 → 抛 "Invalid metadata format"（既有行为不变）
  - Verify: `npx vitest run test/utils/change-metadata.test.ts` → 5 tests FAIL (红)

- [ ] 1.2 IMPLEMENT: 扩展 ChangeMetadata 类型 + Zod schema
  - File: `src/utils/change-metadata.ts`
  - 改动点：
    - 新增 `export const CHANGE_PHASES = ["plan", "refined", "built", "archived"] as const`
    - 新增 `export type ChangePhase = typeof CHANGE_PHASES[number]`
    - `ChangeMetadata` 接口新增 `readonly phase?: ChangePhase`
    - `readChangeMetadata` 内部用 Zod schema: `z.object({ schema: z.string(), created: z.string(), phase: z.enum(CHANGE_PHASES).optional() }).passthrough()`
    - 对 invalid phase 抛 `Error("Invalid phase in metadata: expected one of plan|refined|built|archived")`
  - Verify: `npx vitest run test/utils/change-metadata.test.ts` → 5 tests PASS (绿)
  - Verify: `npx tsc --noEmit` exits 0

- [ ] 1.3 TEST: change-utils 暴露 phase 操作
  - File: `test/utils/change-utils.test.ts` (扩展已有文件)
  - Test cases (3, 添加到已有 9 个后):
    - `writeChangeMetadata("my-feature", {schema, created, phase: "plan"}, tmpRoot)` → 写入的文件含 `phase: plan`
    - 新增 helper `updatePhase("my-feature", "refined", tmpRoot)` → 原文件的 phase 字段被更新为 "refined"，其他字段不变
    - `updatePhase("nonexistent", "built", tmpRoot)` → 抛错含 "not found"
  - Verify: `npx vitest run test/utils/change-utils.test.ts` → 3 new tests FAIL

- [ ] 1.4 IMPLEMENT: change-utils 的 updatePhase 函数
  - File: `src/utils/change-utils.ts`
  - 新增：
    ```typescript
    export async function updatePhase(
      name: string,
      phase: ChangePhase,
      projectRoot: string,
    ): Promise<void>
    ```
  - 实现：调用 `getChangeMetadata(name, projectRoot)` 读现有 → 抛错如果不存在 → 用新 phase 构造新对象 → 调用 `writeChangeMetadata`
  - 在 `src/utils/index.ts` barrel 加 `export { updatePhase, CHANGE_PHASES } from './change-utils.js'`
  - Verify: `npx vitest run test/utils/` → 全部通过（12+3=15 个测试，其中 change-utils 新增 3 个）

## 2. CLI：change new 初始化 phase

- [ ] 2.1 TEST: change new 写入 phase=plan
  - File: `test/cli/change-new.test.ts` (扩展已有 4 个测试)
  - 新测试：`createChange("feat", tmpDir)` → 读取生成的 `.specpower.yaml` 含 `phase: plan` 行
  - Verify: `npx vitest run test/cli/change-new.test.ts` → 新测试 FAIL

- [ ] 2.2 IMPLEMENT: change new 写入 phase
  - File: `src/cli/commands/change-new.ts`
  - 修改 `createChange` 内部构造的 metadata 对象，加 `phase: "plan"`
  - Verify: `npx vitest run test/cli/change-new.test.ts` → 全部 5 个测试 PASS
  - Verify: `cd /tmp/test-v2 && specpower change new foo && cat specpower/changes/foo/.specpower.yaml` 输出包含 `phase: plan`（手测）

## 3. CLI：change phase 子命令

- [ ] 3.1 TEST: change phase 子命令行为
  - File: `test/cli/change-phase.test.ts` (新建)
  - Test cases (5):
    - `getPhase("my-feature", tmpRoot)` 读取 phase → 返回 "plan"
    - `setPhase("my-feature", "refined", tmpRoot)` → 文件 phase 更新为 refined
    - `setPhase("my-feature", "invalid", tmpRoot)` → 抛错含合法 enum 列表
    - `getPhase("nonexistent", tmpRoot)` → 抛 "Change not found"
    - `getPhase` 读取无 phase 字段的文件 → 返回 undefined（向后兼容）
  - Verify: `npx vitest run test/cli/change-phase.test.ts` → 5 tests FAIL

- [ ] 3.2 IMPLEMENT: src/cli/commands/change-phase.ts
  - File: `src/cli/commands/change-phase.ts` (新建)
  - 导出：
    - `getPhase(name: string, projectRoot: string): Promise<ChangePhase | undefined>`
    - `setPhase(name: string, phase: string, projectRoot: string): Promise<void>`（校验 phase 合法性 + 调用 utils.updatePhase）
    - `registerChangePhaseCommand(changeCmd: Command): void`（注册 `program.command("change").command("phase <name>").option("--set <value>")`）
  - `--set` 选项存在 → 调 `setPhase`；不存在 → 调 `getPhase` 并打印
  - 在 `src/cli/index.ts` 调用 `registerChangePhaseCommand(changeCmd)`
  - Verify: `npx vitest run test/cli/change-phase.test.ts` → 5 tests PASS
  - Verify: `node bin/specpower.js change --help` 输出含 `phase` 子命令

## 4. CLI：change archive 加 phase 守门

- [ ] 4.1 TEST: archive 的 phase 守门
  - File: `test/cli/change-archive.test.ts` (扩展已有 3 个测试)
  - 新测试 (4):
    - 变更 phase=plan，不带 --force 调 archive → 抛错含 "Cannot archive: change ... is in phase plan, expected built"
    - 变更 phase=refined，不带 --force → 同样抛错
    - 变更 phase=built，不带 --force → 成功归档
    - 变更 phase=plan，带 --force → 成功归档（打印 warning 到 stderr）
  - Verify: 新测试 FAIL

- [ ] 4.2 IMPLEMENT: archive 检查 phase
  - File: `src/core/archive.ts` - `archiveChange` 函数签名加第三参数 `options?: { force?: boolean }`
  - 逻辑：读 `.specpower.yaml` → phase !== "built" && !options.force → 返回 `{success: false, errors: ["Cannot archive..."]}`
  - File: `src/cli/commands/change-archive.ts` - 注册 `--force` option，传给 `archiveChange`
  - 归档成功后：归档目录的 `.specpower.yaml` phase 字段改为 "archived"（移动文件后用 `updatePhase` 更新）
  - Verify: `npx vitest run test/cli/change-archive.test.ts` + `test/core/archive.test.ts` 全过（3+4+4=11）

- [ ] 4.3 TEST: archive 后目标 phase=archived
  - File: `test/core/archive.test.ts` (扩展)
  - 新测试：phase=built 的 change 归档后，归档目录 `.specpower.yaml` 含 `phase: archived`
  - Verify: 测试 PASS（应该已经在 4.2 被实现）

## 5. 新增 prompt 文件 (plan 阶段)

- [ ] 5.1 创建 `prompts/plan/design-draft.md`
  - File: `prompts/plan/design-draft.md` (新建)
  - 内容要点：
    - HARD GATE 开头：强调 first-iteration deep analysis，不是占位
    - 明确指令："Identify the real architectural decisions this change requires"
    - 指示参考已归档 design 样本路径（使用相对路径 `.claude/specpower/prompts/reference/superpowers/writing-skills.md` 不合适，要用 specpower 自己的 reference）
    - 每个 Decision 要求：options ≥ 2（含 pros/cons） + 推荐选项 + rationale
    - 允许在 plan 阶段标记决策为 `(plan-phase analysis, may revise in refine)`
    - 明确 NOT 量化门槛：质量由用户审查，不搞"至少 N 个"
  - Verify: `wc -l prompts/plan/design-draft.md` ≥ 40; `grep -c "HARD GATE\|identify real\|options considered\|rationale" prompts/plan/design-draft.md` ≥ 4

- [ ] 5.2 创建 `prompts/plan/tasks-draft.md`
  - File: `prompts/plan/tasks-draft.md` (新建)
  - 内容要点：
    - 明确："Generate substantive first-iteration tasks. Not placeholders."
    - 要求 3-8 个分组（`## N. <Group>`）, 每组 2-6 个具体 checkbox 项（`- [ ] N.M 动词短语`）
    - 明确注释：build Phase A 会用 writing-plans 严格规则重写为原子任务
    - 要求文件头部注释指示这是 plan-phase 骨架（注：marker 最终放 `.specpower.yaml` phase 字段，但 prompt 里仍可有内联说明）
  - Verify: `wc -l prompts/plan/tasks-draft.md` ≥ 30; `grep -c "substantive\|3-8\|rewrite\|writing-plans" prompts/plan/tasks-draft.md` ≥ 3

- [ ] 5.3 创建 reference 样本 `prompts/reference/specpower/example-design.md`
  - File: `prompts/reference/specpower/example-design.md` (新建)
  - 内容：从 `openspec/changes/archive/2026-04-26-create-specpower-plugin/design.md` 复制全文
  - 顶部加 HTML 注释：`<!-- Reference example from archived create-specpower-plugin change. Do not copy blindly; adapt structure and depth to current change. -->`
  - Verify: 文件存在；`grep -c "### D[0-9]" prompts/reference/specpower/example-design.md` ≥ 3（至少 3 个 Decision 段落作为范本）

## 6. 重写 specpower-plan SKILL.md

- [ ] 6.1 写 specpower-plan 的重写（已有文件，用 Edit 替换）
  - File: `skills/specpower-plan/SKILL.md`
  - 新 4 阶段结构：
    - Stage 1: `specpower change new <name>` (初始化 phase=plan)
    - Stage 2: Read `.claude/specpower/prompts/plan/proposal.md` → 生成 proposal → HARD GATE: 用户确认
    - Stage 3: Read `.claude/specpower/prompts/plan/specs.md` → 生成 specs → HARD GATE: 用户确认（可选简化）
    - Stage 4: Read `.claude/specpower/prompts/plan/design-draft.md` → 生成 design.md（无 HARD GATE，连续）
    - Stage 5: Read `.claude/specpower/prompts/plan/tasks-draft.md` → 生成 tasks.md（无 HARD GATE）
    - Stage 6: Present 全部 4 artifacts + 说明 "first-iteration"；提示 `/specpower:refine`
  - Verify: `wc -l skills/specpower-plan/SKILL.md` ≤ 130; `grep -c "Stage [1-6]" skills/specpower-plan/SKILL.md` = 6; 所有 Read 路径指向 §5.1/5.2 创建的文件

- [ ] 6.2 验证 SKILL.md 引用的文件都存在
  - 用 grep 抽取 `.claude/specpower/prompts/plan/.*\.md` → 逐个确认文件存在
  - Verify: `for p in $(grep -oE '\.claude/specpower/prompts/plan/[a-z-]+\.md' skills/specpower-plan/SKILL.md | sort -u); do [ -f "${p#.claude/specpower/}" ] && echo "OK $p" || echo "MISSING $p"; done` 全部 OK（映射本地 prompts/）

## 7. 重写 refine prompt (真正整合 Superpowers 9 步 + 4 挑战行为)

- [ ] 7.1 重写 `prompts/refine/brainstorm.md`（真整合 Superpowers 9 步）
  - File: `prompts/refine/brainstorm.md`
  - 结构：
    - 开头 HARD GATE：No implementation until user confirms refined artifacts
    - 明确声明："This prompt is for ATTACKING DEEP REVIEW of plan-phase artifacts, NOT from-scratch brainstorming"
    - Section "Context": refine 场景解释（已有 4 artifact 可供审查）
    - Section "Iteration Rules":
      - 最少 2 轮（round 1 + round 2 无条件）
      - round 2 之后 AI 语义判断是否收敛
      - 不设上限
    - Section "The 9-Step Process (per round)": 逐步 checklist
      - Step 1: Examine existing artifacts (**注入 4 挑战行为第 1 条**: 列出 plan 里被 glossed over 的假设)
      - Step 2: Ask clarifying questions (**注入 4 挑战行为第 3 条**: 探边界 + 第 4 条: 质疑 scope)
      - Step 3: Propose approaches (**注入 4 挑战行为第 2 条**: 对每个现有决策提 ≥2 alternatives)
      - Step 4: Present design sections (更新的 artifact diff 摘要)
      - Step 5: Write/update artifacts (see `update-artifacts.md`)
      - Step 6: Self-review (no placeholders, no contradictions, format compliance)
      - Step 7: Request user approval for this round
      - Step 8: Judge convergence (round 1 always continues; round 2+ AI judges)
      - Step 9: Continue next round OR exit loop
    - Section "The 4 Challenge Behaviors" (显式展开每个行为的要求和样板问题)
    - Section "Format Compliance": 引用 `update-artifacts.md` 做格式校验
  - Verify: `wc -l prompts/refine/brainstorm.md` ≥ 200
  - Verify: `grep -c "Step [1-9]" prompts/refine/brainstorm.md` ≥ 9
  - Verify: `grep -c "challenge.*assumption\|propose.*alternative\|explore.*boundar\|question.*scope" prompts/refine/brainstorm.md` ≥ 4
  - Verify: `grep "at least 2 rounds\|minimum 2 rounds" prompts/refine/brainstorm.md` 匹配至少 1 行

- [ ] 7.2 创建 `prompts/refine/update-artifacts.md`
  - File: `prompts/refine/update-artifacts.md` (新建)
  - 内容：
    - 开头 HARD GATE：Every update must preserve format compatibility with specpower validate / archive
    - Section "Routing Rules" (判断改哪个 artifact):
      | Discussion topic | Update file |
      | Scope / motivation changed | proposal.md |
      | New scenario / missed edge case | specs/**/*.md |
      | Implementation constraint / decision emerged | design.md |
      | Task structure implications | tasks.md |
    - Section "Impact Analysis Template":
      ```
      Proposed update affects:
        - <file1>: <what changes>
        - <file2>: <what changes>
      This round can:
        A) Apply all updates together
        B) Update only primary file (<file1>), defer others to next round
        C) Defer entirely, continue discussing
      Choice? [A/B/C]
      ```
    - Section "Format Preservation Rules" (每种 artifact):
      - proposal.md: 保留 `## Why` / `## What Changes` / `## Capabilities` / `## Impact` 段
      - specs/**/*.md: 保留 `### Requirement:` / `#### Scenario:` (**exactly 4 hashes**) / `- **WHEN**` / `- **THEN**` 格式
      - design.md: Decisions 段落每个决策带 options + rationale
      - tasks.md: 保持 coarse-grained（不是 writing-plans 级别）
    - Section "Post-update Validation":
      - 对每个修改的 spec file: 自动运行 `specpower validate <file>` 并确认 pass
      - 失败 → 回滚到修改前，向用户报告格式问题
    - Section "Diff Summary Format" 展示给用户:
      ```
      Round <N> changes:
        - proposal.md: <summary>
        - specs/<cap>/spec.md: <summary>
        - design.md: added Decision <N> (<name>)
        - tasks.md: <summary>
      ```
  - Verify: `wc -l prompts/refine/update-artifacts.md` ≥ 80
  - Verify: `grep "Routing Rules\|Impact Analysis\|Format Preservation\|Post-update Validation" prompts/refine/update-artifacts.md` 至少 4 行

## 8. 重写 specpower-refine SKILL.md (多轮循环编排)

- [ ] 8.1 重写 `skills/specpower-refine/SKILL.md`
  - File: `skills/specpower-refine/SKILL.md`
  - 结构：
    - 前置检查：`.specpower.yaml` phase === "plan"（否则提示错误）
    - Stage 1: Read 全部 4 artifact + 主 specs 作为上下文
    - Stage 2: Read `.claude/specpower/prompts/refine/brainstorm.md` 和 `.claude/specpower/prompts/refine/update-artifacts.md`
    - Stage 3: **LOOP START** (round counter = 1)
      - Execute 9-step brainstorming (from brainstorm.md)
      - Impact analysis + user scope choice (A/B/C)
      - Apply updates per update-artifacts.md
      - Run `specpower validate` on changed specs
      - Present round-N diff summary to user
    - Stage 4: Judge continue:
      - If round < 2: `round++` → back to Stage 3
      - If round ≥ 2: AI semantic judgment of convergence
        - Not converged → `round++` → back to Stage 3
        - Converged → Stage 5
    - Stage 5: Final summary across all rounds → HARD GATE 用户确认
    - Stage 6: 用户确认后，调用 `specpower change phase <name> --set refined` → 提示 `/specpower:build`
  - HARD GATE 声明：用户未确认前 phase 不能变 refined
  - Verify: `wc -l skills/specpower-refine/SKILL.md` ≤ 150
  - Verify: `grep -c "round\|LOOP\|converg" skills/specpower-refine/SKILL.md` ≥ 5
  - Verify: 含对 brainstorm.md、update-artifacts.md 的 Read 指令

## 9. 强化 build Phase A prompt

- [ ] 9.1 重写 `prompts/build/phase-a-plan.md`（强化缺漏/重组流程）
  - File: `prompts/build/phase-a-plan.md`
  - 新增/强化 Section:
    - 开头明确："This prompt is for REWRITING an existing tasks.md into writing-plans precision. NOT generating from scratch."
    - Input order: design.md → specs → existing tasks.md → analyze → rewrite
    - Section "Grouping Reorganization":
      - 如发现需要重组，必须 STOP 并输出：
        ```
        Analysis suggests reorganizing task groups.
        Rationale: <...>
        Old → New mapping:
          Group 1 "<old>" → Group A "<new>"
          ...
        Choices:
          A) Accept reorganization
          B) Keep original grouping and force writing-plans to fit
          C) I will edit groups manually, then re-run /specpower:build
        ```
      - 等用户选择后继续
    - Section "Gap Detection":
      - 对每个准备重写的 task，先检查 design 是否有足够信息
      - 如缺漏，列出：
        ```
        Gap: Cannot rewrite task "<task summary>" because:
        - design.md does not specify: <what's missing>
        Suggestion: /specpower:refine to close this gap
        ```
      - STOP rewriting, 保留未重写的 tasks 原样
    - Section "Writing-plans Rigor" (保留原版规则):
      - 2-5 分钟/task
      - 零占位符（no TBD, no "similar to above"）
      - 每个命令带 Verify 行
      - 完整代码块或精确 diff
    - Section "Before/After Audit":
      - 完成重写后输出对照表：
        ```
        Rewrite summary:
          Group 1 "<name>": 3 coarse tasks → 8 atomic tasks
          Group 2 "<name>": 2 coarse tasks → 5 atomic tasks
          Total: 5 → 13 atomic tasks
        Groups added: <list>
        Groups removed: <list>
        ```
  - Verify: `grep -c "REWRITING\|Gap Detection\|Reorganization\|Before/After" prompts/build/phase-a-plan.md` ≥ 4
  - Verify: 保留既有 writing-plans 严格规则 `grep -c "2-5 min\|no placeholder\|Verify:" prompts/build/phase-a-plan.md` ≥ 3

## 10. 重写 specpower-build SKILL.md

- [ ] 10.1 重写 `skills/specpower-build/SKILL.md`
  - File: `skills/specpower-build/SKILL.md`
  - 新结构：
    - 前置检查：`.specpower.yaml` phase === "refined"，否则拒绝 + 建议 `/specpower:refine`
    - Phase A:
      - Stage A1: Read `.claude/specpower/prompts/build/phase-a-plan.md`, design.md, specs/, existing tasks.md
      - Stage A2: Analyze (可能产出 3 种结果):
        - 正常：进入重写 → Stage A3
        - 提议重组：展示 Old/New mapping → 用户选 A/B/C → 继续或重试
        - 发现 gap：列出 gap → STOP + 提示 `/specpower:refine`
      - Stage A3: Rewrite tasks.md 按 writing-plans 严格规则
      - Stage A4: Before/After audit summary → HARD GATE 用户确认
    - Phase B:
      - Stage B1: Read `.claude/specpower/prompts/build/phase-b-worktree.md` → 设置 worktree
      - Stage B2: Loop per task:
        - Read `.claude/specpower/prompts/build/phase-b-execute.md`
        - Subagent dispatch: implementer → spec reviewer → code reviewer
        - Per-task user confirm → next task
      - Stage B3: 所有 task 完成后调用 `specpower change phase <name> --set built`
  - HARD GATE 声明:
    - Phase A before Phase B: 用户确认重写后的 tasks.md 才进 Phase B
    - Per-task before next: 每 task 用户确认才下一个
    - Phase prerequisite: phase !== refined 不能进 build
  - Verify: `wc -l skills/specpower-build/SKILL.md` ≤ 160
  - Verify: `grep -c "phase.*refined\|Phase A\|Phase B\|HARD GATE" skills/specpower-build/SKILL.md` ≥ 6
  - Verify: 3 种 Phase A 分支显式列出

## 11. 同步更新其他 skill 里的 phase 过渡调用

- [ ] 11.1 检查 specpower-done SKILL.md 是否需要更新
  - 已有 done SKILL.md：运行 `specpower change archive` CLI
  - archive CLI 现已加 phase 守门（§4.2）——因此 done SKILL.md 不需要显式改
  - 但要在 done SKILL.md 的前置条件中加一条说明：archive 要求 phase=built，如未到则先跑 `/specpower:build`
  - File: `skills/specpower-done/SKILL.md` (小改)
  - Verify: `grep "phase" skills/specpower-done/SKILL.md` 至少 1 行

- [ ] 11.2 检查 specpower-fix SKILL.md 是否需要 phase 过渡
  - 当前 fix SKILL.md 内部调用 `specpower change new fix-<desc>` (会初始化 phase=plan) → 然后跳过 refine 直接调试 → 调 archive
  - archive 会因 phase=plan 而拒绝
  - 两种处理：
    - 选项 A: fix 结尾调 `specpower change phase fix-<desc> --set built`（fix 流程完整走完 TDD + review 等同于 built）
    - 选项 B: fix 用 `specpower change archive --force`
  - 采用选项 A（更符合 phase 语义）
  - File: `skills/specpower-fix/SKILL.md` (修改 Stage 7)
  - Verify: `grep "change phase.*--set built\|phase=built" skills/specpower-fix/SKILL.md` 匹配

- [ ] 11.3 snap SKILL.md 同理
  - snap 是事后补档，所有 artifact 直接生成完整态 → 应 phase=built
  - File: `skills/specpower-snap/SKILL.md`
  - 在调 archive 前加 `specpower change phase <name> --set built`
  - Verify: `grep "change phase.*--set built" skills/specpower-snap/SKILL.md` 匹配

## 12. 回归测试与兼容性

- [x] 12.1 TEST: 老 0.1.0 格式的 .specpower.yaml 兼容性
  - File: `test/utils/change-metadata.test.ts` (扩展)
  - 新 test case: YAML 文件内容仅 `schema: specpower\ncreated: '2026-04-26'`（无 phase 字段）
    - `readChangeMetadata(dir)` 返回的对象 `.phase === undefined`
    - `specpower change status <name>` 不抛错（phase 缺失视为"未知"，不参与 status 计算）
    - `specpower change archive <name>`：phase 缺失视为不合格，拒绝（需 --force）
  - Verify: 老格式测试 PASS

- [x] 12.2 TEST: schema.yaml 没变 → schema 测试仍绿
  - Verify: `npx vitest run test/core/artifact-graph/types-and-schema.test.ts` → 4 tests PASS
  - Verify: `schemas/specpower/schema.yaml` 的 git diff 为空

- [x] 12.3 运行全量测试套件
  - Command: `npx vitest run`
  - Expected: 既有 119 + 新增测试（目标 ≥10 个新测试）全部 pass
  - Verify: `Test Files` 数 ≥ 24; `Tests` 数 ≥ 129

- [x] 12.4 运行 tsc 严格检查
  - Command: `npx tsc --noEmit`
  - Verify: 退出码 0，无 error 输出

## 13. 端到端真实 session 测试

- [ ] 13.1 创建新测试项目 notecli-v3
  - Command: `mkdir -p /tmp/notecli-v3 && cd /tmp/notecli-v3`
  - 复用 `setup-notecli-v2` 同款脚手架（add/list CLI + 5 tests）
  - `git init && git add -A && git commit -m "initial"`
  - `specpower init`（本地 link 版，含新 prompts + SKILL.md）
  - Verify: `.claude/skills/specpower-*/SKILL.md` 10 个都存在且是新版；`.specpower.yaml` 不存在（还未 `change new`）；`.gitignore` 被追加

- [ ] 13.2 R-T1: 真实 session 测试 /specpower:plan
  - Dispatch subagent (零上下文，在 notecli-v3 目录)
  - 用户请求："给 notecli 加搜索功能 /specpower:plan"
  - 期望：
    - 生成 4 个 artifact（proposal.md, specs/note-search/spec.md, design.md, tasks.md）
    - `.specpower.yaml` 含 `phase: plan`
    - design.md 有 Decisions 段落（≥2 个决策带 options/rationale，因为是深度第一轮）
    - tasks.md 有 3-8 分组，每组 2-6 个 checkbox
  - Subagent 报告：是否按新 SKILL.md 四阶段执行、生成内容是否有实质、遇到的任何问题
  - Verify: `specpower validate specpower/changes/search-notes/specs/note-search/spec.md` exits 0
  - Verify: `specpower change phase search-notes` 输出 `plan`

- [ ] 13.3 R-T2: 真实 session 测试 /specpower:refine (多轮)
  - Dispatch subagent，零上下文，读 R-T1 产出的 4 artifact
  - 用户请求："/specpower:refine"
  - 期望：
    - 至少 2 轮（SKILL 规定，不论 AI 判断如何）
    - 每轮执行 4 个挑战行为（挑战假设/提新 options/探边界/质疑 scope），每个有显式产出
    - 每轮影响分析呈现给用户，用户选 A/B/C
    - design.md Decisions 段落新增/扩展，options + rationale 完整
    - 至少一轮修改 proposal 或 specs（不只改 design）——测试级联更新
    - 收敛后 phase 变为 refined
  - Verify: `specpower change phase search-notes` 输出 `refined`
  - Verify: design.md Decisions 段落比 plan 产出更丰富（行数增长 ≥50%）

- [ ] 13.4 R-T3: 真实 session 测试 /specpower:build (正常路径)
  - Dispatch subagent 在 notecli-v3
  - 用户请求："/specpower:build"
  - 期望：
    - 前置检查通过（phase=refined）
    - Phase A 重写 tasks.md，输出 Before/After audit
    - tasks.md 所有 task 符合 writing-plans 严格度（零 TBD, 每命令带 Verify）
    - Phase B 至少跑 2 个 task（完整 TDD + 两阶段 review + 用户确认）
    - 完成后 phase=built
  - Verify: `grep -c "TBD\|similar to above\|fill in" tasks.md` = 0
  - Verify: `grep -c "Verify:" tasks.md` ≥ task 数 * 0.8 (大多数 task 带 verify)
  - Verify: `specpower change phase search-notes` 输出 `built`

- [ ] 13.5 R-T4: 真实 session 测试 /specpower:build 缺漏回 refine 路径
  - 人工在 R-T2 后修改 design.md，删掉一个关键决策（模拟缺漏）
  - 再次运行 /specpower:build
  - 期望：Phase A 检测到 gap，STOP，不重写 tasks.md，给出明确 gap 报告
  - Verify: Phase A 输出含 "Cannot rewrite task" 和 "/specpower:refine"
  - Verify: tasks.md 保持原样（plan 阶段的粗任务版）

- [ ] 13.6 R-T5: 真实 session 测试 /specpower:done (phase 守门)
  - 在 R-T3 完成后（phase=built）运行 /specpower:done → 成功归档
  - 另起一个 change：phase=plan 时试 done → 被 phase 守门拒绝
  - 加 --force 再试 → 成功但有 warning
  - Verify: 拒绝路径明确提示 refine/build 流程
  - Verify: force 路径含 warning 字样

## 14. 文档

- [ ] 14.1 更新 README.md 的"核心流程"章节
  - File: `README.md`
  - 改动：
    - 流程图加上"每阶段深度思考 → 多轮迭代精化"的描述
    - plan 阶段：一次产出 4 artifact（说明是 first-iteration）
    - refine 阶段：内部多轮循环，攻击性审查，可更新任意 artifact
    - build Phase A：基于稳定 artifact 用 writing-plans 重写（非生成）
    - 加 `.specpower.yaml` phase 字段的简短说明
  - Verify: `grep -c "first-iteration\|multi-round\|phase" README.md` ≥ 3

- [ ] 14.2 更新 CHANGELOG.md 加 0.2.0 section
  - File: `CHANGELOG.md`
  - 新增：
    ```
    ## [0.2.0] - YYYY-MM-DD

    ### Changed
    - Workflow refactor: /specpower:plan now generates all 4 artifacts (proposal + specs + design + tasks) in a single deep first-iteration pass
    - /specpower:refine runs as internal auto-multi-round loop (≥2 rounds, AI semantic convergence, no upper limit), with 4 explicit challenge behaviors and Superpowers 9-step brainstorming integration
    - /specpower:build Phase A rewrites tasks.md instead of generating (writing-plans rigor); reorganization requires user approval; design gaps halt and redirect to refine

    ### Added
    - `.specpower.yaml` `phase` field tracks change lifecycle (plan/refined/built/archived)
    - `specpower change phase` CLI subcommand for viewing/setting phase
    - `specpower change archive --force` flag to bypass phase gate
    - 3 new prompt files: plan/design-draft.md, plan/tasks-draft.md, refine/update-artifacts.md
    - Reference example design at prompts/reference/specpower/example-design.md

    ### Security / Compat
    - NOT BREAKING: CLI command interface unchanged; archived 0.1.0 changes continue to work
    - Old 0.1.0 .specpower.yaml files (no phase field) are treated as archived (safe default)
    ```
  - Verify: `grep "0.2.0" CHANGELOG.md`; `[Unreleased]` section 下仍为空或移除

## 15. 发版 0.2.0

- [ ] 15.1 最终验证全量测试 + 打包
  - Command: `npm run build && npx vitest run && npm pack --dry-run`
  - Verify: build 成功；测试全过；tarball 含预期文件（含新 prompt 文件）

- [ ] 15.2 升版本 + 推送
  - Command: `npm version minor` (0.1.0 → 0.2.0，自动 commit + tag)
  - Command: `git push && git push --tags`
  - GitHub Actions 的 `release.yml` 自动触发：
    - 验证 tag 与 package.json 一致
    - 跑 tsc + 测试
    - 发布到 npm (用已配置的 NPM_TOKEN)
    - 创建 GitHub Release
  - Verify: `gh run list --limit 1` 显示 Release workflow success
  - Verify: `npm view specpower@0.2.0` 返回包信息
  - Verify: https://github.com/bstzyf/specpower/releases 最新 tag 是 v0.2.0

- [ ] 15.3 归档本 change
  - Command: 等全部任务完成后，`openspec archive iterative-artifact-refinement --yes`
  - delta specs 合并到主 specs/plugin-infrastructure/, specs/specpower-plan/, specs/specpower-refine/, specs/specpower-build/
  - 归档目录：`openspec/changes/archive/YYYY-MM-DD-iterative-artifact-refinement/`
  - Verify: `specpower list` 不再列出活跃的 iterative-artifact-refinement；归档目录存在
