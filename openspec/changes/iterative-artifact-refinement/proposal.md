## Why

当前 specPower 的 `/specpower:plan → refine → build` 工作流是**线性追加**模式，违反了深度思考 + 多轮迭代的核心原则：

1. **plan 阶段的 specs 和 design 是浅层"盲猜"**。用户一句话描述就让 AI 写 requirements/scenarios 和设计决策，质量低。当前设计又不允许 refine 阶段回头修正。
2. **refine 阶段角色太被动**。只产出 design.md，不能挑战 plan 里其他 artifact 的缺陷。实际上 refine 应该是**攻击性的深度审查**——主动挑战 plan 的假设、提新 options、探索遗漏边界、质疑 scope。
3. **Superpowers writing-plans 没被用到精髓**。writing-plans 要基于**完整稳定**的设计把任务切成 2-5 分钟/task 的精确可执行清单。现在 build Phase A 是 tasks 首次生成，writing-plans 变成"起草工具"而非"精化工具"。
4. **Superpowers brainstorming 的 9 步结构没被用到**。refine 阶段应该真正跑 Superpowers 9 步流程（检查已有→挑战假设→多方案对比→更新产出→自我审查→用户审批），而不是名字挂着、实质简化。
5. **用户看不到完整图景**。plan 只给 proposal + specs，不知道 design 和 tasks 会是什么样。OpenSpec 原版 `opsx:propose` 是一次生成全部 artifact，这是更合理的起点。

重构为**深度迭代精化**模式后：plan 一次生成 4 个 artifact，每个都是"第一轮深度思考"的实质产出（不是占位骨架）；refine 是内部自动多轮循环（至少 2 轮），每轮跑 Superpowers brainstorming 9 步 + 4 个挑战行为，直到 AI 语义判断收敛；build Phase A 基于稳定 artifact 用 writing-plans 严格规则重写 tasks，遇到 design 缺漏主动回 refine。

## What Changes

- **`/specpower:plan` 工作流变更**：从"2 阶段（proposal → specs）"扩展为"4 阶段（proposal → specs → design v1 → tasks v1）"。design 和 tasks 在此阶段是**深度思考第一轮**产出（有实质决策和分组，不是占位），通过 prompt 强指令 + 参考样本 + 用户审查保证质量（不用量化门槛）。

- **`/specpower:refine` 工作流重构**：从"单次调用只产 design.md"改为"单次调用内部自动多轮循环"：
  - 每轮先做**影响分析**（AI 判断本轮讨论涉及哪些 artifact，询问用户更新范围）
  - 每轮跑 **Superpowers brainstorming 9 步完整流程**，注入 4 个挑战行为（挑战假设 / 提新 options / 探索边界 / 质疑 scope）
  - 每轮更新**相关 artifact**（proposal / specs / design / tasks 任一，级联）
  - 至少跑 2 轮，2 轮后 AI 语义判断是否收敛，不设轮数上限
  - design.md 的 Decisions 段落保留完整 options 对比和 rationale（对齐已归档 design.md 的风格）

- **`/specpower:build` Phase A 工作流变更**：
  - 从"生成 tasks.md"改为"**用 writing-plans 严格规则重写 tasks.md**"（读取稳定的 plan/refine 产出）
  - 允许顶层分组重组，但必须**明确报告新旧对照**让用户确认
  - 如果发现 design 有缺漏无法写出精确 tasks，**停止并回 refine** 补决策（refine 可能再改 design/specs/proposal/tasks 任一）

- **3 个新 prompt 文件**：
  - `prompts/plan/design-draft.md`：plan 阶段 design 第一轮深度思考指令（强调实质决策）
  - `prompts/plan/tasks-draft.md`：plan 阶段 tasks 第一轮分组指令（强调实质任务）
  - `prompts/refine/update-artifacts.md`：refine 阶段更新任意 artifact 的方法论（影响分析 + 级联更新 + 格式保持）

- **`prompts/refine/brainstorm.md` 重写**：从"初次 brainstorming"改为"iterative deep review"，Superpowers 9 步流程 + 4 个挑战行为。

- **`.specpower.yaml` 新增 `phase` 字段**：追踪变更当前所在阶段（`plan` / `refined` / `built` / `archived`），归档时检查 phase 必须是 `built`，防止跳过阶段。

- **NOT BREAKING**：CLI 命令不变，artifact 文件名不变，归档流程不变，已归档的 v0.1.0 变更可继续访问。版本升级 0.1.0 → 0.2.0（MINOR）。

## Capabilities

### New Capabilities

（无全新 capability；本次是对已有 capability 的工作流重构）

### Modified Capabilities

- `specpower-plan`：从"2 阶段、浅层产出"扩展为"4 阶段、每个 artifact 第一轮深度思考"
- `specpower-refine`：从"单次、只产 design"改为"单次 invoke + 内部多轮循环 + 4 挑战行为 + 影响分析 + 任意 artifact 更新"
- `specpower-build`：Phase A 从"首次生成 tasks"变为"writing-plans 严格重写 + 分组重组报告 + 缺漏回 refine"
- `plugin-infrastructure`：`.specpower.yaml` 新增 `phase` 元数据字段（追踪变更阶段），`specpower change archive` 新增 phase 合法性检查

## Impact

- **skills/**：3 个 SKILL.md 重写（specpower-plan / specpower-refine / specpower-build）
- **prompts/plan/**：新增 `design-draft.md`、`tasks-draft.md`；现有 `proposal.md`、`specs.md` 不变
- **prompts/refine/**：新增 `update-artifacts.md`；重写 `brainstorm.md`（真正整合 Superpowers 9 步 + 4 挑战行为 + 多轮循环说明）；`design-output.md` 调整引用关系
- **prompts/build/**：`phase-a-plan.md` 强化"基于稳定 artifact 重写"的语言；新增"发现缺漏回 refine"的指令
- **src/utils/change-metadata.ts**：加 `phase` 字段的读写支持（TypeScript type + Zod validation）
- **src/cli/commands/change-archive.ts**：归档前校验 `phase` 是 `built`，否则拒绝并给出修复建议
- **src/cli/commands/change-new.ts**：创建变更时初始化 `phase: plan`
- **schemas/specpower/schema.yaml**：不变（artifact graph 不动）
- **CLI 命令接口**：无变更
- **测试**：新增 phase 字段测试、refine 多轮收敛测试、Phase A 重写测试
- **版本级别**：0.1.0 → 0.2.0（MINOR，NOT BREAKING）
- **文档**：README 的"核心流程"章节重写，CHANGELOG 新增 0.2.0 记录
